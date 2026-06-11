import React, { useContext, useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Image, Modal, KeyboardAvoidingView, Platform, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { I18nContext } from '../_layout';
import { useTheme } from '../../src/ThemeContext';
import { Typography, Spacing, Radius, Shadows } from '../../src/theme';
import { getStoreColor, getStoreInitial, formatPrice } from '../../src/constants';
import { getStoreLogo } from '../../src/storeLogos';
import { api } from '../../src/api';
type SortOption = 'price_asc' | 'price_desc' | 'store' | 'date';

interface ProductResult {
  description: string;
  store_name: string;
  last_price: number;
  last_unit_price: number;
  last_date: string;
  price_history?: Array<{
    price: number;
    unit_price: number;
    date: string;
    quantity: number;
    receipt_id: string;
  }>;
}

export default function CompareScreen() {
  const { t, lang } = useContext(I18nContext);
  const { theme, isDark } = useTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('price_asc');
  const [selectedProduct, setSelectedProduct] = useState<ProductResult | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [mode, setMode] = useState<'search' | 'favorites'>('search');
  const [favoriteNames, setFavoriteNames] = useState<Set<string>>(new Set());
  const [favoritesList, setFavoritesList] = useState<any[]>([]);
  const [favLoading, setFavLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      setFavLoading(true);
      const data = await api.getFavorites();
      const list = data.favorites || [];
      setFavoritesList(list);
      setFavoriteNames(new Set(list.map((f: any) => (f.name || '').toLowerCase().trim())));
    } catch (e) {
      console.log('Load favorites error:', e);
    } finally {
      setFavLoading(false);
    }
  };

  const togglingRef = useRef<Set<string>>(new Set());

  const toggleFavorite = async (name: string) => {
    const key = name.toLowerCase().trim();
    if (!key || togglingRef.current.has(key)) return;
    togglingRef.current.add(key);

    const wasFav = favoriteNames.has(key);
    setFavoriteNames((prev) => {
      const next = new Set(prev);
      if (wasFav) next.delete(key); else next.add(key);
      return next;
    });

    try {
      if (wasFav) {
        await api.removeFavorite(name);
      } else {
        await api.addFavorite(name);
      }
      await loadFavorites();
    } catch (e) {
      console.log('Toggle favorite error:', e);
      setFavoriteNames((prev) => {
        const next = new Set(prev);
        if (wasFav) next.add(key); else next.delete(key);
        return next;
      });
    } finally {
      togglingRef.current.delete(key);
    }
  };

  const openFavorite = (name: string) => {
    setMode('search');
    setQuery(name.toUpperCase());
    setSearched(true);
    setLoading(true);
    api.compareProducts(name)
      .then(setResults)
      .catch((e) => console.log('Compare error:', e))
      .finally(() => setLoading(false));
  };

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

  const handleClear = () => {
    setQuery('');
    setResults(null);
    setSearched(false);
  };

  const onRefresh = () => {
    if (query.trim().length >= 2) {
      setRefreshing(true);
      handleSearch().finally(() => setRefreshing(false));
    } else {
      // Reset if no query
      setResults(null);
      setSearched(false);
    }
  };

  // Flatten and sort products
  const allProducts: ProductResult[] = results 
    ? Object.entries(results.stores).flatMap(([store, products]: [string, any]) =>
        products.map((p: any) => ({ ...p, store_name: store }))
      )
    : [];

  const sortedProducts = [...allProducts].sort((a, b) => {
    switch (sortBy) {
      case 'price_asc': return a.last_price - b.last_price;
      case 'price_desc': return b.last_price - a.last_price;
      case 'store': return a.store_name.localeCompare(b.store_name);
      case 'date': return (b.last_date || '').localeCompare(a.last_date || '');
      default: return 0;
    }
  });

  const cheapest = allProducts.length > 0 
    ? allProducts.reduce((min, p) => p.last_price < min.last_price ? p : min, allProducts[0])
    : null;
  const mostExpensive = allProducts.length > 0 
    ? allProducts.reduce((max, p) => p.last_price > max.last_price ? p : max, allProducts[0])
    : null;

  const priceDifference = cheapest && mostExpensive 
    ? mostExpensive.last_price - cheapest.last_price 
    : 0;
  const savingsPercent = mostExpensive && mostExpensive.last_price > 0
    ? ((priceDifference / mostExpensive.last_price) * 100).toFixed(0)
    : 0;

  // Group by unique products
  const uniqueProducts = new Map<string, ProductResult[]>();
  allProducts.forEach(p => {
    const key = p.description.toLowerCase().trim();
    if (!uniqueProducts.has(key)) {
      uniqueProducts.set(key, []);
    }
    uniqueProducts.get(key)!.push(p);
  });

  const showPriceHistory = (product: ProductResult) => {
    setSelectedProduct(product);
    setShowHistoryModal(true);
  };

  const styles = createStyles(theme, isDark);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <ScrollView 
          contentContainerStyle={styles.scroll} 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.primary}
              colors={[theme.primary]}
            />
          }
        >
          <Text style={styles.title}>{t('compare_prices')}</Text>
          <Text style={styles.subtitle}>
            {lang === 'el' ? 'Βρείτε τις καλύτερες τιμές για τα προϊόντα σας' : 'Find the best prices for your products'}
          </Text>

          {/* Mode Toggle: Search / Favorites */}
          <View style={styles.modeRow}>
            <TouchableOpacity
              style={[styles.modeChip, mode === 'search' && styles.modeChipActive]}
              onPress={() => setMode('search')}
              activeOpacity={0.8}
            >
              <Ionicons name="search" size={16} color={mode === 'search' ? theme.textInverse : theme.textSecondary} />
              <Text style={[styles.modeChipText, mode === 'search' && styles.modeChipTextActive]}>
                {lang === 'el' ? 'Αναζήτηση' : 'Search'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeChip, mode === 'favorites' && styles.modeChipActive]}
              onPress={() => setMode('favorites')}
              activeOpacity={0.8}
            >
              <Ionicons name="heart" size={16} color={mode === 'favorites' ? theme.textInverse : theme.error} />
              <Text style={[styles.modeChipText, mode === 'favorites' && styles.modeChipTextActive]}>
                {lang === 'el' ? 'Αγαπημένα' : 'Favorites'}{favoritesList.length > 0 ? ` (${favoritesList.length})` : ''}
              </Text>
            </TouchableOpacity>
          </View>

          {mode === 'search' && (
          <>
          {/* Search Bar */}
          <View style={styles.searchRow}>
            <View style={styles.searchInputWrap}>
              <Ionicons name="search" size={20} color={theme.textMuted} style={styles.searchIcon} />
              <TextInput
                testID="compare-search-input"
                style={styles.searchInput}
                placeholder={lang === 'el' ? 'Αναζήτηση προϊόντος...' : 'Search product...'}
                placeholderTextColor={theme.textMuted}
                value={query}
                onChangeText={(text) => setQuery(text.toUpperCase())}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
                autoCapitalize="characters"
              />
              {query.length > 0 && (
                <TouchableOpacity onPress={handleClear} style={styles.clearBtn}>
                  <Ionicons name="close-circle" size={20} color={theme.textMuted} />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              testID="compare-search-btn"
              style={styles.searchBtn}
              onPress={handleSearch}
              activeOpacity={0.8}
            >
              <Ionicons name="search" size={22} color={theme.textInverse} />
            </TouchableOpacity>
          </View>

          {/* Loading */}
          {loading && (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={styles.loadingText}>
                {lang === 'el' ? 'Αναζήτηση τιμών...' : 'Searching prices...'}
              </Text>
            </View>
          )}

          {/* No Results */}
          {!loading && searched && allProducts.length === 0 && (
            <View style={styles.empty}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="search-outline" size={48} color={theme.primary} />
              </View>
              <Text style={styles.emptyTitle}>{t('no_results')}</Text>
              <Text style={styles.emptyDesc}>
                {lang === 'el' ? 'Δοκιμάστε διαφορετική αναζήτηση' : 'Try a different search'}
              </Text>
            </View>
          )}

          {/* Results */}
          {!loading && sortedProducts.length > 0 && (
            <>
              {/* Summary Cards */}
              {cheapest && mostExpensive && priceDifference > 0.01 && (
                <View style={styles.summarySection}>
                  <View style={styles.summaryRow}>
                    <View style={[styles.summaryCard, { backgroundColor: theme.successLight }]}>
                      <Ionicons name="trending-down" size={20} color={theme.success} />
                      <Text style={styles.summaryLabel}>{lang === 'el' ? 'Φθηνότερο' : 'Cheapest'}</Text>
                      <Text style={styles.summaryStore} numberOfLines={1}>{cheapest.store_name}</Text>
                      <Text style={[styles.summaryPrice, { color: theme.success }]}>
                        {formatPrice(cheapest.last_price)}
                      </Text>
                    </View>
                    <View style={[styles.summaryCard, { backgroundColor: theme.errorLight }]}>
                      <Ionicons name="trending-up" size={20} color={theme.error} />
                      <Text style={styles.summaryLabel}>{lang === 'el' ? 'Ακριβότερο' : 'Most Expensive'}</Text>
                      <Text style={styles.summaryStore} numberOfLines={1}>{mostExpensive.store_name}</Text>
                      <Text style={[styles.summaryPrice, { color: theme.error }]}>
                        {formatPrice(mostExpensive.last_price)}
                      </Text>
                    </View>
                  </View>
                  
                  {/* Savings Banner */}
                  <View style={styles.savingsBanner}>
                    <Ionicons name="wallet-outline" size={20} color={theme.primary} />
                    <Text style={styles.savingsText}>
                      {lang === 'el' 
                        ? `Εξοικονόμηση έως ${formatPrice(priceDifference)} (${savingsPercent}%)`
                        : `Save up to ${formatPrice(priceDifference)} (${savingsPercent}%)`
                      }
                    </Text>
                  </View>
                </View>
              )}

              {/* Sort Options */}
              <View style={styles.sortRow}>
                <Text style={styles.resultsCount}>
                  {sortedProducts.length} {lang === 'el' ? 'αποτελέσματα' : 'results'}
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.sortOptions}>
                    {[
                      { key: 'price_asc', label: lang === 'el' ? 'Τιμή ↑' : 'Price ↑', icon: 'arrow-up' },
                      { key: 'price_desc', label: lang === 'el' ? 'Τιμή ↓' : 'Price ↓', icon: 'arrow-down' },
                      { key: 'store', label: lang === 'el' ? 'Κατάστημα' : 'Store', icon: 'storefront-outline' },
                      { key: 'date', label: lang === 'el' ? 'Ημερομηνία' : 'Date', icon: 'calendar-outline' },
                    ].map(option => (
                      <TouchableOpacity
                        key={option.key}
                        style={[styles.sortChip, sortBy === option.key && styles.sortChipActive]}
                        onPress={() => setSortBy(option.key as SortOption)}
                      >
                        <Text style={[styles.sortChipText, sortBy === option.key && styles.sortChipTextActive]}>
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              {/* Product List */}
              {sortedProducts.map((product, i) => {
                const isCheapest = product === cheapest && sortedProducts.length > 1;
                const logoUrl = getStoreLogo(product.store_name);
                const hasHistory = product.price_history && product.price_history.length > 1;

                return (
                  <View
                    key={i}
                    style={[styles.productCard, isCheapest && styles.productCardCheapest]}
                  >
                    <View style={styles.productHeader}>
                      <TouchableOpacity
                        style={styles.productMain}
                        onPress={() => hasHistory ? showPriceHistory(product) : null}
                        activeOpacity={hasHistory ? 0.7 : 1}
                      >
                        {logoUrl ? (
                          <Image source={{ uri: logoUrl }} style={styles.storeLogo} resizeMode="contain" />
                        ) : (
                          <View style={[styles.storeIcon, { backgroundColor: getStoreColor(product.store_name) }]}>
                            <Text style={styles.storeIconText}>{getStoreInitial(product.store_name)}</Text>
                          </View>
                        )}
                        <View style={styles.productInfo}>
                          <Text style={styles.productName} numberOfLines={2}>{product.description}</Text>
                          <Text style={styles.productStore}>{product.store_name}</Text>
                          {product.last_date && (
                            <Text style={styles.productDate}>
                              <Ionicons name="calendar-outline" size={10} color={theme.textMuted} /> {product.last_date}
                            </Text>
                          )}
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.heartBtn}
                        onPress={() => toggleFavorite(product.description)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons
                          name={favoriteNames.has(product.description.toLowerCase().trim()) ? 'heart' : 'heart-outline'}
                          size={22}
                          color={favoriteNames.has(product.description.toLowerCase().trim()) ? theme.error : theme.textMuted}
                        />
                      </TouchableOpacity>
                      <View style={styles.productPriceWrap}>
                        <Text style={[styles.productPrice, isCheapest && { color: theme.success }]}>
                          {formatPrice(product.last_price)}
                        </Text>
                        {isCheapest && (
                          <View style={styles.cheapBadge}>
                            <Ionicons name="checkmark-circle" size={12} color={theme.success} />
                            <Text style={styles.cheapBadgeText}>
                              {lang === 'el' ? 'Φθηνότερο' : 'Cheapest'}
                            </Text>
                          </View>
                        )}
                        {hasHistory && (
                          <View style={styles.historyBadge}>
                            <Ionicons name="time-outline" size={12} color={theme.accent} />
                            <Text style={styles.historyBadgeText}>
                              {product.price_history!.length} {lang === 'el' ? 'αγορές' : 'purchases'}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })}
            </>
          )}

          {/* Initial State */}
          {!searched && (
            <View style={styles.empty}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="pricetags-outline" size={48} color={theme.primary} />
              </View>
              <Text style={styles.emptyTitle}>
                {lang === 'el' ? 'Σύγκριση Τιμών' : 'Price Comparison'}
              </Text>
              <Text style={styles.emptyDesc}>
                {lang === 'el' 
                  ? 'Αναζητήστε ένα προϊόν για να δείτε τις τιμές σε διαφορετικά καταστήματα'
                  : 'Search for a product to see prices across different stores'
                }
              </Text>
              
              {/* Quick Search Suggestions */}
              <View style={styles.suggestions}>
                <Text style={styles.suggestionsTitle}>
                  {lang === 'el' ? 'Δοκιμάστε:' : 'Try:'}
                </Text>
                <View style={styles.suggestionChips}>
                  {['Γάλα', 'Ψωμί', 'Αυγά', 'Τυρί'].map(suggestion => (
                    <TouchableOpacity
                      key={suggestion}
                      style={styles.suggestionChip}
                      onPress={() => {
                        setQuery(suggestion);
                        handleSearch();
                      }}
                    >
                      <Text style={styles.suggestionChipText}>{suggestion}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          )}
          </>
          )}

          {mode === 'favorites' && (
            <>
              {favLoading && (
                <View style={styles.center}>
                  <ActivityIndicator size="large" color={theme.primary} />
                </View>
              )}

              {!favLoading && favoritesList.length === 0 && (
                <View style={styles.empty}>
                  <View style={styles.emptyIconWrap}>
                    <Ionicons name="heart-outline" size={48} color={theme.error} />
                  </View>
                  <Text style={styles.emptyTitle}>
                    {lang === 'el' ? 'Δεν έχετε αγαπημένα' : 'No favorites yet'}
                  </Text>
                  <Text style={styles.emptyDesc}>
                    {lang === 'el'
                      ? 'Πατήστε την καρδιά ♥ σε ένα προϊόν στην Αναζήτηση για να το προσθέσετε εδώ'
                      : 'Tap the heart ♥ on a product in Search to add it here'}
                  </Text>
                </View>
              )}

              {!favLoading && favoritesList.length > 0 && (
                <Text style={styles.resultsCount}>
                  {favoritesList.length} {lang === 'el' ? 'αγαπημένα' : 'favorites'}
                </Text>
              )}

              {!favLoading && favoritesList.map((fav, i) => (
                <View key={i} style={styles.productCard}>
                  <View style={styles.productHeader}>
                    <TouchableOpacity
                      style={styles.productMain}
                      onPress={() => openFavorite(fav.name)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.storeIcon, { backgroundColor: theme.primaryLight }]}>
                        <Ionicons name="heart" size={18} color={theme.error} />
                      </View>
                      <View style={styles.productInfo}>
                        <Text style={styles.productName} numberOfLines={2}>{fav.name}</Text>
                        {fav.best_store ? (
                          <Text style={styles.productStore}>
                            {(lang === 'el' ? 'Φθηνότερα: ' : 'Cheapest: ') + fav.best_store}
                          </Text>
                        ) : (
                          <Text style={styles.productStore}>
                            {lang === 'el' ? 'Χωρίς τιμές ακόμη' : 'No prices yet'}
                          </Text>
                        )}
                        {!!fav.last_date && (
                          <Text style={styles.productDate}>
                            <Ionicons name="calendar-outline" size={10} color={theme.textMuted} /> {fav.last_date}
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                    <View style={styles.productPriceWrap}>
                      {fav.best_price != null && (
                        <Text style={[styles.productPrice, { color: theme.success }]}>
                          {formatPrice(fav.best_price)}
                        </Text>
                      )}
                      <TouchableOpacity
                        onPress={() => toggleFavorite(fav.name)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={{ marginTop: 6 }}
                      >
                        <Ionicons name="heart" size={20} color={theme.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Price History Modal */}
      <Modal
        visible={showHistoryModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowHistoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {lang === 'el' ? 'Ιστορικό Τιμών' : 'Price History'}
              </Text>
              <TouchableOpacity onPress={() => setShowHistoryModal(false)} style={styles.modalClose}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            
            {selectedProduct && (
              <>
                <Text style={styles.modalProductName} numberOfLines={2}>
                  {selectedProduct.description}
                </Text>
                <Text style={styles.modalProductStore}>
                  {selectedProduct.store_name}
                </Text>
                
                <ScrollView style={styles.historyList}>
                  {selectedProduct.price_history?.map((entry, i) => (
                    <TouchableOpacity
                        key={i}
                        style={styles.historyItem}
                        activeOpacity={entry.receipt_id ? 0.7 : 1}
                        onPress={() => {
                          if (entry.receipt_id) {
                            setShowHistoryModal(false);
                            router.push(`/receipt/${entry.receipt_id}`);
                          }
                        }}
                      >
                        <View style={styles.historyDate}>
                          <Ionicons name="calendar-outline" size={14} color={theme.textSecondary} />
                          <Text style={styles.historyDateText}>{entry.date}</Text>
                        </View>
                        <View style={styles.historyDetails}>
                          <Text style={styles.historyQty}>
                            x{entry.quantity.toFixed(entry.quantity < 1 ? 3 : 0)}
                          </Text>
                          <Text style={styles.historyPrice}>{formatPrice(entry.price)}</Text>
                          {!!entry.receipt_id && (
                            <Ionicons name="chevron-forward" size={14} color={theme.textMuted} style={{ marginLeft: 4 }} />
                          )}
                        </View>
                      </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>
      
    </SafeAreaView>
  );
}

const createStyles = (theme: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  scroll: { padding: Spacing.base, paddingBottom: 160 },
  adContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  title: { 
    fontSize: Typography['2xl'], 
    fontWeight: Typography.extrabold, 
    color: theme.text, 
    letterSpacing: -0.5 
  },
  subtitle: {
    fontSize: Typography.sm,
    color: theme.textSecondary,
    marginTop: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  
  // Search
  searchRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  searchInputWrap: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center',
    backgroundColor: theme.surface, 
    borderRadius: Radius.lg, 
    borderWidth: 1, 
    borderColor: theme.border,
    paddingHorizontal: Spacing.md,
  },
  searchIcon: { marginRight: Spacing.sm },
  searchInput: { 
    flex: 1, 
    paddingVertical: Spacing.md, 
    fontSize: Typography.base, 
    color: theme.text 
  },
  clearBtn: { padding: Spacing.xs },
  searchBtn: { 
    backgroundColor: theme.primary, 
    borderRadius: Radius.lg, 
    width: 52, 
    alignItems: 'center', 
    justifyContent: 'center',
    ...Shadows.sm,
  },

  // Mode toggle
  modeRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  modeChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
  },
  modeChipActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  modeChipText: { fontSize: Typography.sm, fontWeight: Typography.semibold, color: theme.textSecondary },
  modeChipTextActive: { color: theme.textInverse },
  heartBtn: { paddingHorizontal: Spacing.sm, justifyContent: 'center', alignItems: 'center' },
  
  // Loading & Empty
  center: { paddingVertical: Spacing['3xl'], alignItems: 'center' },
  loadingText: { 
    fontSize: Typography.sm, 
    color: theme.textSecondary, 
    marginTop: Spacing.md 
  },
  empty: { alignItems: 'center', paddingVertical: Spacing['3xl'] },
  emptyIconWrap: {
    width: 100,
    height: 100,
    borderRadius: Radius.full,
    backgroundColor: theme.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  emptyTitle: { 
    fontSize: Typography.xl, 
    fontWeight: Typography.bold, 
    color: theme.text,
    marginBottom: Spacing.xs,
  },
  emptyDesc: { 
    fontSize: Typography.sm, 
    color: theme.textSecondary, 
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
    lineHeight: Typography.sm * 1.5,
  },
  
  // Suggestions
  suggestions: { marginTop: Spacing.xl, alignItems: 'center' },
  suggestionsTitle: { 
    fontSize: Typography.sm, 
    color: theme.textMuted, 
    marginBottom: Spacing.sm 
  },
  suggestionChips: { flexDirection: 'row', gap: Spacing.sm },
  suggestionChip: {
    backgroundColor: theme.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: theme.border,
  },
  suggestionChipText: { 
    fontSize: Typography.sm, 
    color: theme.primary, 
    fontWeight: Typography.medium 
  },
  
  // Summary
  summarySection: { marginBottom: Spacing.lg },
  summaryRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.md },
  summaryCard: { 
    flex: 1, 
    padding: Spacing.md, 
    borderRadius: Radius.xl, 
    alignItems: 'center',
    ...Shadows.sm,
  },
  summaryLabel: { 
    fontSize: Typography.xs, 
    fontWeight: Typography.semibold, 
    color: theme.textSecondary, 
    textTransform: 'uppercase', 
    letterSpacing: 0.5,
    marginTop: Spacing.xs,
  },
  summaryStore: { 
    fontSize: Typography.sm, 
    fontWeight: Typography.bold, 
    color: theme.text, 
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  summaryPrice: { 
    fontSize: Typography.xl, 
    fontWeight: Typography.extrabold, 
    marginTop: Spacing.xs 
  },
  savingsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.primaryLight,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.lg,
    gap: Spacing.sm,
  },
  savingsText: {
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
    color: theme.primary,
  },
  
  // Sort
  sortRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  resultsCount: { 
    fontSize: Typography.sm, 
    color: theme.textSecondary, 
    fontWeight: Typography.medium 
  },
  sortOptions: { flexDirection: 'row', gap: Spacing.sm },
  sortChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
  },
  sortChipActive: { 
    backgroundColor: theme.primary, 
    borderColor: theme.primary 
  },
  sortChipText: { 
    fontSize: Typography.xs, 
    fontWeight: Typography.medium, 
    color: theme.textSecondary 
  },
  sortChipTextActive: { color: theme.textInverse },
  
  // Product Card
  productCard: { 
    backgroundColor: theme.card, 
    borderRadius: Radius.xl, 
    padding: Spacing.md, 
    marginBottom: Spacing.sm, 
    borderWidth: 1, 
    borderColor: theme.cardBorder,
    ...Shadows.sm,
  },
  productCardCheapest: { 
    borderColor: theme.success, 
    borderWidth: 2 
  },
  productHeader: { flexDirection: 'row', alignItems: 'center' },
  productMain: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  storeIcon: { 
    width: 44, 
    height: 44, 
    borderRadius: Radius.md, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  storeIconText: { color: '#FFF', fontSize: Typography.sm, fontWeight: Typography.bold },
  storeLogo: { width: 44, height: 44, borderRadius: Radius.md },
  productInfo: { flex: 1, marginLeft: Spacing.md },
  productName: { 
    fontSize: Typography.sm, 
    fontWeight: Typography.semibold, 
    color: theme.text,
    lineHeight: Typography.sm * 1.4,
  },
  productStore: { 
    fontSize: Typography.xs, 
    color: theme.textSecondary, 
    marginTop: 2 
  },
  productDate: { 
    fontSize: 10, 
    color: theme.textMuted, 
    marginTop: 4 
  },
  productPriceWrap: { alignItems: 'flex-end' },
  productPrice: { 
    fontSize: Typography.lg, 
    fontWeight: Typography.extrabold, 
    color: theme.text 
  },
  cheapBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 3, 
    marginTop: 4 
  },
  cheapBadgeText: { 
    fontSize: 10, 
    color: theme.success, 
    fontWeight: Typography.semibold 
  },
  historyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
  },
  historyBadgeText: {
    fontSize: 10,
    color: theme.accent,
    fontWeight: Typography.medium,
  },
  
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.lg,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  modalTitle: {
    fontSize: Typography.lg,
    fontWeight: Typography.bold,
    color: theme.text,
  },
  modalClose: {
    padding: Spacing.xs,
  },
  modalProductName: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: theme.text,
  },
  modalProductStore: {
    fontSize: Typography.sm,
    color: theme.textSecondary,
    marginBottom: Spacing.md,
  },
  historyList: {
    maxHeight: 300,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.borderLight,
  },
  historyDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  historyDateText: {
    fontSize: Typography.sm,
    color: theme.textSecondary,
  },
  historyDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  historyQty: {
    fontSize: Typography.sm,
    color: theme.textMuted,
  },
  historyPrice: {
    fontSize: Typography.base,
    fontWeight: Typography.bold,
    color: theme.text,
  },
});
