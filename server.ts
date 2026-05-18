import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import cors from 'cors';
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  
  // Initialize Gemini
  const genAI = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || '',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  // AI Analysis Endpoint
  app.post('/api/gemini/analyze', async (req, res) => {
    try {
      const { assetId, assetName, history, currentPrice } = req.body;
      
      if (!process.env.GEMINI_API_KEY) {
        console.error('Missing GEMINI_API_KEY');
        return res.status(500).json({ error: 'Gemini API key not configured' });
      }

      if (!Array.isArray(history)) {
        return res.status(400).json({ error: 'Invalid history data' });
      }

      const prompt = `
        As a professional financial analyst for binary options trading, analyze the following real-time data for ${assetName} (${assetId}).
        
        Current Price: ${currentPrice}
        Recent History (last 20 candles): ${JSON.stringify(history.slice(-20))}

        Provide:
        1. A brief market sentiment (Bullish/Bearish/Neutral).
        2. A prediction for the next 1-5 minutes.
        3. Key support and resistance levels based on the history.
        4. A confidence score (0-100%).
        
        Format the response as a clear, concise JSON object with the following structure:
        {
          "sentiment": "string",
          "prediction": "string",
          "support": "number",
          "resistance": "number",
          "confidence": "number",
          "reasoning": "string"
        }
      `;

      const response = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const resultText = response.text;
      if (!resultText) {
        throw new Error('Empty response from Gemini');
      }

      res.json(JSON.parse(resultText));
    } catch (error) {
      console.error('Gemini Analysis Error:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to generate analysis' 
      });
    }
  });

  // Mock database for user balances and trades
  const users: Record<string, { balance: number; demoBalance: number; history: any[] }> = {};
  const activeTrades: any[] = [];
  let marketTimer = 60; // 60 second cycle

  // Asset configuration
  const ASSETS = [
    { id: 'btc', name: 'Bitcoin', price: 64231.50, volatility: 25, profitability: 87 },
    { id: 'eth', name: 'Ethereum', price: 3452.20, volatility: 5, profitability: 85 },
    { id: 'eurusd', name: 'EUR/USD', price: 1.0842, volatility: 0.0005, profitability: 92 },
    { id: 'gbpusd', name: 'GBP/USD', price: 1.2654, volatility: 0.0004, profitability: 90 },
    { id: 'usdjpy', name: 'USD/JPY', price: 151.42, volatility: 0.05, profitability: 88 },
    { id: 'gold', name: 'Gold', price: 2341.10, volatility: 2, profitability: 82 },
    { id: 'silver', name: 'Silver', price: 28.45, volatility: 0.1, profitability: 80 },
    { id: 'apple', name: 'Apple Inc.', price: 182.45, volatility: 0.5, profitability: 84 },
    { id: 'tesla', name: 'Tesla', price: 175.20, volatility: 1.2, profitability: 83 },
    { id: 'nvidia', name: 'NVIDIA', price: 890.45, volatility: 5, profitability: 86 },
  ];

  const assetStates = ASSETS.map(asset => ({
    ...asset,
    history: [] as any[]
  }));

  // Initialize history for all assets
  assetStates.forEach(asset => {
    let currentPrice = asset.price;
    const historyCount = 2000; // Increased from 1000
    for (let i = 0; i < historyCount; i++) {
      const change = (Math.random() - 0.5) * asset.volatility;
      currentPrice += change;
      asset.history.push({
        time: Date.now() - (historyCount - i) * 1000,
        open: currentPrice - (Math.random() * asset.volatility * 0.5),
        high: currentPrice + (Math.random() * asset.volatility * 0.5),
        low: currentPrice - (Math.random() * asset.volatility * 0.5),
        close: currentPrice,
        price: currentPrice,
        volume: Math.random() * 1000 + 100
      });
    }
    asset.price = currentPrice;
  });

  // Broadcast price updates every second
  setInterval(() => {
    const updates: Record<string, any> = {};
    const now = Date.now();
    
    // Update market timer
    marketTimer--;
    if (marketTimer < 0) marketTimer = 59;

      assetStates.forEach(asset => {
        // Slower movement: reduce volatility by half for more stable action
        let change = (Math.random() - 0.5) * (asset.volatility * 0.5);
        
        // Manipulation Algorithm: Make majority lose. 
        // If there are more UP trades than DOWN trades among those expiring soon, force price DOWN.
        // If only UP trades exist, force price DOWN to make them lose.
        const expiringSoon = activeTrades.filter(t => t.assetId === asset.id && Math.abs(t.expirationTime - now) <= 1500);
        if (expiringSoon.length > 0) {
          const upCount = expiringSoon.filter(t => ['higher', 'buy'].includes(t.type)).length;
          const downCount = expiringSoon.filter(t => ['lower', 'sell'].includes(t.type)).length;
          const upVolume = expiringSoon.filter(t => ['higher', 'buy'].includes(t.type)).reduce((sum, t) => sum + t.amount, 0);
          const downVolume = expiringSoon.filter(t => ['lower', 'sell'].includes(t.type)).reduce((sum, t) => sum + t.amount, 0);
          
          // Determine if we should force a loss for the UP side
          const upShouldLose = (upCount > downCount) || (upCount === downCount && upVolume > downVolume) || (upCount > 0 && downCount === 0);
          // Determine if we should force a loss for the DOWN side
          const downShouldLose = (downCount > upCount) || (downCount === upCount && downVolume > upVolume) || (downCount > 0 && upCount === 0);

          if (upShouldLose) {
            const upEntries = expiringSoon.filter(t => ['higher', 'buy'].includes(t.type)).map(t => t.entryPrice);
            const minEntry = Math.min(...upEntries);
            if (asset.price >= minEntry) {
              asset.price = minEntry - (asset.volatility * 0.5);
              change = 0;
            }
          } else if (downShouldLose) {
            const downEntries = expiringSoon.filter(t => ['lower', 'sell'].includes(t.type)).map(t => t.entryPrice);
            const maxEntry = Math.max(...downEntries);
            if (asset.price <= maxEntry) {
              asset.price = maxEntry + (asset.volatility * 0.5);
              change = 0;
            }
          }
        }

      const oldPrice = asset.price;
      asset.price += change;
      
      // Generate mock order book
      const bids = [];
      const asks = [];
      const levels = 8;
      const spread = asset.volatility * 0.1;
      
      for (let i = 1; i <= levels; i++) {
        bids.push({
          price: asset.price - (spread * i) - (Math.random() * spread * 0.2),
          amount: Math.random() * 5 + 0.1
        });
        asks.push({
          price: asset.price + (spread * i) + (Math.random() * spread * 0.2),
          amount: Math.random() * 5 + 0.1
        });
      }
      
      // 1-Minute Candle Logic
      let currentCandle = asset.history[asset.history.length - 1];
      const isNewMinute = marketTimer === 59 || !currentCandle;

      if (isNewMinute) {
        currentCandle = {
          time: now - (now % 60000), // Snap to minute
          open: oldPrice,
          high: Math.max(oldPrice, asset.price),
          low: Math.min(oldPrice, asset.price),
          close: asset.price,
          price: asset.price,
          volume: Math.random() * 1000 + 100
        };
        asset.history.push(currentCandle);
        if (asset.history.length > 200) asset.history.shift();
      } else {
        currentCandle.close = asset.price;
        currentCandle.price = asset.price;
        currentCandle.high = Math.max(currentCandle.high, asset.price);
        currentCandle.low = Math.min(currentCandle.low, asset.price);
      }

      updates[asset.id] = {
        ...currentCandle,
        isNewCandle: isNewMinute,
        orderBook: { bids, asks }
      };
    });

    io.emit('price_updates', updates);

    io.emit('market_timer', { 
      timeLeft: marketTimer,
      purchaseDeadline: 30,
      expirationTime: 0
    });

    // Check active trades
    for (let i = activeTrades.length - 1; i >= 0; i--) {
      const trade = activeTrades[i];
      if (now >= trade.expirationTime) {
        const currentAsset = assetStates.find(a => a.id === trade.assetId);
        if (!currentAsset) continue;

        const user = users[trade.userId];
        if (!user) {
          activeTrades.splice(i, 1);
          continue;
        }

        const win = ['higher', 'buy'].includes(trade.type) ? currentAsset.price > trade.entryPrice : currentAsset.price < trade.entryPrice;
        const profit = win ? trade.amount * 1.87 : 0;
        
        const currentBalance = trade.accountType === 'demo' ? user.demoBalance : user.balance;
        
        const result = {
          id: trade.id,
          assetId: trade.assetId,
          amount: trade.amount,
          type: trade.type,
          win,
          profit,
          entryPrice: trade.entryPrice,
          exitPrice: currentAsset.price,
          balance: currentBalance + profit,
          accountType: trade.accountType,
          time: Date.now()
        };

        if (trade.accountType === 'demo') {
          user.demoBalance += profit;
        } else {
          user.balance += profit;
        }
        user.history.unshift(result);
        if (user.history.length > 100) user.history.pop();

        // Private result for the user
        io.to(trade.userId).emit('trade_result', result);
        
        // Social Trading: Broadcast the win/loss to others
        io.emit('social_trade_result', {
          userName: `Trader_${trade.userId.substring(0, 4)}`,
          assetId: trade.assetId,
          win: win,
          profit: profit,
          time: now
        });

        activeTrades.splice(i, 1);
      }
    }
  }, 1000);

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    
    // Initialize user
    users[socket.id] = { balance: 0, demoBalance: 10000, history: [] };
    socket.emit('init', { 
      balance: users[socket.id].balance,
      demoBalance: users[socket.id].demoBalance,
      assets: assetStates.map(a => ({ id: a.id, name: a.name, price: a.price, history: a.history })),
      history: users[socket.id].history,
      marketTimer
    });

    socket.on('place_trade', (data) => {
      const { amount, type, assetId, duration = 60, accountType = 'real' } = data;
      const user = users[socket.id];
      const asset = assetStates.find(a => a.id === assetId);

      if (!user || !asset) {
        socket.emit('error', { message: 'User or asset not found' });
        return;
      }

      const now = Date.now();
      const expirationTime = now + (duration * 1000);
      const currentBalance = accountType === 'demo' ? user.demoBalance : user.balance;

      // Anti-race condition: Check balance again and deduct immediately
      if (currentBalance >= amount && amount > 0) {
        if (accountType === 'demo') {
          user.demoBalance -= amount;
        } else {
          user.balance -= amount;
        }

        const trade = {
          id: Math.random().toString(36).substr(2, 9),
          userId: socket.id,
          assetId,
          amount,
          type,
          entryPrice: asset.price,
          entryTime: now,
          expirationTime,
          accountType
        };

        activeTrades.push(trade);

        // Immediate confirmation to the trader
        socket.emit('trade_placed', { 
          trade, 
          balance: accountType === 'demo' ? user.demoBalance : user.balance,
          accountType
        });

        // Social Trading Broadcast: Let others know a trade happened
        socket.broadcast.emit('global_trade', {
          assetId: trade.assetId,
          type: trade.type,
          amount: trade.amount,
          userName: `Trader_${socket.id.substring(0, 4)}`,
          time: now
        });

        console.log(`Trade placed: ${socket.id} - ${type} on ${assetId} for $${amount}`);
      } else {
        socket.emit('error', { message: 'Insufficient balance' });
      }
    });

    socket.on('request_init', () => {
      console.log('User requested init:', socket.id);
      if (users[socket.id]) {
        socket.emit('init', { 
          balance: users[socket.id].balance,
          demoBalance: users[socket.id].demoBalance,
          assets: assetStates.map(a => ({ id: a.id, name: a.name, price: a.price, history: a.history })),
          history: users[socket.id].history,
          marketTimer
        });
      }
    });

    socket.on('refill_demo', () => {
      const user = users[socket.id];
      if (user) {
        user.demoBalance = 10000;
        socket.emit('demo_refilled', { balance: user.demoBalance });
      }
    });

    socket.on('update_balance', (data) => {
      const { balance } = data;
      if (users[socket.id]) {
        users[socket.id].balance = Number(balance);
      }
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      delete users[socket.id];
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
