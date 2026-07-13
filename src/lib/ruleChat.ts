// filepath: src/lib/ruleChat.ts
// Хамелеон ЖИ-баптаушысы (M6): завуч ережелерді еркін мәтінмен айтады
// («Ахметова сейсенбіде жұмыс істемейді, дене шынықтыру 1-сабаққа қойылмасын»),
// ЖИ соны ережелер конфигіне аударады. ҚАУІПСІЗДІК:
//   1. ЖИ тек РЕЕСТРДЕГІ ережелер туралы біледі (схема промптқа беріледі) —
//      ойдан ереже шығара алмайды
//   2. Нәтиже схемаға қарсы валидацияланады
//   3. Танылмаған мұғалім/пән аты болса — нақтылау сұрағы қойылады
//   4. Ешқашан тікелей қолданбайды — тек ҰСЫНЫС қайтарады, адам «Қолдану» басады
import { ALL_RULES } from "@/algorithm2";
import type { EngineV2Config, RuleConfigMap } from "@/algorithm2";
import { geminiBattery, hasGeminiBattery } from "@/lib/salesBot";
import type { Subject, Teacher } from "@/algorithm/engine";

export { hasGeminiBattery as hasRuleChatKey };

// ЖИ қайтаратын әрекеттер: ереже қосу/өшіру/параметрлеу немесе торға Х қою
export interface RuleAction {
  kind: "rule" | "teacher-slot" | "subject-slot";
  // rule:
  ruleId?: string;
  enabled?: boolean;
  weight?: number;
  params?: Record<string, unknown>;
  // slot (икстап тастау):
  targetName?: string;   // мұғалім/пән аты (валидацияланады)
  targetId?: string;     // сәйкестендірілген id
  cells?: string[];      // "day-slot"
  // барлығына:
  summary: string;       // адам тіліндегі түсіндірмесі (kk)
}

export interface RuleChatResult {
  actions: RuleAction[];
  reply: string;              // ЖИ-дің қысқа сөйлемі (нақтылау немесе растау)
  needsClarification: boolean;
}

// Реестр схемасын промптқа беретін ықшам сипаттама
function ruleSchemaText(): string {
  return ALL_RULES.map((r) => {
    const ps = (r.params || []).map((p) => {
      const rng = p.type === "number" ? ` (${p.min}..${p.max})` : "";
      return `${p.key}:${p.type}${rng}`;
    }).join(", ");
    return `- ${r.id} [${r.kind}${r.removable ? "" : ", ӨШІРІЛМЕЙДІ"}] "${r.title}": ${r.description}${ps ? ` | параметрлер: ${ps}` : ""}${r.kind === "soft" ? " | салмақ: 0..6" : ""}`;
  }).join("\n");
}

function buildPrompt(subjects: Subject[], teachers: Teacher[]): string {
  return `Сен — «РАСПИС» мектеп кестесі жүйесінің Хамелеон алгоритмін баптайтын көмекшісің.
Завуч кестеге қойылатын ережелерді еркін тілмен айтады, сен оны ТЕК төмендегі
белгілі ережелердің конфигіне аударасың. ОЙДАН ЕРЕЖЕ ШЫҒАРМА.

=== БЕЛГІЛІ ЕРЕЖЕЛЕР (тек осылармен жұмыс істе) ===
${ruleSchemaText()}

=== «ИКСТАП ТАСТАУ» (белгілі бір уақытқа тыйым) ===
Егер завуч нақты мұғалімнің/пәннің белгілі күн-сабаққа қойылмауын сұраса,
teacher-slot немесе subject-slot әрекетін қолдан. Ұяшық форматы: "күн-сабақ",
күн 1=Дүйсенбі..5=Жұма (6=Сенбі), сабақ 1..8. Бүкіл күн болса — сол күннің
барлық сабағын тізіп бер (мыс. сейсенбі = "2-1".."2-8").

=== МЕКТЕПТЕГІ МҰҒАЛІМДЕР ===
${teachers.map((t) => t.name).join(", ") || "(жоқ)"}

=== МЕКТЕПТЕГІ ПӘНДЕР ===
${subjects.map((s) => s.name).join(", ") || "(жоқ)"}

=== ЖАУАП ПІШІМІ (ТЕК JSON, басқа мәтінсіз) ===
{
  "actions": [
    // ереже баптау:
    {"kind":"rule","ruleId":"<id>","enabled":true|false,"params":{...},"weight":<0..6>,"summary":"<қазақша>"},
    // мұғалім/пәнге тыйым:
    {"kind":"teacher-slot","targetName":"<дәл ат>","cells":["2-1","2-2"],"summary":"<қазақша>"},
    {"kind":"subject-slot","targetName":"<дәл пән>","cells":["1-1"],"summary":"<қазақша>"}
  ],
  "reply":"<завучқа қысқа қазақша жауап>",
  "needsClarification": false
}

ЕРЕЖЕЛЕР:
- Мұғалім/пән аты тізімде ТАП ТАБЫЛМАСА — actions бос, needsClarification=true,
  reply-де қайсысын айтқанын нақтылап сұра.
- Сұраныс белгілі ережелерге сай КЕЛМЕСЕ — actions бос, needsClarification=true,
  reply-де не істей алатыныңды түсіндір.
- Әр action-да summary міндетті (адам тілінде, қысқа).
- enabled/params/weight — тек қажеттісін бер.
- ТЕК таза JSON қайтар, markdown блогынсыз.`;
}

