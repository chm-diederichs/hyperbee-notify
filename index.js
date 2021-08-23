const { EventEmitter } = require('events')

const defaultOpts = {
  keyEncoding: 'utf-8',
  valueEncoding: 'binary',
  interval: 30000
}

class Notifier extends EventEmitter {
  constructor (opts = {}) {
    super(opts)
  }

  async watch (db, range = {}, opts) {
    if (!opts) return this.watch(db, range, defaultOpts)

    const interval = opts.interval || defaultOpts.interval

    let prev = opts.start || 0
    setInterval(async () => {
      const version = await findDiff(prev)

      if (version) {
        const vdb = db.checkout(version)
        const diff = vdb.createDiffStream(prev, range)

        for await (const { left } of diff) {
          this.emit('data', left)
        }
      }

      prev = db.version - 1
    }, interval)

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

      if (next === previous) return previous

      return findDiff(next, old - 1, true)
    }
  }
}

async function watch (db, key, opts) {
  if (!opts) return watch(db, key, defaultOpts)

  const interval = opts.interval || defaultOpts.interval
  const initial = await db.get(key)
  console.log(initial)

  let timer

  return new Promise(resolve => {
    timer = setInterval(async () => {
      const update = await db.get(key)
      if (!hasChanged(update, initial)) return

      clearInterval(timer)
      resolve(update.value)
    }, interval)
  })
}

module.exports = {
  Notifier,
  watch
}

function hasChanged (a, b) {
  return (!a && b) || b.value !== a.value
}
