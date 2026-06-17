// filepath: src/hooks/useScheduler.ts
import { useRef, useState, useCallback } from "react";
import type { AlgoInput, AlgoResult } from "@/algorithm/engine";

export const STAGES = [
  "Дайындық және валидация", "Матрицалар құру", "Приоритет кезегі",
  "Greedy орналастыру", "Maximin теңгерімі", "Мұғалім жайлылығы",
  "Стресс-тест + сапа есебі",
];

export function useScheduler() {
  const workerRef = useRef<Worker | null>(null);
  const [running, setRunning] = useState(false);
  const [pct, setPct] = useState(0);
  const [stage, setStage] = useState(0);
  const [result, setResult] = useState<AlgoResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const start = useCallback((input: AlgoInput) => {
    setRunning(true); setPct(0); setStage(0); setResult(null); setError(null);
    const w = new Worker(new URL("../workers/scheduler.worker.ts", import.meta.url), { type: "module" });
    workerRef.current = w;
    w.onmessage = (e) => {
      const m = e.data;
      if (m.type === "progress") { setPct(m.pct); setStage(m.stage); }
      else if (m.type === "done") { setResult(m.result); setRunning(false); setPct(100); w.terminate(); }
      else if (m.type === "error") { setError(m.message); setRunning(false); w.terminate(); }
    };
    w.postMessage({ input });
  }, []);

  const cancel = useCallback(() => {
    workerRef.current?.terminate();
    setRunning(false); setPct(0);
  }, []);

  const reset = useCallback(() => { setResult(null); setError(null); setPct(0); setStage(0); }, []);

  return { running, pct, stage, result, error, start, cancel, reset };
}
