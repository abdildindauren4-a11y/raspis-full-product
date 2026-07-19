// filepath: src/store/dataStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { School, Settings, Subject, Teacher, Room, Klass, Komplekt, AlgoResult } from "@/algorithm/engine";
import { seedSchool, seedSettings, seedSubjects, buildSeed } from "@/lib/seed";
import { buildBigSeed, bigSchool, bigSettings, bigSubjects } from "@/lib/bigSeed";
import { buildSchool21, school21, school21Settings, school21Subjects } from "@/lib/school21Seed";
import { DEFAULT_ENGINE, type EngineId } from "@/lib/engines";
import type { EngineV2Config } from "@/algorithm2";

export interface SubstitutionRecord {
  id: string;
  date: string;          // "2026-09-15" немесе "2026-09-15..2026-09-20"
  absentTeacherId: string;
  absentTeacherName: string;
  substituteTeacherId: string;
  substituteTeacherName: string;
  slots: {               // алмастырылған сабақтар
    day: number; slot: number; classId: string; subjectId: string;
  }[];
  mode: "auto" | "manual";
  createdAt: string;
  note?: string;
}

export interface Version {
  id: string; number: number; name: string; createdAt: string;
  isPartial: boolean; scope?: string; result: AlgoResult;
}
interface DataState {
  loggedIn: boolean; userName: string;
  school: School; settings: Settings;
  subjects: Subject[]; classes: Klass[]; teachers: Teacher[]; rooms: Room[];
  komplekts: Komplekt[]; // ШЖМ: біріктірілген класс-комплектілер (аралас мектеп)
  versions: Version[]; activeVersionId: string | null;
  substitutions: SubstitutionRecord[];
  // Алгоритм-модель таңдауы (ЖИ-чаттардағы модель ауыстырғыш сияқты).
  // Әр модельдің ӨЗ баптау кеңістігі бар — engineConfigs-та сақталады.
  activeEngine: EngineId;
  engineConfigs: Partial<Record<EngineId, EngineV2Config>>;
  setActiveEngine: (id: EngineId) => void;
  setEngineConfig: (id: EngineId, cfg: EngineV2Config) => void;
  login: (name: string) => void; logout: () => void;
  setSchool: (s: Partial<School>) => void;
  setSettings: (s: Partial<Settings>) => void;
  setSubjects: (s: Subject[]) => void;
  setClasses: (c: Klass[]) => void;
  setTeachers: (t: Teacher[]) => void;
  setRooms: (r: Room[]) => void;
  setKomplekts: (k: Komplekt[]) => void;
  saveVersion: (result: AlgoResult, isPartial: boolean, scope?: string) => Version;
  activateVersion: (id: string) => void;
  deleteVersion: (id: string) => void;
  // Қолмен реттеу: белсенді нұсқаның слоттарын алмастыру (сапа сол күйінде қалады)
  setActiveSlots: (slots: AlgoResult["slots"]) => void;
  addSubstitution: (s: SubstitutionRecord) => void;
  deleteSubstitution: (id: string) => void;
  resetSeed: () => void;
  resetBigSeed: () => void;
  resetSchool21: () => void; // №21 нақты мектеп демосы (кабинеттік жүйе + автотағайындау)
  clearSchedules: () => void;   // тек кестелерді (нұсқаларды) өшіру
  clearAllData: () => void;     // барлық деректі бос ету (демосыз)
}
const uid = () => Math.random().toString(36).slice(2, 10);
const seed = buildSeed();

