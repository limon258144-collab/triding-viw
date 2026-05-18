import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface OrderBookProps {
  orderBook: {
    bids: { price: number; amount: number }[];
    asks: { price: number; amount: number }[];
  } | null;
  currentPrice: number;
}

export default function OrderBook({ orderBook, currentPrice }: OrderBookProps) {
  if (!orderBook) return (
    <div className="flex flex-col h-full items-center justify-center text-white/20">
      <span className="text-xs uppercase tracking-widest font-bold">Loading Depth...</span>
    </div>
  );

  const maxAmount = Math.max(
    ...orderBook.bids.map(b => b.amount),
    ...orderBook.asks.map(a => a.amount)
  );

  return (
    <div className="flex flex-col h-full bg-[#1c2029]/50 backdrop-blur-sm overflow-hidden">
      <div className="px-4 py-3 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Market Depth</span>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-qx-up animate-pulse" />
          <span className="text-[10px] font-bold text-qx-up">Live</span>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Asks (Sell Orders) - Top */}
        <div className="flex-1 flex flex-col-reverse overflow-hidden">
          {orderBook.asks.map((ask, i) => (
            <div key={`ask-${i}`} className="relative h-6 flex items-center px-4 group hover:bg-white/5 transition-colors">
              <div 
                className="absolute right-0 top-0 bottom-0 bg-qx-down/10 transition-all duration-500"
                style={{ width: `${(ask.amount / maxAmount) * 100}%` }}
              />
              <span className="relative z-10 text-[10px] font-mono text-qx-down w-20">
                {ask.price.toFixed(4)}
              </span>
              <span className="relative z-10 text-[10px] font-mono text-white/60 flex-1 text-right">
                {ask.amount.toFixed(3)}
              </span>
            </div>
          ))}
        </div>

        {/* Spread / Current Price */}
        <div className="py-2 px-4 bg-white/5 flex items-center justify-between">
          <span className="text-sm font-mono font-bold text-white">
            {currentPrice.toFixed(4)}
          </span>
          <span className="text-[9px] font-bold text-white/20 uppercase">Spread: {(orderBook.asks[0].price - orderBook.bids[0].price).toFixed(4)}</span>
        </div>

        {/* Bids (Buy Orders) - Bottom */}
        <div className="flex-1 overflow-hidden">
          {orderBook.bids.map((bid, i) => (
            <div key={`bid-${i}`} className="relative h-6 flex items-center px-4 group hover:bg-white/5 transition-colors">
              <div 
                className="absolute right-0 top-0 bottom-0 bg-qx-up/10 transition-all duration-500"
                style={{ width: `${(bid.amount / maxAmount) * 100}%` }}
              />
              <span className="relative z-10 text-[10px] font-mono text-qx-up w-20">
                {bid.price.toFixed(4)}
              </span>
              <span className="relative z-10 text-[10px] font-mono text-white/60 flex-1 text-right">
                {bid.amount.toFixed(3)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
