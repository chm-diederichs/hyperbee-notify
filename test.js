const hypercore = require('hypercore')
const Hyperbee = require('hyperbee')
const replicate = require('@hyperswarm/replicator')

const feed = hypercore('./db')
replicate.replicate(feed, { lookup: false, announce: true, live: true })

feed.ready(() => {
  console.log(feed.key.toString('hex'))

  const db = new Hyperbee(feed, { keyEncoding: 'utf-8', valueEncoding: 'utf-8' })

  let i = 0
  let point = 50
  const points = []
  for (let i = 0; i < 20; i++) {
    point += Math.floor(Math.random() * 50)
    points.push(point)
  }

  // for (p of points) console.log(db.version + p)
  setInterval(() => {
    // if  console.log(`key${i % 14}`, 'version: ' + db.version)
    if (points.includes(i++)) {
      db.put(`key${100}`, `value${Date.now()}`)
      console.log('key added:', db.version)
    } else {
      db.put('key1', `hello${i}`)
    }
  }, 50)
})
