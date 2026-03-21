import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

let store: Map<string, Record<string, unknown>>;

vi.mock('@repo/db', () => {
  const mockDb = {
    put: vi.fn(async (doc: Record<string, unknown>) => {
      const id = doc['_id'] as string;
      const existing = store.get(id);
      const rev = existing
        ? `${parseInt((existing['_rev'] as string).split('-')[0]!, 10) + 1}-mock`
        : '1-mock';
      store.set(id, { ...doc, _rev: rev });
      return { ok: true, id, rev };
    }),
    get: vi.fn(async (id: string) => {
      const doc = store.get(id);
      if (!doc) {
        const err = new Error('missing') as Error & { status: number };
        err.status = 404;
        throw err;
      }
      return { ...doc };
    }),
    allDocs: vi.fn(async (opts?: { include_docs?: boolean }) => {
      const rows = [...store.entries()].map(([id, doc]) => ({
        id,
        key: id,
        value: { rev: doc['_rev'] as string },
        doc: opts?.include_docs ? { ...doc } : undefined,
      }));
      return { rows, total_rows: rows.length };
    }),
  };

  return {
    getDatabase: vi.fn(async () => mockDb),
    DB_NAMES: {
      soil: 'soil_readings',
      market: 'market_prices',
      farmers: 'farmer_profiles',
      subsidies: 'subsidy_distributions',
      pendingTransactions: 'pending_transactions',
    },
  };
});

let uuidCounter: number;
let mockTimestamp: number;

beforeEach(() => {
  store = new Map();
  uuidCounter = 0;
  mockTimestamp = 1700000000000;

  vi.useFakeTimers({ now: mockTimestamp });

  vi.spyOn(crypto, 'randomUUID').mockImplementation(() => {
    uuidCounter++;
    return `00000000-0000-0000-0000-${String(uuidCounter).padStart(12, '0')}` as ReturnType<typeof crypto.randomUUID>;
  });
});

afterEach(() => {
  vi.useRealTimers();
});

async function loadModule() {
  const mod = await import('../tx-queue');
  return mod;
}

describe('tx-queue', () => {
  describe('queueTransaction', () => {
    it('returns a string ID starting with tx_', async () => {
      const { queueTransaction } = await loadModule();
      const id = await queueTransaction('0xsigned', 0, 'farmer-1');
      expect(typeof id).toBe('string');
      expect(id).toMatch(/^tx_/);
    });

    it('creates a document with status pending', async () => {
      const { queueTransaction } = await loadModule();
      const id = await queueTransaction('0xsigned', 0, 'farmer-1');
      const doc = store.get(id);
      expect(doc).toBeDefined();
      expect(doc!['status']).toBe('pending');
    });

    it('stores the signed tx, nonce, and farmerId correctly', async () => {
      const { queueTransaction } = await loadModule();
      const id = await queueTransaction('0xabcdef', 5, 'farmer-42');
      const doc = store.get(id);
      expect(doc!['signedTx']).toBe('0xabcdef');
      expect(doc!['nonce']).toBe(5);
      expect(doc!['farmerId']).toBe('farmer-42');
    });

    it('includes a queuedAt ISO timestamp', async () => {
      const { queueTransaction } = await loadModule();
      const id = await queueTransaction('0xsigned', 0, 'farmer-1');
      const doc = store.get(id);
      expect(doc!['queuedAt']).toBe(new Date(mockTimestamp).toISOString());
    });

    it('generates unique IDs for multiple calls', async () => {
      const { queueTransaction } = await loadModule();
      const id1 = await queueTransaction('0xsigned1', 0, 'farmer-1');
      vi.setSystemTime(mockTimestamp + 1);
      const id2 = await queueTransaction('0xsigned2', 1, 'farmer-1');
      expect(id1).not.toBe(id2);
    });
  });

  describe('getPendingTransactions', () => {
    it('returns only documents with pending status', async () => {
      const { queueTransaction, getPendingTransactions, markBroadcast } = await loadModule();
      await queueTransaction('0xtx1', 0, 'farmer-1');
      const id2 = await queueTransaction('0xtx2', 1, 'farmer-1');
      await markBroadcast(id2, '0xhash');
      const pending = await getPendingTransactions();
      expect(pending).toHaveLength(1);
      expect(pending[0]!.signedTx).toBe('0xtx1');
    });

    it('returns empty array when no pending transactions', async () => {
      const { getPendingTransactions } = await loadModule();
      const pending = await getPendingTransactions();
      expect(pending).toHaveLength(0);
    });

    it('sorts pending transactions by nonce ascending', async () => {
      const { queueTransaction, getPendingTransactions } = await loadModule();
      await queueTransaction('0xtx-high', 10, 'farmer-1');
      vi.setSystemTime(mockTimestamp + 1);
      await queueTransaction('0xtx-low', 2, 'farmer-1');
      vi.setSystemTime(mockTimestamp + 2);
      await queueTransaction('0xtx-mid', 5, 'farmer-1');
      const pending = await getPendingTransactions();
      expect(pending).toHaveLength(3);
      expect(pending[0]!.nonce).toBe(2);
      expect(pending[1]!.nonce).toBe(5);
      expect(pending[2]!.nonce).toBe(10);
    });

    it('returns PendingTransaction objects with correct shape', async () => {
      const { queueTransaction, getPendingTransactions } = await loadModule();
      await queueTransaction('0xsigned', 0, 'farmer-1');
      const pending = await getPendingTransactions();
      const tx = pending[0]!;
      expect(tx).toHaveProperty('id');
      expect(tx).toHaveProperty('signedTx');
      expect(tx).toHaveProperty('nonce');
      expect(tx).toHaveProperty('farmerId');
      expect(tx).toHaveProperty('status');
      expect(tx).toHaveProperty('queuedAt');
    });
  });

  describe('markBroadcast', () => {
    it('updates status to broadcast and sets txHash', async () => {
      const { queueTransaction, markBroadcast } = await loadModule();
      const id = await queueTransaction('0xsigned', 0, 'farmer-1');
      await markBroadcast(id, '0xhash123');
      const doc = store.get(id);
      expect(doc!['status']).toBe('broadcast');
      expect(doc!['txHash']).toBe('0xhash123');
    });
  });

  describe('markConfirmed', () => {
    it('updates status to confirmed and sets blockNumber', async () => {
      const { queueTransaction, markConfirmed } = await loadModule();
      const id = await queueTransaction('0xsigned', 0, 'farmer-1');
      await markConfirmed(id, 42);
      const doc = store.get(id);
      expect(doc!['status']).toBe('confirmed');
      expect(doc!['blockNumber']).toBe(42);
    });
  });

  describe('markFailed', () => {
    it('updates status to failed and sets errorMessage', async () => {
      const { queueTransaction, markFailed } = await loadModule();
      const id = await queueTransaction('0xsigned', 0, 'farmer-1');
      await markFailed(id, 'insufficient gas');
      const doc = store.get(id);
      expect(doc!['status']).toBe('failed');
      expect(doc!['errorMessage']).toBe('insufficient gas');
    });
  });
});
