import { useContext, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { I18nContext } from '../_layout';
import { COLORS, getStoreColor, getStoreInitial, formatPrice } from '../../src/constants';
import { api } from '../../src/api';

export default function ReceiptDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useContext(I18nContext);
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
          <View style={[styles.storeIcon, { backgroundColor: getStoreColor(receipt.store_name || '') }]}>
            <Text style={styles.storeIconText}>{getStoreInitial(receipt.store_name || '?')}</Text>
          </View>
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
          {receipt.items?.map((item: any, i: number) => (
            <View key={i} style={[styles.itemRow, i < receipt.items.length - 1 && styles.itemBorder]}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemDesc} numberOfLines={2}>{item.description}</Text>
                <Text style={styles.itemMeta}>
                  {item.quantity > 1 ? `${item.quantity} × ${formatPrice(item.unit_price)}` : ''}
                  {item.unit ? ` · ${item.unit}` : ''}
                  {item.vat_percent ? ` · ${t('vat')} ${item.vat_percent}%` : ''}
                </Text>
              </View>
              <View style={styles.itemPriceWrap}>
                <Text style={styles.itemPrice}>{formatPrice(item.total_value)}</Text>
                {item.discount > 0 && (
                  <Text style={styles.itemDiscount}>-{formatPrice(item.discount)}</Text>
                )}
              </View>
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
          <Text style={styles.sourceLabel}>{lang === 'el' ? 'Πηγή' : 'Source'}: {receipt.provider}</Text>
          <Text style={styles.sourceType}>{receipt.source_type}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const lang = 'el'; // fallback

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
  scroll: { padding: 20, paddingBottom: 40 },
  storeHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  storeIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  storeIconText: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  storeInfo: { flex: 1, marginLeft: 16 },
  storeName: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary },
  storeAddr: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  storeVat: { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
  metaRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  metaItem: { flex: 1, backgroundColor: COLORS.surface, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: COLORS.borderLight },
  metaLabel: { fontSize: 11, fontWeight: '600', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  metaValue: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, marginTop: 4 },
  itemsCard: { backgroundColor: COLORS.surface, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: COLORS.borderLight, marginBottom: 16 },
  itemsTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 12 },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  itemInfo: { flex: 1 },
  itemDesc: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, lineHeight: 20 },
  itemMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 3 },
  itemPriceWrap: { alignItems: 'flex-end', marginLeft: 12 },
  itemPrice: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  itemDiscount: { fontSize: 11, color: COLORS.success, fontWeight: '600', marginTop: 2 },
  totalsCard: { backgroundColor: COLORS.surface, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: COLORS.borderLight, marginBottom: 16 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  totalLabel: { fontSize: 14, color: COLORS.textSecondary },
  totalValue: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  grandTotal: { borderTopWidth: 2, borderTopColor: COLORS.primary, marginTop: 8, paddingTop: 12 },
  grandTotalLabel: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },
  grandTotalValue: { fontSize: 20, fontWeight: '800', color: COLORS.primary },
  sourceCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.borderLight, borderRadius: 14, padding: 12 },
  sourceLabel: { fontSize: 12, color: COLORS.textSecondary },
  sourceType: { fontSize: 11, fontWeight: '600', color: COLORS.textMuted, textTransform: 'uppercase' },
});
