import { initializeApp } from "firebase/app";
import { initializeAuth, indexedDBLocalPersistence, onAuthStateChanged } from "firebase/auth";

// Background service workers do NOT have localStorage access.
// We must use initializeAuth + indexedDBLocalPersistence here separately
// (this is a different bundle/IIFE from popup.js — each has its own Firebase app instance).
const firebaseConfig = {
  apiKey: "AIzaSyDZcgKpflk-A5d1CISbCZlAJANKgmSeYnc",
  authDomain: "autofill-forms-93b40.firebaseapp.com",
  projectId: "autofill-forms-93b40",
  storageBucket: "autofill-forms-93b40.firebasestorage.app",
  messagingSenderId: "722228471038",
  appId: "1:722228471038:web:65aca2464d18cb79ee31af"
};

const app = initializeApp(firebaseConfig);
const auth = initializeAuth(app, {
  persistence: indexedDBLocalPersistence
});

console.log("[AutoFill][BG] Service worker started. Listening for auth state...");

onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log(`[AutoFill][BG] ✅ Auth state: signed in uid=${user.uid}`);
    chrome.storage.local.set({ isAuthenticated: true, userUid: user.uid });
  } else {
    console.log("[AutoFill][BG] ❌ Auth state: signed out");
    chrome.storage.local.set({ isAuthenticated: false, userUid: null });
  }
});
