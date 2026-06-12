import React, { useState, useRef, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import Svg, { Path, Circle, G } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../ThemeContext';
import { Typography, Spacing, Radius, Shadows } from '../theme';
import { formatPrice } from '../constants';
import { I18nContext } from '../../app/_layout';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_SIZE = 220;
const OUTER_R = CHART_SIZE / 2 - 8;
const INNER_R = OUTER_R * 0.52;
const CENTER = CHART_SIZE / 2;

interface SubCategory {
  name: string;
  total: number;
  percentage: number;
  color: string;
}

interface Category {
  name: string;
  total: number;
  percentage: number;
  color: string;
  subcategories: SubCategory[];
}

interface Props {
  categories: Category[];
  grandTotal: number;
  onSubcategoryPress?: (category: string, subcategory: string) => void;
}

// Build SVG arc path for a filled pie sector
function describeArc(
  cx: number,
  cy: number,
  r: number,
  innerR: number,
  startDeg: number,
  endDeg: number,
): string {
  const toRad = (d: number) => (d * Math.PI) / 180;
  // Clamp to avoid full-circle degenerate case
  const end = endDeg - startDeg >= 360 ? startDeg + 359.99 : endDeg;

  const x1 = cx + r * Math.cos(toRad(startDeg));
  const y1 = cy + r * Math.sin(toRad(startDeg));
  const x2 = cx + r * Math.cos(toRad(end));
  const y2 = cy + r * Math.sin(toRad(end));
  const ix1 = cx + innerR * Math.cos(toRad(startDeg));
  const iy1 = cy + innerR * Math.sin(toRad(startDeg));
  const ix2 = cx + innerR * Math.cos(toRad(end));
  const iy2 = cy + innerR * Math.sin(toRad(end));
  const large = end - startDeg > 180 ? 1 : 0;

  return [
    `M ${x1} ${y1}`,
    `A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`,
    `L ${ix2} ${iy2}`,
    `A ${innerR} ${innerR} 0 ${large} 0 ${ix1} ${iy1}`,
    'Z',
  ].join(' ');
}

function buildSegments(
  data: { percentage: number; color: string; name: string; total: number }[],
  outerR: number,
  innerR: number,
  selectedName?: string,
): { path: string; color: string; name: string; total: number; midAngle: number }[] {
  const OFFSET = -90; // Start from top
  const GAP = 1.2;    // degrees gap between segments
  let angle = OFFSET;
  return data.map((item) => {
    const sweep = (item.percentage / 100) * 360;
    const start = angle + GAP / 2;
    const end = angle + sweep - GAP / 2;
    const mid = angle + sweep / 2;
    angle += sweep;

    const isSelected = selectedName === item.name;
    const scale = isSelected ? 1.06 : 1;
    const r = outerR * scale;

    return {
      path: describeArc(CENTER, CENTER, r, innerR, start, end),
      color: item.color,
      name: item.name,
      total: item.total,
      midAngle: mid,
    };
  });
}

export default function CategoryDrilldown({ categories, grandTotal, onSubcategoryPress }: Props) {
  const { theme, isDark } = useTheme();
  const { t } = useContext(I18nContext);
  const [selected, setSelected] = useState<Category | null>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const animateTransition = (fn: () => void) => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      fn();
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    });
  };

  const handleBack = () => animateTransition(() => setSelected(null));
  const handleCategoryTap = (cat: Category) => {
    if (cat.subcategories.length === 0) {
      if (onSubcategoryPress) onSubcategoryPress(cat.name, '');
      return;
    }
    animateTransition(() => setSelected(cat));
  };

  const isLevel2 = selected !== null;
  const displayData = isLevel2 ? selected!.subcategories : categories;
  const displayTotal = isLevel2 ? selected!.total : grandTotal;
  const displayLabel = isLevel2 ? selected!.name : t('total');

  // Only show segments with percentage > 0.5 in the chart to avoid tiny slivers
  const chartData = displayData.filter((d) => d.percentage >= 0.5);
  const segments = buildSegments(chartData, OUTER_R, INNER_R, undefined);

  const styles = createStyles(theme, isDark);

  return (
    <View>
      {/* Header row with back button for Level 2 */}
      <View style={styles.headerRow}>
        {isLevel2 ? (
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backBtn}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t('back')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="chevron-back" size={18} color={theme.primary} />
            <Text style={styles.backText}>{t('categories')}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerLeft}>
            <Ionicons name="pie-chart-outline" size={18} color={theme.primary} />
            <Text style={styles.sectionTitle}>{t('expenses_by_category')}</Text>
          </View>
        )}
        {isLevel2 && (
          <View style={[styles.catChip, { backgroundColor: selected!.color + '28' }]}>
            <View style={[styles.catChipDot, { backgroundColor: selected!.color }]} />
            <Text style={[styles.catChipText, { color: selected!.color }]} numberOfLines={1}>
              {selected!.name}
            </Text>
          </View>
        )}
      </View>

      <Animated.View style={{ opacity: fadeAnim }}>
        {/* Donut Chart */}
        <View style={styles.chartWrap}>
          <Svg width={CHART_SIZE} height={CHART_SIZE}>
            {/* Background ring */}
            <Circle
              cx={CENTER}
              cy={CENTER}
              r={(OUTER_R + INNER_R) / 2}
              stroke={isDark ? '#1E293B' : '#F1F5F9'}
              strokeWidth={OUTER_R - INNER_R}
              fill="none"
            />
            {/* Segments */}
            {segments.map((seg, i) => (
              <Path
                key={i}
                d={seg.path}
                fill={seg.color}
              />
            ))}
          </Svg>

          {/* Overlay touchable areas (one per segment in list) */}
          {!isLevel2 && (
            <View style={[StyleSheet.absoluteFill, styles.segmentTouchOverlay]}>
              {/* Covered by the list taps below — donut is decorative here */}
            </View>
          )}

          {/* Center label */}
          <View style={styles.donutCenter}>
            <Text style={styles.donutAmount} numberOfLines={1}>
              {displayTotal >= 1000
                ? `${(displayTotal / 1000).toFixed(1)}k€`
                : `${displayTotal.toFixed(0)}€`}
            </Text>
            <Text style={styles.donutLabel} numberOfLines={1}>
              {displayLabel}
            </Text>
          </View>
        </View>

        {/* Category / Subcategory list */}
        <View style={styles.listWrap}>
          {displayData.map((item, i) => (
            <TouchableOpacity
              key={i}
              style={styles.row}
              onPress={() => {
                if (isLevel2 && onSubcategoryPress && selected) {
                  onSubcategoryPress(selected.name, item.name);
                } else if (!isLevel2) {
                  handleCategoryTap(item as Category);
                }
              }}
              activeOpacity={isLevel2 && onSubcategoryPress ? 0.65 : (isLevel2 ? 1 : 0.65)}
              accessibilityRole="button"
              accessibilityLabel={item.name}
            >
              {/* Color indicator */}
              <View style={[styles.colorBar, { backgroundColor: item.color }]} />

              {/* Name + bar */}
              <View style={styles.rowCenter}>
                <View style={styles.rowTitleRow}>
                  <Text style={styles.rowName} numberOfLines={1}>{item.name}</Text>
                  {!isLevel2 && (item as Category).subcategories?.length > 0 && (
                    <Ionicons name="chevron-forward" size={14} color={theme.textMuted} />
                  )}
                  {isLevel2 && !!onSubcategoryPress && (
                    <Ionicons name="chevron-forward" size={14} color={theme.textMuted} />
                  )}
                </View>
                {/* Progress bar */}
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        backgroundColor: item.color,
                        width: `${Math.min(item.percentage, 100)}%`,
                      },
                    ]}
                  />
                </View>
              </View>

              {/* Amount + percent */}
              <View style={styles.rowRight}>
                <Text style={styles.rowAmount}>{formatPrice(item.total)}</Text>
                <Text style={[styles.rowPct, { color: item.color }]}>
                  {item.percentage.toFixed(0)}%
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Hint */}
        {!isLevel2 ? (
          <Text style={styles.hint}>{t('tap_category_hint')}</Text>
        ) : !!onSubcategoryPress ? (
          <Text style={styles.hint}>{t('tap_subcategory_hint')}</Text>
        ) : null}
      </Animated.View>
    </View>
  );
}

