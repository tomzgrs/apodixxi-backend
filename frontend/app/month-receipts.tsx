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

const MONTH_NAMES_GR: { [key: string]: string } = {
  '01': 'Ιανουάριος', '02': 'Φεβρουάριος', '03': 'Μάρτιος', '04': 'Απρίλιος',
  '05': 'Μάιος', '06': 'Ιούνιος', '07': 'Ιούλιος', '08': 'Αύγουστος',
  '09': 'Σεπτέμβριος', '10': 'Οκτώβριος', '11': 'Νοέμβριος', '12': 'Δεκέμβριος'
};

const MONTH_NAMES_EN: { [key: string]: string } = {
  '01': 'January', '02': 'February', '03': 'March', '04': 'April',
  '05': 'May', '06': 'June', '07': 'July', '08': 'August',
  '09': 'September', '10': 'October', '11': 'November', '12': 'December'
};

export default function MonthReceiptsScreen() {
  const { month } = useLocalSearchParams<{ month: string }>(); // Format: YYYY-MM
  const { t, lang } = useContext(I18nContext);
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalSpent, setTotalSpent] = useState(0);

  // Parse month for display
  const monthParts = (month || '').split('-');
  const year = monthParts[0] || '';
  const monthNum = monthParts[1] || '';
  const monthName = lang === 'el' 
    ? MONTH_NAMES_GR[monthNum] || monthNum 
    : MONTH_NAMES_EN[monthNum] || monthNum;

  const loadData = useCallback(async () => {
    if (!month) return;
    try {
      // Get all receipts and filter by month
      const data = await api.getReceipts(0, 1000);
      const allReceipts = data.receipts || [];
      
      // Filter by month
      const filtered = allReceipts.filter((r: any) => {
        const receiptDate = r.date || r.created_at || '';
        // Try to parse date formats: DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY
        let parsedMonth = '';
        
        if (receiptDate.includes('/')) {
          // DD/MM/YYYY
          const parts = receiptDate.split('/');
          if (parts.length >= 3) {
            parsedMonth = `${parts[2]}-${parts[1].padStart(2, '0')}`;
          }
        } else if (receiptDate.includes('-')) {
          // YYYY-MM-DD or DD-MM-YYYY
          const parts = receiptDate.split('-');
          if (parts[0].length === 4) {
            parsedMonth = `${parts[0]}-${parts[1]}`;
          } else if (parts[2] && parts[2].length === 4) {
            parsedMonth = `${parts[2]}-${parts[1].padStart(2, '0')}`;
          }
        } else if (receiptDate.includes('T')) {
          // ISO format
          parsedMonth = receiptDate.substring(0, 7);
        }
        
        return parsedMonth === month;
      });
      
      setReceipts(filtered);
      const total = filtered.reduce((sum: number, r: any) => sum + (r.total || 0), 0);
      setTotalSpent(total);
    } catch (e) {
      console.log('Month receipts load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [month]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const styles = createStyles(theme, isDark);

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
        <Text style={styles.headerTitle}>{monthName} {year}</Text>
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
        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryIcon}>
            <Ionicons name="calendar" size={28} color={theme.primary} />
          </View>
          <View style={styles.summaryStats}>
            <Text style={styles.summaryMonth}>{monthName} {year}</Text>
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
          {t('purchases_this_month')}
        </Text>

        {receipts.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={48} color={theme.textMuted} />
            <Text style={styles.emptyText}>
              {t('no_purchases_this_month')}
            </Text>
          </View>
        ) : (
          receipts.map((receipt, i) => {
            const logoUrl = getStoreLogo(receipt.store_name || '');
            return (
              <TouchableOpacity
                key={receipt.id || i}
                style={styles.receiptCard}
                onPress={() => router.push(`/receipt/${receipt.id}`)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`${receipt.store_name || t('unknown')}, ${formatPrice(receipt.total)}`}
              >
                {logoUrl ? (
                  <Image source={{ uri: logoUrl }} style={styles.storeLogo} resizeMode="contain" />
                ) : (
                  <View style={[styles.storeIcon, { backgroundColor: getStoreColor(receipt.store_name || '') }]}>
                    <Text style={styles.storeIconText}>{getStoreInitial(receipt.store_name || '?')}</Text>
                  </View>
                )}
                <View style={styles.receiptInfo}>
                  <Text style={styles.receiptStore} numberOfLines={1}>{receipt.store_name}</Text>
                  <Text style={styles.receiptDate}>{receipt.date}</Text>
                  <Text style={styles.receiptItems}>
                    {receipt.items?.length || 0} {t('products')}
                  </Text>
                </View>
                <View style={styles.receiptRight}>
                  <Text style={styles.receiptTotal}>{formatPrice(receipt.total)}</Text>
                  <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
                </View>
              </TouchableOpacity>
            );
          })
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
  
  // Summary Card
  summaryCard: {
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
  summaryIcon: {
    width: 64,
    height: 64,
    borderRadius: Radius.lg,
    backgroundColor: theme.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryStats: {
    flex: 1,
    marginLeft: Spacing.lg,
  },
  summaryMonth: {
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
  storeIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeIconText: {
    color: '#FFF',
    fontSize: Typography.sm,
    fontWeight: Typography.bold,
  },
  storeLogo: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
  },
  receiptInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  receiptStore: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: theme.text,
  },
  receiptDate: {
    fontSize: Typography.xs,
    color: theme.textSecondary,
    marginTop: 2,
  },
  receiptItems: {
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
