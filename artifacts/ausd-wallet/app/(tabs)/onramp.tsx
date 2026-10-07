import React from 'react';
import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { BrandHeader, Eyebrow, InlineNotice, Page, Title } from '@/components/Primitives';

const methods = [
  { icon: 'credit-card' as const, title: 'Debit or credit card', detail: 'Buy AUSD with a card' },
  { icon: 'briefcase' as const, title: 'Bank transfer', detail: 'Pay from your bank' },
];

export default function OnrampScreen() {
  const colors = useColors();
  return (
    <Page contentStyle={styles.page}>
      <BrandHeader compact />
      <View style={styles.heading}>
        <Eyebrow>MONEY IN</Eyebrow>
        <Title>Add money</Title>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Get AUSD into your wallet.</Text>
      </View>

      <View style={[styles.balance, { backgroundColor: colors.foreground }]}>
        <View style={[styles.balanceIcon, { backgroundColor: colors.primary }]}>
          <Feather name="plus" size={19} color={colors.primaryForeground} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.balanceTitle, { color: colors.background }]}>Buy AUSD</Text>
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
        Alchemy Pay is the planned fiat provider. This preview does not open checkout or accept a payment; supported regions, currencies, and fees will be shown before the provider is connected.
      </InlineNotice>
      <Text style={[styles.footnote, { color: colors.mutedForeground }]}>No payment has been initiated.</Text>
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
