export interface PendingTransaction {
  id: string;
  signedTx: string;
  nonce: number;
  farmerId: string;
  status: 'pending' | 'broadcast' | 'confirmed' | 'failed';
  txHash?: string;
  blockNumber?: number;
  errorMessage?: string;
  queuedAt: string;
}

interface PendingTxDoc extends PouchDB.Core.IdMeta {
  _rev?: string;
  signedTx: string;
  nonce: number;
  farmerId: string;
  status: 'pending' | 'broadcast' | 'confirmed' | 'failed';
  txHash?: string;
  blockNumber?: number;
  errorMessage?: string;
  queuedAt: string;
}

async function getTxDb(): Promise<PouchDB.Database> {
  const { getDatabase, DB_NAMES } = await import('@repo/db');
  return getDatabase(DB_NAMES.pendingTransactions);
}

function docToTransaction(doc: PendingTxDoc): PendingTransaction {
  const tx: PendingTransaction = {
    id: doc._id,
    signedTx: doc.signedTx,
    nonce: doc.nonce,
    farmerId: doc.farmerId,
    status: doc.status,
    queuedAt: doc.queuedAt,
  };

  if (doc.txHash !== undefined) {
    tx.txHash = doc.txHash;
  }
  if (doc.blockNumber !== undefined) {
    tx.blockNumber = doc.blockNumber;
  }
  if (doc.errorMessage !== undefined) {
    tx.errorMessage = doc.errorMessage;
  }

  return tx;
}

export async function queueTransaction(
  signedTx: string,
  nonce: number,
  farmerId: string,
): Promise<string> {
  const db = await getTxDb();
  const id = `tx_${Date.now()}_${crypto.randomUUID()}`;

  const doc: PendingTxDoc = {
    _id: id,
    signedTx,
    nonce,
    farmerId,
    status: 'pending',
    queuedAt: new Date().toISOString(),
  };

  await db.put(doc);
  return id;
}

export async function getPendingTransactions(): Promise<PendingTransaction[]> {
  const db = await getTxDb();
  const result = await db.allDocs<PendingTxDoc>({ include_docs: true });
  const pending: PendingTransaction[] = [];

  for (const row of result.rows) {
    if (row.doc != null && row.doc.status === 'pending') {
      pending.push(docToTransaction(row.doc as unknown as PendingTxDoc));
    }
  }

  pending.sort((a, b) => a.nonce - b.nonce);
  return pending;
}

export async function markBroadcast(id: string, txHash: string): Promise<void> {
  const db = await getTxDb();
  const existing = await db.get<PendingTxDoc>(id);
  const doc = existing as unknown as PendingTxDoc;
  const rev = doc._rev;

  if (rev === undefined) throw new Error('Document missing _rev');

  await db.put({
    ...doc,
    _rev: rev,
    status: 'broadcast' as const,
    txHash,
  });
}

export async function markConfirmed(id: string, blockNumber: number): Promise<void> {
  const db = await getTxDb();
  const existing = await db.get<PendingTxDoc>(id);
  const doc = existing as unknown as PendingTxDoc;
  const rev = doc._rev;

  if (rev === undefined) throw new Error('Document missing _rev');

  await db.put({
    ...doc,
    _rev: rev,
    status: 'confirmed' as const,
    blockNumber,
  });
}

export async function markFailed(id: string, error: string): Promise<void> {
  const db = await getTxDb();
  const existing = await db.get<PendingTxDoc>(id);
  const doc = existing as unknown as PendingTxDoc;
  const rev = doc._rev;

  if (rev === undefined) throw new Error('Document missing _rev');

  await db.put({
    ...doc,
    _rev: rev,
    status: 'failed' as const,
    errorMessage: error,
  });
}
