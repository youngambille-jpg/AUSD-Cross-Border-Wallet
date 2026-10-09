import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { isAddress } from 'viem';
import { useColors } from '@/hooks/useColors';
import { useWallet } from '@/state/wallet-context';
import { MONAD_TESTNET } from '@/services/settlement';
import { AuroraAsset, AuroraQuote, AuroraTransaction, getAuroraApiKeyConfigured, getAuroraAssets, getAuroraDepositStatus, requestAuroraDepositQuote } from '@/services/aurora-intents';
import { BackButton, Body, Card, Eyebrow, InlineNotice, Page, PrimaryButton, Title } from '@/components/Primitives';

const EVM_ORIGINS = new Set(['eth', 'ethereum', 'aurora', 'avax', 'avalanche', 'base', 'bera', 'bsc', 'gnosis', 'arbitrum', 'arb', 'op', 'optimism', 'pol', 'polygon', 'scroll', 'xlayer', 'monad']);

const CHAIN_NAMES: Record<string, string> = { eth: 'Ethereum', arb: 'Arbitrum', op: 'Optimism', pol: 'Polygon', avax: 'Avalanche', bsc: 'BNB Chain', gnosis: 'Gnosis' };
const chainName = (chain: string) => CHAIN_NAMES[chain.toLowerCase()] ?? chain.charAt(0).toUpperCase() + chain.slice(1);
const formatUnits = (raw: string | undefined, decimals: number) => {
  if (!raw) return '—';
  const integer = BigInt(raw);
  const scale = 10n ** BigInt(decimals);
  const whole = integer / scale;
  const fraction = (integer % scale).toString().padStart(decimals, '0').replace(/0+$/, '');
  return fraction ? `${whole.toLocaleString('en-US')}.${fraction}` : whole.toLocaleString('en-US');
};

