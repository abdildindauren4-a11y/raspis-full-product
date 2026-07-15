// filepath: src/workers/scheduler.worker.ts
import { generate } from "../algorithm/engine";
import { generate2 } from "../algorithm2";
import { generateShzhm } from "../algorithm/shzhm";
import type { AlgoInput } from "../algorithm/engine";
import type { EngineV2Config } from "../algorithm2";
import type { EngineId } from "../lib/engines";

self.onmessage = (e: MessageEvent<{ input: AlgoInput; engine?: EngineId; config?: EngineV2Config }>) => {
  try {
    const { input, engine, config } = e.data;
    const onProgress = (pct: number, stage: number) =>
      (self as unknown as Worker).postMessage({ type: "progress", pct, stage });
    // Модель таңдауы: ШЖМ (v3), Хамелеон (v2) немесе Классик (v1)
    const result = engine === "v3"
      ? generateShzhm(input, onProgress)
      : engine === "v2"
        ? generate2(input, config, onProgress)
        : generate(input, onProgress);
    (self as unknown as Worker).postMessage({ type: "done", result });
  } catch (err) {
    (self as unknown as Worker).postMessage({ type: "error", message: err instanceof Error ? err.message : String(err) });
  }
};
