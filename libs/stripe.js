/**
 * https://stripe.com/docs/api?lang=node
 */
const Stripe = require('stripe')
const logger = require('./logger')

if (!process.env.STRIPE_SK) {
  logger.error('[Stripe] please define STRIPE_SK in .env')
  process.exit(1)
}

const stripe = Stripe(process.env.STRIPE_SK)

/**
 * @async
 * Create a stripe customer.
 *
 * @param {String} name - The name of the customer to create.
 * @param {String} email - The email address of the customer to create.
 *
 * @return {Promise<Object>}
 */
const createCustomer = (name, email) => {
  logger.info(`[Stripe] Creating Stripe customer with email '${email}'.`)

  return stripe.customers.create({
    name,
    email,
  })
}

/**
 * @async
 *
 * Create a new subscription.
 * The provided Customer ID should be for a Customer with a default payment method set
 *
 * @param {String} customerId - Customer's ID to create a subscription for
 * @param {String} priceId - Price's ID to subscribe the customer to
 *
 * @return {Object}
 */
const createSubscription = (customerId, priceId) => {
  const subscriptionData = {
    customer: customerId,
    items: [{ price: priceId }],
    expand: ['latest_invoice.payment_intent'],
  }

  logger.info(`[Stripe] Creating Stripe subscription for customer ID '${customerId}'.`)

  return stripe.subscriptions.create(subscriptionData)
}

/**
 * @async
 * 
 * Get Stripe product
 * 
 * @param {String} productId product ID
 * @returns {Promise<Object>}
 */
const getProduct = productId => stripe.products.retrieve(productId)

/**
 * @async
 * 
 * List Stripe products
 * 
 * @note
 * I didn't care about pagination because I wanted
 * to get the first available product which is what
 * we will be subscribing to as this is just a test
 * 
 * @returns {Promise<Array>} Stripe Products
 */
const listProducts = () => stripe.products.list().then(r => r.data)

/**
 * @async
 * 
 * List Stripe prices
 * 
 * @param {String} type 'recurring' || 'one_time'
 * @returns {Promise<Object>}
 */
const listPrices = (type = 'recurring') => stripe.prices.list({ type }).then(r => r.data)

/**
 * @async
 * Attach fake payment method to customer
 *
 * @param {String} customerId - The ID of the customer to add the payment method to.
 */
const attachFakePaymentToCustomer = async (customerId) => {
  logger.info(`[Stripe] Attaching a Fake Stripe payment method to customer ID '${customerId}'.`)
  // https://stripe.com/docs/api/payment_methods/create?lang=node
  const paymentMethod = await stripe.paymentMethods.create({
    type: 'card',
    card: {
      // fake card id
      number: '4242424242424242',
      exp_month: 8,
      // use next year so this card never expires
      exp_year: new Date().getFullYear() + 1,
      cvc: '314',
    },
  })
  // attach payment to customer
  await stripe.paymentMethods.attach(paymentMethod.id, { customer: customerId })

  await stripe.customers.update(customerId, {
    invoice_settings: { default_payment_method: paymentMethod.id },
  })

  return paymentMethod
}

/**
 * @async
 * 
 * Get a plan by priceId
 * 
 * @param {String} priceId Stripe's price (e.g: price_1MZae8IbuM6Gn93WiPUDPLsH)
 * @returns {Promise<Object>}
 */
const getPlanByPriceId = async priceId => stripe.plans.retrieve(priceId)

/**
 * @async
 * 
 * Get active subscription using customerId
 * 
 * @param {String} customerId Stripe customer id (e.g: cus_NKkiGSeLZnWmpF)
 * @returns {Promise<Object>} Stripe's Subscription
 */
const getActiveSubscription = async customerId => {
  const { data: [subscription] } = await stripe.subscriptions.list({
    customer: customerId,
    status: 'active',
    limit: 1
  })

  return subscription
}

/**
 * @async
 * Create an invoice using customer ID
 * 
 * @param {String} customerId customer ID
 * @param {Number} amount How much to bill the customer in cents (e.g: 100 for $1)
 * @returns {Promise<Object>} Stripe Invoice
 */
const createInvoice = async (customerId, amount) => {
  logger.info(`[Stripe] Generating an invoice for "$${amount / 100}" for customer "${customerId}'`)

  const invoice = await stripe.invoices.create({
    customer: customerId,
    collection_method: 'send_invoice',
    days_until_due: 30 // 1 month
  })

  await stripe.invoiceItems.create({
    customer: customerId,
    amount,
    currency: 'USD',
    invoice: invoice.id
  })

  const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id)

  return finalizedInvoice
}

/**
 * @async
 * List invoices for a customer between 2 date ranges
 * 
 * @param {Object} opts
 * @param {String} opts.customerId
 * @param {String} [opts.startTimestamp=0]
 * @param {String} [opts.endTimestamp=new Date().getTime()]
 * @param {String} [opts.strategy='created'] 'created', 'due_date'
 * @param {String} [opts.status='open'] 'open', 'draft', 'paid', 'uncollectible', or 'void'
 * @returns 
 */
const listInvoices = ({
  customerId,
  startTimestamp = 0,
  endTimestamp = new Date().getTime(),
  strategy = 'created',
  status = 'open',
}) => {
  const dateRange = {
    // stripe accepts timestamp in seconds not ms
    gte: Math.floor(startTimestamp / 1000),
    lte: Math.floor(endTimestamp / 1000)
  }
  const searchQuery = strategy === 'created'
    ? { created: dateRange }
    : { due_date: dateRange }

  return stripe.invoices.list({
    customer: customerId,
    status,
    ...searchQuery,
  })
}

/**
 * @async
 * Pay an invoice using invoiceId
 * 
 * @param {String} invoiceId Stripe invoiceId in_1Ma7uNIbuM6Gn93WIqnmlcr0
 * @returns {Promise<Object>} Stripe Invoice
 */
const payInvoice = invoiceId => stripe.invoices.pay(invoiceId)

module.exports = {
  createCustomer,
  createSubscription,
  getProduct,
  listProducts,
  listPrices,
  attachFakePaymentToCustomer,
  getPlanByPriceId,
  getActiveSubscription,
  createInvoice,
  listInvoices,
  payInvoice,
}