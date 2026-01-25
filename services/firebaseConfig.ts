import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// --- CONFIGURACIÓN DE FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyCBXnKIFJVY6wKyj-GG10aBLtiff9bp6Ds",
  authDomain: "estudioapp-97489.firebaseapp.com",
  projectId: "estudioapp-97489",
  storageBucket: "estudioapp-97489.firebasestorage.app",
  messagingSenderId: "723654706004",
  appId: "1:723654706004:web:0d0cd758c8cafb5366fec1"
};

// Initialize Firebase (Singleton pattern)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();