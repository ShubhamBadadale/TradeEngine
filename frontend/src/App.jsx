import React, { useState, useEffect, createContext, useContext } from "react";
import {
  LineChart,
  Wallet,
  PieChart,
  History,
  ArrowUpRight,
  ArrowDownRight,
  LogOut,
  Activity,
  User,
  Briefcase,
  Search,
  TrendingUp,
  DollarSign,
} from "lucide-react";

// --- CONFIGURATION ---
// Set this to your local backend URL when running full-stack.
const API_BASE_URL = "http://localhost:5000/api";

// --- GLOBAL STATE & CONTEXT ---
const AuthContext = createContext(null);

export default function App() {
  // App Navigation State (Switch-case routing)
  const [currentPage, setCurrentPage] = useState("login");

  // Auth State
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(
    localStorage.getItem("trade_token") || null,
  );

  // Global Notification State
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // --- API HELPER FUNCTION ---
  const fetchAPI = async (endpoint, options = {}) => {
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    try {
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "API Error");
      return data;
    } catch (error) {
      console.error(`API Error on ${endpoint}:`, error.message);
      throw error;
    }
  };

  // --- AUTH ACTIONS ---
  const login = async (email, password) => {
    try {
      const data = await fetchAPI("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setToken(data.token);
      setUser(data.user);
      localStorage.setItem("trade_token", data.token);
      setCurrentPage("dashboard");
      showToast("Login successful!", "success");
    } catch (error) {
      showToast(error.message, "error");
    }
  };

  const register = async (name, email, password) => {
    try {
      await fetchAPI("/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      });
      showToast("Registration successful! Please login.", "success");
      setCurrentPage("login");
    } catch (error) {
      showToast(error.message, "error");
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("trade_token");
    setCurrentPage("login");
    showToast("Logged out.", "info");
  };

  // --- INITIALIZATION ---
  useEffect(() => {
    if (token) {
      // Attempt to fetch profile to validate token
      fetchAPI("/user/profile")
        .then((userData) => {
          setUser(userData);
          if (currentPage === "login" || currentPage === "register") {
            setCurrentPage("dashboard");
          }
        })
        .catch(() => {
          logout(); // Token invalid
        });
    }
  }, [token]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        register,
        logout,
        fetchAPI,
        showToast,
        setCurrentPage,
      }}
    >
      <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500/30">
        {/* Toast Notification */}
        {toast && (
          <div
            className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg border transition-all duration-300 transform translate-y-0
                        ${
                          toast.type === "error"
                            ? "bg-red-900/80 border-red-500 text-red-100"
                            : toast.type === "success"
                              ? "bg-emerald-900/80 border-emerald-500 text-emerald-100"
                              : "bg-slate-800 border-slate-600"
                        }`}
          >
            {toast.msg}
          </div>
        )}

        {/* Routing Logic */}
        {!user && (currentPage === "login" || currentPage === "register") ? (
          <AuthPages
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
          />
        ) : (
          <MainLayout currentPage={currentPage}>
            {currentPage === "dashboard" && <Dashboard />}
            {currentPage === "trade" && <Trade />}
            {currentPage === "portfolio" && <Portfolio />}
            {currentPage === "history" && <HistoryPage />}
          </MainLayout>
        )}
      </div>
    </AuthContext.Provider>
  );
}

// ============================================================================
// LAYOUT COMPONENTS
// ============================================================================

function MainLayout({ children, currentPage }) {
  const { logout, user, setCurrentPage } = useContext(AuthContext);

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: <PieChart size={20} /> },
    { id: "trade", label: "Market / Trade", icon: <Activity size={20} /> },
    { id: "portfolio", label: "Holdings", icon: <Briefcase size={20} /> },
    { id: "history", label: "History", icon: <History size={20} /> },
  ];

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col transition-all">
        <div className="h-16 flex items-center px-6 border-b border-slate-800">
          <TrendingUp className="text-indigo-500 mr-2" size={24} />
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
            TradeEngine
          </span>
        </div>

        <div className="p-4 flex flex-col gap-2 flex-grow">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                currentPage === item.id
                  ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              }`}
            >
              {item.icon}
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 px-4 py-2 mb-4 bg-slate-800/50 rounded-lg">
            <div className="bg-indigo-500/20 p-2 rounded-full">
              <User className="text-indigo-400" size={16} />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate">
                {user?.name || "Trader"}
              </p>
              <p className="text-xs text-slate-500 truncate">
                ₹{parseFloat(user?.balance || 0).toLocaleString("en-IN")}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-slate-950">
        <div className="p-8 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}

// ============================================================================
// PAGE COMPONENTS
// ============================================================================

function AuthPages({ currentPage, setCurrentPage }) {
  const { login, register } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const isLogin = currentPage === "login";

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isLogin) {
      login(formData.email, formData.password);
    } else {
      register(formData.name, formData.email, formData.password);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            <TrendingUp className="text-indigo-500" size={32} />
            <span className="text-2xl font-bold text-white">TradeEngine</span>
          </div>
        </div>

        <h2 className="text-2xl font-semibold mb-6 text-center">
          {isLogin ? "Welcome back" : "Create an account"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
            />
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg transition-colors mt-6"
          >
            {isLogin ? "Sign In" : "Register"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-400">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button
            onClick={() => setCurrentPage(isLogin ? "register" : "login")}
            className="text-indigo-400 hover:text-indigo-300 font-medium"
          >
            {isLogin ? "Sign up" : "Log in"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Dashboard() {
  const { user, fetchAPI } = useContext(AuthContext);
  const [portfolioData, setPortfolioData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAPI("/portfolio")
      .then((data) => {
        setPortfolioData(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const totalInvested = portfolioData.reduce(
    (acc, item) => acc + item.quantity * item.average_buy_price,
    0,
  );
  const currentValue = portfolioData.reduce(
    (acc, item) => acc + item.quantity * item.current_price,
    0,
  );
  const totalPnL = currentValue - totalInvested;
  const pnlPercentage =
    totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Dashboard Summary</h1>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-400 font-medium">Available Cash</h3>
            <div className="p-2 bg-indigo-500/20 rounded-lg">
              <Wallet className="text-indigo-400" size={20} />
            </div>
          </div>
          <p className="text-3xl font-bold text-white">
            ₹
            {parseFloat(user?.balance || 0).toLocaleString("en-IN", {
              minimumFractionDigits: 2,
            })}
          </p>
        </Card>

        <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-400 font-medium">Invested Value</h3>
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <LineChart className="text-blue-400" size={20} />
            </div>
          </div>
          <p className="text-3xl font-bold text-white">
            ₹
            {totalInvested.toLocaleString("en-IN", {
              minimumFractionDigits: 2,
            })}
          </p>
          <p className="text-sm text-slate-400 mt-2">
            Current: ₹
            {currentValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </p>
        </Card>

        <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-400 font-medium">Total P&L</h3>
            <div
              className={`p-2 rounded-lg ${totalPnL >= 0 ? "bg-emerald-500/20" : "bg-red-500/20"}`}
            >
              <DollarSign
                className={totalPnL >= 0 ? "text-emerald-400" : "text-red-400"}
                size={20}
              />
            </div>
          </div>
          <p
            className={`text-3xl font-bold ${totalPnL >= 0 ? "text-emerald-400" : "text-red-400"}`}
          >
            {totalPnL >= 0 ? "+" : ""}₹
            {totalPnL.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </p>
          <p
            className={`text-sm mt-2 flex items-center ${totalPnL >= 0 ? "text-emerald-500" : "text-red-500"}`}
          >
            {totalPnL >= 0 ? (
              <ArrowUpRight size={16} className="mr-1" />
            ) : (
              <ArrowDownRight size={16} className="mr-1" />
            )}
            {Math.abs(pnlPercentage).toFixed(2)}% All time
          </p>
        </Card>
      </div>

      {/* Quick Holdings Preview */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold text-white mb-4">Top Holdings</h2>
        <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-500">
              Loading holdings...
            </div>
          ) : portfolioData.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              Your portfolio is empty. Go to Market to start trading!
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-slate-800/50 text-slate-400 text-sm">
                <tr>
                  <th className="px-6 py-4 font-medium">Symbol</th>
                  <th className="px-6 py-4 font-medium">Qty</th>
                  <th className="px-6 py-4 font-medium">Avg Price</th>
                  <th className="px-6 py-4 font-medium">LTP</th>
                  <th className="px-6 py-4 font-medium text-right">P&L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {portfolioData.slice(0, 5).map((item) => (
                  <tr
                    key={item.stock_symbol}
                    className="hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="px-6 py-4 font-medium text-white">
                      {item.stock_symbol}
                    </td>
                    <td className="px-6 py-4">{item.quantity}</td>
                    <td className="px-6 py-4">
                      ₹{parseFloat(item.average_buy_price).toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      ₹{parseFloat(item.current_price).toFixed(2)}
                    </td>
                    <td
                      className={`px-6 py-4 text-right font-medium ${item.unrealized_pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}
                    >
                      {item.unrealized_pnl >= 0 ? "+" : ""}₹
                      {parseFloat(item.unrealized_pnl).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function Trade() {
  const { fetchAPI, showToast, user } = useContext(AuthContext);
  const [stocks, setStocks] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedStock, setSelectedStock] = useState(null);
  const [tradeQty, setTradeQty] = useState("");
  const [loading, setLoading] = useState(false);

  // Refresh stocks every 5 seconds to simulate live market
  useEffect(() => {
    const loadStocks = () => {
      fetchAPI("/stocks").then(setStocks).catch(console.error);
    };
    loadStocks();
    const interval = setInterval(loadStocks, 5000);
    return () => clearInterval(interval);
  }, []);

  const filteredStocks = stocks.filter(
    (s) =>
      s.symbol.toLowerCase().includes(search.toLowerCase()) ||
      s.name.toLowerCase().includes(search.toLowerCase()),
  );

  const handleTrade = async (type) => {
    if (!tradeQty || isNaN(tradeQty) || tradeQty <= 0) {
      return showToast("Please enter a valid quantity", "error");
    }
    setLoading(true);
    try {
      const endpoint = type === "BUY" ? "/trade/buy" : "/trade/sell";
      const res = await fetchAPI(endpoint, {
        method: "POST",
        body: JSON.stringify({
          symbol: selectedStock.symbol,
          quantity: tradeQty,
        }),
      });
      showToast(res.message, "success");
      setTradeQty("");
      setSelectedStock(null);
      // In a real app, you'd trigger a user balance refresh here via Context
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-6 h-full min-h-[80vh]">
      {/* Market List */}
      <div className="w-2/3 bg-slate-900 border border-slate-800 rounded-xl flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-800/30">
          <h2 className="text-lg font-semibold text-white">Market Watch</h2>
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              size={16}
            />
            <input
              type="text"
              placeholder="Search stocks..."
              className="bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-indigo-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-950 sticky top-0 text-slate-400 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3 font-medium">Company</th>
                <th className="px-6 py-3 font-medium text-right">LTP (₹)</th>
                <th className="px-6 py-3 font-medium text-right">Change</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filteredStocks.map((stock) => {
                const change = stock.current_price - stock.previous_close;
                const changePct = (change / stock.previous_close) * 100;
                const isPos = change >= 0;
                return (
                  <tr
                    key={stock.symbol}
                    onClick={() => setSelectedStock(stock)}
                    className={`cursor-pointer transition-colors ${selectedStock?.symbol === stock.symbol ? "bg-indigo-500/10" : "hover:bg-slate-800/40"}`}
                  >
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-200">
                        {stock.symbol}
                      </div>
                      <div className="text-xs text-slate-500">{stock.name}</div>
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-white">
                      {parseFloat(stock.current_price).toFixed(2)}
                    </td>
                    <td
                      className={`px-6 py-4 text-right flex items-center justify-end gap-1 ${isPos ? "text-emerald-400" : "text-red-400"}`}
                    >
                      {isPos ? (
                        <ArrowUpRight size={14} />
                      ) : (
                        <ArrowDownRight size={14} />
                      )}
                      {Math.abs(changePct).toFixed(2)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Trading Panel */}
      <div className="w-1/3 bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col">
        {selectedStock ? (
          <>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-1">
                {selectedStock.symbol}
              </h2>
              <p className="text-slate-400 text-sm mb-4">
                {selectedStock.name}
              </p>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold text-white">
                  ₹{parseFloat(selectedStock.current_price).toFixed(2)}
                </span>
                {(() => {
                  const c =
                    selectedStock.current_price - selectedStock.previous_close;
                  return (
                    <span
                      className={`text-sm mb-1 ${c >= 0 ? "text-emerald-400" : "text-red-400"}`}
                    >
                      {c >= 0 ? "+" : ""}
                      {c.toFixed(2)}
                    </span>
                  );
                })()}
              </div>
            </div>

            <div className="bg-slate-950 rounded-lg p-4 mb-6 border border-slate-800">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-400">Available Margin</span>
                <span className="text-white font-medium">
                  ₹{parseFloat(user?.balance || 0).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="space-y-4 flex-1">
              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500 text-lg"
                  value={tradeQty}
                  onChange={(e) => setTradeQty(e.target.value)}
                  placeholder="0"
                />
              </div>

              {tradeQty > 0 && (
                <div className="flex justify-between text-sm py-2">
                  <span className="text-slate-400">Required Margin</span>
                  <span className="text-indigo-400 font-medium">
                    ₹{(tradeQty * selectedStock.current_price).toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-4 mt-6">
              <button
                onClick={() => handleTrade("BUY")}
                disabled={loading}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
              >
                BUY
              </button>
              <button
                onClick={() => handleTrade("SELL")}
                disabled={loading}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
              >
                SELL
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500 flex-col gap-4">
            <Activity size={48} className="text-slate-700" />
            <p>Select a stock from the market to trade</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Portfolio() {
  const { fetchAPI } = useContext(AuthContext);
  const [portfolio, setPortfolio] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAPI("/portfolio")
      .then((data) => {
        setPortfolio(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Your Holdings</h1>
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            Fetching portfolio...
          </div>
        ) : portfolio.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Briefcase size={48} className="mx-auto mb-4 text-slate-600" />
            <p>
              No holdings found. Start buying stocks to build your portfolio!
            </p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-slate-800/80 text-slate-300 text-sm border-b border-slate-700">
              <tr>
                <th className="px-6 py-4 font-medium">Instrument</th>
                <th className="px-6 py-4 font-medium text-right">Qty</th>
                <th className="px-6 py-4 font-medium text-right">Avg Cost</th>
                <th className="px-6 py-4 font-medium text-right">LTP</th>
                <th className="px-6 py-4 font-medium text-right">
                  Current Value
                </th>
                <th className="px-6 py-4 font-medium text-right">P&L</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {portfolio.map((item) => {
                const pnl = item.unrealized_pnl;
                const pnlPct =
                  (pnl / (item.quantity * item.average_buy_price)) * 100;
                const isPos = pnl >= 0;
                return (
                  <tr
                    key={item.stock_symbol}
                    className="hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-200">
                        {item.stock_symbol}
                      </div>
                      <div className="text-xs text-slate-500">{item.name}</div>
                    </td>
                    <td className="px-6 py-4 text-right text-slate-300">
                      {item.quantity}
                    </td>
                    <td className="px-6 py-4 text-right text-slate-300">
                      ₹{parseFloat(item.average_buy_price).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-right text-slate-300">
                      ₹{parseFloat(item.current_price).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-white">
                      ₹{(item.quantity * item.current_price).toFixed(2)}
                    </td>
                    <td
                      className={`px-6 py-4 text-right ${isPos ? "text-emerald-400" : "text-red-400"}`}
                    >
                      <div className="font-medium">
                        {isPos ? "+" : ""}₹{parseFloat(pnl).toFixed(2)}
                      </div>
                      <div className="text-xs">
                        {isPos ? "+" : ""}
                        {pnlPct.toFixed(2)}%
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function HistoryPage() {
  const { fetchAPI } = useContext(AuthContext);
  const [txns, setTxns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAPI("/transactions")
      .then((data) => {
        setTxns(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">
        Transaction History
      </h1>
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            Loading history...
          </div>
        ) : txns.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            No transactions yet.
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-slate-800/80 text-slate-300 text-sm">
              <tr>
                <th className="px-6 py-4 font-medium">Date & Time</th>
                <th className="px-6 py-4 font-medium">Instrument</th>
                <th className="px-6 py-4 font-medium">Type</th>
                <th className="px-6 py-4 font-medium text-right">Qty</th>
                <th className="px-6 py-4 font-medium text-right">Price</th>
                <th className="px-6 py-4 font-medium text-right">
                  Total Amount
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {txns.map((txn) => (
                <tr key={txn.id} className="hover:bg-slate-800/30">
                  <td className="px-6 py-4 text-sm text-slate-400">
                    {new Date(txn.timestamp).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 font-semibold text-slate-200">
                    {txn.stock_symbol}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 text-xs rounded font-bold ${txn.type === "BUY" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}
                    >
                      {txn.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-slate-300">
                    {txn.quantity}
                  </td>
                  <td className="px-6 py-4 text-right text-slate-300">
                    ₹{parseFloat(txn.price_per_share).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-white">
                    ₹{parseFloat(txn.total_amount).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// Utility Card Component
function Card({ children, className = "" }) {
  return (
    <div className={`p-6 rounded-2xl border shadow-lg ${className}`}>
      {children}
    </div>
  );
}
