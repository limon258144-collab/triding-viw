import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, ArrowRight, AlertCircle, Wallet } from 'lucide-react';
import { addDoc, collection, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';

interface WithdrawalModalProps {
  onClose: () => void;
  onSuccess: () => void;
  currentBalance: number;
}

export default function WithdrawalModal({ onClose, onSuccess, currentBalance }: WithdrawalModalProps) {
  const [amount, setAmount] = useState(500);
  const [method, setMethod] = useState<'bKash' | 'Nagad' | 'Rocket'>('bKash');
  const [accountNumber, setAccountNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = async () => {
    setError('');
    
    if (amount < 500) {
      setError('সর্বনিম্ন উইথড্র ৫০০ টাকা।');
      return;
    }

    if (amount > currentBalance) {
      setError('আপনার পর্যাপ্ত ব্যালেন্স নেই।');
      return;
    }

    if (!accountNumber) {
      setError('দয়া করে আপনার একাউন্ট নাম্বারটি দিন।');
      return;
    }

    if (accountNumber.length < 11) {
      setError('সঠিক ১১ ডিজিটের নাম্বার দিন।');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Create withdrawal request
      const withdrawalData = {
        userId: auth.currentUser?.uid,
        userEmail: auth.currentUser?.email,
        amount: Number(amount),
        accountNumber: accountNumber,
        method: method,
        status: 'pending',
        createdAt: serverTimestamp()
      };
      
      await addDoc(collection(db, 'withdrawals'), withdrawalData);

      // 2. Deduct from user balance immediately to "reserve" it
      if (auth.currentUser) {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        await updateDoc(userRef, {
          balance: increment(-Number(amount))
        });
      }

      setShowSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'withdrawals');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showSuccess) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[203] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          className="w-full max-w-md bg-[#161a1e] rounded-3xl border border-emerald-500/20 shadow-2xl p-8 text-center space-y-4"
        >
          <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check size={40} className="text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-white">উইথড্র আবেদন সফল!</h2>
          <p className="text-white/60 leading-relaxed">
            আপনার আবেদনটি সফলভাবে জমা হয়েছে। এডমিন যাচাই করে আপনার পেমেন্ট পাঠিয়ে দিবে। সাধারণত ২-২৪ ঘণ্টার মধ্যে পেমেন্ট পাওয়া যায়।
          </p>
          <div className="pt-4">
            <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ duration: 3 }}
                className="h-full bg-emerald-500" 
              />
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[202] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="w-full max-w-md bg-[#161a1e] rounded-3xl border border-white/10 shadow-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-qx-down/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-qx-down/20 flex items-center justify-center text-qx-down">
              <Wallet size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">টাকা উত্তোলন (Withdraw)</h2>
              <p className="text-[10px] text-white/40 uppercase tracking-widest font-black">Transfer Funds to Wallet</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-white/20 hover:text-white transition-all">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-white/5 border border-white/10 p-4 rounded-2xl flex justify-between items-center">
            <div>
              <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">আপনার বর্তমান ব্যালেন্স</p>
              <p className="text-xl font-mono font-black text-white">৳{currentBalance.toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-white/40 uppercase tracking-widest mb-1">সর্বনিম্ন উইথড্র</p>
              <p className="text-sm font-bold text-emerald-400">৳৫০০</p>
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] text-white/40 font-mono uppercase tracking-widest ml-1">পরিমাণ (Amount)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-mono font-black text-white/20">৳</span>
              <input 
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-4 text-2xl font-mono font-black text-white focus:outline-none focus:border-qx-down/50 transition-all"
              />
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[500, 1000, 5000, 10000].map(val => (
                <button 
                  key={val}
                  onClick={() => setAmount(val)}
                  className={`py-2 rounded-xl border text-[10px] font-bold transition-all ${amount === val ? 'bg-qx-down border-qx-down text-white' : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20'}`}
                >
                  {val} TK
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] text-white/40 font-mono uppercase tracking-widest ml-1">পেমেন্ট মেথড (Method)</label>
            <div className="grid grid-cols-3 gap-3">
              {(['bKash', 'Nagad', 'Rocket'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setMethod(m)}
                  className={`py-3 rounded-2xl border flex flex-col items-center gap-1 transition-all ${method === m ? 'bg-white/10 border-white/30 text-white' : 'bg-white/5 border-white/5 text-white/20'}`}
                >
                  <span className="text-[8px] font-black uppercase tracking-widest opacity-40">{m === 'bKash' ? 'বিকাশ' : m === 'Nagad' ? 'নগদ' : 'রকেট'}</span>
                  <span className="font-bold text-[11px]">{m}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] text-white/40 font-mono uppercase tracking-widest ml-1">{method} পার্সোনাল নাম্বার</label>
            <input 
              placeholder="০১৭XXXXXXXX"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-white font-mono font-bold text-lg focus:outline-none focus:border-qx-down/50 transition-all"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-qx-down text-[11px] bg-qx-down/10 p-3 rounded-xl border border-qx-down/20">
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}

          <button 
            disabled={isSubmitting || amount > currentBalance}
            onClick={handleSubmit}
            className="w-full bg-qx-down hover:bg-qx-down/80 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-qx-down/20 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <>উইথড্র রিকোয়েস্ট পাঠান <ArrowRight size={18} /></>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
