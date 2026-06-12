import React, { useContext, useEffect, useState, useCallback } from 'react';
  import {
      View,
      Text,
      StyleSheet,
      FlatList,
      ActivityIndicator,
      TouchableOpacity,
      Modal,
      ScrollView,
      Alert,
      TextInput,
  } from 'react-native';
  import { useLocalSearchParams, useRouter } from 'expo-router';
  import { Ionicons } from '@expo/vector-icons';
  import { useTheme } from '../src/ThemeContext';
  import { Typography, Spacing, Radius } from '../src/theme';
  import { formatPrice } from '../src/constants';
  import { api } from '../src/api';
  import { CATEGORIES } from '../src/categories';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { I18nContext } from './_layout';
  
  interface Product {
      name: string;
      total: number;
      count: number;
  }

  interface CustomCategory {
      name: string;
      subcategories: string[];
  }

  export default function CategoryProductsScreen() {
      const { category, subcategory, month } = useLocalSearchParams<{
        category: string;
        subcategory?: string;
        month?: string;
      }>();
      const router = useRouter();
      const { t } = useContext(I18nContext);
      const { theme, isDark } = useTheme();
      const insets = useSafeAreaInsets();
      const styles = createStyles(theme, isDark);

      const [products, setProducts] = useState<Product[]>([]);
      const [total, setTotal] = useState(0);
      const [loading, setLoading] = useState(true);
      const [error, setError] = useState<string | null>(null);

      const [overrideProduct, setOverrideProduct] = useState<Product | null>(null);
      const [overrideLoading, setOverrideLoading] = useState(false);
      const [expandedCat, setExpandedCat] = useState<string | null>(null);

      // Custom categories
      const [customCategories, setCustomCategories] = useState<CustomCategory[]>([]);
      const [showAddCatModal, setShowAddCatModal] = useState(false);
      const [newCatName, setNewCatName] = useState('');
      const [newCatSubs, setNewCatSubs] = useState<string[]>([]);
      const [newSubInput, setNewSubInput] = useState('');
      const [savingCat, setSavingCat] = useState(false);

        // Bulk selection
        const [selectionMode, setSelectionMode] = useState(false);
        const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());

        const toggleSelection = (name: string) => {
          setSelectedProducts(prev => {
            const next = new Set(prev);
            if (next.has(name)) next.delete(name); else next.add(name);
            return next;
          });
        };

        const exitSelectionMode = () => {
          setSelectionMode(false);
          setSelectedProducts(new Set());
        };
  

      const load = useCallback(async () => {
        if (!category) return;
        setLoading(true);
        setError(null);
        try {
          const res = await api.getCategoryProducts(
            category,
            subcategory || undefined,
            month || undefined,
          );
          setProducts(res.products || []);
          setTotal(res.total || 0);
        } catch (e: any) {
          setError(e.message || t('loading_error'));
        } finally {
          setLoading(false);
        }
      }, [category, subcategory, month]);

      const loadCustomCategories = useCallback(async () => {
        try {
          const res = await api.getCustomCategories();
          setCustomCategories(res.categories || []);
        } catch {}
      }, []);

      useEffect(() => { load(); }, [load]);
      useEffect(() => { loadCustomCategories(); }, [loadCustomCategories]);

      const handleOverride = async (newCategory: string, newSubcategory: string) => {
        if (!overrideProduct && selectedProducts.size === 0) return;
        setOverrideLoading(true);
        try {
          if (selectionMode && selectedProducts.size > 0) {
            await Promise.all(
              Array.from(selectedProducts).map(name => api.setOverride(name, newCategory, newSubcategory))
            );
            Alert.alert(t('saved_check'), t('bulk_moved').replace('{count}', String(selectedProducts.size)).replace('{target}', newSubcategory || newCategory));
            exitSelectionMode();
          } else if (overrideProduct) {
            await api.setOverride(overrideProduct.name, newCategory, newSubcategory);
            Alert.alert(t('saved_check'), t('single_moved').replace('{name}', overrideProduct.name).replace('{target}', newSubcategory || newCategory));
          }
          setOverrideProduct(null);
          load();
        } catch (e: any) {
          Alert.alert(t('error'), e.message);
        } finally {
          setOverrideLoading(false);
        }
      };

      const handleAddCustomCategory = async () => {
        const name = newCatName.trim();
        if (!name) {
          Alert.alert(t('error'), t('enter_category_name'));
          return;
        }
        setSavingCat(true);
        try {
          await api.addCustomCategory(name, newCatSubs);
          await loadCustomCategories();
          setShowAddCatModal(false);
          setNewCatName('');
          setNewCatSubs([]);
          setNewSubInput('');
        } catch (e: any) {
          Alert.alert(t('error'), e.message);
        } finally {
          setSavingCat(false);
        }
      };

      const handleAddSubInput = () => {
        const sub = newSubInput.trim();
        if (sub && !newCatSubs.includes(sub)) {
          setNewCatSubs(prev => [...prev, sub]);
          setNewSubInput('');
        }
      };

      const headerTitle = subcategory || category || t('products_label');
      const subTitle = subcategory ? category : undefined;

      return (
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={t('back')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="chevron-back" size={22} color={theme.primary} />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle} numberOfLines={1}>{headerTitle}</Text>
              {subTitle && <Text style={styles.headerSub} numberOfLines={1}>{subTitle}</Text>}
            </View>
            <TouchableOpacity
              style={styles.selectBtn}
              onPress={() => selectionMode ? exitSelectionMode() : setSelectionMode(true)}
              accessibilityRole="button"
              accessibilityLabel={selectionMode ? t('cancel') : t('select')}
            >
              <Text style={[styles.selectBtnText, selectionMode && styles.selectBtnCancel]}>
                {selectionMode ? t('cancel') : t('select')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Summary bar */}
          {!loading && !error && (
            <View style={styles.summaryBar}>
              <Text style={styles.summaryLabel}>
                {products.length} {products.length === 1 ? t('product_singular') : t('products')}
              </Text>
              <Text style={styles.summaryTotal}>{formatPrice(total)}</Text>
            </View>
          )}

          {/* Hint */}
          {!loading && products.length > 0 && (
            <View style={styles.hintBar}>
              <Ionicons name="information-circle-outline" size={14} color={theme.textMuted} />
              <Text style={styles.hintText}>{selectionMode ? t('tap_to_select') : t('long_press_to_select')}</Text>
            </View>
          )}

          {/* Content */}
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={theme.primary} />
            </View>
          ) : error ? (
            <View style={styles.center}>
              <Ionicons name="alert-circle-outline" size={40} color={theme.textMuted} />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={load} style={styles.retryBtn} accessibilityRole="button" accessibilityLabel={t('retry')}>
                <Text style={styles.retryText}>{t('retry')}</Text>
              </TouchableOpacity>
            </View>
          ) : products.length === 0 ? (
            <View style={styles.center}>
              <Ionicons name="cube-outline" size={48} color={theme.textMuted} />
              <Text style={styles.emptyText}>{t('no_products_found')}</Text>
            </View>
          ) : (
            <FlatList
              data={products}
              keyExtractor={(_, i) => String(i)}
              contentContainerStyle={styles.list}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              renderItem={({ item, index }) => {
                const isSelected = selectedProducts.has(item.name);
                return (
                  <TouchableOpacity
                    style={[styles.row, selectionMode && isSelected && styles.rowSelected]}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={item.name}
                    accessibilityState={selectionMode ? { selected: isSelected } : undefined}
                    onPress={selectionMode ? () => toggleSelection(item.name) : undefined}
                    onLongPress={() => {
                      if (!selectionMode) {
                        setSelectionMode(true);
                        setSelectedProducts(new Set([item.name]));
                      }
                    }}
                  >
                    {selectionMode ? (
                      <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                        {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
                      </View>
                    ) : (
                      <View style={styles.rankBadge}>
                        <Text style={styles.rankText}>{index + 1}</Text>
                      </View>
                    )}
                    <View style={styles.rowCenter}>
                      <Text style={styles.rowName}>{item.name}</Text>
                      <Text style={styles.rowCount}>
                        {item.count} {item.count === 1 ? t('purchase_singular') : t('purchases_word')}
                      </Text>
                    </View>
                    <Text style={styles.rowTotal}>{formatPrice(item.total)}</Text>
                    {!selectionMode && (
                      <TouchableOpacity onPress={() => setOverrideProduct(item)} style={styles.editIconBtn} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('change_category')}>
                        <Ionicons name="create-outline" size={18} color={theme.textMuted} />
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          )}

          {/* Bulk action bar */}
            {selectionMode && (
              <View style={[styles.bulkBar, { paddingBottom: (insets.bottom || 0) + 6 }]}>
                <TouchableOpacity
                  style={styles.selectAllBtn}
                  onPress={() => {
                    if (selectedProducts.size === products.length) setSelectedProducts(new Set());
                    else setSelectedProducts(new Set(products.map(p => p.name)));
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={selectedProducts.size === products.length ? t('deselect_all') : t('select_all')}
                >
                  <Text style={styles.selectAllText}>
                    {selectedProducts.size === products.length ? t('deselect_all') : t('select_all')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.bulkChangeBtn, selectedProducts.size === 0 && styles.bulkChangeBtnDisabled]}
                  disabled={selectedProducts.size === 0}
                  onPress={() => setOverrideProduct({ name: '__bulk__', total: 0, count: 0 })}
                  accessibilityRole="button"
                  accessibilityLabel={t('change_category')}
                >
                  <Ionicons name="layers-outline" size={16} color="#fff" />
                  <Text style={styles.bulkChangeBtnText}>
                    {t('change_category')} ({selectedProducts.size})
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Override Modal */}
          <Modal
            visible={!!overrideProduct}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={() => setOverrideProduct(null)}
          >
            <View style={styles.modal}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle} numberOfLines={2}>
                  {t('change_category')}
                </Text>
                <Text style={styles.modalSub} numberOfLines={2}>
                  {overrideProduct?.name}
                </Text>
                <TouchableOpacity onPress={() => setOverrideProduct(null)} style={styles.modalClose} accessibilityRole="button" accessibilityLabel={t('close')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close" size={22} color={theme.textMuted} />
                </TouchableOpacity>
              </View>
              {overrideLoading ? (
                <View style={styles.center}>
                  <ActivityIndicator size="large" color={theme.primary} />
                </View>
              ) : (
                <ScrollView style={styles.modalScroll} contentContainerStyle={{ paddingBottom: 60 }}>
                  {/* Default categories */}
                  {Object.entries(CATEGORIES).map(([cat, subcats]) => (
                    <View key={cat}>
                      <TouchableOpacity
                        style={styles.catRow}
                        activeOpacity={0.7}
                        onPress={() => setExpandedCat(expandedCat === cat ? null : cat)}
                        accessibilityRole="button"
                        accessibilityLabel={cat}
                      >
                        <Text style={styles.catRowText}>{cat}</Text>
                        <Ionicons
                          name={expandedCat === cat ? 'chevron-up' : 'chevron-down'}
                          size={16}
                          color={theme.textMuted}
                        />
                      </TouchableOpacity>
                      {expandedCat === cat && subcats.map((sc) => (
                        <TouchableOpacity
                          key={sc}
                          style={styles.subcatRow}
                          activeOpacity={0.65}
                          onPress={() => handleOverride(cat, sc)}
                          accessibilityRole="button"
                          accessibilityLabel={sc}
                        >
                          <View style={styles.subcatDot} />
                          <Text style={styles.subcatText}>{sc}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ))}

                  {/* Custom categories section */}
                  {customCategories.length > 0 && (
                    <View style={styles.customSectionHeader}>
                      <Ionicons name="bookmark" size={13} color={theme.primary} />
                      <Text style={styles.customSectionTitle}>{t('custom_categories')}</Text>
                    </View>
                  )}
                  {customCategories.map((cat) => {
                    const key = `__custom__${cat.name}`;
                    return (
                      <View key={key}>
                        <TouchableOpacity
                          style={[styles.catRow, styles.catRowCustom]}
                          activeOpacity={0.7}
                          onPress={() =>
                            cat.subcategories.length === 0
                              ? handleOverride(cat.name, '')
                              : setExpandedCat(expandedCat === key ? null : key)
                          }
                          accessibilityRole="button"
                          accessibilityLabel={cat.name}
                        >
                          <Text style={[styles.catRowText, { color: theme.primary }]}>{cat.name}</Text>
                          {cat.subcategories.length > 0 && (
                            <Ionicons
                              name={expandedCat === key ? 'chevron-up' : 'chevron-down'}
                              size={16}
                              color={theme.primary}
                            />
                          )}
                        </TouchableOpacity>
                        {expandedCat === key && cat.subcategories.map((sc) => (
                          <TouchableOpacity
                            key={sc}
                            style={styles.subcatRow}
                            activeOpacity={0.65}
                            onPress={() => handleOverride(cat.name, sc)}
                            accessibilityRole="button"
                            accessibilityLabel={sc}
                          >
                            <View style={[styles.subcatDot, { backgroundColor: theme.primary }]} />
                            <Text style={styles.subcatText}>{sc}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    );
                  })}

                  {/* Add custom category button */}
                  <TouchableOpacity
                    style={styles.addCatBtn}
                    activeOpacity={0.75}
                    onPress={() => setShowAddCatModal(true)}
                    accessibilityRole="button"
                    accessibilityLabel={t('new_custom_category')}
                  >
                    <Ionicons name="add-circle-outline" size={18} color={theme.primary} />
                    <Text style={styles.addCatBtnText}>{t('new_custom_category')}</Text>
                  </TouchableOpacity>
                </ScrollView>
              )}
            </View>
          </Modal>

          {/* Add Custom Category Modal */}
          <Modal
            visible={showAddCatModal}
            animationType="fade"
            transparent
            onRequestClose={() => setShowAddCatModal(false)}
          >
            <View style={styles.addCatOverlay}>
              <View style={styles.addCatBox}>
                <Text style={styles.addCatTitle}>{t('new_category')}</Text>
                <TextInput
                  style={styles.addCatInput}
                  placeholder={t('category_name_placeholder')}
                  placeholderTextColor={theme.textMuted}
                  value={newCatName}
                  onChangeText={setNewCatName}
                  autoCapitalize="words"
                  autoFocus
                  accessibilityLabel={t('category_name_placeholder')}
                />

                <Text style={styles.addCatSubLabel}>{t('subcategories_optional')}</Text>
                <View style={styles.addSubRow}>
                  <TextInput
                    style={[styles.addCatInput, { flex: 1, marginBottom: 0 }]}
                    placeholder={t('subcategory_placeholder')}
                    placeholderTextColor={theme.textMuted}
                    value={newSubInput}
                    onChangeText={setNewSubInput}
                    onSubmitEditing={handleAddSubInput}
                    returnKeyType="done"
                    accessibilityLabel={t('subcategory_placeholder')}
                  />
                  <TouchableOpacity style={styles.addSubBtn} onPress={handleAddSubInput} accessibilityRole="button" accessibilityLabel={t('add_subcategory')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="add" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>

                {newCatSubs.length > 0 && (
                  <View style={styles.subTagsRow}>
                    {newCatSubs.map((s, i) => (
                      <TouchableOpacity
                        key={i}
                        style={styles.subTag}
                        onPress={() => setNewCatSubs(prev => prev.filter((_, j) => j !== i))}
                        accessibilityRole="button"
                        accessibilityLabel={s}
                      >
                        <Text style={styles.subTagText}>{s}</Text>
                        <Ionicons name="close" size={12} color={theme.primary} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <View style={styles.addCatActions}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => {
                      setShowAddCatModal(false);
                      setNewCatName('');
                      setNewCatSubs([]);
                      setNewSubInput('');
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={t('cancel')}
                  >
                    <Text style={styles.cancelBtnText}>{t('cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.saveBtn, savingCat && { opacity: 0.6 }]}
                    onPress={handleAddCustomCategory}
                    disabled={savingCat}
                    accessibilityRole="button"
                    accessibilityLabel={t('save_receipt')}
                  >
                    {savingCat ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.saveBtnText}>{t('save_receipt')}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </View>
      );
  }

  const createStyles = (theme: any, isDark: boolean) =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: theme.background },
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingTop: 56,
          paddingBottom: Spacing.md,
          paddingHorizontal: Spacing.base,
          backgroundColor: theme.card,
          borderBottomWidth: 1,
          borderBottomColor: isDark ? '#1E293B' : '#F1F5F9',
        },
        backBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 19 },
        headerCenter: { flex: 1, alignItems: 'center' },
        headerTitle: { fontSize: Typography.base, fontWeight: Typography.bold, color: theme.text },
        headerSub: { fontSize: Typography.xs, color: theme.textMuted, marginTop: 1 },
        summaryBar: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: Spacing.base,
          paddingVertical: Spacing.sm,
          backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
          borderBottomWidth: 1,
          borderBottomColor: isDark ? '#1E293B' : '#E2E8F0',
        },
        summaryLabel: { fontSize: Typography.sm, color: theme.textMuted },
        summaryTotal: { fontSize: Typography.sm, fontWeight: Typography.bold, color: theme.primary },
        hintBar: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          paddingHorizontal: Spacing.base,
          paddingVertical: 6,
          backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
        },
        hintText: { fontSize: 11, color: theme.textMuted },
        center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
        errorText: { fontSize: Typography.sm, color: theme.textMuted, textAlign: 'center' },
        emptyText: { fontSize: Typography.base, color: theme.textMuted },
        retryBtn: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, backgroundColor: theme.primary, borderRadius: Radius.full },
        retryText: { fontSize: Typography.sm, fontWeight: Typography.semibold, color: '#FFF' },
        list: { padding: Spacing.base },
        separator: { height: 1, backgroundColor: isDark ? '#1E293B' : '#F1F5F9', marginLeft: 56 },
        row: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, gap: Spacing.md },
        rankBadge: { width: 32, height: 32, borderRadius: 16, backgroundColor: isDark ? '#1E293B' : '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
        rankText: { fontSize: Typography.xs, fontWeight: Typography.bold, color: theme.textMuted },
        rowCenter: { flex: 1, gap: 2 },
        rowName: { fontSize: Typography.sm, fontWeight: Typography.medium, color: theme.text },
        rowCount: { fontSize: Typography.xs, color: theme.textMuted },
        rowTotal: { fontSize: Typography.base, fontWeight: Typography.bold, color: theme.text },
        modal: { flex: 1, backgroundColor: theme.background },
        modalHeader: {
          paddingTop: 20,
          paddingHorizontal: Spacing.base,
          paddingBottom: Spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: isDark ? '#1E293B' : '#E2E8F0',
        },
        modalTitle: { fontSize: Typography.lg, fontWeight: Typography.bold, color: theme.text },
        modalSub: { fontSize: Typography.sm, color: theme.primary, marginTop: 4 },
        modalClose: { position: 'absolute', top: 20, right: Spacing.base },
        modalScroll: { flex: 1 },
        catRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: Spacing.base,
          paddingVertical: Spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: isDark ? '#1E293B' : '#F1F5F9',
        },
        catRowCustom: {
          backgroundColor: isDark ? '#0C1A2E' : '#F0FDF9',
        },
        catRowText: { fontSize: Typography.sm, fontWeight: Typography.semibold, color: theme.text, flex: 1 },
        subcatRow: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingLeft: Spacing.xl,
          paddingRight: Spacing.base,
          paddingVertical: 12,
          backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
          borderBottomWidth: 1,
          borderBottomColor: isDark ? '#1E293B' : '#F1F5F9',
          gap: 10,
        },
        subcatDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.primary },
        subcatText: { fontSize: Typography.sm, color: theme.text },
        customSectionHeader: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingHorizontal: Spacing.base,
          paddingVertical: 10,
          backgroundColor: isDark ? '#0A1628' : '#ECFDF5',
          borderBottomWidth: 1,
          borderBottomColor: isDark ? '#1E3A5F' : '#A7F3D0',
        },
        customSectionTitle: { fontSize: Typography.xs, fontWeight: Typography.semibold, color: theme.primary, textTransform: 'uppercase', letterSpacing: 0.5 },
        addCatBtn: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: Spacing.base,
          paddingVertical: Spacing.md,
          marginTop: 4,
        },
        addCatBtnText: { fontSize: Typography.sm, color: theme.primary, fontWeight: Typography.medium },
        // Add category modal
        addCatOverlay: {
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.55)',
          alignItems: 'center',
          justifyContent: 'center',
          padding: Spacing.base,
        },
        addCatBox: {
          width: '100%',
          backgroundColor: theme.card,
          borderRadius: Radius.xl,
          padding: Spacing.lg,
          gap: Spacing.sm,
        },
        addCatTitle: { fontSize: Typography.lg, fontWeight: Typography.bold, color: theme.text, marginBottom: 4 },
        addCatInput: {
          borderWidth: 1,
          borderColor: isDark ? '#334155' : '#E2E8F0',
          borderRadius: Radius.md,
          paddingHorizontal: Spacing.md,
          paddingVertical: 10,
          fontSize: Typography.sm,
          color: theme.text,
          backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
          marginBottom: Spacing.sm,
        },
        addCatSubLabel: { fontSize: Typography.xs, color: theme.textMuted, marginBottom: 4 },
        addSubRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
        addSubBtn: {
          width: 38,
          height: 38,
          borderRadius: 19,
          backgroundColor: theme.primary,
          alignItems: 'center',
          justifyContent: 'center',
        },
        subTagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
        subTag: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          paddingHorizontal: 10,
          paddingVertical: 5,
          backgroundColor: isDark ? '#1E3A5F' : '#ECFDF5',
          borderRadius: Radius.full,
          borderWidth: 1,
          borderColor: isDark ? '#2D5A8E' : '#A7F3D0',
        },
        subTagText: { fontSize: Typography.xs, color: theme.primary, fontWeight: Typography.medium },
        addCatActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.sm, marginTop: Spacing.sm },
        cancelBtn: { paddingHorizontal: Spacing.lg, paddingVertical: 10, borderRadius: Radius.md },
        cancelBtnText: { fontSize: Typography.sm, color: theme.textMuted },
        saveBtn: { paddingHorizontal: Spacing.lg, paddingVertical: 10, backgroundColor: theme.primary, borderRadius: Radius.md, minWidth: 100, alignItems: 'center' },
        saveBtnText: { fontSize: Typography.sm, fontWeight: Typography.semibold, color: '#fff' },
        rowSelected: { backgroundColor: isDark ? '#0C1A2E' : '#EFF6FF' },
        checkbox: {
          width: 24, height: 24, borderRadius: 12,
          borderWidth: 2, borderColor: isDark ? '#334155' : '#CBD5E1',
          alignItems: 'center', justifyContent: 'center',
        },
        checkboxSelected: { backgroundColor: '#22C55E', borderColor: '#22C55E' },
        editIconBtn: { padding: 4 },
        selectBtn: {
          paddingHorizontal: 12, paddingVertical: 6,
          borderRadius: Radius.full,
          backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
        },
        selectBtnText: { fontSize: Typography.xs, fontWeight: Typography.semibold, color: theme.primary },
        selectBtnCancel: { color: '#EF4444' },
        bulkBar: {
          flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
          paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm,
          backgroundColor: theme.card,
          borderTopWidth: 1, borderTopColor: isDark ? '#1E293B' : '#E2E8F0',
        },
        selectAllBtn: {
          paddingHorizontal: Spacing.md, paddingVertical: 8,
          borderRadius: Radius.full, backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
        },
        selectAllText: { fontSize: Typography.xs, fontWeight: Typography.medium, color: theme.text },
        bulkChangeBtn: {
          flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
          gap: 6, paddingVertical: 10,
          borderRadius: Radius.full, backgroundColor: theme.primary,
        },
        bulkChangeBtnDisabled: { opacity: 0.45 },
        bulkChangeBtnText: { fontSize: Typography.sm, fontWeight: Typography.semibold, color: '#fff' },
      });
  