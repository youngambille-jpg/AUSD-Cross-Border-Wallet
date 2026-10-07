import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useWallet } from '@/state/wallet-context';
import { authenticateMeraPasskey, getPasskeyErrorMessage } from '@/services/passkey';
import {
  BrandHeader,
  Card,
  Eyebrow,
  InlineNotice,
  Page,
  PrimaryButton,
  Title,
} from '@/components/Primitives';

const INTRO_PAGES = [
  { eyebrow: 'PAY PEOPLE, SIMPLY', title: 'Dollar value that moves with you.', copy: 'Send AUSD to another wallet or preview a cross-border payout from one straightforward flow.', icon: 'arrow-up-right' as const, accent: 'AUSD', detail: 'Send to anyone' },
  { eyebrow: 'YOUR PASSKEY IS YOUR KEY', title: 'A wallet made for your phone.', copy: 'Mera uses your device passkey to create and unlock your account. No seed phrase to copy or manage.', icon: 'key' as const, accent: 'Mera', detail: 'Face · fingerprint · screen lock' },
  { eyebrow: 'SETTLEMENT PREVIEW', title: 'See the payout before you confirm.', copy: 'Agora Instant Settlement quotes AUSD to a mock payout token on Monad testnet. Confirming submits a testnet transaction; this is not a real-world payout.', icon: 'zap' as const, accent: 'Monad', detail: 'Agora quote · testnet settlement' },
];

