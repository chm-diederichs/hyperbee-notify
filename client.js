const hypercore = require('hypercore')
const Hyperbee = require('hyperbee')
const replicate = require('@hyperswarm/replicator')

const feed = hypercore('./db-client', process.argv[2])

feed.ready(async () => {
  replicate(feed, { lookup: true, announce: false, live: true })

  const db = new Hyperbee(feed, { keyEncoding: 'utf-8', valueEncoding: 'utf-8' })
  const range = { gte: 'key100', lt: 'key101', limit: -1 }
  const following = {}

  let lastVersion = 0
  setInterval(async () => {

    let diffs = await findDiff(lastVersion)
    if (diffs) console.log(diffs)
    lastVersion = db.version - 1

  }, 1000)

  async function findDiff (old, previous, search = false) {
    let current = db.version

    let i = 0
    for await (let { left, right } of db.createDiffStream(old, range)) {
      if (left === null) continue
      i++
    }

    let next
    if (i > 0) next = Math.floor((old + current) / 2) // has been a change, look newer
    if (i === 0) {
      if (search === false) return null
      next = Math.floor((old + previous) / 2) // no entries, no change, have to look older
      search = true
    }

    if (next === previous) return previous

    return findDiff(next, old - 1, true)
  }
})
