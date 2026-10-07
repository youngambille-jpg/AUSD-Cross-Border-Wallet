import React from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Linking, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import {
  Card,
  Eyebrow,
  InlineNotice,
  Page,
  PrimaryButton,
  Title,
} from '@/components/Primitives';

export default function SimulationSuccessScreen() {
  const colors = useColors();
  const params = useLocalSearchParams<{
    recipient?: string;
    amount?: string;
    currency?: string;
    receiveAmount?: string;
    id?: string;
    transactionHash?: string;
    accountAddress?: string;
    blockNumber?: string;
    receiveCurrency?: string;
    settlement?: string;
  }>();
  const amount = Number(params.amount ?? 0);
  const receiveAmount = Number(params.receiveAmount ?? amount);
  const receiveCurrency = typeof params.receiveCurrency === 'string' ? params.receiveCurrency : 'AUSD';
  const settledThroughAgora = params.settlement === 'agora';
  const transactionHash = params.transactionHash;

  return (
    <Page contentStyle={styles.page}>
      <View style={styles.successIcon}>
        <Feather name="check" size={27} color={colors.primaryForeground} />
      </View>
      <Eyebrow>{settledThroughAgora ? 'AGORA SETTLEMENT CONFIRMED' : 'MONAD TESTNET CONFIRMED'}</Eyebrow>
      <Title>{settledThroughAgora ? 'Payout settled.' : 'AUSD is on its way.'}</Title>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
        {settledThroughAgora
          ? 'The Agora Instant Settlement swap and recipient payout were included in one sponsored Monad testnet transaction.'
          : 'Your sponsored AUSD wallet transfer was included on Monad testnet.'}
      </Text>

      <Card style={styles.receipt}>
        <Text style={[styles.amount, { color: colors.foreground }]}>
          {amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })} AUSD
        </Text>
        <View style={[styles.receivePanel, { backgroundColor: colors.secondary }]}>
          <Text style={[styles.receivesLabel, { color: colors.mutedForeground }]}>{settledThroughAgora ? 'RECIPIENT RECEIVES · AGORA PAIR' : 'RECIPIENT RECEIVES'}</Text>
          <Text style={[styles.receivesValue, { color: colors.foreground }]}>
            {receiveAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })} {receiveCurrency}
          </Text>
        </View>
        <Text style={[styles.to, { color: colors.mutedForeground }]}>
          To {params.recipient ?? 'recipient'}
        </Text>
        {params.accountAddress ? <Text selectable style={[styles.reference, { color: colors.mutedForeground }]}>From smart account · {params.accountAddress}</Text> : null}
        {params.blockNumber ? <Text style={[styles.reference, { color: colors.mutedForeground }]}>Block · {params.blockNumber} · Gas sponsored by Pimlico</Text> : null}
        {transactionHash ? (
          <Pressable onPress={() => void Linking.openURL(`https://testnet.monadvision.com/tx/${transactionHash}`)}>
            <Text selectable style={[styles.reference, { color: colors.primary }]}>Transaction · {transactionHash} · View on MonadVision</Text>
          </Pressable>
        ) : null}
      </Card>

      <InlineNotice icon="shield">
        {settledThroughAgora
          ? 'CTK is a testnet mock payout token, not a real-world currency. Receipt saved to local activity.'
          : 'Testnet transaction only. The receipt is also saved to local activity.'}
      </InlineNotice>
      <PrimaryButton
        label="Back to wallet"
        onPress={() => router.replace('/(tabs)')}
        testID="back-to-wallet"
      />
    </Page>
  );
}

const styles = StyleSheet.create({
  page: { justifyContent: 'center', gap: 16, paddingTop: 12 },
  successIcon: {
    width: 56,
    height: 56,
    borderRadius: 19,
    backgroundColor: '#ff5900',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  subtitle: { fontSize: 13, lineHeight: 20, fontFamily: 'Inter_400Regular' },
  receipt: { gap: 9 },
  amount: { fontSize: 22, fontFamily: 'Inter_600SemiBold' },
  to: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  receivePanel: { borderRadius: 12, padding: 12, marginTop: 2, gap: 5 },
  receivesLabel: { fontSize: 9, letterSpacing: 0.8, fontFamily: 'Inter_600SemiBold' },
  receivesValue: { fontSize: 17, fontFamily: 'Inter_600SemiBold' },
  reference: { fontSize: 9, fontFamily: 'Inter_400Regular' },
});
