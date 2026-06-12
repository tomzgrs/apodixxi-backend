import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet, type ViewStyle, type DimensionValue } from 'react-native';
import { useTheme } from '../ThemeContext';
import { Spacing, Radius } from '../theme';

type SkeletonProps = {
  width?: DimensionValue;
  height?: DimensionValue;
  radius?: number;
  style?: ViewStyle | ViewStyle[];
};

export function Skeleton({ width = '100%', height = 16, radius = Radius.sm, style }: SkeletonProps) {
  const { isDark } = useTheme();
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 750, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 750, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.07)',
          opacity,
        },
        style as any,
      ]}
    />
  );
}

const local = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
});

/** Skeleton rows that mimic the receipt cards on the purchases screen. */
export function ReceiptListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <View style={{ paddingHorizontal: Spacing.base }}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={[local.row, { marginBottom: Spacing.sm }]}>
          <Skeleton width={50} height={50} radius={Radius.md} />
          <View style={{ flex: 1, marginLeft: Spacing.md }}>
            <Skeleton width="55%" height={15} />
            <Skeleton width="35%" height={11} style={{ marginTop: 8 }} />
          </View>
          <Skeleton width={56} height={18} radius={Radius.sm} />
        </View>
      ))}
    </View>
  );
}

/** Skeleton blocks that mimic the dashboard stats and chart cards. */
export function DashboardSkeleton() {
  return (
    <View style={{ padding: Spacing.base }}>
      <Skeleton width="100%" height={120} radius={Radius.xl} />
      <View style={[local.row, { justifyContent: 'space-between', marginTop: Spacing.base }]}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} width={64} height={64} radius={Radius.lg} />
        ))}
      </View>
      <Skeleton width="100%" height={180} radius={Radius.xl} style={{ marginTop: Spacing.base }} />
      <Skeleton width="100%" height={160} radius={Radius.xl} style={{ marginTop: Spacing.base }} />
    </View>
  );
}

/** Skeleton blocks that mimic the receipt detail screen. */
export function ReceiptDetailSkeleton() {
  return (
    <View style={{ padding: Spacing.base }}>
      <Skeleton width="100%" height={84} radius={Radius.xl} />
      <View style={[local.row, { justifyContent: 'space-between', marginTop: Spacing.base }]}>
        <Skeleton width="48%" height={56} radius={Radius.md} />
        <Skeleton width="48%" height={56} radius={Radius.md} />
      </View>
      <Skeleton width="100%" height={220} radius={Radius.xl} style={{ marginTop: Spacing.base }} />
      <Skeleton width="100%" height={120} radius={Radius.xl} style={{ marginTop: Spacing.base }} />
    </View>
  );
}
