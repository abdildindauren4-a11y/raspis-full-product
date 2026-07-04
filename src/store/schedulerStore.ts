// filepath: src/store/schedulerStore.ts
// Генерация Worker-ін ЖАҺАНДЫҚ (компоненттен тыс) күйде ұстайды.
//
// Бұрын Worker пен оның прогресі GeneratePage ішіндегі hook-та (useState/useRef)
// тұратын. Пайдаланушы «Генерация» бетінен басқа бетке өтсе, React компонентті
// unmount етіп, hook данасы жойылатын — Worker өзі тоқтамайтын, бірақ оның
// нәтижесі енді ешкімге жетпейтін (onmessage ескі, ажыратылған closure-ге
// жазатын). Бетке қайта кіргенде жаңа hook data=0-ден басталатын, сондықтан
// генерация «тоқтап қалғандай» көрінетін.
//
// Шешім: Worker референсі мен running/pct/result — модуль деңгейіндегі
// Zustand дүкенінде (dataStore секілді), ол React ағашынан тыс өмір сүреді
// және бет ауысса да сақталады.
import { create } from "zustand";
import type { AlgoInput, AlgoResult, MultiResult } from "@/algorithm/engine";

export type GenMode = "full" | "partial" | "deep";

interface SchedulerState {
  mode: GenMode;
  setMode: (m: GenMode) => void;

  // Жалғыз/ішінара генерация
  running: boolean; pct: number; stage: number;
  result: AlgoResult | null; error: string | null;
  worker: Worker | null;
  start: (input: AlgoInput) => void;
  cancel: () => void;
  reset: () => void;

  // Терең іздеу (multi-run)
  multiRunning: boolean; multiDone: number; multiTotal: number; multiBestQuality: number;
  multiResult: MultiResult | null; multiError: string | null;
  multiWorker: Worker | null;
  multiStart: (input: AlgoInput, count: number) => void;
  multiCancel: () => void;
  multiReset: () => void;
}

export const useSchedulerStore = create<SchedulerState>((set, get) => ({
  mode: "full",
  setMode: (m) => set({ mode: m }),

  running: false, pct: 0, stage: 0, result: null, error: null, worker: null,
  start: (input) => {
    get().worker?.terminate();
    const w = new Worker(new URL("../workers/scheduler.worker.ts", import.meta.url), { type: "module" });
    w.onmessage = (e) => {
      const m = e.data;
      if (m.type === "progress") set({ pct: m.pct, stage: m.stage });
      else if (m.type === "done") { set({ result: m.result, running: false, pct: 100 }); w.terminate(); }
      else if (m.type === "error") { set({ error: m.message, running: false }); w.terminate(); }
    };
    set({ running: true, pct: 0, stage: 0, result: null, error: null, worker: w });
    w.postMessage({ input });
  },
  cancel: () => {
    get().worker?.terminate();
    set({ running: false, pct: 0, worker: null });
  },
  reset: () => set({ result: null, error: null, pct: 0, stage: 0 }),

  multiRunning: false, multiDone: 0, multiTotal: 0, multiBestQuality: 0,
  multiResult: null, multiError: null, multiWorker: null,
  multiStart: (input, count) => {
    get().multiWorker?.terminate();
    const w = new Worker(new URL("../workers/multiScheduler.worker.ts", import.meta.url), { type: "module" });
    w.onmessage = (e) => {
      const m = e.data;
      if (m.type === "progress") set({ multiDone: m.done, multiTotal: m.total, multiBestQuality: m.bestQuality });
      else if (m.type === "done") { set({ multiResult: m.result, multiRunning: false }); w.terminate(); }
      else if (m.type === "error") { set({ multiError: m.message, multiRunning: false }); w.terminate(); }
    };
    set({ multiRunning: true, multiDone: 0, multiTotal: count, multiBestQuality: 0, multiResult: null, multiError: null, multiWorker: w });
    w.postMessage({ input, count });
  },
  multiCancel: () => {
    get().multiWorker?.terminate();
    set({ multiRunning: false, multiWorker: null });
  },
  multiReset: () => set({ multiResult: null, multiError: null, multiDone: 0, multiTotal: 0, multiBestQuality: 0 }),
}));
