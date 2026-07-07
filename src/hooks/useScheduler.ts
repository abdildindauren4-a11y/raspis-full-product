// filepath: src/hooks/useScheduler.ts
// Жұқа қабық: нақты Worker/күй schedulerStore-де (жаһандық, бет ауысса да сақталады).
import { useSchedulerStore } from "@/store/schedulerStore";

export const STAGES = [
  "Деректерді талдау", "18+ ережені тексеру", "Ықтимал нұсқаларды бағалау",
  "Ең тиімді орналастыруды құру", "Жүктемені теңестіру", "Мұғалім жайлылығын оңтайландыру",
  "Сапаны тексеру және растау",
];

export function useScheduler() {
  const running = useSchedulerStore((s) => s.running);
  const pct = useSchedulerStore((s) => s.pct);
  const stage = useSchedulerStore((s) => s.stage);
  const result = useSchedulerStore((s) => s.result);
  const error = useSchedulerStore((s) => s.error);
  const start = useSchedulerStore((s) => s.start);
  const cancel = useSchedulerStore((s) => s.cancel);
  const reset = useSchedulerStore((s) => s.reset);
  return { running, pct, stage, result, error, start, cancel, reset };
}
