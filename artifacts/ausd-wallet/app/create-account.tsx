import React, { useState } from 'react';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useWallet } from '@/state/wallet-context';
import { createMeraPasskey, getPasskeyErrorMessage } from '@/services/passkey';
import { BrandHeader, Card, Eyebrow, Field, Page, PrimaryButton, Title } from '@/components/Primitives';

export default function CreateAccountScreen() {
  const colors = useColors();
  const { ready, profile, introComplete, completeOnboarding, storageError } = useWallet();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (ready && (profile || !introComplete)) router.replace('/');
  }, [ready, profile, introComplete]);

  async function createAccount() {
    setError('');
    if (storageError) {
      setError('Wallet storage needs attention before a new account can be created. Restart the app and try again.');
      return;
    }
    if (displayName.trim().length < 2) {
      setError('Enter a name with at least two characters.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }

    setBusy(true);
    try {
      const account = await createMeraPasskey(displayName.trim(), email.trim());
      await completeOnboarding({
        address: account.address,
        signerAddress: account.signerAddress,
        displayName: displayName.trim(),
        email: email.trim(),
        mode: 'mera',
        passkey: { credential: account.credential, rpId: account.rpId },
      });
      router.replace('/(tabs)');
    } catch (caught) {
      setError(getPasskeyErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  if (!ready || profile || !introComplete) return <View style={[styles.loading, { backgroundColor: colors.background }]} />;

  return (
    <Page contentStyle={styles.page}>
      <BrandHeader />
      <View style={styles.heading}>
        <View style={[styles.icon, { backgroundColor: colors.secondary }]}><Feather name="user-plus" size={22} color={colors.primary} /></View>
        <Eyebrow>CREATE ACCOUNT</Eyebrow>
        <Title>Let’s set up your wallet.</Title>
        <Text style={[styles.body, { color: colors.mutedForeground }]}>Add your details, then create a passkey to protect your wallet.</Text>
      </View>
      <View style={styles.fields}>
        <Field label="Your name" value={displayName} onChangeText={setDisplayName} placeholder="Name shown on your account" autoCapitalize="words" testID="name-input" />
        <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" testID="email-input" />
      </View>
      <Card style={{ ...styles.securityCard, backgroundColor: colors.secondary }}>
        <Feather name="shield" size={17} color={colors.primary} />
        <Text style={[styles.securityText, { color: colors.mutedForeground }]}>Mera uses your device security: fingerprint, face, or screen lock. The passkey approves sends; there’s no separate password.</Text>
      </Card>
      {error ? <Text accessibilityRole="alert" style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}
      <View style={styles.actions}>
        <PrimaryButton label="Create passkey" icon="key" loading={busy} onPress={createAccount} testID="create-passkey" />
        <Text style={[styles.footnote, { color: colors.mutedForeground }]}>Requires the AUSD development build and a supported device. Testnet only.</Text>
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, justifyContent: 'space-between', gap: 20, paddingTop: 8, paddingBottom: 14 },
  loading: { flex: 1 },
  heading: { gap: 12 },
  icon: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  body: { fontSize: 14, lineHeight: 21, fontFamily: 'Inter_400Regular' },
  fields: { gap: 14 },
  securityCard: { borderWidth: 0, flexDirection: 'row', gap: 11, alignItems: 'flex-start' },
  securityText: { flex: 1, fontSize: 12, lineHeight: 18, fontFamily: 'Inter_400Regular' },
  error: { fontSize: 12, lineHeight: 18, fontFamily: 'Inter_500Medium' },
  actions: { gap: 12, marginTop: 'auto' },
  footnote: { textAlign: 'center', fontSize: 10, lineHeight: 15, fontFamily: 'Inter_400Regular' },
});
