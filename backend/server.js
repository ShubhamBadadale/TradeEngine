require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cors = require("cors");

const User = require("./models/User");
const Stock = require("./models/Stock");
const Portfolio = require("./models/Portfolio");
const Transaction = require("./models/Transaction");

const app = express();
app.use(cors());
app.use(express.json());

/* -------------------- DATABASE CONNECTION -------------------- */

mongoose
  .connect(
    process.env.MONGO_URI || "mongodb://127.0.0.1:27017/trading_simulator",
  )
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error(err));

const JWT_SECRET =
  process.env.JWT_SECRET || "super_secret_trading_key_change_in_prod";

/* -------------------- AUTH MIDDLEWARE -------------------- */
setInterval(async () => {
  const stocks = await Stock.find();

  for (let stock of stocks) {
    const change = (Math.random() * 2 - 1) * 0.02;
    stock.current_price = stock.current_price * (1 + change);
    await stock.save();
  }
}, 5000);
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token)
    return res.status(401).json({ error: "Access denied. No token provided." });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err)
      return res.status(403).json({ error: "Invalid or expired token." });

    req.user = user;
    next();
  });
};

/* -------------------- AUTH ROUTES -------------------- */

// Register
app.post("/api/auth/register", async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const existingUser = await User.findOne({ email });

    if (existingUser)
      return res.status(400).json({ error: "Email already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email,
      password: hashedPassword,
      balance: 10000,
    });

    await user.save();

    res.status(201).json({ message: "User registered successfully" });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

// Login
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, {
      expiresIn: "24h",
    });

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        balance: user.balance,
      },
    });
  } catch {
    res.status(500).json({ error: "Server error." });
  }
});

/* -------------------- MARKET ROUTES -------------------- */

app.get("/api/stocks", async (req, res) => {
  try {
    const stocks = await Stock.find();
    res.json(stocks);
  } catch {
    res.status(500).json({ error: "Failed to fetch stocks." });
  }
});

/* -------------------- USER ROUTES -------------------- */

app.get("/api/user/profile", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.json(user);
  } catch {
    res.status(500).json({ error: "Failed to fetch user profile." });
  }
});

/* -------------------- PORTFOLIO -------------------- */

app.get("/api/portfolio", authenticateToken, async (req, res) => {
  try {
    const portfolio = await Portfolio.find({ userId: req.user.id });

    const stocks = await Promise.all(
      portfolio.map(async (p) => {
        const stock = await Stock.findOne({ symbol: p.stockSymbol });

        return {
          ...p._doc,
          name: stock.name,
          current_price: stock.current_price,
          unrealized_pnl:
            (stock.current_price - p.average_buy_price) * p.quantity,
        };
      }),
    );

    res.json(stocks);
  } catch {
    res.status(500).json({ error: "Failed to fetch portfolio." });
  }
});

/* -------------------- TRANSACTIONS -------------------- */

app.get("/api/transactions", authenticateToken, async (req, res) => {
  try {
    const transactions = await Transaction.find({
      userId: req.user.id,
    }).sort({ timestamp: -1 });

    res.json(transactions);
  } catch {
    res.status(500).json({ error: "Failed to fetch transactions." });
  }
});

/* -------------------- BUY STOCK -------------------- */

app.post("/api/trade/buy", authenticateToken, async (req, res) => {
  const { symbol, quantity } = req.body;
  const qty = parseInt(quantity);

  if (!symbol || qty <= 0)
    return res.status(400).json({ error: "Invalid input." });

  try {
    const user = await User.findById(req.user.id);
    const stock = await Stock.findOne({ symbol });

    if (!stock) throw new Error("Stock not found");

    const totalCost = stock.current_price * qty;

    if (user.balance < totalCost) throw new Error("Insufficient balance.");

    user.balance -= totalCost;
    await user.save();

    let portfolio = await Portfolio.findOne({
      userId: user._id,
      stockSymbol: symbol,
    });

    if (portfolio) {
      const newQty = portfolio.quantity + qty;
      const newAvg =
        (portfolio.quantity * portfolio.average_buy_price + totalCost) / newQty;

      portfolio.quantity = newQty;
      portfolio.average_buy_price = newAvg;

      await portfolio.save();
    } else {
      await Portfolio.create({
        userId: user._id,
        stockSymbol: symbol,
        quantity: qty,
        average_buy_price: stock.current_price,
      });
    }

    await Transaction.create({
      userId: user._id,
      stockSymbol: symbol,
      type: "BUY",
      quantity: qty,
      price_per_share: stock.current_price,
      total_amount: totalCost,
    });

    res.json({
      message: `Successfully bought ${qty} shares of ${symbol}`,
      cost: totalCost,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/* -------------------- SELL STOCK -------------------- */

app.post("/api/trade/sell", authenticateToken, async (req, res) => {
  const { symbol, quantity } = req.body;
  const qty = parseInt(quantity);

  try {
    const user = await User.findById(req.user.id);

    const portfolio = await Portfolio.findOne({
      userId: user._id,
      stockSymbol: symbol,
    });

    if (!portfolio || portfolio.quantity < qty)
      throw new Error("Insufficient shares.");

    const stock = await Stock.findOne({ symbol });

    const earnings = stock.current_price * qty;

    portfolio.quantity -= qty;
    await portfolio.save();

    user.balance += earnings;
    await user.save();

    await Transaction.create({
      userId: user._id,
      stockSymbol: symbol,
      type: "SELL",
      quantity: qty,
      price_per_share: stock.current_price,
      total_amount: earnings,
    });

    res.json({
      message: `Successfully sold ${qty} shares of ${symbol}`,
      earnings,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/* -------------------- SERVER -------------------- */

const PORT = process.env.PORT || 5000;

app.listen(PORT, () =>
  console.log(`🚀 Trading Engine running on port ${PORT}`),
);
