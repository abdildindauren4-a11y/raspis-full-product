// filepath: src/algorithm2/rules/registry.ts
// Ережелер реестрі: барлық ереже осында тіркеледі. Жаңа ереже қосу =
// бір файл жазу + осы тізімге бір жол. Генерация басында қосулы ережелер
// ЖАЛПАҚ МАССИВКЕ компиляцияланады — ыстық жолда индирекция да,
// аллокация да жоқ (өнімділік бюджеті: v1-ден ≤ +20%).

import type { Rule, RuleConfigMap, RuleContext, RuleParams } from "./types";
import type { CandidatePlacement } from "../model";
import { conflictTeacher, conflictClass, conflictRoom, gymCapacity } from "./hard/conflicts";
import { oneSubjectPerDay } from "./hard/oneSubjectPerDay";
import { teacherAvailability, teacherShiftGrade } from "./hard/teacherAvailability";
import { maxLessonsPerDay } from "./hard/maxLessonsPerDay";
import { roomType } from "./hard/roomType";
import { dayScoreLimit, fatigueThreshold } from "./hard/sanpin";
import { blacklistPair, digitalThenLight } from "./hard/pairs";
import { subjectMaxSlot, corrLate } from "./hard/subjectSlots";
import { interShiftGap } from "./hard/interShift";
import { idealSlot } from "./soft/idealSlot";
import { evenWeekSpread, compactDay } from "./soft/evenSpread";

export const ALL_RULES: Rule[] = [
  // қатаң
  conflictTeacher, conflictClass, conflictRoom, gymCapacity,
  oneSubjectPerDay, teacherAvailability, teacherShiftGrade,
  maxLessonsPerDay, roomType,
  dayScoreLimit, fatigueThreshold, blacklistPair, digitalThenLight,
  subjectMaxSlot, corrLate, interShiftGap,
  // жұмсақ
  idealSlot, evenWeekSpread, compactDay,
];

export type HardFn = (ctx: RuleContext, p: CandidatePlacement) => string | null;
export type SoftFn = (ctx: RuleContext, p: CandidatePlacement) => number;

export interface CompiledRules {
  hard: HardFn[];
  soft: SoftFn[]; // салмақ функция ішіне алдын ала көбейтілген
}

function resolveParams(rule: Rule, cfg?: RuleConfigMap): RuleParams {
  const out: RuleParams = {};
  for (const ps of rule.params || []) out[ps.key] = ps.default;
  const over = cfg?.[rule.id]?.params;
  if (over) Object.assign(out, over);
  return out;
}

export function compileRules(cfg?: RuleConfigMap): CompiledRules {
  const hard: HardFn[] = [];
  const soft: SoftFn[] = [];
  for (const rule of ALL_RULES) {
    const st = cfg?.[rule.id];
    const enabled = rule.removable ? (st?.enabled ?? rule.defaultEnabled) : true;
    if (!enabled) continue;
    const params = resolveParams(rule, cfg);
    if (rule.kind === "hard" && rule.check) {
      const fn = rule.check.bind(rule);
      hard.push((ctx, p) => fn(ctx, p, params));
    } else if (rule.kind === "soft" && rule.score) {
      const w = st?.weight ?? rule.defaultWeight ?? 1;
      if (w <= 0) continue;
      const fn = rule.score.bind(rule);
      soft.push((ctx, p) => fn(ctx, p, params) * w);
    }
  }
  return { hard, soft };
}

// Кандидат осы жерге тұра ала ма? null = иә, string = алғашқы бұзылған
// ереженің себебі (explain.ts толық тізімін жинайды).
export function firstViolation(c: CompiledRules, ctx: RuleContext, p: CandidatePlacement): string | null {
  for (let i = 0; i < c.hard.length; i++) {
    const r = c.hard[i](ctx, p);
    if (r) return r;
  }
  return null;
}

export function softScore(c: CompiledRules, ctx: RuleContext, p: CandidatePlacement): number {
  let s = 0;
  for (let i = 0; i < c.soft.length; i++) s += c.soft[i](ctx, p);
  return s;
}
