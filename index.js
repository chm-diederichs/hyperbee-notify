const { pipeline, Readable, Transform } = require('streamx')

const defaultOpts = {
  keyEncoding: 'utf-8',
  valueEncoding: 'binary',
  interval: 30000
}

function watchRange (db, range = {}, opts) {
  if (!opts) return watchRange(db, range, defaultOpts)

  const diffs = new Readable()
  const interval = opts.interval || defaultOpts.interval

  let prev = opts.start || 0

  awaitInterval(async () => {
    const version = await findDiff(prev)
    if (version) {
      const vdb = db.checkout(version)
      const diff = vdb.createDiffStream(prev, range)

      for await (const { left } of diff) {
        diffs.push(left)
      }
    }
    prev = db.version - 1
  }, interval, opts.signal)

  if (!opts.transform) return diffs

  return pipeline(
    diffs,
    new Transform({ transform: opts.transform })
  )

  async function findDiff (old, previous, search = false) {
    if (previous === 0) return null

    const current = db.version

    let changed = false
    for await (const d of db.createDiffStream(old, range)) {
      changed = true
      break
    }

    let next
    if (changed) {
      next = Math.floor((old + current) / 2) // has been a change, look newer
    } else {
      if (search === false) return null
      next = Math.floor((old + previous) / 2) // no entries, no change, have to look older
      search = true
    }

    console.log(next, previous)
    if (next === previous) return previous

    return findDiff(next, old - 1, true)
  }
}

async function watch (db, key, opts) {
  if (!opts) return watch(db, key, defaultOpts)

  const interval = opts.interval || defaultOpts.interval
  const initial = await db.get(key)

  return new Promise((resolve, reject) => {
    if (opts.signal?.aborted) reject(new Error('Aborted'))

    const timer = setInterval(async () => {
      const update = await db.get(key)
      if (hasChanged(update, initial)) {
        clearInterval(timer)
        resolve(update.value)
      }
    }, interval)

    if (opts.signal) {
      opts.signal.addEventListener('abort', () => {
        clearInterval(timer)
        reject(new Error('Aborted'))
      })
    }
  })
}

module.exports = {
  watchRange,
  watch
}

function hasChanged (a, b) {
  if (a == null && b == null) return false
  if ((a.value && b == null) || (a == null && b.value)) return true
  return Buffer.compare(a.value, b.value) === 0
}

// make sure call has completed before refiring
async function awaitInterval (fn, interval, signal, handle) {
  await fn()
  if (signal.aborted) return

  handle = setTimeout(awaitInterval, interval, ...arguments)

  return handle
}
