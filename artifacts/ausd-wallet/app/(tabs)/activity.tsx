import React from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useWallet } from '@/state/wallet-context';
import { Card, Eyebrow, InlineNotice, Page, Title } from '@/components/Primitives';
import { formatIndexedTransfer, useIndexedActivity } from '@/services/indexed-activity';

const amountText = (amount: number) =>
  amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 });

export default function ActivityScreen() {
  const colors = useColors();
  const { profile, transfers: localTransfers } = useWallet();
  const { transfers: indexedTransfers, loading, error, configured } = useIndexedActivity(profile?.address);
  const useIndexed = configured && !error;
  const indexedHashes = new Set(indexedTransfers.map((item) => item.transactionHash.toLowerCase()));
  const transfers = useIndexed
    ? [
        ...indexedTransfers.map((item) => ({ indexed: formatIndexedTransfer(item, profile?.address ?? '') })),
        ...localTransfers
          .filter((item) => !item.transactionHash || !indexedHashes.has(item.transactionHash.toLowerCase()))
          .map((item) => ({ local: item })),
      ].sort((left, right) => {
        const leftDate = 'indexed' in left ? left.indexed.createdAt : left.local.createdAt;
        const rightDate = 'indexed' in right ? right.indexed.createdAt : right.local.createdAt;
        return new Date(rightDate).getTime() - new Date(leftDate).getTime();
      })
    : localTransfers.map((item) => ({ local: item }));
  return (
    <Page contentStyle={styles.page}>
      <Eyebrow>PAYMENTS</Eyebrow>
      <Title>Activity</Title>
      <Text style={[styles.intro, { color: colors.mutedForeground }]}>
        Confirmed AUSD and settlement-token movements on Monad testnet.
      </Text>
      <View style={[styles.sourceBanner, { backgroundColor: colors.secondary }]}>
        {loading ? <ActivityIndicator size="small" color={colors.foreground} /> : <View style={[styles.sourceDot, { backgroundColor: useIndexed ? colors.primary : colors.mutedForeground }]} />}
        <Text style={[styles.sourceText, { color: colors.mutedForeground }]}>
          {loading ? 'Syncing on-chain activity' : useIndexed ? 'Live activity · Envio indexer' : error ? 'Showing saved activity · indexer unavailable' : 'Saved on this device'}
        </Text>
      </View>
      {transfers.length ? (
        <View style={styles.list}>
          {transfers.map((entry) => {
            if ('indexed' in entry) {
              const transfer = entry.indexed;
              const date = new Date(transfer.createdAt);
              const dateLabel = Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleString([], {
                month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
              });
              return (
                <Card key={transfer.id} style={styles.transferCard}>
                  <View style={styles.cardTop}>
                    <View style={styles.transferType}>
                      <View style={[styles.icon, { backgroundColor: colors.secondary }]}>
                        <Feather name={transfer.outgoing ? 'arrow-up-right' : 'arrow-down-left'} size={16} color={colors.foreground} />
                      </View>
                      <View style={styles.typeCopy}>
                        <Text style={[styles.name, { color: colors.foreground }]}>{transfer.outgoing ? `${transfer.token} sent` : `${transfer.token} received`}</Text>
                        <Text style={[styles.meta, { color: colors.mutedForeground }]}>{dateLabel} · confirmed on-chain</Text>
                      </View>
                    </View>
                    <Text style={[styles.indexedAmount, { color: colors.foreground }]}>{transfer.outgoing ? '−' : '+'}{amountText(transfer.amount)} {transfer.token}</Text>
                  </View>
                  <View style={styles.recipientBlock}>
                    <Text style={[styles.amountLabel, { color: colors.mutedForeground }]}>{transfer.outgoing ? 'TO' : 'FROM'}</Text>
                    <Text selectable style={[styles.recipient, { color: colors.foreground }]}>{transfer.counterparty}</Text>
                  </View>
                  <View style={styles.transactionRef}>
                    <Text selectable style={[styles.hash, { color: colors.mutedForeground }]}>{transfer.transactionHash}</Text>
                    <Pressable
                      accessibilityRole="link"
                      accessibilityLabel="View confirmed transaction on MonadVision"
                      onPress={() => void Linking.openURL(`https://testnet.monadvision.com/tx/${transfer.transactionHash}`)}
                      style={({ pressed }) => [styles.explorerLink, { opacity: pressed ? 0.65 : 1 }]}
                    >
                      <Text style={[styles.explorerText, { color: colors.primary }]}>View on MonadVision</Text>
                      <Feather name="external-link" size={13} color={colors.primary} />
                    </Pressable>
                  </View>
                </Card>
              );
            }
            const transfer = entry.local;
            const confirmed = Boolean(transfer.transactionHash);
            const settlement = transfer.settlementKind === 'agora-instant-settlement';
            const autoSave = transfer.settlementKind === 'savings-auto-save';
            const receivedAmount = transfer.receivedAmount ?? transfer.amount;
            const receivedCurrency = transfer.receivedCurrency ?? (settlement ? transfer.quoteSymbol ?? 'CTK' : transfer.currency);
            const date = new Date(transfer.createdAt);
            const dateLabel = Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleString([], {
              month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
            });

            return (
              <Card key={transfer.id} style={styles.transferCard}>
                <View style={styles.cardTop}>
                  <View style={styles.transferType}>
                    <View style={[styles.icon, { backgroundColor: colors.secondary }]}>
                      <Feather name={settlement ? 'repeat' : autoSave ? 'target' : 'arrow-up-right'} size={16} color={colors.foreground} />
                    </View>
                    <View style={styles.typeCopy}>
                      <Text style={[styles.name, { color: colors.foreground }]}>{settlement ? 'Cross-border settlement' : autoSave ? 'Payment + auto-save' : 'AUSD transfer'}</Text>
                      <Text style={[styles.meta, { color: colors.mutedForeground }]}>{dateLabel}</Text>
                    </View>
                  </View>
                  <View style={[styles.status, { backgroundColor: confirmed ? colors.secondary : colors.background }]}>
                    <View style={[styles.statusDot, { backgroundColor: confirmed ? colors.primary : colors.mutedForeground }]} />
                    <Text style={[styles.statusText, { color: confirmed ? colors.foreground : colors.mutedForeground }]}>
                      {confirmed ? 'CONFIRMED' : 'LOCAL PREVIEW'}
                    </Text>
                  </View>
                </View>

                <View style={[styles.amountPanel, { backgroundColor: colors.secondary }]}>
                  <View style={styles.amountLine}>
                    <Text style={[styles.amountLabel, { color: colors.mutedForeground }]}>{autoSave ? 'TOTAL WALLET DEBIT' : 'SENT'}</Text>
                    <Text style={[styles.sentAmount, { color: colors.foreground }]}>−{amountText(transfer.amount)} {transfer.currency}</Text>
                  </View>
                  {autoSave && transfer.paymentAmount !== undefined && transfer.savedAmount !== undefined ? (
                    <>
                      <View style={[styles.divider, { backgroundColor: colors.border }]} />
                      <View style={styles.amountLine}>
                        <Text style={[styles.amountLabel, { color: colors.mutedForeground }]}>RECIPIENT PAYMENT</Text>
                        <Text style={[styles.receivedAmount, { color: colors.foreground }]}>{amountText(transfer.paymentAmount)} {transfer.currency}</Text>
                      </View>
                      <View style={[styles.divider, { backgroundColor: colors.border }]} />
                      <View style={styles.amountLine}>
                        <Text style={[styles.amountLabel, { color: colors.mutedForeground }]}>AUTO-SAVED{transfer.savingsGoalName ? ` · ${transfer.savingsGoalName}` : ''}</Text>
                        <Text style={[styles.receivedAmount, { color: colors.foreground }]}>{amountText(transfer.savedAmount)} {transfer.currency}</Text>
                      </View>
                    </>
                  ) : null}
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                  <View style={styles.amountLine}>
                    <Text style={[styles.amountLabel, { color: colors.mutedForeground }]}>{settlement ? 'TESTNET OUTPUT' : 'RECIPIENT RECEIVES'}</Text>
                    <Text style={[styles.receivedAmount, { color: colors.foreground }]}>{amountText(receivedAmount)} {receivedCurrency}</Text>
                  </View>
                </View>

                <View style={styles.recipientBlock}>
                  <Text style={[styles.amountLabel, { color: colors.mutedForeground }]}>RECIPIENT</Text>
                  <Text selectable style={[styles.recipient, { color: colors.foreground }]}>{transfer.recipient}</Text>
                </View>

                {confirmed && transfer.transactionHash ? (
                  <View style={styles.transactionRef}>
                    <Text selectable style={[styles.hash, { color: colors.mutedForeground }]}>{transfer.transactionHash}</Text>
                    <Pressable
                      accessibilityRole="link"
                      accessibilityLabel="View confirmed transaction on MonadVision"
                      onPress={() => void Linking.openURL(`https://testnet.monadvision.com/tx/${transfer.transactionHash}`)}
                      style={({ pressed }) => [styles.explorerLink, { opacity: pressed ? 0.65 : 1 }]}
                    >
                      <Text style={[styles.explorerText, { color: colors.primary }]}>View on MonadVision</Text>
                      <Feather name="external-link" size={13} color={colors.primary} />
                    </Pressable>
                  </View>
                ) : null}
              </Card>
            );
          })}
        </View>
      ) : (
        <Card style={styles.empty}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
            <Feather name="clock" size={19} color={colors.foreground} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No activity yet</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Confirmed token movements and saved transfers will appear here.
          </Text>
        </Card>
      )}
      <InlineNotice icon="shield">
        {useIndexed ? 'Confirmed token movements are read from Monad testnet logs indexed by Envio. Saved items outside the indexer history remain visible; local previews are not on-chain transactions.' : 'Saved entries come from this device. Local previews are not on-chain transactions.'}
      </InlineNotice>
    </Page>
  );
}

