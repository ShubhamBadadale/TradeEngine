const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  stockSymbol: String,
  type: String,
  quantity: Number,
  price_per_share: Number,
  total_amount: Number,
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Transaction", transactionSchema);
