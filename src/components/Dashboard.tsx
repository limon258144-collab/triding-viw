import React, { useEffect, useState } from 'react';
import { 
  BarChart3, 
  History, 
  Settings, 
  LogOut, 
  Bell, 
  User,
  LayoutDashboard,
  TrendingUp,
  ShieldCheck,
  Info,
  Menu,
  ChevronDown,
  Navigation,
  Rocket,
  X,
  CheckCircle2,
  AlertCircle,
  Trophy,
  TrendingDown,
  RotateCw,
  Crown,
  Plus,
  BrainCircuit,
  Sparkles,
  Wallet
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import TradingChart from './TradingChart';
import TradePanel from './TradePanel';
import AssetList from './AssetList';
import TradeHistory from './TradeHistory';
import OrderBook from './OrderBook';
import ActiveTradesList from './ActiveTradesList';
import DepositModal from './DepositModal';
import WithdrawalModal from './WithdrawalModal';
import ProfileModal from './ProfileModal';
import AIAnalysis from './AIAnalysis';
import socket from '../lib/socket';
import { dbService } from '../lib/db';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

// GLOBAL: Persistent array for raw data access as requested
const candleHistory: Record<string, any[]> = {};
(window as any).candleHistory = candleHistory;

interface DashboardProps {
  onLogout: () => void;
  isAdmin?: boolean;
  onOpenAdmin?: () => void;
}

const EMPTY_HISTORY: any[] = [];

export default function Dashboard({ onLogout, isAdmin, onOpenAdmin }: DashboardProps) {
  const [balance, setBalance] = useState(0);
  const [demoBalance, setDemoBalance] = useState(10000);
  const [accountType, setAccountType] = useState<'real' | 'demo'>('real');
  const [displayBalance, setDisplayBalance] = useState(0);
  const [showAccountSelector, setShowAccountSelector] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [userDisplayName, setUserDisplayName] = useState<string | null>(null);
  const [activeTrades, setActiveTrades] = useState<any[]>([]);
  const [tradeHistory, setTradeHistory] = useState<any[]>([]);
  const [showDrawer, setShowDrawer] = useState<'orders' | 'news' | 'leaders' | 'analysis' | 'history' | null>(null);
  const [timeframe, setTimeframe] = useState<30000 | 60000>(60000); // 30s or 1m in ms

  const [selectedAssetId30s, setSelectedAssetId30s] = useState('btc');
  const [selectedAssetId1m, setSelectedAssetId1m] = useState('btc');
  const selectedAssetId = timeframe === 30000 ? selectedAssetId30s : selectedAssetId1m;
  const setSelectedAssetId = timeframe === 30000 ? setSelectedAssetId30s : setSelectedAssetId1m;

  const [assets, setAssets] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [tradeResult, setTradeResult] = useState<any | null>(null);
  const [showAssetSelector, setShowAssetSelector] = useState(false);
  const [orderBook, setOrderBook] = useState<any>(null);
  const [isRotated, setIsRotated] = useState(false);

  // Sync selectedTime with parent timeframe
  const timeframeLabel = timeframe === 30000 ? '30s' : '1m';

  // Smooth balance animation
  useEffect(() => {
    const duration = 1000;
    const start = displayBalance;
    const end = accountType === 'real' ? balance : demoBalance;
    
    if (Math.abs(start - end) < 0.01) {
      setDisplayBalance(end);
      return;
    }

    const startTime = performance.now();
    let frameId: number;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const easeOutQuad = (t: number) => t * (2 - t);
      const easedProgress = easeOutQuad(progress);
      
      const current = start + (end - start) * easedProgress;
      setDisplayBalance(current);

      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      }
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [balance, demoBalance, accountType]);

  // Real balance sync from Firestore
  useEffect(() => {
    if (!auth.currentUser) return;
    const unsubscribe = onSnapshot(doc(db, 'users', auth.currentUser.uid), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        const newBalance = data.balance || 0;
        setBalance(newBalance);
        setUserAvatar(data.avatar || null);
        setUserDisplayName(data.displayName || null);
        // Sync with socket/server if needed
        socket.emit('update_balance', { balance: newBalance });
      }
    });

    // Handle trade results and other balance changes from socket
    const handleTradeResult = (payload: any) => {
      if (!payload) return;
      if (payload.accountType === 'demo') {
        setDemoBalance(payload.balance);
      } else {
        setBalance(payload.balance);
        // CRITICAL: We should also sync back to Firestore for persistence
        // Though ideally the server does this, updating here ensures real-time parity
        updateDoc(doc(db, 'users', auth.currentUser!.uid), { balance: payload.balance }).catch(console.error);
      }
      setActiveTrades(prev => prev.filter(t => t.id !== payload.id));
      setTradeHistory(prev => [payload, ...prev]);
      setTradeResult(payload);
      
      setTimeout(() => {
        setTradeResult(null);
      }, 4000);
    };

    const handleTradePlaced = (payload: any) => {
      if (!payload) return;
      if (payload.accountType === 'demo') {
        setDemoBalance(payload.balance);
      } else {
        setBalance(payload.balance);
        if (auth.currentUser) {
          updateDoc(doc(db, 'users', auth.currentUser.uid), { balance: payload.balance }).catch(console.error);
        }
      }
      setActiveTrades(prev => [...prev, payload.trade]);
      
      const asset = assets.find(a => a.id === payload.trade.assetId);
      const newNotification = {
        id: Math.random().toString(36).substr(2, 9),
        message: `Trade opened with price: ${payload.trade.entryPrice.toFixed(4)} ${asset?.name || payload.trade.assetId}`,
        type: 'info',
        time: Date.now()
      };
      setNotifications(prev => [newNotification, ...prev]);
      
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== newNotification.id));
      }, 5000);
    };

    const handleGlobalTrade = (payload: any) => {
      const newNotification = {
        id: Math.random().toString(36).substr(2, 9),
        message: `${payload.userName} just placed a trade!`,
        type: 'social',
        time: Date.now()
      };
      setNotifications(prev => [newNotification, ...prev].slice(0, 5));
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== newNotification.id));
      }, 3000);
    };

    const handleSocialTradeResult = (payload: any) => {
      const asset = assets.find(a => a.id === payload.assetId);
      const newNotification = {
        id: Math.random().toString(36).substr(2, 9),
        message: `${payload.userName} ${payload.win ? 'WON' : 'LOST'} on ${asset?.name || payload.assetId}`,
        type: payload.win ? 'success' : 'error',
        time: Date.now()
      };
      setNotifications(prev => [newNotification, ...prev].slice(0, 5));
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== newNotification.id));
      }, 3000);
    };

    const handleSocketError = (payload: any) => {
      const newNotification = {
        id: Math.random().toString(36).substr(2, 9),
        message: payload.message || 'An error occurred',
        type: 'error',
        time: Date.now()
      };
      setNotifications(prev => [newNotification, ...prev].slice(0, 5));
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== newNotification.id));
      }, 5000);
    };

    socket.on('trade_result', handleTradeResult);
    socket.on('trade_placed', handleTradePlaced);
    socket.on('global_trade', handleGlobalTrade);
    socket.on('social_trade_result', handleSocialTradeResult);
    socket.on('error', handleSocketError);

    // Request initial data explicitly
    socket.emit('request_init');

    return () => {
      unsubscribe();
      socket.off('trade_result', handleTradeResult);
      socket.off('trade_placed', handleTradePlaced);
      socket.off('global_trade', handleGlobalTrade);
      socket.off('social_trade_result', handleSocialTradeResult);
      socket.off('error', handleSocketError);
    };
  }, [assets.length]); // Use length to avoid circular deps

  // Separate effect for price updates to keep it lightweight
  useEffect(() => {
    let lastUpdateAt = Date.now();
    
    const handlePriceUpdates = (updates: any) => {
      lastUpdateAt = Date.now();
      setAssets(prev => {
        if (prev.length === 0) return prev;
        
        return prev.map(asset => {
          const update = updates[asset.id];
          if (!update) return asset;

          const historyId = `${asset.id}-${timeframe}`;
          let globalHist = candleHistory[historyId];
          
          if (!globalHist) {
            globalHist = asset.history && asset.history.length > 0 
                         ? [...asset.history] : [];
            candleHistory[historyId] = globalHist;
          }

          let newHistory = [...globalHist];
          const now = Date.now();
          const currentInterval = Math.floor(now / timeframe) * timeframe;
          
          const lastCandle = newHistory.length > 0 ? newHistory[newHistory.length - 1] : null;
          const isNewInterval = lastCandle && currentInterval > lastCandle.time;

          if (isNewInterval || newHistory.length === 0) {
            const newCandle = {
              time: currentInterval,
              open: lastCandle ? lastCandle.close : (update.open || update.close),
              high: Math.max(update.close, (lastCandle ? lastCandle.close : update.close)),
              low: Math.min(update.close, (lastCandle ? lastCandle.close : update.close)),
              close: update.close,
              volume: update.volume || Math.random() * 500
            };
            newHistory.push(newCandle);
            
            if (lastCandle) {
              dbService.saveCandle({ ...lastCandle, assetId: historyId });
            }

            if (newHistory.length > 1000) {
              while (newHistory.length > 1000) {
                newHistory.shift(); 
              }
            }
            candleHistory[historyId] = newHistory;
          } else if (newHistory.length > 0) {
            const lastIdx = newHistory.length - 1;
            const updatedCandle = { 
              ...newHistory[lastIdx], 
              close: update.close,
              high: Math.max(newHistory[lastIdx].high, update.close),
              low: Math.min(newHistory[lastIdx].low, update.close),
              volume: (newHistory[lastIdx].volume || 0) + (Math.random() * 10)
            };
            newHistory[lastIdx] = updatedCandle;
            candleHistory[historyId] = [...newHistory]; 
          }

          return {
            ...asset,
            price: update.close,
            history: newHistory
          };
        });
      });

      if (updates[selectedAssetId]?.orderBook) {
        setOrderBook(updates[selectedAssetId].orderBook);
      }
    };

    // Client-side jitter to keep candles "moving" even if server is slow
    const jitterInterval = setInterval(() => {
      const timeSinceLastUpdate = Date.now() - lastUpdateAt;
      if (timeSinceLastUpdate > 2000 && assets.length > 0) {
        setAssets(prev => prev.map(asset => {
          if (!asset.history || asset.history.length === 0) return asset;
          
          const lastIdx = asset.history.length - 1;
          const lastCandle = asset.history[lastIdx];
          
          // Tiny random movement (0.001%)
          const jitter = (Math.random() - 0.5) * (lastCandle.close * 0.0001);
          const newPrice = lastCandle.close + jitter;
          
          const updatedHistory = [...asset.history];
          updatedHistory[lastIdx] = {
            ...lastCandle,
            close: newPrice,
            high: Math.max(lastCandle.high, newPrice),
            low: Math.min(lastCandle.low, newPrice)
          };
          
          const historyId = `${asset.id}-${timeframe}`;
          candleHistory[historyId] = updatedHistory;

          return { ...asset, price: newPrice, history: updatedHistory };
        }));
      }
    }, 1000);

    socket.on('price_updates', handlePriceUpdates);
    return () => {
      socket.off('price_updates', handlePriceUpdates);
      clearInterval(jitterInterval);
    };
  }, [selectedAssetId, timeframe, assets.length > 0]); // Add length dependency to start jitter correctly

  // Shared logic to load/simulate history for a specific asset and timeframe
  const loadAssetHistory = async (asset: any, tf: number) => {
    const historyId = `${asset.id}-${tf}`;
    
    // 1. Check global cache first
    if (candleHistory[historyId] && candleHistory[historyId].length >= 200) {
      return { ...asset, history: [...candleHistory[historyId]] };
    }

    // 2. Try IndexedDB
    const localHistory = await dbService.getHistory(historyId, 1000);
    let mergedHistory = localHistory.sort((a, b) => a.time - b.time);

    // 3. If still short, use server history as base
    if (mergedHistory.length < 200 && asset.history && asset.history.length > 0) {
      const historyMap = new Map();
      mergedHistory.forEach(c => historyMap.set(c.time, c));
      asset.history.forEach((c: any) => {
        if (!historyMap.has(c.time)) historyMap.set(c.time, c);
      });
      mergedHistory = Array.from(historyMap.values()).sort((a, b) => a.time - b.time);
    }

    // 4. If STILL short, simulate (ensure clean separation)
    if (mergedHistory.length < 200) {
      const count = 200 - mergedHistory.length;
      const now = Date.now();
      const currentInterval = Math.floor(now / tf) * tf;
      const lastTimeInHistory = mergedHistory.length > 0 ? mergedHistory[0].time : currentInterval;
      
      const simulated: any[] = [];
      const volatility = 0.001;
      const basePrice = mergedHistory.length > 0 ? mergedHistory[0].open : (asset.price || 1.1);
      
      for (let i = count; i > 0; i--) {
        const time = lastTimeInHistory - (i * tf);
        const open = basePrice + (Math.random() - 0.5) * volatility;
        const close = open + (Math.random() - 0.5) * volatility;
        simulated.push({ 
          time, 
          open, 
          high: Math.max(open, close) + Math.random() * volatility * 0.2, 
          low: Math.min(open, close) - Math.random() * volatility * 0.2, 
          close, 
          volume: Math.random() * 500 
        });
      }
      mergedHistory = [...simulated, ...mergedHistory];
    }

    // 5. Final housekeeping
    if (mergedHistory.length > 1000) {
      mergedHistory = mergedHistory.slice(-1000);
      dbService.pruneHistory(historyId, 1000).catch(console.error);
    }
    
    await dbService.saveCandles(mergedHistory.map(c => ({ ...c, assetId: historyId })));
    candleHistory[historyId] = mergedHistory;
    return { ...asset, history: mergedHistory };
  };

  // Persist assets list across timeframe changes
  useEffect(() => {
    const handleInit = async (payload: any) => {
      if (!payload) return;
      setDemoBalance(payload.demoBalance || 10000);
      setTradeHistory(payload.history);
      
      const loadedAssets = await Promise.all(payload.assets.map((a: any) => loadAssetHistory(a, timeframe)));
      setAssets(loadedAssets);
    };

    const handleDemoRefilled = (payload: any) => {
      setDemoBalance(payload.balance);
    };

    socket.on('init', handleInit);
    socket.on('demo_refilled', handleDemoRefilled);

    // Initial load if socket already connected
    if (assets.length > 0) {
      const reload = async () => {
        const updated = await Promise.all(assets.map(a => loadAssetHistory(a, timeframe)));
        setAssets(updated);
      };
      reload();
    }

    return () => {
      socket.off('init', handleInit);
      socket.off('demo_refilled', handleDemoRefilled);
    };
  }, [timeframe]);

  return (
    <div className={`h-screen bg-[#0b0e11] text-white flex flex-col overflow-hidden transition-all duration-300 ${isRotated ? 'landscape-mode' : ''}`}>
      {/* Header - Always visible unless rotated */}
      <header className={`h-11 lg:h-14 ${isRotated ? 'hidden' : ''} border-b border-white/5 bg-[#151d2c] flex items-center justify-between px-3 md:px-4 sticky top-0 z-[60] gap-2`}>
        {/* Left: Profile */}
        <div className="flex items-center gap-3">
          <div 
            onClick={() => setShowProfileModal(true)}
            className="relative group cursor-pointer active:scale-95 transition-transform"
          >
            <div className="w-8 h-8 lg:w-9 lg:h-9 rounded-full border border-white/20 bg-[#1c2536] flex items-center justify-center overflow-hidden">
              {userAvatar ? (
                <img src={userAvatar} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <User size={18} className="text-white/60" />
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#00b97a] rounded-full border-2 border-[#151d2c] flex items-center justify-center">
              <Plus size={10} className="text-white" strokeWidth={4} />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-white uppercase tracking-wider truncate max-w-[80px]">
              {userDisplayName || "ট্রেডার"}
            </span>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <div className="w-1 h-1 rounded-full bg-qx-up animate-pulse" />
                <span className="text-[7px] font-bold text-qx-up uppercase tracking-widest leading-none">Active</span>
              </div>
              <span className="text-[7px] font-bold text-white/30 uppercase tracking-widest border-l border-white/10 pl-2">
                UID: {auth.currentUser?.uid.substring(0, 8).toLowerCase()}
              </span>
            </div>
          </div>
          <button 
            onClick={() => setIsRotated(!isRotated)}
            className="hidden lg:flex w-8 h-8 rounded-full border border-white/10 items-center justify-center hover:bg-white/5 transition-all"
          >
            <RotateCw size={14} className="text-white/40" />
          </button>
        </div>

        {/* Center: Account Selector */}
        <div 
          onClick={() => setShowAccountSelector(!showAccountSelector)}
          className="flex-1 lg:flex-none flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 px-4 rounded-xl py-0.5 transition-all relative"
        >
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/40">QT {accountType === 'real' ? 'Real' : 'Demo'}</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#00b97a]">হালাল</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-white/40">USD</span>
          </div>
          <div className="flex items-center gap-1.5 -mt-0.5">
            <span className="text-white font-mono text-lg lg:text-xl font-black">{displayBalance.toLocaleString()}</span>
            <ChevronDown size={14} className={`text-white/30 transition-transform ${showAccountSelector ? 'rotate-180' : ''}`} />
          </div>
          {accountType === 'demo' && demoBalance < 1000 && (
            <button 
              onClick={(e) => { e.stopPropagation(); socket.emit('refill_demo'); }}
              className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-qx-secondary text-white text-[8px] font-black px-3 py-1 rounded-full uppercase"
            >
              Refill
            </button>
          )}

          <AnimatePresence>
            {showAccountSelector && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 bg-[#1c2536] border border-white/10 rounded-2xl shadow-2xl z-[110] overflow-hidden p-1.5"
                onClick={(e) => e.stopPropagation()}
              >
                <div 
                  onClick={() => { setAccountType('real'); setShowAccountSelector(false); }}
                  className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${accountType === 'real' ? 'bg-white/5 border border-white/10' : 'hover:bg-white/5'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-qx-up/10 flex items-center justify-center"><Navigation size={14} className="text-qx-up rotate-45" /></div>
                    <div className="flex flex-col"><span className="text-[10px] font-bold text-white uppercase tracking-wider">Real Account</span><span className="text-xs font-mono font-bold text-white/40">${balance.toLocaleString()}</span></div>
                  </div>
                  {accountType === 'real' && <CheckCircle2 size={14} className="text-qx-up" />}
                </div>
                <div 
                  onClick={() => { setAccountType('demo'); setShowAccountSelector(false); }}
                  className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all mt-1 ${accountType === 'demo' ? 'bg-white/5 border border-white/10' : 'hover:bg-white/5'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-qx-secondary/20 flex items-center justify-center"><Navigation size={14} className="text-qx-secondary rotate-45" /></div>
                    <div className="flex flex-col"><span className="text-[10px] font-bold text-white uppercase tracking-wider">Demo Account</span><span className="text-xs font-mono font-bold text-white/40">${demoBalance.toLocaleString()}</span></div>
                  </div>
                  {accountType === 'demo' && <CheckCircle2 size={14} className="text-qx-secondary" />}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right: Wallet */}
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button 
              onClick={onOpenAdmin}
              className="w-10 h-10 lg:hidden flex items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 active:scale-95"
            >
              <ShieldCheck size={20} />
            </button>
          )}
          <button 
            onClick={() => setShowWithdrawalModal(true)}
            className="w-10 h-10 lg:w-11 lg:h-11 bg-qx-down/20 border border-qx-down/30 text-qx-down rounded-xl flex items-center justify-center hover:bg-qx-down/30 transition-all shadow-lg shadow-qx-down/5 active:scale-95"
            title="টাকা উত্তোলন"
          >
            <Wallet size={20} />
          </button>
          <button 
            onClick={() => setShowDepositModal(true)}
            className="w-10 h-10 lg:w-11 lg:h-11 bg-[#00b97a]/20 border border-[#00b97a]/30 text-[#00b97a] rounded-xl flex items-center justify-center hover:bg-[#00b97a]/30 transition-all shadow-lg shadow-[#00b97a]/5 active:scale-95"
            title="ডিপোজিট"
          >
            <BarChart3 size={20} />
          </button>
        </div>
      </header>


      <div className="flex-1 flex overflow-hidden relative">
        {/* Floating Asset Selector Area - Like in Screenshot */}
        <div className="absolute top-4 left-4 z-40 flex items-center gap-2">
          <div 
            onClick={() => setShowAssetSelector(!showAssetSelector)}
            className="bg-[#151d2c]/90 backdrop-blur-xl border border-white/5 px-3 py-2 rounded-xl flex items-center gap-3 shadow-2xl cursor-pointer hover:bg-[#1c2536] transition-all group min-w-[160px]"
          >
            <span className="text-white font-black text-sm lg:text-base tracking-tighter truncate uppercase italic">
              {assets.find(a => a.id === selectedAssetId)?.name || 'USD/BDT OTC'}
            </span>
            <ChevronDown size={14} className={`text-white/40 group-hover:text-white transition-transform ${showAssetSelector ? 'rotate-180' : ''}`} />
          </div>
          <button className="bg-[#151d2c]/90 backdrop-blur-xl border border-white/5 w-10 h-10 rounded-xl flex items-center justify-center text-white/40 hover:text-white transition-all shadow-2xl">
            <span className="font-black">...</span>
          </button>

          <AnimatePresence>
            {showAssetSelector && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute top-full left-0 mt-2 w-72 md:w-80 max-h-[70vh] bg-[#1c2536] border border-white/10 rounded-2xl shadow-2xl z-[100] overflow-hidden flex flex-col pt-1"
                onClick={(e) => e.stopPropagation()}
              >
                <AssetList 
                  assets={assets} 
                  selectedId={selectedAssetId} 
                  onSelect={(id) => { setSelectedAssetId(id); setShowAssetSelector(false); }} 
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Global Time Info below selector - like screenshot */}
        <div className="absolute top-16 left-5 z-30 pointer-events-none">
          <span className="text-[10px] font-black text-white/30 tracking-widest uppercase">
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })} UTC+6
          </span>
        </div>
        {/* Sidebar - Desktop & Tablet */}
        <aside className="hidden md:flex w-14 lg:w-16 bg-[#1c2029] border-r border-white/5 flex-col items-center py-4 gap-4 shrink-0">
          {isAdmin && (
            <button 
              onClick={onOpenAdmin}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30 transition-all"
              title="Admin Panel"
            >
              <ShieldCheck size={22} />
            </button>
          )}
          <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-qx-up/10 text-qx-up border border-qx-up/20">
            <LayoutDashboard size={20} />
          </button>
          <button className="w-10 h-10 flex items-center justify-center rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-all">
            <Trophy size={20} />
          </button>
          <button 
            onClick={() => setShowDrawer(showDrawer === 'history' ? null : 'history')}
            className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${showDrawer === 'history' ? 'bg-qx-up/20 text-qx-up border border-qx-up/30 shadow-[0_0_15px_rgba(0,185,122,0.3)]' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
            title="Trade History"
          >
            <History size={20} className={showDrawer === 'history' ? 'scale-x-[-1]' : 'scale-x-[-1]'} />
          </button>
          <button 
            onClick={() => setShowDrawer(showDrawer === 'analysis' ? null : 'analysis')}
            className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${showDrawer === 'analysis' ? 'bg-qx-up/20 text-qx-up border border-qx-up/30 shadow-[0_0_15px_rgba(0,185,122,0.3)]' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
            title="AI Analysis"
          >
            <Sparkles size={20} className={showDrawer === 'analysis' ? 'animate-pulse' : ''} />
          </button>
          <div className="flex-1"></div>
          <button className="w-10 h-10 flex items-center justify-center rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-all">
            <Settings size={20} />
          </button>
          <button 
            onClick={onLogout}
            className="w-10 h-10 flex items-center justify-center rounded-xl text-qx-down/60 hover:text-qx-down hover:bg-qx-down/10 transition-all"
          >
            <LogOut size={20} />
          </button>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 relative">
          {/* Mobile Bottom Taskbar - Matches screenshot Bengali labels */}
          <div className={`md:hidden fixed bottom-0 left-0 right-0 h-[68px] bg-[#151d2c]/95 backdrop-blur-3xl border-t border-white/5 z-[45] flex items-center justify-around px-2 transition-all duration-300 ${isRotated ? 'translate-y-full' : ''}`}>
            <button 
              onClick={() => setShowDrawer('history')}
              className="flex flex-col items-center gap-1 text-white/40 active:text-white transition-all"
            >
              <History size={20} />
              <span className="text-[9px] font-black tracking-tight leading-none">ট্রেডগুলি</span>
            </button>
            <button 
              onClick={() => setShowDrawer('orders')}
              className={`flex flex-col items-center gap-1 ${showDrawer === 'orders' ? 'text-qx-up' : 'text-white/40'}`}
            >
              <BarChart3 size={20} />
              <span className="text-[9px] font-black tracking-tight leading-none">খুঁটিনাটি</span>
            </button>
          </div>

          <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
            {/* Middle: Chart - Optimized for mobile view */}
            <div className="flex-1 flex flex-col min-w-0 bg-qx-bg relative h-[68vh] lg:h-full border-b border-white/5 lg:border-b-0">
              {assets.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center bg-[#0b0e11] gap-4">
                  <div className="w-10 h-10 border-2 border-qx-up/20 border-t-qx-up rounded-full animate-spin"></div>
                  <span className="text-white/20 font-black uppercase tracking-[0.2em] text-[9px] animate-pulse">Syncing...</span>
                </div>
              ) : (
                <TradingChart 
                  assetId={selectedAssetId} 
                  initialHistory={assets.find(a => a.id === selectedAssetId)?.history || EMPTY_HISTORY} 
                  activeTrades={activeTrades.filter(t => t.assetId === selectedAssetId)}
                  tradeHistory={tradeHistory.filter(t => t.assetId === selectedAssetId)}
                  currentPrice={assets.find(a => a.id === selectedAssetId)?.price || 0}
                  accountType={accountType}
                  selectedTimeframeLabel={timeframeLabel}
                />
              )}
            </div>

            {/* Right/Bottom: Trade Panel - Compact for mobile */}
            <aside className="flex-none lg:w-40 border-t lg:border-t-0 lg:border-l border-white/5 bg-[#0d1117] z-40 h-[22vh] lg:h-full">
              <TradePanel 
                assetId={selectedAssetId} 
                profitability={assets.find(a => a.id === selectedAssetId)?.profitability || 87}
                assetName={assets.find(a => a.id === selectedAssetId)?.name || "Asset"}
                accountType={accountType}
                timeframe={timeframe}
                onTimeframeChange={(tf) => setTimeframe(tf)}
              />
            </aside>
          </main>
        </div>
      </div>

      {/* Notifications Stack */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 lg:top-20 lg:left-4 lg:translate-x-0 z-[100] flex flex-col gap-2 w-[calc(100%-2rem)] lg:w-72">
        <AnimatePresence>
          {notifications.map((n) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: -20, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -20, scale: 0.9 }}
              className="bg-[#1c2536]/95 backdrop-blur-md border border-white/10 p-3 rounded-xl shadow-2xl flex items-start gap-3 group"
            >
              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                <Info size={16} className="text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium text-white/90 leading-tight">{n.message}</p>
                <span className="text-[9px] text-white/30 mt-1 block">Just now</span>
              </div>
              <button 
                onClick={() => setNotifications(prev => prev.filter(notif => notif.id !== n.id))}
                className="text-white/20 hover:text-white transition-colors"
              >
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {showDepositModal && (
          <DepositModal 
            onClose={() => setShowDepositModal(false)} 
            onSuccess={() => {
              const newNotification = {
                id: Math.random().toString(36).substr(2, 9),
                message: `Deposit request submitted! Please wait for approval.`,
                type: 'info',
                time: Date.now()
              };
              setNotifications(prev => [newNotification, ...prev]);
            }}
          />
        )}
        {showWithdrawalModal && (
          <WithdrawalModal
            currentBalance={balance}
            onClose={() => setShowWithdrawalModal(false)}
            onSuccess={() => {
              const newNotification = {
                id: Math.random().toString(36).substr(2, 9),
                message: `Withdrawal request submitted! Your balance has been updated.`,
                type: 'info',
                time: Date.now()
              };
              setNotifications(prev => [newNotification, ...prev]);
            }}
          />
        )}
        {showDrawer && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDrawer(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70]"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-4/5 max-w-[320px] bg-[#0d1117] border-l border-white/10 z-[80] shadow-2xl flex flex-col"
            >
              <div className="p-4 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white/60">
                  {showDrawer === 'orders' ? 'Market Depth' : showDrawer}
                </h3>
                <button 
                  onClick={() => setShowDrawer(null)}
                  className="p-2 hover:bg-white/5 rounded-lg text-white/20 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {showDrawer === 'orders' && (
                  <div className="flex flex-col h-full">
                    <div className="p-4 bg-white/5 border-b border-white/5">
                      <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Active Trades</span>
                    </div>
                    <ActiveTradesList trades={activeTrades} assets={assets} />
                    
                    <div className="p-4 bg-white/5 border-b border-t border-white/5 mt-4">
                      <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Market Depth</span>
                    </div>
                    <OrderBook 
                      orderBook={orderBook} 
                      currentPrice={assets.find(a => a.id === selectedAssetId)?.price || 0} 
                    />
                  </div>
                )}
                {showDrawer === 'history' && (
                  <TradeHistory 
                    history={tradeHistory}
                    assets={assets}
                    onClose={() => setShowDrawer(null)}
                  />
                )}
                {showDrawer === 'analysis' && (
                  <AIAnalysis 
                    assetId={selectedAssetId}
                    assetName={assets.find(a => a.id === selectedAssetId)?.name || "Asset"}
                    history={assets.find(a => a.id === selectedAssetId)?.history || []}
                    currentPrice={assets.find(a => a.id === selectedAssetId)?.price || 0}
                  />
                )}
                {/* Add other drawers here */}
              </div>
            </motion.div>
          </>
        )}
        {showProfileModal && (
          <ProfileModal onClose={() => setShowProfileModal(false)} />
        )}
      </AnimatePresence>

      {/* Trade Result Popup */}
      <AnimatePresence>
        {tradeResult && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 20 }}
              className={`w-full max-w-sm overflow-hidden rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] border ${tradeResult.win ? 'border-qx-up/30 bg-[#0b121e]' : 'border-qx-down/30 bg-[#0b121e]'}`}
            >
              <div className={`h-2 ${tradeResult.win ? 'bg-qx-up' : 'bg-qx-down'}`}></div>
              <div className="p-8 flex flex-col items-center text-center">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 ${tradeResult.win ? 'bg-qx-up/10 text-qx-up shadow-[0_0_30px_rgba(0,200,140,0.2)]' : 'bg-qx-down/10 text-qx-down shadow-[0_0_30px_rgba(255,59,87,0.2)]'}`}>
                  {tradeResult.win ? <Trophy size={40} /> : <TrendingDown size={40} />}
                </div>
                
                <h2 className={`text-2xl font-black uppercase tracking-tighter mb-2 ${tradeResult.win ? 'text-qx-up' : 'text-qx-down'}`}>
                  {tradeResult.win ? 'Congratulations!' : 'Hard Luck!'}
                </h2>
                <h3 className="text-lg font-bold text-white/90 mb-4">
                  {tradeResult.win ? `You Won $${tradeResult.profit.toFixed(2)}` : `You Lost $${Math.abs(tradeResult.profit || 0).toFixed(2)}`}
                </h3>
                
                <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-6">
                  {assets.find(a => a.id === tradeResult.assetId)?.name || 'Asset'} • {new Date(tradeResult.time).toLocaleTimeString()}
                </p>

                <div className={`w-full py-4 rounded-2xl border mb-6 transition-all duration-500 ${tradeResult.win ? 'bg-qx-up/5 border-qx-up/20 shadow-[0_0_20px_rgba(0,200,140,0.1)]' : 'bg-qx-down/5 border-qx-down/20'}`}>
                  <span className={`text-4xl font-mono font-black ${tradeResult.win ? 'text-qx-up' : 'text-white/60'}`}>
                    {tradeResult.win ? '+' : '-'}${Math.abs(tradeResult.profit || 0).toFixed(2)}
                  </span>
                </div>

                <button 
                  onClick={() => setTradeResult(null)}
                  className="w-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white py-3 rounded-xl font-bold transition-all border border-white/5"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Rotation Toggle for Mobile */}
      <div className="lg:hidden fixed bottom-24 right-4 z-[100] flex flex-col gap-3">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsRotated(!isRotated)}
          className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center shadow-2xl text-white/60 hover:text-white"
        >
          <RotateCw size={18} className={isRotated ? 'rotate-90' : ''} />
        </motion.button>
      </div>

      {/* Footer / Status Bar */}
      <footer className="h-7 bg-qx-surface border-t border-qx-border flex items-center justify-between px-4 text-[9px] font-bold text-white/20 uppercase tracking-widest">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-qx-up rounded-full shadow-[0_0_8px_rgba(0,185,125,0.5)]"></span>
            Connected
          </span>
          <span>Server Time: {new Date().toLocaleTimeString([], { hour12: false })}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-white/40">v2.4.0-stable</span>
        </div>
      </footer>
    </div>
  );
}
