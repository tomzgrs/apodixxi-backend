/**
 * AdBanner Component - Native Version
 * Shows banner ads for free users only
 */
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { useAuth } from '../AuthContext';

// AdMob Banner Ad Unit ID
const BANNER_AD_UNIT_ID = 'ca-app-pub-2145791775687228/9394941228';

// Test Ad Unit ID (for development)
const TEST_BANNER_AD_UNIT_ID = Platform.select({
  android: 'ca-app-pub-3940256099942544/6300978111',
  ios: 'ca-app-pub-3940256099942544/2934735716',
}) || 'ca-app-pub-3940256099942544/6300978111';

interface AdBannerProps {
  useTestAds?: boolean;
  position?: 'top' | 'bottom';
}

export default function AdBanner({ useTestAds = false, position = 'bottom' }: AdBannerProps) {
  const { user } = useAuth();
  const [adLoaded, setAdLoaded] = useState(false);

  // Don't show ads for paid users
  const isPaidUser = user?.account_type === 'paid';
  
  if (isPaidUser) {
    return null;
  }

  const adUnitId = useTestAds ? TEST_BANNER_AD_UNIT_ID : BANNER_AD_UNIT_ID;

  return (
    <View style={[styles.container, position === 'top' ? styles.top : styles.bottom]}>
      <BannerAd
        unitId={adUnitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
        }}
        onAdLoaded={() => {
          console.log('[AdBanner] Ad loaded');
          setAdLoaded(true);
        }}
        onAdFailedToLoad={(error) => {
          console.log('[AdBanner] Ad failed to load:', error);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  top: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  bottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
});
