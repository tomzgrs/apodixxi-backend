import { useContext, useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { I18nContext } from '../_layout';
import { COLORS, getStoreColor, getStoreInitial, formatPrice } from '../../src/constants';
import { api } from '../../src/api';
import { getStoreLogo } from '../../src/storeLogos';

export default function DashboardScreen() {
  const { t } = useContext(I18nContext);
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

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      </SafeAreaView>
    );
  }

  const hasData = stats && stats.total_receipts > 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text testID="app-title" style={styles.appTitle}>{t('app_name')}</Text>
          <Text style={styles.subtitle}>{t('dashboard')}</Text>
        </View>

        {!hasData ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🛒</Text>
            <Text style={styles.emptyTitle}>{t('no_data_yet')}</Text>
            <Text style={styles.emptyDesc}>{t('start_adding')}</Text>
            <TouchableOpacity
              testID="add-first-receipt-btn"
              style={styles.addBtn}
              onPress={() => router.push('/(tabs)/add')}
              activeOpacity={0.8}
            >
              <Text style={styles.addBtnText}>{t('add_receipt')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { backgroundColor: COLORS.primaryLight }]}>
                <Text style={styles.statValue}>{formatPrice(stats.total_spent)}</Text>
                <Text style={styles.statLabel}>{t('total_spent')}</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: COLORS.secondaryLight }]}>
                <Text style={styles.statValue}>{stats.total_receipts}</Text>
                <Text style={styles.statLabel}>{t('total_receipts')}</Text>
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={[styles.statCard, { backgroundColor: '#F0F9FF' }]}>
                <Text style={styles.statValue}>{formatPrice(stats.avg_receipt)}</Text>
                <Text style={styles.statLabel}>{t('avg_receipt')}</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: '#FDF4FF' }]}>
                <Text style={styles.statValue}>{stats.total_products}</Text>
                <Text style={styles.statLabel}>{t('products')}</Text>
              </View>
            </View>

            {stats.stores && stats.stores.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('top_stores')}</Text>
                {stats.stores.slice(0, 5).map((store: any, i: number) => {
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
                        <Text style={styles.storeVisits}>{store.count} {t('visits')}</Text>
                      </View>
                      <Text style={styles.storeTotal}>{formatPrice(store.total)}</Text>
                    </View>
                  );
                })}
              </View>
            )}

            {stats.recent_receipts && stats.recent_receipts.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>{t('recent_purchases')}</Text>
                  <TouchableOpacity onPress={() => router.push('/(tabs)/purchases')}>
                    <Text style={styles.viewAll}>{t('view_all')}</Text>
                  </TouchableOpacity>
                </View>
                {stats.recent_receipts.map((receipt: any, i: number) => (
                  <TouchableOpacity
                    key={i}
                    testID={`recent-receipt-${i}`}
                    style={styles.receiptCard}
                    onPress={() => router.push(`/receipt/${receipt.id}`)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.receiptDot, { backgroundColor: getStoreColor(receipt.store_name || '') }]} />
                    <View style={styles.receiptInfo}>
                      <Text style={styles.receiptStore} numberOfLines={1}>{receipt.store_name}</Text>
                      <Text style={styles.receiptDate}>{receipt.date}</Text>
                    </View>
                    <Text style={styles.receiptTotal}>{formatPrice(receipt.total)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { marginBottom: 24 },
  appTitle: { fontSize: 32, fontWeight: '800', color: COLORS.primary, letterSpacing: -1 },
  subtitle: { fontSize: 16, color: COLORS.textSecondary, marginTop: 2 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 8 },
  emptyDesc: { fontSize: 15, color: COLORS.textSecondary, marginBottom: 24 },
  addBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 50 },
  addBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  statCard: { flex: 1, padding: 18, borderRadius: 20, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },
  statLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  section: { marginTop: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 12 },
  viewAll: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },
  storeRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, padding: 14, borderRadius: 16, marginBottom: 8, borderWidth: 1, borderColor: COLORS.borderLight },
  storeIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  storeIconText: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  storeLogo: { width: 42, height: 42, borderRadius: 10 },
  storeInfo: { flex: 1, marginLeft: 12 },
  storeName: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  storeVisits: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  storeTotal: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  receiptCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, padding: 14, borderRadius: 16, marginBottom: 8, borderWidth: 1, borderColor: COLORS.borderLight },
  receiptDot: { width: 8, height: 8, borderRadius: 4 },
  receiptInfo: { flex: 1, marginLeft: 12 },
  receiptStore: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  receiptDate: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  receiptTotal: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
});
