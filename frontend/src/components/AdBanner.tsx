/**
 * AdBanner Component - Default Export
 * This file is used as a fallback - the actual implementation
 * comes from .web.tsx or .native.tsx based on platform
 */
import React from 'react';

interface AdBannerProps {
  useTestAds?: boolean;
  position?: 'top' | 'bottom';
}

// Default stub - platform-specific files will be used instead
export default function AdBanner(_props: AdBannerProps): React.ReactElement | null {
  return null;
}
