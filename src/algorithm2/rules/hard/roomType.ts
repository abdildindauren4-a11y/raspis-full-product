// filepath: src/algorithm2/rules/hard/roomType.ts
// Арнайы кабинет талабы: физика — физика кабинетінде, дене шынықтыру —
// спортзалда. Кабинет таңдауды solver жасайды, бұл ереже кандидаттың
// кабинеті талапқа сай екенін тексереді (drag-and-drop валидациясына да керек).

import type { Rule } from "../types";
import { NO_ROOM } from "../../model";

export const roomType: Rule = {
  id: "room-type",
  title: "Арнайы кабинет талабы",
  description: "Пән өзіне арналған кабинет түрінде ғана өтеді",
  kind: "hard", defaultEnabled: true, removable: true,
  check(ctx, p) {
    if (!p.s.room) return null; // талап жоқ
    for (const part of p.parts) {
      if (part.roomId === NO_ROOM) return `${p.s.name} пәніне ${p.s.room} кабинеті керек`;
      const r = ctx.roomsById.get(part.roomId);
      if (!r || r.type !== p.s.room)
        return `${p.s.name} пәніне ${p.s.room} кабинеті керек (${r?.number || "?"} сай емес)`;
    }
    return null;
  },
};
