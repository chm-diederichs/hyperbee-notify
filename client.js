require('event-target-polyfill')
require('yet-another-abortcontroller-polyfill')
const hypercore = require('hypercore')
const Hyperbee = require('hyperbee')
const replicate = require('@hyperswarm/replicator')
const { Notifier, watch } = require('./')

const range = { gte: 'key100', lt: 'key101', limit: -1 }
const opts = { keyEncoding: 'utf-8', valueEncoding: 'utf-8', interval: 5000 }

// const notifier = new Notifier()

// notifier.on('data', console.log)

const feed = hypercore('test', Buffer.from(process.argv[2], 'hex'), opts)
replicate.replicate(feed, { lookup: true, announce: false, live: true })

const db = new Hyperbee(feed, opts)

// notifier.watch(db, range, opts)
const ac = new AbortController()

console.log('fail in 10s')
console.time('fail')
setTimeout(() => ac.abort(), 1000)
ac.abort()

watch(db, 'key100', { interval: 1000, signal: ac.signal })
  .then(console.log)
  .catch(err => {
    console.timeEnd('fail')
    console.error(err)
    process.exit(0)
  })