function extractJson(text: string): unknown {
  // ```json ... ``` немесе таза JSON — { .. } блогын аламыз
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end < 0) throw new Error("NO_JSON");
  return JSON.parse(raw.slice(start, end + 1));
}

// Ат бойынша мұғалім/пәнді табу (регистрсіз, бос орынға төзімді)
function findByName<T extends { name: string; id: string }>(items: T[], name: string): T | undefined {
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
  const n = norm(name);
  return items.find((i) => norm(i.name) === n) || items.find((i) => norm(i.name).includes(n) || n.includes(norm(i.name)));
}

export async function askRuleChat(
  userMessage: string,
  subjects: Subject[],
  teachers: Teacher[],
): Promise<RuleChatResult> {
  const contents = [
    { role: "user", parts: [{ text: buildPrompt(subjects, teachers) }] },
    { role: "model", parts: [{ text: "Түсіндім. Тек белгілі ережелермен жұмыс істеймін, таза JSON қайтарамын." }] },
    { role: "user", parts: [{ text: userMessage }] },
  ];
  const raw = await geminiBattery(contents, {
    temperature: 0.2, maxOutputTokens: 2048, thinkingConfig: { thinkingBudget: 0 },
    responseMimeType: "application/json",
  });
  return parseAndValidate(raw, subjects, teachers);
}

// ЖИ жауабын тексеру (таза, желісіз — тест етіледі). Мұнда БАРЛЫҚ қауіпсіздік:
// ойдан шыққан ереже, өшірілмейтінді өшіру, танылмаған ат — бәрі сүзіледі.
export function parseAndValidate(raw: string, subjects: Subject[], teachers: Teacher[]): RuleChatResult {
  const parsed = extractJson(raw) as { actions?: unknown[]; reply?: string; needsClarification?: boolean };
  const validRuleIds = new Set(ALL_RULES.map((r) => r.id));
  const actions: RuleAction[] = [];
  let clarify = !!parsed.needsClarification;

  for (const a of parsed.actions || []) {
    const act = a as RuleAction;
    if (act.kind === "rule") {
      if (!act.ruleId || !validRuleIds.has(act.ruleId)) continue; // ойдан шыққан ереже — елемейміз
      const rule = ALL_RULES.find((r) => r.id === act.ruleId)!;
      // Өшірілмейтін ережені өшіруге тырысса — елемейміз
      if (!rule.removable && act.enabled === false) continue;
      actions.push({ kind: "rule", ruleId: act.ruleId, enabled: act.enabled, weight: act.weight, params: act.params, summary: act.summary || rule.title });
    } else if (act.kind === "teacher-slot") {
      const t = act.targetName ? findByName(teachers, act.targetName) : undefined;
      if (!t) { clarify = true; continue; }
      actions.push({ kind: "teacher-slot", targetName: t.name, targetId: t.id, cells: normCells(act.cells), summary: act.summary || `${t.name}: тыйым` });
    } else if (act.kind === "subject-slot") {
      const s = act.targetName ? findByName(subjects, act.targetName) : undefined;
      if (!s) { clarify = true; continue; }
      actions.push({ kind: "subject-slot", targetName: s.name, targetId: s.id, cells: normCells(act.cells), summary: act.summary || `${s.name}: тыйым` });
    }
  }
  return {
    actions,
    reply: parsed.reply || (actions.length ? "Ұсыныс дайын." : "Сұранысыңызды нақтырақ жазыңызшы."),
    needsClarification: clarify || actions.length === 0,
  };
}

function normCells(cells: unknown): string[] {
  if (!Array.isArray(cells)) return [];
  return cells
    .map((c) => String(c))
    .filter((c) => /^[1-6]-[1-9]$|^[1-6]-10$/.test(c));
}

// Ұсынысты нақты конфигке қолдану — dataStore-ды жаңартатын патчтарды қайтарады
export function applyActions(
  actions: RuleAction[],
  baseCfg: EngineV2Config,
  subjects: Subject[],
  teachers: Teacher[],
): { config: EngineV2Config; subjects: Subject[]; teachers: Teacher[] } {
  const rules: RuleConfigMap = { ...(baseCfg.rules || {}) };
  let nextSubjects = subjects;
  let nextTeachers = teachers;
  for (const a of actions) {
    if (a.kind === "rule" && a.ruleId) {
      const prev = rules[a.ruleId] || {};
      rules[a.ruleId] = {
        ...prev,
        ...(a.enabled != null ? { enabled: a.enabled } : {}),
        ...(a.weight != null ? { weight: a.weight } : {}),
        params: { ...prev.params, ...(a.params || {}) },
      };
    } else if (a.kind === "teacher-slot" && a.targetId && a.cells) {
      nextTeachers = nextTeachers.map((t) =>
        t.id === a.targetId ? { ...t, unavailable: [...new Set([...t.unavailable, ...a.cells!])] } : t);
    } else if (a.kind === "subject-slot" && a.targetId && a.cells) {
      nextSubjects = nextSubjects.map((s) =>
        s.id === a.targetId ? { ...s, bannedSlots: [...new Set([...(s.bannedSlots || []), ...a.cells!])] } : s);
    }
  }
  return { config: { ...baseCfg, rules }, subjects: nextSubjects, teachers: nextTeachers };
}
