const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    unique: true,
    required: true
  },

  orderNo: String,        // Example B-187
  orderName: String,      // Kept for old dashboard/code compatibility
  status: String,         // NEW / ACCEPTED

  customerName: String,
  customerPhone: String,

  address: String,

  quantity: Number,
  qty: Number,            // Kept for old dashboard/code compatibility

  moment: String,         // MoySklad order date

  whatsappStatus: {
    type: String,
    enum: ["pending", "sent", "failed"],
    default: "pending"
  },
  whatsappSentAt: Date,
  whatsappError: String,
  whatsappMessageSid: String

}, {
  timestamps: true        // auto adds createdAt / updatedAt
});

module.exports = mongoose.model("Order", orderSchema);
