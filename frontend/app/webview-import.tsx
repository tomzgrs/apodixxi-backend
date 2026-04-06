import { useContext, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { I18nContext } from './_layout';
import { COLORS } from '../src/constants';
import { api } from '../src/api';

let WebView: any = null;
try {
  WebView = require('react-native-webview').default;
} catch (e) {}

const DOM_EXTRACTION_JS = `
(function() {
  try {
    var result = {
      store_name: '',
      store_vat: '',
      date: '',
      receipt_number: '',
      raw_text: '',
      items: [],
      found_final_total: 0
    };

    result.raw_text = document.body.innerText || '';

    // Store name from URL
    var fullUrl = window.location.href.toLowerCase();
    var hostname = window.location.hostname.toLowerCase();
    
    if (hostname.includes('marketin') || fullUrl.includes('marketin')) {
      result.store_name = 'MARKET IN';
    } else if (hostname.includes('abmarket') || fullUrl.includes('abmarket')) {
      result.store_name = 'ΑΒ ΒΑΣΙΛΟΠΟΥΛΟΣ';
    } else if (hostname.includes('bazaar') || fullUrl.includes('bazaar')) {
      result.store_name = 'BAZAAR';
    } else if (hostname.includes('sklavenitis') || fullUrl.includes('sklavenitis')) {
      result.store_name = 'ΣΚΛΑΒΕΝΙΤΗΣ';
    }

    // Extract VAT, date, receipt number
    var vatMatch = result.raw_text.match(/(?:Α\\.?Φ\\.?Μ\\.?|ΑΦΜ)[:\\s]*([0-9]{9})/i);
    if (vatMatch) result.store_vat = vatMatch[1];
    
    var dateMatch = result.raw_text.match(/(\\d{1,2}[\\-\\/\\.]\\d{1,2}[\\-\\/\\.]\\d{2,4})/);
    if (dateMatch) result.date = dateMatch[1];

    // Find ΤΕΛΙΚΗ ΑΞΙΑ from the summary section
    var lines = result.raw_text.split('\\n');
    for (var li = 0; li < lines.length; li++) {
      var line = lines[li];
      var lineUpper = line.toUpperCase();
      
      // Look for ΤΕΛΙΚΗ ΑΞΙΑ specifically
      if (lineUpper.includes('ΤΕΛΙΚΗ ΑΞΙΑ') || lineUpper.includes('ΠΛΗΡΩΤΕΟ')) {
        var nums = line.match(/(\\d+)[,\\.](\\d{2})/g);
        if (nums && nums.length > 0) {
          var lastNum = nums[nums.length - 1].replace(',', '.');
          result.found_final_total = parseFloat(lastNum);
        }
      }
    }

    // Parse price - must be X,XX or X.XX format (1-2 decimal places)
    function parsePrice(text) {
      if (!text) return 0;
      var clean = text.replace(/[€\\s]/g, '').trim();
      
      // Skip percentages
      if (clean.includes('%')) return 0;
      
      // Skip quantities with 3 decimal places (like 1,000 meaning 1.000)
      if (/^\\d+[,.]\\d{3}$/.test(clean)) return 0;
      
      // Replace comma with dot
      clean = clean.replace(',', '.');
      
      // Match valid price: integer or 1-2 decimal places
      if (/^\\d+(\\.\\d{1,2})?$/.test(clean)) {
        return parseFloat(clean);
      }
      return 0;
    }

    // Check if text is a valid product description
    function isValidDescription(text) {
      if (!text || text.length < 3) return false;
      var t = text.toUpperCase().trim();
      
      // Exclude keywords
      var excludes = ['ΣΥΝΟΛΟ', 'ΤΕΛΙΚ', 'ΚΑΘΑΡ', 'ΦΠΑ', 'ΠΛΗΡΩΤ', 'ΑΞΙΑ', 
                     'ΥΠΟΣΥΝΟΛ', 'EFT', 'POS', 'ΜΕΤΡΗΤ', 'ΚΑΡΤ', 'VISA',
                     'ΚΩΔΙΚΟΣ', 'ΠΕΡΙΓΡΑΦΗ', 'ΠΟΣΟΤΗΤΑ', 'ΤΙΜΗ', 'Α/Α', 'ΜΜ',
                     'ΣΧΟΛΙΑ', 'MASTERCARD', 'CREDIT', 'DEBIT'];
      for (var i = 0; i < excludes.length; i++) {
        if (t.includes(excludes[i]) || t === excludes[i]) return false;
      }
      
      // Must contain at least one letter
      if (!/[A-ZΑ-Ω]/.test(t)) return false;
      
      return true;
    }

    // Get all tables
    var tables = document.querySelectorAll('table');
    
    for (var ti = 0; ti < tables.length; ti++) {
      var rows = tables[ti].querySelectorAll('tr');
      
      for (var ri = 0; ri < rows.length; ri++) {
        var cells = rows[ri].querySelectorAll('td');
        if (cells.length < 4) continue;
        
        // Find description - usually column 1 or 2 (after row number)
        var description = '';
        var descIndex = -1;
        
        for (var di = 0; di < Math.min(cells.length, 3); di++) {
          var cellText = cells[di] ? cells[di].innerText.trim() : '';
          if (isValidDescription(cellText)) {
            description = cellText;
            descIndex = di;
            break;
          }
        }
        
        if (!description) continue;
        
        // Get quantity (look for columns after description with format like 1,000 or 2,000)
        var quantity = '1';
        for (var qi = descIndex + 1; qi < Math.min(cells.length, descIndex + 4); qi++) {
          var qText = cells[qi] ? cells[qi].innerText.trim().replace(',', '.') : '';
          if (/^\\d+\\.\\d{3}$/.test(qText)) {
            // Format like 1.000 = quantity 1
            quantity = Math.round(parseFloat(qText)).toString();
            break;
          } else if (/^\\d+$/.test(qText) && parseInt(qText) < 100) {
            quantity = qText;
            break;
          }
        }
        
        // Find the LAST valid price in the row (this is ΑΞΙΑ - final price with VAT)
        var finalPrice = 0;
        for (var pi = cells.length - 1; pi > descIndex; pi--) {
          var cellText = cells[pi] ? cells[pi].innerText.trim() : '';
          var price = parsePrice(cellText);
          if (price > 0) {
            finalPrice = price;
            break; // Take the FIRST valid price from the end
          }
        }
        
        if (finalPrice > 0) {
          result.items.push({
            code: '',
            description: description,
            unit: 'ΤΕΜ',
            quantity: quantity,
            unit_price: finalPrice.toFixed(2),
            total: finalPrice.toFixed(2)
          });
        }
      }
    }

    window.ReactNativeWebView.postMessage(JSON.stringify({type: 'extracted', data: result}));
  } catch(err) {
    window.ReactNativeWebView.postMessage(JSON.stringify({type: 'error', message: err.toString()}));
  }
})();
true;
`;

export default function WebViewImportScreen() {
  const { url: rawUrl } = useLocalSearchParams<{ url: string }>();
  const pageUrl = rawUrl || '';
  const { lang } = useContext(I18nContext);
  const router = useRouter();
  const webviewRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [pageLoaded, setPageLoaded] = useState(false);
  const [extracted, setExtracted] = useState(false);

  const handleExtract = useCallback(() => {
    if (webviewRef.current && !extracting) {
      setExtracting(true);
      webviewRef.current.injectJavaScript(DOM_EXTRACTION_JS);
    }
  }, [extracting]);

  const handleMessage = useCallback(async (event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'extracted' && !extracted) {
        setExtracted(true);
        const data = msg.data;
        if (data.items && data.items.length > 0) {
          // Send to backend
          const deviceId = await api.getDeviceId();
          const result = await api.importWebViewData({
            device_id: deviceId,
            url: pageUrl,
            raw_text: data.raw_text || '',
            items: data.items,
            store_name: data.store_name || '',
            found_final_total: data.found_final_total || 0,
          });
          Alert.alert(
            lang === 'el' ? 'Επιτυχία!' : 'Success!',
            lang === 'el' ? 'Η απόδειξη εισήχθη επιτυχώς!' : 'Receipt imported successfully!',
            [{ text: 'OK', onPress: () => router.replace(`/receipt/${result.receipt.id}`) }]
          );
        } else {
          // No items - show raw text option
          Alert.alert(
            lang === 'el' ? 'Δεν βρέθηκαν προϊόντα' : 'No products found',
            lang === 'el'
              ? 'Η σελίδα φόρτωσε αλλά δεν βρέθηκαν δομημένα δεδομένα. Δοκιμάστε ξανά ή χρησιμοποιήστε χειροκίνητη εισαγωγή.'
              : 'The page loaded but no structured data was found. Try again or use manual entry.',
            [
              { text: lang === 'el' ? 'Δοκιμή ξανά' : 'Try again', onPress: () => { setExtracted(false); setExtracting(false); } },
              { text: lang === 'el' ? 'Πίσω' : 'Back', onPress: () => router.back() },
            ]
          );
        }
        setExtracting(false);
      } else if (msg.type === 'error') {
        Alert.alert('Error', msg.message);
        setExtracting(false);
      }
    } catch (e) {
      setExtracting(false);
    }
  }, [extracted, pageUrl, lang, router]);

  const webViewAvailable = WebView !== null && Platform.OS !== 'web';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity testID="webview-back-btn" onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle} numberOfLines={1}>
          {lang === 'el' ? 'Εισαγωγή Απόδειξης' : 'Import Receipt'}
        </Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Instructions */}
      <View style={styles.instructions}>
        <Text style={styles.instructionText}>
          {lang === 'el'
            ? '1. Περιμένετε να φορτώσει η σελίδα\n2. Πατήστε "Εξαγωγή Δεδομένων" όταν δείτε τα προϊόντα'
            : '1. Wait for the page to load\n2. Tap "Extract Data" when you see the products'}
        </Text>
      </View>

      {!webViewAvailable ? (
        <View style={styles.center}>
          <Text style={styles.noWebviewIcon}>🌐</Text>
          <Text style={styles.noWebviewTitle}>
            {lang === 'el' ? 'WebView δεν διαθέσιμο στο web' : 'WebView not available on web'}
          </Text>
          <Text style={styles.noWebviewDesc}>
            {lang === 'el'
              ? 'Χρησιμοποιήστε το Expo Go στο κινητό σας ή ανεβάστε XML αρχείο.'
              : 'Use Expo Go on your phone or upload an XML file.'}
          </Text>
          <TouchableOpacity style={styles.goBackBtn} onPress={() => router.back()}>
            <Text style={styles.goBackText}>{lang === 'el' ? 'Πίσω' : 'Go back'}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <WebView
            ref={webviewRef}
            source={{ uri: pageUrl }}
            style={styles.webview}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            onLoadStart={() => { setLoading(true); setPageLoaded(false); }}
            onLoadEnd={() => { setLoading(false); setPageLoaded(true); }}
            onMessage={handleMessage}
            userAgent="Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36"
          />

          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>
                {lang === 'el' ? 'Φόρτωση σελίδας...' : 'Loading page...'}
              </Text>
            </View>
          )}

          {/* Extract Button */}
          <View style={styles.bottomBar}>
            <TouchableOpacity
              testID="extract-data-btn"
              style={[styles.extractBtn, (!pageLoaded || extracting) && styles.extractBtnDisabled]}
              onPress={handleExtract}
              disabled={!pageLoaded || extracting}
              activeOpacity={0.8}
            >
              {extracting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.extractBtnText}>
                  {lang === 'el' ? '📋 Εξαγωγή Δεδομένων' : '📋 Extract Data'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.surface },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 28, color: COLORS.primary, fontWeight: '600' },
  topTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center' },
  instructions: { backgroundColor: '#FFF9E6', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0E6B8' },
  instructionText: { fontSize: 13, color: '#8B7000', lineHeight: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  noWebviewIcon: { fontSize: 48, marginBottom: 16 },
  noWebviewTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center', marginBottom: 8 },
  noWebviewDesc: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  goBackBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 32, paddingVertical: 12, borderRadius: 50 },
  goBackText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  webview: { flex: 1 },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.9)' },
  loadingText: { fontSize: 15, color: COLORS.textSecondary, marginTop: 12 },
  bottomBar: { padding: 16, backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border },
  extractBtn: { backgroundColor: COLORS.primary, borderRadius: 50, paddingVertical: 16, alignItems: 'center' },
  extractBtnDisabled: { opacity: 0.5 },
  extractBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
