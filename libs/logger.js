/* eslint-disable no-empty-function */
// Create a logging instance

const Logger = require('signale')
const loggerOptions = {
  config: {
    displayDate: true,
    displayTimestamp: true,
    displayBadge: false,
    displayScope: false,
    displayFilename: true,
  },
  types: {
    error: {
      stream: process.stderr
    }
  }
}

const logger = new Logger.Signale(loggerOptions)

module.exports = logger
