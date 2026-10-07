import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useWallet } from '@/state/wallet-context';
import { getAUSDBalance } from '@/services/passkey';
import {
  Body,
  BrandHeader,
  Card,
  Divider,
  Eyebrow,
  InlineNotice,
  Page,
} from '@/components/Primitives';

const money = (amount: number) =>
  amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function WalletHome() {
  const colors = useColors();
  const { profile, balance, transfers } = useWallet();
  const [chainBalance, setChainBalance] = useState<string | null>(null);
  const [chainBalanceError, setChainBalanceError] = useState('');
  const isMeraWallet = profile?.mode === 'mera';

  useEffect(() => {
    if (!isMeraWallet || !profile?.address) return;
    let active = true;
    getAUSDBalance(profile.address)
      .then((value) => { if (active) setChainBalance(value); })
      .catch(() => { if (active) setChainBalanceError('Balance unavailable'); });
    return () => { active = false; };
  }, [isMeraWallet, profile?.address]);
  const recent = transfers.slice(0, 3);
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).toUpperCase();

  return (
    <Page contentStyle={styles.page}>
      <BrandHeader compact />
      <View style={styles.greeting}>
        <View>
          <Eyebrow>{today}</Eyebrow>
          <Text style={[styles.hello, { color: colors.foreground }]}>
            Good morning, {profile?.displayName.split(' ')[0] ?? 'there'}.
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open account settings"
          onPress={() => router.push('/(tabs)/profile')}
          style={[styles.avatar, { backgroundColor: colors.secondary }]}
        >
          <Text style={[styles.avatarText, { color: colors.foreground }]}>
            {(profile?.displayName[0] ?? 'A').toUpperCase()}
          </Text>
        </Pressable>
      </View>

      <Card style={{ ...styles.balanceCard, backgroundColor: colors.foreground, borderColor: colors.foreground }}>
        <View style={styles.balanceTop}>
          <Text style={[styles.balanceLabel, { color: colors.border }]}>{isMeraWallet ? 'ON-CHAIN BALANCE · TESTNET' : 'AVAILABLE BALANCE · DEMO'}</Text>
          <View style={styles.demoTag}>
            <View style={[styles.balanceDot, { backgroundColor: colors.primary }]} />
            <Text style={[styles.demoTagText, { color: colors.background }]}>{isMeraWallet ? 'LIVE' : 'LOCAL'}</Text>
          </View>
        </View>
        <Text style={[styles.balanceAmount, { color: colors.background }]}>
          <Text style={[styles.currency, { color: colors.border }]}>$ </Text>{isMeraWallet ? chainBalance ?? '—' : money(balance)}
        </Text>
        <Text style={[styles.balanceFoot, { color: colors.border }]}>{isMeraWallet ? chainBalanceError || 'AUSD contract balance on Monad testnet' : 'AUSD · 1 AUSD = 1.00 USD'}</Text>
      </Card>

      <View style={styles.quickActions}>
        <QuickAction
          icon="arrow-up-right"
          label="Send"
          onPress={() => router.push('/send')}
          primary
        />
        <QuickAction
          icon="plus"
          label="Add"
          onPress={() => router.push('/(tabs)/onramp')}
        />
        <QuickAction
          icon="corner-down-left"
          label="Cash out"
          onPress={() => router.push('/(tabs)/offramp')}
        />
      </View>

      <View style={styles.sectionHead}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent activity</Text>
        <Pressable onPress={() => router.push('/(tabs)/activity')}>
          <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
        </Pressable>
      </View>
      <Card style={styles.activityCard}>
        {recent.length ? (
          recent.map((transfer, index) => (
            <React.Fragment key={transfer.id}>
              {index > 0 ? <Divider /> : null}
              <View style={styles.activityRow}>
                <View style={[styles.activityIcon, { backgroundColor: colors.secondary }]}>
                  <Feather name="arrow-up-right" size={16} color={colors.foreground} />
                </View>
                <View style={styles.activityInfo}>
                  <Text numberOfLines={1} style={[styles.activityName, { color: colors.foreground }]}>
                    {transfer.recipient}
                  </Text>
                  <Text style={[styles.activityMeta, { color: colors.mutedForeground }]}>
                    {new Date(transfer.createdAt).toLocaleDateString()} · {transfer.transactionHash ? 'Confirmed onchain' : 'Local preview'}
                  </Text>
                </View>
                <Text style={[styles.activityAmount, { color: colors.foreground }]}>
                  −{money(transfer.amount)} AUSD
                </Text>
              </View>
            </React.Fragment>
          ))
        ) : (
          <View style={styles.emptyActivity}>
            <Feather name="clock" size={18} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Nothing sent yet</Text>
            <Text style={[styles.emptyCopy, { color: colors.mutedForeground }]}>
              Your transfers will appear here.
            </Text>
          </View>
        )}
      </Card>

      <InlineNotice icon="zap">
        {isMeraWallet ? 'Your Mera passkey protects the wallet. Direct AUSD transfers and Agora settlement use Monad testnet tokens and sponsored on-chain transactions.' : 'Demo wallet activity is local only. Create a Mera passkey wallet to use testnet transfers.'}
      </InlineNotice>
    </Page>
  );
}

function QuickAction({
  icon,
  label,
  onPress,
  primary = false,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  onPress: () => void;
  primary?: boolean;
}) {
  const colors = useColors();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.quickAction, { opacity: pressed ? 0.6 : 1 }]}>
      <View
        style={[
          styles.quickIcon,
          { backgroundColor: primary ? colors.primary : colors.secondary },
        ]}
      >
        <Feather
          name={icon}
          size={19}
          color={primary ? colors.primaryForeground : colors.foreground}
        />
      </View>
      <Text style={[styles.quickLabel, { color: colors.foreground }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { gap: 19, paddingTop: 10 },
  greeting: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  hello: { fontSize: 24, lineHeight: 31, letterSpacing: -0.8, fontFamily: 'Inter_600SemiBold', marginTop: 5 },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  balanceCard: { minHeight: 166, justifyContent: 'space-between', padding: 20 },
  balanceTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  balanceLabel: { fontSize: 10, letterSpacing: 1, fontFamily: 'Inter_600SemiBold' },
  demoTag: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  balanceDot: { width: 6, height: 6, borderRadius: 3 },
  demoTagText: { fontSize: 9, letterSpacing: 0.8, fontFamily: 'Inter_600SemiBold' },
  balanceAmount: { fontSize: 38, lineHeight: 46, letterSpacing: -1.6, fontFamily: 'Inter_600SemiBold' },
  currency: { fontSize: 25, fontFamily: 'Inter_500Medium' },
  balanceFoot: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  quickActions: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 7 },
  quickAction: { alignItems: 'center', gap: 8, minWidth: 68 },
  quickIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  sectionTitle: { fontSize: 17, letterSpacing: -0.35, fontFamily: 'Inter_600SemiBold' },
  seeAll: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  activityCard: { paddingHorizontal: 14, paddingVertical: 5, gap: 0 },
  activityRow: { minHeight: 67, flexDirection: 'row', alignItems: 'center', gap: 10 },
  activityIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  activityInfo: { flex: 1, gap: 3 },
  activityName: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  activityMeta: { fontSize: 10, fontFamily: 'Inter_400Regular' },
  activityAmount: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  emptyActivity: { alignItems: 'center', paddingVertical: 21, gap: 6 },
  emptyTitle: { marginTop: 3, fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  emptyCopy: { fontSize: 11, fontFamily: 'Inter_400Regular' },
});
