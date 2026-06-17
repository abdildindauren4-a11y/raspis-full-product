// filepath: src/lib/firebase.ts
import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const config = {
  apiKey: "AIzaSyADPiGZ3LgDXrVrNzioB5smQulMJxZjY-8",
  authDomain: "gen-lang-client-0603462845.firebaseapp.com",
  projectId: "gen-lang-client-0603462845",
  storageBucket: "gen-lang-client-0603462845.firebasestorage.app",
  messagingSenderId: "351331881464",
  appId: "1:351331881464:web:ed7b4ab707d72cfbcf060d"
};

// Firebase қосулы ма — тексеру
export const isFirebaseConfigured = (): boolean =>
  Boolean(config.apiKey && config.projectId && config.appId);

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;

// Firebase-ті іске қосу
function ensureInit(): boolean {
  if (!app) {
    try {
      app = initializeApp(config);
      authInstance = getAuth(app);
      dbInstance = getFirestore(app);
    } catch (error) {
      console.error("Firebase initialization error:", error);
      return false;
    }
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
