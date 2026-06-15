import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDZcgKpflk-A5d1CISbCZlAJANKgmSeYnc",
  authDomain: "autofill-forms-93b40.firebaseapp.com",
  projectId: "autofill-forms-93b40",
  storageBucket: "autofill-forms-93b40.firebasestorage.app",
  messagingSenderId: "722228471038",
  appId: "1:722228471038:web:65aca2464d18cb79ee31af"
};

const app = initializeApp(firebaseConfig);

// getAuth uses localStorage in the popup context (normal browser page — works fine).
// The background service worker has its own bundle that sets IndexedDB persistence separately.
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
