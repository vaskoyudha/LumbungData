export interface WalletInfo {
  address: string;
  encryptedKey: string;
}

type LoadedWallet = import('ethers').Wallet | import('ethers').HDNodeWallet;

interface WalletDocument {
  _id: string;
  type: 'wallet';
  address: string;
  encryptedKey: string;
  createdAt: string;
}

export async function createWallet(pin: string): Promise<WalletInfo> {
  const { Wallet } = await import('ethers');
  const wallet = Wallet.createRandom();
  const encryptedKey = await wallet.encrypt(pin);

  return {
    address: wallet.address,
    encryptedKey,
  };
}

export async function loadWallet(
  encryptedKey: string,
  pin: string,
): Promise<LoadedWallet> {
  const { Wallet } = await import('ethers');
  return Wallet.fromEncryptedJson(encryptedKey, pin);
}

export async function storeWallet(walletInfo: WalletInfo): Promise<void> {
  const { getDatabase, DB_NAMES } = await import('@repo/db');
  const db = await getDatabase(DB_NAMES.farmers);

  const doc: WalletDocument = {
    _id: `wallet_${walletInfo.address}`,
    type: 'wallet',
    address: walletInfo.address,
    encryptedKey: walletInfo.encryptedKey,
    createdAt: new Date().toISOString(),
  };

  await db.put(doc);
}

export async function loadStoredWallet(address: string): Promise<WalletInfo | null> {
  const { getDatabase, DB_NAMES } = await import('@repo/db');
  const db = await getDatabase(DB_NAMES.farmers);

  try {
    const doc = await db.get<WalletDocument>(`wallet_${address}`);

    if (doc.type !== 'wallet') {
      return null;
    }

    return {
      address: doc.address,
      encryptedKey: doc.encryptedKey,
    };
  } catch {
    return null;
  }
}
