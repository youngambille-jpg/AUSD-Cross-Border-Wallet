import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useWallet } from '@/state/wallet-context';
import { getTokenBalance } from '@/services/passkey';
import { simulateTokenSwap, type SettlementQuote } from '@/services/settlement';
import { STABLECOIN_TOKENS, WALLET_TOKENS, type WalletToken } from '@/services/tokens';
import { BackButton, Body, Card, Eyebrow, InlineNotice, Page, PrimaryButton, Title } from '@/components/Primitives';

const fmt = (value: number) => value.toLocaleString('en-US', { maximumFractionDigits: 6 });

export default function SwapScreen() {
  const colors = useColors();
  const { profile, balance: demoBalance } = useWallet();
  const [route, setRoute] = useState<'instant-settlement' | 'stablecoin'>('instant-settlement');
  const [inputToken, setInputToken] = useState<WalletToken>('AUSD');
  const [outputToken, setOutputToken] = useState<WalletToken>('CTK');
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
    getTokenBalance(profile.address, quoteMode === 'exact-input' ? inputToken : outputToken)
      .then((value) => { if (active) setBalance(Number(value)); })
      .catch((caught: unknown) => { if (active) setBalanceError(caught instanceof Error ? caught.message : 'Balance unavailable'); });
    return () => { active = false; };
  }, [inputToken, outputToken, quoteMode, profile?.address, profile?.mode]);

  const enteredToken = quoteMode === 'exact-input' ? inputToken : outputToken;
  const receivedToken = quoteMode === 'exact-input' ? outputToken : inputToken;
  const enteredDecimals = WALLET_TOKENS[enteredToken].decimals;

  useEffect(() => {
    setQuote(null);
    setError('');
    setLoading(false);
    const decimals = enteredDecimals;
    if (!profile?.address || profile.mode !== 'mera' || !new RegExp(`^\\d+(\\.\\d{1,${decimals}})?$`).test(amount) || Number(amount) <= 0) return;
    let active = true;
    const timer = setTimeout(() => {
      setLoading(true);
      simulateTokenSwap(inputToken, outputToken, amount, profile.address!, quoteMode)
        .then((result) => { if (active) setQuote(result); })
        .catch((caught: unknown) => { if (active) setError(caught instanceof Error ? caught.message : 'Could not get a Monad testnet quote.'); })
        .finally(() => { if (active) setLoading(false); });
    }, 300);
    return () => { active = false; clearTimeout(timer); };
  }, [amount, enteredDecimals, inputToken, outputToken, quoteMode, profile?.address, profile?.mode]);

  const parsed = Number(amount);
  const amountIn = quote ? Number(quote.amountIn) : quoteMode === 'exact-input' ? parsed : 0;
  const inputAmountValid = quoteMode === 'exact-input'
    ? new RegExp(`^\\d+(\\.\\d{1,${enteredDecimals}})?$`).test(amount) && parsed > 0
    : new RegExp(`^\\d+(\\.\\d{1,${enteredDecimals}})?$`).test(amount) && parsed > 0;
  const canReview = profile?.mode === 'mera' && Boolean(profile.address && profile.signerAddress && profile.passkey) && Boolean(quote) && !loading && balance !== null && inputAmountValid && amountIn <= balance;

  function reviewSwap() {
    if (!profile?.address || !quote) return;
    if (balance === null) return setError(balanceError || `Wait for your ${enteredToken} balance to load.`);
    if (!inputAmountValid) return setError(`Enter a valid ${enteredToken} amount.`);
    if (amountIn > balance) return setError(`Available balance: ${fmt(balance)} ${enteredToken}.`);
    router.push({ pathname: '/review', params: { mode: 'token-swap', recipient: profile.address, amount: quote.amountIn, swapAmount: amount, inputToken, outputToken, quoteMode, quoteInputRaw: quote.amountInRaw, quoteOutput: quote.amountOut, quoteOutputRaw: quote.amountOutRaw, quoteCheckedAt: quote.checkedAt, pairAddress: quote.pairAddress, purchaseFeeRate: quote.purchaseFeeRate } });
  }

  function chooseInput(next: WalletToken) {
    setInputToken(next);
    if (next === outputToken) setOutputToken(inputToken);
    setAmount(''); setError('');
  }

  function chooseOutput(next: WalletToken) {
    setOutputToken(next);
    if (next === inputToken) setInputToken(outputToken);
    setAmount(''); setError('');
  }

  function chooseRoute(next: 'instant-settlement' | 'stablecoin') {
    setRoute(next);
    setAmount(''); setError(''); setQuote(null);
    if (next === 'instant-settlement') {
      setInputToken('AUSD'); setOutputToken('CTK');
    } else {
      setInputToken('AUSD'); setOutputToken('USDC');
    }
  }

  return (
    <Page contentStyle={styles.page}>
      <BackButton onPress={() => router.back()} />
      <View style={styles.heading}>
        <Eyebrow>AGORA INSTANT SETTLEMENT · MONAD TESTNET</Eyebrow>
        <Title>Swap tokens</Title>
        <Body>Trade the live AUSD/CTK pair. Your passkey approves the swap on Monad testnet.</Body>
      </View>
      <View style={[styles.routeSwitch, { backgroundColor: colors.secondary }]}>
        <Pressable onPress={() => chooseRoute('instant-settlement')} style={[styles.routeOption, route === 'instant-settlement' && { backgroundColor: colors.background }]}><Text style={[styles.modeText, { color: route === 'instant-settlement' ? colors.foreground : colors.mutedForeground }]}>Agora settlement</Text></Pressable>
        <Pressable onPress={() => chooseRoute('stablecoin')} style={[styles.routeOption, route === 'stablecoin' && { backgroundColor: colors.background }]}><Text style={[styles.modeText, { color: route === 'stablecoin' ? colors.foreground : colors.mutedForeground }]}>Stablecoin swap</Text></Pressable>
      </View>
      <TokenSelector label="FROM" value={inputToken} options={route === 'stablecoin' ? STABLECOIN_TOKENS : ['AUSD']} onChange={chooseInput} colors={colors} />
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
          <TextInput accessibilityLabel={`${enteredToken} amount`} value={amount} onChangeText={(value) => { setAmount(value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1')); setError(''); }} placeholder="0" placeholderTextColor={colors.mutedForeground} keyboardType="decimal-pad" style={[styles.amountInput, { color: colors.foreground }]} />
          <Text style={[styles.token, { color: colors.foreground }]}>{enteredToken}</Text>
        </View>
        <View style={styles.balanceRow}>
          <Text style={[styles.balanceText, { color: colors.mutedForeground }]}>{balance === null ? balanceError || 'Loading balance…' : `Available ${fmt(balance)} ${enteredToken}`}</Text>
          {balance !== null && profile?.mode === 'mera' && quoteMode === 'exact-input' ? <Text onPress={() => setAmount(String(balance))} style={[styles.max, { color: colors.primary }]}>MAX</Text> : null}
        </View>
      </Card>
      {amount.length > 0 && !inputAmountValid ? <Text accessibilityRole="alert" style={[styles.error, { color: colors.destructive }]}>Enter up to {enteredDecimals} decimal places for {enteredToken}.</Text> : null}
      <View style={styles.arrow}><Feather name="arrow-down" size={18} color={colors.primary} /></View>
      <TokenSelector label="TO" value={outputToken} options={route === 'stablecoin' ? STABLECOIN_TOKENS : ['CTK']} onChange={chooseOutput} colors={colors} />
      <Card style={styles.outputCard}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>{quoteMode === 'exact-input' ? 'ESTIMATED RECEIVE' : 'MAXIMUM YOU PAY'}</Text>
        <View style={styles.amountRow}>
          <Text style={[styles.output, { color: colors.foreground }]}>{loading ? '…' : quote ? fmt(Number(quoteMode === 'exact-input' ? quote.amountOut : quote.amountIn)) : '—'}</Text>
          <Text style={[styles.token, { color: colors.foreground }]}>{receivedToken}</Text>
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
      {quote && balance !== null && amountIn > balance ? <Text accessibilityRole="alert" style={[styles.error, { color: colors.destructive }]}>This swap needs {fmt(amountIn)} {enteredToken}, but you have {fmt(balance)} {enteredToken}.</Text> : null}
      {profile?.mode !== 'mera' ? <InlineNotice icon="info">Create a Mera passkey wallet to request and approve an on-chain swap. Demo wallets cannot submit transactions.</InlineNotice> : null}
      <InlineNotice icon={route === 'instant-settlement' ? 'zap' : 'info'}>{route === 'instant-settlement' ? 'Agora Instant Settlement uses the AUSD/CTK Monad testnet pair required for the hackathon.' : 'The stablecoin route uses a live AUSD/USDC pair when the Monad factory has liquidity for it.'}</InlineNotice>
      {error && !quote ? <Text accessibilityRole="alert" style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}
      <PrimaryButton label={loading ? 'Getting quote…' : 'Review swap'} icon="arrow-right" onPress={reviewSwap} disabled={!canReview} />
    </Page>
  );
}

function TokenSelector({ label, value, options, onChange, colors }: { label: string; value: WalletToken; options: WalletToken[]; onChange: (value: WalletToken) => void; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={styles.selector}>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
      <View style={styles.selectorRow}>
        {options.map((token) => (
          <Pressable key={token} onPress={() => onChange(token)} style={[styles.selectorOption, { backgroundColor: value === token ? colors.primary : colors.secondary }]}>
            <Text style={[styles.modeText, { color: value === token ? colors.primaryForeground : colors.foreground }]}>{token}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { gap: 14, paddingTop: 8, paddingBottom: 24 },
  heading: { gap: 7, marginBottom: 3 },
  selector: { gap: 8 },
  selectorRow: { flexDirection: 'row', gap: 8 },
  selectorOption: { paddingHorizontal: 18, minHeight: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  routeSwitch: { flexDirection: 'row', borderRadius: 14, padding: 4, gap: 4 },
  routeOption: { flex: 1, minHeight: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 11 },
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
