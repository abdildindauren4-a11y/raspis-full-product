// filepath: src/hooks/useMultiScheduler.ts
// Жұқа қабық: нақты Worker/күй schedulerStore-де (жаһандық, бет ауысса да сақталады).
import { useSchedulerStore } from "@/store/schedulerStore";

export function useMultiScheduler() {
  const running = useSchedulerStore((s) => s.multiRunning);
  const done = useSchedulerStore((s) => s.multiDone);
  const total = useSchedulerStore((s) => s.multiTotal);
  const bestQuality = useSchedulerStore((s) => s.multiBestQuality);
  const result = useSchedulerStore((s) => s.multiResult);
  const error = useSchedulerStore((s) => s.multiError);
  const start = useSchedulerStore((s) => s.multiStart);
  const cancel = useSchedulerStore((s) => s.multiCancel);
  const reset = useSchedulerStore((s) => s.multiReset);
  return { running, done, total, bestQuality, result, error, start, cancel, reset };
}
