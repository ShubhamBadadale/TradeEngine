-- Create Database
CREATE DATABASE IF NOT EXISTS trading_simulator;
USE trading_simulator;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    balance DECIMAL(15, 2) DEFAULT 100000.00, -- Start users with ₹1,00,000 virtual money
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Stocks Table (Used to simulate the market)
CREATE TABLE IF NOT EXISTS stocks (
    symbol VARCHAR(20) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    current_price DECIMAL(15, 2) NOT NULL,
    previous_close DECIMAL(15, 2) NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Portfolio Table
CREATE TABLE IF NOT EXISTS portfolio (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    stock_symbol VARCHAR(20) NOT NULL,
    quantity INT NOT NULL DEFAULT 0,
    average_buy_price DECIMAL(15, 2) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (stock_symbol) REFERENCES stocks(symbol) ON DELETE CASCADE,
    UNIQUE KEY unique_user_stock (user_id, stock_symbol) -- A user has one portfolio entry per stock
);

-- Transactions History Table
CREATE TABLE IF NOT EXISTS transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    stock_symbol VARCHAR(20) NOT NULL,
    type ENUM('BUY', 'SELL') NOT NULL,
    quantity INT NOT NULL,
    price_per_share DECIMAL(15, 2) NOT NULL,
    total_amount DECIMAL(15, 2) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (stock_symbol) REFERENCES stocks(symbol) ON DELETE CASCADE
);

-- Seed Initial Mock Stocks
INSERT IGNORE INTO stocks (symbol, name, current_price, previous_close) VALUES
('RELIANCE', 'Reliance Industries', 2950.40, 2900.00),
('TCS', 'Tata Consultancy Services', 4120.15, 4150.00),
('HDFCBANK', 'HDFC Bank', 1450.75, 1420.50),
('INFY', 'Infosys Ltd', 1680.00, 1695.20),
('TATAMOTORS', 'Tata Motors', 980.60, 950.00),
('ITC', 'ITC Limited', 420.30, 415.80);