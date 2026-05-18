import React, { useContext, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { I18nContext } from '../_layout';
import { useTheme } from '../../src/ThemeContext';
import { Typography, Spacing, Radius, Shadows } from '../../src/theme';
import { api } from '../../src/api';
import AdBanner from '../../src/components/AdBanner';

type Tab = 'url' | 'manual';

export default function AddReceiptScreen() {
  const { t, lang } = useContext(I18nContext);
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('url');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);

  // Manual entry state
  const [storeName, setStoreName] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [manualItems, setManualItems] = useState([{ description: '', quantity: '1', price: '' }]);
  const [manualTotal, setManualTotal] = useState('');

  // Force uppercase for text inputs
  const handleStoreNameChange = (text: string) => setStoreName(text.toUpperCase());
  
  const handleDescriptionChange = (index: number, text: string) => {
    updateManualItem(index, 'description', text.toUpperCase());
  };

  const handleUrlImport = async (forceImport: boolean = false) => {
    if (!url.trim()) return;
    setLoading(true);
    try {
      const result = await api.importFromUrl(url.trim(), forceImport);
      
      if (result.status === 'duplicate') {
        setLoading(false);
        Alert.alert(
          lang === 'el' ? 'Απόδειξη υπάρχει ήδη' : 'Receipt already exists',
          lang === 'el' 
            ? `Αυτή η απόδειξη έχει ήδη εισαχθεί από ${result.existing_receipt.store_name} στις ${result.existing_receipt.date}. Θέλετε να την εισάγετε ξανά;`
            : `This receipt was already imported from ${result.existing_receipt.store_name} on ${result.existing_receipt.date}. Do you want to import it again?`,
          [
            { text: lang === 'el' ? 'Προβολή υπάρχουσας' : 'View existing', onPress: () => router.push(`/receipt/${result.existing_receipt.id}`) },
            { text: lang === 'el' ? 'Εισαγωγή ξανά' : 'Import again', onPress: () => handleUrlImport(true) },
            { text: lang === 'el' ? 'Άκυρο' : 'Cancel', style: 'cancel' }
          ]
        );
        return;
      }
      
      if (result.status === 'webview_required') {
        setLoading(false);
        setUrl('');
        router.push(`/webview-import?url=${encodeURIComponent(result.url)}`);
        return;
      }
      
      Alert.alert(t('success'), t('receipt_imported'), [
        { text: 'OK', onPress: () => { setUrl(''); router.push(`/receipt/${result.receipt.id}`); } }
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

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    scroll: { padding: Spacing.lg, paddingBottom: 80 },  // Extra padding for sticky AdBanner
    adContainer: {
      alignItems: 'center',
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.md,
    },
    title: { 
      fontSize: Typography['2xl'], 
      fontWeight: Typography.extrabold, 
      color: theme.text, 
      marginBottom: Spacing.lg,
      letterSpacing: -0.5 
    },
    
    // Scanner Button
    scannerBtn: { 
      flexDirection: 'row', 
      alignItems: 'center', 
      backgroundColor: theme.primary, 
      borderRadius: Radius.xl, 
      padding: Spacing.base, 
      marginBottom: Spacing.lg,
      ...Shadows.md,
    },
    scannerIcon: { 
      width: 48, 
      height: 48, 
      borderRadius: Radius.md, 
      backgroundColor: 'rgba(255,255,255,0.2)', 
      alignItems: 'center', 
      justifyContent: 'center' 
    },
    scannerTextWrap: { flex: 1, marginLeft: Spacing.md },
    scannerTitle: { fontSize: Typography.lg, fontWeight: Typography.bold, color: theme.textInverse },
    scannerDesc: { fontSize: Typography.xs, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
    scannerArrow: { marginRight: Spacing.xs },
    
    // Tabs
    tabs: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
    tab: { 
      flex: 1, 
      paddingVertical: Spacing.md, 
      borderRadius: Radius.md, 
      backgroundColor: theme.surface, 
      alignItems: 'center', 
      borderWidth: 1.5, 
      borderColor: theme.border 
    },
    tabActive: { backgroundColor: theme.primary, borderColor: theme.primary },
    tabText: { fontSize: Typography.sm, fontWeight: Typography.semibold, color: theme.textSecondary },
    tabTextActive: { color: theme.textInverse },
    
    // Card
    card: { 
      backgroundColor: theme.surface, 
      borderRadius: Radius.xl, 
      padding: Spacing.lg, 
      borderWidth: 1, 
      borderColor: theme.cardBorder,
      ...Shadows.sm,
    },
    hint: { fontSize: Typography.sm, color: theme.textSecondary, marginBottom: Spacing.base, lineHeight: 20 },
    
    // Input
    input: { 
      backgroundColor: theme.background, 
      borderRadius: Radius.md, 
      paddingHorizontal: Spacing.base, 
      paddingVertical: Spacing.md, 
      fontSize: Typography.base, 
      color: theme.text, 
      borderWidth: 1, 
      borderColor: theme.border, 
      marginBottom: Spacing.md 
    },
    
    // Buttons
    primaryBtn: { 
      backgroundColor: theme.primary, 
      borderRadius: Radius.full, 
      paddingVertical: Spacing.base, 
      alignItems: 'center', 
      marginTop: Spacing.sm,
      ...Shadows.sm,
    },
    primaryBtnText: { color: theme.textInverse, fontSize: Typography.base, fontWeight: Typography.bold },
    btnDisabled: { opacity: 0.5 },
    
    // Upload
    uploadBtn: { 
      borderWidth: 2, 
      borderColor: theme.primary, 
      borderStyle: 'dashed', 
      borderRadius: Radius.xl, 
      padding: Spacing['3xl'], 
      alignItems: 'center', 
      justifyContent: 'center',
      backgroundColor: isDark ? theme.primaryLight : 'rgba(13, 148, 136, 0.05)',
    },
    uploadText: { fontSize: Typography.base, fontWeight: Typography.semibold, color: theme.primary, marginTop: Spacing.sm },
    
    // Supported Stores
    supportedStores: { marginTop: Spacing.xl, paddingTop: Spacing.base, borderTopWidth: 1, borderTopColor: theme.borderLight },
    supportedTitle: { fontSize: Typography.sm, fontWeight: Typography.semibold, color: theme.textSecondary, marginBottom: Spacing.sm },
    supportedItem: { fontSize: Typography.sm, color: theme.text, paddingVertical: 4 },
    
    // Manual Entry
    manualItemRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
    addItemBtn: { paddingVertical: Spacing.md, alignItems: 'center' },
    addItemText: { fontSize: Typography.base, fontWeight: Typography.semibold, color: theme.primary },
    manualTotal: { fontSize: Typography.lg, fontWeight: Typography.bold, color: theme.text, textAlign: 'right', marginVertical: Spacing.sm },
    removeBtn: { width: 36, height: 48, alignItems: 'center', justifyContent: 'center' },
    removeBtnText: { fontSize: 18, color: theme.error, fontWeight: Typography.bold },
  });

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
            <View style={styles.scannerIcon}>
              <Ionicons name="qr-code" size={26} color={theme.textInverse} />
            </View>
            <View style={styles.scannerTextWrap}>
              <Text style={styles.scannerTitle}>{t('scan_qr')}</Text>
              <Text style={styles.scannerDesc}>{t('scan_qr_desc')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color="rgba(255,255,255,0.6)" style={styles.scannerArrow} />
          </TouchableOpacity>

          {/* Tabs */}
          <View style={styles.tabs}>
            {(['url', 'manual'] as Tab[]).map((tab) => (
              <TouchableOpacity
                key={tab}
                testID={`tab-${tab}`}
                style={[styles.tab, activeTab === tab && styles.tabActive]}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                  {tab === 'url' ? t('paste_url') : t('manual_entry')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* URL Tab */}
          {activeTab === 'url' && (
            <View style={styles.card}>
              <Text style={styles.hint}>{t('url_hint')}</Text>
              <TextInput
                testID="url-input"
                style={styles.input}
                placeholder={t('url_placeholder')}
                placeholderTextColor={theme.textMuted}
                value={url}
                onChangeText={setUrl}
                autoCapitalize="none"
                autoCorrect={false}
                multiline
              />
              <TouchableOpacity
                testID="import-url-btn"
                style={[styles.primaryBtn, (!url.trim() || loading) && styles.btnDisabled]}
                onPress={() => handleUrlImport(false)}
                disabled={!url.trim() || loading}
                activeOpacity={0.8}
              >
                {loading ? <ActivityIndicator color={theme.textInverse} /> : <Text style={styles.primaryBtnText}>{t('import_btn')}</Text>}
              </TouchableOpacity>

              <View style={styles.supportedStores}>
                <Text style={styles.supportedTitle}>{t('supported_stores')} ({t('auto_import')}):</Text>
                {['Σκλαβενίτης', 'Μασούτης', 'Jumbo', 'My Market', 'Lidl'].map(s => (
                  <Text key={s} style={styles.supportedItem}>✓ {s}</Text>
                ))}
                <Text style={[styles.supportedTitle, { marginTop: 12 }]}>{lang === 'el' ? 'Με WebView (ανοίγει στην εφαρμογή):' : 'With WebView (opens in app):'}</Text>
                {['ΑΒ Βασιλόπουλος', 'Market In', 'Bazaar'].map(s => (
                  <Text key={s} style={styles.supportedItem}>⎔ {s}</Text>
                ))}
              </View>
            </View>
          )}

          {/* Manual Tab */}
          {activeTab === 'manual' && (
            <View style={styles.card}>
              <TextInput
                testID="manual-store-input"
                style={styles.input}
                placeholder={t('enter_store_name')}
                placeholderTextColor={theme.textMuted}
                value={storeName}
                onChangeText={handleStoreNameChange}
                autoCapitalize="characters"
              />
              <TextInput
                testID="manual-date-input"
                style={styles.input}
                placeholder={t('enter_date')}
                placeholderTextColor={theme.textMuted}
                value={dateStr}
                onChangeText={setDateStr}
              />

              {manualItems.map((item, i) => (
                <View key={i} style={styles.manualItemRow}>
                  <TextInput
                    testID={`manual-item-desc-${i}`}
                    style={[styles.input, { flex: 2 }]}
                    placeholder={t('enter_description')}
                    placeholderTextColor={theme.textMuted}
                    value={item.description}
                    onChangeText={(v) => handleDescriptionChange(i, v)}
                    autoCapitalize="characters"
                  />
                  <TextInput
                    style={[styles.input, { width: 50 }]}
                    placeholder={t('enter_quantity')}
                    placeholderTextColor={theme.textMuted}
                    value={item.quantity}
                    onChangeText={(v) => updateManualItem(i, 'quantity', v)}
                    keyboardType="numeric"
                  />
                  <TextInput
                    style={[styles.input, { width: 70 }]}
                    placeholder={t('enter_price')}
                    placeholderTextColor={theme.textMuted}
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
                {loading ? <ActivityIndicator color={theme.textInverse} /> : <Text style={styles.primaryBtnText}>{t('save_receipt')}</Text>}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      
      {/* Sticky Ad Banner */}
      <AdBanner position="bottom" />
    </SafeAreaView>
  );
}
