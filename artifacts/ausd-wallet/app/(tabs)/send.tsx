import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useWallet } from '@/state/wallet-context';
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

const corridors = [
  { code: 'NGN', label: 'Nigeria', symbol: '₦', rate: 1480 },
  { code: 'GBP', label: 'United Kingdom', symbol: '£', rate: 0.79 },
  { code: 'GHS', label: 'Ghana', symbol: 'GH₵', rate: 15.2 },
  { code: 'USD', label: 'United States', symbol: '$', rate: 1 },
];

const formatAmount = (amount: number, digits = 2) =>
  amount.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });

export default function SendScreen() {
  const colors = useColors();
  const { balance } = useWallet();
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('NGN');
  const [error, setError] = useState('');
  const selected = corridors.find((corridor) => corridor.code === currency) ?? corridors[0];
  const parsedAmount = Number(amount);
  const receiveAmount = useMemo(
    () => (Number.isFinite(parsedAmount) ? parsedAmount * selected.rate : 0),
    [parsedAmount, selected.rate],
  );

  function continueToReview() {
    setError('');
    if (!recipient.trim()) return setError('Add a recipient name or wallet address.');
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) return setError('Enter an amount greater than zero.');
    if (parsedAmount > balance) return setError('This amount is higher than the demo balance.');
    router.push({
      pathname: '/review',
      params: { recipient: recipient.trim(), amount: String(parsedAmount), currency },
    });
  }

  return (
    <Page contentStyle={styles.page}>
      <View style={styles.heading}>
        <Eyebrow>Send AUSD</Eyebrow>
        <Title>Who are you sending to?</Title>
        <Body>Choose a person and amount. You’ll review the details before the testnet check.</Body>
      </View>

      <Field
        label="Recipient"
        value={recipient}
        onChangeText={setRecipient}
        placeholder="Name, email or wallet address"
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
          Demo balance: {formatAmount(balance)} AUSD
        </Text>
      </Card>

      <View style={styles.destinationBlock}>
        <View style={styles.destinationHead}>
          <Text style={[styles.destinationTitle, { color: colors.foreground }]}>They receive</Text>
          <Text style={[styles.destinationMeta, { color: colors.mutedForeground }]}>Destination</Text>
        </View>
        <View style={styles.chips}>
          {corridors.map((corridor) => {
            const active = corridor.code === currency;
            return (
              <Pressable
                key={corridor.code}
                onPress={() => setCurrency(corridor.code)}
                style={[
                  styles.countryChip,
                  {
                    borderColor: active ? colors.foreground : colors.border,
                    backgroundColor: active ? colors.foreground : colors.background,
                  },
                ]}
              >
                <Text style={[styles.countryCode, { color: active ? colors.background : colors.foreground }]}>
                  {corridor.code}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Card style={styles.receiveCard}>
          <View style={styles.receiveTop}>
            <Text style={[styles.receiveAmount, { color: colors.foreground }]}>
              {selected.symbol}{formatAmount(receiveAmount, selected.code === 'NGN' || selected.code === 'GHS' ? 0 : 2)}
            </Text>
            <Text style={[styles.countryName, { color: colors.mutedForeground }]}>{selected.label}</Text>
          </View>
          <Text style={[styles.rateText, { color: colors.mutedForeground }]}>
            Demo rate · 1 AUSD ≈ {selected.symbol}{formatAmount(selected.rate, selected.code === 'NGN' ? 0 : 2)} {selected.code}
          </Text>
        </Card>
      </View>

      <View style={styles.feeRow}>
        <Text style={[styles.feeLabel, { color: colors.mutedForeground }]}>Estimated fee</Text>
        <Text style={[styles.feeValue, { color: colors.foreground }]}>0.00 AUSD</Text>
      </View>

      {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}
      <PrimaryButton
        label="Review transfer"
        icon="arrow-right"
        onPress={continueToReview}
        testID="review-transfer"
      />
      <InlineNotice icon="info">
        Local exchange rates are examples only and are not live quotes.
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
  chips: { flexDirection: 'row', gap: 8 },
  countryChip: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  countryCode: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
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
