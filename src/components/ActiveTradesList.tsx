import React from 'react';
import { ArrowUp, ArrowDown, Clock, Wallet } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Trade {
  id: string;
  assetId: string;
  type: 'higher' | 'lower';
  amount: number;
  entryPrice: number;
  entryTime: number;
  duration: number;
  expirationTime: number;
}

interface ActiveTradesListProps {
  trades: Trade[];
  assets: any[];
}

export default function ActiveTradesList({ trades, assets }: ActiveTradesListProps) {
  const [now, setNow] = React.useState(Date.now());

  React.useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (trades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 opacity-20">
        <Clock size={32} className="mb-2" />
        <span className="text-[10px] font-black uppercase tracking-widest">No Active Trades</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-2">
      <AnimatePresence initial={false}>
        {trades.map((trade) => {
          const asset = assets.find(a => a.id === trade.assetId);
          const isUp = trade.type === 'higher';
          const remainingTime = Math.max(0, Math.ceil((trade.expirationTime - now) / 1000));
          
          return (
            <motion.div
              key={trade.id}
              initial={{ height: 0, opacity: 0, x: -20 }}
              animate={{ height: 'auto', opacity: 1, x: 0 }}
              exit={{ height: 0, opacity: 0, x: 20 }}
              className="bg-[#1c2536] border border-white/5 rounded-xl p-3 flex flex-col gap-2 overflow-hidden shadow-lg"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isUp ? 'bg-qx-up/10 text-qx-up' : 'bg-qx-down/10 text-qx-down'}`}>
                    {isUp ? <ArrowUp size={16} strokeWidth={3} /> : <ArrowDown size={16} strokeWidth={3} />}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[11px] font-black text-white leading-none mb-0.5">{asset?.name || trade.assetId}</span>
                    <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest leading-none">
                      {trade.type} / ${trade.amount}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-xs font-mono font-black text-white/80">{remainingTime}s</span>
                  <div className="w-16 h-1 bg-white/5 rounded-full overflow-hidden mt-1">
                    <motion.div 
                      className="h-full bg-qx-up"
                      initial={{ width: '100%' }}
                      animate={{ width: '0%' }}
                      transition={{ duration: remainingTime, ease: 'linear' }}
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between px-1 pt-1 border-t border-white/5">
                <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">Entry</span>
                <span className="text-[10px] font-mono font-bold text-white/60">{trade.entryPrice.toFixed(4)}</span>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