const styles = StyleSheet.create({
  page: { gap: 13, paddingTop: 10 },
  intro: { fontSize: 13, lineHeight: 19, fontFamily: 'Inter_400Regular', marginBottom: 3 },
  list: { gap: 12 },
  sourceBanner: { minHeight: 36, borderRadius: 10, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 8 },
  sourceDot: { width: 7, height: 7, borderRadius: 4 },
  sourceText: { fontSize: 10, fontFamily: 'Inter_500Medium' },
  transferCard: { gap: 13, padding: 15 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  transferType: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  typeCopy: { flex: 1, gap: 3 },
  name: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  meta: { fontSize: 9, fontFamily: 'Inter_400Regular' },
  status: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 7, paddingHorizontal: 7, paddingVertical: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 8, letterSpacing: 0.35, fontFamily: 'Inter_700Bold' },
  amountPanel: { borderRadius: 12, paddingHorizontal: 11, paddingVertical: 10, gap: 8 },
  amountLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  divider: { height: StyleSheet.hairlineWidth },
  amountLabel: { fontSize: 9, letterSpacing: 0.55, fontFamily: 'Inter_600SemiBold' },
  sentAmount: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  receivedAmount: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  indexedAmount: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  recipientBlock: { gap: 4 },
  recipient: { fontSize: 10, lineHeight: 15, fontFamily: 'Inter_500Medium' },
  transactionRef: { gap: 3 },
  hash: { fontSize: 8, lineHeight: 13, fontFamily: 'Inter_400Regular' },
  explorerLink: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 2 },
  explorerText: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },
  empty: { alignItems: 'center', paddingHorizontal: 27, paddingVertical: 28 },
  emptyIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  emptyText: { textAlign: 'center', fontSize: 12, lineHeight: 18, fontFamily: 'Inter_400Regular' },
});
