import { describe, it, expect, vi, beforeEach } from 'vitest';

let dbStore: Map<string, Record<string, unknown>>;

const mockSignTransaction = vi.fn(async () => '0xsigned-transaction-data');

vi.mock('ethers', () => {
  const fakeWallet = {
    address: '0x1234567890abcdef1234567890abcdef12345678',
    encrypt: vi.fn(async () => '{"encrypted":"json","address":"0x1234"}'),
    signTransaction: mockSignTransaction,
  };

  class MockInterface {
    encodeFunctionData() {
      return '0xencoded-call-data';
    }
  }

  return {
    Wallet: {
      createRandom: vi.fn(() => fakeWallet),
      fromEncryptedJson: vi.fn(async (_json: string, _pin: string) => fakeWallet),
    },
    Interface: MockInterface,
    Transaction: {
      from: vi.fn((txData: Record<string, unknown>) => ({
        ...txData,
        serialized: '0xserialized-tx',
      })),
    },
  };
});

vi.mock('@repo/db', () => {
  const mockDb = {
    put: vi.fn(async (doc: Record<string, unknown>) => {
      const id = doc['_id'] as string;
      const existing = dbStore.get(id);
      const rev = existing
        ? `${parseInt((existing['_rev'] as string).split('-')[0]!, 10) + 1}-mock`
        : '1-mock';
      dbStore.set(id, { ...doc, _rev: rev });
      return { ok: true, id, rev };
    }),
    get: vi.fn(async (id: string) => {
      const doc = dbStore.get(id);
      if (!doc) {
        const err = new Error('missing') as Error & { status: number };
        err.status = 404;
        throw err;
      }
      return { ...doc };
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

beforeEach(() => {
  dbStore = new Map();
  vi.clearAllMocks();
  mockSignTransaction.mockResolvedValue('0xsigned-transaction-data');
});

describe('wallet', () => {
  async function loadWalletModule() {
    return import('../wallet');
  }

  describe('createWallet', () => {
    it('returns a WalletInfo with address and encryptedKey', async () => {
      const { createWallet } = await loadWalletModule();
      const info = await createWallet('1234');
      expect(info.address).toBe('0x1234567890abcdef1234567890abcdef12345678');
      expect(info.encryptedKey).toBe('{"encrypted":"json","address":"0x1234"}');
    });

    it('calls Wallet.createRandom and encrypt with pin', async () => {
      const { Wallet } = await import('ethers');
      const { createWallet } = await loadWalletModule();
      await createWallet('mypin');
      expect(Wallet.createRandom).toHaveBeenCalled();
    });
  });

  describe('storeWallet', () => {
    it('persists wallet document with correct _id format', async () => {
      const { storeWallet } = await loadWalletModule();
      await storeWallet({
        address: '0xABC',
        encryptedKey: '{"enc":"data"}',
      });
      const doc = dbStore.get('wallet_0xABC');
      expect(doc).toBeDefined();
      expect(doc!['type']).toBe('wallet');
      expect(doc!['address']).toBe('0xABC');
      expect(doc!['encryptedKey']).toBe('{"enc":"data"}');
    });
  });

  describe('loadStoredWallet', () => {
    it('returns WalletInfo when wallet exists in db', async () => {
      const { storeWallet, loadStoredWallet } = await loadWalletModule();
      await storeWallet({
        address: '0xDEF',
        encryptedKey: '{"enc":"key"}',
      });
      const loaded = await loadStoredWallet('0xDEF');
      expect(loaded).not.toBeNull();
      expect(loaded!.address).toBe('0xDEF');
      expect(loaded!.encryptedKey).toBe('{"enc":"key"}');
    });

    it('returns null when wallet does not exist', async () => {
      const { loadStoredWallet } = await loadWalletModule();
      const loaded = await loadStoredWallet('0xNONEXISTENT');
      expect(loaded).toBeNull();
    });
  });
});

describe('signDistributionTx', () => {
  async function loadSignerModule() {
    return import('../offline-signer');
  }

  it('returns a SigningResult with signedTx, nonce, and timestamp', async () => {
    const { Wallet } = await import('ethers');
    const wallet = Wallet.createRandom();
    const { signDistributionTx } = await loadSignerModule();

    const result = await signDistributionTx(
      { wallet },
      '0xContractAddress',
      '0xFarmerId',
      'seed',
      'Padi IR64',
      50,
      'kg',
    );

    expect(typeof result.signedTx).toBe('string');
    expect(typeof result.nonce).toBe('number');
    expect(typeof result.timestamp).toBe('number');
  });

  it('uses encryptedKey+pin when wallet is not provided', async () => {
    const { Wallet } = await import('ethers');
    const { signDistributionTx } = await loadSignerModule();

    const result = await signDistributionTx(
      { encryptedKey: '{"enc":"json"}', pin: '1234' },
      '0xContractAddress',
      '0xFarmerId',
      'fertilizer',
      'Urea',
      100,
      'kg',
    );

    expect(Wallet.fromEncryptedJson).toHaveBeenCalledWith('{"enc":"json"}', '1234');
    expect(result.signedTx).toBe('0xsigned-transaction-data');
  });

  it('throws when neither wallet nor encryptedKey+pin provided', async () => {
    const { signDistributionTx } = await loadSignerModule();

    await expect(
      signDistributionTx(
        {},
        '0xContractAddress',
        '0xFarmerId',
        'seed',
        'Padi',
        10,
        'kg',
      ),
    ).rejects.toThrow('Must provide wallet or encryptedKey+pin');
  });

  it('throws when quantity is zero or negative', async () => {
    const { Wallet } = await import('ethers');
    const wallet = Wallet.createRandom();
    const { signDistributionTx } = await loadSignerModule();

    await expect(
      signDistributionTx(
        { wallet },
        '0xContractAddress',
        '0xFarmerId',
        'seed',
        'Padi',
        0,
        'kg',
      ),
    ).rejects.toThrow('Quantity must be a positive finite number');

    await expect(
      signDistributionTx(
        { wallet },
        '0xContractAddress',
        '0xFarmerId',
        'seed',
        'Padi',
        -5,
        'kg',
      ),
    ).rejects.toThrow('Quantity must be a positive finite number');
  });

  it('increments nonce for successive calls with same wallet', async () => {
    const { Wallet } = await import('ethers');
    const wallet = Wallet.createRandom();
    const { signDistributionTx } = await loadSignerModule();

    const result1 = await signDistributionTx(
      { wallet },
      '0xContract',
      '0xFarmer',
      'seed',
      'Padi',
      10,
      'kg',
    );
    const result2 = await signDistributionTx(
      { wallet },
      '0xContract',
      '0xFarmer',
      'seed',
      'Padi',
      20,
      'kg',
    );

    expect(result2.nonce).toBe(result1.nonce + 1);
  });
});
