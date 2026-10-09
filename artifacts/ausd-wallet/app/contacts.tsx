import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { getAddress, isAddress } from 'viem';
import { Card, Eyebrow, InlineNotice, Page, PrimaryButton, Title } from '@/components/Primitives';
import { useColors } from '@/hooks/useColors';
import { useWallet } from '@/state/wallet-context';
import { exportContactsVault, importContactsVault, loadContacts, saveContacts, type WalletContact } from '@/services/contacts';

export default function ContactsScreen() {
  const colors = useColors();
  const { profile } = useWallet();
  const [contacts, setContacts] = useState<WalletContact[]>([]);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [backupText, setBackupText] = useState('');
  const [showRestore, setShowRestore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const account = useMemo(() => profile?.mode === 'mera' && profile.address && profile.signerAddress && profile.passkey
    ? { address: profile.address, signerAddress: profile.signerAddress, credential: profile.passkey.credential, rpId: profile.passkey.rpId }
    : null, [profile]);

  const refresh = useCallback(async () => {
    if (!account) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      setContacts(await loadContacts(account));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not unlock your encrypted contacts.');
    } finally {
      setLoading(false);
    }
  }, [account]);

  useEffect(() => { void refresh(); }, [refresh]);

  async function commit(next: WalletContact[]) {
    if (!account) return;
    setSaving(true);
    setError('');
    try {
      await saveContacts(account, next);
      setContacts(next);
      setName('');
      setAddress('');
      Alert.alert('Contacts protected', 'Your contacts are encrypted with your Mera passkey.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not encrypt your contacts.');
    } finally {
      setSaving(false);
    }
  }

  function addContact() {
    const cleanName = name.trim();
    const cleanAddress = address.trim();
    if (!cleanName || cleanName.length > 48) return setError('Enter a name up to 48 characters.');
    if (!isAddress(cleanAddress, { strict: false })) return setError('Enter a valid EVM smart-account address.');
    if (contacts.some((contact) => contact.name.toLocaleLowerCase() === cleanName.toLocaleLowerCase())) {
      return setError('A contact with that name already exists.');
    }
    if (contacts.some((contact) => contact.address.toLowerCase() === cleanAddress.toLowerCase())) {
      return setError('That smart-account address is already saved.');
    }
    let normalizedAddress: `0x${string}`;
    try {
      normalizedAddress = getAddress(cleanAddress);
    } catch {
      return setError('Check the address checksum and try again.');
    }
    const contact = { id: `${Date.now()}`, name: cleanName, address: normalizedAddress, createdAt: new Date().toISOString() };
    void commit([...contacts, contact]);
  }

  async function shareBackup() {
    try {
      const backup = await exportContactsVault();
      if (!backup) return setError('Save a contact first to create an encrypted backup.');
      await Share.share({ title: 'Encrypted Mera contacts backup', message: backup });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not share the encrypted backup.');
    }
  }

  async function restoreBackup() {
    if (!account || !backupText.trim()) return setError('Paste an encrypted contacts backup first.');
    setSaving(true);
    setError('');
    try {
      setContacts(await importContactsVault(account, backupText.trim()));
      setBackupText('');
      setShowRestore(false);
      Alert.alert('Contacts restored', 'Your encrypted contacts were opened with your Mera passkey.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not restore this contacts backup.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Page contentStyle={styles.page}>
      <Pressable onPress={() => router.back()} style={styles.back} accessibilityRole="button" accessibilityLabel="Go back">
        <Feather name="arrow-left" size={20} color={colors.foreground} />
        <Text style={[styles.backText, { color: colors.foreground }]}>Profile</Text>
      </Pressable>
      <Eyebrow>YOUR PRIVATE ADDRESS BOOK</Eyebrow>
      <Title>People you pay</Title>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Save a familiar name with a verified smart-account address. Reuse it when you send or share a payment.</Text>

      {!account ? <InlineNotice icon="key">Create or unlock a Mera passkey wallet to use encrypted contacts.</InlineNotice> : <>
        <InlineNotice icon="lock">Names and addresses are encrypted with Mera before they are stored on this device. There is no shared username directory.</InlineNotice>
        {error ? <Text accessibilityRole="alert" style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}
        <Card style={styles.form}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Add someone</Text>
          <TextInput value={name} onChangeText={setName} placeholder="Name, e.g. Alex" placeholderTextColor={colors.mutedForeground} autoCapitalize="words" style={[styles.input, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]} />
          <TextInput value={address} onChangeText={setAddress} placeholder="Monad smart-account address" placeholderTextColor={colors.mutedForeground} autoCapitalize="none" autoCorrect={false} style={[styles.input, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]} />
          <PrimaryButton label="Save contact with passkey" icon="lock" loading={saving} onPress={addContact} />
        </Card>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Saved contacts</Text>
          <Text style={[styles.count, { color: colors.mutedForeground }]}>{contacts.length}</Text>
        </View>
        {loading ? <Text style={[styles.empty, { color: colors.mutedForeground }]}>Unlocking encrypted contacts…</Text> : null}
        {!loading && contacts.length === 0 ? <Text style={[styles.empty, { color: colors.mutedForeground }]}>No contacts yet. Add someone’s smart-account address above.</Text> : null}
        {!loading && contacts.map((contact) => <Card key={contact.id} style={styles.contactCard}>
          <View style={styles.contactHeading}>
            <View style={[styles.avatar, { backgroundColor: colors.secondary }]}><Text style={[styles.avatarText, { color: colors.primary }]}>{contact.name[0]?.toUpperCase()}</Text></View>
            <View style={styles.contactCopy}>
              <Text style={[styles.contactName, { color: colors.foreground }]}>{contact.name}</Text>
              <Text selectable style={[styles.contactAddress, { color: colors.mutedForeground }]}>{contact.address}</Text>
            </View>
          </View>
          <View style={styles.actions}>
            <Pressable onPress={() => router.push({ pathname: '/send', params: { recipient: contact.address, recipientName: contact.name } })} style={[styles.sendButton, { backgroundColor: colors.secondary }]}>
              <Feather name="send" size={15} color={colors.primary} /><Text style={[styles.sendText, { color: colors.primary }]}>Send AUSD</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${contact.name}`} disabled={saving} onPress={() => void commit(contacts.filter((item) => item.id !== contact.id))} style={styles.removeButton}>
              <Feather name="trash-2" size={16} color={colors.destructive} />
            </Pressable>
          </View>
        </Card>)}

        <Card style={styles.backupCard}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recover on another device</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Share or copy the encrypted backup, then restore it with the same passkey and app domain.</Text>
          <PrimaryButton label="Share encrypted backup" icon="share" secondary onPress={() => void shareBackup()} />
          <Pressable onPress={() => setShowRestore(!showRestore)} style={styles.restoreToggle}>
            <Text style={[styles.sendText, { color: colors.primary }]}>{showRestore ? 'Hide restore' : 'Restore encrypted contacts'}</Text>
            <Feather name={showRestore ? 'chevron-up' : 'chevron-down'} size={16} color={colors.primary} />
          </Pressable>
          {showRestore ? <>
            <TextInput value={backupText} onChangeText={setBackupText} multiline autoCapitalize="none" autoCorrect={false} placeholder="Paste encrypted backup JSON" placeholderTextColor={colors.mutedForeground} style={[styles.backupInput, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]} />
            <PrimaryButton label="Restore with passkey" icon="key" loading={saving} onPress={() => void restoreBackup()} />
          </> : null}
        </Card>
      </>}
    </Page>
  );
}

const styles = StyleSheet.create({
  page: { gap: 14, paddingBottom: 38 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 },
  backText: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  subtitle: { fontSize: 13, lineHeight: 20 },
  form: { gap: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  sectionTitle: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  count: { fontSize: 12 },
  input: { minHeight: 50, borderWidth: 1, borderRadius: 11, paddingHorizontal: 13, fontSize: 14 },
  error: { fontSize: 12, lineHeight: 17 },
  empty: { fontSize: 13, lineHeight: 20, paddingVertical: 8 },
  contactCard: { gap: 12 },
  contactHeading: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  avatar: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  contactCopy: { flex: 1, gap: 4 },
  contactName: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  contactAddress: { fontSize: 10 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  sendButton: { flex: 1, minHeight: 42, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  sendText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  removeButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  backupCard: { gap: 12 },
  restoreToggle: { minHeight: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backupInput: { minHeight: 100, borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 12, textAlignVertical: 'top' },
});
