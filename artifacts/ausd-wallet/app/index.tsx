import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useWallet } from '@/state/wallet-context';
import { createMeraPasskey } from '@/services/passkey';
import {
  Body,
  BrandHeader,
  Card,
  Eyebrow,
  Field,
  InlineNotice,
  Page,
  PrimaryButton,
  Title,
} from '@/components/Primitives';

export default function WelcomeScreen() {
  const colors = useColors();
  const { ready, profile, completeOnboarding } = useWallet();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (ready && profile) router.replace('/(tabs)');
  }, [ready, profile]);

  async function beginPasskey() {
    setError('');
    if (displayName.trim().length < 2) {
      setError('Enter the name you want associated with this passkey.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }
    setBusy(true);
    try {
      const account = await createMeraPasskey(displayName.trim(), email.trim());
      await completeOnboarding({ ...account, mode: 'mera' });
      router.replace('/(tabs)');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Passkey setup did not complete.');
    } finally {
      setBusy(false);
    }
  }

  async function previewWallet() {
    await completeOnboarding({
      displayName: 'Alex',
      email: 'preview@ausd.app',
      mode: 'demo',
    });
    router.replace('/(tabs)');
  }

  if (!ready || profile) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <Page contentStyle={styles.page}>
      <BrandHeader />
      <View style={styles.hero}>
        <View style={[styles.heroMark, { backgroundColor: colors.secondary }]}>
          <View style={[styles.orbit, { borderColor: colors.foreground }]} />
          <View style={[styles.orbitCore, { backgroundColor: colors.primary }]} />
          <View style={[styles.orbitDot, { backgroundColor: colors.foreground }]} />
        </View>
        <Eyebrow>Money moves at your pace</Eyebrow>
        <Title size={38}>Send AUSD.{'\n'}Across any border.</Title>
        <Body>
          A simple way to send dollar value to people near and far. Sign in with a
          passkey, then preview near-instant settlement on Monad testnet.
        </Body>
      </View>

      <View style={styles.fields}>
        <Field
          label="Your name"
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Name shown on your account"
          autoCapitalize="words"
          testID="name-input"
        />
        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
          testID="email-input"
        />
      </View>

      <View style={styles.actionGroup}>
        <PrimaryButton
          label="Create a passkey"
          icon="key"
          loading={busy}
          onPress={beginPasskey}
          testID="create-passkey"
        />
        <Pressable
          testID="preview-wallet"
          onPress={previewWallet}
          style={({ pressed }) => [styles.previewLink, { opacity: pressed ? 0.55 : 1 }]}
        >
          <Text style={[styles.previewText, { color: colors.foreground }]}>
            Explore a demo wallet
          </Text>
          <Text style={[styles.arrow, { color: colors.primary }]}>→</Text>
        </Pressable>
      </View>

      {error ? (
        <Card style={{ backgroundColor: colors.secondary }}>
          <Eyebrow>Passkey setup</Eyebrow>
          <Text style={[styles.errorText, { color: colors.mutedForeground }]}>{error}</Text>
          <InlineNotice icon="shield">
            The demo path never creates a credential or signs a transaction.
          </InlineNotice>
        </Card>
      ) : null}

      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
          No real funds move in this preview.
        </Text>
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  page: { justifyContent: 'space-between', gap: 18 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hero: { gap: 15, paddingTop: 6 },
  fields: { gap: 13 },
  heroMark: {
    width: 84,
    height: 84,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 7,
    position: 'relative',
  },
  orbit: { width: 46, height: 46, borderWidth: 5, borderRadius: 24 },
  orbitCore: {
    position: 'absolute',
    right: 20,
    top: 22,
    width: 15,
    height: 15,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  orbitDot: { position: 'absolute', right: 13, top: 15, width: 7, height: 7, borderRadius: 4 },
  actionGroup: { gap: 9, marginTop: 8 },
  previewLink: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  previewText: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  arrow: { fontSize: 18, fontFamily: 'Inter_600SemiBold' },
  errorText: { fontSize: 13, lineHeight: 19, fontFamily: 'Inter_400Regular' },
  footer: { alignItems: 'center', paddingTop: 4 },
  footerText: { fontSize: 11, fontFamily: 'Inter_400Regular' },
});
