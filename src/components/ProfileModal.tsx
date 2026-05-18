import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Phone, Landmark, Save, Camera, Check, User, Bell, Shield, Settings, Copy, Share2, Users } from 'lucide-react';
import { doc, getDoc, updateDoc, query, collection, where, getDocs, runTransaction, increment, limit } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';

interface ProfileModalProps {
  onClose: () => void;
}

const AVATARS = [
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
  'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=100&h=100&fit=crop',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
  'https://images.unsplash.com/photo-1544717297-fa154da09f9b?w=100&h=100&fit=crop',
];

export default function ProfileModal({ onClose }: ProfileModalProps) {
  const [displayName, setDisplayName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [referredBy, setReferredBy] = useState<string | null>(null);
  const [redeemCode, setRedeemCode] = useState('');
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [role, setRole] = useState('user');
  const [isAdmin, setIsAdmin] = useState(false);
  const [copied, setCopied] = useState(false);
  const [notificationPrefs, setNotificationPrefs] = useState({
    tradeAlerts: true,
    depositNews: true,
    systemUpdates: true,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      if (!auth.currentUser) return;
      setLoading(true);
      try {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setDisplayName(data.displayName || '');
          setSelectedAvatar(data.avatar || '');
          
          if (data.referralCode) {
            setReferralCode(data.referralCode);
          } else {
            // Generate and save missing referral code
            const newCode = auth.currentUser.uid.substring(0, 8).toLowerCase();
            setReferralCode(newCode);
            await updateDoc(doc(db, 'users', auth.currentUser.uid), {
              referralCode: newCode
            });
          }

          setReferredBy(data.referredBy || null);

          setRole(data.role || 'user');
          setIsAdmin(data.role === 'admin');
          if (data.notificationPrefs) {
            setNotificationPrefs(data.notificationPrefs);
          }
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `users/${auth.currentUser.uid}`);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, []);

  const handleSave = async () => {
    if (!auth.currentUser) return;
    setSaving(true);
    try {
      const updates: any = {
        displayName,
        avatar: selectedAvatar,
        notificationPrefs,
      };
      
      // Only allow updating role if the user was already an admin
      // The security rules also enforce this
      if (isAdmin) {
        updates.role = role;
      }

      await updateDoc(doc(db, 'users', auth.currentUser.uid), updates);
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${auth.currentUser.uid}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRedeem = async () => {
    if (!auth.currentUser || !redeemCode.trim() || redeemLoading) return;
    setRedeemLoading(true);
    try {
      const code = redeemCode.trim().toLowerCase();
      if (code === referralCode.toLowerCase()) {
        alert('আপনি নিজের কোড ব্যবহার করতে পারবেন না।');
        return;
      }

      const q = query(collection(db, 'users'), where('referralCode', '==', code), limit(1));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        alert('কোডটি সঠিক নয়।');
        return;
      }

      const referrerDoc = querySnapshot.docs[0];
      const referrerUid = referrerDoc.id;

      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', auth.currentUser!.uid);
        const referrerRef = doc(db, 'users', referrerUid);

        // Verify again inside transaction that user hasn't been referred yet
        const userSnap = await transaction.get(userRef);
        if (userSnap.data()?.referredBy) {
          throw new Error('আপনি ইতিপূর্বে একটি কোড ব্যবহার করেছেন।');
        }

        transaction.update(referrerRef, {
          balance: increment(20)
        });

        transaction.update(userRef, {
          referredBy: referrerUid
        });
      });

      setReferredBy(referrerUid);
      alert('সফলভাবে কোডটি ব্যবহার করা হয়েছে!');
    } catch (error: any) {
      console.error('Redeem Error:', error);
      alert(error.message || 'ব্যর্থ হয়েছে।');
    } finally {
      setRedeemLoading(false);
    }
  };

  const togglePref = (key: keyof typeof notificationPrefs) => {
    setNotificationPrefs(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
      />
      
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="relative w-full max-w-lg bg-[#151d2c] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl flex flex-col"
      >
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-qx-up/20 flex items-center justify-center text-qx-up">
              <User size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white">আপনার প্রোফাইল</h3>
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mt-1">ব্যক্তিগত তথ্য আপডেট করুন</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl text-white/20 hover:text-white transition-all">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-8 overflow-y-auto max-h-[70vh] custom-scrollbar">
          {/* Avatar Selection */}
          <div className="flex flex-col gap-4">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 flex items-center gap-2">
              <Camera size={14} className="text-qx-up" /> প্রোফাইল ছবি পছন্দ করুন
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
              {AVATARS.map((url, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedAvatar(url)}
                  className={`relative aspect-square rounded-2xl overflow-hidden border-2 transition-all group ${
                    selectedAvatar === url ? 'border-qx-up scale-95 shadow-[0_0_15px_rgba(0,185,122,0.3)]' : 'border-white/5 hover:border-white/20'
                  }`}
                >
                  <img src={url} alt={`Avatar ${i}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  {selectedAvatar === url && (
                    <div className="absolute inset-0 bg-qx-up/20 flex items-center justify-center">
                      <div className="w-6 h-6 rounded-full bg-qx-up text-white flex items-center justify-center shadow-lg">
                        <Check size={14} strokeWidth={4} />
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex flex-col gap-6">
              {/* Name */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 flex items-center gap-2">
                  <User size={14} className="text-qx-up" /> আপনার নাম
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="আপনার নাম লিখুন"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-bold text-sm outline-none focus:border-qx-up/50 focus:bg-white/10 transition-all placeholder:text-white/10 shadow-inner"
                  />
                </div>
              </div>

              {/* Referral System */}
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 flex items-center gap-2">
                    <Share2 size={14} className="text-qx-up" /> আপনার রেফারেল কোড
                  </label>
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between group">
                    <div className="flex flex-col">
                      <span className="text-xs font-mono font-black text-white uppercase tracking-widest">{referralCode || 'GENERATING...'}</span>
                      <span className="text-[8px] font-bold text-emerald-400/60 uppercase tracking-widest mt-1">প্রতিটি রেফারে পাবেন ২০ টাকা</span>
                    </div>
                    <button 
                      onClick={handleCopyCode}
                      className={`p-2 rounded-xl transition-all ${copied ? 'bg-emerald-500 text-white' : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'}`}
                    >
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>

                {!referredBy ? (
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 flex items-center gap-2">
                      <Users size={14} className="text-blue-400" /> রেফার কোড ব্যবহার করুন
                    </label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={redeemCode}
                        onChange={(e) => setRedeemCode(e.target.value)}
                        placeholder="ENTER CODE"
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-xs focus:border-blue-500/50 outline-none transition-all"
                      />
                      <button 
                        onClick={handleRedeem}
                        disabled={redeemLoading || !redeemCode.trim()}
                        className="bg-blue-500 hover:bg-blue-400 disabled:opacity-50 text-white px-6 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                      >
                        {redeemLoading ? '...' : 'REDEEM'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 opacity-50">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">আপনি সফলভাবে রেফার করা হয়েছেন</label>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center text-[10px] text-white/40 font-mono italic">
                      Joined via referral system
                    </div>
                  </div>
                )}
              </div>

              {/* Role Management (Admin Only) */}
              {isAdmin && (
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 flex items-center gap-2">
                    <Shield size={14} className="text-qx-up" /> অ্যাকাউন্ট রোল
                  </label>
                  <div className="flex gap-2">
                    {['user', 'admin'].map((r) => (
                      <button
                        key={r}
                        onClick={() => setRole(r)}
                        className={`flex-1 py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${
                          role === r 
                            ? 'bg-qx-up/20 border-qx-up text-qx-up shadow-[0_0_10px_rgba(0,185,122,0.2)]' 
                            : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-4">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 flex items-center gap-2">
                <Bell size={14} className="text-qx-up" /> নোটিফিকেশন সেটিংস
              </label>
              <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                <div className="p-4 flex flex-col gap-4">
                  {[
                    { key: 'tradeAlerts', label: 'ট্রেড অ্যালার্ট', desc: 'ট্রেড শেষ হলে নোটিফিকেশন পান' },
                    { key: 'depositNews', label: 'ডিপোজিট আপডেট', desc: 'ডিপোজিট সফল হলে খবর পান' },
                    { key: 'systemUpdates', label: 'সিস্টেম নতুন ফিচার', desc: 'নতুন আপডেট সম্পর্কে জানুন' }
                  ].map((pref) => (
                    <button
                      key={pref.key}
                      onClick={() => togglePref(pref.key as any)}
                      className="flex items-center justify-between group text-left"
                    >
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-white uppercase tracking-wider">{pref.label}</span>
                        <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest">{pref.desc}</span>
                      </div>
                      <div className={`w-10 h-5 rounded-full relative transition-all ${notificationPrefs[pref.key as keyof typeof notificationPrefs] ? 'bg-qx-up' : 'bg-white/10'}`}>
                        <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${notificationPrefs[pref.key as keyof typeof notificationPrefs] ? 'left-6' : 'left-1'}`} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 bg-black/20 mt-auto flex flex-col gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-qx-up text-white py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-lg shadow-qx-up/20 hover:shadow-qx-up/30 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <Save size={18} />
            )}
            তথ্য সংরক্ষণ করুন
          </button>
          
          <button
            onClick={() => {
              auth.signOut();
              onClose();
            }}
            className="w-full bg-qx-down/10 text-qx-down py-3 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] border border-qx-down/10 hover:bg-qx-down/20 transition-all flex items-center justify-center gap-2"
          >
            লগআউট করুন
          </button>
        </div>
      </motion.div>
    </div>
  );
}

