import React, { useEffect, useState } from 'react';
import { ChartCandlestick, ChartArea, Info as InfoIcon, Clock, Pencil, CandlestickChart, MoreHorizontal, Compass, ArrowUp, ArrowDown, Plus, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import socket from '../lib/socket';
import CanvasChart from './CanvasChart';
import MarketSentiment from './MarketSentiment';

interface TradingChartProps {
  assetId: string;
  initialHistory?: any[];
  activeTrades?: any[];
  tradeHistory?: any[];
  currentPrice: number;
  accountType?: 'real' | 'demo';
  selectedTimeframeLabel?: string;
}

export default function TradingChart({ 
  assetId, 
  initialHistory = [], 
  activeTrades = [], 
  tradeHistory = [], 
  currentPrice,
  accountType = 'real',
  selectedTimeframeLabel = '1m'
}: TradingChartProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [chartType, setChartType] = useState<'candle' | 'area'>('candle');
  const [marketTimer, setMarketTimer] = useState({ timeLeft: 60, purchaseDeadline: 30, expirationTime: 0 });
  const [showTimeMenu, setShowTimeMenu] = useState(false);
  const [selectedTime, setSelectedTime] = useState(selectedTimeframeLabel);

  // Sync internal selectedTime if parent changes
  useEffect(() => {
    setSelectedTime(selectedTimeframeLabel);
  }, [selectedTimeframeLabel]);
  
  // Quick trade state
  const [quickDuration, setQuickDuration] = useState(60);
  const [quickAmount, setQuickAmount] = useState(13); 

  const timeOptions = [
    '5s', '10s', '15s', 
    '30s', '1m', '2m', 
    '3m', '5m', '10m', 
    '15m', '30m', '1h', 
    '4h', '1d'
  ];

  const formattedData = React.useMemo(() => {
    const data = initialHistory.map((item: any) => ({
      ...item,
      time: typeof item.time === 'number' ? item.time : new Date(item.time).getTime(),
    }));

    // CRITICAL: Update the last candle with the real-time live price
    if (data.length > 0 && currentPrice > 0) {
      const last = data[data.length - 1];
      last.close = currentPrice;
      if (currentPrice > last.high) last.high = currentPrice;
      if (currentPrice < last.low) last.low = currentPrice;
    }
    
    return data;
  }, [initialHistory, currentPrice]);

  const livePrice = currentPrice || (formattedData.length > 0 ? formattedData[formattedData.length - 1].close : 0);

  useEffect(() => {
    socket.on('market_timer', (timer) => {
      setMarketTimer(timer);
    });

    return () => {
      socket.off('market_timer');
    };
  }, []);

  const handleQuickTrade = (type: 'higher' | 'lower') => {
    socket.emit('place_trade', {
      amount: quickAmount,
      type,
      assetId,
      duration: quickDuration,
      accountType
    });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div ref={containerRef} className="w-full h-full bg-[#0b0e11] p-0 overflow-hidden flex flex-col relative group/chart">

      <div className="flex-1 w-full min-h-0 relative">
        {/* Mountain Silhouette Background - Matches screenshot aesthetic */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-10">
          <div 
            className="absolute bottom-0 left-0 w-full h-[60%] bg-gradient-to-t from-white/20 to-transparent"
            style={{
              clipPath: 'polygon(0% 100%, 0% 70%, 5% 65%, 10% 75%, 15% 60%, 20% 70%, 25% 55%, 30% 65%, 35% 50%, 40% 60%, 45% 45%, 50% 55%, 55% 40%, 60% 50%, 65% 35%, 70% 45%, 75% 30%, 80% 40%, 85% 25%, 90% 35%, 95% 20%, 100% 30%, 100% 100%)'
            }}
          />
          <div 
            className="absolute bottom-0 left-0 w-full h-[40%] bg-gradient-to-t from-white/10 to-transparent"
            style={{
              clipPath: 'polygon(0% 100%, 0% 80%, 10% 70%, 20% 85%, 30% 75%, 40% 90%, 50% 80%, 60% 95%, 70% 85%, 80% 100%, 90% 90%, 100% 100%)'
            }}
          />
        </div>

        {/* CRT Scanline Overlay for technical feel */}
        <div className="absolute inset-0 pointer-events-none z-10 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.02),rgba(0,255,0,0.01),rgba(0,0,118,0.02))] bg-[length:100%_2px,3px_100%]" />

        {/* Market Sentiment Indicator Overlay */}
        <div className="absolute top-4 left-4 z-40">
          <MarketSentiment assetId={assetId} />
        </div>

        <CanvasChart 
          data={formattedData}
          currentPrice={currentPrice}
          activeTrades={activeTrades}
          tradeHistory={tradeHistory}
          marketTimer={marketTimer}
        />
      </div>

      {/* Floating Draggable Quick Controls - Hidden on mobile for cleaner 'soja' look */}
      <motion.div 
        drag
        dragMomentum={false}
        dragConstraints={containerRef}
        whileDrag={{ scale: 1.05, backgroundColor: 'rgba(21, 29, 44, 0.8)' }}
        className="hidden lg:flex absolute bottom-10 right-10 flex-col gap-1.5 z-40 bg-[#151d2c]/60 backdrop-blur-md p-1.5 rounded-xl border border-white/10 shadow-2xl cursor-move active:cursor-grabbing hover:border-white/30 transition-colors"
      >
        <div className="h-1 w-6 bg-white/20 rounded-full mx-auto mb-1 opacity-50" />
        {/* Quick Duration */}
        <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-lg border border-white/5 mb-0.5">
          <button 
            onClick={() => setQuickDuration(prev => Math.max(5, prev - 5))}
            className="w-5 h-5 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-md transition-all active:scale-90"
          >
            <Minus size={8} className="text-white/60" />
          </button>
          <div className="flex flex-col items-center min-w-[40px]">
            <span className="text-[6px] text-white/30 font-bold uppercase tracking-widest leading-none mb-0.5">Time</span>
            <span className="text-[10px] font-mono font-black text-white leading-none">{formatDuration(quickDuration)}</span>
          </div>
          <button 
            onClick={() => setQuickDuration(prev => prev + 5)}
            className="w-5 h-5 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-md transition-all active:scale-90"
          >
            <Plus size={8} className="text-white/60" />
          </button>
        </div>

        {/* Quick Trade Buttons */}
        <div className="flex gap-1.5">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleQuickTrade('higher')}
            className="w-10 h-10 bg-qx-up rounded-lg flex items-center justify-center shadow-lg shadow-qx-up/20 border border-white/10"
          >
            <ArrowUp size={16} strokeWidth={4} className="text-white" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleQuickTrade('lower')}
            className="w-10 h-10 bg-qx-down rounded-lg flex items-center justify-center shadow-lg shadow-qx-down/20 border border-white/10"
          >
            <ArrowDown size={16} strokeWidth={4} className="text-white" />
          </motion.button>
        </div>
      </motion.div>

      {/* PC Action Bar (Hidden on Mobile) */}
      <div className="hidden lg:flex border-t border-white/5 bg-[#151d2c]/80 backdrop-blur-xl p-3 flex-col gap-3 z-50">
        <div className="flex gap-3">
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleQuickTrade('higher')}
            className="flex-1 py-3 bg-qx-up rounded-xl flex items-center justify-center gap-3 shadow-lg shadow-qx-up/20 border border-white/10 group transition-all"
          >
            <div className="flex flex-col items-start translate-y-[1px]">
              <span className="text-[8px] font-black text-white/60 uppercase tracking-[0.2em] leading-none mb-1 group-hover:text-white transition-colors">Call</span>
              <span className="text-sm font-black text-white leading-none">BUY</span>
            </div>
            <ArrowUp size={20} strokeWidth={4} className="text-white animate-bounce" />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleQuickTrade('lower')}
            className="flex-1 py-3 bg-qx-down rounded-xl flex items-center justify-center gap-3 shadow-lg shadow-qx-down/20 border border-white/10 group transition-all"
          >
            <div className="flex flex-col items-start translate-y-[1px]">
              <span className="text-[8px] font-black text-white/60 uppercase tracking-[0.2em] leading-none mb-1 group-hover:text-white transition-colors">Put</span>
              <span className="text-sm font-black text-white leading-none">SELL</span>
            </div>
            <ArrowDown size={20} strokeWidth={4} className="text-white animate-bounce" style={{ animationDirection: 'reverse' }} />
          </motion.button>
        </div>
      </div>
    </div>
  );
}
