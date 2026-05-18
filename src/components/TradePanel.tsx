import React, { useState, useEffect } from 'react';
import { ArrowUp, ArrowDown, Clock, Wallet, Info, ChevronDown, Repeat, Plus, Minus, Bell, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import socket from '../lib/socket';

interface TradePanelProps {
  assetId: string;
  profitability: number;
  assetName: string;
  accountType: 'real' | 'demo';
  timeframe: number;
  onTimeframeChange: (tf: 30000 | 60000) => void;
}

export default function TradePanel({ 
  assetId, 
  profitability, 
  assetName, 
  accountType,
  timeframe,
  onTimeframeChange
}: TradePanelProps) {
  const [amount, setAmount] = useState(13000); 
  const [duration, setDuration] = useState(60); 
  const [marketTimer, setMarketTimer] = useState({ timeLeft: 60, purchaseDeadline: 30, expirationTime: 0 });

  useEffect(() => {
    socket.on('market_timer', (timer) => {
      setMarketTimer(timer);
    });

    return () => {
      socket.off('market_timer');
    };
  }, []);
  const handleTradeClick = (type: 'higher' | 'lower' | 'buy' | 'sell') => {
    socket.emit('place_trade', {
      amount: Number(amount),
      type,
      assetId,
      duration,
      accountType
    });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const payout = amount * (1 + profitability / 100);
  const profit = amount * (profitability / 100);

  // Simulated sentiment for visual flavor
  const [sentiment, setSentiment] = useState(54); // 54% up by default

  useEffect(() => {
    const interval = setInterval(() => {
      setSentiment(prev => {
        const drift = (Math.random() - 0.5) * 5;
        return Math.min(Math.max(20, prev + drift), 80);
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full h-full bg-[#0d1117] flex flex-col border-l border-white/5 relative overflow-y-auto lg:overflow-visible custom-scrollbar">
      <div className="p-2 lg:p-4 flex flex-col lg:gap-4 flex-1">
        {/* Mobile Layout: Grid for controls - MATCHING SCREENSHOT */}
        <div className="flex flex-col gap-3 lg:gap-4 mb-2 lg:mb-0">
          {/* Sentiment Bar at Top of Controls - Shrunk for mobile */}
          <div className="w-full px-1">
            <div className="flex justify-between items-center mb-0.5 px-0.5">
              <div className="flex items-center gap-1">
                <span className="text-[7px] font-black uppercase tracking-widest text-white/20 tracking-[0.1em]">ট্রেডিং মুড</span>
              </div>
              <div className="flex gap-2">
                <span className="text-qx-up text-[8px] font-black">45%</span>
                <span className="text-qx-down text-[8px] font-black">55%</span>
              </div>
            </div>
            <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden flex border border-white/5">
              <div className="h-full bg-qx-up" style={{ width: '45%' }}></div>
              <div className="h-full bg-qx-down" style={{ width: '55%' }}></div>
            </div>
          </div>

          <div className="flex gap-1.5 lg:gap-2">
            {/* Time Selector - Smaller for Mobile */}
            <div className="flex-1 bg-[#131722] rounded-[16px] p-2 lg:p-4 border border-white/5 flex flex-col items-start gap-0.5 shadow-xl hover:border-white/10 transition-all group relative">
              <span className="text-[8px] text-white/20 font-black uppercase tracking-wider leading-none">সময়</span>
              <div className="flex items-center justify-between w-full mt-1 px-0.5">
                <input 
                  type="text"
                  value={formatDuration(duration)}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9:]/g, '');
                    if (val.includes(':')) {
                      const [m, s] = val.split(':').map(Number);
                      if (!isNaN(m) && !isNaN(s)) {
                        setDuration((m * 60) + s);
                      }
                    } else if (!isNaN(Number(val))) {
                      setDuration(Number(val));
                    }
                  }}
                  className="bg-transparent border-none text-white font-mono text-base lg:text-2xl font-black tracking-tight w-14 lg:w-20 outline-none p-0 focus:ring-0"
                />
                <div className="flex items-center gap-1">
                   <button 
                    onClick={(e) => { e.stopPropagation(); setDuration(prev => Math.max(30, prev - 30)); }}
                    className="w-6 h-6 lg:w-8 lg:h-8 rounded-lg lg:rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all text-white/40 hover:text-white"
                  >
                    <Minus size={10} strokeWidth={4} />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setDuration(prev => prev + 30); }}
                    className="w-6 h-6 lg:w-8 lg:h-8 rounded-lg lg:rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all text-white/40 hover:text-white"
                  >
                    <Plus size={10} strokeWidth={4} />
                  </button>
                </div>
              </div>
            </div>

            {/* Amount Selector - Smaller for Mobile */}
            <div className="flex-1 bg-[#131722] rounded-[16px] p-2 lg:p-4 border border-white/5 flex flex-col items-start gap-0.5 shadow-xl hover:border-white/10 transition-all group relative">
              <span className="text-[8px] text-white/20 font-black uppercase tracking-wider leading-none">পরিমাণ</span>
              <div className="flex items-center justify-between w-full mt-1 px-0.5">
                <input 
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="bg-transparent border-none text-white font-mono text-base lg:text-2xl font-black tracking-tight w-16 lg:w-24 outline-none p-0 focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <div className="flex items-center gap-1">
                   <button 
                    onClick={(e) => { e.stopPropagation(); setAmount(prev => Math.max(1, prev - 1000)); }}
                    className="w-6 h-6 lg:w-8 lg:h-8 rounded-lg lg:rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all text-white/40 hover:text-white"
                  >
                    <Minus size={10} strokeWidth={4} />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setAmount(prev => prev + 1000); }}
                    className="w-6 h-6 lg:w-8 lg:h-8 rounded-lg lg:rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all text-white/40 hover:text-white"
                  >
                    <Plus size={10} strokeWidth={4} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Market Countdown Timer - Shrunk for mobile */}
          <div className="bg-[#1c2536] border border-white/5 rounded-xl p-2 lg:p-3 flex flex-col gap-1 shadow-2xl relative overflow-hidden group">
            <div className="flex justify-between items-center relative z-10">
              <div className="flex items-center gap-1.5">
                <div className={`p-1 rounded-md ${marketTimer.timeLeft > 30 ? 'bg-qx-up/20 text-qx-up' : 'bg-qx-down/20 text-qx-down'}`}>
                  <Clock size={10} className={marketTimer.timeLeft <= 10 ? 'animate-pulse' : ''} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-black uppercase tracking-widest text-white/30 truncate max-w-[80px]">
                    {marketTimer.timeLeft > 30 ? 'Purchase' : 'Expiration'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-base lg:text-xl font-mono font-black tabular-nums ${marketTimer.timeLeft <= 10 ? 'text-qx-down animate-pulse' : 'text-white'}`}>
                  {formatDuration(marketTimer.timeLeft)}
                </span>
              </div>
            </div>
            
            <div className="h-1 lg:h-2 w-full bg-white/5 rounded-full overflow-hidden flex relative shadow-inner">
              <motion.div 
                initial={false}
                animate={{ 
                  width: `${(marketTimer.timeLeft / 60) * 100}%`,
                  backgroundColor: marketTimer.timeLeft <= 10 ? '#ff3b57' : (marketTimer.timeLeft <= 30 ? '#ffab00' : '#00b97a')
                }}
                transition={{ duration: 1, ease: "linear" }}
                className="h-full shadow-[0_0_20px_rgba(255,255,255,0.05)]"
              />
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/10" />
            </div>
          </div>

          {/* Main Action Buttons - Smaller for mobile */}
          <div className="grid grid-cols-2 gap-2 mt-1">
            <button 
              onClick={() => handleTradeClick('higher')}
              className="relative bg-qx-up h-[60px] lg:h-[84px] rounded-[16px] lg:rounded-[24px] transition-all shadow-lg active:scale-95 flex flex-col items-center justify-center overflow-hidden group"
            >
              <div className="flex items-center gap-2 lg:gap-3">
                 <div className="w-5 h-5 lg:w-7 lg:h-7 rounded-md lg:rounded-lg bg-white/20 flex items-center justify-center">
                   <ArrowUp size={14} lg:size={20} strokeWidth={4} className="text-white" />
                 </div>
                 <span className="text-white font-black text-sm lg:text-3xl uppercase tracking-tighter italic">কিনুন</span>
              </div>
              <span className="text-white/60 font-black text-[9px] lg:text-[13px] mt-0.5">37%</span>
            </button>

            <button 
              onClick={() => handleTradeClick('lower')}
              className="relative bg-qx-down h-[60px] lg:h-[84px] rounded-[16px] lg:rounded-[24px] transition-all shadow-lg active:scale-95 flex flex-col items-center justify-center overflow-hidden group"
            >
              <div className="flex items-center gap-2 lg:gap-3">
                 <div className="w-5 h-5 lg:w-7 lg:h-7 rounded-md lg:rounded-lg bg-white/20 flex items-center justify-center">
                   <ArrowDown size={14} lg:size={20} strokeWidth={4} className="text-white" />
                 </div>
                 <span className="text-white font-black text-sm lg:text-3xl uppercase tracking-tighter italic">বিক্রি করুন</span>
              </div>
               <span className="text-white/60 font-black text-[9px] lg:text-[13px] mt-0.5">37%</span>
            </button>
          </div>
        </div>


          <div className="hidden lg:block space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Payout</span>
              <span className="text-qx-up text-[13px] font-black">+${profit.toFixed(2)} ({profitability}%)</span>
            </div>
          </div>

          {/* Sentiment Bar - Now visible on mobile too */}
          <div className="pt-1 lg:pt-2">
            <div className="flex justify-between items-center mb-1.5">
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-qx-up rounded-full animate-pulse shadow-[0_0_5px_rgba(0,185,122,0.5)]"></div>
                <span className="text-[9px] font-black text-qx-up uppercase tracking-tighter">Buyers {sentiment}%</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[9px] font-black text-qx-down uppercase tracking-tighter">Sellers {100 - sentiment}%</span>
                <div className="w-1.5 h-1.5 bg-qx-down rounded-full animate-pulse shadow-[0_0_5px_rgba(255,59,87,0.5)]"></div>
              </div>
            </div>
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden flex border border-white/5">
              <motion.div 
                animate={{ width: `${sentiment}%` }}
                transition={{ type: 'spring', stiffness: 50, damping: 20 }}
                className="h-full bg-qx-up shadow-[0_0_10px_rgba(0,185,122,0.3)]"
              />
              <div className="flex-1 h-full bg-qx-down shadow-[0_0_10px_rgba(255,59,87,0.3)]" />
            </div>
            <div className="flex justify-center mt-1.5">
              <span className="text-[7px] font-bold text-white/20 uppercase tracking-[0.2em]">Live Market Sentiment</span>
            </div>
          </div>
        </div>

    </div>
  );
}