export const useData = create<DataState>()(
  persist(
    (set, get) => ({
      loggedIn: false, userName: "",
      school: seedSchool, settings: seedSettings,
      subjects: seedSubjects, classes: seed.classes,
      teachers: seed.teachers, rooms: seed.rooms, komplekts: [],
      versions: [], activeVersionId: null, substitutions: [],
      activeEngine: DEFAULT_ENGINE, engineConfigs: {},
      setActiveEngine: (activeEngine) => set({ activeEngine }),
      setEngineConfig: (id, cfg) => set({ engineConfigs: { ...get().engineConfigs, [id]: cfg } }),
      login: (name) => set({ loggedIn: true, userName: name }),
      logout: () => set({ loggedIn: false, userName: "" }),
      setSchool: (s) => set({ school: { ...get().school, ...s } }),
      setSettings: (s) => set({ settings: { ...get().settings, ...s } }),
      setSubjects: (subjects) => set({ subjects }),
      setClasses: (classes) => set({ classes }),
      setTeachers: (teachers) => set({ teachers }),
      setRooms: (rooms) => set({ rooms }),
      setKomplekts: (komplekts) => set({ komplekts }),
      saveVersion: (result, isPartial, scope) => {
        const n = get().versions.length + 1;
        const v: Version = {
          id: uid(), number: n, name: `Нұсқа ${n}${isPartial ? " (partial)" : ""}`,
          createdAt: new Date().toLocaleString("kk-KZ"), isPartial, scope, result,
        };
        set({ versions: [...get().versions, v], activeVersionId: v.id });
        return v;
      },
      activateVersion: (id) => set({ activeVersionId: id }),
      setActiveSlots: (slots) => {
        const id = get().activeVersionId;
        set({
          versions: get().versions.map((v) =>
            v.id === id ? { ...v, result: { ...v.result, slots }, name: v.name.includes("(қолмен түзетілген)") ? v.name : `${v.name} (қолмен түзетілген)` } : v),
        });
      },
      addSubstitution: (s) => set({ substitutions: [...get().substitutions, s] }),
      deleteSubstitution: (id) => set({ substitutions: get().substitutions.filter((s) => s.id !== id) }),
      deleteVersion: (id) => {
        const vs = get().versions.filter((v) => v.id !== id);
        set({ versions: vs, activeVersionId: get().activeVersionId === id ? (vs.length ? vs[vs.length - 1].id : null) : get().activeVersionId });
      },
      resetSeed: () => {
        const s = buildSeed();
        set({ school: seedSchool, settings: seedSettings, subjects: seedSubjects, classes: s.classes, teachers: s.teachers, rooms: s.rooms, komplekts: [], versions: [], activeVersionId: null });
      },
      resetBigSeed: () => {
        const s = buildBigSeed();
        set({ school: bigSchool, settings: bigSettings, subjects: bigSubjects, classes: s.classes, teachers: s.teachers, rooms: s.rooms, komplekts: [], versions: [], activeVersionId: null, substitutions: [] });
      },
      resetSchool21: () => {
        // №21 нақты мектеп: СанПиН баллдары, кабинеттік жүйе, мұғалімдер
        // автотағайындалған, әр пәнге кабинет қосылған — бірден генерацияға дайын.
        const s = buildSchool21();
        set({ school: school21, settings: school21Settings, subjects: school21Subjects, classes: s.classes, teachers: s.teachers, rooms: s.rooms, komplekts: [], versions: [], activeVersionId: null, substitutions: [] });
      },
      clearSchedules: () => {
        // тек құрылған кестелерді (нұсқаларды) және алмастыруларды өшіреді
        set({ versions: [], activeVersionId: null, substitutions: [] });
      },
      clearAllData: () => {
        // барлық деректі толық бос етеді (демо деректерсіз, таза бастау)
        set({
          subjects: [], classes: [], teachers: [], rooms: [], komplekts: [],
          versions: [], activeVersionId: null, substitutions: [],
        });
      },
    }),
    {
      name: "raspis-store",
      storage: createJSONStorage(() => localStorage),
      version: 2,
      merge: (persisted, current) => {
        const p = (persisted || {}) as Partial<DataState>;
        return {
          ...current,
          ...p,
          // Жаңа settings өрістері жоқ болса — default-пен толықтыру (миграция)
          settings: {
            ...seedSettings,
            ...(p.settings || {}),
            dayLimits: { ...seedSettings.dayLimits, ...(p.settings?.dayLimits || {}) },
            fatigue: { ...seedSettings.fatigue, ...(p.settings?.fatigue || {}) },
            coeffs: { ...seedSettings.coeffs, ...(p.settings?.coeffs || {}) },
          },
        };
      },
    }
  )
);
export const useActiveVersion = () => {
  const versions = useData((s) => s.versions);
  const id = useData((s) => s.activeVersionId);
  return versions.find((v) => v.id === id) || null;
};
