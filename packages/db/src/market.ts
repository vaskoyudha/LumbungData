import type { MarketPrice } from '@repo/shared';
import { DB_NAMES, getDatabase } from './databases';

// PouchDB document shape — _id is the document key
interface MarketDoc extends PouchDB.Core.IdMeta {
  _rev?: string;
  cropType: string;
  pricePerKg: number;
  currency: 'IDR';
  location: string;
  qualityGrade: 'A' | 'B' | 'C';
  reportedBy: string;
  reportedAt: string;
}

function docToPrice(doc: MarketDoc): MarketPrice {
  return {
    id: doc._id,
    cropType: doc.cropType,
    pricePerKg: doc.pricePerKg,
    currency: doc.currency,
    location: doc.location,
    qualityGrade: doc.qualityGrade,
    reportedBy: doc.reportedBy,
    reportedAt: doc.reportedAt,
  };
}

export async function createMarketPrice(
  data: Omit<MarketPrice, 'id'>,
): Promise<MarketPrice> {
  const db = await getDatabase(DB_NAMES.market);
  const id = crypto.randomUUID();
  const doc: MarketDoc = { _id: id, ...data };
  await db.put(doc);
  return { id, ...data };
}

export async function getMarketPrice(id: string): Promise<MarketPrice | null> {
  const db = await getDatabase(DB_NAMES.market);
  try {
    const doc = await db.get<MarketDoc>(id);
    return docToPrice(doc as unknown as MarketDoc);
  } catch (_err: unknown) {
    // PouchDB throws a 404 error when document is not found
    return null;
  }
}

export async function listMarketPrices(location?: string): Promise<MarketPrice[]> {
  const db = await getDatabase(DB_NAMES.market);
  const result = await db.allDocs<MarketDoc>({ include_docs: true });
  const prices: MarketPrice[] = [];
  for (const row of result.rows) {
    if (row.doc != null) {
      const price = docToPrice(row.doc as unknown as MarketDoc);
      if (location === undefined || price.location === location) {
        prices.push(price);
      }
    }
  }
  return prices;
}

export async function listMarketPricesByCrop(cropType: string): Promise<MarketPrice[]> {
  const db = await getDatabase(DB_NAMES.market);
  const result = await db.allDocs<MarketDoc>({ include_docs: true });
  const prices: MarketPrice[] = [];
  for (const row of result.rows) {
    if (row.doc != null && row.doc.cropType === cropType) {
      prices.push(docToPrice(row.doc as unknown as MarketDoc));
    }
  }
  return prices;
}

export async function getLatestPrices(location: string, limit: number): Promise<MarketPrice[]> {
  const all = await listMarketPrices(location);
  return all
    .sort((a, b) => b.reportedAt.localeCompare(a.reportedAt))
    .slice(0, limit);
}

export async function updateMarketPrice(
  id: string,
  data: Partial<Omit<MarketPrice, 'id'>>,
): Promise<MarketPrice> {
  const db = await getDatabase(DB_NAMES.market);
  const existing = await db.get<MarketDoc>(id);
  const existingDoc = existing as unknown as MarketDoc;
  const rev = existingDoc._rev;
  if (rev === undefined) throw new Error('Document missing _rev');
  const updated: MarketDoc = {
    _id: id,
    _rev: rev,
    cropType: data.cropType ?? existingDoc.cropType,
    pricePerKg: data.pricePerKg ?? existingDoc.pricePerKg,
    currency: data.currency ?? existingDoc.currency,
    location: data.location ?? existingDoc.location,
    qualityGrade: data.qualityGrade ?? existingDoc.qualityGrade,
    reportedBy: data.reportedBy ?? existingDoc.reportedBy,
    reportedAt: data.reportedAt ?? existingDoc.reportedAt,
  };
  await db.put(updated);
  return docToPrice(updated);
}

export async function deleteMarketPrice(id: string): Promise<void> {
  const db = await getDatabase(DB_NAMES.market);
  const doc = await db.get(id);
  await db.remove(doc);
}
