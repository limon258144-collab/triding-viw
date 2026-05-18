import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';

interface MarketSentimentProps {
  assetId: string;
}

export default function MarketSentiment({ assetId }: MarketSentimentProps) {
  const [sentiment, setSentiment] = useState({ bullish: 50, bearish: 50 });

  // Simulate sentiment shifts based on assetId
  useEffect(() => {
    const updateSentiment = () => {
      // Logic could be more complex, but for now we simulate random shifts
      // focused around a certain "mood" per asset
      setSentiment(prev => {
        const drift = (Math.random() - 0.5) * 4;
        const newBullish = Math.max(10, Math.min(90, prev.bullish + drift));
        return {
          bullish: newBullish,
          bearish: 100 - newBullish
        };
      });
    };

    const interval = setInterval(updateSentiment, 3000);
    // Initial random value for the asset
    const initialBullish = 40 + Math.random() * 20;
    setSentiment({ bullish: initialBullish, bearish: 100 - initialBullish });

    return () => clearInterval(interval);
  }, [assetId]);

  return (
    <div className="flex flex-col gap-0.5 w-[70px] bg-black/60 backdrop-blur-md px-1 py-1 rounded-md border border-white/5">
      <div className="flex justify-between items-center px-0.5">
        <span className="text-[7px] font-black text-qx-up leading-none">{Math.round(sentiment.bullish)}%</span>
        <span className="text-[7px] font-black text-qx-down leading-none">{Math.round(sentiment.bearish)}%</span>
      </div>
      
      <div className="relative h-1 w-full bg-qx-down/30 rounded-full overflow-hidden flex">
        <motion.div 
          initial={false}
          animate={{ width: `${sentiment.bullish}%` }}
          transition={{ type: 'spring', stiffness: 50, damping: 20 }}
          className="h-full bg-qx-up"
        />
      </div>
    </div>
  );
}
