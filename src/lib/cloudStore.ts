// filepath: src/lib/cloudStore.ts
// Деректерді бұлтқа (Firestore) сақтау/оқу.
// Әр пайдаланушының деректері өз құжатында: schools/{userId}
import { doc, getDoc, setDoc } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import type { Klass, Teacher, Room, Subject, School, Settings } from "@/algorithm/engine";

// Бұлтқа сақталатын деректер пішіні
export interface CloudData {
  school: School;
  settings: Settings;
  subjects: Subject[];
  classes: Klass[];
  teachers: Teacher[];
  rooms: Room[];
  updatedAt: number;
}

// Деректерді бұлтқа сақтау
export async function saveToCloud(userId: string, data: Omit<CloudData, "updatedAt">): Promise<boolean> {
  const db = getDb();
  if (!db) return false;
  try {
    const ref = doc(db, "schools", userId);
    await setDoc(ref, { ...data, updatedAt: Date.now() });
    return true;
  } catch (e) {
    console.error("Бұлтқа сақтау қатесі:", e);
    return false;
  }
}

// Деректерді бұлттан оқу (болмаса null)
export async function loadFromCloud(userId: string): Promise<CloudData | null> {
  const db = getDb();
  if (!db) return null;
  try {
    const ref = doc(db, "schools", userId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return snap.data() as CloudData;
  } catch (e) {
    console.error("Бұлттан оқу қатесі:", e);
    return null;
  }
}
