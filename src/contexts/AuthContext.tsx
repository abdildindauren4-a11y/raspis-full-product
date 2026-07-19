// filepath: src/contexts/AuthContext.tsx
// Google аутентификация контексті — кіру, шығу, пайдаланушы күйі.
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged, type User } from "firebase/auth";
import { getFirebaseAuth, googleProvider, isFirebaseConfigured } from "@/lib/firebase";
import { registerUser, getUserRecord, ADMIN_EMAILS, type Role, type UserRecord } from "@/lib/roles";

interface AuthState {
  user: User | null;
  loading: boolean;
  configured: boolean; // Firebase кілттері қосылған ба
  role: Role;          // пайдаланушы рөлі (admin/paid/free)
  record: UserRecord | null; // толық жазба (бұлттан) — тариф пен квота осында
  refreshRecord: () => Promise<void>; // генерациядан кейін квотаны жаңарту үшін
  signInGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  error: string;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [role, setRole] = useState<Role>("free");
  const [record, setRecord] = useState<UserRecord | null>(null);
  const configured = isFirebaseConfigured();

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) { setLoading(false); return; }
    // Redirect арқылы кіру нәтижесін аяқтау (мобильде signInWithRedirect-тен кейін
    // бет Google-ден оралғанда — қатесі болса көрсетеміз; сәтті болса
    // onAuthStateChanged өзі ұстайды).
    getRedirectResult(auth).catch((e) => {
      const code = (e as { code?: string })?.code || "";
      if (code && code !== "auth/no-current-user") setError("Кіру қатесі: " + code);
    });
    // Пайдаланушы кіру/шығу күйін бақылау
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        // Әкімші email-і ӘРҚАШАН админ (Firestore жұмыс істесе де, істемесе де)
        const email = (u.email || "").toLowerCase();
        if (ADMIN_EMAILS.includes(email)) {
          setRole("admin");
        }
        // рөлін бұлттан алу/тіркеу (Firestore істесе — нақты рөл, әйтпесе жоғарыдағы)
        const rec = await registerUser(u.uid, u.email || "", u.displayName || u.email?.split("@")[0] || "Пайдаланушы");
        if (rec) { setRole(rec.role); setRecord(rec); }
        else if (ADMIN_EMAILS.includes(email)) {
          // Firestore сәтсіз, бірақ админ email — жергілікті админ жазба (шексіз квота)
          setRecord({
            uid: u.uid, email: u.email || "", name: u.displayName || "Әкімші", role: "admin",
            plan: "super", quickRemaining: Infinity, deepRemaining: Infinity,
            createdAt: Date.now(), lastSeen: Date.now(),
          });
        }
      } else {
        setRole("free"); setRecord(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  // Қатар екінші шақыруды бөгеу (қос басу → «auth/cancelled-popup-request»
  // қатесінің көзі осы еді)
  const signingIn = useRef(false);

  // БАРЛЫҚ құрылғыда POPUP БІРІНШІ. Себебі: iOS Safari (16.1+) бөтен-домен
  // authDomain-мен signInWithRedirect НӘТИЖЕСІН жүйелі бөгейді (ITP,
  // үшінші-тарап сақтау) — кіру сәтті болса да, қайтқанда пайдаланушы
  // танылмай, кіру бетіне лақтырылатын. Firebase ресми құжаты да мұндайда
  // popup қолдануды ұсынады (popup ағыны ITP-ге тәуелсіз). Popup мүлде
  // ашылмаса (қатаң блокер) ғана redirect-ке түсеміз.
  const signInGoogle = async () => {
    if (signingIn.current) return; // алдыңғы әрекет әлі жүріп жатыр
    signingIn.current = true;
    setError("");
    const auth = getFirebaseAuth();
    if (!auth) {
      setError("Firebase кілттері оқылмады. Dev серверді қайта іске қосыңыз (Ctrl+C → npm run dev).");
      signingIn.current = false;
      return;
    }
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      const code = (e as { code?: string })?.code || "";
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request")
        setError("Кіру тоқтатылды — қайта басып көріңіз");
      else if (code === "auth/network-request-failed") setError("Интернет байланысы жоқ");
      else if (code === "auth/unauthorized-domain") setError("Бұл домен Firebase-те рұқсат етілмеген");
      else if (code === "auth/popup-blocked") {
        // Popup мүлде бөгелген (қатаң блокер) — соңғы амал: redirect
        try { await signInWithRedirect(auth, googleProvider); }
        catch (e2) { setError("Кіру қатесі: " + ((e2 as { code?: string })?.code || "")); }
      }
      else setError("Кіру қатесі: " + code);
    } finally {
      signingIn.current = false;
    }
  };

  const logout = async () => {
    const auth = getFirebaseAuth();
    if (auth) await signOut(auth);
    setUser(null); setRole("free"); setRecord(null);
  };

  // Квота тұтынған соң (генерациядан кейін) жазбаны бұлттан қайта оқу
  const refreshRecord = async () => {
    if (!user) return;
    const rec = await getUserRecord(user.uid);
    if (rec) { setRecord(rec); setRole(rec.role); }
  };

  return (
    <AuthContext.Provider value={{ user, loading, configured, role, record, refreshRecord, signInGoogle, logout, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
