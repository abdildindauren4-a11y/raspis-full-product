// filepath: src/algorithm2/rules/hard/pairs.ts
// Көрші сабақ ережелері: қара тізім жұптары (Қазақ тілі + Орыс тілі қатар
// тұрмасын) және «информатикадан кейін ауыр пән болмасын».

import type { Rule } from "../types";

export const blacklistPair: Rule = {
  id: "blacklist-pair",
  title: "Қатар тұрмайтын пәндер",
  description: "Қара тізімдегі пән жұптары (мыс. Қазақ тілі + Орыс тілі) көрші слотқа қойылмайды",
  kind: "hard", defaultEnabled: true, removable: true,
  check(ctx, p) {
    const neigh = (slot: number) => {
      if (slot < 1 || slot > ctx.time.slots) return null;
      const sid = ctx.state.subjectAt(p.cls.id, p.day, slot);
      return sid ? ctx.subjectsById.get(sid) : null;
    };
    // Қос сабақ өз көршісі болып саналмауы үшін: 1-жартының оң көршісі мен
    // 2-жартының сол көршісі — өзі, оларды тексермейміз
    const prev = p.partOfDouble === 2 ? null : neigh(p.slot - 1);
    const next = p.partOfDouble === 1 ? null : neigh(p.slot + 1);
    for (const nb of [prev, next]) {
      if (!nb || nb.id === p.s.id) continue;
      if (p.s.black.includes(nb.name) || nb.black.includes(p.s.name))
        return `${nb.name} және ${p.s.name} қатар тұрмайды (қара тізім)`;
    }
    return null;
  },
};

export const digitalThenLight: Rule = {
  id: "digital-then-light",
  title: "Информатикадан кейін жеңіл пән",
  description: "Экранмен жұмыстан кейін көз демалуы үшін ауыр пән қойылмайды",
  kind: "hard", defaultEnabled: true, removable: true,
  check(ctx, p) {
    const at = (slot: number) => {
      if (slot < 1 || slot > ctx.time.slots) return null;
      const sid = ctx.state.subjectAt(p.cls.id, p.day, slot);
      return sid ? ctx.subjectsById.get(sid) : null;
    };
    const prev = at(p.slot - 1);
    if (prev && prev.digital && p.s.score > 5)
      return `${prev.name} сабағынан кейін ауыр пән қойылмайды`;
    const next = at(p.slot + 1);
    if (next && p.s.digital && next.score > 5)
      return `${p.s.name} сабағынан кейін ауыр пән (${next.name}) тұр`;
    return null;
  },
};
