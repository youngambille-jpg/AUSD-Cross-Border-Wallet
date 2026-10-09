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
    autoSave?: string;
    goalName?: string;
    paymentAmount?: string;
    autoSavedAmount?: string;
    totalDebit?: string;
    historyWarning?: string;
  }>();
  const amount = Number(params.amount ?? 0);
  const receiveAmount = Number(params.receiveAmount ?? amount);
  const receiveCurrency = typeof params.receiveCurrency === 'string' ? params.receiveCurrency : 'AUSD';
  const settledThroughAgora = params.settlement === 'agora';
  const autoSaveConfirmed = params.autoSave === 'true';
  const transactionHash = params.transactionHash;
  const explorerUrl = transactionHash
    ? `https://testnet.monadvision.com/tx/${transactionHash}`
    : '';

  return (
    <Page contentStyle={styles.page}>
      <View style={[styles.successIcon, { backgroundColor: colors.primary }]}>
        <Feather name="check" size={27} color={colors.primaryForeground} />
      </View>
      <View style={[styles.confirmedBadge, { backgroundColor: colors.secondary }]}>
        <View style={[styles.confirmedDot, { backgroundColor: colors.primary }]} />
        <Text style={[styles.confirmedText, { color: colors.foreground }]}>CONFIRMED ON MONAD TESTNET</Text>
      </View>
      <Title>{autoSaveConfirmed ? 'Payment + savings confirmed' : settledThroughAgora ? 'Settlement confirmed' : 'Transfer confirmed'}</Title>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
        {autoSaveConfirmed
          ? 'The recipient payment and savings allocation were included in one confirmed Monad testnet transaction.'
          : settledThroughAgora
          ? 'The Agora AUSD-to-CTK swap was included in a confirmed sponsored transaction.'
          : 'Your AUSD transfer was included in a confirmed sponsored transaction.'}
      </Text>

      <Card style={styles.receipt}>
        <Text style={[styles.amount, { color: colors.foreground }]}>
          {amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })} AUSD
        </Text>
        <View style={[styles.receivePanel, { backgroundColor: colors.secondary }]}>
          <Text style={[styles.receivesLabel, { color: colors.mutedForeground }]}>{settledThroughAgora ? 'TESTNET OUTPUT · AGORA QUOTE' : 'RECIPIENT RECEIVES'}</Text>
          <Text style={[styles.receivesValue, { color: colors.foreground }]}>
            {receiveAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })} {receiveCurrency}
          </Text>
        </View>
        {autoSaveConfirmed ? (
          <View style={[styles.receivePanel, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.receivesLabel, { color: colors.mutedForeground }]}>
              AUTO-SAVED TO {params.goalName ?? 'SAVINGS POCKET'}
            </Text>
            <Text style={[styles.receivesValue, { color: colors.foreground }]}>
              {Number(params.autoSavedAmount ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })} AUSD
            </Text>
            <Text style={[styles.reference, { color: colors.mutedForeground }]}>
              Total wallet debit: {Number(params.totalDebit ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })} AUSD
            </Text>
          </View>
        ) : null}
        <View style={[styles.receiptDivider, { backgroundColor: colors.border }]} />
        <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>RECIPIENT</Text>
        <Text selectable style={[styles.to, { color: colors.foreground }]}>{params.recipient ?? 'Recipient unavailable'}</Text>
        {params.accountAddress ? <Text selectable style={[styles.reference, { color: colors.mutedForeground }]}>From smart account · {params.accountAddress}</Text> : null}
        {params.blockNumber ? <Text style={[styles.reference, { color: colors.mutedForeground }]}>Block {params.blockNumber} · Gas sponsored by Pimlico</Text> : null}
        {transactionHash ? (
          <View style={styles.transactionRef}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>TRANSACTION HASH</Text>
            <Text selectable style={[styles.hash, { color: colors.foreground }]}>{transactionHash}</Text>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel="View confirmed transaction on MonadVision"
              onPress={() => void Linking.openURL(explorerUrl)}
              style={({ pressed }) => [styles.explorerLink, { opacity: pressed ? 0.65 : 1 }]}
            >
              <Text style={[styles.explorerText, { color: colors.primary }]}>View on MonadVision</Text>
              <Feather name="external-link" size={13} color={colors.primary} />
            </Pressable>
          </View>
        ) : null}
      </Card>

      <InlineNotice icon="shield">
        {params.historyWarning
          ? params.historyWarning
          : autoSaveConfirmed
          ? 'Both transfers were performed atomically by the SavingsPockets contract. Testnet AUSD moved; this has no real-world monetary value.'
          : settledThroughAgora
          ? 'CTK is a testnet mock payout token. This confirms the on-chain swap only; it is not a fiat payout. Receipt saved to Activity on this device.'
          : 'Testnet transaction only. Receipt saved to Activity on this device.'}
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
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  confirmedBadge: { flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center', gap: 7, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  confirmedDot: { width: 7, height: 7, borderRadius: 4 },
  confirmedText: { fontSize: 9, letterSpacing: 0.65, fontFamily: 'Inter_700Bold' },
  subtitle: { fontSize: 13, lineHeight: 20, fontFamily: 'Inter_400Regular' },
  receipt: { gap: 9, padding: 16 },
  amount: { fontSize: 22, fontFamily: 'Inter_600SemiBold' },
  fieldLabel: { fontSize: 9, letterSpacing: 0.75, fontFamily: 'Inter_600SemiBold' },
  to: { fontSize: 11, lineHeight: 17, fontFamily: 'Inter_500Medium' },
  receiptDivider: { height: StyleSheet.hairlineWidth, marginVertical: 2 },
  receivePanel: { borderRadius: 12, padding: 12, marginTop: 2, gap: 5 },
  receivesLabel: { fontSize: 9, letterSpacing: 0.8, fontFamily: 'Inter_600SemiBold' },
  receivesValue: { fontSize: 17, fontFamily: 'Inter_600SemiBold' },
  reference: { fontSize: 9, lineHeight: 14, fontFamily: 'Inter_400Regular' },
  transactionRef: { gap: 5, marginTop: 2 },
  hash: { fontSize: 9, lineHeight: 14, fontFamily: 'Inter_500Medium' },
  explorerLink: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 3 },
  explorerText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
});
