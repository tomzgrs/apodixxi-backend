import { useContext, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { I18nContext } from '../_layout';
import { COLORS, getStoreColor, getStoreInitial, formatPrice } from '../../src/constants';
import { api } from '../../src/api';

export default function PurchasesScreen() {
  const { t } = useContext(I18nContext);
  const router = useRouter();
  const [receipts, setReceipts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadReceipts = useCallback(async (searchQuery = '') => {
    try {
      const data = await api.getReceipts(0, 100, searchQuery);
      setReceipts(data.receipts);
      setTotal(data.total);
    } catch (e) {
      console.log('Load receipts error:', e);
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

  const renderReceipt = ({ item }: { item: any }) => (
    <TouchableOpacity
      testID={`receipt-card-${item.id}`}
      style={styles.receiptCard}
      onPress={() => router.push(`/receipt/${item.id}`)}
      activeOpacity={0.7}
    >
      <View style={[styles.storeIcon, { backgroundColor: getStoreColor(item.store_name || '') }]}>
        <Text style={styles.storeIconText}>{getStoreInitial(item.store_name || '?')}</Text>
      </View>
      <View style={styles.receiptInfo}>
        <Text style={styles.receiptStore} numberOfLines={1}>{item.store_name || 'Unknown'}</Text>
        <Text style={styles.receiptMeta}>
          {item.date} · {item.items?.length || 0} {t('items')} · {item.source_type}
        </Text>
      </View>
      <View style={styles.receiptRight}>
        <Text style={styles.receiptTotal}>{formatPrice(item.total || 0)}</Text>
        <Text style={styles.receiptArrow}>›</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('purchases')}</Text>
        <Text style={styles.count}>{total} {t('receipts')}</Text>
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          testID="search-input"
          style={styles.searchInput}
          placeholder={t('search_placeholder')}
          placeholderTextColor={COLORS.textMuted}
          value={search}
          onChangeText={handleSearch}
        />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : receipts.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>{search ? t('no_results') : t('no_receipts')}</Text>
          <Text style={styles.emptyDesc}>{search ? t('try_different') : t('no_receipts_desc')}</Text>
        </View>
      ) : (
        <FlatList
          data={receipts}
          keyExtractor={(item) => item.id}
          renderItem={renderReceipt}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: 20, paddingTop: 16 },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: -0.5 },
  count: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '600' },
  searchWrap: { paddingHorizontal: 20, paddingVertical: 12 },
  searchInput: { backgroundColor: COLORS.surface, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: COLORS.textPrimary, borderWidth: 1, borderColor: COLORS.border },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  emptyDesc: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  receiptCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, padding: 16, borderRadius: 18, marginBottom: 10, borderWidth: 1, borderColor: COLORS.borderLight },
  storeIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  storeIconText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  receiptInfo: { flex: 1, marginLeft: 14 },
  receiptStore: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary },
  receiptMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 3 },
  receiptRight: { alignItems: 'flex-end' },
  receiptTotal: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary },
  receiptArrow: { fontSize: 20, color: COLORS.textMuted, marginTop: 2 },
});
