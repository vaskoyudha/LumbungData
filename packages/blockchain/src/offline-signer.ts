import { SUBSIDY_LEDGER_ABI } from './contract-abi';

interface SigningResult {
  signedTx: string;
  nonce: number;
  timestamp: number;
}

type LoadedWallet = import('ethers').Wallet | import('ethers').HDNodeWallet;

interface SignDistributionTxArgs {
  wallet?: LoadedWallet;
  encryptedKey?: string;
  pin?: string;
}

const nonceTracker = new Map<string, number>();

export async function signDistributionTx(
  walletOrEncrypted: SignDistributionTxArgs,
  contractAddress: string,
  farmerId: string,
  itemType: string,
  itemName: string,
  quantity: number,
  unit: string,
  chainId = BigInt(1337),
): Promise<SigningResult> {
  const { Wallet, Interface, Transaction } = await import('ethers');

  let wallet: LoadedWallet;

  if (walletOrEncrypted.wallet) {
    wallet = walletOrEncrypted.wallet;
  } else if (walletOrEncrypted.encryptedKey && walletOrEncrypted.pin) {
    wallet = await Wallet.fromEncryptedJson(walletOrEncrypted.encryptedKey, walletOrEncrypted.pin);
  } else {
    throw new Error('Must provide wallet or encryptedKey+pin');
  }

  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error('Quantity must be a positive finite number');
  }

  const iface = new Interface(SUBSIDY_LEDGER_ABI);
  const data = iface.encodeFunctionData('recordDistribution', [
    farmerId,
    itemType,
    itemName,
    BigInt(Math.trunc(quantity)),
    unit,
  ]);

  const nonce = nonceTracker.get(wallet.address) ?? 0;
  nonceTracker.set(wallet.address, nonce + 1);

  const tx = Transaction.from({
    to: contractAddress,
    data,
    nonce,
    chainId,
    gasLimit: BigInt(200_000),
    maxFeePerGas: BigInt(1_000_000_000),
    maxPriorityFeePerGas: BigInt(1_000_000_000),
    type: 2,
  });

  const signedTx = await wallet.signTransaction(tx);

  return {
    signedTx,
    nonce,
    timestamp: Date.now(),
  };
}
