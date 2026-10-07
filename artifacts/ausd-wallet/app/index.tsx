import React, { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useWallet } from '@/state/wallet-context';
import { authenticateMeraPasskey, getPasskeyErrorMessage } from '@/services/passkey';
import { BrandHeader, Card, Eyebrow, Page, PrimaryButton, Title } from '@/components/Primitives';

const slides = [
  {
    icon: 'globe' as const,
    eyebrow: 'MONEY WITHOUT BORDERS',
    title: 'Send dollar value, wherever life takes you.',
    body: 'Move AUSD between people with a clear amount and a recipient you choose.',
  },
  {
    icon: 'shield' as const,
    eyebrow: 'SECURITY THAT FEELS FAMILIAR',
    title: 'Your passkey protects every move.',
    body: 'Mera uses your device authenticator: fingerprint, face, or your screen lock. No extra password to remember.',
  },
  {
    icon: 'zap' as const,
    eyebrow: 'AGORA INSTANT SETTLEMENT',
    title: 'See a cross-border swap settle on Monad.',
    body: 'Try an AUSD to CTK payout using Agora’s testnet pair. These are test tokens, not real-world payouts.',
  },
];

export default function WelcomeScreen() {
  const colors = useColors();
  const { width } = useWindowDimensions();
  const viewportWidth = width - 4;
  const { ready, profile, authenticated, introComplete, completeIntro, unlockWallet, storageError } = useWallet();
  const [slide, setSlide] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const carousel = useRef<ScrollView>(null);

  React.useEffect(() => {
    if (ready && profile && authenticated) router.replace('/(tabs)');
  }, [ready, profile, authenticated]);

  async function finishIntro() {
    await completeIntro();
    router.push('/create-account');
  }

  async function unlock() {
    if (!profile?.passkey || !profile.address) {
      setError('This saved wallet is missing its passkey details. Your data has not been deleted.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await authenticateMeraPasskey({
        address: profile.address,
        signerAddress: profile.signerAddress ?? profile.address,
        credential: profile.passkey.credential,
        rpId: profile.passkey.rpId,
      });
      unlockWallet();
      router.replace('/(tabs)');
    } catch (caught) {
      setError(getPasskeyErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  if (!ready || (profile && authenticated)) {
    return <View style={[styles.loading, { backgroundColor: colors.background }]}><ActivityIndicator color={colors.primary} /></View>;
  }

  if (storageError) {
    return (
      <Page contentStyle={styles.centeredPage}>
        <BrandHeader />
        <Card style={{ backgroundColor: colors.secondary }}>
          <Eyebrow>Wallet storage</Eyebrow>
          <Text style={[styles.body, { color: colors.foreground }]}>{storageError}</Text>
        </Card>
      </Page>
    );
  }

  if (profile) {
    return (
      <Page contentStyle={styles.returningPage}>
        <BrandHeader />
        <View style={styles.returningHero}>
          <View style={[styles.returningIcon, { backgroundColor: colors.secondary }]}><Feather name="key" size={24} color={colors.primary} /></View>
          <Eyebrow>WELCOME BACK</Eyebrow>
          <Title>Good to see you, {profile.displayName}.</Title>
          <Text style={[styles.body, { color: colors.mutedForeground }]}>Unlock your wallet with the passkey saved on this device.</Text>
        </View>
        {error ? <Text accessibilityRole="alert" style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}
        <PrimaryButton label="Continue with passkey" icon="key" loading={busy} onPress={unlock} testID="unlock-passkey" />
        <Text style={[styles.footnote, { color: colors.mutedForeground }]}>Fingerprint, face, or device screen lock · Monad testnet</Text>
      </Page>
    );
  }

  if (introComplete) {
    router.replace('/create-account');
    return <View style={[styles.loading, { backgroundColor: colors.background }]}><ActivityIndicator color={colors.primary} /></View>;
  }

  return (
    <Page contentStyle={styles.page}>
      <BrandHeader />
      <ScrollView
        ref={carousel}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) => setSlide(Math.round(event.nativeEvent.contentOffset.x / viewportWidth))}
        style={styles.carousel}
      >
        {slides.map((item, index) => (
          <View key={item.eyebrow} style={[styles.slide, { width: viewportWidth }]}>
            <View style={[styles.art, { backgroundColor: colors.secondary }]}>
              <View style={[styles.artHalo, { borderColor: colors.border }]} />
              <View style={[styles.artCore, { backgroundColor: colors.primary }]}>
                <Feather name={item.icon} size={34} color={colors.primaryForeground} />
              </View>
              <View style={[styles.artDot, { backgroundColor: colors.foreground }]} />
            </View>
            <Eyebrow>{item.eyebrow}</Eyebrow>
            <Title size={34}>{item.title}</Title>
            <Text style={[styles.slideBody, { color: colors.mutedForeground }]}>{item.body}</Text>
            {index === 2 ? <Text style={[styles.testnetLabel, { color: colors.primary }]}>MONAD TESTNET · AUSD → CTK MOCK PAYOUT</Text> : null}
          </View>
        ))}
      </ScrollView>
      <View style={styles.footer}>
        <View style={styles.dots}>
          {slides.map((item, index) => <View key={item.eyebrow} style={[styles.dot, { backgroundColor: slide === index ? colors.primary : colors.border, width: slide === index ? 22 : 6 }]} />)}
        </View>
        <PrimaryButton
          label={slide === slides.length - 1 ? 'Create your account' : 'Next'}
          icon={slide === slides.length - 1 ? 'arrow-right' : undefined}
          onPress={() => slide === slides.length - 1
            ? void finishIntro()
            : carousel.current?.scrollTo({ x: (slide + 1) * viewportWidth, animated: true })}
          testID="onboarding-next"
        />
        {slide < slides.length - 1 ? (
          <Pressable onPress={() => void finishIntro()} style={styles.skipButton}>
            <Text style={[styles.skipText, { color: colors.mutedForeground }]}>Skip introduction</Text>
          </Pressable>
        ) : null}
        <Text style={[styles.footnote, { color: colors.mutedForeground }]}>Testnet only · no real funds or fiat payouts</Text>
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, justifyContent: 'space-between', gap: 12, paddingTop: 8, paddingBottom: 8 },
  centeredPage: { flex: 1, justifyContent: 'center', gap: 20 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  carousel: { flexGrow: 0, flex: 1, marginHorizontal: -22 },
  slide: { paddingHorizontal: 22, justifyContent: 'center', gap: 18 },
  art: { width: 174, height: 174, borderRadius: 52, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 8, position: 'relative' },
  artHalo: { width: 112, height: 112, borderWidth: 1, borderRadius: 60, alignItems: 'center', justifyContent: 'center' },
  artCore: { position: 'absolute', width: 70, height: 70, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  artDot: { position: 'absolute', width: 11, height: 11, borderRadius: 6, top: 33, right: 38 },
  slideBody: { fontSize: 15, lineHeight: 23, fontFamily: 'Inter_400Regular' },
  testnetLabel: { fontSize: 9, letterSpacing: 0.75, fontFamily: 'Inter_700Bold' },
  footer: { gap: 12 },
  dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: 4 },
  dot: { height: 6, borderRadius: 4 },
  skipButton: { minHeight: 38, justifyContent: 'center', alignItems: 'center' },
  skipText: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  returningPage: { flex: 1, justifyContent: 'space-between', gap: 24, paddingTop: 8, paddingBottom: 18 },
  returningHero: { gap: 13 },
  returningIcon: { width: 56, height: 56, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  body: { fontSize: 14, lineHeight: 21, fontFamily: 'Inter_400Regular' },
  error: { fontSize: 12, lineHeight: 18, fontFamily: 'Inter_500Medium' },
  footnote: { textAlign: 'center', fontSize: 10, fontFamily: 'Inter_400Regular' },
});
