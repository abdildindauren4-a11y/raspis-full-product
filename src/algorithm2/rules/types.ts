// filepath: src/algorithm2/rules/types.ts
// Engine v2 — ережелер жүйесінің жүрегі: Rule интерфейсі.
// Ереже = ДЕРЕК (аты, түсіндірмесі, параметрлері) + функция.
// Шешуші (solver) ережелердің мазмұнын білмейді — тек тізімін жүреді.

import type { AlgoInput, Klass, Subject, Teacher, Room, Settings, TL } from "../../algorithm/engine";
import type { TimeModel } from "../time";
import type { ScheduleState, CandidatePlacement } from "../model";

// UI осы схемадан автоматты форма құрады (M3 — ережелер конструкторы)
export interface ParamSchema {
  key: string;
  label: string; // qazaqsha
  type: "number" | "boolean" | "select";
  min?: number;
  max?: number;
  options?: { value: string; label: string }[];
  default: unknown;
}

// Генерация басында бір рет құрылатын, ережелерге берілетін контекст
export interface RuleContext {
  input: AlgoInput;
  time: TimeModel;
  state: ScheduleState;
  settings: Settings;
  subjectsById: Map<string, Subject>;
  teachersById: Map<string, Teacher>;
  roomsById: Map<string, Room>;
  classesById: Map<string, Klass>;
  maxLessonsOf(grade: number): number; // СанПиН күндік сабақ лимиті
  dayLimitOf(grade: number): number;   // күндік балл лимиті
  fatigueThrOf(grade: number): number; // шаршау шегі
  effOf(cls: Klass, s: Subject): number; // пәннің тиімді салмағы (бастауышта primaryScore)
  pScoreOf(s: Subject, slot: number): number; // пәннің слоттағы орналасу ұпайы (0..10)
  lateLimitOf(s: Subject): number | undefined; // пәннің ең кеш сабақ шегі (математика ≤4)
  fatigueAt(classId: string, day: number, beforeSlot: number): number; // жинақталған шаршау
  timeline: Record<1 | 2, TL[]>; // қоңырау кестесі (ауысым аралық үзіліске)
  rng(): number; // 0..1 — multi-seed іздеудегі жеңіл шу (0-әрекетте әрқашан 0)
}

export type RuleParams = Record<string, unknown>;

export interface Rule {
  id: string;
  title: string;       // UI-да көрінетін аты (қазақша; кейін kk/ru/en)
  description: string; // завучқа қарапайым тілмен түсіндірмесі
  kind: "hard" | "soft";
  defaultEnabled: boolean;
  // false → қолданушы өшіре алмайды (мыс. конфликт ережелері — физика заңы)
  removable: boolean;
  params?: ParamSchema[];
  defaultWeight?: number; // soft ережелер үшін салмақ
  // ЫСТЫҚ ЖОЛ: орналастыру алдындағы тексеріс. null = болады,
  // string = болмайды + себебі (explain.ts осыны қолданушыға көрсетеді).
  check?(ctx: RuleContext, p: CandidatePlacement, params: RuleParams): string | null;
  // Soft: кандидаттың ұнамдылығы (көп → жақсы). Seed/improve осы қосындыны
  // максимумдайды.
  score?(ctx: RuleContext, p: CandidatePlacement, params: RuleParams): number;
}

// Мектеп конфигі: { ruleId: {enabled, weight, params} } — dataStore-да
// сақталады, бұлтқа синхрондалады, экспорт/импорт етіледі.
export interface RuleSetting {
  enabled?: boolean;
  weight?: number;
  params?: RuleParams;
}
export type RuleConfigMap = Record<string, RuleSetting>;

// Хамелеонның толық конфигі (модельге тіркелген баптау кеңістігі)
export interface EngineV2Config {
  time?: { daysPerWeek?: number; maxSlotsPerDay?: number };
  rules?: RuleConfigMap;
}
