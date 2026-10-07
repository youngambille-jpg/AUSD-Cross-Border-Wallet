import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useWallet } from '@/state/wallet-context';
import { Card, Eyebrow, InlineNotice, Page, Title } from '@/components/Primitives';

const amountText = (amount: number) =>
  amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 });

export default function ActivityScreen() {
  const colors = useColors();
  const { transfers } = useWallet();
  return (
    <Page contentStyle={styles.page}>
      <Eyebrow>PAYMENTS</Eyebrow>
      <Title>Activity</Title>
      <Text style={[styles.intro, { color: colors.mutedForeground }]}>
        Your AUSD transfers and Agora settlement receipts.
      </Text>
      {transfers.length ? (
        <View style={styles.list}>
          {transfers.map((transfer) => {
            const confirmed = Boolean(transfer.transactionHash);
            const settlement = transfer.settlementKind === 'agora-instant-settlement';
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
                      <Feather name={settlement ? 'repeat' : 'arrow-up-right'} size={16} color={colors.foreground} />
                    </View>
                    <View style={styles.typeCopy}>
                      <Text style={[styles.name, { color: colors.foreground }]}>{settlement ? 'Cross-border settlement' : 'AUSD transfer'}</Text>
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
                    <Text style={[styles.amountLabel, { color: colors.mutedForeground }]}>SENT</Text>
                    <Text style={[styles.sentAmount, { color: colors.foreground }]}>−{amountText(transfer.amount)} {transfer.currency}</Text>
                  </View>
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
            Completed AUSD transfers and Agora settlement receipts will appear here.
          </Text>
        </Card>
      )}
      <InlineNotice icon="shield">
        Confirmed entries link to MonadVision. Local previews are saved on this device and are not on-chain transactions.
      </InlineNotice>
    </Page>
  );
}

const styles = StyleSheet.create({
  page: { gap: 13, paddingTop: 10 },
  intro: { fontSize: 13, lineHeight: 19, fontFamily: 'Inter_400Regular', marginBottom: 3 },
  list: { gap: 12 },
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
