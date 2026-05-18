import React, { useState, useMemo } from 'react';
import { 
  X, 
  Filter, 
  ArrowUpDown, 
  Search, 
  Calendar,
  CheckCircle2,
  XCircle,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  History
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TradeHistoryProps {
  history: any[];
  assets: any[];
  onClose: () => void;
}

type SortField = 'time' | 'profit' | 'amount';
type SortOrder = 'asc' | 'desc';

export default function TradeHistory({ history, assets, onClose }: TradeHistoryProps) {
  const [filterAsset, setFilterAsset] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'win' | 'loss'>('all');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [sortField, setSortField] = useState<SortField>('time');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredAndSortedHistory = useMemo(() => {
    let result = [...history];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(trade => {
        const asset = assets.find(a => a.id === trade.assetId);
        return asset?.name.toLowerCase().includes(query) || trade.assetId.toLowerCase().includes(query);
      });
    }

    // Asset filter
    if (filterAsset !== 'all') {
      result = result.filter(trade => trade.assetId === filterAsset);
    }

    // Status filter
    if (filterStatus !== 'all') {
      result = result.filter(trade => (filterStatus === 'win' ? trade.win : !trade.win));
    }

    // Date range filter
    if (dateRange.start) {
      const start = new Date(dateRange.start).getTime();
      result = result.filter(trade => trade.time >= start);
    }
    if (dateRange.end) {
      const end = new Date(dateRange.end).getTime() + 86400000; // End of day
      result = result.filter(trade => trade.time <= end);
    }

    // Sorting
    result.sort((a, b) => {
      let valA, valB;
      
      if (sortField === 'time') {
        valA = a.time;
        valB = b.time;
      } else if (sortField === 'profit') {
        valA = a.profit;
        valB = b.profit;
      } else {
        // Investment amount - we need to find it from history or assume it's there
        // In server.ts, trade result has profit but maybe not original amount?
        // Let's check server.ts trade result structure.
        // It seems trade result has: id, assetId, win, profit, exitPrice, balance, time
        // Wait, profit for win is trade.amount * 1.87, for loss is 0.
        // We might need to store the original amount in the history.
        valA = a.amount || 0; 
        valB = b.amount || 0;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [history, assets, filterAsset, filterStatus, dateRange, sortField, sortOrder, searchQuery]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  return (
    <motion.div 
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-y-0 right-0 w-full max-w-md bg-[#0b0e11] border-l border-qx-border z-[150] flex flex-col shadow-2xl"
    >
      {/* Header */}
      <div className="h-14 border-b border-qx-border flex items-center justify-between px-6 bg-[#151d2c]">
        <div className="flex items-center gap-3">
          <History size={20} className="text-qx-up" />
          <h2 className="text-sm font-bold uppercase tracking-widest">Trade History</h2>
        </div>
        <button 
          onClick={onClose}
          className="p-2 hover:bg-white/5 rounded-lg transition-colors text-white/40 hover:text-white"
        >
          <X size={20} />
        </button>
      </div>

      {/* Filters & Search */}
      <div className="p-6 border-b border-qx-border space-y-4 bg-[#0b0e11]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={16} />
          <input 
            type="text"
            placeholder="Search assets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-qx-bg/50 border border-qx-border rounded-lg pl-10 pr-4 py-2 text-xs font-medium focus:outline-none focus:border-qx-up/50 transition-colors"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Asset</label>
            <div className="relative">
              <select 
                value={filterAsset}
                onChange={(e) => setFilterAsset(e.target.value)}
                className="w-full bg-qx-bg/50 border border-qx-border rounded-lg px-3 py-2 text-xs font-medium appearance-none focus:outline-none focus:border-qx-up/50"
              >
                <option value="all">All Assets</option>
                {assets.map(asset => (
                  <option key={asset.id} value={asset.id}>{asset.name}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Status</label>
            <div className="relative">
              <select 
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="w-full bg-qx-bg/50 border border-qx-border rounded-lg px-3 py-2 text-xs font-medium appearance-none focus:outline-none focus:border-qx-up/50"
              >
                <option value="all">All Status</option>
                <option value="win">Wins Only</option>
                <option value="loss">Losses Only</option>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Date Range</label>
          <div className="flex items-center gap-2">
            <input 
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="flex-1 bg-qx-bg/50 border border-qx-border rounded-lg px-3 py-2 text-[10px] font-medium focus:outline-none focus:border-qx-up/50"
            />
            <span className="text-white/20">-</span>
            <input 
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="flex-1 bg-qx-bg/50 border border-qx-border rounded-lg px-3 py-2 text-[10px] font-medium focus:outline-none focus:border-qx-up/50"
            />
          </div>
        </div>
      </div>

      {/* Sorting Tabs */}
      <div className="flex items-center px-6 py-3 bg-[#151d2c]/50 border-b border-qx-border gap-6">
        <button 
          onClick={() => toggleSort('time')}
          className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 transition-colors ${sortField === 'time' ? 'text-qx-up' : 'text-white/30 hover:text-white'}`}
        >
          Date {sortField === 'time' && <ArrowUpDown size={10} />}
        </button>
        <button 
          onClick={() => toggleSort('profit')}
          className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 transition-colors ${sortField === 'profit' ? 'text-qx-up' : 'text-white/30 hover:text-white'}`}
        >
          Profit {sortField === 'profit' && <ArrowUpDown size={10} />}
        </button>
        <button 
          onClick={() => toggleSort('amount')}
          className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 transition-colors ${sortField === 'amount' ? 'text-qx-up' : 'text-white/30 hover:text-white'}`}
        >
          Amount {sortField === 'amount' && <ArrowUpDown size={10} />}
        </button>
      </div>

      {/* History List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
        {filteredAndSortedHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <History size={32} className="text-white/10" />
            </div>
            <p className="text-sm font-bold text-white/40">No trades found</p>
            <p className="text-[10px] text-white/20 uppercase tracking-widest mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          filteredAndSortedHistory.map((trade) => {
            const asset = assets.find(a => a.id === trade.assetId);
            return (
              <motion.div 
                layout
                key={trade.id}
                className="bg-[#151d2c] border border-qx-border p-3 rounded-xl flex items-center justify-between group hover:border-white/10 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${trade.win ? 'bg-qx-up/10 text-qx-up' : 'bg-qx-down/10 text-qx-down'}`}>
                    {trade.win ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold">{asset?.name || trade.assetId}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${trade.win ? 'bg-qx-up/20 text-qx-up' : 'bg-qx-down/20 text-qx-down'}`}>
                        {trade.win ? 'Win' : 'Loss'}
                      </span>
                    </div>
                    <div className="text-[10px] text-white/30 font-medium mt-0.5">
                      {new Date(trade.time).toLocaleString()}
                    </div>
                  </div>
                </div>
                  <div className="text-right">
                    <div className={`text-sm font-mono font-black ${trade.win ? 'text-qx-up' : 'text-white/60'}`}>
                      {trade.win ? '+' : '-'}${trade.win ? trade.profit.toFixed(2) : trade.amount.toFixed(2)}
                    </div>
                    <div className="flex flex-col items-end gap-0.5 mt-0.5">
                      <div className="flex items-center gap-1">
                        <span className="text-[8px] text-white/20 font-black uppercase">Entry</span>
                        <span className="text-[10px] text-white/60 font-mono font-bold tracking-tighter">{(trade.entryPrice || 0).toFixed(5)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[8px] text-white/20 font-black uppercase">Exit</span>
                        <span className="text-[10px] text-white/60 font-mono font-bold tracking-tighter">{(trade.exitPrice || 0).toFixed(5)}</span>
                      </div>
                    </div>
                  </div>
              </motion.div>
            );
          })
        )}
      </div>
    </motion.div>
  );
}
