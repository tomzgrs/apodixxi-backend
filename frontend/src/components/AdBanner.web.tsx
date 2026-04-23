/**
 * AdBanner Component - Web Version
 * Returns null on web (AdMob doesn't support web)
 */
import React from 'react';

interface AdBannerProps {
  useTestAds?: boolean;
  position?: 'top' | 'bottom';
}

export default function AdBanner(_props: AdBannerProps) {
  // AdMob is not supported on web
  return null;
}
