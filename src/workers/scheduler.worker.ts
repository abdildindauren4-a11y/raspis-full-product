// filepath: src/workers/scheduler.worker.ts
import { generate } from "../algorithm/engine";
import type { AlgoInput } from "../algorithm/engine";

self.onmessage = (e: MessageEvent<{ input: AlgoInput }>) => {
  try {
    const result = generate(e.data.input, (pct, stage) => {
      (self as unknown as Worker).postMessage({ type: "progress", pct, stage });
    });
    (self as unknown as Worker).postMessage({ type: "done", result });
  } catch (err) {
    (self as unknown as Worker).postMessage({ type: "error", message: err instanceof Error ? err.message : String(err) });
  }
};
