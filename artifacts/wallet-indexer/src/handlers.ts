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

const SAVINGS_CONTRACT = "SavingsPockets" as const;

function saveSavingsActivity(context: any, event: any, values: Record<string, unknown>) {
  context.SavingsActivity.set({
    id: `${event.chainId}-${event.transaction.hash}-${event.logIndex}`,
    transactionHash: event.transaction.hash,
    blockNumber: BigInt(event.block.number),
    timestamp: BigInt(event.block.timestamp),
    ...values,
  });
}

indexer.onEvent({ contract: SAVINGS_CONTRACT, event: "PocketCreated", fields: { transaction: ["hash"], block: ["timestamp"] } }, async ({ event, context }) => {
  saveSavingsActivity(context, event, { kind: "pocket-created", owner: event.params.owner.toLowerCase(), pocketId: event.params.pocketId });
});

indexer.onEvent({ contract: SAVINGS_CONTRACT, event: "AutoSaveRateUpdated", fields: { transaction: ["hash"], block: ["timestamp"] } }, async ({ event, context }) => {
  saveSavingsActivity(context, event, { kind: "autosave-rate-updated", owner: event.params.owner.toLowerCase(), pocketId: event.params.pocketId, autoSaveBps: Number(event.params.bps) });
});

indexer.onEvent({ contract: SAVINGS_CONTRACT, event: "Deposited", fields: { transaction: ["hash"], block: ["timestamp"] } }, async ({ event, context }) => {
  saveSavingsActivity(context, event, { kind: "deposited", owner: event.params.owner.toLowerCase(), pocketId: event.params.pocketId, amount: event.params.amount });
});

indexer.onEvent({ contract: SAVINGS_CONTRACT, event: "Withdrawn", fields: { transaction: ["hash"], block: ["timestamp"] } }, async ({ event, context }) => {
  saveSavingsActivity(context, event, { kind: "withdrawn", owner: event.params.owner.toLowerCase(), pocketId: event.params.pocketId, counterparty: event.params.recipient.toLowerCase(), amount: event.params.amount });
});

indexer.onEvent({ contract: SAVINGS_CONTRACT, event: "PaymentSent", fields: { transaction: ["hash"], block: ["timestamp"] } }, async ({ event, context }) => {
  saveSavingsActivity(context, event, { kind: "payment-autosave", owner: event.params.owner.toLowerCase(), pocketId: event.params.pocketId, counterparty: event.params.recipient.toLowerCase(), paymentAmount: event.params.paymentAmount, savedAmount: event.params.savedAmount });
});

indexer.onEvent({ contract: SAVINGS_CONTRACT, event: "Gifted", fields: { transaction: ["hash"], block: ["timestamp"] } }, async ({ event, context }) => {
  saveSavingsActivity(context, event, { kind: "pocket-gift", owner: event.params.donor.toLowerCase(), pocketId: event.params.pocketId, counterparty: event.params.recipientOwner.toLowerCase(), amount: event.params.amount });
});

indexer.onEvent({ contract: SAVINGS_CONTRACT, event: "PersonGifted", fields: { transaction: ["hash"], block: ["timestamp"] } }, async ({ event, context }) => {
  saveSavingsActivity(context, event, { kind: "person-gift", owner: event.params.donor.toLowerCase(), counterparty: event.params.recipientOwner.toLowerCase(), amount: event.params.amount });
});

indexer.onEvent({ contract: SAVINGS_CONTRACT, event: "GiftAllocated", fields: { transaction: ["hash"], block: ["timestamp"] } }, async ({ event, context }) => {
  saveSavingsActivity(context, event, { kind: "gift-allocated", owner: event.params.recipientOwner.toLowerCase(), pocketId: event.params.pocketId, amount: event.params.amount });
});

indexer.onEvent({ contract: SAVINGS_CONTRACT, event: "GiftWithdrawn", fields: { transaction: ["hash"], block: ["timestamp"] } }, async ({ event, context }) => {
  saveSavingsActivity(context, event, { kind: "gift-withdrawn", owner: event.params.recipientOwner.toLowerCase(), counterparty: event.params.recipient.toLowerCase(), amount: event.params.amount });
});
