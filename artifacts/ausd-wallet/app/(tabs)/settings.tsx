import React from 'react';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Card, Eyebrow, InlineNotice, Page, PrimaryButton, Title } from '@/components/Primitives';
import { useColors } from '@/hooks/useColors';

export default function SettingsScreen() {
  const colors = useColors();
  return (
    <Page contentStyle={{ gap: 14, paddingTop: 10 }}>
      <Eyebrow>ACCOUNT</Eyebrow>
      <Title>Settings</Title>
      <Card style={{ gap: 12, padding: 18 }}>
        <Feather name="settings" size={24} color={colors.primary} />
        <Title size={21}>Wallet settings are coming soon</Title>
        <InlineNotice icon="info">Profile, network, and private contact tools are available while the full Settings area is being built.</InlineNotice>
        <PrimaryButton label="Open profile" icon="user" secondary onPress={() => router.push('/(tabs)/profile')} />
        <PrimaryButton label="Manage contacts" icon="users" secondary onPress={() => router.push('/contacts')} />
      </Card>
    </Page>
  );
}
