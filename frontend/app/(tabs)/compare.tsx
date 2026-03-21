import { useContext, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { I18nContext } from '../_layout';
import { COLORS, getStoreColor, getStoreInitial, formatPrice } from '../../src/constants';
import { api } from '../../src/api';

export default function CompareScreen() {
  const { t } = useContext(I18nContext);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!query.trim() || query.trim().length < 2) return;
    setLoading(true);
    setSearched(true);
    try {
      const data = await api.compareProducts(query.trim());
      setResults(data);
    } catch (e) {
      console.log('Compare error:', e);
    } finally {
      setLoading(false);
    }
  };

  const allProducts = results ? Object.entries(results.stores).flatMap(([store, products]: [string, any]) =>
    products.map((p: any) => ({ ...p, store_name: store }))
  ).sort((a: any, b: any) => a.last_price - b.last_price) : [];

  const cheapest = allProducts.length > 0 ? allProducts[0] : null;
  const mostExpensive = allProducts.length > 0 ? allProducts[allProducts.length - 1] : null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{t('compare_prices')}</Text>

        <View style={styles.searchRow}>
          <TextInput
            testID="compare-search-input"
            style={styles.searchInput}
            placeholder={t('search_products')}
            placeholderTextColor={COLORS.textMuted}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          <TouchableOpacity
            testID="compare-search-btn"
            style={styles.searchBtn}
            onPress={handleSearch}
            activeOpacity={0.8}
          >
            <Text style={styles.searchBtnText}>🔍</Text>
          </TouchableOpacity>
        </View>

        {loading && (
          <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
        )}

        {!loading && searched && allProducts.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyTitle}>{t('no_results')}</Text>
            <Text style={styles.emptyDesc}>{t('try_different')}</Text>
          </View>
        )}

        {!loading && allProducts.length > 0 && (
          <>
            {cheapest && mostExpensive && cheapest.store_name !== mostExpensive.store_name && (
              <View style={styles.summaryRow}>
                <View style={[styles.summaryCard, { backgroundColor: COLORS.successLight }]}>
                  <Text style={styles.summaryLabel}>{t('cheapest')}</Text>
                  <Text style={styles.summaryStore} numberOfLines={1}>{cheapest.store_name}</Text>
                  <Text style={[styles.summaryPrice, { color: COLORS.success }]}>{formatPrice(cheapest.last_price)}</Text>
                </View>
                <View style={[styles.summaryCard, { backgroundColor: COLORS.errorLight }]}>
                  <Text style={styles.summaryLabel}>{t('most_expensive')}</Text>
                  <Text style={styles.summaryStore} numberOfLines={1}>{mostExpensive.store_name}</Text>
                  <Text style={[styles.summaryPrice, { color: COLORS.error }]}>{formatPrice(mostExpensive.last_price)}</Text>
                </View>
              </View>
            )}

            <Text style={styles.sectionTitle}>
              {results.total_products} {t('products')} · {Object.keys(results.stores).length} {t('top_stores').toLowerCase()}
            </Text>

            {allProducts.map((product: any, i: number) => {
              const isCheapest = i === 0 && allProducts.length > 1;
              return (
                <View key={i} style={[styles.productCard, isCheapest && styles.productCardCheapest]}>
                  <View style={styles.productHeader}>
                    <View style={[styles.storeIcon, { backgroundColor: getStoreColor(product.store_name) }]}>
                      <Text style={styles.storeIconText}>{getStoreInitial(product.store_name)}</Text>
                    </View>
                    <View style={styles.productInfo}>
                      <Text style={styles.productName} numberOfLines={2}>{product.description}</Text>
                      <Text style={styles.productStore}>{product.store_name}</Text>
                    </View>
                    <View style={styles.productPriceWrap}>
                      <Text style={[styles.productPrice, isCheapest && { color: COLORS.success }]}>
                        {formatPrice(product.last_price)}
                      </Text>
                      {isCheapest && <Text style={styles.cheapBadge}>✓ {t('cheapest')}</Text>}
                    </View>
                  </View>
                  {product.last_date && (
                    <Text style={styles.productDate}>{t('date')}: {product.last_date}</Text>
                  )}
                </View>
              );
            })}
          </>
        )}

        {!searched && (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>⚖️</Text>
            <Text style={styles.emptyTitle}>{t('compare_prices')}</Text>
            <Text style={styles.emptyDesc}>{t('search_products')}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 20, letterSpacing: -0.5 },
  searchRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  searchInput: { flex: 1, backgroundColor: COLORS.surface, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: COLORS.textPrimary, borderWidth: 1, borderColor: COLORS.border },
  searchBtn: { backgroundColor: COLORS.primary, borderRadius: 14, width: 50, alignItems: 'center', justifyContent: 'center' },
  searchBtnText: { fontSize: 20 },
  center: { paddingVertical: 40, alignItems: 'center' },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  emptyDesc: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  summaryCard: { flex: 1, padding: 16, borderRadius: 18, alignItems: 'center' },
  summaryLabel: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryStore: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginTop: 4 },
  summaryPrice: { fontSize: 22, fontWeight: '800', marginTop: 4 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 12 },
  productCard: { backgroundColor: COLORS.surface, borderRadius: 18, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: COLORS.borderLight },
  productCardCheapest: { borderColor: COLORS.success, borderWidth: 2 },
  productHeader: { flexDirection: 'row', alignItems: 'center' },
  storeIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  storeIconText: { color: '#FFF', fontSize: 13, fontWeight: '800' },
  productInfo: { flex: 1, marginLeft: 12 },
  productName: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  productStore: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  productPriceWrap: { alignItems: 'flex-end' },
  productPrice: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  cheapBadge: { fontSize: 10, color: COLORS.success, fontWeight: '700', marginTop: 2 },
  productDate: { fontSize: 11, color: COLORS.textMuted, marginTop: 8 },
});
