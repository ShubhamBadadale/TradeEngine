require("dotenv").config();
const express = require("express");
const mysql = require("mysql2/promise");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// --- Database Connection Pool ---
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "your db passworf",
  database: process.env.DB_NAME || "trading_simulator",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const JWT_SECRET =
  process.env.JWT_SECRET || "super_secret_trading_key_change_in_prod";

// --- Middleware: Authenticate Token ---
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

// --- AUTHENTICATION ROUTES ---

// Register
app.post("/api/auth/register", async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await pool.execute(
      "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
      [name, email, hashedPassword],
    );
    res.status(201).json({ message: "User registered successfully!" });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      res.status(400).json({ error: "Email already exists." });
    } else {
      res.status(500).json({ error: "Database error." });
    }
  }
});

// Login
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const [users] = await pool.execute("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    const user = users[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: "24h",
    });
    res.json({
      message: "Login successful",
      token,
      user: { id: user.id, name: user.name, balance: user.balance },
    });
  } catch (error) {
    res.status(500).json({ error: "Server error." });
  }
});

// --- MARKET ROUTES ---

// Get all stocks (Simulates live market)
app.get("/api/stocks", async (req, res) => {
  try {
    // Simulate minor price fluctuations in the DB for realism
    await pool.query(
      "UPDATE stocks SET current_price = current_price * (1 + (RAND() * 0.02 - 0.01))",
    );

    const [stocks] = await pool.query("SELECT * FROM stocks");
    res.json(stocks);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch stocks." });
  }
});

// --- USER & PORTFOLIO ROUTES ---

// Get user profile & balance
app.get("/api/user/profile", authenticateToken, async (req, res) => {
  try {
    const [users] = await pool.execute(
      "SELECT id, name, email, balance FROM users WHERE id = ?",
      [req.user.id],
    );
    res.json(users[0]);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch user profile." });
  }
});

// Get Portfolio
app.get("/api/portfolio", authenticateToken, async (req, res) => {
  try {
    const query = `
            SELECT p.*, s.name, s.current_price, 
            (s.current_price - p.average_buy_price) * p.quantity AS unrealized_pnl
            FROM portfolio p
            JOIN stocks s ON p.stock_symbol = s.symbol
            WHERE p.user_id = ? AND p.quantity > 0
        `;
    const [portfolio] = await pool.execute(query, [req.user.id]);
    res.json(portfolio);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch portfolio." });
  }
});

// Get Transactions
app.get("/api/transactions", authenticateToken, async (req, res) => {
  try {
    const [transactions] = await pool.execute(
      "SELECT * FROM transactions WHERE user_id = ? ORDER BY timestamp DESC",
      [req.user.id],
    );
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch transactions." });
  }
});

// --- TRADING ENGINE ROUTES ---

// Buy Stock
app.post("/api/trade/buy", authenticateToken, async (req, res) => {
  const { symbol, quantity } = req.body;
  const userId = req.user.id;
  const parsedQty = parseInt(quantity);

  if (!symbol || parsedQty <= 0)
    return res.status(400).json({ error: "Invalid input." });

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Get current stock price
    const [stocks] = await connection.execute(
      "SELECT current_price FROM stocks WHERE symbol = ?",
      [symbol],
    );
    if (stocks.length === 0) throw new Error("Stock not found.");
    const currentPrice = parseFloat(stocks[0].current_price);
    const totalCost = currentPrice * parsedQty;

    // 2. Check user balance
    const [users] = await connection.execute(
      "SELECT balance FROM users WHERE id = ? FOR UPDATE",
      [userId],
    );
    const balance = parseFloat(users[0].balance);
    if (balance < totalCost) throw new Error("Insufficient balance.");

    // 3. Deduct balance
    await connection.execute(
      "UPDATE users SET balance = balance - ? WHERE id = ?",
      [totalCost, userId],
    );

    // 4. Update Portfolio (Calculate new average buy price)
    const [portfolio] = await connection.execute(
      "SELECT quantity, average_buy_price FROM portfolio WHERE user_id = ? AND stock_symbol = ? FOR UPDATE",
      [userId, symbol],
    );

    if (portfolio.length > 0) {
      const oldQty = portfolio[0].quantity;
      const oldAvgPrice = parseFloat(portfolio[0].average_buy_price);
      const newQty = oldQty + parsedQty;
      const newAvgPrice = (oldQty * oldAvgPrice + totalCost) / newQty;

      await connection.execute(
        "UPDATE portfolio SET quantity = ?, average_buy_price = ? WHERE user_id = ? AND stock_symbol = ?",
        [newQty, newAvgPrice, userId, symbol],
      );
    } else {
      await connection.execute(
        "INSERT INTO portfolio (user_id, stock_symbol, quantity, average_buy_price) VALUES (?, ?, ?, ?)",
        [userId, symbol, parsedQty, currentPrice],
      );
    }

    // 5. Record Transaction
    await connection.execute(
      "INSERT INTO transactions (user_id, stock_symbol, type, quantity, price_per_share, total_amount) VALUES (?, ?, ?, ?, ?, ?)",
      [userId, symbol, "BUY", parsedQty, currentPrice, totalCost],
    );

    await connection.commit();
    res.json({
      message: `Successfully bought ${parsedQty} shares of ${symbol}.`,
      cost: totalCost,
    });
  } catch (error) {
    await connection.rollback();
    res.status(400).json({ error: error.message || "Trade failed." });
  } finally {
    connection.release();
  }
});

// Sell Stock
app.post("/api/trade/sell", authenticateToken, async (req, res) => {
  const { symbol, quantity } = req.body;
  const userId = req.user.id;
  const parsedQty = parseInt(quantity);

  if (!symbol || parsedQty <= 0)
    return res.status(400).json({ error: "Invalid input." });

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Get Portfolio holding
    const [portfolio] = await connection.execute(
      "SELECT quantity FROM portfolio WHERE user_id = ? AND stock_symbol = ? FOR UPDATE",
      [userId, symbol],
    );
    if (portfolio.length === 0 || portfolio[0].quantity < parsedQty) {
      throw new Error("Insufficient shares to sell.");
    }

    // 2. Get current stock price
    const [stocks] = await connection.execute(
      "SELECT current_price FROM stocks WHERE symbol = ?",
      [symbol],
    );
    const currentPrice = parseFloat(stocks[0].current_price);
    const totalEarnings = currentPrice * parsedQty;

    // 3. Update Portfolio (Subtract quantity)
    await connection.execute(
      "UPDATE portfolio SET quantity = quantity - ? WHERE user_id = ? AND stock_symbol = ?",
      [parsedQty, userId, symbol],
    );

    // 4. Add to User Balance
    await connection.execute(
      "UPDATE users SET balance = balance + ? WHERE id = ?",
      [totalEarnings, userId],
    );

    // 5. Record Transaction
    await connection.execute(
      "INSERT INTO transactions (user_id, stock_symbol, type, quantity, price_per_share, total_amount) VALUES (?, ?, ?, ?, ?, ?)",
      [userId, symbol, "SELL", parsedQty, currentPrice, totalEarnings],
    );

    await connection.commit();
    res.json({
      message: `Successfully sold ${parsedQty} shares of ${symbol}.`,
      earnings: totalEarnings,
    });
  } catch (error) {
    await connection.rollback();
    res.status(400).json({ error: error.message || "Trade failed." });
  } finally {
    connection.release();
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`🚀 Trading Engine running on port ${PORT}`),
);
