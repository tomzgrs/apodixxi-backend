import { useContext, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { I18nContext } from './_layout';
import { COLORS } from '../src/constants';
import { api } from '../src/api';
import { useAuth } from '../src/AuthContext';
import { classifyReceiptUrl } from '../src/services/receiptUrl';

let CameraView: any = null;
let useCameraPermissions: any = null;

try {
  const cam = require('expo-camera');
  CameraView = cam.CameraView;
  useCameraPermissions = cam.useCameraPermissions;
} catch (e) {
  // Camera not available (web preview)
}

function ScannerContent() {
  const { t } = useContext(I18nContext);
  const { accessToken } = useAuth();
  const router = useRouter();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [permission, requestPermission] = useCameraPermissions ? useCameraPermissions() : [null, () => {}];

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.permIcon}>📷</Text>
        <Text style={styles.permTitle}>
          {t('camera_access_required')}
        </Text>
        <Text style={styles.permDesc}>
          {t('camera_access_desc')}
        </Text>
        <TouchableOpacity testID="grant-camera-btn" style={styles.permBtn} onPress={requestPermission} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={t('grant_access')}>
          <Text style={styles.permBtnText}>
            {t('grant_access')}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    if (scanned || loading) return;
    setScanned(true);

    // Classify the scanned data to decide how to import it
    const kind = classifyReceiptUrl(data);

    if (kind === 'supported') {
      setLoading(true);
      try {
        const result = await api.importFromUrl(data, false, accessToken);

        if (!result) {
          Alert.alert(t('error'), t('could_not_parse'), [{ text: 'OK', onPress: () => setScanned(false) }]);
          return;
        }

        // Check for duplicate
        if (result.status === 'duplicate') {
          setLoading(false);
          Alert.alert(
            t('receipt_exists'),
            t('want_to_view'),
            [
              { text: t('yes'), onPress: () => router.replace(`/receipt/${result.existing_receipt?.id}`) },
              { text: t('no'), onPress: () => setScanned(false) }
            ]
          );
          return;
        }

        // Check if receipt exists in response
        if (result.receipt && result.receipt.id) {
          Alert.alert(
            t('success'),
            t('receipt_imported'),
            [{ text: 'OK', onPress: () => router.replace(`/receipt/${result.receipt.id}`) }]
          );
        } else {
          Alert.alert(t('success'), t('receipt_imported'), [{ text: 'OK', onPress: () => setScanned(false) }]);
        }
      } catch (e: any) {
        Alert.alert(t('error'), e.message || t('unknown_error'), [{ text: 'OK', onPress: () => setScanned(false) }]);
      } finally {
        setLoading(false);
      }
    } else if (kind === 'epsilon') {
      // Navigate directly to WebView for Epsilon Digital (AB, Market In, Bazaar)
      router.replace(`/webview-import?url=${encodeURIComponent(data)}`);
    } else if (kind === 'http') {
      // Unknown URL - try anyway
      setLoading(true);
      try {
        const result = await api.importFromUrl(data, false, accessToken);

        if (!result) {
          Alert.alert(t('error'), t('could_not_parse'), [{ text: 'OK', onPress: () => setScanned(false) }]);
          return;
        }

        // Check if WebView is required
        if (result.status === 'webview_required') {
          setLoading(false);
          router.replace(`/webview-import?url=${encodeURIComponent(result.url)}`);
          return;
        }

        Alert.alert(t('success'), t('receipt_imported'), [
          { text: 'OK', onPress: () => router.replace(`/receipt/${result.receipt?.id}`) }
        ]);
      } catch (e: any) {
        Alert.alert(t('error'), e.message || t('unknown_error'), [{ text: 'OK', onPress: () => setScanned(false) }]);
      } finally {
        setLoading(false);
      }
    } else {
      Alert.alert(
        t('error'),
        t('no_receipt_link'),
        [{ text: 'OK', onPress: () => setScanned(false) }]
      );
    }
  };

  return (
    <View style={styles.scannerContainer}>
      {CameraView && (
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr', 'datamatrix', 'pdf417'] }}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        />
      )}

      {/* Overlay */}
      <View style={styles.overlay}>
        <View style={styles.overlayTop} />
        <View style={styles.overlayMiddle}>
          <View style={styles.overlaySide} />
          <View style={styles.scanFrame}>
            {/* Corner markers */}
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
          <View style={styles.overlaySide} />
        </View>
        <View style={styles.overlayBottom}>
          <Text style={styles.scanHint}>
            {loading
              ? t('importing_receipt')
              : t('scan_qr_desc')}
          </Text>
          {loading && <ActivityIndicator color="#FFF" style={{ marginTop: 12 }} />}
        </View>
      </View>
    </View>
  );
}

export default function ScannerScreen() {
  const { t } = useContext(I18nContext);
  const router = useRouter();

  const cameraAvailable = CameraView !== null && useCameraPermissions !== null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity testID="scanner-back-btn" onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel={t('back')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle}>
          {t('scan_qr_code_title')}
        </Text>
        <View style={{ width: 44 }} />
      </View>

      {cameraAvailable ? (
        <ScannerContent />
      ) : (
        <View style={styles.center}>
          <Text style={styles.permIcon}>📷</Text>
          <Text style={styles.permTitle}>
            {t('camera_unavailable')}
          </Text>
          <Text style={styles.permDesc}>
            {t('qr_requires_device')}
          </Text>
          <TouchableOpacity
            testID="go-to-url-btn"
            style={styles.permBtn}
            onPress={() => router.back()}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={t('paste_url')}
          >
            <Text style={styles.permBtnText}>
              {t('paste_url')}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const SCAN_SIZE = 260;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 10 },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 32, color: '#FFF', fontWeight: '600' },
  topTitle: { fontSize: 17, fontWeight: '700', color: '#FFF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, backgroundColor: COLORS.background },
  permIcon: { fontSize: 64, marginBottom: 20 },
  permTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center', marginBottom: 8 },
  permDesc: { fontSize: 15, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  permBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 50 },
  permBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  scannerContainer: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center' },
  overlayTop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  overlayMiddle: { flexDirection: 'row', height: SCAN_SIZE },
  overlaySide: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  scanFrame: { width: SCAN_SIZE, height: SCAN_SIZE, borderRadius: 16 },
  overlayBottom: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', paddingTop: 30 },
  scanHint: { fontSize: 16, color: '#FFF', fontWeight: '600', textAlign: 'center' },
  corner: { position: 'absolute', width: 28, height: 28, borderColor: COLORS.primary, borderWidth: 3 },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 12 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 12 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 12 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 12 },
});
