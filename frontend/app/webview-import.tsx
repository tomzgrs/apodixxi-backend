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
      
      // Exclude very long hexadecimal strings (digital signatures)
      if (t.length > 50 && /^[0-9A-F]+$/.test(t)) return false;
      
      // Exclude Base64-like strings (digital signatures) - contain = at end or + /
      if (t.length > 30 && /[=+\/]/.test(text) && /^[A-Za-z0-9+\/=]+$/.test(text)) return false;
      
      // Exclude strings that look like hashes/signatures (mostly alphanumeric, very long)
      if (t.length > 40 && !/\s/.test(t)) return false;
      
      // Exclude UNIT OF MEASUREMENT words - these are NOT product descriptions!
      var unitWords = ['ΚΙΛΑ', 'ΚΙΛΆ', 'ΤΕΜΑΧΙΑ', 'ΤΕΜΆΧΙΑ', 'ΤΕΜ', 'ΛΙΤΡΑ', 'ΛΊΤΡΑ', 
                       'ΓΡΑΜΜΑΡΙΑ', 'ΜΕΤΡΑ', 'KILOS', 'PIECES', 'LITERS', 'GRAMS',
                       'KG', 'GR', 'LT', 'ML', 'PCS'];
      for (var u = 0; u < unitWords.length; u++) {
        if (t === unitWords[u]) return false;
      }
      
      // Exclude keywords - payment methods, totals, headers
      var excludes = ['ΣΥΝΟΛΟ', 'ΤΕΛΙΚ', 'ΚΑΘΑΡ', 'ΦΠΑ', 'ΠΛΗΡΩΤ', 
                     'ΥΠΟΣΥΝΟΛ', 'EFT', 'ΜΕΤΡΗΤ', 'ΚΑΡΤ', 'VISA',
                     'ΚΩΔΙΚΟΣ', 'ΠΕΡΙΓΡΑΦΗ', 'ΠΟΣΟΤΗΤΑ', 'ΤΙΜΗ', 'Α/Α', 'ΜΜ',
                     'ΣΧΟΛΙΑ', 'MASTERCARD', 'CREDIT', 'DEBIT', 
                     'PAYMENT', 'ΓΡΑΜΜΕΣ ΠΑΡΑΣΤΑΤΙΚΟΥ', 'ΣΥΝΟΛΑ ΠΑΡΑΣΤΑΤΙΚΟΥ',
                     'ΤΡΟΠΟΙ ΠΛΗΡΩΜΗΣ', 'ΤΡΟΠΟΣ ΠΛΗΡΩΜΗΣ', 'ΠΛΗΡΩΜΗ',
                     'ΜΟΝΑΔΑ ΜΕΤΡΗΣΗΣ', 'ΜΟΝΑΔΑ', 'ΜΕΤΡΗΣΗΣ'];
      for (var i = 0; i < excludes.length; i++) {
        if (t.includes(excludes[i]) || t === excludes[i]) return false;
      }
      
      // Exclude if it looks like a payment method pattern (POS / e-POS)
      if (/POS/.test(t) && /E-?POS/.test(t)) return false;
      if (/^POS\s*[\/\-\s]/.test(t)) return false;
      if (t === 'POS' || t === 'E-POS' || t === 'EPOS') return false;
      if (t.includes('POS /') || t.includes('POS/') || t.includes('/ E-POS') || t.includes('/E-POS')) return false;
      
      // Must contain at least one Greek or Latin letter
      if (!/[A-ZΑ-Ω]/.test(t)) return false;
      
      // Product descriptions usually have more than one word or are longer
      // Single short words like "Κιλά" should be excluded
      if (t.length < 6 && !/\s/.test(t)) return false;
      
      return true;
    }

    // Check if a table row is a payment/total row (not a product)
    function isPaymentOrTotalRow(rowText) {
      var t = rowText.toUpperCase();
      // Payment method markers
      if (t.includes('ΤΡΟΠΟΙ ΠΛΗΡΩΜΗΣ') || t.includes('ΤΡΟΠΟΣ ΠΛΗΡΩΜΗΣ')) return true;
      if (t.includes('ΣΥΝΟΛΑ ΠΑΡΑΣΤΑΤΙΚΟΥ')) return true;
      // Check for POS payment patterns anywhere in the row
      if (t.includes('POS /') || t.includes('POS/') || t.includes('/ E-POS') || t.includes('/E-POS')) return true;
      if (t.includes('POS') && t.includes('E-POS')) return true;  // Row contains both POS and e-POS
      // Row that is just payment methods
      if (/^\s*POS\s*[\/\-]/.test(t) || /^\s*E-?POS/.test(t)) return true;
      return false;
    }

    // Get all tables
    var tables = document.querySelectorAll('table');
    
    // First, find the header row to identify column indices
    var vatAmountColIndex = -1;  // Αξία ΦΠΑ column
    var netValueColIndex = -1;   // Καθαρή αξία column
    var descColIndex = -1;       // Περιγραφή column
    var qtyColIndex = -1;        // Ποσότητα column
    
    for (var ti = 0; ti < tables.length; ti++) {
      var headerRow = tables[ti].querySelector('tr');
      if (headerRow) {
        var headerCells = headerRow.querySelectorAll('th, td');
        for (var hi = 0; hi < headerCells.length; hi++) {
          var headerText = (headerCells[hi].innerText || '').toUpperCase().trim();
          if (headerText.includes('ΑΞΙΑ ΦΠΑ') || headerText === 'ΦΠΑ') {
            vatAmountColIndex = hi;
          } else if (headerText.includes('ΚΑΘΑΡΗ') || headerText.includes('ΚΑΘΑΡ')) {
            netValueColIndex = hi;
          } else if (headerText.includes('ΠΕΡΙΓΡΑΦΗ')) {
            descColIndex = hi;
          } else if (headerText.includes('ΠΟΣΟΤΗΤ') || headerText.includes('ΠΟΣΌΤΗΤ')) {
            qtyColIndex = hi;
          }
        }
      }
    }
    
    for (var ti = 0; ti < tables.length; ti++) {
      var rows = tables[ti].querySelectorAll('tr');
      
      for (var ri = 0; ri < rows.length; ri++) {
        var cells = rows[ri].querySelectorAll('td');
        if (cells.length < 3) continue;
        
        // Get full row text to check if it's a payment/total row
        var fullRowText = (rows[ri].innerText || '').toUpperCase();
        
        // Skip payment method rows and total rows
        if (fullRowText.includes('ΤΡΟΠΟΙ ΠΛΗΡΩΜΗΣ') || fullRowText.includes('ΤΡΟΠΟΣ ΠΛΗΡΩΜΗΣ')) continue;
        if (fullRowText.includes('ΣΥΝΟΛΑ ΠΑΡΑΣΤΑΤΙΚΟΥ') || fullRowText.includes('ΣΥΝΟΛΙΚΗ ΑΞΙΑ')) continue;
        if (fullRowText.includes('ΚΑΘΑΡΗ ΑΞΙΑ:') || fullRowText.includes('ΦΟΡΟΙ:') || fullRowText.includes('ΚΡΑΤΗΣΕΙΣ')) continue;
        if (fullRowText.includes('POS') && (fullRowText.includes('E-POS') || fullRowText.includes('/') || fullRowText.includes('-'))) continue;
        // Skip if row starts with POS
        if (/^\s*POS/.test(fullRowText)) continue;
        
        // Find description
        var description = '';
        var actualDescIndex = descColIndex >= 0 ? descColIndex : -1;
        
        // Try to find description in known column or search first few columns
        for (var di = 0; di < Math.min(cells.length, 4); di++) {
          var cellText = cells[di] ? cells[di].innerText.trim() : '';
          if (isValidDescription(cellText)) {
            description = cellText;
            actualDescIndex = di;
            break;
          }
        }
        
        if (!description) continue;
        
        // Get quantity
        var quantity = '1';
        var qtyValue = 1.0;
        var qtySearchStart = actualDescIndex + 1;
        var qtySearchEnd = Math.min(cells.length, actualDescIndex + 4);
        
        for (var qi = qtySearchStart; qi < qtySearchEnd; qi++) {
          var qText = cells[qi] ? cells[qi].innerText.trim().replace(',', '.') : '';
          if (/^\d+\.\d+$/.test(qText) && parseFloat(qText) < 1000) {
            qtyValue = parseFloat(qText);
            quantity = qText;
            break;
          } else if (/^\d+$/.test(qText) && parseInt(qText) < 100) {
            qtyValue = parseInt(qText);
            quantity = qText;
            break;
          }
        }
        
        // Find VAT amount and Net value from the row
        // In Epsilon Digital tables:
        // - Second to last numeric column = Αξία ΦΠΑ (VAT amount)
        // - Last numeric column = Καθαρή αξία (Net value)
        // Total price = Net + VAT
        
        var allPrices = [];
        for (var pi = actualDescIndex + 1; pi < cells.length; pi++) {
          var cellText = cells[pi] ? cells[pi].innerText.trim() : '';
          var price = parsePrice(cellText);
          if (price > 0) {
            allPrices.push(price);
          }
        }
        
        var vatAmount = 0;
        var netValue = 0;
        var finalPrice = 0;
        
        // We need at least 2 prices to get both VAT and Net
        if (allPrices.length >= 2) {
          netValue = allPrices[allPrices.length - 1];      // Last = Καθαρή αξία
          vatAmount = allPrices[allPrices.length - 2];     // Second to last = Αξία ΦΠΑ
          finalPrice = netValue + vatAmount;               // Total = Net + VAT
        } else if (allPrices.length === 1) {
          // Only one price found, use it as final price
          finalPrice = allPrices[0];
          netValue = allPrices[0];
        }
        
        if (finalPrice > 0) {
          result.items.push({
            code: '',
            description: description,
            unit: qtyValue < 1 ? 'Κιλά' : 'ΤΕΜ',
            quantity: quantity,
            unit_price: (finalPrice / qtyValue).toFixed(2),
            total: finalPrice.toFixed(2),
            net_value: netValue.toFixed(2),
            vat_amount: vatAmount.toFixed(2)
          });
        }
      }
    }
    
    // Find the TOTAL (Συνολική Αξία) from the page
    var totalPatterns = ['ΣΥΝΟΛΙΚΗ ΑΞΙΑ', 'ΣΥΝΟΛΙΚΉ ΑΞΊΑ', 'ΤΕΛΙΚΟ ΣΥΝΟΛΟ', 'ΠΛΗΡΩΤΕΟ'];
    var allText = document.body.innerText || '';
    var lines = allText.split('\\n');
    
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].toUpperCase();
      for (var tp = 0; tp < totalPatterns.length; tp++) {
        if (line.includes(totalPatterns[tp])) {
          var priceMatch = lines[i].match(/([\\d]+[,\\.][\\d]{2})/);
          if (priceMatch) {
            var totalVal = parseFloat(priceMatch[1].replace(',', '.'));
            if (totalVal > 0 && totalVal > result.found_final_total) {
              result.found_final_total = totalVal;
            }
          }
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
      
      // Set a timeout to reset if extraction takes too long
      const timeoutId = setTimeout(() => {
        setExtracting(false);
        setExtracted(false);
        Alert.alert(
          lang === 'el' ? 'Χρονικό όριο' : 'Timeout',
          lang === 'el' 
            ? 'Η εξαγωγή δεδομένων πήρε πολύ χρόνο. Βεβαιωθείτε ότι βλέπετε τα προϊόντα σε πίνακα (όχι PDF) και δοκιμάστε ξανά.'
            : 'Data extraction took too long. Make sure you see products in a table (not PDF) and try again.',
          [{ text: 'OK' }]
        );
      }, 15000); // 15 second timeout
      
      // Store timeout ID to clear it on success
      (webviewRef.current as any)._extractionTimeout = timeoutId;
      
      webviewRef.current.injectJavaScript(DOM_EXTRACTION_JS);
    }
  }, [extracting, lang]);

  const handleMessage = useCallback(async (event: any) => {
    try {
      // Clear timeout if it exists
      if (webviewRef.current && (webviewRef.current as any)._extractionTimeout) {
        clearTimeout((webviewRef.current as any)._extractionTimeout);
      }
      
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'extracted' && !extracted) {
        setExtracted(true);
        const data = msg.data;
        
        console.log('Extracted data:', JSON.stringify(data, null, 2));
        
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
            onLoadEnd={() => { 
              setLoading(false); 
              setPageLoaded(true);
              // Auto-switch from PDF to iframe view for Epsilon Digital sites
              if (pageUrl.includes('epsilondigital') || pageUrl.includes('epsilonnet')) {
                // Wait a bit for page elements to fully render
                setTimeout(() => {
                  webviewRef.current?.injectJavaScript(`
                    (function() {
                      try {
                        // Method 1: Find toggle by looking for element near "PDF" text
                        var allElements = document.querySelectorAll('*');
                        for (var i = 0; i < allElements.length; i++) {
                          var el = allElements[i];
                          var text = (el.innerText || el.textContent || '').trim();
                          // Find elements containing just "PDF"
                          if (text === 'PDF' || text.includes('PDF')) {
                            // Look for nearby toggle/switch elements (siblings or parent's siblings)
                            var parent = el.parentElement;
                            if (parent) {
                              var toggles = parent.querySelectorAll('input[type="checkbox"], input[type="radio"], .toggle, .switch, .slider, [class*="switch"], [class*="toggle"]');
                              toggles.forEach(function(t) {
                                if (t.checked || t.classList.contains('active') || t.classList.contains('on')) {
                                  t.click();
                                  console.log('Clicked toggle near PDF');
                                }
                              });
                              // Also check parent siblings
                              var grandparent = parent.parentElement;
                              if (grandparent) {
                                var moreToggles = grandparent.querySelectorAll('input[type="checkbox"], [class*="switch"], [class*="toggle"], [class*="slider"]');
                                moreToggles.forEach(function(t) {
                                  t.click();
                                  console.log('Clicked toggle in grandparent');
                                });
                              }
                            }
                            break;
                          }
                        }
                        
                        // Method 2: Try Bootstrap-style switches
                        var bootstrapSwitches = document.querySelectorAll('.custom-control-input, .form-check-input, .form-switch input');
                        bootstrapSwitches.forEach(function(sw) {
                          if (sw.checked) {
                            sw.click();
                          }
                        });
                        
                        // Method 3: Click any slider/round toggle
                        var sliders = document.querySelectorAll('.slider, .round, [class*="slider"], [class*="toggle-slider"]');
                        sliders.forEach(function(s) {
                          s.click();
                        });
                        
                      } catch(e) {
                        console.log('Auto-switch error:', e);
                      }
                    })();
                    true;
                  `);
                }, 1500); // Wait 1.5 seconds for page to fully load
              }
            }}
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
