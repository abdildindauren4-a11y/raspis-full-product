// filepath: src/lib/docRequisitesCloud.ts
// Құжат реквизиттері мен сақталған қолтаңбаларды БҰЛТҚА (Firestore) сақтау —
// осылай кез келген құрылғыдан қолжетімді (тек браузерде емес). Firestore
// қосулы болмаса немесе қате шықса — жергілікті localStorage-пен жұмыс
// жалғаса береді (fail-safe).
import { doc, getDoc, setDoc } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import type { DocRequisites } from "@/lib/procurementDocs";

const REF = { col: "config", id: "docRequisites" };

export async function loadDocRequisitesCloud(): Promise<Partial<DocRequisites> | null> {
  const db = getDb();
  if (!db) return null;
  try {
    const snap = await getDoc(doc(db, REF.col, REF.id));
    return snap.exists() ? (snap.data() as Partial<DocRequisites>) : null;
  } catch {
    return null; // рұқсат жоқ / желі жоқ — жергіліктіге сүйенеміз
  }
}

export async function saveDocRequisitesCloud(r: DocRequisites): Promise<boolean> {
  const db = getDb();
  if (!db) return false;
  try {
    await setDoc(doc(db, REF.col, REF.id), { ...r, updatedAt: Date.now() });
    return true;
  } catch {
    return false;
  }
}
