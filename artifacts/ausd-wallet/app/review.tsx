import React, { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { isAddress } from 'viem';
import { useColors } from '@/hooks/useColors';
import { useWallet } from '@/state/wallet-context';
import {
  sendSponsoredAUSDTransfer,
  sendSponsoredInstantSettlementSwap,
  type SponsoredSettlementResult,
} from '@/services/passkey';
import { MONAD_TESTNET } from '@/services/settlement';
import {
  BackButton,
  Card,
  Eyebrow,
  Page,
  PrimaryButton,
  Title,
} from '@/components/Primitives';

export default function ReviewScreen() {
  const colors = useColors();
  const params = useLocalSearchParams<{
    mode?: string; recipient?: string; recipientName?: string; amount?: string; quoteOutput?: string;
    swapAmount?: string; quoteMode?: string; quoteInputRaw?: string;
    quoteOutputRaw?: string; quoteCheckedAt?: string; pairAddress?: string; purchaseFeeRate?: string;
  }>();
  const { profile, addTransfer } = useWallet();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const amount = Number(params.amount ?? 0);
  const recipient = typeof params.recipient === 'string' ? params.recipient.trim() : '';
  const recipientName = typeof params.recipientName === 'string' ? params.recipientName.trim() : '';
  const settlement = params.mode === 'settlement' || params.mode === 'agora-swap';
  const swapOnly = params.mode === 'agora-swap';
  const quoteOutput = typeof params.quoteOutput === 'string' ? params.quoteOutput : '';
  const purchaseFeeRate = typeof params.purchaseFeeRate === 'string' ? Number(params.purchaseFeeRate) : 0;
  const quoteCheckedAt = typeof params.quoteCheckedAt === 'string' ? params.quoteCheckedAt : '';
  const quoteTime = quoteCheckedAt && Number.isFinite(Date.parse(quoteCheckedAt))
    ? new Date(quoteCheckedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : '';

  async function confirmTransfer() {
    if (!profile) {
      setError('Your wallet session has ended. Return to setup and try again.');
      return;
    }
    if (profile.mode !== 'mera' || !profile.address || !profile.signerAddress || !profile.passkey) {
      setError('A Mera passkey wallet is required to send AUSD. Demo wallets cannot submit transactions.');
      return;
    }
    if (!isAddress(recipient, { strict: false })) {
      setError('Enter a valid Monad-compatible wallet address for the recipient.');
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter a valid amount before reviewing the transfer.');
      return;
    }
    setError('');
    setBusy(true);
    try {
      const account = {
        address: profile.address,
        signerAddress: profile.signerAddress,
        credential: profile.passkey.credential,
        rpId: profile.passkey.rpId,
      };
      const result = settlement
        ? await sendSponsoredInstantSettlementSwap(account, recipient, swapOnly ? String(params.swapAmount ?? params.amount) : String(params.amount), {
            pairAddress: typeof params.pairAddress === 'string' ? params.pairAddress : '',
            amountInRaw: typeof params.quoteInputRaw === 'string' ? params.quoteInputRaw : undefined,
            amountOutRaw: typeof params.quoteOutputRaw === 'string' ? params.quoteOutputRaw : '',
            checkedAt: typeof params.quoteCheckedAt === 'string' ? params.quoteCheckedAt : '',
            quoteMode: params.quoteMode === 'exact-output' ? 'exact-output' : 'exact-input',
          }, swapOnly)
        : await sendSponsoredAUSDTransfer(account, recipient, String(params.amount));
      const settlementResult = settlement ? result as SponsoredSettlementResult : null;
      const sentAmount = settlementResult ? Number(settlementResult.amountIn) : amount;
      const receivedAmount = settlementResult ? Number(settlementResult.amountOut) : amount;
      const receivedCurrency = settlementResult?.outputSymbol ?? 'AUSD';
      const transfer = {
        id: result.transactionHash,
        recipient,
        amount: sentAmount,
        currency: 'AUSD',
        receivedAmount,
        receivedCurrency,
        settlementKind: settlement ? 'agora-instant-settlement' as const : 'direct' as const,
        createdAt: new Date().toISOString(),
        mode: profile.mode,
        transactionHash: result.transactionHash,
        sponsored: true,
        ...(settlementResult ? { pairAddress: settlementResult.pairAddress, quoteOutput: settlementResult.amountOut, quoteSymbol: settlementResult.outputSymbol } : {}),
      };
      await addTransfer(transfer);
      router.replace({
        pathname: '/success',
        params: {
          recipient: transfer.recipient,
          amount: String(sentAmount),
          currency: 'AUSD',
          receiveAmount: String(receivedAmount),
          receiveCurrency: receivedCurrency,
          settlement: settlement ? 'agora' : 'direct',
          id: transfer.id,
          transactionHash: result.transactionHash,
          accountAddress: result.accountAddress,
          blockNumber: result.blockNumber.toString(),
        },
      });
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'The sponsored transfer failed. No receipt was recorded.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page contentStyle={styles.page}>
      <BackButton onPress={() => router.back()} />
      <View style={styles.heading}>
        <Eyebrow>{settlement ? 'AGORA INSTANT SETTLEMENT' : 'FINAL CHECK'}</Eyebrow>
        <Title>{swapOnly ? 'Review swap' : settlement ? 'Review payout' : 'Review send'}</Title>
      </View>
      <Card style={styles.summaryCard}>
        <View style={styles.summaryLine}>
          <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>YOU SEND</Text>
          <Text style={[styles.amountValue, { color: colors.foreground }]}>
            {amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })} <Text style={[styles.amountUnit, { color: colors.mutedForeground }]}>AUSD</Text>
          </Text>
        </View>
        <View style={[styles.rule, { backgroundColor: colors.border }]} />
        <View style={styles.summaryLine}>
          <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>{settlement ? 'AGORA QUOTED OUTPUT' : 'RECIPIENT RECEIVES'}</Text>
          <Text style={[styles.outputValue, { color: colors.foreground }]}>
            {settlement
              ? quoteOutput ? `${Number(quoteOutput).toLocaleString('en-US', { maximumFractionDigits: 6 })} CTK` : 'Quote unavailable'
              : `${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })} AUSD`}
          </Text>
        </View>
        {settlement ? (
          <Text style={[styles.quoteNote, { color: colors.mutedForeground }]}>
            {quoteTime ? `Quote from ${quoteTime} · ` : ''}{purchaseFeeRate > 0 ? `Agora purchase fee ${(purchaseFeeRate * 100).toLocaleString('en-US', { maximumFractionDigits: 4 })}% is included. ` : 'Agora fees are included in the quoted amount. '}CTK is a Monad testnet demo token, not fiat.
          </Text>
        ) : null}
      </Card>
      <Card style={styles.detailsCard}>
        <View style={styles.detailRow}>
          <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>{swapOnly ? 'OUTPUT WALLET' : 'TO'}</Text>
          <Text selectable style={[styles.recipient, { color: colors.foreground }]}>{recipientName ? `${recipientName} · ${recipient}` : recipient}</Text>
        </View>
        <View style={[styles.rule, { backgroundColor: colors.border }]} />
        <View style={styles.detailRow}>
          <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>NETWORK</Text>
          <Text style={[styles.detailValue, { color: colors.foreground }]}>{MONAD_TESTNET.name}</Text>
        </View>
        <View style={[styles.rule, { backgroundColor: colors.border }]} />
        <View style={styles.detailRow}>
          <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>NETWORK FEE</Text>
          <Text style={[styles.detailValue, { color: colors.foreground }]}>Sponsorship requested · no MON if approved</Text>
        </View>
      </Card>
      {settlement ? <Text style={[styles.firstTimeNote, { color: colors.mutedForeground }]}>First use may enable this testnet wallet and approve the pair. One passkey approval covers the sponsored batch.</Text> : null}
      {busy ? (
        <View accessibilityLiveRegion="polite" style={[styles.progressPanel, { backgroundColor: colors.secondary }]}>
          <ActivityIndicator color={colors.primary} />
          <View style={styles.progressCopy}>
            <Text style={[styles.progressTitle, { color: colors.foreground }]}>Waiting for confirmation</Text>
            <Text style={[styles.networkCaption, { color: colors.mutedForeground }]}>Approve with your passkey, then we’ll wait for Monad testnet to confirm.</Text>
          </View>
        </View>
      ) : null}
      {error ? (
        <View accessibilityRole="alert" style={[styles.errorPanel, { backgroundColor: colors.secondary }]}>
          <Feather name="alert-circle" size={17} color={colors.destructive} />
          <View style={styles.progressCopy}>
            <Text style={[styles.progressTitle, { color: colors.destructive }]}>{swapOnly ? 'Swap not confirmed' : 'Transfer not confirmed'}</Text>
            <Text style={[styles.error, { color: colors.mutedForeground }]}>{error}</Text>
            <Text style={[styles.errorHint, { color: colors.mutedForeground }]}>If you approved a transaction, check Activity or MonadVision before trying again.</Text>
          </View>
        </View>
      ) : null}
      <PrimaryButton
        label={busy ? 'Confirming on Monad…' : swapOnly ? 'Approve & swap' : settlement ? 'Approve & settle' : 'Approve & send'}
        icon="arrow-right"
        onPress={confirmTransfer}
        loading={busy}
        testID="confirm-transfer"
      />
      <Text style={[styles.disclaimer, { color: colors.mutedForeground }]}>Passkey approval required · Monad testnet only</Text>
    </Page>
  );
}

const styles = StyleSheet.create({
  page: { gap: 16, paddingTop: 8 },
  heading: { gap: 6, marginTop: 5 },
  summaryCard: { gap: 12, padding: 16 },
  summaryLine: { gap: 7 },
  rule: { height: StyleSheet.hairlineWidth },
  amountValue: { fontSize: 27, letterSpacing: -0.7, fontFamily: 'Inter_600SemiBold' },
  amountUnit: { fontSize: 17, fontFamily: 'Inter_500Medium' },
  outputValue: { fontSize: 20, fontFamily: 'Inter_600SemiBold' },
  quoteNote: { fontSize: 10, lineHeight: 15, fontFamily: 'Inter_400Regular' },
  detailsCard: { gap: 11, padding: 15 },
  detailRow: { gap: 6 },
  metaLabel: { fontSize: 10, letterSpacing: 0.8, fontFamily: 'Inter_600SemiBold' },
  recipient: { fontSize: 13, lineHeight: 19, fontFamily: 'Inter_500Medium' },
  detailValue: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  networkCaption: { marginTop: 3, fontSize: 10, fontFamily: 'Inter_400Regular' },
  progressPanel: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 14 },
  progressCopy: { flex: 1, gap: 4 },
  progressTitle: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  errorPanel: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: 14, padding: 14 },
  error: { fontSize: 11, lineHeight: 16, fontFamily: 'Inter_400Regular' },
  errorHint: { fontSize: 10, lineHeight: 15, fontFamily: 'Inter_400Regular' },
  disclaimer: { textAlign: 'center', fontSize: 10, fontFamily: 'Inter_400Regular' },
  firstTimeNote: { fontSize: 10, lineHeight: 15, fontFamily: 'Inter_400Regular' },
});
