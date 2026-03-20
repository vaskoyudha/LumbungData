import type PouchDBStatic from 'pouchdb-core';

// Lazy singleton — dynamically imports PouchDB only when first used
// This ensures PouchDB is NOT in the initial JS bundle
let _constructor: typeof PouchDBStatic | null = null;

export async function getDBConstructor(): Promise<typeof PouchDBStatic> {
  if (_constructor !== null) return _constructor;

  const [pouchCore, idbMod, replMod, findMod] = await Promise.all([
    import('pouchdb-core'),
    import('pouchdb-adapter-indexeddb'),
    import('pouchdb-replication'),
    import('pouchdb-find'),
  ]);

  const PouchDB = pouchCore.default;
  PouchDB.plugin(idbMod.default);
  PouchDB.plugin(replMod as PouchDB.Plugin);
  PouchDB.plugin(findMod.default);

  _constructor = PouchDB;
  return _constructor;
}
