// filepath: src/lib/versionCheck.ts
// АВТО-ЖАҢАРТУ: браузер (әсіресе iOS Safari) ескі кэштелген бундлды ұстап
// қалатын — пайдаланушы жаңа функцияларды/түзетулерді көрмей, тіпті ескі
// логика деректі бұзатын (мыс. ескі СанПиН толтыру қысылған балл жазатын).
// Шешім: build кезінде dist/version.json жазылады (сол build-тің таңбасы);
// қосымша ашылғанда және бет фокусқа оралғанда серверден version.json-ды
// кэшсіз оқып, өз таңбасымен (__BUILD_ID__) салыстырамыз. Сәйкес келмесе —
// бетті кэш-бұзғыш параметрмен бір рет қайта жүктейміз (шексіз цикл болмауы
// үшін sessionStorage-та белгі қаламыз).
declare const __BUILD_ID__: string;

const RELOAD_KEY = "raspis-ver-reload";

async function serverVersion(): Promise<string | null> {
  try {
    const res = await fetch(`/version.json?_=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return null;
    const j = (await res.json()) as { v?: string };
    return j.v || null;
  } catch {
    return null;
  }
}

async function check(): Promise<void> {
  const sv = await serverVersion();
  if (!sv || sv === __BUILD_ID__) return; // сервер қолжетімсіз не нұсқа бірдей
  // Осы сервер-нұсқаға бұрын reload жасалды ма (цикл қорғанысы)
  if (sessionStorage.getItem(RELOAD_KEY) === sv) return;
  sessionStorage.setItem(RELOAD_KEY, sv);
  // Кэш-бұзғыш параметрмен қайта жүктеу — index.html жаңасын алады
  const url = new URL(window.location.href);
  url.searchParams.set("v", sv);
  window.location.replace(url.toString());
}

/** Қосымша басында бір рет шақырылады (main.tsx). */
export function initVersionCheck(): void {
  if (typeof window === "undefined" || !import.meta.env.PROD) return;
  void check();
  // Бет фонға кетіп, қайта оралғанда да тексереміз (мобильде жиі сценарий)
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void check();
  });
}