const createStyles = (theme: any, isDark: boolean) =>
  StyleSheet.create({
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: Spacing.md,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    sectionTitle: {
      fontSize: Typography.sm,
      fontWeight: Typography.bold,
      color: theme.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    backBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
    },
    backText: {
      fontSize: Typography.sm,
      fontWeight: Typography.semibold,
      color: theme.primary,
    },
    catChip: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: Radius.full,
      paddingHorizontal: 10,
      paddingVertical: 4,
      gap: 6,
      maxWidth: 160,
    },
    catChipDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    catChipText: {
      fontSize: Typography.xs,
      fontWeight: Typography.bold,
      flexShrink: 1,
    },

    chartWrap: {
      alignItems: 'center',
      marginBottom: Spacing.base,
      position: 'relative',
    },
    segmentTouchOverlay: {
      pointerEvents: 'none',
    },
    donutCenter: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: 'center',
      justifyContent: 'center',
    },
    donutAmount: {
      fontSize: Typography['2xl'],
      fontWeight: Typography.extrabold,
      color: theme.text,
      letterSpacing: -1,
    },
    donutLabel: {
      fontSize: Typography.xs,
      color: theme.textMuted,
      marginTop: 2,
    },

    listWrap: {
      gap: 2,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.sm,
      borderRadius: Radius.md,
      gap: Spacing.sm,
    },
    colorBar: {
      width: 4,
      height: 36,
      borderRadius: 2,
    },
    rowCenter: {
      flex: 1,
      gap: 4,
    },
    rowTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    rowName: {
      flex: 1,
      fontSize: Typography.sm,
      fontWeight: Typography.medium,
      color: theme.text,
    },
    progressTrack: {
      height: 4,
      backgroundColor: isDark ? '#334155' : '#F1F5F9',
      borderRadius: 2,
      overflow: 'hidden',
    },
    progressFill: {
      height: 4,
      borderRadius: 2,
    },
    rowRight: {
      alignItems: 'flex-end',
      minWidth: 64,
    },
    rowAmount: {
      fontSize: Typography.sm,
      fontWeight: Typography.bold,
      color: theme.text,
    },
    rowPct: {
      fontSize: 10,
      fontWeight: Typography.semibold,
      marginTop: 1,
    },

    hint: {
      fontSize: 10,
      color: theme.textMuted,
      textAlign: 'center',
      marginTop: Spacing.md,
      marginBottom: Spacing.xs,
    },
  });
