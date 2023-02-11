const mongoose = require('../mongoose')

const MODEL_NAME = 'Subscriptions'

const schema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  customerId: String,
  priceId: String,
  subscriptionId: String,
  productId: String,
  // We probably shouldn't store plan name/price and instead use productId
  // to fetch the product in case product name changed
  // but I added it because this was in the test spec
  planName: String,
  planPrice: Number,
}, {
  timestamps: true
})

// This is necessary to avoid model compilation errors in tests watch mode
// see https://mongoosejs.com/docs/api/connection.html#connection_Connection-deleteModel
if (mongoose.modelNames().includes(MODEL_NAME)) {
  mongoose.deleteModel(MODEL_NAME)
}

module.exports = mongoose.model(MODEL_NAME, schema)