export default function AuroraDepositScreen() {
  const colors = useColors();
  const { profile } = useWallet();
  const [assets, setAssets] = useState<AuroraAsset[]>([]);
  const [assetLoading, setAssetLoading] = useState(true);
  const [assetError, setAssetError] = useState('');
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [amount, setAmount] = useState('');
  const [refundAddress, setRefundAddress] = useState('');
  const [quote, setQuote] = useState<AuroraQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState('');
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<AuroraTransaction | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState('');

  const loadAssets = useCallback(async () => {
    setAssetLoading(true);
    setAssetError('');
    try {
      const supported = await getAuroraAssets();
      setAssets(supported);
      const current = supported.find((asset) => asset.blockchain.toLowerCase() === 'monad' &&
        asset.symbol.toUpperCase() === 'AUSD' &&
        asset.contractAddress?.toLowerCase() === MONAD_TESTNET.ausdAddress.toLowerCase());
      if (!current) throw new Error('Aurora does not currently list this wallet’s Monad AUSD token as a destination asset.');
      const source = supported.find((asset) => EVM_ORIGINS.has(asset.blockchain.toLowerCase()) && asset.blockchain.toLowerCase() !== 'monad');
      setSelectedAssetId((previous) => previous || source?.assetId || '');
    } catch (caught) {
      setAssetError(caught instanceof Error ? caught.message : 'Could not load Aurora supported tokens.');
    } finally {
      setAssetLoading(false);
    }
  }, []);

  useEffect(() => { void loadAssets(); }, [loadAssets]);
  useEffect(() => { if (profile?.address) setRefundAddress(profile.address); }, [profile?.address]);

  const destination = useMemo(() => assets.find((asset) => asset.blockchain.toLowerCase() === 'monad' &&
    asset.symbol.toUpperCase() === 'AUSD' &&
    asset.contractAddress?.toLowerCase() === MONAD_TESTNET.ausdAddress.toLowerCase()), [assets]);
  const origins = useMemo(() => assets
    .filter((asset) => EVM_ORIGINS.has(asset.blockchain.toLowerCase()) && asset.blockchain.toLowerCase() !== 'monad')
    .sort((left, right) => chainName(left.blockchain).localeCompare(chainName(right.blockchain)) || left.symbol.localeCompare(right.symbol)), [assets]);
  const selectedAsset = origins.find((asset) => asset.assetId === selectedAssetId);
  const amountValid = Boolean(selectedAsset && /^\d+(\.\d+)?$/.test(amount) && Number(amount) > 0 && (amount.split('.')[1]?.length ?? 0) <= selectedAsset.decimals);

  async function createQuote() {
    setQuoteError('');
    setStatus(null);
    if (!profile?.address || profile.mode !== 'mera') return setQuoteError('Set up a Mera passkey wallet before creating a cross-chain deposit.');
    if (!selectedAsset || !destination) return setQuoteError('A supported source token and Monad AUSD destination are required.');
    if (!amountValid) return setQuoteError(`Enter an amount greater than zero with up to ${selectedAsset.decimals} decimals.`);
    if (!isAddress(refundAddress.trim(), { strict: false })) return setQuoteError('Enter a valid EVM address for refunds on the source network.');
    setQuoteLoading(true);
    try {
      const result = await requestAuroraDepositQuote({ sourceAsset: selectedAsset, destinationAsset: destination, amount, recipient: profile.address, refundTo: refundAddress.trim() });
      setQuote(result);
    } catch (caught) {
      setQuoteError(caught instanceof Error ? caught.message : 'Could not create an Aurora deposit quote.');
    } finally {
      setQuoteLoading(false);
    }
  }

  async function copyDepositAddress() {
    if (!quote?.quote.depositAddress) return;
    await Clipboard.setStringAsync(quote.quote.depositAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  async function checkStatus() {
    if (!quote || !profile?.address) return;
    setStatusLoading(true);
    setStatusError('');
    try {
      setStatus(await getAuroraDepositStatus(profile.address, quote.quote.depositAddress));
    } catch (caught) {
      setStatusError(caught instanceof Error ? caught.message : 'Could not retrieve deposit status.');
    } finally {
      setStatusLoading(false);
    }
  }

  const statusDescription = status ? ({
    KNOWN_DEPOSIT_TX: 'Deposit transaction detected; waiting for source-chain confirmation.',
    PENDING_DEPOSIT: 'Waiting for your deposit to arrive.',
    INCOMPLETE_DEPOSIT: 'The received amount is below the quoted amount. Check Aurora status before sending more.',
    PROCESSING: 'Deposit received. Aurora is processing the route.',
    SUCCESS: 'AUSD was delivered to your Monad wallet.',
    REFUNDED: 'The deposit was refunded to the refund address.',
    FAILED: 'The route failed. Check Aurora status and refund details.',
  } as const)[status.status] : '';

  return (
    <Page contentStyle={styles.page}>
      <BackButton onPress={() => router.back()} />
      <View style={styles.heading}>
        <Eyebrow>CROSS-CHAIN DEPOSIT</Eyebrow>
        <Title>Deposit with Aurora</Title>
        <Body>Bridge a supported EVM token into AUSD on Monad. Aurora creates a temporary deposit address for each quote.</Body>
      </View>

      {profile?.mode !== 'mera' ? <InlineNotice icon="info">A Mera passkey wallet is required as the Monad AUSD destination.</InlineNotice> : null}
      {!getAuroraApiKeyConfigured() ? (
        <InlineNotice icon="alert-circle">Aurora Intents is not configured yet. Add EXPO_PUBLIC_AURORA_INTENTS_API_KEY from Aurora Intents Studio, then restart or rebuild the app.</InlineNotice>
      ) : null}

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Send from</Text>
        {assetLoading ? <View style={styles.loading}><ActivityIndicator color={colors.primary} /><Text style={[styles.help, { color: colors.mutedForeground }]}>Loading supported assets…</Text></View> : null}
        {assetError ? <Text accessibilityRole="alert" style={[styles.error, { color: colors.destructive }]}>{assetError}</Text> : null}
        {!assetLoading && origins.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tokenList}>
            {origins.map((asset) => {
              const active = asset.assetId === selectedAssetId;
              return <Pressable key={asset.assetId} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => { setSelectedAssetId(asset.assetId); setQuote(null); setStatus(null); }} style={[styles.tokenChoice, { backgroundColor: active ? colors.primary : colors.secondary }]}>
                <Text style={[styles.tokenSymbol, { color: active ? colors.primaryForeground : colors.foreground }]}>{asset.symbol}</Text>
                <Text style={[styles.tokenChain, { color: active ? colors.primaryForeground : colors.mutedForeground }]}>{chainName(asset.blockchain)}</Text>
              </Pressable>;
            })}
          </ScrollView>
        ) : null}
        <Text style={[styles.help, { color: colors.mutedForeground }]}>Only supported EVM assets are listed so refunds can use your 0x wallet address.</Text>
      </View>

      <Card style={styles.amountCard}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>AMOUNT TO DEPOSIT{selectedAsset ? ` · ${selectedAsset.symbol}` : ''}</Text>
        <TextInput accessibilityLabel="Source token amount" value={amount} onChangeText={(value) => { setAmount(value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1')); setQuote(null); setStatus(null); }} placeholder="0.00" placeholderTextColor={colors.mutedForeground} keyboardType="decimal-pad" style={[styles.amountInput, { color: colors.foreground }]} />
      </Card>

      <Card style={styles.destinationCard}>
        <View style={styles.destinationIcon}><Feather name="arrow-down" size={16} color={colors.primary} /></View>
        <View style={styles.destinationText}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>YOU RECEIVE</Text>
          <Text style={[styles.destinationName, { color: colors.foreground }]}>Agora AUSD · Monad</Text>
          <Text style={[styles.help, { color: colors.mutedForeground }]} numberOfLines={1}>{profile?.address ?? 'Wallet address unavailable'}</Text>
        </View>
      </Card>

      <View style={styles.refundBlock}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Refund address on source network</Text>
        <TextInput accessibilityLabel="Aurora source network refund address" value={refundAddress} onChangeText={(value) => { setRefundAddress(value); setQuote(null); setStatus(null); }} placeholder="0x…" placeholderTextColor={colors.mutedForeground} autoCapitalize="none" autoCorrect={false} style={[styles.refundInput, { color: colors.foreground, backgroundColor: colors.secondary }]} />
        <Text style={[styles.help, { color: colors.mutedForeground }]}>Defaults to your Monad wallet address. Change it if you want refunds sent to another EVM address you control.</Text>
      </View>

      <PrimaryButton label={quoteLoading ? 'Getting quote…' : quote ? 'Refresh deposit quote' : 'Get deposit instructions'} icon="arrow-right" onPress={() => void createQuote()} loading={quoteLoading} disabled={quoteLoading || !getAuroraApiKeyConfigured() || !destination || !selectedAsset || !amountValid || profile?.mode !== 'mera'} />
      {quoteError ? <Text accessibilityRole="alert" style={[styles.error, { color: colors.destructive }]}>{quoteError}</Text> : null}

      {quote ? (
        <>
          <Card style={styles.quoteCard}>
            <View style={styles.quoteHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.quoteAmount, { color: colors.foreground }]}>{quote.quote.amountOutFormatted ?? '—'} AUSD</Text>
                <Text style={[styles.help, { color: colors.mutedForeground }]}>Estimated receive{quote.quote.amountOutUsd ? ` · $${quote.quote.amountOutUsd}` : ''}</Text>
                <Text style={[styles.help, { color: colors.mutedForeground }]}>Minimum after 1% slippage: {formatUnits(quote.quote.minAmountOut, destination?.decimals ?? 6)} AUSD</Text>
              </View>
              <View style={[styles.liveBadge, { backgroundColor: colors.secondary }]}><View style={[styles.liveDot, { backgroundColor: colors.primary }]} /><Text style={[styles.liveText, { color: colors.foreground }]}>QUOTED</Text></View>
            </View>
            <View style={[styles.qrFrame, { backgroundColor: '#fff' }]}><QRCode value={quote.quote.depositAddress} size={180} color="#111111" backgroundColor="#ffffff" quietZone={10} ecl="M" /></View>
            <Text style={[styles.addressLabel, { color: colors.mutedForeground }]}>SEND {amount} {selectedAsset?.symbol} ON {selectedAsset ? chainName(selectedAsset.blockchain).toUpperCase() : ''} TO</Text>
            <Text selectable style={[styles.depositAddress, { color: colors.foreground }]}>{quote.quote.depositAddress}</Text>
            <PrimaryButton label={copied ? 'Deposit address copied' : 'Copy deposit address'} icon={copied ? 'check' : 'copy'} onPress={() => void copyDepositAddress()} secondary />
            {quote.quote.depositMemo ? <View style={[styles.memoBox, { backgroundColor: colors.secondary }]}><Text style={[styles.addressLabel, { color: colors.mutedForeground }]}>REQUIRED MEMO</Text><Text selectable style={[styles.depositAddress, { color: colors.foreground }]}>{quote.quote.depositMemo}</Text></View> : null}
            {quote.quote.timeWhenInactive ? <Text style={[styles.help, { color: colors.mutedForeground }]}>Deposit address expires {new Date(quote.quote.timeWhenInactive).toLocaleString()}.</Text> : null}
            {quote.quote.deadline ? <Text style={[styles.help, { color: colors.mutedForeground }]}>Route deadline {new Date(quote.quote.deadline).toLocaleString()}.</Text> : null}
          </Card>
          <InlineNotice icon="alert-circle">Send only {selectedAsset?.symbol} on {selectedAsset ? chainName(selectedAsset.blockchain) : ''} to this quote address. Sending another token or using another network can lose funds. Refunds, if needed, go to your wallet address on the source EVM chain.</InlineNotice>
          <PrimaryButton label={statusLoading ? 'Checking status…' : 'Check deposit status'} icon="refresh-cw" onPress={() => void checkStatus()} loading={statusLoading} />
          {statusError ? <Text accessibilityRole="alert" style={[styles.error, { color: colors.destructive }]}>{statusError}</Text> : null}
          {status ? <Card style={styles.statusCard}>
            <Text style={[styles.statusLabel, { color: colors.mutedForeground }]}>{status.status.replaceAll('_', ' ')}</Text>
            <Text style={[styles.statusDescription, { color: colors.foreground }]}>{statusDescription}</Text>
            {status.originChainTxHashes.map((hash) => <Text key={hash} selectable style={[styles.help, { color: colors.mutedForeground }]}>Source transaction: {hash}</Text>)}
            {status.destinationChainTxHashes.map((hash) => <Text key={hash} selectable style={[styles.help, { color: colors.mutedForeground }]}>Monad transaction: {hash}</Text>)}
            {status.refundReason ? <Text style={[styles.help, { color: colors.destructive }]}>Refund detail: {status.refundReason}</Text> : null}
          </Card> : null}
        </>
      ) : null}

      <InlineNotice icon="shield">Each quote creates a one-time Aurora deposit address. Review the token, source network, amount, recipient, and expiry before sending from your external wallet.</InlineNotice>
    </Page>
  );
}

const styles = StyleSheet.create({
  page: { gap: 15, paddingTop: 8, paddingBottom: 28 },
  heading: { gap: 7, marginBottom: 2 },
  section: { gap: 10 },
  sectionTitle: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  tokenList: { gap: 8, paddingRight: 4 },
  tokenChoice: { minWidth: 84, borderRadius: 15, paddingHorizontal: 12, paddingVertical: 10, gap: 4 },
  tokenSymbol: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  tokenChain: { fontSize: 10, fontFamily: 'Inter_400Regular' },
  help: { fontSize: 11, lineHeight: 16, fontFamily: 'Inter_400Regular' },
  error: { fontSize: 12, lineHeight: 17, fontFamily: 'Inter_500Medium' },
  loading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  amountCard: { gap: 10, padding: 16 },
  label: { fontSize: 10, letterSpacing: 0.7, fontFamily: 'Inter_600SemiBold' },
  amountInput: { fontSize: 30, lineHeight: 39, padding: 0, fontFamily: 'Inter_600SemiBold' },
  destinationCard: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 14 },
  destinationIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#00000010' },
  destinationText: { flex: 1, gap: 3 },
  destinationName: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  refundBlock: { gap: 8 },
  refundInput: { minHeight: 48, borderRadius: 14, paddingHorizontal: 13, fontSize: 12, fontFamily: 'Inter_500Medium' },
  quoteCard: { alignItems: 'center', gap: 12, padding: 16 },
  quoteHeader: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  quoteAmount: { fontSize: 23, fontFamily: 'Inter_600SemiBold' },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 14, paddingHorizontal: 9, paddingVertical: 6 },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  liveText: { fontSize: 9, letterSpacing: 0.6, fontFamily: 'Inter_700Bold' },
  qrFrame: { padding: 10, borderRadius: 12 },
  addressLabel: { alignSelf: 'stretch', fontSize: 9, letterSpacing: 0.6, fontFamily: 'Inter_600SemiBold' },
  depositAddress: { alignSelf: 'stretch', fontSize: 11, lineHeight: 17, fontFamily: 'Inter_500Medium' },
  memoBox: { alignSelf: 'stretch', gap: 6, borderRadius: 12, padding: 12 },
  statusCard: { gap: 7, padding: 15 },
  statusLabel: { fontSize: 10, letterSpacing: 0.7, fontFamily: 'Inter_700Bold' },
  statusDescription: { fontSize: 13, lineHeight: 18, fontFamily: 'Inter_500Medium' },
});
