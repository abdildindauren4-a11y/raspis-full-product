// filepath: src/lib/firebase.ts
// Firebase қосылымы — конфиг .env файлынан оқылады (қауіпсіз).
// Кілттерді .env файлға қою керек (.env.example үлгісін қараңыз).
import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
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
