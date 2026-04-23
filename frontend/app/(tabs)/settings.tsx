import React, { useContext, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Switch, Image, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { I18nContext } from '../_layout';
import { useTheme } from '../../src/ThemeContext';
import { useAuth } from '../../src/AuthContext';
import { Typography, Spacing, Radius, Shadows } from '../../src/theme';
import { api } from '../../src/api';
import { getStoreLogo } from '../../src/storeLogos';

export default function SettingsScreen() {
  const { t, lang, setLang } = useContext(I18nContext);
  const { theme, isDark, mode, setMode, toggleTheme } = useTheme();
  const { user, accessToken, signOut } = useAuth();
  const [deviceId, setDeviceId] = useState('');
  const [autoBackup, setAutoBackup] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

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
    if (!accessToken) {
      Alert.alert('Σφάλμα', 'Παρακαλώ συνδεθείτε πρώτα');
      return;
    }

    // Check if user has export access
    try {
      const accessCheck = await api.checkExportAccess(accessToken);
      
      if (!accessCheck.can_export) {
        Alert.alert(
          'apodixxi+',
          'Η εξαγωγή δεδομένων είναι διαθέσιμη μόνο για συνδρομητές apodixxi+.\n\nΑναβαθμίστε τώρα για να αποκτήσετε πρόσβαση!',
          [
            { text: 'Αργότερα', style: 'cancel' },
            { text: 'Αναβάθμιση', onPress: () => Alert.alert('apodixxi+', 'Η δυνατότητα πληρωμής θα είναι σύντομα διαθέσιμη!') }
          ]
        );
        return;
      }

      // User is paid - proceed with export
      setIsExporting(true);
      
      try {
        const filename = `apodixxi_export_${new Date().toISOString().split('T')[0]}.xlsx`;
        const fileUri = `${FileSystem.documentDirectory}${filename}`;
        
        // Download file directly using FileSystem
        const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
        const downloadResult = await FileSystem.downloadAsync(
          `${API_URL}/api/export/receipts`,
          fileUri,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          }
        );

        if (downloadResult.status !== 200) {
          throw new Error('Αποτυχία λήψης αρχείου');
        }

        // Share the file
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(downloadResult.uri, {
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            dialogTitle: 'Εξαγωγή Δεδομένων apodixxi',
          });
        } else {
          Alert.alert('Επιτυχία', `Το αρχείο αποθηκεύτηκε: ${filename}`);
        }
      } catch (err: any) {
        console.error('Export error:', err);
        Alert.alert('Σφάλμα', err.message || 'Αποτυχία αποθήκευσης αρχείου');
      }
      setIsExporting(false);
      
    } catch (e: any) {
      setIsExporting(false);
      Alert.alert('Σφάλμα', e.message || 'Αποτυχία εξαγωγής');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Αποσύνδεση',
      'Είστε σίγουροι ότι θέλετε να αποσυνδεθείτε;',
      [
        { text: 'Άκυρο', style: 'cancel' },
        { text: 'Αποσύνδεση', style: 'destructive', onPress: signOut }
      ]
    );
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    scroll: { padding: Spacing.lg, paddingBottom: Spacing['3xl'] },
    title: { 
      fontSize: Typography['2xl'], 
      fontWeight: Typography.extrabold, 
      color: theme.text, 
      marginBottom: Spacing.xl,
      letterSpacing: -0.5 
    },
    
    // Section
    section: { marginBottom: Spacing.xl },
    sectionTitle: { 
      fontSize: Typography.xs, 
      fontWeight: Typography.bold, 
      color: theme.textMuted, 
      textTransform: 'uppercase', 
      letterSpacing: 1.2, 
      marginBottom: Spacing.md,
      marginLeft: Spacing.xs,
    },
    
    // Language selector
    langRow: { flexDirection: 'row', gap: Spacing.md },
    langBtn: { 
      flex: 1, 
      flexDirection: 'row', 
      alignItems: 'center', 
      justifyContent: 'center', 
      backgroundColor: theme.surface, 
      padding: Spacing.base, 
      borderRadius: Radius.lg, 
      borderWidth: 2, 
      borderColor: theme.border, 
      gap: Spacing.sm,
      ...Shadows.sm,
    },
    langBtnActive: { borderColor: theme.primary, backgroundColor: theme.primaryLight },
    langFlag: { fontSize: 24 },
    langText: { fontSize: Typography.base, fontWeight: Typography.semibold, color: theme.textSecondary },
    langTextActive: { color: theme.primary },
    
    // Theme selector
    themeRow: { flexDirection: 'row', gap: Spacing.sm },
    themeBtn: { 
      flex: 1, 
      alignItems: 'center', 
      justifyContent: 'center', 
      backgroundColor: theme.surface, 
      paddingVertical: Spacing.md, 
      borderRadius: Radius.md, 
      borderWidth: 2, 
      borderColor: theme.border,
      gap: Spacing.xs,
    },
    themeBtnActive: { borderColor: theme.primary, backgroundColor: theme.primaryLight },
    themeText: { fontSize: Typography.xs, fontWeight: Typography.medium, color: theme.textSecondary },
    themeTextActive: { color: theme.primary },
    
    // Settings row
    settingRow: { 
      flexDirection: 'row', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      backgroundColor: theme.surface, 
      padding: Spacing.base, 
      borderRadius: Radius.lg, 
      borderWidth: 1, 
      borderColor: theme.cardBorder, 
      marginBottom: Spacing.sm,
      ...Shadows.sm,
    },
    settingLabel: { fontSize: Typography.base, fontWeight: Typography.semibold, color: theme.text },
    settingDesc: { fontSize: Typography.xs, color: theme.textSecondary, marginTop: 2 },
    
    // Action button
    actionBtn: { 
      flexDirection: 'row', 
      alignItems: 'center', 
      backgroundColor: theme.surface, 
      padding: Spacing.base, 
      borderRadius: Radius.lg, 
      borderWidth: 1, 
      borderColor: theme.cardBorder,
      ...Shadows.sm,
    },
    actionIconWrap: { 
      width: 40, 
      height: 40, 
      borderRadius: Radius.md, 
      backgroundColor: theme.primaryLight, 
      alignItems: 'center', 
      justifyContent: 'center' 
    },
    actionInfo: { flex: 1, marginLeft: Spacing.md },
    actionLabel: { fontSize: Typography.base, fontWeight: Typography.semibold, color: theme.text },
    actionDesc: { fontSize: Typography.xs, color: theme.textSecondary, marginTop: 2 },
    
    // Stores grid
    storesGrid: { 
      backgroundColor: theme.surface, 
      borderRadius: Radius.lg, 
      padding: Spacing.base, 
      borderWidth: 1, 
      borderColor: theme.cardBorder,
      ...Shadows.sm,
    },
    storeItem: { 
      flexDirection: 'row', 
      alignItems: 'center', 
      paddingVertical: Spacing.sm, 
      borderBottomWidth: 1, 
      borderBottomColor: theme.borderLight 
    },
    storeItemLast: { borderBottomWidth: 0 },
    storeDot: { width: 10, height: 10, borderRadius: 5, marginRight: Spacing.md },
    storeLogoSmall: { width: 24, height: 24, borderRadius: 4, marginRight: Spacing.md },
    storeNameText: { flex: 1, fontSize: Typography.sm, fontWeight: Typography.semibold, color: theme.text },
    storeMethod: { fontSize: Typography.xs, color: theme.textSecondary },
    
    // About card
    aboutCard: { 
      backgroundColor: theme.surface, 
      borderRadius: Radius.lg, 
      padding: Spacing.lg, 
      borderWidth: 1, 
      borderColor: theme.cardBorder, 
      alignItems: 'center',
      ...Shadows.sm,
    },
    aboutAppName: { fontSize: Typography.xl, fontWeight: Typography.extrabold, color: theme.primary },
    aboutVersion: { fontSize: Typography.sm, color: theme.textSecondary, marginTop: Spacing.xs },
    aboutRow: { flexDirection: 'row', marginTop: Spacing.md, gap: Spacing.sm },
    aboutLabel: { fontSize: Typography.xs, color: theme.textSecondary, fontWeight: Typography.semibold },
    aboutValue: { fontSize: Typography.xs, color: theme.textMuted, flex: 1 },
    
    // Account card
    accountCard: {
      backgroundColor: theme.surface,
      borderRadius: Radius.lg,
      padding: Spacing.base,
      borderWidth: 1,
      borderColor: theme.cardBorder,
      ...Shadows.sm,
    },
    accountInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: Spacing.md,
    },
    accountAvatar: {
      width: 50,
      height: 50,
      borderRadius: 25,
      alignItems: 'center',
      justifyContent: 'center',
    },
    accountDetails: {
      flex: 1,
      marginLeft: Spacing.md,
    },
    accountEmail: {
      fontSize: Typography.base,
      fontWeight: Typography.semibold,
      color: theme.text,
    },
    accountTypeRow: {
      flexDirection: 'row',
      marginTop: 4,
    },
    accountTypeBadge: {
      paddingHorizontal: Spacing.sm,
      paddingVertical: 2,
      borderRadius: Radius.full,
      borderWidth: 1,
      borderColor: theme.border,
    },
    accountTypeText: {
      fontSize: Typography.xs,
      fontWeight: Typography.semibold,
    },
    logoutBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Spacing.sm,
      borderTopWidth: 1,
      borderTopColor: theme.borderLight,
    },
    logoutText: {
      fontSize: Typography.sm,
      color: '#ef4444',
      fontWeight: Typography.medium,
      marginLeft: Spacing.xs,
    },
  });

  const stores = [
    { name: 'Σκλαβενίτης', method: 'Auto', color: '#E35205', key: 'ΣΚΛΑΒΕΝΙΤΗΣ' },
    { name: 'Μασούτης', method: 'Auto', color: '#00A651', key: 'ΜΑΣΟΥΤΗΣ' },
    { name: 'Jumbo', method: 'Auto', color: '#FFD700', key: 'JUMBO' },
    { name: 'My Market', method: 'Auto', color: '#FF6600', key: 'MY MARKET' },
    { name: 'Lidl', method: 'Auto', color: '#0050AA', key: 'LIDL' },
    { name: 'ΑΒ Βασιλόπουλος', method: 'WebView', color: '#005696', key: 'ΑΒ ΒΑΣΙΛΟΠΟΥΛΟΣ' },
    { name: 'Market In', method: 'WebView', color: '#E30613', key: 'MARKET IN' },
    { name: 'Bazaar', method: 'WebView', color: '#D4145A', key: 'BAZAAR' },
    { name: 'The Mart', method: 'Auto', color: '#FF0000', key: 'THE MART' },
    { name: 'Kritikos', method: 'Auto', color: '#00529B', key: 'ΚΡΗΤΙΚΟΣ' },
    { name: 'Galaxias', method: 'Auto', color: '#E4002B', key: 'ΓΑΛΑΞΙΑΣ' },
    { name: 'SYN.KA', method: 'Auto', color: '#ED1C24', key: 'SYNKA' },
    { name: 'Μουστάκας', method: 'Auto', color: '#E31837', key: 'ΜΟΥΣΤΑΚΑΣ' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{t('settings')}</Text>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{lang === 'el' ? 'Λογαριασμός' : 'Account'}</Text>
          <View style={styles.accountCard}>
            <View style={styles.accountInfo}>
              <View style={[styles.accountAvatar, { backgroundColor: theme.primaryLight }]}>
                <Ionicons name="person" size={28} color={theme.primary} />
              </View>
              <View style={styles.accountDetails}>
                <Text style={styles.accountEmail}>{user?.email || 'user@email.com'}</Text>
                <View style={styles.accountTypeRow}>
                  <View style={[
                    styles.accountTypeBadge, 
                    { backgroundColor: user?.account_type === 'paid' ? '#fef3c7' : theme.surface }
                  ]}>
                    <Text style={[
                      styles.accountTypeText,
                      { color: user?.account_type === 'paid' ? '#92400e' : theme.textSecondary }
                    ]}>
                      {user?.account_type === 'paid' ? '⭐ apodixxi+' : 'Free'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={handleLogout}
              activeOpacity={0.7}
            >
              <Ionicons name="log-out-outline" size={20} color="#ef4444" />
              <Text style={styles.logoutText}>{lang === 'el' ? 'Αποσύνδεση' : 'Logout'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Language Section */}
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

        {/* Theme Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{lang === 'el' ? 'Θέμα Εμφάνισης' : 'Appearance'}</Text>
          <View style={styles.themeRow}>
            <TouchableOpacity
              testID="theme-light-btn"
              style={[styles.themeBtn, mode === 'light' && styles.themeBtnActive]}
              onPress={() => setMode('light')}
              activeOpacity={0.7}
            >
              <Ionicons name="sunny" size={22} color={mode === 'light' ? theme.primary : theme.textMuted} />
              <Text style={[styles.themeText, mode === 'light' && styles.themeTextActive]}>
                {lang === 'el' ? 'Φωτεινό' : 'Light'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="theme-dark-btn"
              style={[styles.themeBtn, mode === 'dark' && styles.themeBtnActive]}
              onPress={() => setMode('dark')}
              activeOpacity={0.7}
            >
              <Ionicons name="moon" size={22} color={mode === 'dark' ? theme.primary : theme.textMuted} />
              <Text style={[styles.themeText, mode === 'dark' && styles.themeTextActive]}>
                {lang === 'el' ? 'Σκοτεινό' : 'Dark'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="theme-system-btn"
              style={[styles.themeBtn, mode === 'system' && styles.themeBtnActive]}
              onPress={() => setMode('system')}
              activeOpacity={0.7}
            >
              <Ionicons name="phone-portrait-outline" size={22} color={mode === 'system' ? theme.primary : theme.textMuted} />
              <Text style={[styles.themeText, mode === 'system' && styles.themeTextActive]}>
                {lang === 'el' ? 'Σύστημα' : 'System'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Backup Section */}
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
              trackColor={{ false: theme.border, true: theme.primaryLight }}
              thumbColor={autoBackup ? theme.primary : theme.textMuted}
            />
          </View>
          <TouchableOpacity
            testID="export-btn"
            style={[styles.actionBtn, isExporting && { opacity: 0.6 }]}
            onPress={handleExport}
            activeOpacity={0.7}
            disabled={isExporting}
          >
            <View style={styles.actionIconWrap}>
              {isExporting ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <Ionicons name="download-outline" size={22} color={theme.primary} />
              )}
            </View>
            <View style={styles.actionInfo}>
              <Text style={styles.actionLabel}>{t('export_data')}</Text>
              <Text style={styles.actionDesc}>
                {lang === 'el' ? 'Εξαγωγή δεδομένων σε Excel (μόνο apodixxi+)' : 'Export data to Excel (apodixxi+ only)'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Supported Stores */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('supported_stores')}</Text>
          <View style={styles.storesGrid}>
            {stores.map((store, i) => {
              const logoUrl = getStoreLogo(store.key);
              return (
                <View key={i} style={[styles.storeItem, i === stores.length - 1 && styles.storeItemLast]}>
                  {logoUrl ? (
                    <Image source={{ uri: logoUrl }} style={styles.storeLogoSmall} resizeMode="contain" />
                  ) : (
                    <View style={[styles.storeDot, { backgroundColor: store.color }]} />
                  )}
                  <Text style={styles.storeNameText}>{store.name}</Text>
                  <Text style={styles.storeMethod}>{store.method}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('about')}</Text>
          <View style={styles.aboutCard}>
            <Ionicons name="cart" size={36} color={theme.primary} />
            <Text style={styles.aboutAppName}>apodixxi</Text>
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
