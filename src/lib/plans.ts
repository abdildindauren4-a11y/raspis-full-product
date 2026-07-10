// filepath: src/lib/plans.ts
// Тарифтік жоспарлар — баға, мерзім және генерация лимиттері осында анықталады.
// Жаңа тариф қосу үшін: PlanId-ге қос + PLANS-қа жазба қос (басқа жерге тиіспе).

export type PlanId = "free" | "pro" | "premium" | "super";

export interface PlanDef {
  id: PlanId;
  name: string;
  price: number;          // теңге (0 = тегін)
  durationLabel: string;  // көрсетілетін мерзім: "6 ай" / "3 жыл" / "7 жыл"
  durationMs: number;     // тариф жарамдылық мерзімі (0 = мерзімсіз)
  quickGenerations: number;
  deepSearches: number;
}

const DAY = 24 * 60 * 60 * 1000;
const YEAR = 365 * DAY;

export const PLAN_ORDER: PlanId[] = ["free", "pro", "premium", "super"];

// Тариф қосылғанда деректер енгізу панелі ашық болатын терезе (қайта сатудан қорғау)
export const DATA_ENTRY_WINDOW_MS = 7 * DAY;

export const PLANS: Record<PlanId, PlanDef> = {
  free:    { id: "free",    name: "Free",    price: 0,      durationLabel: "",      durationMs: 0,          quickGenerations: 0,   deepSearches: 0 },
  pro:     { id: "pro",     name: "Pro",     price: 49900,  durationLabel: "6 ай",  durationMs: 183 * DAY,  quickGenerations: 20,  deepSearches: 10 },
  premium: { id: "premium", name: "Premium", price: 99900,  durationLabel: "3 жыл", durationMs: 3 * YEAR,   quickGenerations: 60,  deepSearches: 20 },
  super:   { id: "super",   name: "Super",   price: 249900, durationLabel: "7 жыл", durationMs: 7 * YEAR,   quickGenerations: 200, deepSearches: 80 },
};

// ── Іске қосу науқаны (launch promo) ──
// Алғашқы `seats` мектепке жеңілдік. Санауыш Firestore-да (config/promo,
// src/lib/promo.ts): админ ЖАҢА мектепке ақылы тариф қосқан сайын +1,
// seats-ке жеткенде акция сайтта АВТОМАТТЫ өшеді. Қолмен өшіру: active = false.
export const LAUNCH_PROMO = {
  active: true,
  percent: 50,
  seats: 10,
};

// Бағаны теңге форматында көрсету: 99900 → "99 900 ₸"
export function formatKzt(n: number): string {
  return n.toLocaleString("ru-RU").replace(/[ ,]/g, " ") + " ₸";
}

// Науқан қосулы болса — жеңілдікпен, әйтпесе нақты баға (тегін тарифке тимейді).
// promoOn — Firestore санауышын ескерген НАҚТЫ күй (usePromo().active);
// берілмесе статикалық қосқыш қолданылады.
export function effectivePrice(price: number, promoOn: boolean = LAUNCH_PROMO.active): number {
  if (!promoOn || !LAUNCH_PROMO.active || price <= 0) return price;
  return Math.round((price * (100 - LAUNCH_PROMO.percent)) / 100);
}
