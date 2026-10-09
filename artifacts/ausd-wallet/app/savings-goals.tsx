import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Card, Divider, Eyebrow, Field, InlineNotice, Page, PrimaryButton, Title } from '@/components/Primitives';
import { useColors } from '@/hooks/useColors';
import { getAUSDBalance } from '@/services/passkey';
import { exportSavingsVault, importSavingsVault, loadSavingsGoals, saveSavingsGoals, type SavingsGoal } from '@/services/savings-goals';
import { useWallet } from '@/state/wallet-context';

const money = (amount: number) => amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function SavingsGoalsScreen() {
  const colors = useColors();
  const { profile } = useWallet();
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [contribution, setContribution] = useState('');
  const [activeGoal, setActiveGoal] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [backupText, setBackupText] = useState('');
  const [showRestore, setShowRestore] = useState(false);
  const account = profile?.mode === 'mera' && profile.address && profile.signerAddress && profile.passkey
    ? { address: profile.address, signerAddress: profile.signerAddress, credential: profile.passkey.credential, rpId: profile.passkey.rpId }
    : null;
  const totalAllocated = useMemo(() => goals.reduce((sum, goal) => sum + goal.saved, 0), [goals]);

  const refresh = useCallback(async () => {
    if (!account) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const [savedGoals, walletBalance] = await Promise.all([loadSavingsGoals(account), getAUSDBalance(account.address)]);
      setGoals(savedGoals);
      setBalance(Number(walletBalance));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not open your savings plan.');
    } finally {
      setLoading(false);
    }
  }, [account?.address, account?.signerAddress, account?.rpId, account?.credential.credentialId]);

  useEffect(() => { void refresh(); }, [refresh]);

  const commit = async (next: SavingsGoal[], successMessage: string) => {
    if (!account) return;
    setSaving(true);
    setError('');
    try {
      await saveSavingsGoals(account, next);
      setGoals(next);
      setName('');
      setTarget('');
      setContribution('');
      setActiveGoal(null);
      Alert.alert('Savings plan updated', successMessage);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save your encrypted plan.');
    } finally {
      setSaving(false);
    }
  };

  const createGoal = () => {
    const parsedTarget = Number(target);
    if (!name.trim()) return setError('Give your goal a name.');
    if (!Number.isFinite(parsedTarget) || parsedTarget <= 0) return setError('Enter a target greater than zero.');
    void commit([...goals, { id: `${Date.now()}`, name: name.trim(), target: parsedTarget, saved: 0, createdAt: new Date().toISOString() }], 'Your new goal is encrypted with your Mera passkey.');
  };

  const addSavings = (goal: SavingsGoal) => {
    const amount = Number(contribution);
    if (!Number.isFinite(amount) || amount <= 0) return setError('Enter an amount greater than zero.');
    if (balance === null || amount > balance - totalAllocated) return setError('That is more than your unallocated AUSD balance.');
    const next = goals.map((item) => item.id === goal.id ? { ...item, saved: item.saved + amount } : item);
    void commit(next, `${money(amount)} AUSD added to ${goal.name}. This updates your private savings plan; funds remain in your wallet.`);
  };

  const shareBackup = async () => {
    const backup = await exportSavingsVault();
    if (!backup) return setError('Create a savings goal first to make an encrypted backup.');
    await Share.share({ message: backup, title: 'Encrypted Mera savings plan backup' });
  };

  const restoreBackup = async () => {
    if (!account || !backupText.trim()) return setError('Paste an encrypted savings plan backup first.');
    setSaving(true);
    setError('');
    try {
      const restored = await importSavingsVault(account, backupText.trim());
      setGoals(restored);
      setBackupText('');
      setShowRestore(false);
      Alert.alert('Plan restored', 'Your encrypted savings plan was opened with your Mera passkey.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not restore this encrypted backup.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page contentStyle={styles.page}>
      <Pressable onPress={() => router.back()} style={styles.back} accessibilityRole="button" accessibilityLabel="Go back">
        <Feather name="arrow-left" size={20} color={colors.foreground} />
        <Text style={[styles.backText, { color: colors.foreground }]}>Home</Text>
      </Pressable>
      <Eyebrow>PRIVATE SAVINGS PLAN</Eyebrow>
      <Title>Save for what matters</Title>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Make a plan, set aside AUSD, and track your progress with your passkey.</Text>

      {!account ? (
        <InlineNotice icon="key">Savings plans are protected by Mera. Create or unlock a Mera passkey wallet to get started.</InlineNotice>
      ) : (
        <>
          <Card style={styles.summary}>
            <View style={styles.summaryTop}>
              <View style={[styles.summaryIcon, { backgroundColor: colors.secondary }]}><Feather name="target" size={19} color={colors.primary} /></View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>SET ASIDE IN YOUR PLAN</Text>
                <Text style={[styles.summaryAmount, { color: colors.foreground }]}>{money(totalAllocated)} AUSD</Text>
              </View>
            </View>
            <Divider />
            <Text style={[styles.summaryMeta, { color: colors.mutedForeground }]}>{balance === null ? 'Wallet balance loading…' : `${money(Math.max(0, balance - totalAllocated))} AUSD available to allocate`}</Text>
          </Card>

          <InlineNotice icon="lock">Your goal names and progress are encrypted with a separate Mera PRF namespace. Allocations are tracking only: AUSD stays in your wallet and is not locked or moved.</InlineNotice>

          {error ? <Text accessibilityRole="alert" style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}
          {loading ? <Text style={[styles.empty, { color: colors.mutedForeground }]}>Unlocking your private savings plan…</Text> : null}
          {!loading && goals.map((goal) => {
            const progress = Math.min(1, goal.saved / goal.target);
            return (
              <Card key={goal.id} style={styles.goalCard}>
                <View style={styles.goalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.goalName, { color: colors.foreground }]}>{goal.name}</Text>
                    <Text style={[styles.goalTarget, { color: colors.mutedForeground }]}>{money(goal.saved)} of {money(goal.target)} AUSD</Text>
                  </View>
                  <Text style={[styles.percent, { color: colors.primary }]}>{Math.round(progress * 100)}%</Text>
                </View>
                <View style={[styles.track, { backgroundColor: colors.secondary }]}><View style={[styles.fill, { width: `${progress * 100}%`, backgroundColor: colors.primary }]} /></View>
                {activeGoal === goal.id ? (
                  <View style={styles.contribution}>
                    <Field label="Set aside AUSD" value={contribution} onChangeText={setContribution} placeholder="0.00" keyboardType="decimal-pad" />
                    <PrimaryButton label="Confirm with passkey" icon="lock" loading={saving} onPress={() => addSavings(goal)} />
                  </View>
                ) : (
                  <Pressable style={styles.addButton} onPress={() => { setError(''); setContribution(''); setActiveGoal(goal.id); }}>
                    <Feather name="plus" size={16} color={colors.primary} />
                    <Text style={[styles.addText, { color: colors.primary }]}>Set aside money</Text>
                  </Pressable>
                )}
              </Card>
            );
          })}

          {!loading && (
            <Card style={styles.createCard}>
              <Text style={[styles.createTitle, { color: colors.foreground }]}>{goals.length ? 'Create another goal' : 'Create your first goal'}</Text>
              <Field label="What are you saving for?" value={name} onChangeText={setName} placeholder="A new laptop" autoCapitalize="sentences" />
              <Field label="Target amount · AUSD" value={target} onChangeText={setTarget} placeholder="500.00" keyboardType="decimal-pad" />
              <PrimaryButton label="Save goal with passkey" icon="shield" loading={saving} onPress={createGoal} />
            </Card>
          )}
          <Text style={[styles.privacy, { color: colors.mutedForeground }]}>Only encrypted goal data is stored on this device. Your passkey can recreate the decryption key on another supported device.</Text>
          <Card style={styles.backupCard}>
            <Text style={[styles.createTitle, { color: colors.foreground }]}>Use your plan on another device</Text>
            <Text style={[styles.summaryMeta, { color: colors.mutedForeground }]}>Share or copy this encrypted backup, then restore it on a device with the same passkey and app domain.</Text>
            <PrimaryButton label="Share encrypted backup" icon="share" secondary onPress={() => void shareBackup()} />
            <Pressable onPress={() => setShowRestore(!showRestore)} style={styles.restoreToggle}>
              <Text style={[styles.addText, { color: colors.primary }]}>{showRestore ? 'Hide restore' : 'Restore from encrypted backup'}</Text>
              <Feather name={showRestore ? 'chevron-up' : 'chevron-down'} size={16} color={colors.primary} />
            </Pressable>
            {showRestore ? <>
              <TextInput
                value={backupText}
                onChangeText={setBackupText}
                multiline
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="Paste encrypted backup JSON"
                placeholderTextColor={colors.mutedForeground}
                selectionColor={colors.primary}
                style={[styles.backupInput, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]}
              />
              <PrimaryButton label="Restore with passkey" icon="key" loading={saving} onPress={() => void restoreBackup()} />
            </> : null}
          </Card>
        </>
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  page: { gap: 14, paddingBottom: 38 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 },
  backText: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  subtitle: { fontSize: 14, lineHeight: 21, marginTop: -7, marginBottom: 4 },
  summary: { gap: 12 },
  summaryTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  summaryIcon: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  summaryLabel: { fontSize: 10, letterSpacing: 0.7, fontFamily: 'Inter_600SemiBold' },
  summaryAmount: { fontSize: 22, fontFamily: 'Inter_700Bold', marginTop: 2 },
  summaryMeta: { fontSize: 12 },
  goalCard: { gap: 13 },
  goalHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  goalName: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  goalTarget: { fontSize: 12, marginTop: 4 },
  percent: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  track: { height: 8, borderRadius: 8, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 8 },
  addButton: { alignSelf: 'flex-start', minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 6 },
  addText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  contribution: { gap: 11 },
  createCard: { gap: 14 },
  backupCard: { gap: 12 },
  restoreToggle: { minHeight: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backupInput: { minHeight: 104, borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 12, textAlignVertical: 'top' },
  createTitle: { fontSize: 17, fontFamily: 'Inter_600SemiBold', marginBottom: 2 },
  empty: { fontSize: 13, paddingVertical: 12 },
  error: { fontSize: 13, lineHeight: 19 },
  privacy: { textAlign: 'center', fontSize: 11, lineHeight: 17, paddingHorizontal: 10 },
});
