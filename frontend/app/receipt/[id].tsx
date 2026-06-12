import React, { useContext, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Image, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { I18nContext } from '../_layout';
import { useTheme } from '../../src/ThemeContext';
import { Typography, Spacing, Radius, Shadows } from '../../src/theme';
import { getStoreColor, getStoreInitial, formatPrice } from '../../src/constants';
import { api } from '../../src/api';
import { getStoreLogo } from '../../src/storeLogos';
import PriceComparisonSheet from '../../src/components/PriceComparisonSheet';

export default function ReceiptDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useContext(I18nContext);
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const [receipt, setReceipt] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [compareItem, setCompareItem] = useState<{ description: string; price: number } | null>(null);
  const [favoriteNames, setFavoriteNames] = useState<Set<string>>(new Set());
  const togglingRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      try {
        const data = await api.getReceipt(id);
        setReceipt(data);
      } catch (e) {
        console.log('Receipt detail error:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      const data = await api.getFavorites();
      const list = data.favorites || [];
      setFavoriteNames(new Set(list.map((f: any) => (f.name || '').toLowerCase().trim())));
    } catch (e) {
      console.log('Load favorites error:', e);
    }
  };

  const toggleFavorite = async (name: string) => {
    const key = (name || '').toLowerCase().trim();
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

  const handleDelete = () => {
    Alert.alert(t('delete'), t('confirm_delete'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('yes'), style: 'destructive', onPress: async () => {
          try {
            await api.deleteReceipt(id);
            router.back();
          } catch (e: any) {
            Alert.alert(t('error'), e.message);
          }
        }
      },
    ]);
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    errorText: { fontSize: Typography.base, color: theme.error },
    
    // Top bar
    topBar: { 
      flexDirection: 'row', 
      alignItems: 'center', 
      justifyContent: 'space-between', 
      paddingHorizontal: Spacing.base, 
      paddingVertical: Spacing.md, 
      backgroundColor: theme.surface,
      borderBottomWidth: 1, 
      borderBottomColor: theme.borderLight 
    },
    backBtn: { 
      width: 40, 
      height: 40, 
      borderRadius: Radius.md, 
      backgroundColor: theme.background, 
      alignItems: 'center', 
      justifyContent: 'center' 
    },
    topTitle: { fontSize: Typography.lg, fontWeight: Typography.bold, color: theme.text },
    deleteBtn: { 
      width: 40, 
      height: 40, 
      borderRadius: Radius.md, 
      backgroundColor: theme.errorLight, 
      alignItems: 'center', 
      justifyContent: 'center' 
    },
    
    scroll: { padding: Spacing.base, paddingBottom: Spacing['3xl'] },
    
    // Store header
    storeHeader: { 
      flexDirection: 'row', 
      alignItems: 'center', 
      marginBottom: Spacing.base, 
      backgroundColor: theme.surface, 
      padding: Spacing.base, 
      borderRadius: Radius.xl, 
      borderWidth: 1, 
      borderColor: theme.cardBorder,
      ...Shadows.sm,
    },
    storeIcon: { width: 56, height: 56, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center' },
    storeIconText: { color: '#FFF', fontSize: Typography.lg, fontWeight: Typography.extrabold },
    storeLogo: { width: 56, height: 56, borderRadius: Radius.lg },
    storeInfo: { flex: 1, marginLeft: Spacing.md },
    storeName: { fontSize: Typography.lg, fontWeight: Typography.extrabold, color: theme.text },
    storeAddr: { fontSize: Typography.xs, color: theme.textSecondary, marginTop: 2 },
    storeVat: { fontSize: Typography.xs, color: theme.textMuted, marginTop: 1 },
    
    // Meta row
    metaRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.base },
    metaItem: { 
      flex: 1, 
      backgroundColor: theme.surface, 
      padding: Spacing.sm, 
      borderRadius: Radius.md, 
      borderWidth: 1, 
      borderColor: theme.cardBorder 
    },
    metaLabel: { 
      fontSize: 9, 
      fontWeight: Typography.semibold, 
      color: theme.textMuted, 
      textTransform: 'uppercase', 
      letterSpacing: 0.5 
    },
    metaValue: { fontSize: Typography.sm, fontWeight: Typography.semibold, color: theme.text, marginTop: 3 },
    
    // Items card
    itemsCard: { 
      backgroundColor: theme.surface, 
      borderRadius: Radius.xl, 
      padding: Spacing.md, 
      borderWidth: 1, 
      borderColor: theme.cardBorder, 
      marginBottom: Spacing.md,
      ...Shadows.sm,
    },
    itemsTitle: { 
      fontSize: Typography.xs, 
      fontWeight: Typography.bold, 
      color: theme.textSecondary, 
      marginBottom: Spacing.sm, 
      textTransform: 'uppercase', 
      letterSpacing: 0.5 
    },
    
    // Table
    tableHeader: { 
      flexDirection: 'row', 
      backgroundColor: theme.primaryLight, 
      paddingVertical: Spacing.sm, 
      paddingHorizontal: Spacing.xs, 
      borderRadius: Radius.sm, 
      marginBottom: 4 
    },
    tableHeaderText: { fontSize: 9, fontWeight: Typography.bold, color: theme.primary, textAlign: 'center' },
    tableRow: { 
      flexDirection: 'row', 
      paddingVertical: Spacing.sm, 
      paddingHorizontal: Spacing.xs, 
      borderBottomWidth: 1, 
      borderBottomColor: theme.borderLight, 
      alignItems: 'center' 
    },
    tableRowEven: { backgroundColor: isDark ? theme.surfaceElevated : '#F8FAFC' },
    tableRowOdd: { backgroundColor: theme.surface },
    tableCell: { fontSize: Typography.xs, color: theme.text, textAlign: 'center' },
    tableCellDesc: { fontSize: Typography.xs, fontWeight: Typography.medium, color: theme.text, lineHeight: 15 },
    tableCellUnit: { fontSize: 9, color: theme.textMuted, marginTop: 2 },
    tableCellTotal: { fontWeight: Typography.bold, color: theme.primary },
    colNo: { width: 24, textAlign: 'center' },
    colDesc: { flex: 1, paddingHorizontal: Spacing.xs },
    colQty: { width: 40, textAlign: 'center' },
    colPrice: { width: 50, textAlign: 'right' },
    colTotal: { width: 55, textAlign: 'right' },

    // Favorite (heart) button
    heartBtn: {
      width: 26,
      height: 26,
      borderRadius: Radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 2,
    },

    // Compare button
    compareBtn: {
      width: 28,
      height: 28,
      borderRadius: Radius.full,
      backgroundColor: theme.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 4,
    },
    
    // Totals card
    totalsCard: { 
      backgroundColor: theme.surface, 
      borderRadius: Radius.xl, 
      padding: Spacing.md, 
      borderWidth: 1, 
      borderColor: theme.cardBorder, 
      marginBottom: Spacing.md,
      ...Shadows.sm,
    },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
    totalLabel: { fontSize: Typography.sm, color: theme.textSecondary },
    totalValue: { fontSize: Typography.sm, fontWeight: Typography.semibold, color: theme.text },
    grandTotal: { borderTopWidth: 2, borderTopColor: theme.primary, marginTop: Spacing.sm, paddingTop: Spacing.sm },
    grandTotalLabel: { fontSize: Typography.base, fontWeight: Typography.extrabold, color: theme.text },
    grandTotalValue: { fontSize: Typography.xl, fontWeight: Typography.extrabold, color: theme.primary },
    
    // Source card
    sourceCard: { 
      backgroundColor: isDark ? theme.surfaceElevated : theme.borderLight, 
      borderRadius: Radius.md, 
      padding: Spacing.md 
    },
    sourceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    sourceLabel: { fontSize: Typography.xs, color: theme.textSecondary },
    sourceValue: { fontSize: Typography.xs, fontWeight: Typography.semibold, color: theme.textMuted },
    sourceLinkContainer: { marginTop: Spacing.sm, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: theme.surface },
    sourceLink: { fontSize: 10, color: theme.primary, marginTop: 2 },
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}><ActivityIndicator size="large" color={theme.primary} /></View>
      </SafeAreaView>
    );
  }

  if (!receipt) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}><Text style={styles.errorText}>{t('error')}</Text></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity
          testID="back-btn"
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel={t('back')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={24} color={theme.primary} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>{t('receipt_detail')}</Text>
        <TouchableOpacity
          testID="delete-receipt-btn"
          onPress={handleDelete}
          style={styles.deleteBtn}
          accessibilityRole="button"
          accessibilityLabel={t('delete')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="trash-outline" size={20} color={theme.error} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Store Header */}
        <View style={styles.storeHeader}>
          {getStoreLogo(receipt.store_name) ? (
            <Image 
              source={{ uri: getStoreLogo(receipt.store_name)! }} 
              style={styles.storeLogo}
              resizeMode="contain"
            />
          ) : (
            <View style={[styles.storeIcon, { backgroundColor: getStoreColor(receipt.store_name || '') }]}>
              <Text style={styles.storeIconText}>{getStoreInitial(receipt.store_name || '?')}</Text>
            </View>
          )}
          <View style={styles.storeInfo}>
            <Text style={styles.storeName}>{receipt.store_name}</Text>
            {receipt.store_address ? <Text style={styles.storeAddr}>{receipt.store_address}</Text> : null}
            {receipt.store_vat ? <Text style={styles.storeVat}>ΑΦΜ: {receipt.store_vat}</Text> : null}
          </View>
        </View>

        {/* Meta Row */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>{t('date')}</Text>
            <Text style={styles.metaValue}>{receipt.date}</Text>
          </View>
          {receipt.receipt_number ? (
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Αρ.</Text>
              <Text style={styles.metaValue} numberOfLines={1}>{receipt.receipt_number}</Text>
            </View>
          ) : null}
          {receipt.payment_method ? (
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>{t('payment_method')}</Text>
              <Text style={styles.metaValue}>{receipt.payment_method}</Text>
            </View>
          ) : null}
        </View>

        {/* Items Card */}
        <View style={styles.itemsCard}>
          <Text style={styles.itemsTitle}>{receipt.items?.length || 0} {t('items')}</Text>
          
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.colNo]}>#</Text>
            <Text style={[styles.tableHeaderText, styles.colDesc]}>{t('description')}</Text>
            <Text style={[styles.tableHeaderText, styles.colQty]}>{t('enter_quantity')}</Text>
            <Text style={[styles.tableHeaderText, styles.colPrice]}>{t('price')}</Text>
            <Text style={[styles.tableHeaderText, styles.colTotal]}>{t('total')}</Text>
          </View>
          
          {/* Table Rows */}
          {receipt.items?.map((item: any, i: number) => (
            <View key={i} style={[styles.tableRow, i % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd]}>
              <Text style={[styles.tableCell, styles.colNo]}>{i + 1}</Text>
              <View style={styles.colDesc}>
                <Text style={styles.tableCellDesc} numberOfLines={2}>{item.description}</Text>
                {item.unit && <Text style={styles.tableCellUnit}>{item.unit}</Text>}
              </View>
              <Text style={[styles.tableCell, styles.colQty]}>
                {typeof item.quantity === 'number' && item.quantity !== 1 
                  ? item.quantity.toFixed(item.quantity < 1 ? 3 : 0) 
                  : '1'}
              </Text>
              <Text style={[styles.tableCell, styles.colPrice]}>
                {item.unit_price > 0 ? formatPrice(item.unit_price) : '-'}
              </Text>
              <Text style={[styles.tableCell, styles.colTotal, styles.tableCellTotal]}>
                {formatPrice(item.total_value)}
              </Text>
              <TouchableOpacity
                style={styles.heartBtn}
                onPress={() => toggleFavorite(item.description)}
                accessibilityRole="button"
                accessibilityLabel={t('toggle_favorite')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={favoriteNames.has((item.description || '').toLowerCase().trim()) ? 'heart' : 'heart-outline'}
                  size={16}
                  color={favoriteNames.has((item.description || '').toLowerCase().trim()) ? theme.error : theme.textMuted}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.compareBtn}
                onPress={() => setCompareItem({ description: item.description, price: item.total_value })}
                accessibilityRole="button"
                accessibilityLabel={t('compare_prices')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="git-compare-outline" size={14} color={theme.primary} />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Totals Card */}
        <View style={styles.totalsCard}>
          {receipt.subtotal > 0 && receipt.subtotal !== receipt.total && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>{t('subtotal')}</Text>
              <Text style={styles.totalValue}>{formatPrice(receipt.subtotal)}</Text>
            </View>
          )}
          {receipt.discount_total > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>{t('discount')}</Text>
              <Text style={[styles.totalValue, { color: theme.success }]}>-{formatPrice(receipt.discount_total)}</Text>
            </View>
          )}
          {receipt.net_total > 0 && receipt.net_total !== receipt.total && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>{t('net_total')}</Text>
              <Text style={styles.totalValue}>{formatPrice(receipt.net_total)}</Text>
            </View>
          )}
          {receipt.vat_total > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>{t('vat')}</Text>
              <Text style={styles.totalValue}>{formatPrice(receipt.vat_total)}</Text>
            </View>
          )}
          <View style={[styles.totalRow, styles.grandTotal]}>
            <Text style={styles.grandTotalLabel}>{t('total')}</Text>
            <Text style={styles.grandTotalValue}>{formatPrice(receipt.total)}</Text>
          </View>
        </View>

        {/* Source Card */}
        <View style={styles.sourceCard}>
          <View style={styles.sourceRow}>
            <Text style={styles.sourceLabel}>{t('source')}:</Text>
            <Text style={styles.sourceValue}>{receipt.provider}</Text>
          </View>
          <View style={styles.sourceRow}>
            <Text style={styles.sourceLabel}>{t('type')}:</Text>
            <Text style={styles.sourceValue}>{receipt.source_type}</Text>
          </View>
          {receipt.source_url ? (
            <View style={styles.sourceLinkContainer}>
              <Text style={styles.sourceLabel}>{t('link')}:</Text>
              <TouchableOpacity
                onPress={() => Linking.openURL(receipt.source_url)}
                accessibilityRole="button"
                accessibilityLabel={t('link')}
              >
                <Text style={[styles.sourceLink, { color: '#0D9488', textDecorationLine: 'underline' }]} numberOfLines={2}>{receipt.source_url}</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Price Comparison Bottom Sheet */}
      <PriceComparisonSheet
        visible={compareItem !== null}
        description={compareItem?.description ?? ''}
        currentPrice={compareItem?.price ?? 0}
        onClose={() => setCompareItem(null)}
      />
    </SafeAreaView>
  );
}
