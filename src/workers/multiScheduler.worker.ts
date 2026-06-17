// filepath: src/workers/multiScheduler.worker.ts
// Multi-run worker: бірнеше нұсқа жасап, ең жақсысын қайтарады
import { generateMulti } from "../algorithm/engine";
import type { AlgoInput } from "../algorithm/engine";

self.onmessage = (e: MessageEvent<{ input: AlgoInput; count: number }>) => {
  try {
    const { input, count } = e.data;
    const res = generateMulti(input, count, (done, total, bestQuality) => {
      (self as unknown as Worker).postMessage({ type: "progress", done, total, bestQuality });
    });
    (self as unknown as Worker).postMessage({ type: "done", result: res });
  } catch (err) {
    (self as unknown as Worker).postMessage({
      type: "error",
      message: err instanceof Error ? err.message : String(err),
    });
  }
};
