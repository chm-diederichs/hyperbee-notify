const Notifier = require('./')

const range = { gte: 'key100', lt: 'key101', limit: -1 }
const opts = { keyEncoding: 'utf-8', valueEncoding: 'utf-8', interval: 5000 }

const notifier = new Notifier()

notifier.on('diff', async d => { for await (const diff of d) console.log(diff) })

notifier.watch(Buffer.from(process.argv[2], 'hex'), range, opts)
