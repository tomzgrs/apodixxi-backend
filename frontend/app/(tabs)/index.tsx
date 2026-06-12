import React, { useContext, useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Image, Modal, Platform, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { I18nContext } from '../_layout';
import { useTheme } from '../../src/ThemeContext';
import { getStoreColor, getStoreInitial, formatPrice } from '../../src/constants';
import { Typography, Spacing, Radius, Shadows } from '../../src/theme';
import { api } from '../../src/api';
import { useAuth } from '../../src/AuthContext';
import { getStoreLogo } from '../../src/storeLogos';
import { BarChart, DonutChart, DonutLegend, TrendIndicator } from '../../src/components/Charts';
import { Recommendations } from '../../src/components/Recommendations';
import AIAssistant from '../../src/components/AIAssistant';
import CategoryDrilldown from '../../src/components/CategoryDrilldown';
import { useConnectivity } from '../../src/hooks/useConnectivity';
import { DashboardSkeleton } from '../../src/components/Skeleton';
import { hapticLight } from '../../src/haptics';
export default function DashboardScreen() {
  const { t, lang } = useContext(I18nContext);
  const { theme, isDark } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const online = useConnectivity();
  const [fromCache, setFromCache] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [categoryStats, setCategoryStats] = useState<{ categories: any[]; grand_total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [distributionMode, setDistributionMode] = useState<'total' | 'month'>('total');
  const [showDistributionDropdown, setShowDistributionDropdown] = useState(false);
  const [deviceId, setDeviceId] = useState('');
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<{
    is_premium: boolean;
    app_name: string;
    days_remaining: number | null;
  }>({ is_premium: false, app_name: 'apodixxi', days_remaining: null });

  const loadData = useCallback(async () => {
    try {
      const id = await api.getDeviceId();
      setDeviceId(id);
      const [statsData, analyticsData, subStatus, catData] = await Promise.all([
        api.getStats(),
        api.getAnalytics(6),
        api.getSubscriptionStatus().catch(() => ({ is_premium: false, app_name: 'apodixxi', days_remaining: null })),
        api.getCategoryStats().catch(() => null),
      ]);
      setStats(statsData);
      setAnalytics(analyticsData);
      setFromCache(!!(statsData && statsData.__fromCache));
      if (catData) setCategoryStats(catData);
      if (subStatus) {
        setSubscriptionStatus(subStatus);
      }
    } catch (e) {
      console.log('Dashboard load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const getStoreDistribution = () => {
    if (distributionMode === 'total') {
      return analytics?.store_distribution || [];
    } else {
      // Use current month distribution from backend
      return analytics?.current_month_store_distribution || [];
    }
  };

  const styles = createStyles(theme, isDark);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <DashboardSkeleton />
      </SafeAreaView>
    );
  }

  const hasData = stats && stats.total_receipts > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{t('welcome_emoji')}</Text>
            {(subscriptionStatus.is_premium || user?.account_type === 'paid') ? (
              <Text testID="app-title" style={styles.appTitle}>
                apodixxi<Text style={{ color: '#f59e0b' }}>+</Text>
              </Text>
            ) : (
              <Text testID="app-title" style={styles.appTitle}>apodixxi</Text>
            )}
          </View>
          <TouchableOpacity 
            style={styles.settingsBtn}
            onPress={() => router.push('/(tabs)/settings')}
          >
            <Ionicons name="settings-outline" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>

        {/* Cached-data notice (shown when serving offline data) */}
        {fromCache && (
          <View testID="dashboard-cached-notice" style={styles.cachedNotice}>
            <Ionicons name="cloud-offline-outline" size={14} color={theme.textSecondary} />
            <Text style={styles.cachedNoticeText}>{t('showing_cached')}</Text>
          </View>
        )}

        {/* Recommendations & Promotions - visible to all users regardless of receipts */}
        {deviceId && (
          <Recommendations 
            deviceId={deviceId} 
            location="dashboard"
            limit={5}
            onPress={(rec) => {
              if (rec.url) {
                const cleanUrl = rec.url.startsWith('http') ? rec.url : 'https://' + rec.url;
                Linking.openURL(cleanUrl).catch(() => {});
              } else if (rec.store_name) {
                router.push('/(tabs)/compare');
              }
            }}
          />
        )}

        {!hasData ? (
          /* Empty State */
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="receipt-outline" size={48} color={theme.primary} />
            </View>
            <Text style={styles.emptyTitle}>{t('no_data_yet')}</Text>
            <Text style={styles.emptyDesc}>{t('start_adding')}</Text>
            <TouchableOpacity
              testID="add-first-receipt-btn"
              style={styles.addBtn}
              onPress={() => { hapticLight(); router.push('/(tabs)/add'); }}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={20} color={theme.textInverse} />
              <Text style={styles.addBtnText}>{t('add_receipt')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Main Stats Card */}
            <View style={styles.mainStatsCard}>
              <View style={styles.mainStatsHeader}>
                <View>
                  <Text style={styles.mainStatsLabel}>{t('total_expenses')}</Text>
                  <Text style={styles.mainStatsValue}>{formatPrice(stats.total_spent)}</Text>
                </View>
                {analytics && (
                  <TrendIndicator 
                    trend={analytics.spending_trend} 
                    changePercent={analytics.change_percent}
                    theme={theme}
                  />
                )}
              </View>
              <View style={styles.mainStatsRow}>
                <View style={styles.mainStatItem}>
                  <Text style={styles.mainStatItemValue}>{stats.total_receipts}</Text>
                  <Text style={styles.mainStatItemLabel}>{t('total_receipts')}</Text>
                </View>
                <View style={styles.mainStatDivider} />
                <View style={styles.mainStatItem}>
                  <Text style={styles.mainStatItemValue}>{stats.total_products}</Text>
                  <Text style={styles.mainStatItemLabel}>{t('products_label')}</Text>
                </View>
                <View style={styles.mainStatDivider} />
                <View style={styles.mainStatItem}>
                  <Text style={styles.mainStatItemValue}>{formatPrice(stats.avg_receipt)}</Text>
                  <Text style={styles.mainStatItemLabel}>{t('avg_receipt_label')}</Text>
                </View>
              </View>
            </View>

            {/* Quick Actions */}
            <View style={styles.quickActions}>
              <TouchableOpacity 
                style={styles.quickActionBtn}
                onPress={() => { hapticLight(); router.push('/(tabs)/add'); }}
                activeOpacity={0.7}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: theme.primaryLight }]}>
                  <Ionicons name="scan-outline" size={24} color={theme.primary} />
                </View>
                <Text style={styles.quickActionText}>{t('scan')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.quickActionBtn}
                onPress={() => { hapticLight(); router.push('/(tabs)/purchases'); }}
                activeOpacity={0.7}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: theme.accentLight }]}>
                  <Ionicons name="time-outline" size={24} color={theme.accent} />
                </View>
                <Text style={styles.quickActionText}>{t('history')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.quickActionBtn}
                onPress={() => { hapticLight(); router.push('/(tabs)/compare'); }}
                activeOpacity={0.7}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: theme.warningLight }]}>
                  <Ionicons name="pricetag-outline" size={24} color={theme.warning} />
                </View>
                <Text style={styles.quickActionText}>{t('compare')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.quickActionBtn}
                onPress={() => { hapticLight(); router.push('/(tabs)/purchases'); }}
                activeOpacity={0.7}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: theme.infoLight }]}>
                  <Ionicons name="search-outline" size={24} color={theme.info} />
                </View>
                <Text style={styles.quickActionText}>{t('search')}</Text>
              </TouchableOpacity>
            </View>

            {/* Monthly Spending Chart */}
            {analytics && analytics.monthly_spending && analytics.monthly_spending.length > 0 && (
              <View style={styles.chartCard}>
                <View style={styles.chartHeader}>
                  <Ionicons name="bar-chart-outline" size={20} color={theme.primary} />
                  <Text style={styles.chartTitle}>{t('monthly_expenses')}</Text>
                  <Text style={styles.chartHint}>{t('tap_month_hint')}</Text>
                </View>
                <BarChart 
                  data={analytics.monthly_spending.map(function(m: any) { return { label: m.label, amount: m.amount, month: m.month }; })}
                  theme={theme}
                  height={180}
                  onBarPress={function(month) { router.push(`/month-receipts?month=${month}`); }}
                />
                {analytics.total_this_month > 0 && (
                  <View style={styles.chartFooter}>
                    <Text style={styles.chartFooterLabel}>{t('current_month_colon')}</Text>
                    <Text style={styles.chartFooterValue}>{formatPrice(analytics.total_this_month)}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Category Drill-down */}
            {categoryStats && categoryStats.categories.length > 0 && (
              <View style={styles.chartCard}>
                <CategoryDrilldown
  
                  categories={categoryStats.categories}
  
                  grandTotal={categoryStats.grand_total}
  
                  onSubcategoryPress={(cat, sub) => {
  
                    router.push(`/category-products?category=${encodeURIComponent(cat)}&subcategory=${encodeURIComponent(sub)}`);
  
                  }}
  
                />
              </View>
            )}

            {/* Store Distribution */}
            {analytics && analytics.store_distribution && analytics.store_distribution.length > 0 && (
              <View style={styles.chartCard}>
                <View style={styles.chartHeader}>
                  <Ionicons name="pie-chart-outline" size={20} color={theme.primary} />
                  <Text style={styles.chartTitle}>{t('distribution_by_store')}</Text>
                  
                  {/* Dropdown */}
                  <TouchableOpacity 
                    style={styles.dropdown}
                    onPress={() => setShowDistributionDropdown(!showDistributionDropdown)}
                  >
                    <Text style={styles.dropdownText}>
                      {distributionMode === 'total' ? t('total') : t('month')}
                    </Text>
                    <Ionicons 
                      name={showDistributionDropdown ? "chevron-up" : "chevron-down"} 
                      size={14} 
                      color={theme.primary} 
                    />
                  </TouchableOpacity>
                </View>
                
                {/* Dropdown Options */}
                {showDistributionDropdown && (
                  <View style={styles.dropdownOptions}>
                    <TouchableOpacity 
                      style={[styles.dropdownOption, distributionMode === 'total' && styles.dropdownOptionActive]}
                      onPress={() => { setDistributionMode('total'); setShowDistributionDropdown(false); }}
                    >
                      <Text style={[styles.dropdownOptionText, distributionMode === 'total' && styles.dropdownOptionTextActive]}>
                        Σύνολο όλων
                      </Text>
                      {distributionMode === 'total' && <Ionicons name="checkmark" size={16} color={theme.primary} />}
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.dropdownOption, distributionMode === 'month' && styles.dropdownOptionActive]}
                      onPress={() => { setDistributionMode('month'); setShowDistributionDropdown(false); }}
                    >
                      <Text style={[styles.dropdownOptionText, distributionMode === 'month' && styles.dropdownOptionTextActive]}>
                        Τρέχων μήνας
                      </Text>
                      {distributionMode === 'month' && <Ionicons name="checkmark" size={16} color={theme.primary} />}
                    </TouchableOpacity>
                  </View>
                )}
                
                <View style={styles.donutRow}>
                  <DonutChart 
                    data={getStoreDistribution()}
                    theme={theme}
                    size={130}
                  />
                  <View style={styles.donutLegendWrap}>
                    {getStoreDistribution().slice(0, 5).map((item: any, index: number) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.legendItem}
                        onPress={() => router.push(`/store-receipts?store=${encodeURIComponent(item.name)}`)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                        <Text style={styles.legendName} numberOfLines={1}>{item.name}</Text>
                        <Text style={styles.legendPercent}>{item.percentage.toFixed(0)}%</Text>
                        <Ionicons name="chevron-forward" size={14} color={theme.textMuted} />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            )}

            {/* Top Products */}
            {analytics && analytics.top_products && analytics.top_products.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>{t('frequent_products')}</Text>
                </View>
                {analytics.top_products.slice(0, 4).map((product: any, i: number) => (
                  <View key={i} style={styles.productRow}>
                    <View style={[styles.productRank, { backgroundColor: i === 0 ? theme.warningLight : theme.borderLight }]}>
                      <Text style={[styles.productRankText, { color: i === 0 ? theme.warning : theme.textSecondary }]}>
                        {i + 1}
                      </Text>
                    </View>
                    <View style={styles.productInfo}>
                      <Text style={styles.productName} numberOfLines={1}>{product.description}</Text>
                      <Text style={styles.productCount}>{product.count} αγορές</Text>
                    </View>
                    <Text style={styles.productTotal}>{formatPrice(product.total)}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Top Stores */}
            {stats.stores && stats.stores.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>{t('top_stores')}</Text>
                </View>
                {stats.stores.slice(0, 4).map((store: any, i: number) => {
                  const logoUrl = getStoreLogo(store.name || '');
                  return (
                    <TouchableOpacity
                      key={i}
                      style={styles.storeRow}
                      onPress={() => router.push(`/store-receipts?store=${encodeURIComponent(store.name)}`)}
                      activeOpacity={0.7}
                    >
                      {logoUrl ? (
                        <Image 
                          source={{ uri: logoUrl }} 
                          style={styles.storeLogo}
                          resizeMode="contain"
                        />
                      ) : (
                        <View style={[styles.storeIcon, { backgroundColor: getStoreColor(store.name || '') }]}>
                          <Text style={styles.storeIconText}>{getStoreInitial(store.name || '?')}</Text>
                        </View>
                      )}
                      <View style={styles.storeInfo}>
                        <Text style={styles.storeName} numberOfLines={1}>{store.name}</Text>
                        <Text style={styles.storeVisits}>{store.count} επισκέψεις</Text>
                      </View>
                      <View style={styles.storeRight}>
                        <Text style={styles.storeTotal}>{formatPrice(store.total)}</Text>
                        <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Recent Purchases */}
            {stats.recent_receipts && stats.recent_receipts.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>{t('recent_purchases')}</Text>
                  <TouchableOpacity onPress={() => router.push('/(tabs)/purchases')}>
                    <Text style={styles.viewAll}>{t('view_all')}</Text>
                  </TouchableOpacity>
                </View>
                {stats.recent_receipts.slice(0, 3).map((receipt: any, i: number) => {
                  const logoUrl = getStoreLogo(receipt.store_name || '');
                  return (
                    <TouchableOpacity
                      key={i}
                      testID={`recent-receipt-${i}`}
                      style={styles.receiptCard}
                      onPress={() => router.push(`/receipt/${receipt.id}`)}
                      activeOpacity={0.7}
                    >
                      {logoUrl ? (
                        <Image 
                          source={{ uri: logoUrl }} 
                          style={styles.receiptLogo}
                          resizeMode="contain"
                        />
                      ) : (
                        <View style={[styles.receiptIcon, { backgroundColor: getStoreColor(receipt.store_name || '') }]}>
                          <Text style={styles.receiptIconText}>{getStoreInitial(receipt.store_name || '?')}</Text>
                        </View>
                      )}
                      <View style={styles.receiptInfo}>
                        <Text style={styles.receiptStore} numberOfLines={1}>{receipt.store_name}</Text>
                        <Text style={styles.receiptDate}>{receipt.date}</Text>
                      </View>
                      <View style={styles.receiptRight}>
                        <Text style={styles.receiptTotal}>{formatPrice(receipt.total)}</Text>
                        <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </>
        )}
      </ScrollView>
      
      {/* AI Assistant Floating Button */}
      {deviceId && hasData && (
        <TouchableOpacity
          style={[styles.aiFloatingButton, { backgroundColor: theme.primary }]}
          onPress={() => setShowAIAssistant(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="sparkles" size={24} color="#fff" />
        </TouchableOpacity>
      )}

      {/* AI Assistant Modal */}
      <Modal
        visible={showAIAssistant}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAIAssistant(false)}
      >
        <AIAssistant 
          deviceId={deviceId} 
          onClose={() => setShowAIAssistant(false)} 
        />
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (theme: any, isDark: boolean) => StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: theme.background 
  },
  scroll: { 
    padding: Spacing.base,
    paddingBottom: 80
  },
  cachedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: theme.surface,
  },
  cachedNoticeText: {
    fontSize: Typography.xs,
    color: theme.textSecondary,
    fontWeight: Typography.medium,
  },
  center: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  
  // Header
  header: { 
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl
  },
  greeting: {
    fontSize: Typography.sm,
    color: theme.textSecondary,
    marginBottom: 2,
  },
  appTitle: { 
    fontSize: Typography['2xl'], 
    fontWeight: Typography.bold, 
    color: theme.text,
    letterSpacing: -0.5
  },
  settingsBtn: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: theme.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border,
  },
  
  // Empty State
  emptyState: { 
    alignItems: 'center', 
    paddingVertical: Spacing['4xl'],
    paddingHorizontal: Spacing.xl
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: Radius.full,
    backgroundColor: theme.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  emptyTitle: { 
    fontSize: Typography.xl, 
    fontWeight: Typography.bold, 
    color: theme.text, 
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  emptyDesc: { 
    fontSize: Typography.base, 
    color: theme.textSecondary, 
    marginBottom: Spacing.xl,
    textAlign: 'center',
    lineHeight: Typography.base * Typography.relaxed,
  },
  addBtn: { 
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.primary, 
    paddingHorizontal: Spacing.xl, 
    paddingVertical: Spacing.md, 
    borderRadius: Radius.full,
    gap: Spacing.sm,
  },
  addBtnText: { 
    color: theme.textInverse, 
    fontSize: Typography.base, 
    fontWeight: Typography.semibold 
  },
  
  // Main Stats Card
  mainStatsCard: {
    backgroundColor: theme.primary,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  mainStatsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  mainStatsLabel: {
    fontSize: Typography.sm,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: Spacing.xs,
  },
  mainStatsValue: {
    fontSize: Typography['4xl'],
    fontWeight: Typography.extrabold,
    color: '#FFFFFF',
  },
  mainStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  mainStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  mainStatDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  mainStatItemValue: {
    fontSize: Typography.lg,
    fontWeight: Typography.bold,
    color: '#FFFFFF',
  },
  mainStatItemLabel: {
    fontSize: Typography.xs,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  
  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
  },
  quickActionBtn: {
    alignItems: 'center',
    flex: 1,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: Radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  quickActionText: {
    fontSize: Typography.xs,
    color: theme.textSecondary,
    fontWeight: Typography.medium,
  },
  
  // Chart Card
  chartCard: {
    backgroundColor: theme.card,
    borderRadius: Radius.xl,
    padding: Spacing.base,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: theme.cardBorder,
    ...Shadows.sm,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  chartHint: {
    fontSize: Typography.xs,
    color: theme.textMuted,
    marginLeft: 'auto',
    fontStyle: 'italic',
  },
  chartTitle: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: theme.text,
    flex: 1,
  },
  
  // Dropdown
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.primaryLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    gap: 4,
  },
  dropdownText: {
    fontSize: Typography.xs,
    fontWeight: Typography.semibold,
    color: theme.primary,
  },
  dropdownOptions: {
    backgroundColor: theme.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.borderLight,
  },
  dropdownOptionActive: {
    backgroundColor: theme.primaryLight,
  },
  dropdownOptionText: {
    fontSize: Typography.sm,
    color: theme.text,
  },
  dropdownOptionTextActive: {
    color: theme.primary,
    fontWeight: Typography.semibold,
  },
  
  chartFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.borderLight,
  },
  chartFooterLabel: {
    fontSize: Typography.sm,
    color: theme.textSecondary,
  },
  chartFooterValue: {
    fontSize: Typography.lg,
    fontWeight: Typography.bold,
    color: theme.primary,
  },
  donutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  donutLegendWrap: {
    flex: 1,
    marginLeft: Spacing.lg,
  },
  
  // Section
  section: { 
    marginTop: Spacing.md 
  },
  sectionHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: Spacing.md 
  },
  sectionTitle: { 
    fontSize: Typography.lg, 
    fontWeight: Typography.semibold, 
    color: theme.text 
  },
  viewAll: { 
    fontSize: Typography.sm, 
    color: theme.primary, 
    fontWeight: Typography.semibold 
  },
  
  // Product Row
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.card,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: theme.cardBorder,
  },
  productRank: {
    width: 28,
    height: 28,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productRankText: {
    fontSize: Typography.sm,
    fontWeight: Typography.bold,
  },
  productInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  productName: {
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
    color: theme.text,
  },
  productCount: {
    fontSize: Typography.xs,
    color: theme.textSecondary,
    marginTop: 2,
  },
  productTotal: {
    fontSize: Typography.sm,
    fontWeight: Typography.bold,
    color: theme.text,
  },
  
  // Store Row
  storeRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: theme.card, 
    padding: Spacing.md, 
    borderRadius: Radius.lg, 
    marginBottom: Spacing.sm,
    borderWidth: 1, 
    borderColor: theme.cardBorder 
  },
  storeIcon: { 
    width: 44, 
    height: 44, 
    borderRadius: Radius.md, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  storeIconText: { 
    color: '#FFF', 
    fontSize: Typography.sm, 
    fontWeight: Typography.bold 
  },
  storeLogo: { 
    width: 44, 
    height: 44, 
    borderRadius: Radius.md 
  },
  storeInfo: { 
    flex: 1, 
    marginLeft: Spacing.md 
  },
  storeName: { 
    fontSize: Typography.base, 
    fontWeight: Typography.semibold, 
    color: theme.text 
  },
  storeVisits: { 
    fontSize: Typography.xs, 
    color: theme.textSecondary, 
    marginTop: 2 
  },
  storeTotal: { 
    fontSize: Typography.base, 
    fontWeight: Typography.bold, 
    color: theme.text 
  },
  storeRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  
  // Legend Items
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
    fontWeight: Typography.medium,
    color: theme.text,
  },
  legendPercent: {
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
    color: theme.textSecondary,
    marginRight: Spacing.xs,
  },
  
  // Receipt Card
  receiptCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: theme.card, 
    padding: Spacing.md, 
    borderRadius: Radius.lg, 
    marginBottom: Spacing.sm,
    borderWidth: 1, 
    borderColor: theme.cardBorder 
  },
  receiptIcon: { 
    width: 44, 
    height: 44, 
    borderRadius: Radius.md, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  receiptIconText: { 
    color: '#FFF', 
    fontSize: Typography.sm, 
    fontWeight: Typography.bold 
  },
  receiptLogo: { 
    width: 44, 
    height: 44, 
    borderRadius: Radius.md 
  },
  receiptInfo: { 
    flex: 1, 
    marginLeft: Spacing.md 
  },
  receiptStore: { 
    fontSize: Typography.base, 
    fontWeight: Typography.semibold, 
    color: theme.text 
  },
  receiptDate: { 
    fontSize: Typography.xs, 
    color: theme.textSecondary, 
    marginTop: 2 
  },
  receiptRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  receiptTotal: { 
    fontSize: Typography.base, 
    fontWeight: Typography.bold, 
    color: theme.text 
  },
  aiFloatingButton: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  adContainer: {
    alignItems: 'center',
    marginVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
});
