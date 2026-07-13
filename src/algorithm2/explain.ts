// filepath: src/algorithm2/explain.ts
// «Неге болмайды?» — кандидат орынға тұра алмаса, БАРЛЫҚ бұзылған ережені
// себебімен қайтарады. Drag-and-drop (M5) осы функциямен ұяшықтарды
// жасыл/қызыл бояйды және қызылға апарғанда себебін айтады.

import type { Rule, RuleContext, RuleConfigMap } from "./rules/types";
import type { CandidatePlacement } from "./model";
import { ALL_RULES } from "./rules/registry";

export interface Violation {
  ruleId: string;
  ruleTitle: string;
  reason: string;
}

export function explainPlacement(
  ctx: RuleContext,
  p: CandidatePlacement,
  cfg?: RuleConfigMap,
): Violation[] {
  const out: Violation[] = [];
  for (const rule of ALL_RULES) {
    if (rule.kind !== "hard" || !rule.check) continue;
    const enabled = rule.removable ? (cfg?.[rule.id]?.enabled ?? rule.defaultEnabled) : true;
    if (!enabled) continue;
    const params: Record<string, unknown> = {};
    for (const ps of rule.params || []) params[ps.key] = ps.default;
    if (cfg?.[rule.id]?.params) Object.assign(params, cfg[rule.id].params);
    const reason = rule.check(ctx, p, params);
    if (reason) out.push({ ruleId: rule.id, ruleTitle: rule.title, reason });
  }
  return out;
}

export function ruleById(id: string): Rule | undefined {
  return ALL_RULES.find((r) => r.id === id);
}
