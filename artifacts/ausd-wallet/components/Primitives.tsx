import React from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';

export function Page({
  children,
  scroll = true,
  contentStyle,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  contentStyle?: ViewStyle;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const webInsets = Platform.OS === 'web';
  const body = (
    <View
      style={[
        styles.pageContent,
        contentStyle,
        webInsets && {
          paddingTop: Math.max(67, insets.top),
          paddingBottom: Math.max(34, insets.bottom) + 24,
        },
      ]}
    >
      {children}
    </View>
  );
  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.page, { backgroundColor: colors.background }]}
    >
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {body}
        </ScrollView>
      ) : (
        body
      )}
    </SafeAreaView>
  );
}

export function BrandMark({ size = 38 }: { size?: number }) {
  return (
    <Image
      source={require('@/assets/images/icon.png')}
      resizeMode="contain"
      style={{ width: size, height: size }}
      accessibilityLabel="AUSD Wallet"
    />
  );
}

export function BrandHeader({ compact = false }: { compact?: boolean }) {
  const colors = useColors();
  return (
    <View>
      {/* <View style={styles.brandHeader}> */}
      {/* <View style={styles.brandRow}>
        <BrandMark size={compact ? 34 : 40} />
        <Text style={[styles.brandName, { color: colors.foreground }]}>AUSD</Text>
      </View>
      <View style={[styles.testnetChip, { backgroundColor: colors.secondary }]}>
        <View style={[styles.statusDot, { backgroundColor: colors.primary }]} />
        <Text style={[styles.chipText, { color: colors.mutedForeground }]}>TESTNET</Text>
      </View> */}
    </View>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  return (
    <Text style={[styles.eyebrow, { color: colors.mutedForeground }]}>
      {children}
    </Text>
  );
}

export function Title({
  children,
  size = 30,
}: {
  children: React.ReactNode;
  size?: number;
}) {
  const colors = useColors();
  return (
    <Text style={[styles.title, { color: colors.foreground, fontSize: size }]}>
      {children}
    </Text>
  );
}

export function Body({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  return <Text style={[styles.body, { color: colors.mutedForeground }]}>{children}</Text>;
}

export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  icon,
  secondary = false,
  testID,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ComponentProps<typeof Feather>['name'];
  secondary?: boolean;
  testID?: string;
}) {
  const colors = useColors();
  return (
    <Pressable
      testID={testID}
      disabled={disabled || loading}
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: secondary ? colors.secondary : colors.primary,
          opacity: disabled ? 0.44 : pressed ? 0.84 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={secondary ? colors.foreground : colors.primaryForeground} />
      ) : (
        <>
          {icon ? (
            <Feather
              name={icon}
              size={17}
              color={secondary ? colors.foreground : colors.primaryForeground}
            />
          ) : null}
          <Text
            style={[
              styles.buttonText,
              { color: secondary ? colors.foreground : colors.primaryForeground },
            ]}
          >
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize,
  error,
  testID,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: TextInputProps['keyboardType'];
  autoCapitalize?: TextInputProps['autoCapitalize'];
  error?: string;
  testID?: string;
}) {
  const colors = useColors();
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.foreground }]}>{label}</Text>
      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? 'none'}
        placeholderTextColor={colors.mutedForeground}
        selectionColor={colors.primary}
        style={[
          styles.input,
          {
            backgroundColor: colors.background,
            borderColor: error ? colors.destructive : colors.border,
            color: colors.foreground,
          },
        ]}
      />
      {error ? (
        <Text style={[styles.fieldError, { color: colors.destructive }]}>{error}</Text>
      ) : null}
    </View>
  );
}

export function Divider() {
  const colors = useColors();
  return <View style={[styles.divider, { backgroundColor: colors.border }]} />;
}

export function InlineNotice({
  children,
  icon = 'info',
  tone = 'neutral',
}: {
  children: React.ReactNode;
  icon?: React.ComponentProps<typeof Feather>['name'];
  tone?: 'neutral' | 'warning';
}) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.notice,
        {
          backgroundColor: colors.secondary,
          borderColor: colors.border,
        },
      ]}
    >
      <Feather
        name={icon}
        size={16}
        color={tone === 'warning' ? colors.primary : colors.mutedForeground}
      />
      <Text style={[styles.noticeText, { color: colors.mutedForeground }]}>
        {children}
      </Text>
    </View>
  );
}

export function BackButton({ onPress }: { onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Go back"
      onPress={onPress}
      hitSlop={12}
      style={({ pressed }) => [styles.backButton, { opacity: pressed ? 0.55 : 1 }]}
    >
      <Feather name="arrow-left" size={20} color={colors.foreground} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  scroll: { flexGrow: 1 },
  pageContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 30,
    gap: 20,
  },
  brandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  brandName: { fontSize: 19, letterSpacing: -0.7, fontFamily: 'Inter_700Bold' },
  testnetChip: {
    borderRadius: 6,
    paddingHorizontal: 9,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  chipText: { fontSize: 10, letterSpacing: 0.8, fontFamily: 'Inter_600SemiBold' },
  eyebrow: {
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 1.2,
    fontFamily: 'Inter_600SemiBold',
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: 'Inter_600SemiBold',
    lineHeight: 36,
    letterSpacing: -1.05,
  },
  body: { fontFamily: 'Inter_400Regular', fontSize: 15, lineHeight: 23, letterSpacing: -0.15 },
  button: {
    minHeight: 54,
    borderRadius: 12,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  buttonText: { fontFamily: 'Inter_600SemiBold', fontSize: 15, letterSpacing: -0.25 },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 18,
    gap: 12,
  },
  field: { gap: 8 },
  fieldLabel: { fontSize: 13, fontFamily: 'Inter_600SemiBold', letterSpacing: -0.1 },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
  },
  fieldError: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  divider: { height: StyleSheet.hairlineWidth, width: '100%' },
  notice: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  noticeText: { flex: 1, fontSize: 12, lineHeight: 18, fontFamily: 'Inter_400Regular' },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
});
