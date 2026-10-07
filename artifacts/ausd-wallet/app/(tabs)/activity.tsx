import React from 'react';
import { Linking, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useWallet } from '@/state/wallet-context';
import { Card, Divider, Eyebrow, InlineNotice, Page, Title } from '@/components/Primitives';

const amountText = (amount: number) =>
  amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function ActivityScreen() {
  const colors = useColors();
  const { transfers } = useWallet();
  return (
    <Page contentStyle={styles.page}>
      <Eyebrow>Wallet</Eyebrow>
      <Title>Activity</Title>
      <Text style={[styles.intro, { color: colors.mutedForeground }]}>
        Direct AUSD transfers, Agora settlement transactions, and local preview entries.
      </Text>
      {transfers.length ? (
        <Card style={styles.list}>
          {transfers.map((transfer, index) => (
            <React.Fragment key={transfer.id}>
              {index ? <Divider /> : null}
              <View style={styles.row}>
                <View style={[styles.icon, { backgroundColor: colors.secondary }]}>
                  <Feather name="arrow-up-right" size={17} color={colors.foreground} />
                </View>
                <View style={styles.info}>
                  <Text style={[styles.name, { color: colors.foreground }]}>{transfer.recipient}</Text>
                  <Text style={[styles.meta, { color: colors.mutedForeground }]}>
                    {new Date(transfer.createdAt).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })} · {transfer.currency} · {transfer.transactionHash ? 'CONFIRMED ONCHAIN' : 'LOCAL PREVIEW'}
                  </Text>
                  {transfer.transactionHash ? (
                    <Pressable onPress={() => void Linking.openURL(`https://testnet.monadvision.com/tx/${transfer.transactionHash}`)}>
                      <Text style={[styles.meta, { color: colors.primary }]} numberOfLines={1}>View transaction on MonadVision</Text>
                    </Pressable>
                  ) : null}
                </View>
                <Text style={[styles.amount, { color: colors.foreground }]}>
                  −{amountText(transfer.amount)}
                </Text>
              </View>
            </React.Fragment>
          ))}
        </Card>
      ) : (
        <Card style={styles.empty}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
            <Feather name="clock" size={19} color={colors.foreground} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No activity yet</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Confirmed Monad testnet transactions and local preview entries will appear here.
          </Text>
        </Card>
      )}
      <InlineNotice icon="shield">
        Confirmed testnet transactions link to MonadVision. Entries without a transaction link are local previews stored on this device.
      </InlineNotice>
    </Page>
  );
}

const styles = StyleSheet.create({
  page: { gap: 13, paddingTop: 10 },
  intro: { fontSize: 13, lineHeight: 19, fontFamily: 'Inter_400Regular', marginBottom: 5 },
  list: { gap: 0, paddingHorizontal: 14, paddingVertical: 3 },
  row: { minHeight: 74, flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, gap: 5 },
  name: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  meta: { fontSize: 9, letterSpacing: 0.15, fontFamily: 'Inter_500Medium' },
  amount: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  empty: { alignItems: 'center', paddingHorizontal: 27, paddingVertical: 28 },
  emptyIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  emptyText: { textAlign: 'center', fontSize: 12, lineHeight: 18, fontFamily: 'Inter_400Regular' },
});
