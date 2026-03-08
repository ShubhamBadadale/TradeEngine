const mongoose = require("mongoose");
const Stock = require("./models/Stock");

mongoose
  .connect("mongodb://127.0.0.1:27017/trading_simulator")
  .then(async () => {
    await Stock.deleteMany(); // clear old data

    await Stock.insertMany([
      { symbol: "AAPL", name: "Apple", current_price: 180 },
      { symbol: "MSFT", name: "Microsoft", current_price: 330 },
      { symbol: "GOOGL", name: "Alphabet (Google)", current_price: 140 },
      { symbol: "AMZN", name: "Amazon", current_price: 170 },
      { symbol: "TSLA", name: "Tesla", current_price: 250 },
      { symbol: "META", name: "Meta Platforms", current_price: 470 },
      { symbol: "NVDA", name: "NVIDIA", current_price: 720 },
      { symbol: "NFLX", name: "Netflix", current_price: 610 },
      { symbol: "AMD", name: "AMD", current_price: 165 },
      { symbol: "INTC", name: "Intel", current_price: 43 },

      { symbol: "JPM", name: "JPMorgan Chase", current_price: 190 },
      { symbol: "BAC", name: "Bank of America", current_price: 36 },
      { symbol: "WFC", name: "Wells Fargo", current_price: 59 },
      { symbol: "GS", name: "Goldman Sachs", current_price: 410 },

      { symbol: "DIS", name: "Disney", current_price: 115 },
      { symbol: "NKE", name: "Nike", current_price: 102 },
      { symbol: "PEP", name: "PepsiCo", current_price: 175 },
      { symbol: "KO", name: "Coca-Cola", current_price: 62 },

      { symbol: "ORCL", name: "Oracle", current_price: 130 },
      { symbol: "IBM", name: "IBM", current_price: 185 },
      { symbol: "CRM", name: "Salesforce", current_price: 295 },

      { symbol: "UBER", name: "Uber", current_price: 76 },
      { symbol: "LYFT", name: "Lyft", current_price: 15 },

      { symbol: "BABA", name: "Alibaba", current_price: 80 },
      { symbol: "TCEHY", name: "Tencent", current_price: 47 },
    ]);

    console.log("Stocks inserted successfully");

    mongoose.connection.close();
  })
  .catch((err) => console.log(err));
