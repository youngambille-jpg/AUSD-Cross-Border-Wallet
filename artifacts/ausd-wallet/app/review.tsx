import React, { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
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
  Eyebrow,
  Page,
  PrimaryButton,
  Title,
} from '@/components/Primitives';

export default function ReviewScreen() {
  const colors = useColors();
  const params = useLocalSearchParams<{
    mode?: string; recipient?: string; amount?: string; quoteOutput?: string;
    quoteOutputRaw?: string; quoteCheckedAt?: string; pairAddress?: string;
  }>();
  const { profile, addTransfer } = useWallet();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const amount = Number(params.amount ?? 0);
  const recipient = typeof params.recipient === 'string' ? params.recipient.trim() : '';
  const settlement = params.mode === 'settlement';
  const quoteOutput = typeof params.quoteOutput === 'string' ? params.quoteOutput : '';

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
        ? await sendSponsoredInstantSettlementSwap(account, recipient, String(params.amount), {
            pairAddress: typeof params.pairAddress === 'string' ? params.pairAddress : '',
            amountOutRaw: typeof params.quoteOutputRaw === 'string' ? params.quoteOutputRaw : '',
            checkedAt: typeof params.quoteCheckedAt === 'string' ? params.quoteCheckedAt : '',
          })
        : await sendSponsoredAUSDTransfer(account, recipient, String(params.amount));
      const settlementResult = settlement ? result as SponsoredSettlementResult : null;
      const receivedAmount = settlementResult ? Number(settlementResult.amountOut) : amount;
      const receivedCurrency = settlementResult?.outputSymbol ?? 'AUSD';
      const transfer = {
        id: result.transactionHash,
        recipient,
        amount,
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
          amount: String(amount),
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
        <Title>{settlement ? 'Review payout' : 'Review send'}</Title>
      </View>
      <View style={[styles.amountPanel, { backgroundColor: colors.secondary }]}>
        <Text style={[styles.amountLabel, { color: colors.mutedForeground }]}>YOU SEND</Text>
        <Text style={[styles.amountValue, { color: colors.foreground }]}>
          {amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })} <Text style={styles.amountUnit}>AUSD</Text>
        </Text>
      </View>
      {settlement ? (
        <View style={[styles.receivePanel, { backgroundColor: colors.secondary }]}>
          <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>RECIPIENT GETS · AFTER AGORA FEES</Text>
          <Text style={[styles.receiveValue, { color: colors.foreground }]}>{quoteOutput ? `${Number(quoteOutput).toLocaleString('en-US', { maximumFractionDigits: 6 })} CTK` : 'Quote missing'}</Text>
          <Text style={[styles.quoteNote, { color: colors.mutedForeground }]}>CTK is a mock payout token on Monad testnet. This does not represent a real currency payout.</Text>
        </View>
      ) : null}
      <View style={styles.recipientBlock}>
        <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>TO</Text>
        <Text selectable style={[styles.recipient, { color: colors.foreground }]}>{recipient}</Text>
      </View>
      <View style={styles.networkRow}>
        <View style={[styles.networkIcon, { backgroundColor: colors.secondary }]}>
          <Feather name="zap" size={16} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.networkTitle, { color: colors.foreground }]}>{MONAD_TESTNET.name}</Text>
          <Text style={[styles.networkCaption, { color: colors.mutedForeground }]}>{settlement ? 'Agora pair swap · gas sponsorship requested' : 'Direct AUSD transfer · gas sponsorship requested'}</Text>
        </View>
        <Feather name="check-circle" size={17} color={colors.primary} />
      </View>
      {settlement ? <Text style={[styles.firstTimeNote, { color: colors.mutedForeground }]}>First use may enable this testnet wallet and approve the pair. One passkey approval covers the sponsored batch.</Text> : null}
      {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}
      <PrimaryButton
        label={settlement ? 'Confirm instant settlement' : 'Confirm & send AUSD'}
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
  page: { gap: 22, paddingTop: 8 },
  heading: { gap: 6, marginTop: 5 },
  amountPanel: { borderRadius: 22, paddingHorizontal: 20, paddingVertical: 22, gap: 10 },
  amountLabel: { fontSize: 10, letterSpacing: 1, fontFamily: 'Inter_600SemiBold' },
  amountValue: { fontSize: 34, letterSpacing: -1.1, fontFamily: 'Inter_600SemiBold' },
  amountUnit: { fontSize: 17, fontFamily: 'Inter_500Medium' },
  receivePanel: { borderRadius: 18, padding: 16, gap: 7 },
  receiveValue: { fontSize: 22, fontFamily: 'Inter_600SemiBold' },
  quoteNote: { fontSize: 10, lineHeight: 15, fontFamily: 'Inter_400Regular' },
  recipientBlock: { gap: 7 },
  metaLabel: { fontSize: 10, letterSpacing: 0.8, fontFamily: 'Inter_600SemiBold' },
  recipient: { fontSize: 13, lineHeight: 19, fontFamily: 'Inter_500Medium' },
  networkRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 3 },
  networkIcon: { height: 38, width: 38, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  networkTitle: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  networkCaption: { marginTop: 3, fontSize: 10, fontFamily: 'Inter_400Regular' },
  error: { fontSize: 12, lineHeight: 17, fontFamily: 'Inter_500Medium' },
  disclaimer: { textAlign: 'center', fontSize: 10, fontFamily: 'Inter_400Regular' },
  firstTimeNote: { fontSize: 10, lineHeight: 15, fontFamily: 'Inter_400Regular' },
});
