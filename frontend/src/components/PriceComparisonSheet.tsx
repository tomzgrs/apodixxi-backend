import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../ThemeContext';
import { Typography, Spacing, Radius, Shadows } from '../theme';
import { api } from '../api';
import { formatPrice } from '../constants';
import { getSavingsBadge } from '../services/priceCompare';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface PriceEntry {
  price: number;
  unit_price: number;
  date: string;
}

interface StoreResult {
  store_name: string;
  last_price: number;
  last_date: string;
  mainCategory: string;
  subCategory: string;
  price_history: PriceEntry[];
}

interface FreeResult {
  description: string;
  tier: 'free';
  found: boolean;
  min_price?: number;
  max_price?: number;
  sample_count?: number;
}

interface PaidResult {
  description: string;
  tier: 'paid';
  found: boolean;
  store_count?: number;
  results?: StoreResult[];
}

type PriceResult = FreeResult | PaidResult;

interface Props {
  visible: boolean;
  description: string;
  currentPrice: number;
  onClose: () => void;
}

export default function PriceComparisonSheet({ visible, description, currentPrice, onClose }: Props) {
  const { theme, isDark } = useTheme();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PriceResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const slideAnim = useState(new Animated.Value(SCREEN_HEIGHT))[0];

  const fetchPrices = useCallback(async () => {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const result = await api.getProductPrices(description);
      setData(result);
    } catch (e: any) {
      setError(e.message || 'Σφάλμα σύνδεσης');
    } finally {
      setLoading(false);
    }
  }, [description]);

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        stiffness: 200,
      }).start();
      fetchPrices();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const isPaid = data?.tier === 'paid';

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: theme.overlay,
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: theme.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: SCREEN_HEIGHT * 0.82,
      ...Shadows.lg,
    },
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.textMuted,
      alignSelf: 'center',
      marginTop: Spacing.sm,
      marginBottom: Spacing.sm,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.base,
      paddingBottom: Spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    headerLeft: { flex: 1 },
    headerTitle: {
      fontSize: Typography.base,
      fontWeight: Typography.bold,
      color: theme.text,
    },
    headerDesc: {
      fontSize: Typography.xs,
      color: theme.textMuted,
      marginTop: 2,
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: Radius.full,
      backgroundColor: theme.borderLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    body: {
      padding: Spacing.base,
    },

    // Free tier card
    freeBand: {
      flexDirection: 'row',
      gap: Spacing.sm,
      marginBottom: Spacing.base,
    },
    freeCard: {
      flex: 1,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      alignItems: 'center',
    },
    freeCardMin: { backgroundColor: isDark ? '#064E3B' : '#D1FAE5' },
    freeCardMax: { backgroundColor: isDark ? '#7F1D1D' : '#FEE2E2' },
    freeCardLabel: {
      fontSize: 9,
      fontWeight: Typography.bold,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      marginBottom: 4,
    },
    freeCardLabelMin: { color: isDark ? '#34D399' : '#059669' },
    freeCardLabelMax: { color: isDark ? '#F87171' : '#DC2626' },
    freeCardPrice: {
      fontSize: Typography.xl,
      fontWeight: Typography.extrabold,
    },
    freeCardPriceMin: { color: isDark ? '#34D399' : '#059669' },
    freeCardPriceMax: { color: isDark ? '#F87171' : '#DC2626' },

    // Upgrade nudge
    upgradeBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? '#1E1B4B' : '#EEF2FF',
      borderRadius: Radius.md,
      padding: Spacing.md,
      gap: Spacing.sm,
      marginBottom: Spacing.base,
    },
    upgradeText: {
      flex: 1,
      fontSize: Typography.xs,
      color: isDark ? '#A5B4FC' : '#4338CA',
      lineHeight: 17,
    },
    upgradeBold: { fontWeight: Typography.bold },

    // Paid tier store list
    storeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: Spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
      gap: Spacing.sm,
    },
    storeRank: {
      width: 24,
      height: 24,
      borderRadius: Radius.full,
      backgroundColor: theme.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    storeRankText: {
      fontSize: 10,
      fontWeight: Typography.bold,
      color: theme.primary,
    },
    storeInfo: { flex: 1 },
    storeName: {
      fontSize: Typography.sm,
      fontWeight: Typography.semibold,
      color: theme.text,
    },
    storeDate: {
      fontSize: 10,
      color: theme.textMuted,
      marginTop: 2,
    },
    storePriceCol: { alignItems: 'flex-end' },
    storePrice: {
      fontSize: Typography.base,
      fontWeight: Typography.extrabold,
      color: theme.text,
    },
    savingsBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: Radius.full,
      paddingHorizontal: 6,
      paddingVertical: 2,
      marginTop: 2,
      gap: 2,
    },
    savingsBadgeSave: { backgroundColor: isDark ? '#064E3B' : '#D1FAE5' },
    savingsBadgeMore: { backgroundColor: isDark ? '#7F1D1D' : '#FEE2E2' },
    savingsBadgeText: { fontSize: 9, fontWeight: Typography.bold },
    savingsBadgeTextSave: { color: isDark ? '#34D399' : '#059669' },
    savingsBadgeTextMore: { color: isDark ? '#F87171' : '#DC2626' },

    // Current price row
    currentPriceRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
      borderRadius: Radius.md,
      padding: Spacing.md,
      marginBottom: Spacing.base,
    },
    currentLabel: { fontSize: Typography.xs, color: theme.textSecondary },
    currentPrice: { fontSize: Typography.sm, fontWeight: Typography.bold, color: theme.text },

    // Empty state
    emptyState: { alignItems: 'center', paddingVertical: Spacing['2xl'] },
    emptyIcon: { marginBottom: Spacing.sm },
    emptyTitle: { fontSize: Typography.base, fontWeight: Typography.bold, color: theme.textSecondary },
    emptySub: { fontSize: Typography.xs, color: theme.textMuted, marginTop: 4, textAlign: 'center' },

    // Tier badge
    tierBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      borderRadius: Radius.full,
      paddingHorizontal: 10,
      paddingVertical: 3,
      gap: 4,
      marginBottom: Spacing.md,
    },
    tierBadgeFree: { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' },
    tierBadgePaid: { backgroundColor: isDark ? '#134E4A' : '#CCFBF1' },
    tierBadgeText: { fontSize: 10, fontWeight: Typography.bold, letterSpacing: 0.3 },
    tierBadgeTextFree: { color: theme.textMuted },
    tierBadgeTextPaid: { color: theme.primary },

    sampleCount: {
      fontSize: 10,
      color: theme.textMuted,
      textAlign: 'center',
      marginBottom: Spacing.base,
    },
  });

  const renderContent = () => {
    if (loading) {
      return (
        <View style={{ alignItems: 'center', paddingVertical: Spacing['2xl'] }}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={{ marginTop: Spacing.sm, fontSize: Typography.sm, color: theme.textMuted }}>
            Αναζήτηση τιμών...
          </Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="wifi-outline" size={40} color={theme.textMuted} style={styles.emptyIcon} />
          <Text style={styles.emptyTitle}>Σφάλμα σύνδεσης</Text>
          <Text style={styles.emptySub}>{error}</Text>
          <TouchableOpacity onPress={fetchPrices} style={{ marginTop: Spacing.base }}>
            <Text style={{ color: theme.primary, fontWeight: Typography.semibold }}>Δοκιμή ξανά</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!data || !data.found) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="search-outline" size={40} color={theme.textMuted} style={styles.emptyIcon} />
          <Text style={styles.emptyTitle}>Δεν βρέθηκαν δεδομένα</Text>
          <Text style={styles.emptySub}>Δεν υπάρχουν ακόμα καταγεγραμμένες τιμές{'\n'}για αυτό το προϊόν.</Text>
          {data?.tier === 'free' && (
            <View style={[styles.upgradeBanner, { marginTop: Spacing.base }]}>
              <Ionicons name="star" size={16} color={isDark ? '#818CF8' : '#4338CA'} />
              <Text style={styles.upgradeText}>
                <Text style={styles.upgradeBold}>apodixxi+</Text> — Δες σε ποιο σούπερ μάρκετ βρίσκεται κάθε τιμή με πλήρες ιστορικό 3 μηνών.
              </Text>
            </View>
          )}
        </View>
      );
    }

    return (
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Current price reference */}
        {currentPrice > 0 && (
          <View style={styles.currentPriceRow}>
            <Text style={styles.currentLabel}>Τιμή αγοράς σου</Text>
            <Text style={styles.currentPrice}>{formatPrice(currentPrice)}</Text>
          </View>
        )}

        {/* Tier badge */}
        <View style={[styles.tierBadge, isPaid ? styles.tierBadgePaid : styles.tierBadgeFree]}>
          <Ionicons
            name={isPaid ? 'star' : 'lock-closed-outline'}
            size={10}
            color={isPaid ? theme.primary : theme.textMuted}
          />
          <Text style={[styles.tierBadgeText, isPaid ? styles.tierBadgeTextPaid : styles.tierBadgeTextFree]}>
            {isPaid ? 'apodixxi+' : 'Free'}
          </Text>
        </View>

        {/* FREE tier */}
        {!isPaid && data.tier === 'free' && data.found && (
          <>
            <View style={styles.freeBand}>
              <View style={[styles.freeCard, styles.freeCardMin]}>
                <Text style={[styles.freeCardLabel, styles.freeCardLabelMin]}>Χαμηλότερη</Text>
                <Text style={[styles.freeCardPrice, styles.freeCardPriceMin]}>
                  {formatPrice(data.min_price!)}
                </Text>
              </View>
              <View style={[styles.freeCard, styles.freeCardMax]}>
                <Text style={[styles.freeCardLabel, styles.freeCardLabelMax]}>Υψηλότερη</Text>
                <Text style={[styles.freeCardPrice, styles.freeCardPriceMax]}>
                  {formatPrice(data.max_price!)}
                </Text>
              </View>
            </View>

            {data.sample_count != null && (
              <Text style={styles.sampleCount}>
                Βασίζεται σε {data.sample_count} καταγραφές των τελευταίων 6 μηνών
              </Text>
            )}

            {/* Upgrade nudge */}
            <View style={styles.upgradeBanner}>
              <Ionicons name="star" size={16} color={isDark ? '#818CF8' : '#4338CA'} />
              <Text style={styles.upgradeText}>
                <Text style={styles.upgradeBold}>apodixxi+</Text> — Δες σε ποιο σούπερ μάρκετ βρίσκεται κάθε τιμή
                με πλήρες ιστορικό 3 μηνών.
              </Text>
            </View>
          </>
        )}

        {/* PAID tier */}
        {isPaid && data.tier === 'paid' && data.found && data.results && (
          <>
            {data.results.map((store, i) => {
              const savings = getSavingsBadge(currentPrice, store.last_price);
              const isCheapest = i === 0;
              return (
                <View key={store.store_name} style={styles.storeRow}>
                  <View style={styles.storeRank}>
                    {isCheapest
                      ? <Ionicons name="trophy" size={12} color={theme.primary} />
                      : <Text style={styles.storeRankText}>{i + 1}</Text>
                    }
                  </View>
                  <View style={styles.storeInfo}>
                    <Text style={styles.storeName}>{store.store_name}</Text>
                    <Text style={styles.storeDate}>{store.last_date}</Text>
                  </View>
                  <View style={styles.storePriceCol}>
                    <Text style={[styles.storePrice, isCheapest && { color: theme.success }]}>
                      {formatPrice(store.last_price)}
                    </Text>
                    {savings && (
                      <View style={[
                        styles.savingsBadge,
                        savings.diff > 0 ? styles.savingsBadgeSave : styles.savingsBadgeMore,
                      ]}>
                        <Ionicons
                          name={savings.diff > 0 ? 'trending-down' : 'trending-up'}
                          size={8}
                          color={savings.diff > 0
                            ? (isDark ? '#34D399' : '#059669')
                            : (isDark ? '#F87171' : '#DC2626')}
                        />
                        <Text style={[
                          styles.savingsBadgeText,
                          savings.diff > 0 ? styles.savingsBadgeTextSave : styles.savingsBadgeTextMore,
                        ]}>
                          {savings.diff > 0 ? '-' : '+'}{Math.abs(savings.pct)}%
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <Animated.View
          style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}
        >
          <TouchableOpacity activeOpacity={1}>
            <View style={styles.handle} />
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Text style={styles.headerTitle}>Σύγκριση τιμών</Text>
                <Text style={styles.headerDesc} numberOfLines={1}>{description}</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={18} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.body}>{renderContent()}</View>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}
