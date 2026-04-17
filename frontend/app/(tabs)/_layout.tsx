import { Tabs } from 'expo-router';
import React, { useContext } from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { I18nContext } from '../_layout';
import { useTheme } from '../../src/ThemeContext';
import { Radius } from '../../src/theme';

type IconName = 'home' | 'add' | 'purchases' | 'compare' | 'settings';

function TabIcon({ name, focused }: { name: IconName; focused: boolean }) {
  const { theme } = useTheme();
  
  // Modern icon mapping with outline/filled variants
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
  
  // Calculate proper bottom padding for gesture bar
  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'android' ? 12 : 0);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.tabBar,
          borderTopColor: theme.tabBarBorder,
          borderTopWidth: 1,
          height: 65 + bottomPadding,
          paddingBottom: bottomPadding + 4,
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
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
