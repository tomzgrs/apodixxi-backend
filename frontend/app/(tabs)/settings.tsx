import { useContext, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nContext } from '../_layout';
import { COLORS } from '../../src/constants';
import { api } from '../../src/api';

export default function SettingsScreen() {
  const { t, lang, setLang } = useContext(I18nContext);
  const [deviceId, setDeviceId] = useState('');
  const [autoBackup, setAutoBackup] = useState(true);

  useEffect(() => {
    (async () => {
      const id = await api.getDeviceId();
      setDeviceId(id);
      const ab = await AsyncStorage.getItem('auto_backup');
      if (ab !== null) setAutoBackup(ab === 'true');
    })();
  }, []);

  const toggleAutoBackup = async (val: boolean) => {
    setAutoBackup(val);
    await AsyncStorage.setItem('auto_backup', String(val));
  };

  const handleExport = async () => {
    try {
      const data = await api.exportData();
      Alert.alert(
        t('success'),
        `${t('export_data')}: ${data.total_receipts} ${t('receipts')}`,
        [{ text: 'OK' }]
      );
    } catch (e: any) {
      Alert.alert(t('error'), e.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{t('settings')}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('language')}</Text>
          <View style={styles.langRow}>
            <TouchableOpacity
              testID="lang-el-btn"
              style={[styles.langBtn, lang === 'el' && styles.langBtnActive]}
              onPress={() => setLang('el')}
              activeOpacity={0.7}
            >
              <Text style={styles.langFlag}>🇬🇷</Text>
              <Text style={[styles.langText, lang === 'el' && styles.langTextActive]}>{t('greek')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="lang-en-btn"
              style={[styles.langBtn, lang === 'en' && styles.langBtnActive]}
              onPress={() => setLang('en')}
              activeOpacity={0.7}
            >
              <Text style={styles.langFlag}>🇬🇧</Text>
              <Text style={[styles.langText, lang === 'en' && styles.langTextActive]}>{t('english')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('backup')}</Text>
          <View style={styles.settingRow}>
            <View>
              <Text style={styles.settingLabel}>{t('auto_backup')}</Text>
              <Text style={styles.settingDesc}>
                {lang === 'el' ? 'Αυτόματος συγχρονισμός με τον server' : 'Auto sync with server'}
              </Text>
            </View>
            <Switch
              testID="auto-backup-switch"
              value={autoBackup}
              onValueChange={toggleAutoBackup}
              trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
              thumbColor={autoBackup ? COLORS.primary : COLORS.textMuted}
            />
          </View>
          <TouchableOpacity
            testID="export-btn"
            style={styles.actionBtn}
            onPress={handleExport}
            activeOpacity={0.7}
          >
            <Text style={styles.actionIcon}>📦</Text>
            <View style={styles.actionInfo}>
              <Text style={styles.actionLabel}>{t('export_data')}</Text>
              <Text style={styles.actionDesc}>
                {lang === 'el' ? 'Εξαγωγή όλων των δεδομένων σε JSON' : 'Export all data as JSON'}
              </Text>
            </View>
            <Text style={styles.actionArrow}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('supported_stores')}</Text>
          <View style={styles.storesGrid}>
            {[
              { name: 'Σκλαβενίτης', method: '✅ Auto', color: '#E35205' },
              { name: 'Μασούτης', method: '✅ Auto', color: '#00A651' },
              { name: 'Jumbo', method: '✅ Auto', color: '#FFD700' },
              { name: 'My Market', method: '✅ Auto', color: '#FF6600' },
              { name: 'Lidl', method: '✅ Auto', color: '#0050AA' },
              { name: 'ΑΒ Βασιλόπουλος', method: '📄 XML', color: '#005696' },
              { name: 'Market In', method: '📄 XML', color: '#E30613' },
              { name: 'Bazaar', method: '📄 XML', color: '#D4145A' },
            ].map((store, i) => (
              <View key={i} style={styles.storeItem}>
                <View style={[styles.storeDot, { backgroundColor: store.color }]} />
                <Text style={styles.storeNameText}>{store.name}</Text>
                <Text style={styles.storeMethod}>{store.method}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('about')}</Text>
          <View style={styles.aboutCard}>
            <Text style={styles.aboutAppName}>🛒 GroceryTracker</Text>
            <Text style={styles.aboutVersion}>{t('version')} 1.0.0</Text>
            <View style={styles.aboutRow}>
              <Text style={styles.aboutLabel}>{t('device_id')}:</Text>
              <Text style={styles.aboutValue} numberOfLines={1}>{deviceId}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 24, letterSpacing: -0.5 },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  langRow: { flexDirection: 'row', gap: 12 },
  langBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface, padding: 16, borderRadius: 16, borderWidth: 2, borderColor: COLORS.border, gap: 10 },
  langBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  langFlag: { fontSize: 24 },
  langText: { fontSize: 15, fontWeight: '600', color: COLORS.textSecondary },
  langTextActive: { color: COLORS.primary },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.surface, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: COLORS.borderLight, marginBottom: 10 },
  settingLabel: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  settingDesc: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: COLORS.borderLight },
  actionIcon: { fontSize: 24 },
  actionInfo: { flex: 1, marginLeft: 12 },
  actionLabel: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  actionDesc: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  actionArrow: { fontSize: 22, color: COLORS.textMuted },
  storesGrid: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.borderLight },
  storeItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  storeDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  storeNameText: { flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  storeMethod: { fontSize: 12, color: COLORS.textSecondary },
  aboutCard: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: COLORS.borderLight, alignItems: 'center' },
  aboutAppName: { fontSize: 20, fontWeight: '800', color: COLORS.primary },
  aboutVersion: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
  aboutRow: { flexDirection: 'row', marginTop: 12, gap: 8 },
  aboutLabel: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  aboutValue: { fontSize: 12, color: COLORS.textMuted, flex: 1 },
});
