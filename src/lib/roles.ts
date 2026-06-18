// filepath: src/lib/roles.ts
// Рөлдер мен рұқсаттар жүйесі — бұлтта (Firestore) сақталады.
// users/{userId} құжатында рөл сақталады. Әр функцияға деңгей бойынша рұқсат.
import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore";
import { getDb } from "@/lib/firebase";

// ── Рөлдер ──
export type Role = "admin" | "paid" | "free";

// Әкімші email-дері — бұлар әрқашан admin (бірінші кіргенде автоматты).
export const ADMIN_EMAILS = ["abdildindauren4@gmail.com"];

// ── Функцияларға рұқсат деңгейлері ──
// Әр функция қай рөлден бастап қолжетімді.
export type Feature =
  | "generate"        // кесте генерациясы
  | "deepSearch"      // терең іздеу (көп нұсқа)
  | "softMode"        // жұмсақ режим
  | "excelExport"     // Excel экспорт
  | "excelImport"     // Excel импорт
  | "aiAdvisor"       // РАСПИС AI
  | "cloudSync"       // бұлттық сақтау
  | "unlimitedClasses"; // шектеусіз сынып саны

// Рұқсат матрицасы — әдепкі (админ кейін өзгерте алады)
export const DEFAULT_PERMISSIONS: Record<Feature, Role> = {
  generate: "free",          // тегін: негізгі генерация
  excelExport: "free",       // тегін: Excel жүктеу
  cloudSync: "free",         // тегін: бұлттық сақтау
  excelImport: "paid",       // ақылы: Excel импорт
  deepSearch: "paid",        // ақылы: терең іздеу
  softMode: "paid",          // ақылы: жұмсақ режим
  aiAdvisor: "paid",         // ақылы: AI кеңесші
  unlimitedClasses: "paid",  // ақылы: шектеусіз сынып
};

// Рөл иерархиясы: admin > paid > free
const ROLE_LEVEL: Record<Role, number> = { admin: 3, paid: 2, free: 1 };

// Пайдаланушы рөлі функцияға жете ме
export function canUse(role: Role, feature: Feature, perms: Record<Feature, Role> = DEFAULT_PERMISSIONS): boolean {
  if (role === "admin") return true; // админ — бәріне рұқсат
  const required = perms[feature] || "free";
  return ROLE_LEVEL[role] >= ROLE_LEVEL[required];
}

// ── Пайдаланушы жазбасы (бұлтта) ──
export interface UserRecord {
  uid: string;
  email: string;
  name: string;
  role: Role;
  createdAt: number;
  lastSeen: number;
}

// Пайдаланушыны тіркеу/жаңарту (кірген сайын шақырылады)
export async function registerUser(uid: string, email: string, name: string): Promise<UserRecord | null> {
  const db = getDb();
  if (!db) return null;
  try {
    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);
    const isAdmin = ADMIN_EMAILS.includes(email.toLowerCase());

    if (snap.exists()) {
      // бар пайдаланушы — lastSeen жаңартамыз (рөлді сақтаймыз)
      const existing = snap.data() as UserRecord;
      const role = isAdmin ? "admin" : existing.role; // админ email әрқашан admin
      const updated: UserRecord = { ...existing, name, role, lastSeen: Date.now() };
      await setDoc(ref, updated);
      return updated;
    } else {
      // жаңа пайдаланушы
      const rec: UserRecord = {
        uid, email, name,
        role: isAdmin ? "admin" : "free",
        createdAt: Date.now(), lastSeen: Date.now(),
      };
      await setDoc(ref, rec);
      return rec;
    }
  } catch (e) {
    console.error("Пайдаланушыны тіркеу қатесі:", e);
    return null;
  }
}

// Пайдаланушы жазбасын оқу
export async function getUserRecord(uid: string): Promise<UserRecord | null> {
  const db = getDb();
  if (!db) return null;
  try {
    const snap = await getDoc(doc(db, "users", uid));
    return snap.exists() ? (snap.data() as UserRecord) : null;
  } catch {
    return null;
  }
}

// ── Админ функциялары ──
// Барлық пайдаланушыны алу (тек админ үшін)
export async function getAllUsers(): Promise<UserRecord[]> {
  const db = getDb();
  if (!db) return [];
  try {
    const snap = await getDocs(collection(db, "users"));
    return snap.docs.map((d) => d.data() as UserRecord).sort((a, b) => b.createdAt - a.createdAt);
  } catch (e) {
    console.error("Пайдаланушыларды оқу қатесі:", e);
    return [];
  }
}

// Пайдаланушы рөлін өзгерту (тек админ)
export async function setUserRole(uid: string, role: Role): Promise<boolean> {
  const db = getDb();
  if (!db) return false;
  try {
    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return false;
    await setDoc(ref, { ...snap.data(), role });
    return true;
  } catch {
    return false;
  }
}

// Рұқсат матрицасын бұлтқа сақтау (админ функциялар деңгейін өзгерткенде)
export async function savePermissions(perms: Record<Feature, Role>): Promise<boolean> {
  const db = getDb();
  if (!db) return false;
  try {
    await setDoc(doc(db, "config", "permissions"), perms);
    return true;
  } catch {
    return false;
  }
}

// Рұқсат матрицасын оқу (болмаса әдепкі)
export async function loadPermissions(): Promise<Record<Feature, Role>> {
  const db = getDb();
  if (!db) return DEFAULT_PERMISSIONS;
  try {
    const snap = await getDoc(doc(db, "config", "permissions"));
    return snap.exists() ? (snap.data() as Record<Feature, Role>) : DEFAULT_PERMISSIONS;
  } catch {
    return DEFAULT_PERMISSIONS;
  }
}

// ── "Өзіне рөл алу" функциясы (уақытша, бастапқы орнату үшін) ──
// Қосулы болса, кез келген кірген пайдаланушы өзіне рөл бере алады.
// Әкімші мұны жабады (қауіпсіздік үшін).
// Әдепкі: ҚОСУЛЫ (бірінші админ өзін орнату үшін). Админ жапқан соң — өшеді.

// Қосқыш күйін оқу (болмаса — қосулы деп есептейміз)
export async function loadSelfRoleEnabled(): Promise<boolean> {
  const db = getDb();
  if (!db) return true; // Firestore жоқ — әдепкі қосулы
  try {
    const snap = await getDoc(doc(db, "config", "selfRole"));
    if (!snap.exists()) return true; // әлі орнатылмаған — қосулы
    return Boolean((snap.data() as { enabled?: boolean }).enabled);
  } catch {
    return true;
  }
}

// Қосқышты өзгерту (тек админ шақырады)
export async function setSelfRoleEnabled(enabled: boolean): Promise<boolean> {
  const db = getDb();
  if (!db) return false;
  try {
    await setDoc(doc(db, "config", "selfRole"), { enabled });
    return true;
  } catch {
    return false;
  }
}

// Пайдаланушы өзіне рөл береді (тек қосқыш қосулы болса жұмыс істейді)
export async function claimRole(uid: string, role: Role, email = "", name = ""): Promise<boolean> {
  const enabled = await loadSelfRoleEnabled();
  if (!enabled) return false; // функция жабық
  const db = getDb();
  if (!db) return false;
  try {
    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      await setDoc(ref, { ...snap.data(), role });
    } else {
      // жазба жоқ — жаңасын жасаймыз
      const rec: UserRecord = { uid, email, name: name || "Пайдаланушы", role, createdAt: Date.now(), lastSeen: Date.now() };
      await setDoc(ref, rec);
    }
    return true;
  } catch {
    return false;
  }
}
