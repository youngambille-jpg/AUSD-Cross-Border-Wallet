import React from 'react';
import { Feather } from '@expo/vector-icons';
import { Card, Eyebrow, InlineNotice, Page, Title } from '@/components/Primitives';
import { useColors } from '@/hooks/useColors';

export default function YieldScreen() {
  const colors = useColors();
  return (
    <Page contentStyle={{ gap: 14, paddingTop: 10 }}>
      <Eyebrow>COMING SOON</Eyebrow>
      <Title>Yield</Title>
      <Card style={{ gap: 12, padding: 18 }}>
        <Feather name="trending-up" size={24} color={colors.primary} />
        <Title size={21}>Make your savings work harder</Title>
        <InlineNotice icon="info">Yield products will be added after the core savings and payments experience is ready.</InlineNotice>
      </Card>
    </Page>
  );
}
