import type { ConfigContext } from 'expo/config';

function domainHost(value?: string) {
  if (!value) return undefined;
  try {
    return new URL(value.includes('://') ? value : `https://${value}`).hostname;
  } catch {
    return undefined;
  }
}

export default ({ config }: ConfigContext) => {
  const rpId = domainHost(process.env.EXPO_PUBLIC_RP_ID || process.env.EXPO_PUBLIC_DOMAIN);
  const bundleIdentifier = process.env.AUSD_IOS_BUNDLE_ID || 'com.ausd.wallet';
  const androidPackage = process.env.AUSD_ANDROID_PACKAGE || 'com.ausd.wallet';

  return {
    ...config,
    name: config.name ?? 'AUSD Wallet',
    slug: config.slug ?? 'ausd-wallet',
    version: config.version ?? '1.0.0',
    ios: {
      ...config.ios,
      bundleIdentifier,
      supportsTablet: false,
      ...(rpId ? { associatedDomains: [`webcredentials:${rpId}`] } : {}),
    },
    android: {
      ...config.android,
      package: androidPackage,
      ...(rpId
        ? {
            intentFilters: [
              {
                action: 'VIEW',
                autoVerify: true,
                data: [{ scheme: 'https', host: rpId }],
                category: ['BROWSABLE', 'DEFAULT'],
              },
            ],
          }
        : {}),
    },
  };
};
