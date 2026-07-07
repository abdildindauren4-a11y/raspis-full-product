// filepath: src/lib/roles.ts
// Пайдаланушы рөлдері (панель қолжетімділігі) мен тарифтік квоталар — бұлтта (Firestore) сақталады.
// users/{userId} құжатында: рөл (admin/paid/free — тек әкімші панелі үшін) және
// тариф (free/pro/premium/super — генерация квотасы үшін) бірге сақталады.
import { doc, getDoc, setDoc, collection, getDocs, runTransaction } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { PLANS, type PlanId } from "@/lib/plans";

// ── Рөлдер (тек әкімші панелі қолжетімділігі үшін) ──
export type Role = "admin" | "paid" | "free";

// Әкімші email-дері — бұлар әрқашан admin (бірінші кіргенде автоматты).
export const ADMIN_EMAILS = ["abdildindauren4@gmail.com"];

// ── Пайдаланушы жазбасы (бұлтта) ──
export interface UserRecord {
  uid: string;
  email: string;
  name: string;
  role: Role;
  plan: PlanId;
  quickRemaining: number;
  deepRemaining: number;
  createdAt: number;
  lastSeen: number;
}

// Тариф өрістері жоқ ескі жазбаларды free тарифпен толықтырады (миграция)
function withPlanDefaults(rec: UserRecord): UserRecord {
  return {
    ...rec,
    plan: rec.plan ?? "free",
    quickRemaining: rec.quickRemaining ?? 0,
    deepRemaining: rec.deepRemaining ?? 0,
  };
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
      // бар пайдаланушы — lastSeen жаңартамыз (рөл мен тарифті сақтаймыз)
      const existing = withPlanDefaults(snap.data() as UserRecord);
      const role = isAdmin ? "admin" : existing.role; // админ email әрқашан admin
      const updated: UserRecord = { ...existing, name, role, lastSeen: Date.now() };
      await setDoc(ref, updated);
      return updated;
    } else {
      // жаңа пайдаланушы — free тарифпен басталады
      const plan = PLANS.free;
      const rec: UserRecord = {
        uid, email, name,
        role: isAdmin ? "admin" : "free",
        plan: plan.id, quickRemaining: plan.quickGenerations, deepRemaining: plan.deepSearches,
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
    return snap.exists() ? withPlanDefaults(snap.data() as UserRecord) : null;
  } catch {
    return null;
  }
}

// ── Генерация квотасы ──
export type GenerationKind = "quick" | "deep";

// Генерация квотасын атомды тексеру+тұтыну (жарыс жағдайын болдырмау үшін транзакция).
// Admin — әрқашан шексіз. Firestore қосылмаса — бұғаттамаймыз (локал/офлайн режим).
export async function consumeGeneration(uid: string, kind: GenerationKind): Promise<{ ok: boolean; remaining: number }> {
  const db = getDb();
  if (!db) return { ok: true, remaining: Infinity };
  const field = kind === "quick" ? "quickRemaining" : "deepRemaining";
  try {
    return await runTransaction(db, async (tx) => {
      const ref = doc(db, "users", uid);
      const snap = await tx.get(ref);
      if (!snap.exists()) return { ok: true, remaining: Infinity };
      const data = withPlanDefaults(snap.data() as UserRecord);
      if (data.role === "admin") return { ok: true, remaining: Infinity };
      const current = data[field];
      if (current <= 0) return { ok: false, remaining: 0 };
      const next = current - 1;
      tx.update(ref, { [field]: next });
      return { ok: true, remaining: next };
    });
  } catch (e) {
    console.error("Квота тұтыну қатесі:", e);
    return { ok: true, remaining: Infinity }; // қате кезінде пайдаланушыны бұғаттамаймыз
  }
}

// ── Админ функциялары ──
// Барлық пайдаланушыны алу (тек админ үшін)
export async function getAllUsers(): Promise<UserRecord[]> {
  const db = getDb();
  if (!db) return [];
  try {
    const snap = await getDocs(collection(db, "users"));
    return snap.docs.map((d) => withPlanDefaults(d.data() as UserRecord)).sort((a, b) => b.createdAt - a.createdAt);
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

// Пайдаланушы тарифін өзгерту — квотаны сол тарифтің толық мөлшеріне қалпына келтіреді (тек админ)
export async function setUserPlan(uid: string, plan: PlanId): Promise<boolean> {
  const db = getDb();
  if (!db) return false;
  try {
    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return false;
    const limits = PLANS[plan];
    await setDoc(ref, {
      ...snap.data(), plan,
      quickRemaining: limits.quickGenerations, deepRemaining: limits.deepSearches,
    });
    return true;
  } catch {
    return false;
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
    await setDoc(doc(db, "config", "selfRole"), { enabled }, { merge: true });
    return true;
  } catch (e) {
    console.error("«Өзіне рөл алу» қосқышын сақтау қатесі:", e);
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
      // жазба жоқ — жаңасын жасаймыз (free тарифпен)
      const plan = PLANS.free;
      const rec: UserRecord = {
        uid, email, name: name || "Пайдаланушы", role,
        plan: plan.id, quickRemaining: plan.quickGenerations, deepRemaining: plan.deepSearches,
        createdAt: Date.now(), lastSeen: Date.now(),
      };
      await setDoc(ref, rec);
    }
    return true;
  } catch {
    return false;
  }
}
