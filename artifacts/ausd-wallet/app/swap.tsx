import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useWallet } from '@/state/wallet-context';
import { getAUSDBalance } from '@/services/passkey';
import { simulateSettlementSwap, type SettlementQuote } from '@/services/settlement';
import { BackButton, Body, Card, Eyebrow, InlineNotice, Page, PrimaryButton, Title } from '@/components/Primitives';

const fmt = (value: number) => value.toLocaleString('en-US', { maximumFractionDigits: 6 });

export default function SwapScreen() {
  const colors = useColors();
  const { profile, balance: demoBalance } = useWallet();
  const [amount, setAmount] = useState('');
  const [quoteMode, setQuoteMode] = useState<'exact-input' | 'exact-output'>('exact-input');
  const [balance, setBalance] = useState<number | null>(profile?.mode === 'mera' ? null : demoBalance);
  const [quote, setQuote] = useState<SettlementQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [balanceError, setBalanceError] = useState('');

  useEffect(() => {
    if (profile?.mode !== 'mera' || !profile.address) return;
    let active = true;
    setBalance(null);
    getAUSDBalance(profile.address)
      .then((value) => { if (active) setBalance(Number(value)); })
      .catch((caught: unknown) => { if (active) setBalanceError(caught instanceof Error ? caught.message : 'Balance unavailable'); });
    return () => { active = false; };
  }, [profile?.address, profile?.mode]);

  useEffect(() => {
    setQuote(null);
    setError('');
    setLoading(false);
    const decimals = quoteMode === 'exact-input' ? 6 : 18;
    if (!profile?.address || profile.mode !== 'mera' || !new RegExp(`^\\d+(\\.\\d{1,${decimals}})?$`).test(amount) || Number(amount) <= 0) return;
    let active = true;
    const timer = setTimeout(() => {
      setLoading(true);
      simulateSettlementSwap(amount, profile.address!, quoteMode)
        .then((result) => { if (active) setQuote(result); })
        .catch((caught: unknown) => { if (active) setError(caught instanceof Error ? caught.message : 'Could not get a Monad testnet quote.'); })
        .finally(() => { if (active) setLoading(false); });
    }, 300);
    return () => { active = false; clearTimeout(timer); };
  }, [amount, quoteMode, profile?.address, profile?.mode]);

  const parsed = Number(amount);
  const amountIn = quote ? Number(quote.amountIn) : quoteMode === 'exact-input' ? parsed : 0;
  const inputAmountValid = quoteMode === 'exact-input'
    ? /^\d+(\.\d{1,6})?$/.test(amount) && parsed > 0
    : /^\d+(\.\d{1,18})?$/.test(amount) && parsed > 0;
  const canReview = profile?.mode === 'mera' && Boolean(profile.address && profile.signerAddress && profile.passkey) && Boolean(quote) && !loading && balance !== null && inputAmountValid && amountIn <= balance;

  function reviewSwap() {
    if (!profile?.address || !quote) return;
    if (balance === null) return setError(balanceError || 'Wait for your AUSD balance to load.');
    if (!inputAmountValid) return setError(quoteMode === 'exact-input' ? 'Enter an AUSD amount greater than zero, up to six decimal places.' : 'Enter a CTK amount greater than zero, up to eighteen decimal places.');
    if (amountIn > balance) return setError(`Available balance: ${fmt(balance)} AUSD.`);
    router.push({ pathname: '/review', params: { mode: 'agora-swap', recipient: profile.address, amount: quote.amountIn, swapAmount: amount, quoteMode, quoteInputRaw: quote.amountInRaw, quoteOutput: quote.amountOut, quoteOutputRaw: quote.amountOutRaw, quoteCheckedAt: quote.checkedAt, pairAddress: quote.pairAddress, purchaseFeeRate: quote.purchaseFeeRate } });
  }

  return (
    <Page contentStyle={styles.page}>
      <BackButton onPress={() => router.back()} />
      <View style={styles.heading}>
        <Eyebrow>AGORA INSTANT SETTLEMENT · MONAD TESTNET</Eyebrow>
        <Title>Swap tokens</Title>
        <Body>Trade the live AUSD/CTK pair. Your passkey approves the swap on Monad testnet.</Body>
      </View>
      <View style={[styles.modeSwitch, { backgroundColor: colors.secondary }]}>
        <Pressable onPress={() => { setQuoteMode('exact-input'); setAmount(''); setError(''); }} style={[styles.modeOption, quoteMode === 'exact-input' && { backgroundColor: colors.background }]}>
          <Text style={[styles.modeText, { color: quoteMode === 'exact-input' ? colors.foreground : colors.mutedForeground }]}>You pay</Text>
        </Pressable>
        <Pressable onPress={() => { setQuoteMode('exact-output'); setAmount(''); setError(''); }} style={[styles.modeOption, quoteMode === 'exact-output' && { backgroundColor: colors.background }]}>
          <Text style={[styles.modeText, { color: quoteMode === 'exact-output' ? colors.foreground : colors.mutedForeground }]}>You receive</Text>
        </Pressable>
      </View>
      <Card style={styles.amountCard}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>{quoteMode === 'exact-input' ? 'YOU PAY' : 'YOU RECEIVE'}</Text>
        <View style={styles.amountRow}>
          <TextInput accessibilityLabel={quoteMode === 'exact-input' ? 'AUSD amount to swap' : 'CTK amount to receive'} value={amount} onChangeText={(value) => { setAmount(value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1')); setError(''); }} placeholder="0" placeholderTextColor={colors.mutedForeground} keyboardType="decimal-pad" style={[styles.amountInput, { color: colors.foreground }]} />
          <Text style={[styles.token, { color: colors.foreground }]}>{quoteMode === 'exact-input' ? 'AUSD' : 'CTK'}</Text>
        </View>
        <View style={styles.balanceRow}>
          <Text style={[styles.balanceText, { color: colors.mutedForeground }]}>{balance === null ? balanceError || 'Loading balance…' : `Available ${fmt(balance)} AUSD`}</Text>
          {balance !== null && profile?.mode === 'mera' && quoteMode === 'exact-input' ? <Text onPress={() => setAmount(String(balance))} style={[styles.max, { color: colors.primary }]}>MAX</Text> : null}
        </View>
      </Card>
      {amount.length > 0 && !inputAmountValid ? <Text accessibilityRole="alert" style={[styles.error, { color: colors.destructive }]}>{quoteMode === 'exact-input' ? 'Enter up to 6 decimal places for AUSD.' : 'Enter up to 18 decimal places for CTK.'}</Text> : null}
      <View style={styles.arrow}><Feather name="arrow-down" size={18} color={colors.primary} /></View>
      <Card style={styles.outputCard}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>{quoteMode === 'exact-input' ? 'ESTIMATED RECEIVE' : 'MAXIMUM YOU PAY'}</Text>
        <View style={styles.amountRow}>
          <Text style={[styles.output, { color: colors.foreground }]}>{loading ? '…' : quote ? fmt(Number(quoteMode === 'exact-input' ? quote.amountOut : quote.amountIn)) : '—'}</Text>
          <Text style={[styles.token, { color: colors.foreground }]}>{quoteMode === 'exact-input' ? 'CTK' : 'AUSD'}</Text>
        </View>
        <Text style={[styles.balanceText, { color: colors.mutedForeground }]}>{error || (quote ? `Quote updated ${new Date(quote.checkedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : 'Enter an amount to request a live quote.')}</Text>
        {quote ? <Text style={[styles.balanceText, { color: colors.mutedForeground }]}>Agora purchase fee: {(Number(quote.purchaseFeeRate) * 100).toLocaleString('en-US', { maximumFractionDigits: 4 })}% · included in quote</Text> : null}
      </Card>
      <Card style={styles.receiverCard}>
        <View style={[styles.receiverIcon, { backgroundColor: colors.secondary }]}><Feather name="corner-down-left" size={16} color={colors.foreground} /></View>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={[styles.receiverTitle, { color: colors.foreground }]}>Receive in this wallet</Text>
          <Text numberOfLines={1} style={[styles.balanceText, { color: colors.mutedForeground }]}>{profile?.address ?? 'Wallet address unavailable'}</Text>
        </View>
      </Card>
      {quote && balance !== null && amountIn > balance ? <Text accessibilityRole="alert" style={[styles.error, { color: colors.destructive }]}>This swap needs {fmt(amountIn)} AUSD, but you have {fmt(balance)} AUSD.</Text> : null}
      {profile?.mode !== 'mera' ? <InlineNotice icon="info">Create a Mera passkey wallet to request and approve an on-chain swap. Demo wallets cannot submit transactions.</InlineNotice> : null}
      <InlineNotice icon="alert-circle">CTK is a Monad testnet demo token, not a stablecoin or fiat currency. Swap execution may include first-use access and approval calls.</InlineNotice>
      {error && !quote ? <Text accessibilityRole="alert" style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}
      <PrimaryButton label={loading ? 'Getting quote…' : 'Review swap'} icon="arrow-right" onPress={reviewSwap} disabled={!canReview} />
    </Page>
  );
}

const styles = StyleSheet.create({
  page: { gap: 14, paddingTop: 8, paddingBottom: 24 },
  heading: { gap: 7, marginBottom: 3 },
  amountCard: { gap: 12, padding: 17 },
  outputCard: { gap: 12, padding: 17 },
  modeSwitch: { flexDirection: 'row', borderRadius: 14, padding: 4, gap: 4 },
  modeOption: { flex: 1, minHeight: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 11 },
  modeText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  label: { fontSize: 10, letterSpacing: 1, fontFamily: 'Inter_600SemiBold' },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  amountInput: { flex: 1, fontSize: 32, lineHeight: 40, padding: 0, fontFamily: 'Inter_600SemiBold' },
  output: { flex: 1, fontSize: 30, fontFamily: 'Inter_600SemiBold' },
  token: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  balanceText: { fontSize: 11, lineHeight: 16, fontFamily: 'Inter_400Regular' },
  max: { fontSize: 11, fontFamily: 'Inter_700Bold' },
  receiverCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 13 },
  receiverIcon: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  receiverTitle: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  arrow: { alignSelf: 'center', width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#00000010', marginVertical: -4 },
  error: { fontSize: 12, fontFamily: 'Inter_500Medium' },
});
