import type { SoilReading } from '@repo/shared';
import { DB_NAMES, getDatabase } from './databases';

// PouchDB document shape — _id is the document key
interface SoilDoc extends PouchDB.Core.IdMeta {
  _rev?: string;
  farmerId: string;
  pH: number;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  moisture: number;
  organicMatter: number;
  notes: string;
  location: string;
  recordedAt: string;
}

function docToReading(doc: SoilDoc): SoilReading {
  return {
    id: doc._id,
    farmerId: doc.farmerId,
    pH: doc.pH,
    nitrogen: doc.nitrogen,
    phosphorus: doc.phosphorus,
    potassium: doc.potassium,
    moisture: doc.moisture,
    organicMatter: doc.organicMatter,
    notes: doc.notes,
    location: doc.location,
    recordedAt: doc.recordedAt,
  };
}

export async function createSoilReading(
  data: Omit<SoilReading, 'id'>,
): Promise<SoilReading> {
  const db = await getDatabase(DB_NAMES.soil);
  const id = crypto.randomUUID();
  const doc: SoilDoc = { _id: id, ...data };
  await db.put(doc);
  return { id, ...data };
}

export async function getSoilReading(id: string): Promise<SoilReading | null> {
  const db = await getDatabase(DB_NAMES.soil);
  try {
    const doc = await db.get<SoilDoc>(id);
    return docToReading(doc as unknown as SoilDoc);
  } catch (_err: unknown) {
    // PouchDB throws a 404 error when document is not found
    return null;
  }
}

export async function listSoilReadings(farmerId: string): Promise<SoilReading[]> {
  const db = await getDatabase(DB_NAMES.soil);
  const result = await db.allDocs<SoilDoc>({ include_docs: true });
  const readings: SoilReading[] = [];
  for (const row of result.rows) {
    if (row.doc != null && row.doc.farmerId === farmerId) {
      readings.push(docToReading(row.doc as unknown as SoilDoc));
    }
  }
  return readings;
}

export async function updateSoilReading(
  id: string,
  data: Partial<Omit<SoilReading, 'id'>>,
): Promise<SoilReading> {
  const db = await getDatabase(DB_NAMES.soil);
  const existing = await db.get<SoilDoc>(id);
  const existingDoc = existing as unknown as SoilDoc;
  const rev = existingDoc._rev;
  if (rev === undefined) throw new Error('Document missing _rev');
  const updated: SoilDoc = {
    _id: id,
    _rev: rev,
    farmerId: data.farmerId ?? existingDoc.farmerId,
    pH: data.pH ?? existingDoc.pH,
    nitrogen: data.nitrogen ?? existingDoc.nitrogen,
    phosphorus: data.phosphorus ?? existingDoc.phosphorus,
    potassium: data.potassium ?? existingDoc.potassium,
    moisture: data.moisture ?? existingDoc.moisture,
    organicMatter: data.organicMatter ?? existingDoc.organicMatter,
    notes: data.notes ?? existingDoc.notes,
    location: data.location ?? existingDoc.location,
    recordedAt: data.recordedAt ?? existingDoc.recordedAt,
  };
  await db.put(updated);
  return docToReading(updated);
}

export async function deleteSoilReading(id: string): Promise<void> {
  const db = await getDatabase(DB_NAMES.soil);
  const doc = await db.get(id);
  await db.remove(doc);
}
