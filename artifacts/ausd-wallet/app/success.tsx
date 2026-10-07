import React from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import {
  Card,
  Eyebrow,
  InlineNotice,
  Page,
  PrimaryButton,
  Title,
} from '@/components/Primitives';

export default function SimulationSuccessScreen() {
  const colors = useColors();
  const params = useLocalSearchParams<{
    recipient?: string;
    amount?: string;
    currency?: string;
    receiveAmount?: string;
    id?: string;
  }>();
  const amount = Number(params.amount ?? 0);
  const received = Number(params.receiveAmount ?? 0);

  return (
    <Page contentStyle={styles.page}>
      <View style={styles.successIcon}>
        <Feather name="check" size={27} color={colors.primaryForeground} />
      </View>
      <Eyebrow>Simulation complete</Eyebrow>
      <Title>Transfer preview{'\n'}is ready.</Title>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
        The testnet contract check passed. No funds moved and no transaction was sent.
      </Text>

      <Card style={styles.receipt}>
        <Text style={[styles.amount, { color: colors.foreground }]}>
          {amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AUSD
        </Text>
        <Text style={[styles.to, { color: colors.mutedForeground }]}>
          To {params.recipient ?? 'recipient'}
        </Text>
        <View style={[styles.receives, { backgroundColor: colors.secondary }]}>
          <Text style={[styles.receivesLabel, { color: colors.mutedForeground }]}>ESTIMATED RECEIVE</Text>
          <Text style={[styles.receivesValue, { color: colors.foreground }]}>
            {received.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {params.currency ?? 'NGN'}
          </Text>
        </View>
        <Text style={[styles.reference, { color: colors.mutedForeground }]}>
          Local reference · {params.id ?? 'simulation'}
        </Text>
      </Card>

      <InlineNotice icon="info">
        This is a local simulation. There is no transaction hash to open on MonadVision.
      </InlineNotice>
      <PrimaryButton
        label="Back to wallet"
        onPress={() => router.replace('/(tabs)')}
        testID="back-to-wallet"
      />
    </Page>
  );
}

const styles = StyleSheet.create({
  page: { justifyContent: 'center', gap: 16, paddingTop: 12 },
  successIcon: {
    width: 56,
    height: 56,
    borderRadius: 19,
    backgroundColor: '#ff5900',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  subtitle: { fontSize: 13, lineHeight: 20, fontFamily: 'Inter_400Regular' },
  receipt: { gap: 9 },
  amount: { fontSize: 22, fontFamily: 'Inter_600SemiBold' },
  to: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  receives: { borderRadius: 12, padding: 14, marginTop: 4, gap: 5 },
  receivesLabel: { fontSize: 9, letterSpacing: 0.8, fontFamily: 'Inter_600SemiBold' },
  receivesValue: { fontSize: 17, fontFamily: 'Inter_600SemiBold' },
  reference: { fontSize: 9, fontFamily: 'Inter_400Regular' },
});