export default function WelcomeScreen() {
  const colors = useColors();
  const { ready, profile, authenticated, introComplete, completeIntro, completeOnboarding, unlockWallet } = useWallet();
  const { width } = useWindowDimensions();
  const slideWidth = Math.max(280, width - 48);
  const carousel = useRef<ScrollView>(null);
  const [slideIndex, setSlideIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (ready && profile && authenticated) router.replace('/(tabs)');
    else if (ready && !profile && introComplete) router.replace('/create-account');
  }, [ready, profile, authenticated, introComplete]);

  async function continueWithPasskey() {
    setError('');
    if (!profile || profile.mode !== 'mera' || !profile.address || !profile.signerAddress || !profile.passkey) {
      setError('This saved account is missing its Mera credential metadata. Reset the local wallet and set it up again.');
      return;
    }
    setBusy(true);
    try {
      await authenticateMeraPasskey({
        address: profile.address,
        signerAddress: profile.signerAddress,
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

  function onCarouselScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    setSlideIndex(Math.min(INTRO_PAGES.length - 1, Math.round(event.nativeEvent.contentOffset.x / slideWidth)));
  }

  async function advanceIntro() {
    if (slideIndex < INTRO_PAGES.length - 1) {
      const next = slideIndex + 1;
      setSlideIndex(next);
      carousel.current?.scrollTo({ x: next * slideWidth, animated: true });
      return;
    }
    await completeIntro();
    router.replace('/create-account');
  }

  async function previewWallet() {
    await completeOnboarding({ displayName: 'Alex', email: 'preview@ausd.app', mode: 'demo' });
    router.replace('/(tabs)');
  }

  if (!ready || (profile && authenticated) || (!profile && introComplete)) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <Page contentStyle={styles.page}>
      <BrandHeader />
      {profile ? (
        <View style={styles.returningContent}>
          <View style={styles.hero}>
            <View style={[styles.heroMark, { backgroundColor: colors.secondary }]}><Feather name="key" size={32} color={colors.primary} /></View>
            <Eyebrow>YOUR WALLET IS READY</Eyebrow>
            <Title size={36}>Welcome back.</Title>
          </View>
          <Card style={styles.returningCard}>
            <Eyebrow>PASSKEY ACCOUNT</Eyebrow>
            <Text style={[styles.returningName, { color: colors.foreground }]}>{profile.displayName}</Text>
            {profile.address ? <Text selectable style={[styles.returningAddress, { color: colors.mutedForeground }]}>{profile.address}</Text> : null}
          </Card>
          <PrimaryButton label="Continue with passkey" icon="key" loading={busy} onPress={continueWithPasskey} testID="continue-passkey" />
          {error ? <Text accessibilityRole="alert" style={[styles.errorText, { color: colors.destructive }]}>{error}</Text> : null}
        </View>
      ) : (
        <View style={styles.introContent}>
          <ScrollView style={styles.carousel} ref={carousel} horizontal pagingEnabled bounces={false} showsHorizontalScrollIndicator={false} onMomentumScrollEnd={onCarouselScroll} accessibilityLabel="AUSD Wallet introduction">
            {INTRO_PAGES.map((page, index) => (
              <View key={page.eyebrow} style={[styles.slide, { width: slideWidth }]}>
                <View style={[styles.slideArtwork, { backgroundColor: index === 1 ? colors.foreground : colors.secondary }]}>
                  <View style={[styles.artworkOrb, { backgroundColor: index === 1 ? colors.primary : colors.background }]}>
                    <Feather name={page.icon} size={36} color={index === 1 ? colors.primaryForeground : colors.primary} />
                  </View>
                  <View style={[styles.artworkTag, { backgroundColor: index === 1 ? '#252525' : colors.background }]}>
                    <Text style={[styles.artworkTagText, { color: index === 1 ? colors.background : colors.foreground }]}>{page.accent}</Text>
                  </View>
                  <View style={[styles.artworkCaption, { backgroundColor: index === 1 ? '#252525' : colors.background }]}>
                    <View style={[styles.artworkDot, { backgroundColor: colors.primary }]} />
                    <Text style={[styles.artworkCaptionText, { color: index === 1 ? colors.background : colors.mutedForeground }]}>{page.detail}</Text>
                  </View>
                </View>
                <Eyebrow>{page.eyebrow}</Eyebrow>
                <Title size={34}>{page.title}</Title>
                <Text style={[styles.slideCopy, { color: colors.mutedForeground }]}>{page.copy}</Text>
              </View>
            ))}
          </ScrollView>
          <View style={styles.pagination} accessibilityLabel={`Page ${slideIndex + 1} of ${INTRO_PAGES.length}`}>
            {INTRO_PAGES.map((page, index) => <View key={page.eyebrow} style={[styles.pageDot, { backgroundColor: index === slideIndex ? colors.primary : colors.border, width: index === slideIndex ? 24 : 7 }]} />)}
          </View>
          <PrimaryButton label={slideIndex === INTRO_PAGES.length - 1 ? 'Create your account' : 'Continue'} icon={slideIndex === INTRO_PAGES.length - 1 ? 'user-plus' : 'arrow-right'} onPress={() => void advanceIntro()} testID={slideIndex === INTRO_PAGES.length - 1 ? 'intro-create-account' : 'intro-continue'} />
          <Pressable testID="preview-wallet" onPress={() => void previewWallet()} style={({ pressed }) => [styles.previewLink, { opacity: pressed ? 0.55 : 1 }]}>
            <Text style={[styles.previewText, { color: colors.foreground }]}>Explore a demo wallet</Text>
            <Text style={[styles.arrow, { color: colors.primary }]}>→</Text>
          </Pressable>
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>Swipe to explore · Monad testnet · test tokens only</Text>
          <InlineNotice icon="shield">Your Mera passkey is created after the introduction, on the account setup screen.</InlineNotice>
        </View>
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, justifyContent: 'space-between', gap: 18, paddingTop: 10, paddingBottom: 16 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hero: { gap: 15, paddingTop: 6 },
  introContent: { flex: 1, gap: 14, justifyContent: 'space-between' },
  carousel: { flex: 1 },
  returningContent: { flex: 1, justifyContent: 'center', gap: 22 },
  slide: { gap: 15, paddingHorizontal: 24, paddingTop: 6 },
  slideArtwork: { height: 240, borderRadius: 30, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative', marginBottom: 7 },
  artworkOrb: { width: 108, height: 108, borderRadius: 38, alignItems: 'center', justifyContent: 'center' },
  artworkTag: { position: 'absolute', top: 25, right: 23, borderRadius: 13, paddingHorizontal: 14, paddingVertical: 9 },
  artworkTagText: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  artworkCaption: { position: 'absolute', bottom: 22, left: 20, borderRadius: 13, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  artworkDot: { width: 7, height: 7, borderRadius: 4 },
  artworkCaptionText: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },
  slideCopy: { fontSize: 14, lineHeight: 21, fontFamily: 'Inter_400Regular' },
  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 2 },
  pageDot: { height: 7, borderRadius: 4 },
  previewLink: { minHeight: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  previewText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  arrow: { fontSize: 17, fontFamily: 'Inter_600SemiBold' },
  returningCard: { gap: 6 },
  returningName: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  returningAddress: { fontSize: 10, lineHeight: 15, fontFamily: 'Inter_400Regular' },
  heroMark: {
    width: 84,
    height: 84,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 7,
    position: 'relative',
  },
  errorText: { fontSize: 13, lineHeight: 19, fontFamily: 'Inter_400Regular' },
  footerText: { fontSize: 10, lineHeight: 15, textAlign: 'center', fontFamily: 'Inter_400Regular' },
});
