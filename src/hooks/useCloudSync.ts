// filepath: src/hooks/useCloudSync.ts
// Бұлтпен синхрондау: кіргенде жүктейді, дерек өзгергенде сақтайды.
// dataStore мен AuthContext арасын байланыстырады (екеуін де бұзбай).
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/store/dataStore";
import { saveToCloud, loadFromCloud } from "@/lib/cloudStore";
import { checkDataSwap } from "@/lib/antiResale";

export function useCloudSync() {
  const { user, configured } = useAuth();
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const loadedFor = useRef<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 1) Кіргенде — бұлттан деректерді жүктеу (бір рет, әр пайдаланушыға)
  useEffect(() => {
    if (!configured || !user) return;
    if (loadedFor.current === user.uid) return; // осы пайдаланушыға жүктелді
    loadedFor.current = user.uid;

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
      setSyncing(false);
    })();
  }, [user, configured]);

  // 2) Дерек өзгергенде — бұлтқа сақтау (debounce 2 сек)
  useEffect(() => {
    if (!configured || !user || loadedFor.current !== user.uid) return;

    const unsub = useData.subscribe((state) => {
      // тек нақты деректер өзгерсе сақтаймыз (логин/нұсқа емес)
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        setSyncing(true);
        const ok = await saveToCloud(user.uid, {
          school: state.school, settings: state.settings,
          subjects: state.subjects, classes: state.classes,
          teachers: state.teachers, rooms: state.rooms,
        });
        if (ok) {
          setLastSync(Date.now());
          // Қайта сату бақылауы: мұғалімдер құрамы түбегейлі ауысса —
          // әкімші панеліне күдікті белгі түседі (fail-safe, үнсіз)
          checkDataSwap(user.uid, { school: state.school, teachers: state.teachers, classes: state.classes });
        }
        setSyncing(false);
      }, 2000);
    });

    return () => {
      unsub();
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [user, configured]);

  return { syncing, lastSync, cloudEnabled: configured && !!user };
}
