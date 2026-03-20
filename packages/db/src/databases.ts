import { getDBConstructor } from './pouchdb';

export const DB_NAMES = {
  soil: 'soil_readings',
  market: 'market_prices',
  farmers: 'farmer_profiles',
  subsidies: 'subsidy_distributions',
} as const;

type DBName = (typeof DB_NAMES)[keyof typeof DB_NAMES];

// Cache of opened DB instances
const _cache = new Map<DBName, PouchDB.Database>();

export async function getDatabase(name: DBName): Promise<PouchDB.Database> {
  const cached = _cache.get(name);
  if (cached !== undefined) return cached;

  const Ctor = await getDBConstructor();
  const db = new Ctor(name);
  _cache.set(name, db);
  return db;
}
