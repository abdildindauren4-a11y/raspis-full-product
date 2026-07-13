// filepath: src/algorithm2/rules/hard/conflicts.ts
// Конфликт ережелері — «физика заңы»: бір адам/сынып/кабинет бір уақытта
// бір жерде ғана болады. Өшірілмейді (removable: false).

import type { Rule } from "../types";

export const conflictTeacher: Rule = {
  id: "conflict-teacher",
  title: "Мұғалім конфликті",
  description: "Бір мұғалім бір уақытта екі сыныпта тұра алмайды",
  kind: "hard", defaultEnabled: true, removable: false,
  check(ctx, p) {
    for (const part of p.parts) {
      const busy = ctx.state.teacherAt(part.teacherId, p.day, p.slot);
      if (busy) {
        const t = ctx.teachersById.get(part.teacherId);
        const c = ctx.classesById.get(busy);
        return `${t?.name || "мұғалім"} бұл уақытта ${c?.name || busy} сыныбында`;
      }
    }
    return null;
  },
};

export const conflictClass: Rule = {
  id: "conflict-class",
  title: "Сынып конфликті",
  description: "Бір сыныпта бір уақытта бір ғана сабақ болады",
  kind: "hard", defaultEnabled: true, removable: false,
  check(ctx, p) {
    const busy = ctx.state.classAt(p.cls.id, p.day, p.slot);
    if (busy && busy.length) {
      const s = ctx.subjectsById.get(busy[0].subjectId);
      return `${p.cls.name} сыныбында бұл уақытта ${s?.name || "сабақ"} тұр`;
    }
    return null;
  },
};

export const conflictRoom: Rule = {
  id: "conflict-room",
  title: "Кабинет конфликті",
  description: "Бір кабинетте бір уақытта бір ғана сынып отырады",
  kind: "hard", defaultEnabled: true, removable: false,
  check(ctx, p) {
    for (const part of p.parts) {
      const r = ctx.roomsById.get(part.roomId);
      // Спортзал бірнеше сыныпты сыйғызады (gymMax) — санын осы жерде,
      // деңгей үйлесімін gym-capacity ережесі тексереді
      const cap = r?.type === "gym" ? r.gymMax || 1 : 1;
      const occ = ctx.state.roomOcc(part.roomId, p.day, p.slot);
      if (occ.length >= cap) {
        const c = ctx.classesById.get(occ[0]);
        return `${r?.number || "кабинет"} бос емес (${c?.name || occ[0]})`;
      }
    }
    return null;
  },
};

export const gymCapacity: Rule = {
  id: "gym-capacity",
  title: "Спортзал деңгей үйлесімі",
  description: "Спортзалды бір мезгілде бөлісетін сыныптар бір жас тобында болады",
  kind: "hard", defaultEnabled: true, removable: true,
  check(ctx, p) {
    for (const part of p.parts) {
      const r = ctx.roomsById.get(part.roomId);
      if (!r || r.type !== "gym") continue;
      const groups = r.gymGroups && r.gymGroups.length ? r.gymGroups : [[1, 11]];
      const grp = groups.find((g) => g[0] <= p.cls.grade && p.cls.grade <= g[1]);
      if (!grp) return `${p.cls.grade}-сынып спортзал топтарына кірмейді`;
      for (const oc of ctx.state.roomOcc(part.roomId, p.day, p.slot)) {
        const ocl = ctx.classesById.get(oc);
        if (ocl && !(grp[0] <= ocl.grade && ocl.grade <= grp[1]))
          return `спортзалда басқа жас тобы (${ocl.name}) тұр`;
      }
    }
    return null;
  },
};
