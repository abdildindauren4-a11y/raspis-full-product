// filepath: src/hooks/useScheduler.ts
// Жұқа қабық: нақты Worker/күй schedulerStore-де (жаһандық, бет ауысса да сақталады).
import { useSchedulerStore } from "@/store/schedulerStore";

export const STAGES = [
  "Дайындық және валидация", "Матрицалар құру", "Приоритет кезегі",
  "Greedy орналастыру", "Maximin теңгерімі", "Мұғалім жайлылығы",
  "Стресс-тест + сапа есебі",
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
