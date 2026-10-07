import React, { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useWallet } from '@/state/wallet-context';
import { checkSettlementContract, MONAD_TESTNET } from '@/services/settlement';
import {
  BackButton,
  Card,
  Divider,
  Eyebrow,
  InlineNotice,
  Page,
  PrimaryButton,
  Title,
} from '@/components/Primitives';

const rates: Record<string, { symbol: string; label: string; rate: number; digits: number }> = {
  NGN: { symbol: '₦', label: 'Nigerian naira', rate: 1480, digits: 0 },
  GBP: { symbol: '£', label: 'British pound', rate: 0.79, digits: 2 },
  GHS: { symbol: 'GH₵', label: 'Ghanaian cedi', rate: 15.2, digits: 2 },
  USD: { symbol: '$', label: 'US dollar', rate: 1, digits: 2 },
};

export default function ReviewScreen() {
  const colors = useColors();
  const params = useLocalSearchParams<{ recipient?: string; amount?: string; currency?: string }>();
  const { profile, addTransfer } = useWallet();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const amount = Number(params.amount ?? 0);
  const currency = params.currency ?? 'NGN';
  const destination = rates[currency] ?? rates.NGN;
  const receiveAmount = amount * destination.rate;

  async function confirmSimulation() {
    if (!profile) {
      setError('Your wallet session has ended. Return to setup and try again.');
      return;
    }
    setError('');
    setBusy(true);
    try {
      const contract = await checkSettlementContract();
      if (!contract.contractPresent) {
        throw new Error('No contract bytecode was found at the configured Monad testnet address.');
      }
      const transfer = {
        id: `sim-${Date.now()}`,
        recipient: params.recipient ?? 'Recipient',
        amount,
        currency,
        receivedAmount,
        createdAt: contract.checkedAt,
        mode: profile.mode,
        contractPresent: contract.contractPresent,
      };
      await addTransfer(transfer);
      router.replace({
        pathname: '/success',
        params: {
          recipient: transfer.recipient,
          amount: String(amount),
          currency,
          receiveAmount: String(receiveAmount),
          id: transfer.id,
        },
      });
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'The testnet contract check failed. No transfer was made.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page contentStyle={styles.page}>
      <BackButton onPress={() => router.back()} />
      <View style={styles.heading}>
        <Eyebrow>Review</Eyebrow>
        <Title>Check the details</Title>
      </View>
      <Card style={styles.amountCard}>
        <Text style={[styles.amountLabel, { color: colors.mutedForeground }]}>YOU SEND</Text>
        <Text style={[styles.amountValue, { color: colors.foreground }]}>
          {amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AUSD
        </Text>
        <Text style={[styles.receiveValue, { color: colors.mutedForeground }]}>
          Recipient gets about {destination.symbol}
          {receiveAmount.toLocaleString('en-US', {
            minimumFractionDigits: destination.digits,
            maximumFractionDigits: destination.digits,
          })} {currency}
        </Text>
        <Divider />
        <SummaryRow label="To" value={params.recipient ?? 'Recipient'} />
        <SummaryRow label="Estimated fee" value="0.00 AUSD" />
        <SummaryRow label="Exchange rate" value={`1 AUSD ≈ ${destination.rate} ${currency}`} />
      </Card>

      <Card style={styles.networkCard}>
        <View style={styles.networkHead}>
          <View style={[styles.networkIcon, { backgroundColor: colors.secondary }]}>
            <Feather name="zap" size={17} color={colors.foreground} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.networkTitle, { color: colors.foreground }]}>Instant settlement preview</Text>
            <Text style={[styles.networkCaption, { color: colors.mutedForeground }]}>
              Read-only testnet contract check
            </Text>
          </View>
        </View>
        <Divider />
        <Text style={[styles.address, { color: colors.mutedForeground }]}>
          {MONAD_TESTNET.name} · chain {MONAD_TESTNET.chainId}
        </Text>
        <Text selectable style={[styles.address, { color: colors.foreground }]}>
          {MONAD_TESTNET.contractAddress}
        </Text>
      </Card>

      {error ? (
        <InlineNotice icon="alert-triangle" tone="warning">
          {error}
        </InlineNotice>
      ) : null}
      <PrimaryButton
        label="Run testnet simulation"
        icon="arrow-right"
        onPress={confirmSimulation}
        loading={busy}
        testID="confirm-simulation"
      />
      <InlineNotice icon="shield">
        This sends no transaction and moves no money. It only reads contract code from Monad testnet, then records a local simulation.
      </InlineNotice>
    </Page>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text numberOfLines={1} style={[styles.summaryValue, { color: colors.foreground }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { gap: 17, paddingTop: 8 },
  heading: { gap: 6 },
  amountCard: { gap: 10 },
  amountLabel: { fontSize: 10, letterSpacing: 1, fontFamily: 'Inter_600SemiBold' },
  amountValue: { fontSize: 27, letterSpacing: -0.9, fontFamily: 'Inter_600SemiBold' },
  receiveValue: { fontSize: 12, lineHeight: 18, fontFamily: 'Inter_400Regular' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 14, alignItems: 'center' },
  summaryLabel: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  summaryValue: { fontSize: 11, textAlign: 'right', flexShrink: 1, fontFamily: 'Inter_600SemiBold' },
  networkCard: { gap: 11 },
  networkHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  networkIcon: { height: 37, width: 37, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  networkTitle: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  networkCaption: { marginTop: 3, fontSize: 10, fontFamily: 'Inter_400Regular' },
  address: { fontSize: 10, lineHeight: 15, fontFamily: 'Inter_400Regular' },
});
