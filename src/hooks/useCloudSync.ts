// filepath: src/hooks/useCloudSync.ts
// Бұлтпен синхрондау: кіргенде жүктейді, дерек өзгергенде сақтайды.
// dataStore мен AuthContext арасын байланыстырады (екеуін де бұзбай).
//
// СЕНІМДІЛІК (деректер жоғалмауы үшін):
//  1) Автосақтау тек бұлттан ЖҮКТЕУ АЯҚТАЛҒАННАН кейін қосылады (loaded ref) —
//     әйтпесе жүктеу кезіндегі бос/жарым күй бұлтты үстінен жазып жіберер еді.
//  2) Соңғы сақталмаған күй `pending`-те тұрады; бет фонға өткенде
//     (visibilitychange→hidden) немесе жабылғанда (pagehide) БІРДЕН флашталады
//     — 2 сек debounce бітпей кетсе де дерек жоғалмайды.
//  3) Толық БОС күй (0 пән + 0 сынып + 0 мұғалім) бұлтқа жазылмайды —
//     кездейсоқ/өтпелі бос күй нақты деректі өшіріп жібермес үшін.
import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/store/dataStore";
import { saveToCloud, loadFromCloud, type CloudData } from "@/lib/cloudStore";
import { checkDataSwap } from "@/lib/antiResale";

type Snapshot = Omit<CloudData, "updatedAt">;

const isEmpty = (s: Snapshot) =>
  s.subjects.length === 0 && s.classes.length === 0 && s.teachers.length === 0 && s.rooms.length === 0;

export function useCloudSync() {
  const { user, configured } = useAuth();
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const loaded = useRef(false);                 // бұлттан жүктеу АЯҚТАЛДЫ ма
  const loadedFor = useRef<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<Snapshot | null>(null); // әлі сақталмаған соңғы күй

  // Сақталмай тұрған күйді ДЕРЕУ бұлтқа жазу (debounce-ты күтпей)
  const flush = useCallback(async (uid: string) => {
    if (!pending.current) return;
    const data = pending.current;
    pending.current = null;
    if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current = null; }
    setSyncing(true);
    const ok = await saveToCloud(uid, data);
    if (ok) {
      setLastSync(Date.now());
      checkDataSwap(uid, { school: data.school, teachers: data.teachers, classes: data.classes });
    }
    setSyncing(false);
  }, []);

  // 1) Кіргенде — бұлттан деректерді жүктеу (бір рет, әр пайдаланушыға)
  useEffect(() => {
    if (!configured || !user) return;
    if (loadedFor.current === user.uid) return; // осы пайдаланушыға жүктелді
    loadedFor.current = user.uid;
    loaded.current = false; // жүктеу біткенше автосақтау ЖОҚ

    (async () => {
      setSyncing(true);
      const cloud = await loadFromCloud(user.uid);
      if (cloud) {
        // бұлтта дерек бар — жергілікті күйге жазамыз
        const st = useData.getState();
        st.setSchool(cloud.school);
        st.setSettings(cloud.settings);
        st.setSubjects(cloud.subjects);
        st.setClasses(cloud.classes);
        st.setTeachers(cloud.teachers);
        st.setRooms(cloud.rooms);
        setLastSync(cloud.updatedAt);
      }
      loaded.current = true; // ЕНДІ ғана автосақтауға рұқсат
      setSyncing(false);
      // Бұлт БОС, бірақ жергілікті дерек бар болса — оны бірден бұлтқа көтереміз
      // (алғаш кіргенде қолда бар деректі жоғалтпау үшін).
      if (!cloud) {
        const st = useData.getState();
        const snap: Snapshot = { school: st.school, settings: st.settings, subjects: st.subjects, classes: st.classes, teachers: st.teachers, rooms: st.rooms };
        if (!isEmpty(snap)) { pending.current = snap; void flush(user.uid); }
      }
    })();
  }, [user, configured, flush]);

  // 2) Дерек өзгергенде — бұлтқа сақтау (debounce 2 сек) + фон/жабылуда флаш
  useEffect(() => {
    if (!configured || !user) return;
    const uid = user.uid;

    const unsub = useData.subscribe((state) => {
      if (!loaded.current || loadedFor.current !== uid) return; // жүктеу біткенше сақтамаймыз
      const snap: Snapshot = {
        school: state.school, settings: state.settings,
        subjects: state.subjects, classes: state.classes,
        teachers: state.teachers, rooms: state.rooms,
      };
      // толық бос күйді бұлтқа жазбаймыз (нақты деректі кездейсоқ өшіріп алмау үшін)
      if (isEmpty(snap)) return;
      pending.current = snap;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => { void flush(uid); }, 2000);
    });

    // Бет фонға өткенде/жабылғанда — сақталмаған күйді БІРДЕН флаштаймыз.
    // Мобильде (iOS) beforeunload сенімсіз; visibilitychange мен pagehide — сенімді.
    const onHide = () => { if (document.visibilityState === "hidden" && pending.current) void flush(uid); };
    const onPageHide = () => { if (pending.current) void flush(uid); };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      unsub();
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onPageHide);
      // unmount-та (мыс. шығу/навигация) — сақталмаған күйді жоғалтпай флаштаймыз
      if (pending.current) void flush(uid);
    };
  }, [user, configured, flush]);

  return { syncing, lastSync, cloudEnabled: configured && !!user };
}
