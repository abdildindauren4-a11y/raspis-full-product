// filepath: src/lib/notify.ts
// Нақты хабарландырулар — қолданбаның күйінен генерацияланады.
// Диагностика қателері, кесте дайындығы, ресурс жетіспеушілігі негізінде.

import { diagnose, diagSummary } from "@/algorithm/diagnostics";
import type { Klass, Teacher, Room, Subject, School } from "@/algorithm/engine";

export interface AppNotification {
  id: string;
  type: "success" | "warning" | "info" | "error";
  message: string;
  time: string;
}

interface NotifyInput {
  classes: Klass[];
  teachers: Teacher[];
  rooms: Room[];
  subjects: Subject[];
  school?: School;
  hasSchedule: boolean; // кесте жасалған ба
  quality?: number;     // кесте сапасы (бар болса)
}

// Қолданба күйінен хабарландырулар жасау
export function buildNotifications(input: NotifyInput, lang: "kk" | "ru" | "en"): AppNotification[] {
  const notes: AppNotification[] = [];
  const { classes, teachers, rooms, subjects, school, hasSchedule, quality } = input;

  const tr = (kk: string, ru: string, en: string) => (lang === "kk" ? kk : lang === "ru" ? ru : en);
  const now = tr("қазір", "сейчас", "now");

  // Деректер бос па
  if (classes.length === 0) {
    notes.push({
      id: "no-data", type: "info", time: now,
      message: tr("Бастау үшін сынып қосыңыз немесе деректерді импорттаңыз.", "Добавьте классы или импортируйте данные.", "Add classes or import data to begin."),
    });
    return notes;
  }

  // Диагностика қателері
  const diag = diagnose({ classes, teachers, rooms, subjects, school });
  const sum = diagSummary(diag);

  if (sum.errors > 0) {
    notes.push({
      id: "diag-errors", type: "error", time: now,
      message: tr(
        `${sum.errors} маңызды мәселе табылды. Сапа есебі бетінен қараңыз.`,
        `Найдено ${sum.errors} важных проблем. Смотрите отчёт о качестве.`,
        `${sum.errors} critical issues found. Check the quality report.`
      ),
    });
  }
  if (sum.warnings > 0) {
    notes.push({
      id: "diag-warns", type: "warning", time: now,
      message: tr(
        `${sum.warnings} ескерту бар. Кесте сапасын жақсартуға болады.`,
        `${sum.warnings} предупреждений. Можно улучшить качество.`,
        `${sum.warnings} warnings. Schedule quality can be improved.`
      ),
    });
  }

  // Кесте күйі
  if (!hasSchedule) {
    if (sum.errors === 0) {
      notes.push({
        id: "ready-gen", type: "info", time: now,
        message: tr("Деректер дайын. Кесте құруға кірісуге болады.", "Данные готовы. Можно создавать расписание.", "Data is ready. You can generate the schedule."),
      });
    }
  } else {
    // Кесте жасалған — сапасы туралы
    if (quality !== undefined) {
      if (quality >= 85) {
        notes.push({
          id: "quality-high", type: "success", time: now,
          message: tr(`Кесте дайын! Сапа: ${quality}/100 — үздік нәтиже.`, `Расписание готово! Качество: ${quality}/100 — отлично.`, `Schedule ready! Quality: ${quality}/100 — excellent.`),
        });
      } else if (quality >= 60) {
        notes.push({
          id: "quality-mid", type: "success", time: now,
          message: tr(`Кесте дайын. Сапа: ${quality}/100.`, `Расписание готово. Качество: ${quality}/100.`, `Schedule ready. Quality: ${quality}/100.`),
        });
      } else {
        notes.push({
          id: "quality-low", type: "warning", time: now,
          message: tr(`Кесте жасалды, бірақ сапа төмен (${quality}/100). Жақсартуды қарастырыңыз.`, `Расписание создано, но качество низкое (${quality}/100).`, `Schedule created but quality is low (${quality}/100).`),
        });
      }
    }
  }

  // Егер бәрі жақсы болса — оң хабарландыру
  if (notes.length === 0) {
    notes.push({
      id: "all-good", type: "success", time: now,
      message: tr("Бәрі дұрыс! Маңызды мәселе жоқ.", "Всё в порядке! Проблем нет.", "All good! No issues found."),
    });
  }

  return notes;
}
