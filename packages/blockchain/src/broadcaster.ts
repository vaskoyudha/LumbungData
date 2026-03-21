import { getPendingTransactions, markBroadcast, markFailed } from './tx-queue';

export async function broadcastPendingTransactions(rpcUrl: string): Promise<void> {
  const pending = await getPendingTransactions();

  if (pending.length === 0) {
    return;
  }

  const { JsonRpcProvider } = await import('ethers');
  const provider = new JsonRpcProvider(rpcUrl);

  for (const tx of pending) {
    try {
      const response = await provider.broadcastTransaction(tx.signedTx);
      await markBroadcast(tx.id, response.hash);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Failed to broadcast transaction ${tx.id}: ${message}`);
      await markFailed(tx.id, message);
    }
  }
}
