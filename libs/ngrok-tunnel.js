const { join } = require('path')

require('dotenv').config({
  path: join(__dirname, '..', '.env')
})

const logger = require('./logger')
const ngrok = require('ngrok')

const start = async () => {
  const url = await ngrok.connect({
    addr: Number(process.env.PORT) || 8080,
  })

  const webhookUrl = `${url}/stripe/webhook`

  logger.success(`[Ngrok] tunnel created at ${webhookUrl} (add this to your Stripe Webhooks)`)
  logger.info('[Ngrok] web interface http://127.0.0.1:4040/inspect/http')
}

start()
