import React, { useState, useEffect } from 'react';
import { Sparkles, TrendingUp, TrendingDown, AlertCircle, Loader2, BrainCircuit } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AnalysisResult {
  sentiment: string;
  prediction: string;
  support: number;
  resistance: number;
  confidence: number;
  reasoning: string;
}

interface AIAnalysisProps {
  assetId: string;
  assetName: string;
  history: any[];
  currentPrice: number;
}

export default function AIAnalysis({ assetId, assetName, history, currentPrice }: AIAnalysisProps) {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateAnalysis = async () => {
    if (loading) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const slicedHistory = history.slice(-30);
      const response = await fetch('/api/gemini/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId, assetName, history: slicedHistory, currentPrice }),
      });
      
      if (!response.ok) throw new Error('Analysis failed');
      
      const data = await response.json();
      setAnalysis(data);
    } catch (err) {
      setError('Market analysis temporarily unavailable');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Reset analysis when asset changes
    setAnalysis(null);
  }, [assetId]);

  return (
    <div className="flex flex-col gap-4 p-4 h-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BrainCircuit className="text-qx-up" size={20} />
          <h3 className="text-sm font-black text-white uppercase tracking-[0.2em]">AI Market Pulse</h3>
        </div>
        <button
          onClick={generateAnalysis}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 bg-qx-up/10 hover:bg-qx-up/20 text-qx-up rounded-lg transition-all disabled:opacity-50 group"
        >
          {loading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Sparkles size={14} className="group-hover:scale-125 transition-transform" />
          )}
          <span className="text-[10px] font-black uppercase tracking-widest">Analyze</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-12 gap-4"
            >
              <div className="relative">
                <div className="w-12 h-12 border-2 border-qx-up/20 border-t-qx-up rounded-full animate-spin" />
                <BrainCircuit className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-qx-up/40" size={20} />
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-black text-qx-up uppercase tracking-[0.3em] animate-pulse">Deep Scanning...</span>
                <span className="text-[8px] font-bold text-white/20 uppercase tracking-widest mt-1">Evaluating price patterns & sentiment</span>
              </div>
            </motion.div>
          ) : error ? (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-8 gap-3 text-center"
            >
              <AlertCircle className="text-qx-down" size={32} />
              <span className="text-[10px] font-black text-qx-down uppercase tracking-widest leading-relaxed">
                {error}
              </span>
            </motion.div>
          ) : analysis ? (
            <motion.div
              key="analysis"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-4"
            >
              {/* Sentiment Card */}
              <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em]">Current Sentiment</span>
                    <span className={`text-lg font-black uppercase tracking-tight ${
                      analysis.sentiment.toLowerCase().includes('bull') ? 'text-qx-up' : 
                      analysis.sentiment.toLowerCase().includes('bear') ? 'text-qx-down' : 'text-white'
                    }`}>
                      {analysis.sentiment}
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
                    {analysis.sentiment.toLowerCase().includes('bull') ? (
                      <TrendingUp size={24} className="text-qx-up" />
                    ) : (
                      <TrendingDown size={24} className="text-qx-down" />
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-black/20 rounded-xl p-2.5 border border-white/5">
                    <span className="text-[7px] font-black text-white/20 uppercase tracking-[0.2em] block mb-1">Confidence</span>
                    <div className="flex items-end gap-1">
                      <span className="text-sm font-black text-white">{analysis.confidence}%</span>
                    </div>
                  </div>
                  <div className="bg-black/20 rounded-xl p-2.5 border border-white/5">
                    <span className="text-[7px] font-black text-white/20 uppercase tracking-[0.2em] block mb-1">Prediction</span>
                    <span className="text-sm font-black text-white">{analysis.prediction}</span>
                  </div>
                </div>
              </div>

              {/* Levels */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-qx-up/5 rounded-2xl p-3 border border-qx-up/10">
                  <span className="text-[8px] font-black text-qx-up/40 uppercase tracking-[0.2em] block mb-1">Support</span>
                  <span className="text-xs font-mono font-black text-qx-up">{analysis.support.toFixed(4)}</span>
                </div>
                <div className="bg-qx-down/5 rounded-2xl p-3 border border-qx-down/10">
                  <span className="text-[8px] font-black text-qx-down/40 uppercase tracking-[0.2em] block mb-1">Resistance</span>
                  <span className="text-xs font-mono font-black text-qx-down">{analysis.resistance.toFixed(4)}</span>
                </div>
              </div>

              {/* Reasoning */}
              <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                <span className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em] block mb-2">AI Reasoning</span>
                <p className="text-[10px] font-bold text-white/50 leading-relaxed italic">
                  "{analysis.reasoning}"
                </p>
              </div>

              <div className="px-1 text-center">
                <p className="text-[7px] font-black text-white/10 uppercase tracking-widest leading-loose">
                  Financial AI analysis is experimental and should not be taken as professional advice. Trade at your own risk.
                </p>
              </div>
            </motion.div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center opacity-20">
              <Sparkles size={40} className="mb-4" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em]">Ready to analyze {assetName}</span>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
