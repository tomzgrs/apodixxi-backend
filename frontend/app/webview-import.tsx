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
      items: []
    };

    // Get all visible text for backup parsing
    result.raw_text = document.body.innerText || '';

    // Extract store name from URL domain
    var urlMatch = window.location.hostname.match(/epsilondigital-([a-z]+)/i);
    if (urlMatch) {
      var storeDomain = urlMatch[1].toLowerCase();
      if (storeDomain === 'marketin' || storeDomain === 'market-in') {
        result.store_name = 'MARKET IN';
      } else if (storeDomain === 'abmarket' || storeDomain === 'ab') {
        result.store_name = 'ΑΒ ΒΑΣΙΛΟΠΟΥΛΟΣ';
      } else if (storeDomain === 'bazaar') {
        result.store_name = 'BAZAAR';
      } else if (storeDomain === 'sklavenitis') {
        result.store_name = 'ΣΚΛΑΒΕΝΙΤΗΣ';
      }
    }

    // Extract VAT number
    var vatMatch = result.raw_text.match(/(?:Α\\.?Φ\\.?Μ\\.?|ΑΦΜ)[:\\s]*([0-9]{9})/i);
    if (vatMatch) result.store_vat = vatMatch[1];

    // Extract date
    var dateMatch = result.raw_text.match(/(\\d{1,2}[\\-\\/\\.]\\d{1,2}[\\-\\/\\.]\\d{2,4})/);
    if (dateMatch) result.date = dateMatch[1];

    // Extract receipt number
    var receiptMatch = result.raw_text.match(/(?:Αρ\\.?\\s*Παραστ|Αριθμός|Αρ\\.\\s*Τιμολ)[^\\d]*(\\d+)/i);
    if (receiptMatch) result.receipt_number = receiptMatch[1];

    // Function to check if a row is the TOTAL row (should be excluded)
    function isTotalRow(text) {
      if (!text) return false;
      var t = text.toUpperCase();
      return t === 'ΣΥΝΟΛΟ' || t === 'ΣΥΝΟΛΑ' || t === 'ΤΕΛΙΚΟ' || 
             t === 'TOTAL' || t === 'ΠΛΗΡΩΤΕΟ' || /^\\d+[,.]\\d{2}$/.test(text.trim());
    }

    // Function to check if a row is a payment method (should be excluded)
    function isPaymentRow(text) {
      if (!text) return false;
      var t = text.toUpperCase();
      return t.includes('EFT-POS') || t.includes('EFT POS') || t.includes('EFTPOS') ||
             t.includes('POS') || t.includes('ΜΕΤΡΗΤΑ') || t.includes('ΚΑΡΤΑ') ||
             t.includes('CASH') || t.includes('CARD') || t.includes('ΠΛΗΡΩΜ') ||
             t.includes('VISA') || t.includes('MASTERCARD') || t.includes('CREDIT') ||
             t.includes('DEBIT') || t.includes('PAYMENT') || t.includes('ΑΠΟΔ');
    }

    // Try MudBlazor DataGrid/Table (Epsilon Digital uses this)
    var mudRows = document.querySelectorAll('.mud-table-body tr, .mud-table-row, [class*="mud-table"] tbody tr');
    for (var m = 0; m < mudRows.length; m++) {
      var mcells = mudRows[m].querySelectorAll('td, .mud-table-cell');
      if (mcells.length >= 3) {
        var codeText = mcells[0] ? mcells[0].innerText.trim() : '';
        var descText = mcells[1] ? mcells[1].innerText.trim() : '';
        
        // Skip header rows and total rows
        if (/^(Κωδ|Περιγρ|Α\\/Α|#|Code|Desc|Ποσότητα|Τιμή|Αξία)/i.test(descText)) continue;
        if (!descText || descText.length < 2) continue;
        if (isTotalRow(descText)) continue;
        if (isTotalRow(codeText)) continue;
        if (isPaymentRow(descText)) continue;
        if (isPaymentRow(codeText)) continue;

        // Find ALL columns with prices and get the LAST one (usually with VAT)
        var totalText = '0';
        var allPrices = [];
        for (var c = 0; c < mcells.length; c++) {
          var cellVal = mcells[c] ? mcells[c].innerText.trim() : '';
          // Match price format (with optional € symbol)
          var priceMatch = cellVal.replace('€', '').trim().match(/^(\\d+[,.]\\d{2})$/);
          if (priceMatch) {
            allPrices.push({index: c, value: priceMatch[1]});
          }
        }
        // Get the last price (should be total with VAT)
        if (allPrices.length > 0) {
          totalText = allPrices[allPrices.length - 1].value;
        }

        // Get quantity (usually 3rd column)
        var qtyText = mcells.length > 2 ? mcells[2].innerText.trim() : '1';
        
        // Get unit price (usually column before total or after quantity)
        var priceText = totalText;
        if (mcells.length > 4) {
          var possiblePrice = mcells[mcells.length - 2] ? mcells[mcells.length - 2].innerText.trim() : '';
          if (/^\\d+[,.]\\d{2}/.test(possiblePrice.replace('€', '').trim())) {
            priceText = possiblePrice;
          }
        }

        var mitem = {
          code: codeText,
          description: descText,
          unit: 'ΤΕΜ',
          quantity: qtyText.replace(',', '.'),
          unit_price: priceText.replace(',', '.').replace('€', '').trim(),
          total: totalText.replace(',', '.').replace('€', '').trim()
        };

        // DO NOT deduplicate - same product can appear multiple times!
        if (mitem.description && !isTotalRow(mitem.description) && !isPaymentRow(mitem.description)) {
          result.items.push(mitem);
        }
      }
    }

    // Try standard HTML tables if MudBlazor didn't find items
    if (result.items.length === 0) {
      var tables = document.querySelectorAll('table');
      for (var t = 0; t < tables.length; t++) {
        var rows = tables[t].querySelectorAll('tbody tr, tr');
        for (var r = 0; r < rows.length; r++) {
          var cells = rows[r].querySelectorAll('td');
          if (cells.length >= 3) {
            var code = cells[0] ? cells[0].innerText.trim() : '';
            var desc = cells[1] ? cells[1].innerText.trim() : '';
            
            // Skip headers and totals
            if (/^(Κωδ|Περιγρ|Α\\/Α|#|Σύνολο|Code|Desc|Αξία)/i.test(desc)) continue;
            if (!desc || desc.length < 2) continue;
            if (isTotalRow(desc) || isTotalRow(code)) continue;
            if (isPaymentRow(desc) || isPaymentRow(code)) continue;

            // Get last price column as total
            var total = '0';
            for (var ci = cells.length - 1; ci >= 0; ci--) {
              var cv = cells[ci] ? cells[ci].innerText.trim() : '';
              if (/^\\d+[,.]\\d{2}/.test(cv.replace('€', '').trim())) {
                total = cv;
                break;
              }
            }

            var item = {
              code: code,
              description: desc,
              quantity: cells.length > 2 ? cells[2].innerText.trim().replace(',', '.') : '1',
              unit_price: total.replace(',', '.').replace('€', '').trim(),
              total: total.replace(',', '.').replace('€', '').trim()
            };
            
            // DO NOT deduplicate!
            if (item.description && !isTotalRow(item.description)) {
              result.items.push(item);
            }
          }
        }
      }
    }

    // Post result to React Native
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
