// Types re-exported from shared package
export type {
  SoilReading,
  FarmerProfile,
  MarketPrice,
  SubsidyDistribution,
  SyncStatus,
} from '@repo/shared';

// Soil CRUD
export {
  createSoilReading,
  getSoilReading,
  listSoilReadings,
  updateSoilReading,
  deleteSoilReading,
} from './soil';

// Farmer CRUD
export {
  createFarmerProfile,
  getFarmerProfile,
  listFarmerProfiles,
  updateFarmerProfile,
  deleteFarmerProfile,
} from './farmer';

// Market CRUD
export {
  createMarketPrice,
  getMarketPrice,
  listMarketPrices,
  listMarketPricesByCrop,
  getLatestPrices,
  updateMarketPrice,
  deleteMarketPrice,
} from './market';

// Subsidy CRUD
export {
  createDistribution,
  getDistribution,
  listDistributions,
  listPendingDistributions,
  updateDistribution,
  deleteDistribution,
} from './subsidy';

// Database utilities
export { getDatabase, DB_NAMES } from './databases';
export { getDBConstructor } from './pouchdb';

// Storage quota monitoring
export {
  getStorageEstimate,
  isStorageLow,
  requestPersistentStorage,
  cleanupSyncedData,
} from './storage';
export type { StorageEstimate } from './storage';

export { startSync } from './sync';
export type { SyncHandle } from './sync';
export { resolveConflicts } from './conflict-resolution';
export { SyncManager } from './sync-manager';
export type { SyncState } from './sync-manager';
