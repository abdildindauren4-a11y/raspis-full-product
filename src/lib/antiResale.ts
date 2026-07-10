// filepath: src/lib/antiResale.ts
// ҚАЙТА САТУДАН ҚОРҒАУ: тариф иесі басқа мектептерге кесте жасап сатып
// жүрмеуін бақылау. Әр ақылы аккаунттың дерегінен «саусақ ізі» (мұғалімдер
// тізімі — мектептің ең тұрақты белгісі) сақталады. Кейінгі синхрондарда
// мұғалімдер құрамы түбегейлі ауысса (сәйкестік < 40%) — бұл «мүлде басқа
// мектептің дерегі енгізілді» деген белгі: users/{uid}.swapAlert жазылып,
// әкімші панелінің басында қызыл ескерту көрінеді.
//
// Байқаусыз өзгерістерге төзімді: мұғалім қосылса/бірен-саран кетсе —
// сәйкестік жоғары қалады және базалық із жаңарып отырады (rolling baseline).
// Ескерту әкімші оны қарап «жаңа деректі қабылдағанша» қайталанбайды.
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import type { School, Teacher, Klass } from "@/algorithm/engine";

export interface DataFingerprint {
  school: string;     // мектеп атауы (нормаланған)
  teachers: string[]; // мұғалім аттары (нормаланған, сұрыпталған)
  classes: string[];
  at: number;
}

export interface SwapAlert {
  at: number;          // қашан байқалды
  overlap: number;     // мұғалім сәйкестігі, % (0-100)
  oldSchool: string;
  newSchool: string;
  oldCount: number;    // базадағы мұғалім саны
  newCount: number;    // жаңа деректегі мұғалім саны
  newFp: DataFingerprint; // әкімші «қабылдаса» осы жаңа базалық із болады
}

const normName = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
const SWAP_THRESHOLD = 0.4; // сәйкестік осыдан ТӨМЕН болса — күдікті
const MIN_TEACHERS = 5;     // із қалдыруға жеткілікті ең аз мұғалім саны
let lastCheck = 0;          // жиі тексермеу (әр 60 сек)

export async function checkDataSwap(
  uid: string,
  data: { school: School; teachers: Teacher[]; classes: Klass[] }
): Promise<void> {
  const db = getDb();
  if (!db) return;
  const now = Date.now();
  if (now - lastCheck < 60_000) return;
  lastCheck = now;
  try {
    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const rec = snap.data() as {
      role?: string; plan?: string;
      fingerprint?: DataFingerprint; swapAlert?: SwapAlert | null;
    };
    // Тек ақылы тарифтер бақыланады (admin/demo/free — мағынасы жоқ)
    if (rec.role === "admin" || rec.role === "demo") return;
    if (!rec.plan || rec.plan === "free") return;

    const teachers = [...new Set(data.teachers.map((t) => normName(t.name)))].sort();
    if (teachers.length < MIN_TEACHERS) return;
    const cur: DataFingerprint = {
      school: normName(data.school.name || ""),
      teachers,
      classes: [...new Set(data.classes.map((c) => normName(c.name)))].sort(),
      at: now,
    };

    // Базалық із әлі жоқ — алғашқы толыққанды дерек осы болып сақталады
    if (!rec.fingerprint) {
      await updateDoc(ref, { fingerprint: cur });
      return;
    }
    // Қаралмаған ескерту тұрса — қайталап жазбаймыз
    if (rec.swapAlert) return;

    const base = new Set(rec.fingerprint.teachers);
    const common = cur.teachers.filter((t) => base.has(t)).length;
    const overlap = common / Math.max(base.size, 1);

    if (overlap < SWAP_THRESHOLD) {
      // Мұғалімдер құрамы түбегейлі ауысқан — күдікті белгі
      await updateDoc(ref, {
        swapAlert: {
          at: now, overlap: Math.round(overlap * 100),
          oldSchool: rec.fingerprint.school, newSchool: cur.school,
          oldCount: base.size, newCount: cur.teachers.length,
          newFp: cur,
        } satisfies SwapAlert,
      });
    } else if (JSON.stringify(cur.teachers) !== JSON.stringify(rec.fingerprint.teachers)) {
      // Қалыпты өзгеріс (мұғалім қосылды/кетті) — базалық ізді жаңартамыз,
      // жылдар бойы біртіндеп ауысқан құрам жалған дабыл бермейді
      await updateDoc(ref, { fingerprint: cur });
    }
  } catch {
    /* бақылау сәтсіз болса — үнсіз қаламыз (негізгі жұмысқа кедергі емес) */
  }
}

// Әкімші: ескертумен танысып, жаңа деректі ЗАҢДЫ деп қабылдау —
// базалық із жаңа дерекке ауысады, ескерту өшеді.
export async function resolveSwapAlert(uid: string): Promise<boolean> {
  const db = getDb();
  if (!db) return false;
  try {
    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return false;
    const alert = (snap.data() as { swapAlert?: SwapAlert | null }).swapAlert;
    await updateDoc(ref, {
      fingerprint: alert?.newFp ?? null,
      swapAlert: null,
    });
    return true;
  } catch {
    return false;
  }
}
