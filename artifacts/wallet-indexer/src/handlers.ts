import { indexer } from "envio";

indexer.onEvent(
  {
    contract: "WalletToken",
    event: "Transfer",
    fields: { transaction: ["hash"], block: ["timestamp"] },
  },
  async ({ event, context }) => {
    context.TokenTransfer.set({
      id: `${event.chainId}-${event.transaction.hash}-${event.logIndex}`,
      token: event.srcAddress.toLowerCase(),
      from: event.params.from.toLowerCase(),
      to: event.params.to.toLowerCase(),
      value: event.params.value,
      transactionHash: event.transaction.hash,
      blockNumber: BigInt(event.block.number),
      timestamp: BigInt(event.block.timestamp),
    });
  },
);
