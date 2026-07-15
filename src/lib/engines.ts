// filepath: src/lib/engines.ts
// Алгоритм-модельдер реестрі — ЖИ-чаттардағы модель таңдағыш сияқты.
// Жаңа модель қосу = осы массивке бір жазба. UI ауыстырғышы (M2-де қосылады)
// осы тізімнен оқиды; әр модельдің ӨЗ баптау кеңістігі бар (engineConfigs).

export type EngineId = "v1" | "v2" | "v3";

export interface EngineInfo {
  id: EngineId;
  name: string;
  tagline: string; // бір жолдық сипаттама (ауыстырғыштағы кіші мәтін)
  beta?: boolean;
}

export const ENGINES: EngineInfo[] = [
  {
    id: "v1",
    name: "РАСПИС Классик",
    tagline: "Тұрақты, мыңдаған кестеде дәлелденген",
  },
  {
    id: "v2",
    name: "РАСПИС Хамелеон",
    tagline: "Икемді — мектептің өз ережелерімен бапталады",
    beta: true,
  },
  {
    id: "v3",
    name: "РАСПИС ШЖМ",
    tagline: "Шағын жинақты мектеп — класс-комплект кестесі",
    beta: true,
  },
];

export const DEFAULT_ENGINE: EngineId = "v1"; // M7-де "v2" болады
// ШЖМ мектебінде тек осы қозғалтқыш қолданылады (комплект-кестелеу)
export const SHZHM_ENGINE: EngineId = "v3";

export const engineById = (id: string | undefined): EngineInfo =>
  ENGINES.find((e) => e.id === id) || ENGINES[0];
