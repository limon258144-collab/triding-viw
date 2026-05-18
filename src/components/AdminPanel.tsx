import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  DollarSign, 
  User, 
  Phone, 
  Hash, 
  Settings as SettingsIcon,
  RefreshCw,
  Search,
  Filter,
  Lock
} from 'lucide-react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc, 
  getDoc,
  setDoc,
  increment,
  runTransaction
} from 'firebase/firestore';
import { db } from '../lib/firebase';

interface AdminPanelProps {
  onClose: () => void;
}

export default function AdminPanel({ onClose }: AdminPanelProps) {
  const [deposits, setDeposits] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [bkashNumber, setBkashNumber] = useState('');
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
  const [activeView, setActiveView] = useState<'deposits' | 'withdrawals'>('deposits');
  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch Settings
    getDoc(doc(db, 'settings', 'global')).then(snap => {
      if (snap.exists()) setBkashNumber(snap.data().bkashNumber);
    });

    // Sync Deposits
    const qDep = query(collection(db, 'deposits'), orderBy('createdAt', 'desc'));
    const unsubscribeDep = onSnapshot(qDep, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDeposits(data);
      if (activeView === 'deposits') setIsLoading(false);
    });

    // Sync Withdrawals
    const qWith = query(collection(db, 'withdrawals'), orderBy('createdAt', 'desc'));
    const unsubscribeWith = onSnapshot(qWith, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setWithdrawals(data);
      if (activeView === 'withdrawals') setIsLoading(false);
    });

    return () => {
      unsubscribeDep();
      unsubscribeWith();
    };
  }, [activeView]);

  const handleUpdateBkash = async () => {
    setIsUpdatingSettings(true);
    try {
      await setDoc(doc(db, 'settings', 'global'), { bkashNumber }, { merge: true });
    } catch (error) {
      console.error('Error updating settings:', error);
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  const handleAction = async (deposit: any, action: 'approved' | 'rejected') => {
    try {
      await runTransaction(db, async (transaction) => {
        const depositRef = doc(db, 'deposits', deposit.id);
        const userRef = doc(db, 'users', deposit.userId);

        transaction.update(depositRef, { status: action });
        
        if (action === 'approved') {
          transaction.update(userRef, { 
            balance: increment(deposit.amount) 
          });
        }
      });
    } catch (error) {
      console.error('Error processing deposit:', error);
      alert('Transaction failed. Make sure user exists in database.');
    }
  };

  const handleWithdrawalAction = async (withdrawal: any, action: 'completed' | 'rejected') => {
    try {
      await runTransaction(db, async (transaction) => {
        const withdrawalRef = doc(db, 'withdrawals', withdrawal.id);
        const userRef = doc(db, 'users', withdrawal.userId);

        transaction.update(withdrawalRef, { status: action });
        
        // If rejected, refund the balance that was deducted during request
        if (action === 'rejected') {
          transaction.update(userRef, { 
            balance: increment(withdrawal.amount) 
          });
        }
      });
    } catch (error) {
      console.error('Error processing withdrawal:', error);
      alert('Transaction failed.');
    }
  };

  const filteredItems = activeView === 'deposits' 
    ? (activeTab === 'pending' ? deposits.filter(d => d.status === 'pending') : deposits)
    : (activeTab === 'pending' ? withdrawals.filter(w => w.status === 'pending') : withdrawals);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] bg-[#0b0e11] flex flex-col"
    >
      {/* Admin Header */}
      <header className="h-16 bg-[#161a1e] border-b border-white/5 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400">
            <Lock size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">Admin Console</h1>
            <p className="text-[10px] text-white/40 uppercase tracking-widest font-black">Financial Management</p>
          </div>
        </div>
        <div className="flex bg-black/20 p-1 rounded-xl border border-white/5 mx-4">
          <button 
            onClick={() => { setActiveView('deposits'); setIsLoading(true); }}
            className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'deposits' ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20' : 'text-white/40 hover:text-white/60'}`}
          >
            Deposits
          </button>
          <button 
            onClick={() => { setActiveView('withdrawals'); setIsLoading(true); }}
            className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'withdrawals' ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20' : 'text-white/40 hover:text-white/60'}`}
          >
            Withdrawals
          </button>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-white/20 hover:text-white transition-all">
          <X size={24} />
        </button>
      </header>

      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
        {/* Sidebar / Settings */}
        <div className="w-full lg:w-80 bg-[#12161b] border-r border-white/5 p-6 space-y-8 overflow-y-auto">
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-white/40 mb-2">
              <SettingsIcon size={14} />
              <span className="text-[10px] uppercase font-bold tracking-widest">Global Settings</span>
            </div>
            
            <div className="space-y-4 bg-white/5 p-4 rounded-2xl border border-white/5">
              <div className="space-y-2">
                <label className="text-[10px] text-white/40 uppercase tracking-widest font-bold">bKash Number</label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
                  <input 
                    type="text"
                    value={bkashNumber}
                    onChange={(e) => setBkashNumber(e.target.value)}
                    placeholder="Enter wallet number"
                    className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500/50 transition-all"
                  />
                </div>
              </div>
              <button 
                disabled={isUpdatingSettings}
                onClick={handleUpdateBkash}
                className="w-full bg-purple-500 hover:bg-purple-400 text-white text-xs font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                {isUpdatingSettings ? <RefreshCw size={14} className="animate-spin" /> : 'Update Number'}
              </button>
            </div>
          </section>

          <section className="space-y-3">
            <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-2xl">
              <h4 className="text-xs font-bold text-purple-400 mb-1">Quick Tip</h4>
              <p className="text-[10px] text-purple-400/60 leading-relaxed">
                Check bKash statement before approving. Approving a deposit automatically adds balance to the user's account.
              </p>
            </div>
          </section>
        </div>

        {/* Main Content / List */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#0b0e11]">
          <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0">
            <div className="flex gap-2">
              <button 
                onClick={() => setActiveTab('pending')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'pending' ? 'bg-white/10 text-white border border-white/10' : 'text-white/40 hover:text-white/60'}`}
              >
                Pending ({activeView === 'deposits' ? deposits.filter(d => d.status === 'pending').length : withdrawals.filter(w => w.status === 'pending').length})
              </button>
              <button 
                onClick={() => setActiveTab('all')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'all' ? 'bg-white/10 text-white border border-white/10' : 'text-white/40 hover:text-white/60'}`}
              >
                Full History
              </button>
            </div>
            
            <div className="flex items-center gap-2 text-white/20 text-[10px] font-bold uppercase tracking-widest">
              <RefreshCw size={10} className={isLoading ? 'animate-spin' : ''} />
              {isLoading ? 'Loading...' : 'Up to date'}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {isLoading ? (
              <div className="h-full flex items-center justify-center">
                <RefreshCw className="text-white/20 animate-spin" size={32} />
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center text-white/10">
                  <DollarSign size={32} />
                </div>
                <div>
                  <h3 className="text-white font-bold">No {activeView} Found</h3>
                  <p className="text-white/40 text-xs mt-1">Everything is up to date.</p>
                </div>
              </div>
            ) : (activeView === 'deposits' ? (
              <div className="space-y-3">
                {filteredItems.map((item) => (
                  <motion.div 
                    layout
                    key={item.id}
                    className="bg-[#161a1e] border border-white/5 rounded-2xl overflow-hidden hover:border-white/10 transition-all p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                        item.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' :
                        item.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500' :
                        'bg-red-500/10 text-red-500'
                      }`}>
                        {item.status === 'pending' ? <Clock size={20} /> : 
                         item.status === 'approved' ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                      </div>
                      
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-bold text-white">৳{item.amount.toLocaleString()}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-black tracking-widest ${
                            item.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500' :
                            item.status === 'approved' ? 'bg-emerald-500/20 text-emerald-500' :
                            'bg-red-500/20 text-red-500'
                          }`}>
                            {item.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-white/40">
                          <span className="flex items-center gap-1"><User size={10} /> {item.userEmail || item.userId.slice(0, 8)}</span>
                          <span className="flex items-center gap-1"><Phone size={10} /> {item.senderNumber || 'Unknown'}</span>
                          <span className="flex items-center gap-1 font-mono text-purple-400"><Hash size={10} /> {item.transactionId}</span>
                        </div>
                      </div>
                    </div>

                    {item.status === 'pending' && (
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleAction(item, 'rejected')}
                          className="w-9 h-9 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center p-0"
                          title="Reject"
                        >
                          <X size={18} />
                        </button>
                        <button 
                          onClick={() => handleAction(item, 'approved')}
                          className="h-9 px-4 rounded-lg bg-emerald-500 text-white hover:bg-emerald-400 transition-all flex items-center justify-center gap-2 text-xs font-bold"
                        >
                          <CheckCircle2 size={16} /> Approve
                        </button>
                      </div>
                    )}

                    {item.status !== 'pending' && (
                      <div className="text-[10px] text-white/20 font-mono italic text-right">
                         <div>{item.status === 'approved' ? 'Approved' : 'Rejected'}</div>
                         <div>{new Date(item.createdAt?.seconds * 1000).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredItems.map((item) => (
                  <motion.div 
                    layout
                    key={item.id}
                    className="bg-[#161a1e] border border-white/5 rounded-2xl overflow-hidden hover:border-white/10 transition-all p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                        item.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' :
                        item.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' :
                        'bg-red-500/10 text-red-500'
                      }`}>
                        {item.status === 'pending' ? <Clock size={20} /> : 
                         item.status === 'completed' ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                      </div>
                      
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-bold text-white">৳{item.amount.toLocaleString()}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-black tracking-widest ${
                            item.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500' :
                            item.status === 'completed' ? 'bg-emerald-500/20 text-emerald-500' :
                            'bg-red-500/20 text-red-500'
                          }`}>
                            {item.status}
                          </span>
                          <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded font-black text-white/40">{item.method}</span>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-white/40">
                          <span className="flex items-center gap-1"><User size={10} /> {item.userEmail || item.userId.slice(0, 8)}</span>
                          <span className="flex items-center gap-1 font-bold text-qx-down"><Hash size={10} /> {item.accountNumber}</span>
                        </div>
                      </div>
                    </div>

                    {item.status === 'pending' && (
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleWithdrawalAction(item, 'rejected')}
                          className="w-9 h-9 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center p-0"
                          title="Reject & Refund"
                        >
                          <X size={18} />
                        </button>
                        <button 
                          onClick={() => handleWithdrawalAction(item, 'completed')}
                          className="h-9 px-4 rounded-lg bg-qx-down text-white hover:bg-qx-down/80 transition-all flex items-center justify-center gap-2 text-xs font-bold"
                        >
                          <CheckCircle2 size={16} /> Approve Payment
                        </button>
                      </div>
                    )}

                    {item.status !== 'pending' && (
                       <div className="text-[10px] text-white/20 font-mono italic text-right">
                         <div>{item.status === 'completed' ? 'Paid' : 'Cancelled'}</div>
                         <div>{new Date(item.createdAt?.seconds * 1000).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</div>
                       </div>
                    )}
                  </motion.div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
