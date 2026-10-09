import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useWallet } from '@/state/wallet-context';
import { getAUSDBalance, getUSDCBalance } from '@/services/passkey';
import { formatIndexedTransfer, useIndexedActivity } from '@/services/indexed-activity';
import {
  Card,
  Divider,
  Eyebrow,
  Page,
} from '@/components/Primitives';

const money = (amount: number) =>
  amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function WalletHome() {
  const colors = useColors();
  const { profile, balance, transfers } = useWallet();
  const { transfers: indexedTransfers, error: activityError, configured } = useIndexedActivity(profile?.address);
  const [chainBalance, setChainBalance] = useState<string | null>(null);
  const [usdcBalance, setUsdcBalance] = useState<string | null>(null);
  const [chainBalanceError, setChainBalanceError] = useState('');
  const isMeraWallet = profile?.mode === 'mera';

  useEffect(() => {
    if (!isMeraWallet || !profile?.address) return;
    let active = true;
    Promise.allSettled([getAUSDBalance(profile.address), getUSDCBalance(profile.address)])
      .then(([ausdResult, usdcResult]) => {
        if (!active) return;
        if (ausdResult.status === 'fulfilled') setChainBalance(ausdResult.value);
        if (usdcResult.status === 'fulfilled') setUsdcBalance(usdcResult.value);
        setChainBalanceError(ausdResult.status === 'rejected' || usdcResult.status === 'rejected'
          ? 'Some balances are unavailable'
          : '');
      });
    return () => { active = false; };
  }, [isMeraWallet, profile?.address]);
  const indexedHashes = new Set(indexedTransfers.map((item) => item.transactionHash.toLowerCase()));
  const recent = configured && !activityError
    ? [
        ...indexedTransfers.map((item) => ({ indexed: formatIndexedTransfer(item, profile?.address ?? '') })),
        ...transfers
          .filter((item) => !item.transactionHash || !indexedHashes.has(item.transactionHash.toLowerCase()))
          .map((item) => ({ local: item })),
      ].sort((left, right) => {
        const leftDate = 'indexed' in left ? left.indexed.createdAt : left.local.createdAt;
        const rightDate = 'indexed' in right ? right.indexed.createdAt : right.local.createdAt;
        return new Date(rightDate).getTime() - new Date(leftDate).getTime();
      }).slice(0, 3)
    : transfers.slice(0, 3).map((item) => ({ local: item }));
  const ausd = isMeraWallet ? (chainBalance === null ? null : Number(chainBalance)) : balance;
  const usdc = isMeraWallet ? (usdcBalance === null ? null : Number(usdcBalance)) : 0;
  const totalBalance = ausd === null || usdc === null ? null : ausd + usdc;

  return (
    <Page contentStyle={styles.page}>
      <View style={styles.header}>
        <View>
          <Eyebrow>MONAD WALLET</Eyebrow>
          <Text style={[styles.pageTitle, { color: colors.foreground }]}>Your money</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open profile and username settings"
          onPress={() => router.push('/(tabs)/profile')}
          style={[styles.profileButton, { backgroundColor: colors.secondary }]}
        >
          <Feather name="user" size={19} color={colors.foreground} />
        </Pressable>
      </View>

      <Card style={styles.balanceCard}>
        <View style={styles.balanceTop}>
          <Text style={[styles.balanceLabel, { color: colors.mutedForeground }]}>TOTAL BALANCE</Text>
          <View style={[styles.networkPill, { backgroundColor: colors.secondary }]}>
            <View style={[styles.balanceDot, { backgroundColor: colors.primary }]} />
            <Text style={[styles.networkText, { color: colors.foreground }]}>{isMeraWallet ? 'TESTNET' : 'DEMO'}</Text>
          </View>
        </View>
        <Text style={[styles.balanceAmount, { color: colors.foreground }]}>${totalBalance === null ? '—' : money(totalBalance)}</Text>
        <Text style={[styles.balanceFoot, { color: colors.mutedForeground }]}>
          {chainBalanceError || (isMeraWallet ? 'AUSD + USDC on Monad' : 'Demo balance · AUSD')}
        </Text>
      </Card>

      <View style={styles.quickActions}>
        <QuickAction
          icon="download"
          label="Deposit"
          onPress={() => router.push('/(tabs)/onramp')}
        />
        <QuickAction
          icon="send"
          label="Transfer"
          onPress={() => router.push('/send')}
          primary
        />
        <QuickAction
          icon="repeat"
          label="Swap"
          onPress={() => Alert.alert('Swap coming soon', 'Stablecoin swaps are not connected yet. You can still receive and transfer AUSD on Monad testnet.')}
        />
      </View>

      <View style={styles.sectionHead}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Savings goals</Text>
        <Pressable onPress={() => Alert.alert('Goals coming soon', 'Goal savings will let you set aside money into dedicated passkey-protected pockets.')}>
          <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
        </Pressable>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Start a savings goal"
        onPress={() => Alert.alert('Goals coming soon', 'Create and track dedicated savings goals here soon.')}
        style={({ pressed }) => [styles.goalCard, { borderColor: colors.border, backgroundColor: colors.card, opacity: pressed ? 0.7 : 1 }]}
      >
        <View style={[styles.goalIcon, { backgroundColor: colors.secondary }]}>
          <Feather name="target" size={19} color={colors.foreground} />
        </View>
        <View style={styles.goalCopy}>
          <Text style={[styles.goalTitle, { color: colors.foreground }]}>Make your first goal</Text>
          <Text style={[styles.goalSubtitle, { color: colors.mutedForeground }]}>Save for something that matters</Text>
        </View>
        <Feather name="plus-circle" size={20} color={colors.primary} />
      </Pressable>

      <View style={styles.sectionHead}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Assets</Text>
      </View>
      <Card style={styles.assetCard}>
        <AssetRow symbol="A" name="Agora AUSD" amount={ausd} />
        <Divider />
        <AssetRow symbol="$" name="USD Coin" amount={usdc} />
      </Card>

      <View style={styles.sectionHead}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent activity</Text>
        <Pressable onPress={() => router.push('/(tabs)/activity')}>
          <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
        </Pressable>
      </View>
      <Card style={styles.activityCard}>
        {recent.length ? (
          recent.map((entry, index) => {
            const indexed = 'indexed' in entry ? entry.indexed : undefined;
            const transfer = 'local' in entry ? entry.local : undefined;
            const title = indexed
              ? `${indexed.token} ${indexed.outgoing ? 'sent' : 'received'}`
              : transfer?.recipient ?? 'Token movement';
            const amount = indexed
              ? `${indexed.outgoing ? '−' : '+'}${money(indexed.amount)} ${indexed.token}`
              : `−${money(transfer?.amount ?? 0)} AUSD`;
            const date = indexed ? indexed.createdAt : transfer?.createdAt;
            const confirmed = indexed ? 'Confirmed on-chain' : transfer?.transactionHash ? 'Confirmed on-chain' : 'Saved on this device';
            return (
            <React.Fragment key={indexed?.id ?? transfer?.id ?? index}>
              {index > 0 ? <Divider /> : null}
              <View style={styles.activityRow}>
                <View style={[styles.activityIcon, { backgroundColor: colors.secondary }]}>
                  <Feather name={indexed && !indexed.outgoing ? 'arrow-down-left' : 'arrow-up-right'} size={16} color={colors.foreground} />
                </View>
                <View style={styles.activityInfo}>
                  <Text numberOfLines={1} style={[styles.activityName, { color: colors.foreground }]}>
                    {title}
                  </Text>
                  <Text style={[styles.activityMeta, { color: colors.mutedForeground }]}>
                    {date ? new Date(date).toLocaleDateString() : 'Date unavailable'} · {confirmed}
                  </Text>
                </View>
                <Text style={[styles.activityAmount, { color: colors.foreground }]}>
                  {amount}
                </Text>
              </View>
            </React.Fragment>
            );
          })
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

    </Page>
  );
}

function AssetRow({ symbol, name, amount }: { symbol: string; name: string; amount: number | null }) {
  const colors = useColors();
  return (
    <View style={styles.assetRow}>
      <View style={[styles.assetIcon, { backgroundColor: colors.secondary }]}>
        <Text style={[styles.assetSymbol, { color: colors.foreground }]}>{symbol}</Text>
      </View>
      <View style={styles.assetInfo}>
        <Text style={[styles.assetName, { color: colors.foreground }]}>{name}</Text>
        <Text style={[styles.assetTicker, { color: colors.mutedForeground }]}>{symbol === 'A' ? 'AUSD' : 'USDC'}</Text>
      </View>
      <View style={styles.assetValue}>
        <Text style={[styles.assetAmount, { color: colors.foreground }]}>{amount === null ? '—' : money(amount)}</Text>
        <Text style={[styles.assetUsd, { color: colors.mutedForeground }]}>${amount === null ? '—' : money(amount)}</Text>
      </View>
    </View>
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
      <View style={[styles.quickIcon, { backgroundColor: primary ? colors.primary : colors.secondary }]}>
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
  page: { gap: 17, paddingTop: 12, paddingBottom: 24 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pageTitle: { fontSize: 25, lineHeight: 32, letterSpacing: -0.8, fontFamily: 'Inter_600SemiBold', marginTop: 3 },
  profileButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  balanceCard: { minHeight: 142, justifyContent: 'space-between', padding: 18 },
  balanceTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  balanceLabel: { fontSize: 10, letterSpacing: 1, fontFamily: 'Inter_600SemiBold' },
  networkPill: { height: 25, borderRadius: 13, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 9 },
  balanceDot: { width: 6, height: 6, borderRadius: 3 },
  networkText: { fontSize: 9, letterSpacing: 0.6, fontFamily: 'Inter_600SemiBold' },
  balanceAmount: { fontSize: 36, lineHeight: 44, letterSpacing: -1.5, fontFamily: 'Inter_600SemiBold' },
  balanceFoot: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  quickActions: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 5, paddingTop: 1 },
  quickAction: { alignItems: 'center', gap: 7, minWidth: 78 },
  quickIcon: { width: 49, height: 49, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 3 },
  sectionTitle: { fontSize: 17, letterSpacing: -0.35, fontFamily: 'Inter_600SemiBold' },
  seeAll: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  goalCard: { minHeight: 74, borderWidth: 1, borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 11 },
  goalIcon: { width: 43, height: 43, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  goalCopy: { flex: 1, gap: 3 },
  goalTitle: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  goalSubtitle: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  assetCard: { paddingHorizontal: 14, paddingVertical: 3, gap: 0 },
  assetRow: { minHeight: 65, flexDirection: 'row', alignItems: 'center', gap: 11 },
  assetIcon: { width: 39, height: 39, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  assetSymbol: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  assetInfo: { flex: 1, gap: 3 },
  assetName: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  assetTicker: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  assetValue: { alignItems: 'flex-end', gap: 3 },
  assetAmount: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  assetUsd: { fontSize: 10, fontFamily: 'Inter_400Regular' },
  activityCard: { paddingHorizontal: 14, paddingVertical: 5, gap: 0 },
  activityRow: { minHeight: 65, flexDirection: 'row', alignItems: 'center', gap: 10 },
  activityIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  activityInfo: { flex: 1, gap: 3 },
  activityName: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  activityMeta: { fontSize: 10, fontFamily: 'Inter_400Regular' },
  activityAmount: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  emptyActivity: { alignItems: 'center', paddingVertical: 21, gap: 6 },
  emptyTitle: { marginTop: 3, fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  emptyCopy: { fontSize: 11, fontFamily: 'Inter_400Regular' },
});
