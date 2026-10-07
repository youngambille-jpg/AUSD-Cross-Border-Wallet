export const MONAD_TESTNET = {
  chainId: 10143,
  name: 'Monad Testnet',
  rpcUrl: 'https://testnet-rpc.monad.xyz',
  contractAddress: '0x8468587Af422ad440F58a57E955eCA6A970b5375',
  explorerUrl:
    'https://testnet.monadvision.com/address/0x8468587Af422ad440F58a57E955eCA6A970b5375?tab=Contract',
};

export interface ContractCheck {
  contractPresent: boolean;
  checkedAt: string;
}

export async function checkSettlementContract(): Promise<ContractCheck> {
  const response = await fetch(MONAD_TESTNET.rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_getCode',
      params: [MONAD_TESTNET.contractAddress, 'latest'],
      id: 1,
    }),
  });
  if (!response.ok) {
    throw new Error(`Monad testnet RPC returned ${response.status}.`);
  }
  const payload: unknown = await response.json();
  if (!payload || typeof payload !== 'object' || !('result' in payload)) {
    throw new Error('Monad testnet returned an invalid contract-check response.');
  }
  const code = (payload as { result?: unknown }).result;
  if (typeof code !== 'string') {
    throw new Error('Monad testnet did not return contract bytecode.');
  }
  return { contractPresent: code !== '0x', checkedAt: new Date().toISOString() };
}
