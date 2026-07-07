// filepath: src/lib/plans.ts
// Тарифтік жоспарлар — генерация лимиттері осында анықталады.
// Жаңа тариф қосу үшін: PlanId-ге қос + PLANS-қа жазба қос (басқа жерге тиіспе).

export type PlanId = "free" | "pro" | "premium" | "super";

export interface PlanDef {
  id: PlanId;
  name: string;
  priceLabel: string; // көрсетілетін баға — нақты бағаны өзің баптап қой
  quickGenerations: number;
  deepSearches: number;
}

export const PLAN_ORDER: PlanId[] = ["free", "pro", "premium", "super"];

// Тариф мерзімі — бір төлем 6 айға жарамды (квота осы мерзім ішінде жұмсалады)
export const PLAN_DURATION_MS = 183 * 24 * 60 * 60 * 1000;
// Тариф қосылғанда деректер енгізу панелі ашық болатын терезе (қайта сатудан қорғау)
export const DATA_ENTRY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export const PLANS: Record<PlanId, PlanDef> = {
  free: { id: "free", name: "Free", priceLabel: "0 ₸", quickGenerations: 0, deepSearches: 0 },
  pro: { id: "pro", name: "Pro", priceLabel: "49 900 ₸ / 6 ай", quickGenerations: 10, deepSearches: 5 },
  premium: { id: "premium", name: "Premium", priceLabel: "99 900 ₸ / 6 ай", quickGenerations: 30, deepSearches: 10 },
  super: { id: "super", name: "Super", priceLabel: "249 900 ₸ / 6 ай", quickGenerations: 100, deepSearches: 40 },
};
