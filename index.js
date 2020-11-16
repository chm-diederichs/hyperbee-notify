const hypercore = require('hypercore')
const Hyperbee = require('hyperbee')
const replicate = require('@hyperswarm/replicator')

const feed = hypercore('./db')
replicate(feed, { lookup: false, announce: true, live: true })

feed.ready(() => {
  console.log(feed.key.toString('hex'))

  const db = new Hyperbee(feed, { keyEncoding: 'utf-8', valueEncoding: 'utf-8' })

  let i = 0
  setInterval(() => {
    if ((i % 14) > 10)console.log(`key${i % 14}`, 'version: ' + db.version)
    db.put(`key${i % 14}`, `value${i++}`)
  }, 500)
})
