import React, { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useWallet } from '@/state/wallet-context';
import { formatSupply, getAgoraMetrics } from '@/services/agora';
import { MONAD_TESTNET } from '@/services/settlement';
import {
  Card,
  Divider,
  Eyebrow,
  InlineNotice,
  Page,
  PrimaryButton,
  Title,
} from '@/components/Primitives';

export default function ProfileScreen() {
  const colors = useColors();
  const { profile, lockWallet, resetWallet } = useWallet();
  const [supply, setSupply] = useState<string | null>(null);
  const [metricsStatus, setMetricsStatus] = useState('Loading Agora public metrics…');
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let mounted = true;
    getAgoraMetrics()
      .then((metrics) => {
        if (!mounted) return;
        const value = formatSupply(metrics.circulatingSupply);
        if (metrics.partial || !value) {
          setMetricsStatus('Agora reports a partial network snapshot.');
        } else {
          setSupply(value);
          setMetricsStatus('Live public metric · all supported Agora networks');
        }
      })
      .catch((error: unknown) => {
        if (mounted) {
          setMetricsStatus(
            error instanceof Error ? error.message : 'Agora metrics could not be loaded.',
          );
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  async function disconnect() {
    setLoggingOut(true);
    try {
      if (profile?.mode === 'demo') await resetWallet();
      else lockWallet();
      router.replace('/');
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <Page contentStyle={styles.page}>
      <Eyebrow>Account</Eyebrow>
      <Title>Profile & network</Title>

      <Card style={styles.profileCard}>
        <View style={[styles.profileAvatar, { backgroundColor: colors.secondary }]}>
          <Text style={[styles.avatarText, { color: colors.foreground }]}>
            {(profile?.displayName[0] ?? 'A').toUpperCase()}
          </Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={[styles.profileName, { color: colors.foreground }]}>
            {profile?.displayName ?? 'Wallet user'}
          </Text>
          <Text style={[styles.profileEmail, { color: colors.mutedForeground }]}>
            {profile?.email}
          </Text>
        </View>
        <View style={[styles.modeChip, { backgroundColor: colors.secondary }]}>
          <Text style={[styles.modeText, { color: colors.mutedForeground }]}>
            {profile?.mode === 'mera' ? 'PASSKEY' : 'DEMO'}
          </Text>
        </View>
      </Card>

      <Card style={styles.metricsCard}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>AUSD in circulation</Text>
          <Feather name="activity" size={16} color={colors.primary} />
        </View>
        <Text style={[styles.supply, { color: colors.foreground }]}>
          {supply ? `${supply} AUSD` : '—'}
        </Text>
        <Text style={[styles.metricCaption, { color: colors.mutedForeground }]}>{metricsStatus}</Text>
        <Text style={[styles.metricDisclaimer, { color: colors.mutedForeground }]}>
          Read from Agora’s public metrics API. This is not your wallet balance.
        </Text>
      </Card>

      <Card style={styles.detailCard}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Monad Testnet</Text>
            <Text style={[styles.subLine, { color: colors.mutedForeground }]}>
              Chain ID {MONAD_TESTNET.chainId}
            </Text>
          </View>
          <View style={[styles.testnetBadge, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.badgeText, { color: colors.mutedForeground }]}>TEST NETWORK</Text>
          </View>
        </View>
        <Divider />
        <Text style={[styles.contractCaption, { color: colors.mutedForeground }]}>
          Agora Instant Settlement factory · Monad testnet
        </Text>
        <Text selectable style={[styles.address, { color: colors.foreground }]}>
          {MONAD_TESTNET.factoryAddress}
        </Text>
        <Text style={[styles.metricCaption, { color: colors.mutedForeground }]}>Settlement quote reads · {MONAD_TESTNET.rpcUrl.includes('alchemy') ? 'Alchemy Monad RPC' : 'Monad public RPC'}</Text>
        <Pressable
          onPress={() => void Linking.openURL(MONAD_TESTNET.explorerUrl)}
          style={({ pressed }) => [styles.explorerLink, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Text style={[styles.explorerText, { color: colors.primary }]}>View on MonadVision</Text>
          <Feather name="external-link" size={13} color={colors.primary} />
        </Pressable>
      </Card>

      {profile?.address ? (
        <Card style={styles.detailCard}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Your Monad smart account</Text>
          <Text selectable style={[styles.address, { color: colors.foreground }]}>
            {profile.address}
          </Text>
          <Text style={[styles.metricCaption, { color: colors.mutedForeground }]}>
            Counterfactual Kernel account. AUSD must be sent to this address. Mera signer: {profile.signerAddress ?? 'legacy account'}.
          </Text>
        </Card>
      ) : null}

      <InlineNotice icon="info" tone="warning">
        Direct AUSD transfers and Agora swaps can submit sponsored transactions using test tokens on Monad testnet. Fiat onramp and offramp, card issuing, and cross-chain transfers are not connected yet.
      </InlineNotice>

      <PrimaryButton
        label={profile?.mode === 'demo' ? 'Exit demo wallet' : 'Lock this wallet'}
        icon="log-out"
        secondary
        loading={loggingOut}
        onPress={disconnect}
      />
    </Page>
  );
}

const styles = StyleSheet.create({
  page: { gap: 14, paddingTop: 10 },
  profileCard: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  profileAvatar: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  profileInfo: { flex: 1, gap: 3, marginLeft: 11 },
  profileName: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  profileEmail: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  modeChip: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5 },
  modeText: { fontSize: 9, letterSpacing: 0.6, fontFamily: 'Inter_600SemiBold' },
  metricsCard: { padding: 16, gap: 8 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  supply: { fontSize: 24, letterSpacing: -0.8, fontFamily: 'Inter_600SemiBold' },
  metricCaption: { fontSize: 10, lineHeight: 15, fontFamily: 'Inter_500Medium' },
  metricDisclaimer: { fontSize: 10, lineHeight: 15, fontFamily: 'Inter_400Regular' },
  detailCard: { padding: 16, gap: 10 },
  subLine: { fontSize: 11, marginTop: 4, fontFamily: 'Inter_400Regular' },
  testnetBadge: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6 },
  badgeText: { fontSize: 8, letterSpacing: 0.7, fontFamily: 'Inter_600SemiBold' },
  contractCaption: { fontSize: 10, fontFamily: 'Inter_400Regular' },
  address: { fontSize: 11, lineHeight: 16, fontFamily: 'Inter_500Medium' },
  explorerLink: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 4 },
  explorerText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
});
