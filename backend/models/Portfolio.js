const mongoose = require("mongoose");

const portfolioSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  stockSymbol: String,
  quantity: Number,
  average_buy_price: Number,
});

module.exports = mongoose.model("Portfolio", portfolioSchema);
