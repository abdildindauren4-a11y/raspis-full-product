// filepath: src/algorithm2/time.ts
// Engine v2 «Хамелеон» — уақыт моделі.
// v1-дегі қатып қалған 5 күн / 8 слот константаларының орнына — параметрлі
// модель: барлық матрица/цикл осы объектіден құрылады (6 күндік апта,
// 10 слотқа дейінгі күн M4-те осы жерден ашылады).

export interface TimeCfg {
  daysPerWeek?: number;    // 5 немесе 6
  maxSlotsPerDay?: number; // 8..10
}

export interface TimeModel {
  days: number;  // аптадағы оқу күні (1..days)
  slots: number; // күндегі максимал слот (1..slots)
  cells: number; // days * slots — жалпақ индекстеу үшін
  cell(day: number, slot: number): number; // (day,slot) → 0-базалы индекс
}

export const DAY_KZ = ["", "Дс", "Сс", "Ср", "Бс", "Жм", "Сб"];

export function buildTime(cfg?: TimeCfg): TimeModel {
  const days = Math.min(6, Math.max(5, cfg?.daysPerWeek ?? 5));
  const slots = Math.min(10, Math.max(8, cfg?.maxSlotsPerDay ?? 8));
  return {
    days, slots, cells: days * slots,
    cell: (day, slot) => (day - 1) * slots + (slot - 1),
  };
}
