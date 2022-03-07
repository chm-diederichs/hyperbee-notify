const { pipeline, Readable, Transform } = require('streamx')

const defaultOpts = {
  keyEncoding: 'utf-8',
  valueEncoding: 'binary',
  interval: 30000
}

// watches for hyperbee updates over a given key range
function watchRange (db, range = {}, opts = {}) {
  const updates = new Readable()
  const interval = opts.interval || defaultOpts.interval

  let vdb = db.snapshot()

  awaitInterval(async () => {
    if (db.version === vdb.version) return

    const diffs = db.createDiffStream(vdb)

    // TODO: proper comparison
    for await (const { left } of diffs) {
      if (left.key >= range.lt) continue
      if (left.key < range.gte) continue

      updates.push(left)
    }

    vdb = db.snapshot()
  }, interval, opts.signal)

  if (!opts.transform) return updates

  return pipeline(
    updates,
    new Transform({ transform: opts.transform })
  )
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
async function awaitInterval (fn, interval, signal) {
  await fn()
  if (signal.aborted) return

  setTimeout(awaitInterval, interval, ...arguments)
}
