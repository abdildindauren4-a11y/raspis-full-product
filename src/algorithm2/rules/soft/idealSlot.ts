// filepath: src/algorithm2/rules/soft/idealSlot.ts
// Жұмсақ ереже: пәннің идеал орны (v1-дегі pScore баламасы).
// Ауыр пәндер таңертеңгі слоттарға, жеңілдері кейінге тартылады.

import type { Rule } from "../types";
import { pScore } from "../../../algorithm/engine";

export const idealSlot: Rule = {
  id: "ideal-slot",
  title: "Пәннің идеал орны",
  description: "Әр пән өзінің қолайлы сабақ нөмірлеріне жақын қойылады",
  kind: "soft", defaultEnabled: true, removable: true,
  defaultWeight: 1,
  score(ctx, p) {
    return pScore(p.s, p.slot, ctx.settings); // 0..10
  },
};
