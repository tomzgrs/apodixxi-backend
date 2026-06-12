import React, { useContext } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import Svg, { Path, Circle, Line, Rect, G, Text as SvgText, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Typography, Spacing, Radius } from '../theme';
import { I18nContext } from '../../app/_layout';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface BarChartProps {
  data: { label: string; amount: number; month?: string }[];
  theme: any;
  height?: number;
  onBarPress?: (month: string) => void;
}

export function BarChart({ data, theme, height = 180, onBarPress }: BarChartProps) {
  const { t } = useContext(I18nContext);
  if (!data || data.length === 0) return null;

  const chartWidth = SCREEN_WIDTH - Spacing.base * 4;
  const chartHeight = height - 40;
  const maxValue = Math.max(...data.map(d => d.amount), 1);
  const barWidth = (chartWidth - 40) / data.length - 8;

  return (
    <View style={styles.chartContainer}>
      <Svg width={chartWidth} height={height}>
        <Defs>
          <LinearGradient id="barGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={theme.primary} stopOpacity="1" />
            <Stop offset="100%" stopColor={theme.primary} stopOpacity="0.6" />
          </LinearGradient>
        </Defs>
        
        {/* Grid lines */}
        {[0, 1, 2, 3].map(i => {
          const y = 20 + (chartHeight / 3) * i;
          return (
            <Line
              key={i}
              x1={35}
              y1={y}
              x2={chartWidth - 10}
              y2={y}
              stroke={theme.borderLight}
              strokeWidth={1}
              strokeDasharray="4,4"
            />
          );
        })}

        {/* Bars */}
        {data.map((item, index) => {
          const barHeight = maxValue > 0 ? (item.amount / maxValue) * (chartHeight - 20) : 0;
          const x = 40 + index * (barWidth + 8);
          const y = chartHeight - barHeight + 20;

          return (
            <G key={index}>
              <Rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(barHeight, 2)}
                fill="url(#barGradient)"
                rx={4}
                ry={4}
              />
              <SvgText
                x={x + barWidth / 2}
                y={height - 8}
                fontSize={10}
                fill={theme.textSecondary}
                textAnchor="middle"
                fontWeight="500"
              >
                {item.label}
              </SvgText>
              {item.amount > 0 && (
                <SvgText
                  x={x + barWidth / 2}
                  y={y - 6}
                  fontSize={9}
                  fill={theme.textSecondary}
                  textAnchor="middle"
                  fontWeight="600"
                >
                  {item.amount >= 1000 ? `${(item.amount / 1000).toFixed(1)}k` : item.amount.toFixed(0)}
                </SvgText>
              )}
            </G>
          );
        })}
      </Svg>
      
      {/* Touchable overlays for each bar */}
      {onBarPress && (
        <View style={[styles.touchableOverlay, { width: chartWidth, height }]}>
          {data.map((item, index) => {
            const x = 40 + index * (barWidth + 8);
            return (
              <TouchableOpacity
                key={index}
                style={{
                  position: 'absolute',
                  left: x,
                  top: 0,
                  width: barWidth,
                  height: height - 20,
                }}
                onPress={() => item.month && onBarPress(item.month)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={item.label || t('month')}
              />
            );
          })}
        </View>
      )}
    </View>
  );
}

interface DonutChartProps {
  data: { name: string; amount: number; percentage: number; color: string }[];
  theme: any;
  size?: number;
}

export function DonutChart({ data, theme, size = 140 }: DonutChartProps) {
  const { t } = useContext(I18nContext);
  if (!data || data.length === 0) return null;

  const radius = size / 2 - 10;
  const strokeWidth = 24;
  const innerRadius = radius - strokeWidth / 2;
  const circumference = 2 * Math.PI * innerRadius;
  const center = size / 2;

  let currentAngle = -90; // Start from top

  const segments = data.map((item, index) => {
    const angle = (item.percentage / 100) * 360;
    const startAngle = currentAngle;
    currentAngle += angle;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = ((startAngle + angle) * Math.PI) / 180;

    const x1 = center + innerRadius * Math.cos(startRad);
    const y1 = center + innerRadius * Math.sin(startRad);
    const x2 = center + innerRadius * Math.cos(endRad);
    const y2 = center + innerRadius * Math.sin(endRad);

    const largeArcFlag = angle > 180 ? 1 : 0;

    const pathData = [
      `M ${x1} ${y1}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
    ].join(' ');

    return (
      <Path
        key={index}
        d={pathData}
        stroke={item.color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
      />
    );
  });

  const totalAmount = data.reduce((sum, item) => sum + item.amount, 0);

  return (
    <View style={styles.donutContainer}>
      <Svg width={size} height={size}>
        {/* Background circle */}
        <Circle
          cx={center}
          cy={center}
          r={innerRadius}
          stroke={theme.borderLight}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {segments}
      </Svg>
      <View style={[styles.donutCenter, { width: size - 60, height: size - 60 }]}>
        <Text style={[styles.donutCenterAmount, { color: theme.text }]}>
          {totalAmount >= 1000 ? `${(totalAmount / 1000).toFixed(1)}k` : totalAmount.toFixed(0)}€
        </Text>
        <Text style={[styles.donutCenterLabel, { color: theme.textSecondary }]}>
          {t('total')}
        </Text>
      </View>
    </View>
  );
}

interface DonutLegendProps {
  data: { name: string; amount: number; percentage: number; color: string }[];
  theme: any;
}

export function DonutLegend({ data, theme }: DonutLegendProps) {
  return (
    <View style={styles.legendContainer}>
      {data.slice(0, 5).map((item, index) => (
        <View key={index} style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: item.color }]} />
          <Text style={[styles.legendName, { color: theme.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[styles.legendPercent, { color: theme.textSecondary }]}>
            {item.percentage.toFixed(0)}%
          </Text>
        </View>
      ))}
    </View>
  );
}

interface TrendIndicatorProps {
  trend: 'up' | 'down' | 'neutral';
  changePercent: number;
  theme: any;
}

export function TrendIndicator({ trend, changePercent, theme }: TrendIndicatorProps) {
  const { t } = useContext(I18nContext);
  const isUp = trend === 'up';
  const isDown = trend === 'down';
  const color = isUp ? theme.error : isDown ? theme.success : theme.textSecondary;
  const icon = isUp ? '↑' : isDown ? '↓' : '→';
  const label = isUp ? t('trend_up') : isDown ? t('trend_down') : t('trend_stable');

  return (
    <View style={[styles.trendContainer, { backgroundColor: isUp ? theme.errorLight : isDown ? theme.successLight : theme.borderLight }]}>
      <Text style={[styles.trendIcon, { color }]}>{icon}</Text>
      <Text style={[styles.trendText, { color }]}>
        {label} {Math.abs(changePercent).toFixed(0)}%
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chartContainer: {
    alignItems: 'center',
    marginTop: Spacing.sm,
    position: 'relative',
  },
  touchableOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  donutContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenterAmount: {
    fontSize: Typography.xl,
    fontWeight: '800',
  },
  donutCenterLabel: {
    fontSize: Typography.xs,
    marginTop: 2,
  },
  legendContainer: {
    marginTop: Spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: Spacing.sm,
  },
  legendName: {
    flex: 1,
    fontSize: Typography.sm,
    fontWeight: '500',
  },
  legendPercent: {
    fontSize: Typography.sm,
    fontWeight: '600',
    marginLeft: Spacing.sm,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    gap: 4,
  },
  trendIcon: {
    fontSize: Typography.sm,
    fontWeight: '700',
  },
  trendText: {
    fontSize: Typography.xs,
    fontWeight: '600',
  },
});
