import React, { useContext, useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { I18nContext } from '../_layout';
import { useTheme } from '../../src/ThemeContext';
import { getStoreColor, getStoreInitial, formatPrice } from '../../src/constants';
import { Typography, Spacing, Radius, Shadows } from '../../src/theme';
import { api } from '../../src/api';
import { getStoreLogo } from '../../src/storeLogos';

export default function DashboardScreen() {
  const { t } = useContext(I18nContext);
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      const data = await api.getStats();
      setStats(data);
    } catch (e) {
      console.log('Stats error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  const onRefresh = () => { setRefreshing(true); loadStats(); };

  const styles = createStyles(theme, isDark);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
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
            <Text style={styles.greeting}>Καλώς ήρθατε 👋</Text>
            <Text testID="app-title" style={styles.appTitle}>{t('app_name')}</Text>
          </View>
          <TouchableOpacity 
            style={styles.settingsBtn}
            onPress={() => router.push('/(tabs)/settings')}
          >
            <Ionicons name="settings-outline" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>

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
              onPress={() => router.push('/(tabs)/add')}
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
              <Text style={styles.mainStatsLabel}>Συνολικές Δαπάνες</Text>
              <Text style={styles.mainStatsValue}>{formatPrice(stats.total_spent)}</Text>
              <View style={styles.mainStatsRow}>
                <View style={styles.mainStatItem}>
                  <Text style={styles.mainStatItemValue}>{stats.total_receipts}</Text>
                  <Text style={styles.mainStatItemLabel}>Αποδείξεις</Text>
                </View>
                <View style={styles.mainStatDivider} />
                <View style={styles.mainStatItem}>
                  <Text style={styles.mainStatItemValue}>{stats.total_products}</Text>
                  <Text style={styles.mainStatItemLabel}>Προϊόντα</Text>
                </View>
                <View style={styles.mainStatDivider} />
                <View style={styles.mainStatItem}>
                  <Text style={styles.mainStatItemValue}>{formatPrice(stats.avg_receipt)}</Text>
                  <Text style={styles.mainStatItemLabel}>Μ.Ο. Απόδειξης</Text>
                </View>
              </View>
            </View>

            {/* Quick Actions */}
            <View style={styles.quickActions}>
              <TouchableOpacity 
                style={styles.quickActionBtn}
                onPress={() => router.push('/(tabs)/add')}
                activeOpacity={0.7}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: theme.primaryLight }]}>
                  <Ionicons name="add-circle" size={24} color={theme.primary} />
                </View>
                <Text style={styles.quickActionText}>Προσθήκη</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.quickActionBtn}
                onPress={() => router.push('/scanner')}
                activeOpacity={0.7}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: theme.accentLight }]}>
                  <Ionicons name="qr-code" size={24} color={theme.accent} />
                </View>
                <Text style={styles.quickActionText}>Σάρωση</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.quickActionBtn}
                onPress={() => router.push('/(tabs)/purchases')}
                activeOpacity={0.7}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: theme.infoLight }]}>
                  <Ionicons name="list" size={24} color={theme.info} />
                </View>
                <Text style={styles.quickActionText}>Ιστορικό</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.quickActionBtn}
                onPress={() => router.push('/(tabs)/compare')}
                activeOpacity={0.7}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: theme.warningLight }]}>
                  <Ionicons name="analytics" size={24} color={theme.warning} />
                </View>
                <Text style={styles.quickActionText}>Σύγκριση</Text>
              </TouchableOpacity>
            </View>

            {/* Top Stores */}
            {stats.stores && stats.stores.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Κορυφαία Καταστήματα</Text>
                </View>
                {stats.stores.slice(0, 4).map((store: any, i: number) => {
                  const logoUrl = getStoreLogo(store.name || '');
                  return (
                    <View key={i} style={styles.storeRow}>
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
                      <Text style={styles.storeTotal}>{formatPrice(store.total)}</Text>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Recent Purchases */}
            {stats.recent_receipts && stats.recent_receipts.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Πρόσφατες Αγορές</Text>
                  <TouchableOpacity onPress={() => router.push('/(tabs)/purchases')}>
                    <Text style={styles.viewAll}>Όλες</Text>
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
    paddingBottom: Spacing['3xl']
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
  mainStatsLabel: {
    fontSize: Typography.sm,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: Spacing.xs,
  },
  mainStatsValue: {
    fontSize: Typography['4xl'],
    fontWeight: Typography.extrabold,
    color: '#FFFFFF',
    marginBottom: Spacing.lg,
  },
  mainStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: Radius.lg,
    padding: Spacing.md,
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
});
