const logger = require('../libs/logger')
const Subscriptions = require('../models/subscriptions.model')
const { getProduct } = require('../libs/stripe')

const createCustomer = async payload => {
  try {
    const { id, email, name } = payload.data.object

    await Subscriptions.create({
      email,
      name,
      customerId: id,
    })
  } catch (e) {
    logger.error('[webhook.createCustomer]', e.message)
  }
}

const updateCustomer = async payload => {
  try {
    const { id, email, name } = payload.data.object

    await Subscriptions.updateOne({
      customerId: id
    }, {
      email,
      name,
    })
  } catch (e) {
    logger.error('[webhook.updateCustomer]', e.message)
  }
}

const deleteCustomer = async payload => {
  try {
    const { id } = payload.data.object

    await Subscriptions.deleteOne({
      customerId: id
    })
  } catch (e) {
    logger.error('[webhook.deleteCustomer]', e.message)
  }
}

const updateSubscription = async payload => {
  try {
    const {
      id,
      plan,
      customer,
      // only used in test env
      __testProduct
    } = payload.data.object

    const product = process.env.NODE_ENV === 'test'
      ? __testProduct
      : await getProduct(plan.product)

    await Subscriptions.updateOne({
      customerId: customer
    }, {
      subscriptionId: id,
      priceId: plan.id,
      productId: plan.product,
      planName: product.name,
      planPrice: plan.amount,
    })
  } catch (e) {
    logger.error('[webhook.updateSubscription]', e.message)
  }
}

const deleteSubscription = async payload => {
  try {
    const { customer } = payload.data.object

    await Subscriptions.updateOne({
      customerId: customer
    }, {
      subscriptionId: null,
      priceId: null,
      productId: null,
      planName: null,
      planPrice: null,
    })
  } catch (e) {
    logger.error('[webhook.deleteSubscription]', e.message)
  }
}

const webhookHandler = payload => {
  const { type } = payload

  const webhookMap = {
    'customer.created': createCustomer,
    'customer.updated': updateCustomer,
    'customer.deleted': deleteCustomer,
    'customer.subscription.deleted': deleteSubscription,
    // create and update behave similary
    'customer.subscription.created': updateSubscription,
    'customer.subscription.updated': updateSubscription,
  }

  const method = webhookMap[type]

  if (method) {
    return method(payload)
  }
}

module.exports = {
  webhookHandler
}