// filepath: src/lib/demoCode.ts
// Демо-режимде деректер енгізуді уақытша ашатын код — тек сатушыға белгілі.
// НАЗАР АУДАР: осы кодты өзгертіп қой, тек сатушымен бөліс.
// Ашылу тек сессия ішінде сақталады (жаңа таб/браузер — қайта жабық).

const DEMO_CODE = "RASPIS2026";
const STORAGE_KEY = "raspis-demo-unlocked";

export function unlockDemo(code: string): boolean {
  if (code.trim().toUpperCase() !== DEMO_CODE) return false;
  sessionStorage.setItem(STORAGE_KEY, "1");
  return true;
}

export function isDemoUnlocked(): boolean {
  return sessionStorage.getItem(STORAGE_KEY) === "1";
}
