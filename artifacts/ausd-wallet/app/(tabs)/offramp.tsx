import React from 'react';
import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { BrandHeader, Eyebrow, InlineNotice, Page, Title } from '@/components/Primitives';

const methods = [
  { icon: 'briefcase' as const, title: 'Bank account', detail: 'Withdraw to your local bank' },
  { icon: 'smartphone' as const, title: 'Mobile money', detail: 'Receive on a mobile money wallet' },
];

export default function OfframpScreen() {
  const colors = useColors();
  return (
    <Page contentStyle={styles.page}>
      <BrandHeader compact />
      <View style={styles.heading}>
        <Eyebrow>MONEY OUT</Eyebrow>
        <Title>Cash out</Title>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Withdraw AUSD to a local payment method.</Text>
      </View>

      <View style={[styles.balance, { backgroundColor: colors.foreground }]}>
        <View style={[styles.balanceIcon, { backgroundColor: colors.primary }]}>
          <Feather name="arrow-up-right" size={18} color={colors.primaryForeground} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.balanceTitle, { color: colors.background }]}>Withdraw AUSD</Text>
          <Text style={[styles.balanceDetail, { color: colors.border }]}>Alchemy Pay integration planned</Text>
        </View>
        <Text style={[styles.comingTag, { color: colors.border }]}>SOON</Text>
      </View>

      <View style={styles.methodList}>
        {methods.map((method, index) => (
          <View key={method.title}>
            {index ? <View style={[styles.divider, { backgroundColor: colors.border }]} /> : null}
            <View style={styles.methodRow}>
              <View style={[styles.methodIcon, { backgroundColor: colors.secondary }]}>
                <Feather name={method.icon} size={18} color={colors.foreground} />
              </View>
              <View style={styles.methodText}>
                <Text style={[styles.methodTitle, { color: colors.foreground }]}>{method.title}</Text>
                <Text style={[styles.methodDetail, { color: colors.mutedForeground }]}>{method.detail}</Text>
              </View>
              <Text style={[styles.soon, { color: colors.mutedForeground }]}>Preview</Text>
            </View>
          </View>
        ))}
      </View>
      <InlineNotice icon="info">
        Alchemy Pay is the planned cash-out provider. No payout is submitted in this preview. Availability, identity checks, fees, and delivery times depend on the supported region and payment method.
      </InlineNotice>
      <Text style={[styles.footnote, { color: colors.mutedForeground }]}>Choose a supported region before enabling cash out.</Text>
    </Page>
  );
}

const styles = StyleSheet.create({
  page: { gap: 27, paddingTop: 10 },
  heading: { gap: 6, marginTop: 6 },
  subtitle: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  balance: { minHeight: 96, borderRadius: 20, padding: 17, flexDirection: 'row', alignItems: 'center', gap: 12 },
  balanceIcon: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  balanceTitle: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  balanceDetail: { fontSize: 11, marginTop: 4, fontFamily: 'Inter_400Regular' },
  comingTag: { fontSize: 9, letterSpacing: 0.7, fontFamily: 'Inter_700Bold' },
  methodList: { gap: 0 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 56 },
  methodRow: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 12 },
  methodIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  methodText: { flex: 1, gap: 4 },
  methodTitle: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  methodDetail: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  soon: { fontSize: 10, fontFamily: 'Inter_500Medium' },
  footnote: { fontSize: 11, marginTop: 'auto', paddingBottom: 13, fontFamily: 'Inter_400Regular' },
});
