/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import AdminPanel from './components/AdminPanel';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './lib/firebase';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Sync user with Firestore
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
          // New user signup
          const isLimonAdmin = user.email === 'limon2581444@gmail.com' || user.email === 'limon258144@gmail.com' || user.email === 'limon0000@admin.local'; 
          await setDoc(userRef, {
            uid: user.uid,
            email: user.email,
            role: isLimonAdmin ? 'admin' : 'user',
            balance: 0,
            referralCode: user.uid.substring(0, 8).toLowerCase(),
            createdAt: serverTimestamp()
          });
          setIsAdmin(isLimonAdmin);
        } else {
          // Check if it's the admin email even if already exists
          const data = userSnap.data();
          const isLimonAdmin = user.email === 'limon2581444@gmail.com' || user.email === 'limon258144@gmail.com' || user.email === 'limon0000@admin.local';
          setIsAdmin(isLimonAdmin || data.role === 'admin');
          
          // Ensure existing user has a referral code
          if (!data.referralCode) {
            await setDoc(userRef, {
              referralCode: user.uid.substring(0, 8).toLowerCase()
            }, { merge: true });
          }
        }
        
        setIsLoggedIn(true);
      } else {
        setIsLoggedIn(false);
        setIsAdmin(false);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0B0E11] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0E11]">
      {isLoggedIn ? (
        <>
          <Dashboard 
            onLogout={() => auth.signOut()} 
            isAdmin={isAdmin}
            onOpenAdmin={() => setShowAdminPanel(true)}
          />
          {showAdminPanel && isAdmin && (
            <AdminPanel onClose={() => setShowAdminPanel(false)} />
          )}
        </>
      ) : (
        <Login />
      )}
    </div>
  );
}
