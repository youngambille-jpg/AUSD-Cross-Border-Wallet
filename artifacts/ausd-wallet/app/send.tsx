import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  PanResponder,
  useWindowDimensions,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { isAddress } from 'viem';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useWallet } from '@/state/wallet-context';
import { getTokenBalance } from '@/services/passkey';
import { simulateSettlementSwap, type SettlementQuote } from '@/services/settlement';
import { TRANSFER_TOKENS, WALLET_TOKENS, type WalletToken } from '@/services/tokens';
import { PrimaryButton } from '@/components/Primitives';

const money = (amount: number) =>
  amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 });

export default function SendDrawer() {
  const params = useLocalSearchParams<{ recipient?: string; recipientName?: string; token?: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const { profile, balance: demoBalance } = useWallet();
  const [recipient, setRecipient] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [amount, setAmount] = useState('');
  const [availableBalance, setAvailableBalance] = useState<number | null>(null);
  const [balanceError, setBalanceError] = useState('');
  const [error, setError] = useState('');
  const [sendMode, setSendMode] = useState<'direct' | 'settlement'>('direct');
  const [token, setToken] = useState<WalletToken>('AUSD');
  const [quote, setQuote] = useState<SettlementQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState('');
  const [drawerOffset, setDrawerOffset] = useState(0);
  const parsedAmount = Number(amount);
  const drawerPan = PanResponder.create({
    onMoveShouldSetPanResponder: (_event, gesture) => gesture.dy > 5,
    onPanResponderMove: (_event, gesture) => setDrawerOffset(Math.max(0, gesture.dy)),
    onPanResponderRelease: (_event, gesture) => {
      if (gesture.dy > 90 || gesture.vy > 0.8) router.back();
      setDrawerOffset(0);
    },
  });

  useEffect(() => {
    if (params.recipient) {
      setRecipient(params.recipient);
      setRecipientName(params.recipientName ?? '');
    }
  }, [params.recipient, params.recipientName]);

  useEffect(() => {
    if (params.token === 'AUSD' || params.token === 'USDC') setToken(params.token);
  }, [params.token]);

  useEffect(() => {
    if (profile?.mode !== 'mera' || !profile.address) return;
    let active = true;
    getTokenBalance(profile.address, sendMode === 'settlement' ? 'AUSD' : token)
      .then((value) => { if (active) setAvailableBalance(Number(value)); })
      .catch((caught: unknown) => {
        if (active) setBalanceError(caught instanceof Error ? caught.message : 'Balance unavailable');
      });
    return () => { active = false; };
  }, [sendMode, token, profile?.address, profile?.mode]);

  const balance = profile?.mode === 'mera' ? availableBalance : demoBalance;

  useEffect(() => {
    setQuote(null);
    setQuoteError('');
    if (sendMode !== 'settlement' || profile?.mode !== 'mera' || !profile.address || !/^\d+(\.\d{1,6})?$/.test(amount) || Number(amount) <= 0) {
      setQuoteLoading(false);
      return;
    }
    let active = true;
    const timer = setTimeout(() => {
      setQuoteLoading(true);
      simulateSettlementSwap(amount, profile.address!)
        .then((result) => { if (active) setQuote(result); })
        .catch((caught: unknown) => {
          if (active) setQuoteError(caught instanceof Error ? caught.message : 'Agora quote unavailable.');
        })
        .finally(() => { if (active) setQuoteLoading(false); });
    }, 350);
    return () => { active = false; clearTimeout(timer); };
  }, [amount, sendMode, profile?.address, profile?.mode]);

  async function continueToReview() {
    setError('');
    if (profile?.mode !== 'mera') {
      setError(`Create a Mera passkey wallet to send testnet ${sendMode === 'settlement' ? 'AUSD' : token}.`);
      return;
    }
    if (!profile.address || !profile.signerAddress || !profile.passkey) {
      setError('This passkey wallet needs to be set up again before it can send.');
      return;
    }
    if (!isAddress(recipient.trim(), { strict: false })) {
      setError('Enter a valid wallet address.');
      return;
    }
    if (!/^\d+(\.\d{1,6})?$/.test(amount) || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError(`Enter an amount with up to ${WALLET_TOKENS[sendMode === 'settlement' ? 'AUSD' : token].decimals} decimal places.`);
      return;
    }
    if (balance === null) {
      setError(balanceError || 'Loading your testnet balance…');
      return;
    }
    if (parsedAmount > balance) {
      setError(`Available: ${money(balance)} ${sendMode === 'settlement' ? 'AUSD' : token}.`);
      return;
    }
    if (sendMode === 'settlement') {
      try {
        const freshQuote = await simulateSettlementSwap(amount, profile.address);
        router.push({
          pathname: '/review',
          params: {
            mode: 'settlement', recipient: recipient.trim(), recipientName, amount, token: 'AUSD',
            quoteOutput: freshQuote.amountOut,
            quoteOutputRaw: freshQuote.amountOutRaw,
            quoteCheckedAt: freshQuote.checkedAt,
            pairAddress: freshQuote.pairAddress,
            purchaseFeeRate: freshQuote.purchaseFeeRate,
          },
        });
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Agora quote unavailable.');
      }
      return;
    }
    router.push({ pathname: '/review', params: { mode: 'direct', recipient: recipient.trim(), recipientName, amount, token } });
  }

  return (
    <View style={styles.overlay}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close send sheet"
        style={[StyleSheet.absoluteFill, styles.backdrop]}
        onPress={() => router.back()}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardLayer}
        pointerEvents="box-none"
      >
        <View
          style={[
            styles.sheet,
            {
              height: windowHeight * 0.75,
              backgroundColor: colors.background,
              paddingBottom: Math.max(insets.bottom, 18) + 14,
            },
          ]}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
          >
            <View {...drawerPan.panHandlers} style={styles.handleRow}>
              <View style={[styles.handle, { backgroundColor: colors.border }]} />
            </View>
            <View style={styles.heading}>
              <View>
                <Text style={[styles.title, { color: colors.foreground }]}>{sendMode === 'direct' ? `Send ${token}` : 'Cross-border'}</Text>
                <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{sendMode === 'direct' ? 'Direct wallet transfer' : 'Agora instant settlement · testnet'}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close send sheet"
                onPress={() => router.back()}
                style={[styles.close, { backgroundColor: colors.secondary }]}
              >
                <Feather name="x" size={19} color={colors.foreground} />
              </Pressable>
            </View>

            {sendMode === 'direct' ? (
              <View style={styles.tokenRow}>
                {TRANSFER_TOKENS.map((option) => (
                  <Pressable key={option} onPress={() => { setToken(option); setAmount(''); setError(''); }} style={[styles.tokenOption, { backgroundColor: token === option ? colors.primary : colors.secondary }]}>
                    <Text style={[styles.modeText, { color: token === option ? colors.primaryForeground : colors.foreground }]}>{option}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            <View style={[styles.modeSwitch, { backgroundColor: colors.secondary }]}>
              <Pressable onPress={() => { setSendMode('direct'); setError(''); }} style={[styles.modeOption, sendMode === 'direct' && { backgroundColor: colors.background }]}>
                <Text style={[styles.modeText, { color: sendMode === 'direct' ? colors.foreground : colors.mutedForeground }]}>AUSD transfer</Text>
              </Pressable>
              <Pressable onPress={() => { setSendMode('settlement'); setError(''); }} style={[styles.modeOption, sendMode === 'settlement' && { backgroundColor: colors.background }]}>
                <Text style={[styles.modeText, { color: sendMode === 'settlement' ? colors.foreground : colors.mutedForeground }]}>Cross-border</Text>
              </Pressable>
            </View>

            <View style={[styles.amountPanel, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>AMOUNT</Text>
              <View style={styles.amountRow}>
                <Text style={[styles.dollar, { color: colors.foreground }]}>$</Text>
                <TextInput
                  accessibilityLabel={`${sendMode === 'settlement' ? 'AUSD' : token} amount`}
                  value={amount}
                  onChangeText={(value) => setAmount(value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1'))}
                  placeholder="0"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="decimal-pad"
                  selectionColor={colors.primary}
                  style={[styles.amountInput, { color: colors.foreground }]}
                  autoFocus
                />
                <Text style={[styles.currency, { color: colors.mutedForeground }]}>{sendMode === 'settlement' ? 'AUSD' : token}</Text>
              </View>
              <View style={styles.balanceRow}>
                <Text style={[styles.balanceText, { color: colors.mutedForeground }]}>
                  {profile?.mode === 'mera'
                    ? availableBalance === null ? balanceError || 'Loading balance…' : `Available ${money(availableBalance)} ${sendMode === 'settlement' ? 'AUSD' : token}`
                    : `Demo balance ${money(demoBalance)} ${sendMode === 'settlement' ? 'AUSD' : token}`}
                </Text>
                {profile?.mode === 'mera' && availableBalance !== null ? (
                  <Pressable onPress={() => setAmount(String(availableBalance))}>
                    <Text style={[styles.maxText, { color: colors.primary }]}>MAX</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>

            {sendMode === 'settlement' ? (
              <View style={[styles.quotePanel, { backgroundColor: colors.secondary }]}>
                <View style={styles.quoteLine}>
                  <Text style={[styles.quoteLabel, { color: colors.mutedForeground }]}>Recipient receives</Text>
                  <Text style={[styles.quoteValue, { color: colors.foreground }]}>
                    {quoteLoading ? 'Updating…' : quote ? `${Number(quote.amountOut).toLocaleString('en-US', { maximumFractionDigits: quote.outputDecimals })} CTK` : '— CTK'}
                  </Text>
                </View>
                <Text style={[styles.quoteCaption, { color: colors.mutedForeground }]}>
                  {quoteError || (quote ? 'Agora fixed-price pair · CTK is a testnet mock payout token' : 'Enter an amount to get an Agora testnet quote.')}
                </Text>
              </View>
            ) : null}

            <View style={styles.recipientBlock}>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>{recipientName ? `TO · ${recipientName}` : 'TO'}</Text>
              <TextInput
                accessibilityLabel="Recipient wallet address"
                value={recipient}
                onChangeText={(value) => {
                  setRecipient(value);
                  if (value.toLowerCase() !== params.recipient?.toLowerCase()) setRecipientName('');
                }}
                placeholder="Wallet address"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="none"
                autoCorrect={false}
                selectionColor={colors.primary}
                style={[styles.recipientInput, { color: colors.foreground, backgroundColor: colors.secondary }]}
              />
            </View>

            <View style={styles.sponsorRow}>
              <Feather name="zap" size={15} color={colors.primary} />
              <Text style={[styles.sponsorText, { color: colors.mutedForeground }]}>{sendMode === 'settlement' ? 'Agora swap · Pimlico gas sponsorship requested' : 'Pimlico gas sponsorship requested'}</Text>
            </View>
            {sendMode === 'settlement' ? <Text style={[styles.firstTimeNote, { color: colors.mutedForeground }]}>First swap may include one-time testnet access and token approval.</Text> : null}
            {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}
            <PrimaryButton label={sendMode === 'direct' ? 'Review transfer' : 'Review settlement'} icon="arrow-right" onPress={continueToReview} disabled={sendMode === 'settlement' && (!quote || quoteLoading || !!quoteError)} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { backgroundColor: 'rgba(16, 18, 24, 0.48)' },
  keyboardLayer: { flex: 1, justifyContent: 'flex-end' },
  sheet: { maxHeight: '75%', borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' },
  content: { paddingHorizontal: 22, paddingTop: 9, gap: 20 },
  modeSwitch: { borderRadius: 14, padding: 4, flexDirection: 'row', gap: 4 },
  tokenRow: { flexDirection: 'row', gap: 8 },
  tokenOption: { minHeight: 36, paddingHorizontal: 18, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  modeOption: { flex: 1, minHeight: 39, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  modeText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  handleRow: { alignItems: 'center', height: 12 },
  handle: { width: 38, height: 4, borderRadius: 3 },
  heading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 25, letterSpacing: -0.6, fontFamily: 'Inter_600SemiBold' },
  subtitle: { marginTop: 4, fontSize: 12, fontFamily: 'Inter_400Regular' },
  close: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  amountPanel: { borderRadius: 20, paddingHorizontal: 17, paddingTop: 16, paddingBottom: 13, gap: 8 },
  label: { fontSize: 10, letterSpacing: 1, fontFamily: 'Inter_600SemiBold' },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dollar: { fontSize: 25, fontFamily: 'Inter_500Medium' },
  amountInput: { minWidth: 50, flex: 1, padding: 0, fontSize: 42, lineHeight: 50, letterSpacing: -1.4, fontFamily: 'Inter_600SemiBold' },
  currency: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  balanceText: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  maxText: { fontSize: 10, letterSpacing: 0.6, fontFamily: 'Inter_700Bold' },
  recipientBlock: { gap: 8 },
  quotePanel: { borderRadius: 16, padding: 14, gap: 6 },
  quoteLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  quoteLabel: { fontSize: 11, fontFamily: 'Inter_500Medium' },
  quoteValue: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  quoteCaption: { fontSize: 10, lineHeight: 15, fontFamily: 'Inter_400Regular' },
  recipientInput: { height: 52, borderRadius: 14, paddingHorizontal: 15, fontSize: 13, fontFamily: 'Inter_500Medium' },
  sponsorRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: -7 },
  sponsorText: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  firstTimeNote: { marginTop: -15, fontSize: 10, lineHeight: 15, fontFamily: 'Inter_400Regular' },
  error: { fontSize: 12, lineHeight: 17, fontFamily: 'Inter_500Medium' },
});
