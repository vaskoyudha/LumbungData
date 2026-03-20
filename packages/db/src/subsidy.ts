import type { SubsidyDistribution } from '@repo/shared';
import { DB_NAMES, getDatabase } from './databases';

interface SubsidyDoc extends PouchDB.Core.IdMeta {
  _rev?: string;
  farmerId: string;
  itemType: 'seed' | 'fertilizer';
  itemName: string;
  quantity: number;
  unit: string;
  distributorId: string;
  signature: string;
  timestamp: string;
  txHash?: string;
}

function docToDistribution(doc: SubsidyDoc): SubsidyDistribution {
  const result: SubsidyDistribution = {
    id: doc._id,
    farmerId: doc.farmerId,
    itemType: doc.itemType,
    itemName: doc.itemName,
    quantity: doc.quantity,
    unit: doc.unit,
    distributorId: doc.distributorId,
    signature: doc.signature,
    timestamp: doc.timestamp,
  };
  if (doc.txHash !== undefined) {
    result.txHash = doc.txHash;
  }
  return result;
}

export async function createDistribution(
  data: Omit<SubsidyDistribution, 'id'>,
): Promise<SubsidyDistribution> {
  const db = await getDatabase(DB_NAMES.subsidies);
  const id = crypto.randomUUID();
  const doc: SubsidyDoc = {
    _id: id,
    farmerId: data.farmerId,
    itemType: data.itemType,
    itemName: data.itemName,
    quantity: data.quantity,
    unit: data.unit,
    distributorId: data.distributorId,
    signature: data.signature,
    timestamp: data.timestamp,
  };
  if (data.txHash !== undefined) {
    doc.txHash = data.txHash;
  }
  await db.put(doc);
  const result: SubsidyDistribution = {
    id,
    farmerId: data.farmerId,
    itemType: data.itemType,
    itemName: data.itemName,
    quantity: data.quantity,
    unit: data.unit,
    distributorId: data.distributorId,
    signature: data.signature,
    timestamp: data.timestamp,
  };
  if (data.txHash !== undefined) {
    result.txHash = data.txHash;
  }
  return result;
}

export async function getDistribution(id: string): Promise<SubsidyDistribution | null> {
  const db = await getDatabase(DB_NAMES.subsidies);
  try {
    const doc = await db.get<SubsidyDoc>(id);
    return docToDistribution(doc as unknown as SubsidyDoc);
  } catch (_err: unknown) {
    // PouchDB throws a 404 error when document is not found
    return null;
  }
}

export async function listDistributions(farmerId: string): Promise<SubsidyDistribution[]> {
  const db = await getDatabase(DB_NAMES.subsidies);
  const result = await db.allDocs<SubsidyDoc>({ include_docs: true });
  const distributions: SubsidyDistribution[] = [];
  for (const row of result.rows) {
    if (row.doc != null && row.doc.farmerId === farmerId) {
      distributions.push(docToDistribution(row.doc as unknown as SubsidyDoc));
    }
  }
  return distributions;
}

export async function listPendingDistributions(): Promise<SubsidyDistribution[]> {
  const db = await getDatabase(DB_NAMES.subsidies);
  const result = await db.allDocs<SubsidyDoc>({ include_docs: true });
  const distributions: SubsidyDistribution[] = [];
  for (const row of result.rows) {
    if (row.doc != null) {
      const doc = row.doc as unknown as SubsidyDoc;
      if (doc.txHash === undefined || doc.txHash === null) {
        distributions.push(docToDistribution(doc));
      }
    }
  }
  return distributions;
}

export async function updateDistribution(
  id: string,
  data: Partial<Omit<SubsidyDistribution, 'id'>>,
): Promise<SubsidyDistribution> {
  const db = await getDatabase(DB_NAMES.subsidies);
  const existing = await db.get<SubsidyDoc>(id);
  const existingDoc = existing as unknown as SubsidyDoc;
  const rev = existingDoc._rev;
  if (rev === undefined) throw new Error('Document missing _rev');
  const updated: SubsidyDoc = {
    _id: id,
    _rev: rev,
    farmerId: data.farmerId ?? existingDoc.farmerId,
    itemType: data.itemType ?? existingDoc.itemType,
    itemName: data.itemName ?? existingDoc.itemName,
    quantity: data.quantity ?? existingDoc.quantity,
    unit: data.unit ?? existingDoc.unit,
    distributorId: data.distributorId ?? existingDoc.distributorId,
    signature: data.signature ?? existingDoc.signature,
    timestamp: data.timestamp ?? existingDoc.timestamp,
  };
  if (data.txHash !== undefined) {
    updated.txHash = data.txHash;
  } else if (existingDoc.txHash !== undefined) {
    updated.txHash = existingDoc.txHash;
  }
  await db.put(updated);
  return docToDistribution(updated);
}

export async function deleteDistribution(id: string): Promise<void> {
  const db = await getDatabase(DB_NAMES.subsidies);
  const doc = await db.get(id);
  await db.remove(doc);
}
