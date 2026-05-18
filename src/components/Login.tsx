import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, Lock, ArrowRight, Github, Chrome, AlertCircle, Users } from 'lucide-react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp, runTransaction, query, collection, where, getDocs, increment, limit } from 'firebase/firestore';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    // Special cases from user request
    let finalEmail = email;
    if (email === 'limon2581444' || email === 'limon258144') {
      finalEmail = 'limon258144@gmail.com';
    } else if (email === 'limon0000') {
      finalEmail = 'limon0000@admin.local';
    } else if (!email.includes('@')) {
      finalEmail = `${email}@example.com`;
    }

    try {
      if (isRegistering) {
        // Register User
        const userCredential = await createUserWithEmailAndPassword(auth, finalEmail, password);
        const user = userCredential.user;

        // Start Profile Transaction
        await runTransaction(db, async (transaction) => {
          const userRef = doc(db, 'users', user.uid);
          const isLimonAdmin = user.email === 'limon258144@gmail.com' || user.email === 'limon0000@admin.local';
          
          let referrerUid = null;
          
          // Check for valid referral
          if (referralCode.trim()) {
            const q = query(collection(db, 'users'), where('referralCode', '==', referralCode.trim().toLowerCase()), limit(1));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
              const referrerDoc = querySnapshot.docs[0];
              referrerUid = referrerDoc.id;
              
              // Credit the referrer 20 TK
              const referrerRef = doc(db, 'users', referrerUid);
              transaction.update(referrerRef, {
                balance: increment(20)
              });
            }
          }

          // Create New User Profile
          transaction.set(userRef, {
            uid: user.uid,
            email: user.email,
            role: isLimonAdmin ? 'admin' : 'user',
            balance: 0,
            referralCode: user.uid.substring(0, 8).toLowerCase(),
            referredBy: referrerUid,
            createdAt: serverTimestamp()
          });
        });
      } else {
        await signInWithEmailAndPassword(auth, finalEmail, password);
      }
    } catch (err: any) {
      console.error('Login Error:', err);
      // Robustly extract the error code
      let code = err.code || '';
      if (!code && err.message) {
        const matches = err.message.match(/auth\/[a-z-]+/);
        if (matches) code = matches[0];
      }
      
      const message = err.message || '';
      
      // Detailed Bengali Error Mapping
      if (code === 'auth/email-already-in-use') {
        setError('এই ইমেইলটি ইতিপূর্বে ব্যবহার করা হয়েছে। দয়া করে লগইন করুন।');
        setIsRegistering(false);
      } else if (code === 'auth/invalid-credential' || code === 'auth/user-not-found' || code === 'auth/wrong-password') {
        if (isRegistering) {
          setError('রেজিস্ট্রেশন ব্যর্থ হয়েছে। ইমেইলটি সঠিক কিনা দেখুন।');
        } else {
          const isLimon = email.toLowerCase().includes('limon');
          if (isLimon) {
            setError('লগইন ব্যর্থ: লিমোন অ্যাকাউন্টের পাসওয়ার্ড ভুল অথবা অ্যাকাউন্টটি এখনও তৈরি করা হয়নি। আপনি যদি নতুন হয়ে থাকেন, তবে আগে "ফ্রি অ্যাকাউন্ট খুলুন" বাটনে ক্লিক করে সঠিক পাসওয়ার্ড দিয়ে সাইন-আপ করুন।');
          } else {
            setError('লগইন ব্যর্থ: আপনার ইমেইল অথবা পাসওয়ার্ড সঠিক নয়। আপনি কি নতুন অ্যাকাউন্ট খুলতে চান?');
          }
          if (code === 'auth/user-not-found') setIsRegistering(true);
        }
      } else if (code === 'auth/weak-password') {
        setError('পাসওয়ার্ড অন্তত ৬ অক্ষরের হতে হবে।');
      } else if (code === 'auth/invalid-email') {
        setError('ইমেইলটি সঠিক নয়। দয়া করে সঠিক ইমেইল দিন।');
      } else if (code === 'auth/too-many-requests') {
        setError('অতিরিক্ত ভুল চেষ্টার কারণে আপনার অ্যাকাউন্ট সাময়িকভাবে বন্ধ হয়েছে। কিছুক্ষণ পর চেষ্টা করুন।');
      } else {
        setError(`একটি সমস্যা হয়েছে: ${code || message}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error('Google Login Error:', err);
      let code = err.code || '';
      if (!code && err.message) {
        const matches = err.message.match(/auth\/[a-z-]+/);
        if (matches) code = matches[0];
      }
      
      if (code === 'auth/popup-closed-by-user') {
        setError('লগইন উইন্ডোটি বন্ধ করে দেওয়া হয়েছে।');
      } else if (code === 'auth/cancelled-by-user') {
        setError('লগইন বাতিল করা হয়েছে।');
      } else {
        setError(`গুগল লগইন ব্যর্থ হয়েছে: ${code || err.message}`);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0E11] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px]" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md z-10"
      >
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500 mb-6 shadow-xl shadow-emerald-500/20">
            <span className="text-white font-black text-2xl">QX</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
            {isRegistering ? 'অ্যাকাউন্ট তৈরি করুন' : 'স্বাগতম'}
          </h1>
          <p className="text-white/40 text-sm">প্রফেশনাল বাইনারি অপশন ট্রেডিং</p>
        </div>

        <div className="bg-[#161A1E] p-8 rounded-3xl border border-white/5 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center gap-3 text-red-400 text-xs">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] text-white/40 font-mono uppercase tracking-widest ml-1">ইমেইল অথবা ইউজারনেম</label>
              <div className="relative">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                <input 
                  type="text" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="limon258144"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-emerald-500/50 transition-all placeholder:text-white/10"
                />
              </div>
              {email.toLowerCase().startsWith('limon') && (
                <p className="text-[9px] text-emerald-400/60 ml-1 font-medium italic">
                  Special Limon Admin login detected
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-[10px] text-white/40 font-mono uppercase tracking-widest">পাসওয়ার্ড</label>
                {!isRegistering && (
                  <button type="button" className="text-[10px] text-emerald-400 font-mono uppercase tracking-widest hover:text-emerald-300 transition-colors">ভুলে গেছেন?</button>
                )}
              </div>
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-emerald-500/50 transition-all placeholder:text-white/10"
                />
              </div>
            </div>

            {isRegistering && (
              <div className="space-y-2">
                <label className="text-[10px] text-white/40 font-mono uppercase tracking-widest ml-1">রেফার কোড (২০ টাকা বোনাস)</label>
                <div className="relative">
                  <Users size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                  <input 
                    type="text" 
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value)}
                    placeholder="ENTER CODE HERE"
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-4 text-white font-mono focus:outline-none focus:border-emerald-500/50 transition-all placeholder:text-white/10 font-bold"
                  />
                </div>
              </div>
            )}

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              disabled={isSubmitting}
              type="submit"
              className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  {isRegistering ? 'সাইন আপ' : 'সাইন ইন'} <ArrowRight size={18} />
                </>
              )}
            </motion.button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/5"></div>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-widest">
              <span className="bg-[#161A1E] px-4 text-white/20">অথবা লগইন করুন</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={handleGoogleLogin}
              className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white py-3 rounded-xl transition-all"
            >
              <Chrome size={18} /> <span className="text-xs font-bold">Google</span>
            </button>
            <button className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white py-3 rounded-xl transition-all">
              <Github size={18} /> <span className="text-xs font-bold">GitHub</span>
            </button>
          </div>
        </div>

        <div className="text-center mt-8 relative">
          <p className="text-white/30 text-xs text-balance">
            {isRegistering ? 'ইতিমধ্যেই অ্যাকাউন্ট আছে?' : "কোনো অ্যাকাউন্ট নেই?"} <button 
              type="button"
              onClick={() => setIsRegistering(!isRegistering)}
              className="text-emerald-400 font-bold hover:underline"
            >
              {isRegistering ? 'সাইন ইন করুন' : 'ফ্রি অ্যাকাউন্ট খুলুন'}
            </button>
          </p>
          
          {/* Admin shortcut */}
          <button 
            type="button"
            onClick={() => {
              setEmail('limon258144');
              setPassword('limon0000');
              setIsRegistering(false);
            }}
            className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[10px] text-white/10 hover:text-emerald-500 transition-all cursor-pointer font-bold uppercase tracking-widest px-4 py-2 border border-white/5 rounded-full hover:border-emerald-500/30"
          >
            Admin Panel Login
          </button>
        </div>
      </motion.div>
    </div>
  );
}
