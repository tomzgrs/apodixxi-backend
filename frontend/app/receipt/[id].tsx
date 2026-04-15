import { useContext, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { I18nContext } from '../_layout';
import { COLORS, getStoreColor, getStoreInitial, formatPrice } from '../../src/constants';
import { api } from '../../src/api';
import { getStoreLogo } from '../../src/storeLogos';

export default function ReceiptDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, lang } = useContext(I18nContext);
  const router = useRouter();
  const [receipt, setReceipt] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
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
        <TouchableOpacity testID="back-btn" onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ </Text>
        </TouchableOpacity>
        <Text style={styles.topTitle}>{t('receipt_detail')}</Text>
        <TouchableOpacity testID="delete-receipt-btn" onPress={handleDelete} style={styles.deleteBtn}>
          <Text style={styles.deleteText}>🗑️</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
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

        <View style={styles.itemsCard}>
          <Text style={styles.itemsTitle}>{receipt.items?.length || 0} {t('items')}</Text>
          
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.colNo]}>#</Text>
            <Text style={[styles.tableHeaderText, styles.colDesc]}>{lang === 'el' ? 'Περιγραφή' : 'Description'}</Text>
            <Text style={[styles.tableHeaderText, styles.colQty]}>{lang === 'el' ? 'Ποσ.' : 'Qty'}</Text>
            <Text style={[styles.tableHeaderText, styles.colPrice]}>{lang === 'el' ? 'Τιμή' : 'Price'}</Text>
            <Text style={[styles.tableHeaderText, styles.colTotal]}>{lang === 'el' ? 'Σύνολο' : 'Total'}</Text>
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
            </View>
          ))}
        </View>

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
              <Text style={[styles.totalValue, { color: COLORS.success }]}>-{formatPrice(receipt.discount_total)}</Text>
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

        <View style={styles.sourceCard}>
          <View style={styles.sourceRow}>
            <Text style={styles.sourceLabel}>{lang === 'el' ? 'Πηγή' : 'Source'}:</Text>
            <Text style={styles.sourceValue}>{receipt.provider}</Text>
          </View>
          <View style={styles.sourceRow}>
            <Text style={styles.sourceLabel}>{lang === 'el' ? 'Τύπος' : 'Type'}:</Text>
            <Text style={styles.sourceValue}>{receipt.source_type}</Text>
          </View>
          {receipt.source_url ? (
            <View style={styles.sourceLinkContainer}>
              <Text style={styles.sourceLabel}>{lang === 'el' ? 'Link' : 'Link'}:</Text>
              <Text style={styles.sourceLink} numberOfLines={2}>{receipt.source_url}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 16, color: COLORS.error },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  backBtn: { padding: 8 },
  backText: { fontSize: 28, color: COLORS.primary, fontWeight: '600' },
  topTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary },
  deleteBtn: { padding: 8 },
  deleteText: { fontSize: 20 },
  scroll: { padding: 16, paddingBottom: 40 },
  storeHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, backgroundColor: COLORS.surface, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: COLORS.borderLight },
  storeIcon: { width: 50, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  storeIconText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  storeLogo: { width: 50, height: 50, borderRadius: 12 },
  storeInfo: { flex: 1, marginLeft: 14 },
  storeName: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  storeAddr: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  storeVat: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  metaRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  metaItem: { flex: 1, backgroundColor: COLORS.surface, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: COLORS.borderLight },
  metaLabel: { fontSize: 10, fontWeight: '600', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  metaValue: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, marginTop: 3 },
  itemsCard: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: COLORS.borderLight, marginBottom: 12 },
  itemsTitle: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  
  // Table styles
  tableHeader: { flexDirection: 'row', backgroundColor: COLORS.primaryLight, paddingVertical: 10, paddingHorizontal: 6, borderRadius: 8, marginBottom: 4 },
  tableHeaderText: { fontSize: 10, fontWeight: '700', color: COLORS.primary, textAlign: 'center' },
  tableRow: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight, alignItems: 'center' },
  tableRowEven: { backgroundColor: '#F8FAFC' },
  tableRowOdd: { backgroundColor: COLORS.surface },
  tableCell: { fontSize: 11, color: COLORS.textPrimary, textAlign: 'center' },
  tableCellDesc: { fontSize: 11, fontWeight: '500', color: COLORS.textPrimary, lineHeight: 15 },
  tableCellUnit: { fontSize: 9, color: COLORS.textMuted, marginTop: 2 },
  tableCellTotal: { fontWeight: '700', color: COLORS.primary },
  colNo: { width: 24, textAlign: 'center' },
  colDesc: { flex: 1, paddingHorizontal: 6 },
  colQty: { width: 40, textAlign: 'center' },
  colPrice: { width: 50, textAlign: 'right' },
  colTotal: { width: 55, textAlign: 'right' },
  
  // Legacy styles (keep for compatibility)
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10 },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  itemInfo: { flex: 1 },
  itemDesc: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, lineHeight: 18 },
  itemMeta: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  itemPriceWrap: { alignItems: 'flex-end', marginLeft: 10 },
  itemPrice: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  itemDiscount: { fontSize: 10, color: COLORS.success, fontWeight: '600', marginTop: 1 },
  totalsCard: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: COLORS.borderLight, marginBottom: 12 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  totalLabel: { fontSize: 13, color: COLORS.textSecondary },
  totalValue: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
  grandTotal: { borderTopWidth: 2, borderTopColor: COLORS.primary, marginTop: 6, paddingTop: 10 },
  grandTotalLabel: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  grandTotalValue: { fontSize: 18, fontWeight: '800', color: COLORS.primary },
  sourceCard: { backgroundColor: COLORS.borderLight, borderRadius: 12, padding: 12 },
  sourceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  sourceLabel: { fontSize: 11, color: COLORS.textSecondary },
  sourceValue: { fontSize: 11, fontWeight: '600', color: COLORS.textMuted },
  sourceLinkContainer: { marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: COLORS.surface },
  sourceLink: { fontSize: 10, color: COLORS.primary, marginTop: 2 },
});
