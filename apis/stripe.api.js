const Subscriptions = require('../models/subscriptions.model')
const logger = require('../libs/logger')

const {
  createCustomer,
  createSubscription,
  attachFakePaymentToCustomer,
  getActiveSubscription,
  listPrices,
  createInvoice,
  payInvoice,
  listInvoices,
} = require('../libs/stripe')
const { isValidDate } = require('../libs/utils')
const { webhookHandler } = require('./stripe-webhooks')

/**
 * @async
 * 
 * Checks if email exists in subscription database
 * 
 * @param {String} email email address
 * @returns {Promise<Boolean>}
 */
const isDuplicateEmail = async email => !!await Subscriptions.findOne({ email }, { _id: 1 })

/**
 * @async
 * 
 * Get customer id using email
 * 
 * @param {String} email customer email
 * @returns {Promise<String>} customerId
 */
const getCustomerId = async email => {
  const sub = await Subscriptions.findOne({ email }, { customerId: 1 })

  return sub ? sub.customerId : null
}

module.exports = {
  // only needed for tests
  isDuplicateEmail,

  async handleWebhook (req, res) {
    // if test env then reply at the end of everything
    if (process.env.NODE_ENV !== 'test') {
      // reply back to stripe asap
      res.send('')
    }

    // as this is just a test we are only checking for stripe signature
    // if it was real app we should get webhook secret "whsec_..." and
    // validate using that secret
    const stripeSignature = req.headers['stripe-signature']

    // this is just a random test to check if stripeSignature exists
    // and has length over 50.
    if (stripeSignature?.length < 50 && process.env.NODE_ENV !== 'test') {
      return
    }

    try {
      const { type } = req.body
      logger.info(`[handleWebhook] type="${type}"`)

      await webhookHandler(req.body)

      // if test env send reply at the end
      if (process.env.NODE_ENV === 'test') {
        res.send('')
      }
    } catch (e) {
      logger.error('[handleWebhook]', e)
    }
  },

  /**
   * Generate an invoice for a customer
   * 
   * @param {Object} req 
   * @param {String} req.body.email customer email
   * @param {String} req.body.invoiceAmount How much to invoice customer for in cents
   * @param {Object} res
   */
  async generateInvoice (req, res) {
    // invoice amount in cents. 100 = $1
    const { email, invoiceAmount } = req.body

    if (!email || !invoiceAmount) {
      return res.status(422).send({
        error: 'Missing "email" or "invoiceAmount"'
      })
    }

    if (typeof invoiceAmount !== 'number' || invoiceAmount < 50) {
      return res.status(422).send({
        error: '"invoiceAmount" must be a number > 50'
      })
    }

    try {
      const customerId = await getCustomerId(email)

      if (!customerId) {
        return res.status(422).send({
          error: `Email does not exists email="${email}"`
        })
      }

      const invoice = await createInvoice(customerId, invoiceAmount)

      res.send({
        invoice
      })
    } catch (e) {
      logger.error('[generateInvoice]', e)

      res.status(500).send({
        error: 'Internal Server Error'
      })
    }
  },

  /**
   * Pay invoices in two date ranges
   * 
   * @param {Object} req 
   * @param {String} req.body.email Customer email
   * @param {String} req.body.startDate Start Date
   * @param {String} req.body.endDate End Date
   * @param {String} req.body.searchStrategy 'created', 'due_date'
   * @param {Object} res
   */
  async payInvoices (req, res) {
    const {
      startDate,
      endDate,
      searchStrategy,
      email,
    } = req.body
    const availableStrategies = ['created', 'due_date']

    if (!startDate || !endDate || !searchStrategy || !email) {
      return res.status(422).send({
        error: 'Missing "email", "startDate", "endDate" or "searchStrategy"'
      })
    }

    if (!isValidDate(startDate) || !isValidDate(endDate)) {
      return res.status(422).send({
        error: 'Invalid "startDate" or "endDate". example date "2023-02-15T00:00:00Z"'
      })
    }

    if (!availableStrategies.includes(searchStrategy)) {
      return res.status(422).send({
        error: `Supplied strategy "${searchStrategy}" must be one of "${availableStrategies.join(', ')}"`
      })
    }

    try {
      const customerId = await getCustomerId(email)

      if (!customerId) {
        return res.status(422).send({
          error: `Email does not exist "${email}"`
        })
      }

      const invoiceCursor = listInvoices({
        customerId,
        startTimestamp: Date.now() - 10000000,
        endTimestamp: Date.now()
      })

      // There's a better way of paying invoices using concurrency
      // (paying multiple invoices at the same time)
      // but I don't know if customers will have a lot of invoices (10000+) that need to be
      // paid at once so I settled for this easy solution for now.

      const paidInvoices = []

      // we use cursor for auto pagination
      // https://stripe.com/docs/api/pagination/auto
      for await (const invoice of invoiceCursor) {
        const paidInvoice = await payInvoice(invoice.id)

        paidInvoices.push(paidInvoice)
        logger.success(`[payInvoices] successfully paid invoice.id="${invoice.id}" amount="${invoice.amount_due}'`)
      }

      res.send({
        total: paidInvoices.length,
        paidInvoices
      })
    } catch (e) {
      logger.error('[payInvoices]', e)

      res.status(500).send({
        error: 'Internal Server Error'
      })
    }
  },

  /**
   * Subscribe to a Stripe's product
   * 
   * @param {Object} req 
   * @param {String} req.body.email Customer Email
   * @param {String} req.body.name Customer Name
   * @param {Object} res
   */
  async subscribe (req, res) {
    const { email, name } = req.body

    if (!email || !name) {
      return res.status(422).send({
        error: 'Missing "email" or "name"'
      })
    }

    try {
      const isDupeEmail = await isDuplicateEmail(email)

      if (isDupeEmail) {
        logger.warn(`[Subscribe] email="${email}" already exists`)

        return res.status(422).send({
          error: `Email "${email}" already exists`
        })
      }

      const [price] = await listPrices('recurring')
      const customer = await createCustomer(name, email)
      // for dev purposes
      const paymentMethod = await attachFakePaymentToCustomer(customer.id)
      const subscription = await createSubscription(customer.id, price.id)

      res.send({
        customer,
        subscription,
        paymentMethod
      })
    } catch (e) {
      logger.error('[subscribe]', e)

      res.status(500).send({
        error: 'Internal Server Error'
      })
    }
  },

  /**
   * Get active subscription
   * 
   * @param {Object} req 
   * @param {String} req.body.email Customer Email
   * @param {Object} res
   */
  async getActiveSubscription (req, res) {
    const { email } = req.body

    if (!email) {
      return res.status(422).send({
        error: 'Missing "email"'
      })
    }

    // there are two ways we can solve this problem
    // A- keeping track of subscriptionId using our DB
    // B- querying Stripe directly by listing active subscriptions
    // I will opt for both A and B in case

    // Reasoning: while webhook can always update subscriptionId
    // in our db then what happens if the server went offline? we won't get
    // that update so we should list active subscriptions from Stripe

    try {
      const customerId = await getCustomerId(email)

      // if user doesn't exist in our local db
      // then probably they don't have subscription
      if (!customerId) {
        // while we could search for user directly in stripe
        // I didn't do that for this test and just opted for this solution
        return res.send({
          isActive: false
        })
      }

      const subscription = await getActiveSubscription(customerId)

      res.send({
        isActive: !!subscription,
        subscription,
      })
    } catch (e) {
      logger.error('[getActiveSubscription]', e)

      res.status(500).send({
        error: 'Internal Server Error'
      })
    }
  },
}