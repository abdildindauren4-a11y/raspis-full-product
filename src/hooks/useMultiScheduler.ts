// filepath: src/hooks/useMultiScheduler.ts
import { useRef, useState, useCallback } from "react";
import type { AlgoInput, MultiResult } from "@/algorithm/engine";

export function useMultiScheduler() {
  const workerRef = useRef<Worker | null>(null);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);
  const [total, setTotal] = useState(0);
  const [bestQuality, setBestQuality] = useState(0);
  const [result, setResult] = useState<MultiResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const start = useCallback((input: AlgoInput, count: number) => {
    setRunning(true); setDone(0); setTotal(count); setBestQuality(0);
    setResult(null); setError(null);
    const w = new Worker(new URL("../workers/multiScheduler.worker.ts", import.meta.url), { type: "module" });
    workerRef.current = w;
    w.onmessage = (e) => {
      const m = e.data;
      if (m.type === "progress") {
        setDone(m.done); setTotal(m.total); setBestQuality(m.bestQuality);
      } else if (m.type === "done") {
        setResult(m.result); setRunning(false); w.terminate();
      } else if (m.type === "error") {
        setError(m.message); setRunning(false); w.terminate();
      }
    };
    w.postMessage({ input, count });
  }, []);

  const cancel = useCallback(() => {
    workerRef.current?.terminate();
    setRunning(false);
  }, []);

  const reset = useCallback(() => {
    setResult(null); setError(null); setDone(0); setTotal(0); setBestQuality(0);
  }, []);

  return { running, done, total, bestQuality, result, error, start, cancel, reset };
}
