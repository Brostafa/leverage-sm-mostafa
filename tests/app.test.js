process.env.NODE_ENV = 'test'
const assert = require('assert').strict
const server = require('../index')
const axios = require('axios')
const Subscriptions = require('../models/subscriptions.model')
const { isDuplicateEmail } = require('../apis/stripe.api')

const TEST_DATA = {
  customerId: 'cus_NKpF6ZdTnF0sxi',
  email: 'test@example.com',
  name: 'John Doe',
  planName: 'Product 1',
  planPrice: 999,
  priceId: 'price_1MZae8IbuM6Gn93WiPUDPLsH',
  productId: 'prod_NKF8WWlZZkNbgY',
  subscriptionId: 'sub_1Ma9b9IbuM6Gn93WwjLcrIlU',
}

const UPDATED_TEST_DATA = {
  customerId: 'cus_NKpF6ZdTnF0sxi',
  email: 'test2@abc.com',
  name: 'New Name',
  planName: 'Product UPDATED',
  planPrice: 555,
  priceId: 'price_1MZae8IbuM6Gn93WiPUDPLsH_UPDATED',
  productId: 'prod_NKF8WWlZZkNbgY_UPDATED',
  subscriptionId: 'sub_1Ma9b9IbuM6Gn93WwjLcrIlU_UPDATED'
}

const SERVER_URL = 'http://localhost:' + server.address().port

const getSubscription = () => Subscriptions.findOne({
  customerId: TEST_DATA.customerId
})

describe('Application Tests', () => {
  after(function (done) {
    server.close(done)
  })

  it('should have server running', async () => {
    await axios.get(SERVER_URL)
  })

  it('should return false - email does not exist yet', async () => {
    const isDupe = await isDuplicateEmail(TEST_DATA.email)

    assert.strictEqual(isDupe, false)
  })

  it('should return true - email exists', async () => {
    await Subscriptions.create(TEST_DATA)

    const isDupe = await isDuplicateEmail(TEST_DATA.email)

    await Subscriptions.deleteOne({ email: TEST_DATA.email })

    assert.strictEqual(isDupe, true)
  })

  it('should test customer.created', async () => {
    await axios.post(SERVER_URL + '/stripe/webhook', {
      type: 'customer.created',
      data: {
        object: {
          id: TEST_DATA.customerId,
          email: TEST_DATA.email,
          name: TEST_DATA.name
        }
      }
    })

    const { email, name, customerId } = await getSubscription()

    assert.equal(email, TEST_DATA.email)
    assert.equal(name, TEST_DATA.name)
    assert.equal(customerId, TEST_DATA.customerId)
  })

  it('should test customer.updated', async () => {
    await axios.post(SERVER_URL + '/stripe/webhook', {
      type: 'customer.updated',
      data: {
        object: {
          id: TEST_DATA.customerId,
          email: UPDATED_TEST_DATA.email,
          name: UPDATED_TEST_DATA.name
        }
      }
    })

    const { email, name } = await getSubscription()

    assert.equal(email, UPDATED_TEST_DATA.email)
    assert.equal(name, UPDATED_TEST_DATA.name)
  })

  it('should test customer.subscription.created', async () => {
    await axios.post(SERVER_URL + '/stripe/webhook', {
      type: 'customer.subscription.created',
      data: {
        object: {
          customer: TEST_DATA.customerId,
          id: TEST_DATA.subscriptionId,
          __testProduct: {
            name: TEST_DATA.planName
          },
          plan: {
            id: TEST_DATA.priceId,
            product: TEST_DATA.productId,
            amount: TEST_DATA.planPrice
          },
        }
      }
    })

    const {
      subscriptionId,
      priceId,
      productId,
      planName,
      planPrice,
    } = await getSubscription()

    assert.equal(subscriptionId, TEST_DATA.subscriptionId)
    assert.equal(priceId, TEST_DATA.priceId)
    assert.equal(productId, TEST_DATA.productId)
    assert.equal(planName, TEST_DATA.planName)
    assert.equal(planPrice, TEST_DATA.planPrice)
  })

  it('should test customer.subscription.updated', async () => {
    await axios.post(SERVER_URL + '/stripe/webhook', {
      type: 'customer.subscription.updated',
      data: {
        object: {
          customer: TEST_DATA.customerId,
          id: UPDATED_TEST_DATA.subscriptionId,
          __testProduct: {
            name: UPDATED_TEST_DATA.planName
          },
          plan: {
            id: UPDATED_TEST_DATA.priceId,
            product: UPDATED_TEST_DATA.productId,
            amount: UPDATED_TEST_DATA.planPrice
          },
        }
      }
    })

    const {
      subscriptionId,
      priceId,
      productId,
      planName,
      planPrice,
    } = await getSubscription()

    assert.equal(subscriptionId, UPDATED_TEST_DATA.subscriptionId)
    assert.equal(priceId, UPDATED_TEST_DATA.priceId)
    assert.equal(productId, UPDATED_TEST_DATA.productId)
    assert.equal(planName, UPDATED_TEST_DATA.planName)
    assert.equal(planPrice, UPDATED_TEST_DATA.planPrice)
  })

  it('should test customer.subscription.deleted', async () => {
    await axios.post(SERVER_URL + '/stripe/webhook', {
      type: 'customer.subscription.deleted',
      data: {
        object: {
          customer: TEST_DATA.customerId,
        }
      }
    })

    const {
      subscriptionId,
      priceId,
      productId,
      planName,
      planPrice,
    } = await getSubscription()

    assert.equal(subscriptionId, null)
    assert.equal(priceId, null)
    assert.equal(productId, null)
    assert.equal(planName, null)
    assert.equal(planPrice, null)
  })

  it('should test customer.deleted', async () => {
    await axios.post(SERVER_URL + '/stripe/webhook', {
      type: 'customer.deleted',
      data: {
        object: {
          id: TEST_DATA.customerId,
        }
      }
    })

    const subscription = await getSubscription()

    assert.equal(subscription, null)
  })
})
