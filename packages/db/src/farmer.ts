import type { FarmerProfile } from '@repo/shared';
import { DB_NAMES, getDatabase } from './databases';

interface FarmerDoc extends PouchDB.Core.IdMeta {
  _rev?: string;
  name: string;
  village: string;
  phone: string;
  createdAt: string;
}

function docToProfile(doc: FarmerDoc): FarmerProfile {
  return {
    id: doc._id,
    name: doc.name,
    village: doc.village,
    phone: doc.phone,
    createdAt: doc.createdAt,
  };
}

export async function createFarmerProfile(
  data: Omit<FarmerProfile, 'id'>,
): Promise<FarmerProfile> {
  const db = await getDatabase(DB_NAMES.farmers);
  const id = crypto.randomUUID();
  const doc: FarmerDoc = { _id: id, ...data };
  await db.put(doc);
  return { id, ...data };
}

export async function getFarmerProfile(id: string): Promise<FarmerProfile | null> {
  const db = await getDatabase(DB_NAMES.farmers);
  try {
    const doc = await db.get<FarmerDoc>(id);
    return docToProfile(doc as unknown as FarmerDoc);
  } catch (_err: unknown) {
    // PouchDB throws a 404 error when document is not found
    return null;
  }
}

export async function listFarmerProfiles(): Promise<FarmerProfile[]> {
  const db = await getDatabase(DB_NAMES.farmers);
  const result = await db.allDocs<FarmerDoc>({ include_docs: true });
  const profiles: FarmerProfile[] = [];
  for (const row of result.rows) {
    if (row.doc != null) {
      profiles.push(docToProfile(row.doc as unknown as FarmerDoc));
    }
  }
  return profiles;
}

export async function updateFarmerProfile(
  id: string,
  data: Partial<Omit<FarmerProfile, 'id'>>,
): Promise<FarmerProfile> {
  const db = await getDatabase(DB_NAMES.farmers);
  const existing = await db.get<FarmerDoc>(id);
  const existingDoc = existing as unknown as FarmerDoc;
  const rev = existingDoc._rev;
  if (rev === undefined) throw new Error('Document missing _rev');
  const updated: FarmerDoc = {
    _id: id,
    _rev: rev,
    name: data.name ?? existingDoc.name,
    village: data.village ?? existingDoc.village,
    phone: data.phone ?? existingDoc.phone,
    createdAt: data.createdAt ?? existingDoc.createdAt,
  };
  await db.put(updated);
  return docToProfile(updated);
}

export async function deleteFarmerProfile(id: string): Promise<void> {
  const db = await getDatabase(DB_NAMES.farmers);
  const doc = await db.get(id);
  await db.remove(doc);
}
