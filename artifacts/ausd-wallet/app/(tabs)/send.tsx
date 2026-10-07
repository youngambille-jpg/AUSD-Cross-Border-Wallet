import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { isAddress } from 'viem';
import { useColors } from '@/hooks/useColors';
import { useWallet } from '@/state/wallet-context';
import { getAUSDBalance } from '@/services/passkey';
import {
  Body,
  Card,
  Eyebrow,
  Field,
  InlineNotice,
  Page,
  PrimaryButton,
  Title,
} from '@/components/Primitives';

const formatAmount = (amount: number, digits = 2) =>
  amount.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });

export default function SendScreen() {
  const colors = useColors();
  const { profile, balance } = useWallet();
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [onchainBalance, setOnchainBalance] = useState<string | null>(null);
  const [balanceError, setBalanceError] = useState('');
  const parsedAmount = Number(amount);
  const displayedBalance = profile?.mode === 'mera' ? Number(onchainBalance ?? 0) : balance;

  useEffect(() => {
    if (profile?.mode !== 'mera' || !profile.address) return;
    let active = true;
    getAUSDBalance(profile.address)
      .then((value) => { if (active) setOnchainBalance(value); })
      .catch((caught: unknown) => {
        if (active) setBalanceError(caught instanceof Error ? caught.message : 'Could not load Monad AUSD balance.');
      });
    return () => { active = false; };
  }, [profile?.address, profile?.mode]);

  function continueToReview() {
    setError('');
    if (!isAddress(recipient.trim(), { strict: false })) return setError('Enter a valid recipient wallet address.');
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) return setError('Enter an amount greater than zero.');
    if (!/^\d+(\.\d{1,6})?$/.test(amount)) return setError('AUSD supports up to six decimal places.');
    if (profile?.mode === 'mera' && onchainBalance === null) return setError(balanceError || 'Wait for your Monad testnet balance to load.');
    if (parsedAmount > displayedBalance) return setError(`Your available balance is ${formatAmount(displayedBalance)} AUSD.`);
    router.push({
      pathname: '/review',
      params: { recipient: recipient.trim(), amount },
    });
  }

  return (
    <Page contentStyle={styles.page}>
      <View style={styles.heading}>
        <Eyebrow>Send AUSD</Eyebrow>
        <Title>Who are you sending to?</Title>
        <Body>Send AUSD directly to a wallet on Monad testnet. Pimlico sponsorship is requested when you confirm.</Body>
      </View>

      <Field
        label="Recipient wallet address"
        value={recipient}
        onChangeText={setRecipient}
        placeholder="0x…"
        autoCapitalize="none"
        testID="recipient-input"
      />

      <Card style={styles.amountCard}>
        <Text style={[styles.amountLabel, { color: colors.mutedForeground }]}>YOU SEND</Text>
        <View style={styles.amountLine}>
          <Text style={[styles.dollar, { color: colors.foreground }]}>$</Text>
          <Text
            accessibilityLabel="AUSD amount"
            style={[styles.amountText, { color: colors.foreground }]}
          >
            {amount || '0'}
          </Text>
          <Text style={[styles.amountCurrency, { color: colors.mutedForeground }]}>AUSD</Text>
        </View>
        <Field
          label="Amount in AUSD"
          value={amount}
          onChangeText={(next) => setAmount(next.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1'))}
          placeholder="0.00"
          keyboardType="decimal-pad"
          testID="amount-input"
        />
        <Text style={[styles.balanceHint, { color: colors.mutedForeground }]}>
          {profile?.mode === 'mera'
            ? onchainBalance === null ? balanceError || 'Loading Monad testnet balance…' : `Monad testnet balance: ${formatAmount(displayedBalance)} AUSD`
            : `Demo balance: ${formatAmount(balance)} AUSD`}
        </Text>
      </Card>

      <View style={styles.destinationBlock}>
        <View style={styles.destinationHead}>
          <Text style={[styles.destinationTitle, { color: colors.foreground }]}>Recipient gets</Text>
          <Text style={[styles.destinationMeta, { color: colors.mutedForeground }]}>AUSD on Monad</Text>
        </View>
        <Card style={styles.receiveCard}>
          <View style={styles.receiveTop}>
            <Text style={[styles.receiveAmount, { color: colors.foreground }]}>
              {formatAmount(Number.isFinite(parsedAmount) ? parsedAmount : 0)} AUSD
            </Text>
            <Text style={[styles.countryName, { color: colors.mutedForeground }]}>Exact token amount</Text>
          </View>
          <Text style={[styles.rateText, { color: colors.mutedForeground }]}>
            Fiat payouts and currency conversion are not part of this on-chain send.
          </Text>
        </Card>
      </View>

      <View style={styles.feeRow}>
        <Text style={[styles.feeLabel, { color: colors.mutedForeground }]}>Network gas</Text>
        <Text style={[styles.feeValue, { color: colors.foreground }]}>Pimlico sponsorship requested</Text>
      </View>

      {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}
      <PrimaryButton
        label="Review transfer"
        icon="arrow-right"
        onPress={continueToReview}
        testID="review-transfer"
      />
      <InlineNotice icon="info">
        Demo wallets cannot send. A Mera passkey smart account and a funded Monad testnet AUSD balance are required.
      </InlineNotice>
    </Page>
  );
}

const styles = StyleSheet.create({
  page: { gap: 18, paddingTop: 10 },
  heading: { gap: 8, marginBottom: 1 },
  amountCard: { gap: 7, padding: 16 },
  amountLabel: { fontSize: 10, letterSpacing: 1, fontFamily: 'Inter_600SemiBold' },
  amountLine: { flexDirection: 'row', alignItems: 'baseline', gap: 3, marginBottom: 5 },
  dollar: { fontSize: 24, fontFamily: 'Inter_500Medium' },
  amountText: { fontSize: 37, lineHeight: 45, letterSpacing: -1.6, fontFamily: 'Inter_600SemiBold' },
  amountCurrency: { fontSize: 12, fontFamily: 'Inter_600SemiBold', marginLeft: 4 },
  balanceHint: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  destinationBlock: { gap: 10 },
  destinationHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  destinationTitle: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  destinationMeta: { fontSize: 11, fontFamily: 'Inter_500Medium' },
  receiveCard: { padding: 14, gap: 6 },
  receiveTop: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  receiveAmount: { fontSize: 23, letterSpacing: -0.8, fontFamily: 'Inter_600SemiBold' },
  countryName: { fontSize: 11, fontFamily: 'Inter_500Medium' },
  rateText: { fontSize: 10, fontFamily: 'Inter_400Regular' },
  feeRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 1 },
  feeLabel: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  feeValue: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  error: { fontSize: 12, fontFamily: 'Inter_500Medium' },
});
