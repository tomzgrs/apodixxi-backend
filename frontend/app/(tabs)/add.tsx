import { useContext, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { I18nContext } from '../_layout';
import { COLORS } from '../../src/constants';
import { api } from '../../src/api';

type Tab = 'url' | 'xml' | 'manual';

export default function AddReceiptScreen() {
  const { t } = useContext(I18nContext);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('url');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);

  // Manual entry state
  const [storeName, setStoreName] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [manualItems, setManualItems] = useState([{ description: '', quantity: '1', price: '' }]);
  const [manualTotal, setManualTotal] = useState('');

  const handleUrlImport = async () => {
    if (!url.trim()) return;
    setLoading(true);
    try {
      const result = await api.importFromUrl(url.trim());
      Alert.alert(t('success'), t('receipt_imported'), [
        { text: 'OK', onPress: () => { setUrl(''); router.push(`/receipt/${result.receipt.id}`); } }
      ]);
    } catch (e: any) {
      Alert.alert(t('error'), e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleXmlUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ['text/xml', 'application/xml', '*/*'] });
      if (result.canceled) return;
      const file = result.assets[0];
      setLoading(true);
      const res = await api.importFromXml(file.uri, file.name);
      Alert.alert(t('success'), t('receipt_imported'), [
        { text: 'OK', onPress: () => router.push(`/receipt/${res.receipt.id}`) }
      ]);
    } catch (e: any) {
      Alert.alert(t('error'), e.message);
    } finally {
      setLoading(false);
    }
  };

  const addManualItem = () => {
    setManualItems([...manualItems, { description: '', quantity: '1', price: '' }]);
  };

  const updateManualItem = (index: number, field: string, value: string) => {
    const items = [...manualItems];
    (items[index] as any)[field] = value;
    setManualItems(items);
    const total = items.reduce((sum, item) => {
      const q = parseFloat(item.quantity) || 1;
      const p = parseFloat(item.price) || 0;
      return sum + (q * p);
    }, 0);
    setManualTotal(total.toFixed(2));
  };

  const removeManualItem = (index: number) => {
    if (manualItems.length <= 1) return;
    const items = manualItems.filter((_, i) => i !== index);
    setManualItems(items);
  };

  const handleManualSave = async () => {
    if (!storeName.trim()) { Alert.alert(t('error'), t('enter_store_name')); return; }
    const items = manualItems.filter(i => i.description.trim() && i.price).map(i => ({
      code: '',
      description: i.description,
      unit: 'ΤΕΜ',
      quantity: parseFloat(i.quantity) || 1,
      unit_price: parseFloat(i.price) || 0,
      pre_discount_value: (parseFloat(i.quantity) || 1) * (parseFloat(i.price) || 0),
      discount: 0,
      vat_percent: 0,
      total_value: (parseFloat(i.quantity) || 1) * (parseFloat(i.price) || 0),
    }));
    if (!items.length) { Alert.alert(t('error'), t('add_item')); return; }
    setLoading(true);
    try {
      const total = items.reduce((s, i) => s + i.total_value, 0);
      const res = await api.createManualReceipt({
        store_name: storeName,
        date: dateStr || new Date().toLocaleDateString('el-GR'),
        items,
        total,
        payment_method: '',
      });
      Alert.alert(t('success'), t('receipt_imported'), [
        { text: 'OK', onPress: () => {
          setStoreName(''); setDateStr(''); setManualItems([{ description: '', quantity: '1', price: '' }]); setManualTotal('');
          router.push(`/receipt/${res.receipt.id}`);
        }}
      ]);
    } catch (e: any) {
      Alert.alert(t('error'), e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>{t('add_receipt')}</Text>

          {/* QR Scanner Button */}
          <TouchableOpacity
            testID="open-scanner-btn"
            style={styles.scannerBtn}
            onPress={() => router.push('/scanner')}
            activeOpacity={0.8}
          >
            <Text style={styles.scannerIcon}>📷</Text>
            <View style={styles.scannerTextWrap}>
              <Text style={styles.scannerTitle}>{t('scan_qr')}</Text>
              <Text style={styles.scannerDesc}>{t('scan_qr_desc')}</Text>
            </View>
            <Text style={styles.scannerArrow}>›</Text>
          </TouchableOpacity>

          <View style={styles.tabs}>
            {(['url', 'xml', 'manual'] as Tab[]).map((tab) => (
              <TouchableOpacity
                key={tab}
                testID={`tab-${tab}`}
                style={[styles.tab, activeTab === tab && styles.tabActive]}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                  {tab === 'url' ? t('paste_url') : tab === 'xml' ? t('upload_xml') : t('manual_entry')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {activeTab === 'url' && (
            <View style={styles.card}>
              <Text style={styles.hint}>{t('url_hint')}</Text>
              <TextInput
                testID="url-input"
                style={styles.input}
                placeholder={t('url_placeholder')}
                placeholderTextColor={COLORS.textMuted}
                value={url}
                onChangeText={setUrl}
                autoCapitalize="none"
                autoCorrect={false}
                multiline
              />
              <TouchableOpacity
                testID="import-url-btn"
                style={[styles.primaryBtn, (!url.trim() || loading) && styles.btnDisabled]}
                onPress={handleUrlImport}
                disabled={!url.trim() || loading}
                activeOpacity={0.8}
              >
                {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryBtnText}>{t('import_btn')}</Text>}
              </TouchableOpacity>

              <View style={styles.supportedStores}>
                <Text style={styles.supportedTitle}>{t('supported_stores')} ({t('auto_import')}):</Text>
                {['Σκλαβενίτης', 'Μασούτης', 'Jumbo', 'My Market'].map(s => (
                  <Text key={s} style={styles.supportedItem}>✅ {s}</Text>
                ))}
              </View>
            </View>
          )}

          {activeTab === 'xml' && (
            <View style={styles.card}>
              <Text style={styles.hint}>{t('xml_hint')}</Text>
              <TouchableOpacity
                testID="upload-xml-btn"
                style={styles.uploadBtn}
                onPress={handleXmlUpload}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? <ActivityIndicator color={COLORS.primary} /> : (
                  <>
                    <Text style={styles.uploadIcon}>📄</Text>
                    <Text style={styles.uploadText}>{t('upload_xml')}</Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.supportedStores}>
                <Text style={styles.supportedTitle}>{t('supported_stores')} ({t('xml_upload')}):</Text>
                {['ΑΒ Βασιλόπουλος', 'Market In'].map(s => (
                  <Text key={s} style={styles.supportedItem}>📄 {s}</Text>
                ))}
              </View>
            </View>
          )}

          {activeTab === 'manual' && (
            <View style={styles.card}>
              <TextInput
                testID="manual-store-input"
                style={styles.input}
                placeholder={t('enter_store_name')}
                placeholderTextColor={COLORS.textMuted}
                value={storeName}
                onChangeText={setStoreName}
              />
              <TextInput
                testID="manual-date-input"
                style={styles.input}
                placeholder={t('enter_date')}
                placeholderTextColor={COLORS.textMuted}
                value={dateStr}
                onChangeText={setDateStr}
              />

              {manualItems.map((item, i) => (
                <View key={i} style={styles.manualItemRow}>
                  <TextInput
                    testID={`manual-item-desc-${i}`}
                    style={[styles.input, { flex: 2 }]}
                    placeholder={t('enter_description')}
                    placeholderTextColor={COLORS.textMuted}
                    value={item.description}
                    onChangeText={(v) => updateManualItem(i, 'description', v)}
                  />
                  <TextInput
                    style={[styles.input, { width: 50 }]}
                    placeholder={t('enter_quantity')}
                    placeholderTextColor={COLORS.textMuted}
                    value={item.quantity}
                    onChangeText={(v) => updateManualItem(i, 'quantity', v)}
                    keyboardType="numeric"
                  />
                  <TextInput
                    style={[styles.input, { width: 70 }]}
                    placeholder={t('enter_price')}
                    placeholderTextColor={COLORS.textMuted}
                    value={item.price}
                    onChangeText={(v) => updateManualItem(i, 'price', v)}
                    keyboardType="numeric"
                  />
                  {manualItems.length > 1 && (
                    <TouchableOpacity onPress={() => removeManualItem(i)} style={styles.removeBtn}>
                      <Text style={styles.removeBtnText}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}

              <TouchableOpacity testID="add-item-btn" style={styles.addItemBtn} onPress={addManualItem}>
                <Text style={styles.addItemText}>+ {t('add_item')}</Text>
              </TouchableOpacity>

              {manualTotal ? (
                <Text style={styles.manualTotal}>{t('total')}: {manualTotal}€</Text>
              ) : null}

              <TouchableOpacity
                testID="save-manual-btn"
                style={[styles.primaryBtn, loading && styles.btnDisabled]}
                onPress={handleManualSave}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryBtnText}>{t('save_receipt')}</Text>}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 20, letterSpacing: -0.5 },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  tab: { flex: 1, paddingVertical: 12, borderRadius: 14, backgroundColor: COLORS.surface, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  tabActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  tabTextActive: { color: '#FFF' },
  card: { backgroundColor: COLORS.surface, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: COLORS.borderLight },
  hint: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 16, lineHeight: 20 },
  input: { backgroundColor: COLORS.background, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: COLORS.textPrimary, borderWidth: 1, borderColor: COLORS.border, marginBottom: 12 },
  primaryBtn: { backgroundColor: COLORS.primary, borderRadius: 50, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  btnDisabled: { opacity: 0.5 },
  uploadBtn: { borderWidth: 2, borderColor: COLORS.primary, borderStyle: 'dashed', borderRadius: 20, padding: 40, alignItems: 'center', justifyContent: 'center' },
  uploadIcon: { fontSize: 40, marginBottom: 8 },
  uploadText: { fontSize: 16, fontWeight: '600', color: COLORS.primary },
  supportedStores: { marginTop: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: COLORS.borderLight },
  supportedTitle: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 8 },
  supportedItem: { fontSize: 14, color: COLORS.textPrimary, paddingVertical: 4 },
  manualItemRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  addItemBtn: { paddingVertical: 12, alignItems: 'center' },
  addItemText: { fontSize: 15, fontWeight: '600', color: COLORS.primary },
  manualTotal: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'right', marginVertical: 8 },
  removeBtn: { width: 36, height: 48, alignItems: 'center', justifyContent: 'center' },
  removeBtnText: { fontSize: 18, color: COLORS.error, fontWeight: '700' },
  scannerBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, borderRadius: 20, padding: 18, marginBottom: 20 },
  scannerIcon: { fontSize: 28 },
  scannerTextWrap: { flex: 1, marginLeft: 14 },
  scannerTitle: { fontSize: 17, fontWeight: '700', color: '#FFF' },
  scannerDesc: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  scannerArrow: { fontSize: 24, color: 'rgba(255,255,255,0.6)' },
});
