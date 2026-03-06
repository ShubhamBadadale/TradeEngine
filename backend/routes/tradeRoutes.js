const express = require("express");
const router = express.Router();
const Trade = require("../models/Trade");

router.post("/buy", async (req, res) => {
  try {
    const trade = new Trade({
      stockSymbol: req.body.stockSymbol,
      quantity: req.body.quantity,
      price: req.body.price,
      type: "BUY",
    });

    const savedTrade = await trade.save();
    res.json(savedTrade);
  } catch (err) {
    res.status(500).json(err);
  }
});

router.get("/", async (req, res) => {
  try {
    const trades = await Trade.find();
    res.json(trades);
  } catch (err) {
    res.status(500).json(err);
  }
});

module.exports = router;
