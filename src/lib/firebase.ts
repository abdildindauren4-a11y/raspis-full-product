// filepath: src/lib/firebase.ts
// Firebase қосылымы.
// Кілттер .env файлдан оқылады; егер ол болмаса (мысалы Vercel деплойда),
// төмендегі тікелей мәндер қолданылады (fallback).
// Firebase apiKey ашық болуға арналған — қауіпсіздік Firestore ережелерімен.
import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

// Тікелей кілттер (fallback) — .env болмаса осылар қолданылады.
const FALLBACK = {
  apiKey: "AIzaSyDQWKuR0t_TjIubkVg6M9xkgvloxCE54ac",
  authDomain: "petya-4cb94.firebaseapp.com",
  projectId: "petya-4cb94",
  storageBucket: "petya-4cb94.firebasestorage.app",
  messagingSenderId: "857856091046",
  appId: "1:857856091046:web:57e206beae4fd04e276567",
};

// .env болса оны, болмаса fallback-ті қолданамыз
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || FALLBACK.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || FALLBACK.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || FALLBACK.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || FALLBACK.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || FALLBACK.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || FALLBACK.appId,
};

// Firebase қосулы ма (кілттер бар ма) — тексеру
export const isFirebaseConfigured = (): boolean =>
  Boolean(config.apiKey && config.projectId && config.appId);

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;

// Firebase-ті бір рет іске қосу (кілттер болса ғана)
function ensureInit(): boolean {
  if (!isFirebaseConfigured()) return false;
  if (!app) {
    app = initializeApp(config);
    authInstance = getAuth(app);
    dbInstance = getFirestore(app);
  }
  return true;
}

export function getFirebaseAuth(): Auth | null {
  return ensureInit() ? authInstance : null;
}

export function getDb(): Firestore | null {
  return ensureInit() ? dbInstance : null;
}

export const googleProvider = new GoogleAuthProvider();
