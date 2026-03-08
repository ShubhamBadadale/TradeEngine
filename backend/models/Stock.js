const mongoose = require("mongoose");

const stockSchema = new mongoose.Schema({
  symbol: String,
  name: String,
  current_price: Number,
});

module.exports = mongoose.model("Stock", stockSchema);
