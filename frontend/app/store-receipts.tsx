import React, { useContext, useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { I18nContext } from './_layout';
import { useTheme } from '../src/ThemeContext';
import { Typography, Spacing, Radius, Shadows } from '../src/theme';
import { getStoreColor, getStoreInitial, formatPrice } from '../src/constants';
import { getStoreLogo } from '../src/storeLogos';
import { api } from '../src/api';

export default function StoreReceiptsScreen() {
  const { store } = useLocalSearchParams<{ store: string }>();
  const { t } = useContext(I18nContext);
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalSpent, setTotalSpent] = useState(0);

  const loadData = useCallback(async () => {
    if (!store) return;
    try {
      const data = await api.getReceiptsByStore(store);
      setReceipts(data.receipts || []);
      const total = (data.receipts || []).reduce((sum: number, r: any) => sum + (r.total || 0), 0);
      setTotalSpent(total);
    } catch (e) {
      console.log('Store receipts load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [store]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const styles = createStyles(theme, isDark);
  const logoUrl = getStoreLogo(store || '');

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel={t('back')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back" size={24} color={theme.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{store}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor={theme.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Store Card */}
        <View style={styles.storeCard}>
          {logoUrl ? (
            <Image source={{ uri: logoUrl }} style={styles.storeLogo} resizeMode="contain" />
          ) : (
            <View style={[styles.storeIcon, { backgroundColor: getStoreColor(store || '') }]}>
              <Text style={styles.storeIconText}>{getStoreInitial(store || '?')}</Text>
            </View>
          )}
          <View style={styles.storeStats}>
            <Text style={styles.storeName}>{store}</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{receipts.length}</Text>
                <Text style={styles.statLabel}>{t('total_receipts')}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.primary }]}>{formatPrice(totalSpent)}</Text>
                <Text style={styles.statLabel}>{t('total')}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Receipt List */}
        <Text style={styles.sectionTitle}>
          {t('all_purchases')}
        </Text>

        {receipts.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={48} color={theme.textMuted} />
            <Text style={styles.emptyText}>
              {t('no_receipts')}
            </Text>
          </View>
        ) : (
          receipts.map((receipt, i) => (
            <TouchableOpacity
              key={receipt.id || i}
              style={styles.receiptCard}
              onPress={() => router.push(`/receipt/${receipt.id}`)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={receipt.store_name || store}
            >
              <View style={styles.receiptDate}>
                <Ionicons name="calendar-outline" size={16} color={theme.textSecondary} />
                <Text style={styles.receiptDateText}>{receipt.date || '-'}</Text>
              </View>
              <View style={styles.receiptInfo}>
                <Text style={styles.receiptItems}>
                  {receipt.items?.length || 0} {t('products')}
                </Text>
                {receipt.receipt_number && (
                  <Text style={styles.receiptNumber}>#{receipt.receipt_number}</Text>
                )}
              </View>
              <View style={styles.receiptRight}>
                <Text style={styles.receiptTotal}>{formatPrice(receipt.total)}</Text>
                <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    backgroundColor: theme.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.borderLight,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: theme.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: Typography.lg,
    fontWeight: Typography.bold,
    color: theme.text,
    textAlign: 'center',
    marginHorizontal: Spacing.md,
  },
  placeholder: { width: 40 },
  
  scroll: { padding: Spacing.base, paddingBottom: Spacing['3xl'] },
  
  // Store Card
  storeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.card,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: theme.cardBorder,
    ...Shadows.sm,
  },
  storeIcon: {
    width: 64,
    height: 64,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeIconText: {
    color: '#FFF',
    fontSize: Typography.xl,
    fontWeight: Typography.extrabold,
  },
  storeLogo: {
    width: 64,
    height: 64,
    borderRadius: Radius.lg,
  },
  storeStats: {
    flex: 1,
    marginLeft: Spacing.lg,
  },
  storeName: {
    fontSize: Typography.lg,
    fontWeight: Typography.extrabold,
    color: theme.text,
    marginBottom: Spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: theme.border,
    marginHorizontal: Spacing.lg,
  },
  statValue: {
    fontSize: Typography.lg,
    fontWeight: Typography.bold,
    color: theme.text,
  },
  statLabel: {
    fontSize: Typography.xs,
    color: theme.textSecondary,
    marginTop: 2,
  },
  
  // Section
  sectionTitle: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: theme.textSecondary,
    marginBottom: Spacing.md,
  },
  
  // Empty
  empty: {
    alignItems: 'center',
    paddingVertical: Spacing['3xl'],
  },
  emptyText: {
    fontSize: Typography.base,
    color: theme.textMuted,
    marginTop: Spacing.md,
  },
  
  // Receipt Card
  receiptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: theme.cardBorder,
  },
  receiptDate: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 90,
  },
  receiptDateText: {
    fontSize: Typography.sm,
    color: theme.text,
    marginLeft: Spacing.xs,
    fontWeight: Typography.medium,
  },
  receiptInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  receiptItems: {
    fontSize: Typography.sm,
    color: theme.textSecondary,
  },
  receiptNumber: {
    fontSize: Typography.xs,
    color: theme.textMuted,
    marginTop: 2,
  },
  receiptRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  receiptTotal: {
    fontSize: Typography.base,
    fontWeight: Typography.bold,
    color: theme.text,
  },
});
