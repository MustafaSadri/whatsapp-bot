const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  orderId: { type: String, unique: true },
  status: String
});

module.exports = mongoose.model("Order", orderSchema);