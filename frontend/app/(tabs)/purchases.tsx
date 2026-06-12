import React, { useContext, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, RefreshControl, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { I18nContext } from '../_layout';
import { useTheme } from '../../src/ThemeContext';
import { getStoreColor, getStoreInitial, formatPrice } from '../../src/constants';
import { Typography, Spacing, Radius } from '../../src/theme';
import { api } from '../../src/api';
import { getStoreLogo } from '../../src/storeLogos';
import { useConnectivity } from '../../src/hooks/useConnectivity';

export default function PurchasesScreen() {
  const { t } = useContext(I18nContext);
  const { theme } = useTheme();
  const router = useRouter();
  const online = useConnectivity();
  const [receipts, setReceipts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fromCache, setFromCache] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const styles = createStyles(theme);

  const loadReceipts = useCallback(async (searchQuery = '') => {
    try {
      const data = await api.getReceipts(0, 100, searchQuery);
      setReceipts(data.receipts);
      setTotal(data.total);
      setFromCache(!!data.__fromCache);
      setLoadError(false);
    } catch (e) {
      console.log('Load receipts error:', e);
      setLoadError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadReceipts(search); }, [search]));

  const onRefresh = () => { setRefreshing(true); loadReceipts(search); };

  const handleSearch = (text: string) => {
    setSearch(text);
    setLoading(true);
    loadReceipts(text);
  };

  const renderReceipt = ({ item }: { item: any }) => {
    const logoUrl = getStoreLogo(item.store_name || '');
    
    return (
      <TouchableOpacity
        testID={`receipt-card-${item.id || item._id}`}
        style={styles.receiptCard}
        onPress={() => { const rid = item.id || item._id; if (rid) router.push(`/receipt/${rid}`); }}
        activeOpacity={0.7}
      >
        {logoUrl ? (
          <Image 
            source={{ uri: logoUrl }} 
            style={styles.storeLogo}
            resizeMode="contain"
          />
        ) : (
          <View style={[styles.storeIcon, { backgroundColor: getStoreColor(item.store_name || '') }]}>
            <Text style={styles.storeIconText}>{getStoreInitial(item.store_name || '?')}</Text>
          </View>
        )}
        <View style={styles.receiptInfo}>
          <Text style={styles.storeName} numberOfLines={1}>{item.store_name || 'Άγνωστο'}</Text>
          <View style={styles.receiptMeta}>
            <Ionicons name="calendar-outline" size={12} color={theme.textMuted} />
            <Text style={styles.receiptDate}>{item.date}</Text>
            <Text style={styles.receiptDot}>•</Text>
            <Ionicons name="cart-outline" size={12} color={theme.textMuted} />
            <Text style={styles.receiptItems}>{item.items?.length || 0} προϊόντα</Text>
          </View>
        </View>
        <View style={styles.receiptRight}>
          <Text style={styles.receiptTotal}>{formatPrice(item.total)}</Text>
          <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Οι Αγορές μου</Text>
        <Text style={styles.subtitle}>{total} αποδείξεις</Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={20} color={theme.textMuted} />
          <TextInput
            testID="search-input"
            style={styles.searchInput}
            placeholder="Αναζήτηση καταστήματος ή προϊόντος..."
            placeholderTextColor={theme.textMuted}
            value={search}
            onChangeText={handleSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Ionicons name="close-circle" size={20} color={theme.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Cached-data notice */}
      {fromCache && receipts.length > 0 && (
        <View testID="cached-notice" style={styles.cachedNotice}>
          <Ionicons name="cloud-offline-outline" size={14} color={theme.textSecondary} />
          <Text style={styles.cachedNoticeText}>{t('showing_cached')}</Text>
        </View>
      )}

      {/* Content */}
      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : receipts.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIconContainer}>
            <Ionicons
              name={loadError && !online ? 'cloud-offline-outline' : 'receipt-outline'}
              size={48}
              color={theme.primary}
            />
          </View>
          <Text style={styles.emptyTitle}>
            {loadError && !online
              ? t('offline_no_data')
              : search
                ? 'Δεν βρέθηκαν αποτελέσματα'
                : 'Δεν υπάρχουν αποδείξεις'}
          </Text>
          <Text style={styles.emptyDesc}>
            {loadError && !online
              ? t('offline_no_data_desc')
              : search
                ? 'Δοκιμάστε διαφορετική αναζήτηση'
                : 'Προσθέστε την πρώτη σας απόδειξη'}
          </Text>
          {!search && !loadError && (
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => router.push('/(tabs)/add')}
            >
              <Ionicons name="add" size={20} color={theme.textInverse} />
              <Text style={styles.addBtnText}>Προσθήκη</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={receipts}
          keyExtractor={(item) => item.id || item._id || ''}
          renderItem={renderReceipt}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              tintColor={theme.primary}
              colors={[theme.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </SafeAreaView>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: theme.background 
  },
  
  // Header
  header: { 
    paddingHorizontal: Spacing.base, 
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  title: { 
    fontSize: Typography['2xl'], 
    fontWeight: Typography.bold, 
    color: theme.text,
    letterSpacing: -0.5
  },
  subtitle: { 
    fontSize: Typography.sm, 
    color: theme.textSecondary,
    marginTop: 2
  },
  
  // Search
  searchContainer: { 
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.md,
  },
  searchBox: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: theme.surface, 
    borderRadius: Radius.lg, 
    paddingHorizontal: Spacing.md,
    height: 48,
    borderWidth: 1,
    borderColor: theme.border,
  },
  searchInput: { 
    flex: 1, 
    marginLeft: Spacing.sm, 
    fontSize: Typography.base, 
    color: theme.text 
  },
  
  // Cached notice
  cachedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: theme.surface,
  },
  cachedNoticeText: {
    fontSize: Typography.xs,
    color: theme.textSecondary,
    fontWeight: Typography.medium,
  },

  // Content
  center: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  list: { 
    padding: Spacing.base,
    paddingTop: 0,
    paddingBottom: 140,
  },
  separator: {
    height: Spacing.sm,
  },
  
  // Empty State
  empty: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: Spacing.xl 
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
    fontSize: Typography.lg, 
    fontWeight: Typography.semibold, 
    color: theme.text,
    marginBottom: Spacing.sm,
  },
  emptyDesc: { 
    fontSize: Typography.base, 
    color: theme.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
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
  
  // Receipt Card
  receiptCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: theme.card, 
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: theme.cardBorder,
  },
  storeIcon: { 
    width: 50, 
    height: 50, 
    borderRadius: Radius.md, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  storeIconText: { 
    color: '#FFF', 
    fontSize: Typography.lg, 
    fontWeight: Typography.bold 
  },
  storeLogo: { 
    width: 50, 
    height: 50, 
    borderRadius: Radius.md 
  },
  receiptInfo: { 
    flex: 1, 
    marginLeft: Spacing.md 
  },
  storeName: { 
    fontSize: Typography.base, 
    fontWeight: Typography.semibold, 
    color: theme.text,
    marginBottom: 4,
  },
  receiptMeta: { 
    flexDirection: 'row', 
    alignItems: 'center',
    gap: 4,
  },
  receiptDate: { 
    fontSize: Typography.xs, 
    color: theme.textMuted,
    marginLeft: 4,
  },
  receiptDot: {
    color: theme.textMuted,
    fontSize: Typography.xs,
  },
  receiptItems: { 
    fontSize: Typography.xs, 
    color: theme.textMuted,
    marginLeft: 4,
  },
  receiptRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  receiptTotal: { 
    fontSize: Typography.lg, 
    fontWeight: Typography.bold, 
    color: theme.text 
  },
});
