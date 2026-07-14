// filepath: src/lib/roles.ts
// Пайдаланушы рөлдері (панель қолжетімділігі) мен тарифтік квоталар — бұлтта (Firestore) сақталады.
// users/{userId} құжатында: рөл (admin/paid/free — тек әкімші панелі үшін) және
// тариф (free/pro/premium/super — генерация квотасы үшін) бірге сақталады.
import { doc, getDoc, setDoc, collection, getDocs, runTransaction } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { PLANS, DATA_ENTRY_WINDOW_MS, type PlanId } from "@/lib/plans";
import { countPromoActivation } from "@/lib/promo";
import type { DataFingerprint, SwapAlert } from "@/lib/antiResale";

// ── Рөлдер ──
// admin — бәріне шексіз рұқсат; demo — сатушының көрсетілім аккаунты
// (генерация мен экспорт шексіз; деректер енгізу әдепкіде жабық, бірақ
// сатушы білетін код арқылы сессия ішінде уақытша ашылады — src/lib/demoCode.ts);
// paid/free — қарапайым.
export type Role = "admin" | "paid" | "free" | "demo";

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
  planExpiresAt?: number;   // тариф мерзімінің соңы (6 ай); өткенде free-ге қайтады
  dataEntryUntil?: number;  // деректер енгізу панелі ашық тұратын мерзім (7 күн терезе)
  promoCounted?: boolean;   // іске қосу акциясы санауышында есептелген бе (lib/promo.ts)
  fingerprint?: DataFingerprint;   // дерек «саусақ ізі» — қайта сату бақылауы (lib/antiResale.ts)
  swapAlert?: SwapAlert | null;    // деректер түбегейлі ауысқандағы күдікті белгі
  createdAt: number;
  lastSeen: number;
}

// Тариф өрістері жоқ ескі жазбаларды free тарифпен толықтырады (миграция)
// және мерзімі өткен тарифті free-ге түсіреді.
function withPlanDefaults(rec: UserRecord): UserRecord {
  const r: UserRecord = {
    ...rec,
    plan: rec.plan ?? "free",
    quickRemaining: rec.quickRemaining ?? 0,
    deepRemaining: rec.deepRemaining ?? 0,
  };
  if (r.plan !== "free" && r.planExpiresAt && Date.now() > r.planExpiresAt) {
    return { ...r, plan: "free", quickRemaining: 0, deepRemaining: 0 };
  }
  return r;
}

// Деректер енгізу панелі ашық па (сыныптар/мұғалімдер/кабинеттер/пәндер/импорт).
// Деректер енгізу шектеусіз: тегін де, тарифті де кез келген уақытта мектеп
// деректерін енгізе/өзгерте алады (бұрынғы 7 күндік терезе алынды). Қайта
// сатудан қорғау енді тек «деректер толық ауысқанда» ескерту (antiResale)
// арқылы жасалады. Демо рөлі — сатушының көрсету құралы, тек код арқылы ашық.
export function canEditData(role: Role, _record: UserRecord | null): boolean {
  if (role === "demo") return false;
  return true;
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
// Admin/demo — шексіз. Firestore мүлдем қосылмаса ғана (локал әзірлеу) ашық;
// қалған барлық сәтсіздік (жазба жоқ, ережелер тыйым салды, желі қатесі) —
// ЖАБЫҚ, әйтпесе тарифсіз шексіз генерацияға тесік ашылады.
export async function consumeGeneration(uid: string, kind: GenerationKind): Promise<{ ok: boolean; remaining: number }> {
  const db = getDb();
  if (!db) return { ok: true, remaining: Infinity };
  const field = kind === "quick" ? "quickRemaining" : "deepRemaining";
  try {
    return await runTransaction(db, async (tx) => {
      const ref = doc(db, "users", uid);
      const snap = await tx.get(ref);
      if (!snap.exists()) return { ok: false, remaining: 0 }; // жазба жоқ — қайта кіру қажет
      const data = withPlanDefaults(snap.data() as UserRecord);
      if (data.role === "admin" || data.role === "demo") return { ok: true, remaining: Infinity };
      const current = data[field];
      if (current <= 0) return { ok: false, remaining: 0 };
      const next = current - 1;
      tx.update(ref, { [field]: next });
      return { ok: true, remaining: next };
    });
  } catch (e) {
    console.error("Квота тұтыну қатесі:", e);
    return { ok: false, remaining: 0 };
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

// Пайдаланушы тарифін өзгерту (тек админ) — квота толады, 6 айлық мерзім және
// деректер енгізудің 7 күндік терезесі басталады.
export async function setUserPlan(uid: string, plan: PlanId): Promise<boolean> {
  const db = getDb();
  if (!db) return false;
  try {
    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return false;
    const limits = PLANS[plan];
    const paid = plan !== "free";
    await setDoc(ref, {
      ...snap.data(), plan,
      quickRemaining: limits.quickGenerations, deepRemaining: limits.deepSearches,
      planExpiresAt: paid ? Date.now() + limits.durationMs : 0,
      dataEntryUntil: paid ? Date.now() + DATA_ENTRY_WINDOW_MS : 0,
    });
    // Іске қосу акциясы: жаңа мектеп ақылы тарифке қосылды — санауыш +1
    // (бір uid тек 1 рет саналады; seats толғанда акция автоматты өшеді)
    if (paid) await countPromoActivation(uid);
    return true;
  } catch {
    return false;
  }
}

// Деректер енгізу панелін қосымша мерзімге ашу (тек админ, WhatsApp сұранысынан кейін)
export async function extendDataEntry(uid: string, days = 7): Promise<boolean> {
  const db = getDb();
  if (!db) return false;
  try {
    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return false;
    await setDoc(ref, { ...snap.data(), dataEntryUntil: Date.now() + days * 24 * 60 * 60 * 1000 });
    return true;
  } catch {
    return false;
  }
}
