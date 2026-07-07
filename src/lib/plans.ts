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

export const PLANS: Record<PlanId, PlanDef> = {
  free: { id: "free", name: "Free", priceLabel: "0 ₸", quickGenerations: 0, deepSearches: 0 },
  pro: { id: "pro", name: "Pro", priceLabel: "49 900 ₸/ай", quickGenerations: 10, deepSearches: 5 },
  premium: { id: "premium", name: "Premium", priceLabel: "99 900 ₸/ай", quickGenerations: 30, deepSearches: 10 },
  super: { id: "super", name: "Super", priceLabel: "249 900 ₸/ай", quickGenerations: 100, deepSearches: 40 },
};
