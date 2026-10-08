import React, { useMemo, useState } from 'react';
import { Share, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import QRCode from 'react-native-qrcode-svg';
import { useColors } from '@/hooks/useColors';
import { useWallet } from '@/state/wallet-context';
import {
  BackButton,
  Body,
  Card,
  Eyebrow,
  Field,
  InlineNotice,
  Page,
  PrimaryButton,
  Title,
} from '@/components/Primitives';

export default function ReceiveScreen() {
  const colors = useColors();
  const { profile } = useWallet();
  const [amount, setAmount] = useState('');
  const [copied, setCopied] = useState(false);
  const hasAddress = profile?.mode === 'mera' && Boolean(profile.address);
  const amountIsValid = !amount || (/^\d+(\.\d{1,6})?$/.test(amount) && Number(amount) > 0);
  const requestUrl = useMemo(() => {
    if (!profile?.address || !amountIsValid) return '';
    return Linking.createURL('/send', {
      scheme: 'ausd-wallet',
      isTripleSlashed: true,
      queryParams: {
        recipient: profile.address,
        ...(amount ? { amount } : {}),
      },
    });
  }, [amount, amountIsValid, profile?.address]);

  async function copyAddress() {
    if (!profile?.address) return;
    await Clipboard.setStringAsync(profile.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  async function shareRequest() {
    if (!requestUrl) return;
    const paymentDescription = amount ? `Request ${amount} AUSD on Monad testnet` : 'Request AUSD on Monad testnet';
    await Share.share({
      message: `${paymentDescription}\n${requestUrl}`,
      url: requestUrl,
    });
  }

  return (
    <Page contentStyle={styles.page}>
      <BackButton onPress={() => router.back()} />
      <View style={styles.heading}>
        <Eyebrow>MONAD TESTNET · RECEIVE</Eyebrow>
        <Title>Make it easy to pay you.</Title>
        <Body>Share a request. The sender reviews the details and approves with their passkey.</Body>
      </View>

      {!hasAddress ? (
        <Card style={styles.emptyCard}>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Create a passkey wallet first</Text>
          <Text style={[styles.copy, { color: colors.mutedForeground }]}>A receiving address is created with your Mera account.</Text>
          <PrimaryButton label="Set up wallet" onPress={() => router.replace('/')} icon="arrow-right" />
        </Card>
      ) : (
        <>
          <Field
            label="Request amount · optional"
            value={amount}
            onChangeText={(value) => setAmount(value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1'))}
            placeholder="Any amount"
            keyboardType="decimal-pad"
            error={amountIsValid ? undefined : 'Enter an amount greater than zero, with up to six decimals.'}
          />

          <Card style={styles.requestCard}>
            <View style={styles.qrFrame}>
              {requestUrl ? (
                <QRCode
                  value={requestUrl}
                  size={220}
                  color={colors.foreground}
                  backgroundColor={colors.background}
                  quietZone={12}
                  ecl="M"
                />
              ) : null}
            </View>
            <Text style={[styles.requestAmount, { color: colors.foreground }]}>
              {amount ? `${amount} AUSD` : 'Any amount'}
            </Text>
            <Text style={[styles.network, { color: colors.mutedForeground }]}>AUSD · Monad testnet</Text>
          </Card>

          <View style={styles.actions}>
            <PrimaryButton label="Share payment request" icon="share-2" onPress={() => void shareRequest()} disabled={!requestUrl} />
            <PrimaryButton label={copied ? 'Address copied' : 'Copy wallet address'} icon={copied ? 'check' : 'copy'} onPress={() => void copyAddress()} secondary />
          </View>

          <Card style={styles.addressCard}>
            <Text style={[styles.addressLabel, { color: colors.mutedForeground }]}>YOUR MONAD ADDRESS</Text>
            <Text selectable style={[styles.address, { color: colors.foreground }]}>{profile?.address}</Text>
          </Card>

          <InlineNotice icon="shield">
            Anyone with this request can see your wallet address and requested amount. No payment is made until the sender approves it.
          </InlineNotice>
        </>
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  page: { gap: 17, paddingTop: 8 },
  heading: { gap: 7, marginTop: 2, marginBottom: 3 },
  requestCard: { alignItems: 'center', gap: 7, paddingVertical: 22, paddingHorizontal: 18 },
  qrFrame: { minHeight: 244, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff', padding: 12, borderRadius: 12 },
  requestAmount: { marginTop: 5, fontSize: 20, letterSpacing: -0.5, fontFamily: 'Inter_600SemiBold' },
  network: { fontSize: 11, fontFamily: 'Inter_500Medium' },
  actions: { gap: 9 },
  addressCard: { gap: 7, padding: 14 },
  addressLabel: { fontSize: 9, letterSpacing: 0.8, fontFamily: 'Inter_600SemiBold' },
  address: { fontSize: 11, lineHeight: 17, fontFamily: 'Inter_500Medium' },
  emptyCard: { gap: 11, padding: 18 },
  emptyTitle: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  copy: { fontSize: 12, lineHeight: 18, fontFamily: 'Inter_400Regular' },
});
