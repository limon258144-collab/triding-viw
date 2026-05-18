import React from 'react';
import { TrendingUp, Search } from 'lucide-react';

interface AssetListProps {
  assets: any[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export default function AssetList({ assets, selectedId, onSelect }: AssetListProps) {
  return (
    <div className="w-full bg-transparent overflow-hidden flex flex-col h-full">
      <div className="p-3 border-b border-qx-border bg-[#1c2536]">
        <div className="relative">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
          <input 
            type="text" 
            placeholder="Search assets..."
            className="w-full bg-qx-bg border border-qx-border rounded-lg pl-8 pr-4 py-1.5 text-[11px] text-white focus:outline-none focus:border-qx-up/50 transition-all placeholder:text-white/10"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#1c2536]">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-[#1c2536] z-10">
            <tr className="text-[9px] text-white/20 font-bold uppercase tracking-widest border-b border-qx-border">
              <th className="px-4 py-2.5 font-bold">Asset</th>
              <th className="px-4 py-2.5 font-bold text-right">Price</th>
              <th className="px-4 py-2.5 font-bold text-right">Payout</th>
            </tr>
          </thead>
          <tbody>
            {assets.map((asset) => {
              const isSelected = selectedId === asset.id;
              
              return (
                <tr 
                  key={asset.id}
                  onClick={() => onSelect(asset.id)}
                  className={`group hover:bg-white/5 cursor-pointer transition-colors border-b border-qx-border last:border-0 ${isSelected ? 'bg-white/5' : ''}`}
                >
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className={`text-[11px] font-bold transition-colors ${isSelected ? 'text-qx-up' : 'text-white'}`}>{asset.name}</span>
                      <div className="flex items-center gap-1">
                        <TrendingUp size={10} className="text-qx-up" />
                        <span className="text-qx-up text-[9px] font-bold">
                          +0.45%
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-[11px] font-mono font-bold text-white/60 tracking-tight">
                      {asset.price.toLocaleString(undefined, { minimumFractionDigits: asset.id === 'eurusd' ? 4 : 2 })}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-[11px] font-bold text-qx-up">{asset.profitability || 87}%</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
