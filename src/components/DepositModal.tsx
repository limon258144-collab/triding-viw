import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Copy, Check, Info, AlertCircle } from 'lucide-react';
import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';

interface DepositModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function DepositModal({ onClose, onSuccess }: DepositModalProps) {
  const [step, setStep] = useState(1); // 1: Amount, 2: Payment
  const [amount, setAmount] = useState(200);
  const [transactionId, setTransactionId] = useState('');
  const [senderNumber, setSenderNumber] = useState('');
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [bkashNumber, setBkashNumber] = useState('01XXXXXXXXX');
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'global');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setBkashNumber(docSnap.data().bkashNumber || '01XXXXXXXXX');
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      }
    };
    fetchSettings();
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(bkashNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const validateTrxId = (id: string) => {
    // bKash TrxID is usually 10 alphanumeric characters
    const regex = /^[A-Z0-9]{10}$/;
    return regex.test(id.toUpperCase());
  };

  const handleSubmit = async () => {
    setError('');
    if (!transactionId) {
      setError('দয়া করে ট্রানজেকশন আইডি দিন।');
      return;
    }

    if (!senderNumber) {
      setError('দয়া করে আপনার বিকাশ নাম্বারটি দিন যা থেকে টাকা পাঠিয়েছেন।');
      return;
    }
    
    if (!validateTrxId(transactionId)) {
      setError('ট্রানজেকশন আইডিটি সঠিক নয়। এটি সাধারণত ১০টি অক্ষর ও সংখ্যার সমন্বয়ে হয় (যেমন: AKL2M3N4OP)।');
      return;
    }

    setIsSubmitting(true);
    try {
      const depositData = {
        userId: auth.currentUser?.uid,
        userEmail: auth.currentUser?.email,
        amount: Number(amount),
        walletNumber: bkashNumber,
        transactionId: transactionId.toUpperCase(),
        senderNumber: senderNumber,
        status: 'pending',
        createdAt: serverTimestamp()
      };
      
      await addDoc(collection(db, 'deposits'), depositData);
      setShowSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'deposits');
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
        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          className="w-full max-w-md bg-[#161a1e] rounded-3xl border border-emerald-500/20 shadow-2xl p-8 text-center space-y-4"
        >
          <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check size={40} className="text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-white">আবেদন জমা হয়েছে!</h2>
          <p className="text-white/60 leading-relaxed">
            আপনার ট্রানজেকশন আইডিটি যাচাই করা হচ্ছে। অনুগ্রহ করে ২-১০ মিনিট অপেক্ষা করুন। আপনার একাউন্টে ব্যালেন্স যুক্ত হয়ে যাবে।
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
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="w-full max-w-md bg-[#161a1e] rounded-3xl border border-white/10 shadow-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-emerald-500/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
              <span className="font-black">bK</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">ডিপোজিট করুন</h2>
              <p className="text-[10px] text-white/40 uppercase tracking-widest font-black">Manual bKash Payment</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-white/20 hover:text-white transition-all">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {step === 1 ? (
            <div className="space-y-6">
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl flex gap-3">
                <Info size={20} className="text-emerald-400 shrink-0" />
                <p className="text-xs text-emerald-400/80 leading-relaxed">
                  কত টাকা (BDT) ডিপোজিট করতে চান তা লিখুন। সর্বনিম্ন ডিপোজিট ২০০ টাকা। পরবর্তী ধাপে আপনাকে bKASH পার্সোনাল নাম্বারটি দেওয়া হবে।
                </p>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] text-white/40 font-mono uppercase tracking-widest ml-1">ডিপোজিট পরিমাণ (BDT)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-mono font-black text-white/20">৳</span>
                  <input 
                    type="number"
                    value={amount}
                    onChange={(e) => {
                      setAmount(Number(e.target.value));
                      if (error) setError('');
                    }}
                    className={`w-full bg-white/5 border rounded-2xl pl-10 pr-4 py-6 text-3xl font-mono font-black text-white focus:outline-none transition-all ${error ? 'border-pink-500/50' : 'border-white/10 focus:border-emerald-500/50'}`}
                  />
                </div>
                {error && step === 1 && (
                  <div className="flex items-center gap-2 text-pink-500 text-[10px] mt-1 ml-1">
                    <AlertCircle size={12} />
                    <span>{error}</span>
                  </div>
                )}
                <div className="grid grid-cols-5 gap-2">
                  {[200, 500, 1000, 5000, 10000].map(val => (
                    <button 
                      key={val}
                      onClick={() => {
                        setAmount(val);
                        setError('');
                      }}
                      className={`py-2 rounded-xl border text-[10px] font-bold transition-all ${amount === val ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20'}`}
                    >
                      {val} TK
                    </button>
                  ))}
                </div>
              </div>

              <button 
                onClick={() => {
                  if (amount < 200) {
                    setError('সর্বনিম্ন ডিপোজিট ২০০ টাকা।');
                    return;
                  }
                  if (amount > 10000) {
                    setError('সর্বোচ্চ ডিপোজিট ১০,০০০ টাকা।');
                    return;
                  }
                  setError('');
                  setStep(2);
                }}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-emerald-500/20"
              >
                পেমেন্ট ধাপে এগিয়ে যান
              </button>
            </div>
          ) : (
            <div className="space-y-6 overflow-y-auto max-h-[70vh] pr-2 custom-scrollbar">
              <div className="bg-pink-500/10 border border-pink-500/20 p-4 rounded-2xl">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-pink-500 flex items-center justify-center text-white text-[10px] font-black uppercase">
                    Personal
                  </div>
                  <span className="text-sm font-bold text-white">BKASH সেন্ড মানি নির্দেশিকা</span>
                </div>
                <div className="space-y-2 text-[11px] text-white/70">
                  <p className="flex gap-2"><span className="text-pink-400 font-bold">১.</span> নিচে দেওয়া পার্সোনাল নাম্বারটি কপি করুন।</p>
                  <p className="flex gap-2"><span className="text-pink-400 font-bold">২.</span> আপনার bKash অ্যাপ বা *247# ডায়াল করে <span className="text-pink-400 font-bold">Send Money</span> সিলেক্ট করুন।</p>
                  <p className="flex gap-2"><span className="text-pink-400 font-bold">৩.</span> পার্সোনাল নাম্বারে টাকা পাঠানোর পর <span className="text-pink-400 font-bold">TrxID (ট্রানজেকশন আইডি)</span> টি কপি করে আনুন।</p>
                  <p className="bg-pink-400/10 p-2 rounded border border-pink-400/20 text-pink-400 font-bold mt-2">
                    সতর্কতা: শুধুমাত্র "Send Money" করবেন। ক্যাশ আউট করলে পেমেন্ট গ্রহণ করা হবে না।
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-white/40 font-mono uppercase tracking-widest ml-1">পার্সোনাল নাম্বার (Copy করুন)</label>
                <div className="relative">
                  <input 
                    readOnly
                    value={bkashNumber}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-white font-mono font-bold text-lg focus:outline-none"
                  />
                  <button 
                    onClick={handleCopy}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-xl transition-all"
                  >
                    {copied ? <Check size={18} /> : <Copy size={18} />}
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] text-white/40 font-mono uppercase tracking-widest ml-1">
                    যেই নাম্বার থেকে সেন্ড মানি করেছেন
                  </label>
                  <input 
                    placeholder="আপনার বিকাশ নাম্বার"
                    value={senderNumber}
                    onChange={(e) => {
                      setSenderNumber(e.target.value);
                      setError('');
                    }}
                    className={`w-full bg-white/5 border rounded-2xl px-4 py-4 text-white font-mono placeholder:text-white/10 focus:outline-none transition-all ${error && !senderNumber ? 'border-pink-500/50' : 'border-white/10 focus:border-emerald-500/50'}`}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] text-white/40 font-mono uppercase tracking-widest ml-1 flex items-center justify-between">
                    TrxID নাম্বারটি এখানে দিন <span className="text-pink-500">(অবশ্যই দিতে হবে)</span>
                  </label>
                  <input 
                    placeholder="যেমন: AKL2M3N4OP"
                    value={transactionId}
                    onChange={(e) => {
                      setTransactionId(e.target.value);
                      setError('');
                    }}
                    className={`w-full bg-white/5 border rounded-2xl px-4 py-4 text-white font-mono placeholder:text-white/10 focus:outline-none transition-all uppercase ${error && !transactionId ? 'border-pink-500/50' : 'border-white/10 focus:border-emerald-500/50'}`}
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-pink-500 text-[10px] mt-1 ml-1">
                    <AlertCircle size={12} />
                    <span>{error}</span>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <button 
                  disabled={!transactionId || !senderNumber || isSubmitting}
                  onClick={handleSubmit}
                  className="w-full bg-[#006b52] hover:bg-[#005a45] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-emerald-900/20"
                >
                  {isSubmitting ? 'প্রসেসিং হচ্ছে...' : 'পেমেন্ট নিশ্চিত করুন'}
                </button>
                
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle size={14} className="text-pink-500 mt-0.5 shrink-0" />
                    <p className="text-[10px] text-white/60 leading-tight">
                      ট্রানজেকশন আইডি ভুল দিলে ডিপোজিট রিজেক্ট হবে। সঠিক আইডি কপি করে এনে বসান।
                    </p>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setStep(1)}
                className="w-full text-center text-white/20 hover:text-white/40 text-[10px] uppercase font-black tracking-[0.2em] transition-all"
              >
                পরিমাণ পরিবর্তন করুন
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
