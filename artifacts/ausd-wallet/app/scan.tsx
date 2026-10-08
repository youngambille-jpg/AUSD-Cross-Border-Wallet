import React, { useRef, useState } from 'react';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { isAddress } from 'viem';
import { useColors } from '@/hooks/useColors';
import {
  BackButton,
  Card,
  Eyebrow,
  InlineNotice,
  Page,
  PrimaryButton,
  Title,
} from '@/components/Primitives';

function readPaymentRequest(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'ausd-wallet:' || url.pathname.replace(/^\/+/, '') !== 'send') return null;
    const recipient = url.searchParams.get('recipient')?.trim() ?? '';
    const amount = url.searchParams.get('amount')?.trim() ?? '';
    if (!isAddress(recipient, { strict: false })) return null;
    if (amount && (!/^\d+(\.\d{1,6})?$/.test(amount) || Number(amount) <= 0)) return null;
    return { recipient, amount };
  } catch {
    return null;
  }
}

export default function ScanScreen() {
  const colors = useColors();
  const [permission, requestPermission] = useCameraPermissions();
  const [error, setError] = useState('');
  const scanned = useRef(false);

  function handleScan(result: BarcodeScanningResult) {
    if (scanned.current) return;
    const request = readPaymentRequest(result.data);
    if (!request) {
      setError('This QR code is not a valid AUSD Wallet payment request.');
      return;
    }
    scanned.current = true;
    router.replace({ pathname: '/send', params: request });
  }

  return (
    <Page contentStyle={styles.page}>
      <BackButton onPress={() => router.back()} />
      <View style={styles.heading}>
        <Eyebrow>SEND AUSD</Eyebrow>
        <Title>Scan a payment request.</Title>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Only AUSD Wallet requests on Monad testnet are accepted.</Text>
      </View>

      {!permission ? (
        <Card style={styles.messageCard}><Text style={[styles.message, { color: colors.mutedForeground }]}>Checking camera permission…</Text></Card>
      ) : !permission.granted ? (
        <Card style={styles.messageCard}>
          <Text style={[styles.message, { color: colors.foreground }]}>Camera access is needed to scan a request.</Text>
          <PrimaryButton label="Allow camera access" icon="camera" onPress={() => void requestPermission()} />
        </Card>
      ) : (
        <View style={styles.cameraFrame}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={handleScan}
          />
          <View pointerEvents="none" style={styles.scanGuide} />
        </View>
      )}

      {error ? (
        <Text accessibilityRole="alert" style={[styles.error, { color: colors.destructive }]}>{error}</Text>
      ) : null}
      <InlineNotice icon="shield">Check the recipient and amount on the review screen before approving with your passkey.</InlineNotice>
    </Page>
  );
}

const styles = StyleSheet.create({
  page: { gap: 17, paddingTop: 8 },
  heading: { gap: 7, marginTop: 2, marginBottom: 3 },
  subtitle: { fontSize: 12, lineHeight: 18, fontFamily: 'Inter_400Regular' },
  cameraFrame: { aspectRatio: 1, overflow: 'hidden', borderRadius: 12, backgroundColor: '#15191e', alignItems: 'center', justifyContent: 'center' },
  scanGuide: { width: '66%', aspectRatio: 1, borderWidth: 2, borderColor: '#ff5900', borderRadius: 12 },
  messageCard: { gap: 12, padding: 17 },
  message: { fontSize: 13, lineHeight: 19, fontFamily: 'Inter_500Medium' },
  error: { fontSize: 12, lineHeight: 17, fontFamily: 'Inter_500Medium' },
});
