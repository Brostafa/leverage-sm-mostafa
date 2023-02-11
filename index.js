// parse .env
require('dotenv').config()

const express = require('express')
const app = express()
const logger = require('./libs/logger')
const stripeApis = require('./apis/stripe.api')

const PORT = process.env.PORT || 8080

/** Middlewares **/
app.use(express.json()) // accept json
app.use((req, res, next) => {
  // disable ngrok warning
  res.setHeader('ngrok-skip-browser-warning', '1')

  next()
})

/** Routes **/
app.get('/', (req, res) => res.send('https://documenter.getpostman.com/view/3626031/2s935uFL5q'))
app.post('/stripe/subscribe', stripeApis.subscribe)
app.post('/stripe/get-active-subscription', stripeApis.getActiveSubscription)
app.post('/stripe/generate-invoice', stripeApis.generateInvoice)
app.post('/stripe/pay-invoices', stripeApis.payInvoices)
app.post('/stripe/webhook', stripeApis.handleWebhook)

const server = app.listen(PORT, () => logger.success(`[Server] Listening on http://localhost:${PORT}`))

module.exports = server