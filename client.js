const hypercore = require('hypercore')
const Hyperbee = require('hyperbee')
const replicate = require('@hyperswarm/replicator')

const feed = hypercore('./db-client', process.argv[2])

feed.ready(async () => {
  replicate(feed, { lookup: true, announce: false, live: true })

  const db = new Hyperbee(feed, { keyEncoding: 'utf-8', valueEncoding: 'utf-8' })
  const range = { gte: 'key10', lt: 'key14', limit: -1 }
  const following = {}

  let lastVersion = 0
  setInterval(async () => {

    let diffs = await findDiff(lastVersion)
    lastVersion = db.version - 1

    for (let key of Object.keys(diffs)) {
      const recent = Math.max(...diffs[key])
      if (!following[key]) following[key] = {}
      following[key].recent = recent
    }
  }, 200)

  setInterval(() => {
    for (let [k, v] of Object.entries(following)) {
      if (v.previous) {
        if (v.previous === v.recent) continue
      }    
   
      console.log(k, 'last seen changed at: ', v.recent)
      v.previous = v.recent
    }
  }, 2000)

  async function findDiff (old, diffs = {}) {
    let current = db.version
    if (current - old < 2) return diffs

    // const keys = await diff(old)
    for await (let { left: { key } } of db.createDiffStream(old, range)) {
      if (!diffs.hasOwnProperty(key)) diffs[key] = new Set()
      diffs[key].add(old)
    }

    return findDiff(Math.floor((old + current) / 2), diffs)
  }
})
