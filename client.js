const hypercore = require('hypercore')
const Hyperbee = require('hyperbee')
const Notifier = require('./')

const range = { gte: 'key100', lt: 'key101', limit: -1 }
const opts = { keyEncoding: 'utf-8', valueEncoding: 'utf-8', interval: 5000 }

const notifier = new Notifier()

notifier.on('data', console.log)

const feed = hypercore('test', Buffer.from(process.argv[2], 'hex'), opts)
const db = new Hyperbee(feed, opts)

notifier.watch(db, range, opts)
