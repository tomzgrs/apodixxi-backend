import { Tabs } from 'expo-router';
import React, { useContext } from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { I18nContext } from '../_layout';
import { useTheme } from '../../src/ThemeContext';
import { Radius } from '../../src/theme';

type IconName = 'home' | 'add' | 'purchases' | 'compare' | 'settings';

const PRODUCTION_BANNER_ID = Platform.select({
  android: 'ca-app-pub-2145791775687228/9394941228',
  // No iOS AdMob app configured yet (app.json has only androidAppId). Use the
  // test unit on iOS until a real iOS AdMob app + ad unit exist.
  ios: 'ca-app-pub-3940256099942544/2934735716',
}) || 'ca-app-pub-2145791775687228/9394941228';
const TEST_BANNER_ID = Platform.select({
  android: 'ca-app-pub-3940256099942544/6300978111',
  ios: 'ca-app-pub-3940256099942544/2934735716',
}) || 'ca-app-pub-3940256099942544/6300978111';

const AD_BANNER_HEIGHT = 52;

function TabIcon({ name, focused }: { name: IconName; focused: boolean }) {
  const { theme } = useTheme();

  const iconMap: Record<IconName, { outline: keyof typeof Ionicons.glyphMap; filled: keyof typeof Ionicons.glyphMap }> = {
    home: { outline: 'grid-outline', filled: 'grid' },
    add: { outline: 'add-circle-outline', filled: 'add-circle' },
    purchases: { outline: 'receipt-outline', filled: 'receipt' },
    compare: { outline: 'bar-chart-outline', filled: 'bar-chart' },
    settings: { outline: 'person-outline', filled: 'person' },
  };

  const iconConfig = iconMap[name];
  const iconName = focused ? iconConfig.filled : iconConfig.outline;
  const iconColor = focused ? theme.primary : theme.textMuted;

  return (
    <View style={[
      styles.iconWrap,
      focused && { backgroundColor: theme.primaryLight }
    ]}>
      <Ionicons name={iconName} size={22} color={iconColor} />
    </View>
  );
}

export default function TabLayout() {
  const { t } = useContext(I18nContext);
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'android' ? 12 : 0);
  const [adLoaded, setAdLoaded] = React.useState(false);

  return (
    // Flex column: Tabs fills available space, ad banner sits below as a normal flow sibling
    <View style={styles.container}>
      <View style={styles.tabsWrapper}>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarStyle: {
              backgroundColor: theme.tabBar,
              borderTopColor: theme.tabBarBorder,
              borderTopWidth: 1,
              height: adLoaded ? 65 : 65 + bottomPadding,
              paddingBottom: adLoaded ? 4 : bottomPadding + 4,
              paddingTop: 8,
              elevation: 0,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.05,
              shadowRadius: 12,
            },
            tabBarActiveTintColor: theme.tabActive,
            tabBarInactiveTintColor: theme.tabInactive,
            tabBarLabelStyle: {
              fontSize: 11,
              fontWeight: '500',
              marginTop: 2,
            },
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              title: 'Αρχική',
              tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} />,
            }}
          />
          <Tabs.Screen
            name="add"
            options={{
              title: 'Προσθήκη',
              tabBarIcon: ({ focused }) => <TabIcon name="add" focused={focused} />,
            }}
          />
          <Tabs.Screen
            name="purchases"
            options={{
              title: 'Αγορές',
              tabBarIcon: ({ focused }) => <TabIcon name="purchases" focused={focused} />,
            }}
          />
          <Tabs.Screen
            name="compare"
            options={{
              title: 'Σύγκριση',
              tabBarIcon: ({ focused }) => <TabIcon name="compare" focused={focused} />,
            }}
          />
          <Tabs.Screen
            name="settings"
            options={{
              title: 'Προφίλ',
              tabBarIcon: ({ focused }) => <TabIcon name="settings" focused={focused} />,
            }}
          />
        </Tabs>
      </View>

      {/* Ad banner — normal flow element below the tab navigator, visible to all users */}
      <View style={[styles.adWrapper, adLoaded && { paddingBottom: insets.bottom }]}>
        <BannerAd
          unitId={__DEV__ ? TEST_BANNER_ID : PRODUCTION_BANNER_ID}
          size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          requestOptions={{ requestNonPersonalizedAdsOnly: true }}
          onAdLoaded={() => setAdLoaded(true)}
          onAdFailedToLoad={(error) => { console.warn('[AdMob]', error); setAdLoaded(false); }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
  },
  tabsWrapper: {
    flex: 1,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
});
