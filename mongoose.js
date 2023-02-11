// parse .env in case this file got called outside of
// the main index.js
require('dotenv').config()

const mongoose = require('mongoose')
const logger = require('./libs/logger')

const connectionString = process.env.NODE_ENV === 'test'
  ? process.env.MONGO_URL_TEST
  : process.env.MONGO_URL

if (!connectionString) {
  logger.error('[Mongoose] please define MONGO_URL or MONGO_URL_TEST in .env')
  process.exit(1)
}

// [MONGOOSE] DeprecationWarning: strictQuery
mongoose.set('strictQuery', true)
mongoose.connect(connectionString)
  .then(() => {
    logger.info(`[Mongoose] connected using connectionUrl="${connectionString}" NODE_ENV="${process.env.NODE_ENV}"`)
  })
  .catch(e => {
    logger.error('[Mongoose]', e)
    process.exit(1)
  })

module.exports = mongoose