import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Card, Divider, Eyebrow, Field, InlineNotice, Page, PrimaryButton, Title } from '@/components/Primitives';
import { useColors } from '@/hooks/useColors';
import { getAUSDBalance } from '@/services/passkey';
import { exportSavingsVault, importSavingsVault, loadSavingsGoals, saveSavingsGoals, type SavingsGoal } from '@/services/savings-goals';
import {
  createSavingsPocketId,
  createSponsoredSavingsPocket,
  depositToSavingsPocket,
  getSavingsPocket,
  type SavingsPocketState,
} from '@/services/savings-pockets';
import { useWallet } from '@/state/wallet-context';

const money = (amount: number) => amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function SavingsGoalsScreen() {
  const colors = useColors();
  const { profile } = useWallet();
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [pocketStates, setPocketStates] = useState<Record<string, SavingsPocketState>>({});
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [contribution, setContribution] = useState('');
  const [autoSaveRate, setAutoSaveRate] = useState('10');
  const [activeGoal, setActiveGoal] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [backupText, setBackupText] = useState('');
  const [showRestore, setShowRestore] = useState(false);
  const account = profile?.mode === 'mera' && profile.address && profile.signerAddress && profile.passkey
    ? { address: profile.address, signerAddress: profile.signerAddress, credential: profile.passkey.credential, rpId: profile.passkey.rpId }
    : null;
  const onChainTotal = useMemo(
    () => goals.reduce((sum, goal) => {
      const pocket = pocketStates[goal.id];
      return sum + (pocket?.exists ? Number(pocket.balance) : 0);
    }, 0),
    [goals, pocketStates],
  );
  const localTrackedTotal = useMemo(
    () => goals.reduce((sum, goal) => sum + (goal.localTracked ?? (goal.pocketId ? 0 : goal.saved)), 0),
    [goals],
  );

  const refresh = useCallback(async () => {
    if (!account) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const [savedGoals, walletBalance] = await Promise.all([
        loadSavingsGoals(account),
        getAUSDBalance(account.address),
      ]);
      const pocketEntries = await Promise.all(savedGoals.flatMap((goal) =>
        goal.pocketId
          ? [getSavingsPocket(account.address, goal.pocketId).then((pocket) => [goal.id, pocket] as const)]
          : [],
      ));
      setGoals(savedGoals);
      setBalance(Number(walletBalance));
      setPocketStates(Object.fromEntries(pocketEntries));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not open your savings plan.');
    } finally {
      setLoading(false);
    }
  }, [account?.address, account?.signerAddress, account?.rpId, account?.credential.credentialId]);

  useEffect(() => { void refresh(); }, [refresh]);

  const createGoal = async () => {
    const parsedTarget = Number(target);
    const parsedRate = Number(autoSaveRate);
    if (!name.trim()) return setError('Give your goal a name.');
    if (!Number.isFinite(parsedTarget) || parsedTarget <= 0) return setError('Enter a target greater than zero.');
    if (!/^\d+(\.\d{1,2})?$/.test(autoSaveRate) || !Number.isFinite(parsedRate) || parsedRate <= 0 || parsedRate > 100) {
      return setError('Choose an auto-save rate greater than 0% and no higher than 100%, with up to two decimals.');
    }
    if (!account) return setError('Unlock your Mera wallet before creating a pocket.');
    setSaving(true);
    setError('');
    try {
      const id = `${Date.now()}`;
      const autoSaveBps = Math.round(parsedRate * 100);
      const pocketId = createSavingsPocketId(account.address, id);
      const nextGoal: SavingsGoal = {
        id,
        name: name.trim(),
        target: parsedTarget,
        saved: 0,
        createdAt: new Date().toISOString(),
        pocketId,
        autoSaveBps,
      };
      const nextGoals = [...goals, nextGoal];
      // Persist the stable pocket ID first so a cancelled or interrupted chain
      // operation can be retried without creating a second pocket.
      await saveSavingsGoals(account, nextGoals);
      setGoals(nextGoals);
      setPocketStates((current) => ({
        ...current,
        [id]: { pocketId, balance: '0', autoSaveBps, exists: false },
      }));
      setName('');
      setTarget('');
      const result = await createSponsoredSavingsPocket(account, pocketId, autoSaveBps);
      setPocketStates((current) => ({
        ...current,
        [id]: { pocketId, balance: '0', autoSaveBps, exists: true },
      }));
      const txNote = result.alreadyCreated ? 'The existing on-chain pocket was matched.' : 'The pocket was created on Monad testnet.';
      Alert.alert('Savings pocket ready', `${txNote} No AUSD moved. Your plan is encrypted with your Mera passkey.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not create the sponsored savings pocket.');
    } finally {
      setSaving(false);
    }
  };

  const activateGoal = async (goal: SavingsGoal) => {
    if (!account) return setError('Unlock your Mera wallet before activating a pocket.');
    const parsedRate = Number(autoSaveRate);
    if (goal.autoSaveBps === undefined && (
      !/^\d+(\.\d{1,2})?$/.test(autoSaveRate) || !Number.isFinite(parsedRate) || parsedRate <= 0 || parsedRate > 100
    )) {
      return setError('Choose an auto-save rate greater than 0% and no higher than 100%.');
    }
    setSaving(true);
    setError('');
    try {
      const autoSaveBps = goal.autoSaveBps ?? Math.round(parsedRate * 100);
      const pocketId = goal.pocketId ?? createSavingsPocketId(account.address, goal.id);
      await createSponsoredSavingsPocket(account, pocketId, autoSaveBps);
      const activated = {
        ...goal,
        saved: 0,
        localTracked: goal.localTracked ?? goal.saved,
        pocketId,
        autoSaveBps,
      };
      const nextGoals = goals.map((item) => item.id === goal.id ? activated : item);
      await saveSavingsGoals(account, nextGoals);
      setGoals(nextGoals);
      setPocketStates((current) => ({
        ...current,
        [goal.id]: { pocketId, balance: '0', autoSaveBps, exists: true },
      }));
      Alert.alert(
        'Pocket activated',
        `Your goal is now registered on Monad with a ${autoSaveBps / 100}% auto-save rate. Previous progress stays labeled as local tracking; no tokens moved.`,
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not activate this goal on Monad.');
    } finally {
      setSaving(false);
    }
  };

  const addSavings = async (goal: SavingsGoal) => {
    const amount = Number(contribution);
    if (!Number.isFinite(amount) || amount <= 0) return setError('Enter an amount greater than zero.');
    if (!goal.pocketId || !pocketStates[goal.id]?.exists) return setError('Activate this goal as an on-chain pocket before depositing.');
    if (balance === null || amount > balance) return setError('That is more than your available wallet AUSD balance.');
    if (!account) return setError('Unlock your Mera wallet before depositing.');
    setSaving(true);
    setError('');
    try {
      const result = await depositToSavingsPocket(account, goal.pocketId, contribution);
      setPocketStates((current) => ({ ...current, [goal.id]: result.pocket }));
      setBalance((current) => current === null ? null : Math.max(0, current - Number(result.amount)));
      setContribution('');
      setActiveGoal(null);
      Alert.alert('AUSD deposited', `${money(Number(result.amount))} AUSD was deposited into ${goal.name} on Monad testnet. Gas sponsorship was requested.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The sponsored pocket deposit did not complete.');
    } finally {
      setSaving(false);
    }
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
                <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>IN ON-CHAIN POCKETS</Text>
                <Text style={[styles.summaryAmount, { color: colors.foreground }]}>{money(onChainTotal)} AUSD</Text>
              </View>
            </View>
            <Divider />
            <Text style={[styles.summaryMeta, { color: colors.mutedForeground }]}>
              {balance === null ? 'Wallet balance loading…' : `${money(balance)} AUSD in your wallet`}
              {localTrackedTotal > 0 ? ` · ${money(localTrackedTotal)} AUSD in older local-only tracking` : ''}
            </Text>
          </Card>

          <InlineNotice icon="lock">Goal details are encrypted with a separate Mera PRF namespace. Deposits and payment auto-saves move Monad testnet AUSD into the deployed pocket contract; older goals without an on-chain pocket remain local tracking only.</InlineNotice>

          {error ? <Text accessibilityRole="alert" style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}
          {loading ? <Text style={[styles.empty, { color: colors.mutedForeground }]}>Unlocking your private savings plan…</Text> : null}
          {!loading && goals.map((goal) => {
            const pocket = pocketStates[goal.id];
            const savedAmount = pocket?.exists ? Number(pocket.balance) : goal.saved;
            const progress = Math.min(1, savedAmount / goal.target);
            return (
              <Card key={goal.id} style={styles.goalCard}>
                <View style={styles.goalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.goalName, { color: colors.foreground }]}>{goal.name}</Text>
                     <Text style={[styles.goalTarget, { color: colors.mutedForeground }]}>{money(savedAmount)} of {money(goal.target)} AUSD</Text>
                  </View>
                  <Text style={[styles.percent, { color: colors.primary }]}>{Math.round(progress * 100)}%</Text>
                </View>
                <View style={[styles.track, { backgroundColor: colors.secondary }]}><View style={[styles.fill, { width: `${progress * 100}%`, backgroundColor: colors.primary }]} /></View>
                {goal.pocketId && pocket?.exists ? (
                  <View style={styles.contribution}>
                    {goal.localTracked ? (
                      <Text style={[styles.pocketMeta, { color: colors.mutedForeground }]}>
                        Previous local-only tracking: {money(goal.localTracked)} AUSD
                      </Text>
                    ) : null}
                    <Text style={[styles.pocketMeta, { color: colors.mutedForeground }]}>
                      On-chain pocket · {((goal.autoSaveBps ?? pocket.autoSaveBps) / 100).toFixed(2).replace(/\.?0+$/, '')}% auto-save
                    </Text>
                    {activeGoal === goal.id ? (
                      <>
                        <Field label="Deposit AUSD into pocket" value={contribution} onChangeText={setContribution} placeholder="0.00" keyboardType="decimal-pad" />
                        <PrimaryButton label="Deposit on Monad" icon="lock" loading={saving} onPress={() => void addSavings(goal)} />
                        <Pressable onPress={() => setActiveGoal(null)} style={styles.cancelButton}>
                          <Text style={[styles.addText, { color: colors.mutedForeground }]}>Cancel</Text>
                        </Pressable>
                      </>
                    ) : (
                      <>
                        <View style={styles.pocketActions}>
                          <Pressable style={styles.addButton} onPress={() => { setError(''); setContribution(''); setActiveGoal(goal.id); }}>
                            <Feather name="plus" size={16} color={colors.primary} />
                            <Text style={[styles.addText, { color: colors.primary }]}>Deposit AUSD</Text>
                          </Pressable>
                          <Pressable
                            style={styles.addButton}
                            onPress={() => router.push({
                              pathname: '/(tabs)/send',
                              params: {
                                pocketId: goal.pocketId,
                                autoSaveBps: String(goal.autoSaveBps ?? pocket.autoSaveBps),
                                goalName: goal.name,
                              },
                            })}
                          >
                            <Feather name="arrow-up-right" size={16} color={colors.primary} />
                            <Text style={[styles.addText, { color: colors.primary }]}>Pay + auto-save</Text>
                          </Pressable>
                        </View>
                      </>
                    )}
                  </View>
                ) : (
                  <View style={styles.contribution}>
                    <Text style={[styles.pocketMeta, { color: colors.mutedForeground }]}>
                      {goal.pocketId ? 'Pocket not found on Monad. Try activating it again.' : `${money(goal.saved)} AUSD is older local-only tracking; it has not moved on-chain.`}
                    </Text>
                    <PrimaryButton
                      label={`Activate on Monad · ${autoSaveRate}%`}
                      icon="zap"
                      loading={saving}
                      onPress={() => void activateGoal(goal)}
                    />
                  </View>
                )}
              </Card>
            );
          })}

          {!loading && (
            <Card style={styles.createCard}>
              <Text style={[styles.createTitle, { color: colors.foreground }]}>{goals.length ? 'Create another goal' : 'Create your first goal'}</Text>
              <Field label="What are you saving for?" value={name} onChangeText={setName} placeholder="A new laptop" autoCapitalize="sentences" />
              <Field label="Target amount · AUSD" value={target} onChangeText={setTarget} placeholder="500.00" keyboardType="decimal-pad" />
                <Field label="Auto-save rate on payments · %" value={autoSaveRate} onChangeText={setAutoSaveRate} placeholder="10" keyboardType="decimal-pad" />
                <Text style={[styles.pocketMeta, { color: colors.mutedForeground }]}>Creating a pocket is a sponsored Monad testnet transaction; it does not move AUSD. You’ll see the full payment, auto-save amount, and total debit before every auto-save payment.</Text>
                <PrimaryButton label="Create pocket on Monad" icon="shield" loading={saving} onPress={() => void createGoal()} />
            </Card>
          )}
          <Text style={[styles.privacy, { color: colors.mutedForeground }]}>Goal labels are encrypted on this device; pocket balances and transactions are read from Monad testnet. Your passkey can recreate the decryption key on another supported device.</Text>
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
  pocketMeta: { fontSize: 11, lineHeight: 17, fontFamily: 'Inter_400Regular' },
  pocketActions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 },
  cancelButton: { alignSelf: 'center', paddingVertical: 7 },
  createCard: { gap: 14 },
  backupCard: { gap: 12 },
  restoreToggle: { minHeight: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backupInput: { minHeight: 104, borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 12, textAlignVertical: 'top' },
  createTitle: { fontSize: 17, fontFamily: 'Inter_600SemiBold', marginBottom: 2 },
  empty: { fontSize: 13, paddingVertical: 12 },
  error: { fontSize: 13, lineHeight: 19 },
  privacy: { textAlign: 'center', fontSize: 11, lineHeight: 17, paddingHorizontal: 10 },
});
