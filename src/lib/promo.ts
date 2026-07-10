// filepath: src/lib/promo.ts
// Іске қосу науқанының ЖАҺАНДЫҚ санауышы — Firestore `config/promo` құжаты.
//
// Логика: админ ЖАҢА мектепке (бұрын ақылы тарифі болмаған аккаунтқа) ақылы
// тариф қосқанда санауыш +1 (setUserPlan → countPromoActivation). Санауыш
// LAUNCH_PROMO.seats-ке жеткенде акция сайтта автоматты өшеді — баннер мен
// жеңілдік бағалар жоғалып, толық баға көрсетіледі. Бір аккаунт тек 1 рет
// саналады (users/{uid}.promoCounted белгісі) — тарифті ұзарту/ауыстыру
// орын жемейді.
//
// Тұрақтылық: Firestore оқылмаса (ережелер/желі) — акция статикалық қосқыш
// бойынша көрсетіле береді; санауыш жазылмаса — қате тек консольда, акцияны
// plans.ts-те қолмен өшіруге әрқашан болады.
import { useEffect, useState } from "react";
import { doc, getDoc, runTransaction } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { LAUNCH_PROMO } from "@/lib/plans";

export interface PromoState {
  active: boolean;  // акция әлі жүріп жатыр ма (қосқыш ЖӘНЕ орын бар)
  used: number;     // қанша орын қолданылды
  seats: number;
  percent: number;
}

const staticState = (): PromoState => ({
  active: LAUNCH_PROMO.active, used: 0,
  seats: LAUNCH_PROMO.seats, percent: LAUNCH_PROMO.percent,
});

export async function getPromoState(): Promise<PromoState> {
  const base = staticState();
  if (!base.active) return base;
  const db = getDb();
  if (!db) return base;
  try {
    const snap = await getDoc(doc(db, "config", "promo"));
    const used = snap.exists() ? Number(snap.data().used) || 0 : 0;
    return { ...base, used, active: used < base.seats };
  } catch {
    return base; // оқу мүмкін болмаса — акция көрсетіле береді
  }
}

// Админ ақылы тариф қосқанда шақырылады (roles.ts → setUserPlan).
// Транзакция: пайдаланушы бұрын саналмаған болса ғана санауыш +1.
export async function countPromoActivation(uid: string): Promise<void> {
  const db = getDb();
  if (!db || !LAUNCH_PROMO.active) return;
  try {
    await runTransaction(db, async (tx) => {
      const userRef = doc(db, "users", uid);
      const promoRef = doc(db, "config", "promo");
      const userSnap = await tx.get(userRef);
      const promoSnap = await tx.get(promoRef);
      if (!userSnap.exists() || userSnap.data().promoCounted) return;
      const used = promoSnap.exists() ? Number(promoSnap.data()!.used) || 0 : 0;
      tx.set(promoRef, { used: used + 1 }, { merge: true });
      tx.update(userRef, { promoCounted: true });
    });
  } catch (e) {
    console.error("Промо санауыш қатесі:", e); // акция қолмен де өшіріледі — тоқтатпаймыз
  }
}

// Баға беттері үшін хук: алдымен статикалық күй, сосын бұлттағы санауышпен нақтыланады
export function usePromo(): PromoState {
  const [state, setState] = useState<PromoState>(staticState);
  useEffect(() => { getPromoState().then(setState); }, []);
  return state;
}
