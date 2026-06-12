import { useContext, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Platform, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { I18nContext } from './_layout';
import { COLORS } from '../src/constants';
import { api } from '../src/api';

let WebView: any = null;
try {
  WebView = require('react-native-webview').default;
} catch (e) {}

const buildExtractionJS = (nonce: string) => String.raw`
  (function() {
    var NONCE = ${JSON.stringify(nonce)};
    if (window._apodixxiExtracting) return;
    window._apodixxiExtracting = true;
    window._apodixxiExtractionStart = Date.now();

    // Κρύψε το Blazor reconnect overlay που μπλοκάρει/τυφλώνει τον parser, και ζήτα επανασύνδεση
    try { document.head.insertAdjacentHTML('beforeend', '<style>#components-reconnect-modal,[id*="reconnect"]{display:none!important}</style>'); } catch(e) {}
    try { window.Blazor.reconnect(); } catch(e) {}
    safePost({type:'DEBUG',step:'SCRIPT_START',ts:Date.now(),url:window.location.href.slice(0,120)});

    var attempts = 0;
    var maxAttempts = 20;
    var pollId = null;

    function safePost(msg) {
      var payload = JSON.stringify(msg);
      var t = 0;
      function send() {
        try {
          if (window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
            window.ReactNativeWebView.postMessage(payload);
          } else if (t < 8) { t++; setTimeout(send, 400); }
        } catch(e) { if (t < 8) { t++; setTimeout(send, 400); } }
      }
      send();
    }

    function parsePrice(text) {
      if (!text) return 0;
      var clean = text.replace(/[€\s]/g, '').trim();
      if (clean.includes('%')) return 0;
      if (/^\d+[,.]\d{3}$/.test(clean)) return 0;
      clean = clean.replace(',', '.');
      if (/^\d+(\.\d{1,2})?$/.test(clean)) return parseFloat(clean);
      return 0;
    }

    function isValidDescription(text) {
      if (!text || text.length < 3) return false;
      var t = text.toUpperCase().trim();
      if (t.length > 50 && /^[0-9A-F]+$/.test(t)) return false;
      if (t.length > 30 && /[=+\/]/.test(text) && /^[A-Za-z0-9+\/=]+$/.test(text)) return false;
      if (t.length > 40 && !/\s/.test(t)) return false;
      var excludes = ['ΣΥΝΟΛΟ','ΤΕΛΙΚ','ΚΑΘΑΡ','ΦΠΑ','ΠΛΗΡΩΤ','ΥΠΟΣΥΝΟΛ','EFT','ΜΕΤΡΗΤ',
                      'ΚΑΡΤ','VISA','ΚΩΔΙΚΟΣ','ΠΕΡΙΓΡΑΦΗ','ΠΟΣΟΤΗΤΑ','ΤΙΜΗ','Α/Α','ΜΜ',
                      'ΣΧΟΛΙΑ','MASTERCARD','CREDIT','DEBIT','PAYMENT','ΓΡΑΜΜΕΣ ΠΑΡΑΣΤΑΤΙΚΟΥ',
                      'ΣΥΝΟΛΑ ΠΑΡΑΣΤΑΤΙΚΟΥ','ΤΡΟΠΟΙ ΠΛΗΡΩΜΗΣ','ΤΡΟΠΟΣ ΠΛΗΡΩΜΗΣ','ΠΛΗΡΩΜΗ',
                      'ΜΟΝΑΔΑ ΜΕΤΡΗΣΗΣ','ΜΟΝΑΔΑ','ΕΚΠΤΩΣ'];
      for (var i = 0; i < excludes.length; i++) {
        if (t.includes(excludes[i])) return false;
      }
      if (t.includes('POS') && (t.includes('E-POS') || t.includes('/'))) return false;
      if (t === 'POS' || t === 'E-POS' || t === 'EPOS') return false;
      if (!/[A-ZΑ-Ω]/.test(t)) return false;
      return true;
    }

    function isUnitOfMeasurement(text) {
      if (!text) return false;
      var t = text.toUpperCase().trim();
      var units = ['ΚΙΛΑ','ΚΙΛΆ','ΤΕΜΑΧΙΑ','ΤΕΜΆΧΙΑ','ΤΕΜ','ΛΙΤΡΑ','ΛΊΤΡΑ','ΓΡΑΜΜΑΡΙΑ',
                   'ΜΕΤΡΑ','KILOS','PIECES','LITERS','GRAMS','KG','GR','LT','ML','PCS','ΤΕΜΑΧΙΟ','ΚΙΛΟ'];
      for (var i = 0; i < units.length; i++) { if (t === units[i]) return true; }
      return false;
    }

    function extractFromTables() {
      var items = [];
      var tables = document.querySelectorAll('table.k-table, table.k-grid-table, table');
      if (tables.length === 0) return items;
      safePost({type:'DEBUG',step:'TABLES_FOUND',count:tables.length,firstRows:tables[0]?tables[0].querySelectorAll('tr').length:0,firstCell:tables[0]&&tables[0].querySelector('td')?tables[0].querySelector('td').innerText.slice(0,80):'',ts:Date.now()});

      for (var ti = 0; ti < tables.length; ti++) {
        var rows = tables[ti].querySelectorAll('tr');
        for (var ri = 0; ri < rows.length; ri++) {
          var cells = rows[ri].querySelectorAll('td');
          if (cells.length < 2) continue;

          var fullRowText = (rows[ri].innerText || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
          if (fullRowText.includes('ΤΡΟΠΟΙ ΠΛΗΡΩΜΗΣ') || fullRowText.includes('ΤΡΟΠΟΣ ΠΛΗΡΩΜΗΣ')) continue;
          if (fullRowText.includes('ΣΥΝΟΛΑ ΠΑΡΑΣΤΑΤΙΚΟΥ') || fullRowText.includes('ΣΥΝΟΛΙΚΗ ΑΞΙΑ')) continue;
          if (fullRowText.includes('ΚΑΘΑΡΗ ΑΞΙΑ:') || fullRowText.includes('ΦΟΡΟΙ:')) continue;
          if (fullRowText.includes('POS') && (fullRowText.includes('E-POS') || fullRowText.includes('/'))) continue;
          if (/^\s*POS/.test(fullRowText)) continue;
          // Skip payment-method rows (e.g. "Μετρητά", "Επί πιστώσει") so they are not
          // counted as products and inflate the total.
          if (fullRowText.includes('ΜΕΤΡΗΤ') || fullRowText.includes('ΕΠΙ ΠΙΣΤΩΣ') || fullRowText.includes('ΠΙΣΤΩΣΕΙ')) continue;

          var description = '', actualDescIndex = -1, unitFound = '';
          var candidates = [];
          for (var di = 0; di < Math.min(cells.length, 6); di++) {
            var cellText = cells[di] ? cells[di].innerText.trim() : '';
            if (!cellText) continue;
            if (isUnitOfMeasurement(cellText)) { unitFound = cellText; continue; }
            if (/^\d+[,.]?\d*$/.test(cellText)) continue;
            if (/^\d+%$/.test(cellText)) continue;
            if (/^\d+[,.]\d{2}$/.test(cellText)) continue;
            if (cellText.length >= 3 && /[A-Za-zΑ-Ωα-ω]/.test(cellText)) {
              candidates.push({ text: cellText, index: di });
            }
          }
          if (candidates.length > 0) {
            candidates.sort(function(a,b){ return b.text.length - a.text.length; });
            for (var ci = 0; ci < candidates.length; ci++) {
              if (isValidDescription(candidates[ci].text)) {
                description = candidates[ci].text; actualDescIndex = candidates[ci].index; break;
              }
            }
            if (!description && candidates.length > 0) { description = candidates[0].text; actualDescIndex = candidates[0].index; }
          }
          if (!description) continue;

          var quantity = '1', qtyValue = 1.0;
          for (var qi = actualDescIndex + 1; qi < Math.min(cells.length, actualDescIndex + 6); qi++) {
            var rawQ = cells[qi] ? cells[qi].innerText.trim() : '';
            var qText = rawQ.replace(',', '.');
            var wm = rawQ.match(/^(\d+[,.]\d{1,3})\s*(KG|ΚΙΛΑ|Κιλ)/i);
            if (wm) { var wv2 = parseFloat(wm[1].replace(',','.')); if (wv2>0.001&&wv2<1000){qtyValue=wv2;quantity=String(wv2);unitFound=unitFound||'Κιλά';break;} }
            if (/^\d+\.\d+$/.test(qText)&&parseFloat(qText)<1000){qtyValue=parseFloat(qText);quantity=qText;break;}
            if (/^\d+$/.test(qText)&&parseInt(qText)>=1&&parseInt(qText)<100){qtyValue=parseInt(qText);quantity=qText;break;}
          }

          // Weight detection
          if (qtyValue === 1.0) {
            var unitUpper = (unitFound||'').toUpperCase();
            var isWt = (unitUpper==='ΚΙΛΑ'||unitUpper==='ΚΙΛΆ'||unitUpper==='KG'||unitUpper==='ΚΙΛΟ');
            if (isWt || /\bKG\b|\bΚΙΛ/i.test(description)) {
              var wFound = null;
              var wInDesc = description.match(/(\d+[,.]\d{1,3})\s*(?:KG|ΚΙΛΑ|ΚΙΛΆ|Κιλ)/i);
              if (wInDesc) { wFound = wInDesc[1]; description = description.replace(wInDesc[0],'').replace(/[\n\s]+/g,' ').trim(); }
              if (!wFound) {
                for (var wci=actualDescIndex+1;wci<cells.length;wci++){
                  var wRaw=cells[wci]?cells[wci].innerText.trim():'';
                  var wCM=wRaw.match(/^(\d+[,.]\d{1,3})\s*(?:KG|ΚΙΛΑ|ΚΙΛΆ|Κιλ)/i);
                  if(wCM){wFound=wCM[1];break;}
                }
              }
              if (!wFound && isWt) {
                for (var wci2=actualDescIndex+1;wci2<cells.length;wci2++){
                  var wRaw2=cells[wci2]?cells[wci2].innerText.trim():'';
                  if(isUnitOfMeasurement(wRaw2))continue;
                  var cM=wRaw2.match(/^(\d{1,4}),(\d{1,4})$/);
                  if(cM){var wv3=parseFloat(cM[1]+'.'+cM[2]);if(wv3>0.001&&wv3<100&&Math.abs(wv3-1.0)>0.005){wFound=wRaw2;break;}}
                }
              }
              if (wFound) { var wVal=parseFloat(String(wFound).replace(',','.'));if(wVal>0.001&&wVal<100&&Math.abs(wVal-1.0)>0.005){qtyValue=wVal;quantity=String(wVal);} }
            }
          }

          var allPrices = [];
          for (var pi=actualDescIndex+1;pi<cells.length;pi++){
            var ct=cells[pi]?cells[pi].innerText.trim():'';
            var pv=parsePrice(ct);
            if(pv>0) allPrices.push(pv);
          }
          var finalPrice = 0;
          if (allPrices.length>=2) { finalPrice=allPrices[allPrices.length-1]+allPrices[allPrices.length-2]; }
          else if (allPrices.length===1) { finalPrice=allPrices[0]; }

          if (finalPrice > 0) {
            items.push({ code:'', description:description,
              unit: unitFound||(qtyValue<1?'Κιλά':'Τεμάχια'),
              quantity: quantity,
              unit_price: (finalPrice/qtyValue).toFixed(2),
              total: finalPrice.toFixed(2) });
          }
        }
      }
      return items;
    }

    function extractFromRawText() {
      var items = [], usedDescs = {};
      var fbLines = (document.body ? document.body.innerText||'' : '').split('\n');
      for (var fli=0;fli<fbLines.length;fli++){
        var fline=fbLines[fli].trim();
        if(fline.length<4) continue;
        var flU=fline.toUpperCase();
        if(flU.includes('ΣΥΝΟΛΟ')||flU.includes('ΠΛΗΡΩΤ')||flU.includes('ΠΕΡΙΓΡΑΦΗ')||
           flU.includes('Α/Α')||flU.includes('ΑΞΙΑ ΦΠΑ')||flU.includes('ΤΕΛΙΚ')||
           flU.includes('ΚΑΘΑΡ')||flU.includes('ΕΚΠΤΩΣ')||flU.includes('POS')||
           flU.includes('MASTERCARD')||flU.includes('VISA')||flU.includes('ΤΡΟΠΟΣ')||
           flU.includes('ΜΕΙΚΤ')||flU.includes('ΦΠΑ %')||flU.includes('ΜΟΝΑΔΑ')) continue;
        var fparts=fline.split(/\t+|  +/);
        var fdesc='',fqty=1,fprices=[];
        for(var fpi=0;fpi<fparts.length;fpi++){
          var fp=fparts[fpi].trim(); if(!fp) continue;
          var fpv=parsePrice(fp);
          if(fpv>0.01&&fpv<50000){fprices.push(fpv);continue;}
          if(/^\d+$/.test(fp)&&parseInt(fp)<1000){if(fdesc)fqty=parseInt(fp);continue;}
          if(fp.length>=3&&/[A-Za-zΑ-Ωα-ω]/.test(fp)&&isValidDescription(fp)){
            fdesc=fdesc?fdesc+' '+fp:fp;
          }
        }
        if(fdesc&&fprices.length>0&&!usedDescs[fdesc]){
          var ftotal=fprices[fprices.length-1];
          if(ftotal>0){
            usedDescs[fdesc]=true;
            items.push({code:'',description:fdesc,unit:fqty<1?'Κιλά':'Τεμάχια',
              quantity:String(fqty),unit_price:(ftotal/Math.max(fqty,1)).toFixed(2),total:ftotal.toFixed(2)});
          }
        }
      }
      return items;
    }

    function doExtract() {
      attempts++;
      var _tbl = document.querySelectorAll('table.k-table,table.k-grid-table,table');
      safePost({type:'DEBUG',step:'POLL',attempt:attempts,ts:Date.now(),elapsed:Date.now()-window._apodixxiExtractionStart,tables:_tbl.length,bodyLen:document.body?document.body.innerText.length:0});
      // Κανάλι ΑΝΕΞΑΡΤΗΤΟ από τη γέφυρα: γράψε διαγνωστικά στον τίτλο (το RN τα διαβάζει μέσω onNavigationStateChange)
      try {
        var _fr = document.querySelectorAll('iframe,frame').length;
        var _rnw = (window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage==='function') ? 1 : 0;
        document.title = 'APX::a'+attempts+'|t'+_tbl.length+'|f'+_fr+'|b'+(document.body?document.body.innerText.length:0)+'|r'+_rnw;
      } catch(e){}
      try {
        var result = {store_name:'',store_vat:'',date:'',receipt_number:'',raw_text:'',items:[],found_final_total:0};
        result.raw_text = document.body ? (document.body.innerText||'') : '';

        var fullUrl=window.location.href.toLowerCase();
        var hostname=window.location.hostname.toLowerCase();
        if(hostname.includes('marketin')||fullUrl.includes('marketin')) result.store_name='MARKET IN';
        else if(hostname.includes('abmarket')||fullUrl.includes('abmarket')) result.store_name='ΑΒ ΒΑΣΙΛΟΠΟΥΛΟΣ';
        else if(hostname.includes('bazaar')||fullUrl.includes('bazaar')) result.store_name='BAZAAR';
        else if(hostname.includes('sklavenitis')||fullUrl.includes('sklavenitis')) result.store_name='ΣΚΛΑΒΕΝΙΤΗΣ';
        else if(hostname.includes('discountmarkt')||fullUrl.includes('discountmarkt')) result.store_name='DISCOUNT MARKT';
        else if(hostname.includes('kritikos')||fullUrl.includes('kritikos')||hostname.includes('kretikos')) result.store_name='ΚΡΗΤΙΚΟΣ';

        var vatMatch=result.raw_text.match(/(?:Α\.?Φ\.?Μ\.?|ΑΦΜ)\.?:?\s*([0-9][0-9\s\.]{7,11}[0-9])/i);
        if(vatMatch) result.store_vat=vatMatch[1].replace(/[^0-9]/g,'').substring(0,9);
        if(!result.store_vat||result.store_vat.length!==9){
          var vatFb=result.raw_text.match(/\b(0[0-9]{8})\b/);
          if(vatFb) result.store_vat=vatFb[1];
        }
        // VAT is authoritative: epsilonnet/epsilondigital is a shared e-invoicing portal used
        // by many chains (incl. ΚΡΗΤΙΚΟΣ on epsilondigital-3rdpartb), so never guess the store
        // from that hostname - map from the receipt's own VAT instead.
        var VAT_STORE_MAP={'800764388':'ΣΚΛΑΒΕΝΙΤΗΣ','094247924':'ΚΡΗΤΙΚΟΣ','094025817':'ΑΒ ΒΑΣΙΛΟΠΟΥΛΟΣ','094014249':'ΑΒ ΒΑΣΙΛΟΠΟΥΛΟΣ','094059506':'ΑΒ ΒΑΣΙΛΟΠΟΥΛΟΣ','094062259':'METRO','094063140':'ΜΑΣΟΥΤΗΣ','094063169':'ΜΑΣΟΥΤΗΣ','094116278':'ΓΑΛΑΞΙΑΣ','998771189':'MARKET IN','800469072':'MARKET IN','094384144':'BAZAAR','094288618':'BAZAAR','094357707':'DISCOUNT MARKT'};
        if(result.store_vat&&VAT_STORE_MAP[result.store_vat]) result.store_name=VAT_STORE_MAP[result.store_vat];

        var dateMatch=result.raw_text.match(/(\d{1,2}[\-\/\.]\d{1,2}[\-\/\.]\d{2,4})/);
        if(dateMatch) result.date=dateMatch[1];

        var rawLines=result.raw_text.split('\n');
        for(var li=0;li<rawLines.length;li++){
          var lineUp=rawLines[li].toUpperCase();
          if(lineUp.includes('ΤΕΛΙΚΗ ΑΞΙΑ')||lineUp.includes('ΠΛΗΡΩΤΕΟ')){
            var nums=rawLines[li].match(/(\d+)[,.](\d{2})/g);
            if(nums&&nums.length>0) result.found_final_total=parseFloat(nums[nums.length-1].replace(',','.'));
          }
        }

        result.items = extractFromTables();
        if(result.items.length===0) result.items = extractFromRawText();

        // Keep polling if no items yet and attempts remaining
        if(result.items.length===0 && attempts<maxAttempts) return;

        // Polling expired χωρίς προϊόντα → στείλε ΑΜΕΣΩΣ error ώστε να μην περιμένει το RN timeout
        if(result.items.length===0) {
          if(pollId) clearInterval(pollId);
          window._apodixxiPollId=null;
          window._apodixxiExtracting=false;
          var _dt=document.querySelectorAll('table').length;
          var _dr=document.querySelectorAll('tr').length;
          var _dc=document.querySelectorAll('td').length;
          safePost({type:'error', message:'Δεν βρέθηκαν προϊόντα μετά από '+attempts+' προσπάθειες. Βεβαιωθείτε ότι βλέπετε τα προϊόντα σε πίνακα (όχι PDF). [tables='+_dt+' rows='+_dr+' cells='+_dc+']'});
          try { document.title = 'APXERR::t'+_dt+'|r'+_dr+'|c'+_dc; } catch(e){}
          return;
        }

        if(pollId) clearInterval(pollId);
        window._apodixxiPollId=null;
        window._apodixxiExtracting = false;

        var itemsSum=0;
        for(var s=0;s<result.items.length;s++) itemsSum+=parseFloat(result.items[s].total)||0;
        result.found_final_total=Math.round(itemsSum*100)/100;

        var totalPatterns=['ΣΥΝΟΛΙΚΗ ΑΞΙΑ','ΣΥΝΟΛΙΚΉ ΑΞΊΑ','ΤΕΛΙΚΟ ΣΥΝΟΛΟ','ΠΛΗΡΩΤΕΟ','ΠΛΗΡΩΤΕΟ ΠΟΣΟ'];
        for(var i=0;i<rawLines.length;i++){
          var rlu=rawLines[i].toUpperCase();
          for(var tp=0;tp<totalPatterns.length;tp++){
            if(rlu.includes(totalPatterns[tp])){
              var pm=rawLines[i].match(/([\d]+[,.][\d]{2})/);
              if(pm){var tv=parseFloat(pm[1].replace(',','.'));if(tv>0&&Math.abs(tv-itemsSum)<itemsSum*0.15)result.found_final_total=tv;}
            }
          }
        }

        safePost({type:'DEBUG',step:'EXTRACTION_DONE',itemCount:result.items.length,ts:Date.now(),elapsed:Date.now()-window._apodixxiExtractionStart,storeName:result.store_name,totalFound:result.found_final_total});
        safePost({type:'extracted', data:result, nonce:NONCE});
        // Παράδοση δεδομένων ΚΑΙ μέσω τίτλου (fallback αν η γέφυρα postMessage είναι νεκρή)
        try {
          var _slim = {store_name:result.store_name,store_vat:result.store_vat,date:result.date,receipt_number:result.receipt_number,found_final_total:result.found_final_total,items:result.items};
          document.title = 'APXJSON::' + NONCE + '::' + JSON.stringify(_slim);
        } catch(e){}
      } catch(err) {
        // Οποιοδήποτε σφάλμα → στείλε ΑΜΕΣΩΣ error (μην περιμένεις την τελευταία προσπάθεια)
        if(pollId) clearInterval(pollId);
        window._apodixxiPollId=null;
        window._apodixxiExtracting=false;
        var _et=document.querySelectorAll('table').length;
        var _er=document.querySelectorAll('tr').length;
        var _ec=document.querySelectorAll('td').length;
        safePost({type:'error', message:'Σφάλμα εξαγωγής: '+err.toString()+' [tables='+_et+' rows='+_er+' cells='+_ec+']'});
        try { document.title = 'APXERR::e1|t'+_et+'|r'+_er+'|c'+_ec; } catch(e){}
      }
    }

    doExtract();
    window._apodixxiPollId = pollId = setInterval(doExtract, 1000);
  })();
  true;
  `;


export default function WebViewImportScreen() {
  const { url: rawUrl } = useLocalSearchParams<{ url: string }>();
  const pageUrl = rawUrl || '';
  // Κρύψε την οδηγία/χειρισμό του PDF διακόπτη για Σκλαβενίτη· δείξε την για ΑΒ Βασιλόπουλο (και τα υπόλοιπα).
  const showPdfToggle = !pageUrl.includes('sklavenitis');
  const { t, lang } = useContext(I18nContext);
  const router = useRouter();
  const webviewRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [pageLoaded, setPageLoaded] = useState(false);
  const [extracted, setExtracted] = useState(false);
  const lastDebugRef = useRef<any>(null);
  const extractionNonceRef = useRef<string | null>(null);
  
  // VAT Validation states
  const [showVatModal, setShowVatModal] = useState(false);
  const [unknownVat, setUnknownVat] = useState('');
  const [unknownStoreName, setUnknownStoreName] = useState('');
  const [pendingExtractedData, setPendingExtractedData] = useState<any>(null);
  const [sendingReview, setSendingReview] = useState(false);

  // Handle sending receipt for review
  const handleSendForReview = async () => {
    setSendingReview(true);
    try {
      await api.requestStoreReview(unknownVat, unknownStoreName, pageUrl);
      Alert.alert(
        t('thank_you'),
        t('review_request_sent'),
        [{ text: 'OK', onPress: () => { setShowVatModal(false); router.back(); } }]
      );
    } catch (e) {
      Alert.alert(t('error'), t('send_failed'));
    } finally {
      setSendingReview(false);
    }
  };

  // Proceed with import anyway (for known stores that weren't matched properly)
  const handleProceedAnyway = async () => {
    if (!pendingExtractedData) return;
    setShowVatModal(false);
    await saveExtractedData(pendingExtractedData);
  };

  // Save the extracted data to backend
  const saveExtractedData = async (data: any) => {
    try {
      const deviceId = await api.getDeviceId();
      const result = await api.importWebViewData({
        device_id: deviceId,
        url: pageUrl,
        raw_text: data.raw_text || '',
        items: data.items,
        store_name: data.store_name || '',
        store_vat: data.store_vat || '',
        found_final_total: data.found_final_total || 0,
      });
      Alert.alert(
        t('success'),
        t('receipt_imported'),
        [{ text: 'OK', onPress: () => router.replace(`/receipt/${result.receipt.id}`) }]
      );
    } catch (e: any) {
      Alert.alert(t('error'), e.message);
    }
  };

  const handleExtract = useCallback(() => {
    if (webviewRef.current && !extracting) {
      setExtracting(true);
      lastDebugRef.current = null;
      const nonce = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
      extractionNonceRef.current = nonce;
      
      // Set a timeout to reset if extraction takes too long
      const timeoutId = setTimeout(() => {
        extractionNonceRef.current = null;
        setExtracting(false);
        setExtracted(false);
        const d = lastDebugRef.current;
        const bridgeTxt = d && d.bridge !== undefined
          ? (d.bridge ? t('bridge_ok') : t('bridge_dead'))
          : '';
        const framesTxt = d && d.iframes !== undefined ? `, ${d.iframes} iframes` : '';
        const diag = d
          ? `\n\n${t('device_diagnostics')} ${d.attempt || 0} ${t('attempts_word')}, ${d.tables || 0} ${t('tables_word')}${framesTxt}, ${d.bodyLen || 0} ${t('chars_word')}${bridgeTxt}.`
          : t('no_message_from_page');
        Alert.alert(
          t('timeout'),
          t('extraction_timeout_msg') + diag,
          [{ text: 'OK' }]
        );
      }, 25000); // 25 second timeout (πάντα > JS polling 20s)
      
      // Store timeout ID to clear it on success
      (webviewRef.current as any)._extractionTimeout = timeoutId;
      
      // Reset any previous extraction state before starting new one
        webviewRef.current.injectJavaScript(`
          if (window._apodixxiPollId) { clearInterval(window._apodixxiPollId); }
          window._apodixxiExtracting = false;
          window._apodixxiPollId = null;
          true;
        `);
        setTimeout(() => {
          if (webviewRef.current) {
            webviewRef.current.injectJavaScript(buildExtractionJS(nonce));
          }
        }, 100);
    }
  }, [extracting, lang]);

  const handleMessage = useCallback(async (event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);

      // DEBUG POLL: κράτα τα διαγνωστικά αλλά ΜΗΝ ακυρώνεις το timeout (περίμενε terminal μήνυμα)
      if (msg.type === 'DEBUG') { lastDebugRef.current = msg; return; }

      // Terminal messages (extracted/error) clear the extraction timeout.
      const clearExtractionTimeout = () => {
        if (webviewRef.current && (webviewRef.current as any)._extractionTimeout) {
          clearTimeout((webviewRef.current as any)._extractionTimeout);
        }
      };

      if (msg.type === 'extracted' && !extracted) {
        // Trust boundary: only import data from an extraction WE initiated,
        // identified by a single-use nonce that our injected JS echoes back.
        // This stops a malicious/unexpected page from posting fabricated receipt
        // data through the WebView bridge or the document.title channel.
        if (!extractionNonceRef.current || msg.nonce !== extractionNonceRef.current) {
          return;
        }
        extractionNonceRef.current = null; // single-use: prevent replay
        clearExtractionTimeout();
        setExtracted(true);
        const data = msg.data;

        if (data.items && data.items.length > 0) {
          // Check if VAT is known
          const vatNumber = data.store_vat || '';
          
          if (vatNumber && vatNumber.length === 9) {
            // Validate VAT with backend
            try {
              const vatValidation = await api.validateVat(vatNumber);
              
              if (!vatValidation.is_known) {
                // Unknown VAT - show modal to ask user
                setUnknownVat(vatNumber);
                setUnknownStoreName(data.store_name || '');
                setPendingExtractedData(data);
                setShowVatModal(true);
                setExtracting(false);
                return;
              }
            } catch (e) {
              // If VAT validation fails, proceed anyway
            }
          }
          
          // VAT is known or no VAT found - proceed with import
          await saveExtractedData(data);
        } else {
          // No items - show raw text option
          Alert.alert(
            t('no_products_found'),
            t('no_structured_data'),
            [
              { text: t('try_again'), onPress: () => { setExtracted(false); setExtracting(false); } },
              { text: t('back'), onPress: () => router.back() },
            ]
          );
        }
        setExtracting(false);
      } else if (msg.type === 'error') {
        clearExtractionTimeout();
        Alert.alert(t('error'), msg.message);
        setExtracting(false);
      }
    } catch (e) {
      setExtracting(false);
    }
  }, [extracted, pageUrl, lang, router]);

  // Κανάλι ΑΝΕΞΑΡΤΗΤΟ από τη γέφυρα postMessage: διαβάζει δεδομένα/σφάλματα/διαγνωστικά από τον τίτλο της σελίδας.
  const handleNavState = useCallback((navState: any) => {
    const title = navState && navState.title;
    if (typeof title !== 'string') return;
    try {
      if (title.indexOf('APXJSON::') === 0) {
        const rest = title.slice(9);
        const sep = rest.indexOf('::');
        const nonce = sep >= 0 ? rest.slice(0, sep) : '';
        const data = JSON.parse(sep >= 0 ? rest.slice(sep + 2) : rest);
        handleMessage({ nativeEvent: { data: JSON.stringify({ type: 'extracted', data, nonce }) } } as any);
        return;
      }
      if (title.indexOf('APXERR::') === 0) {
        handleMessage({ nativeEvent: { data: JSON.stringify({ type: 'error', message: t('no_products_on_page') + '[' + title.slice(8) + ']' }) } } as any);
        return;
      }
      if (title.indexOf('APX::') === 0) {
        const m: any = { viaTitle: true };
        title.slice(5).split('|').forEach((p: string) => {
          const k = p[0];
          const v = parseInt(p.slice(1), 10);
          if (k === 'a') m.attempt = v;
          else if (k === 't') m.tables = v;
          else if (k === 'f') m.iframes = v;
          else if (k === 'b') m.bodyLen = v;
          else if (k === 'r') m.bridge = v;
        });
        lastDebugRef.current = m;
      }
    } catch (e) {
      // αγνόησε μη έγκυρους τίτλους
    }
  }, [handleMessage]);

  const webViewAvailable = WebView !== null && Platform.OS !== 'web';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity testID="webview-back-btn" onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel={t('back')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle} numberOfLines={1}>
          {t('import_btn')}
        </Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Instructions */}
      <View style={styles.instructions}>
        <Text style={styles.instructionText}>
          {t('instruction_1')}
        </Text>
        {showPdfToggle && (
          <View style={styles.pdfToggleInstruction}>
            <Text style={styles.instructionText}>
              {t('instruction_2_pdf')}
            </Text>
            <View style={styles.toggleExample}>
              <View style={styles.toggleTrack}>
                <View style={styles.toggleThumb} />
              </View>
            </View>
          </View>
        )}
        <Text style={styles.instructionText}>
          {`${showPdfToggle ? '3' : '2'}. ${t('instruction_tap_extract')}`}
        </Text>
      </View>

      {!webViewAvailable ? (
        <View style={styles.center}>
          <Text style={styles.noWebviewIcon}>🌐</Text>
          <Text style={styles.noWebviewTitle}>
            {t('webview_not_available')}
          </Text>
          <Text style={styles.noWebviewDesc}>
            {t('use_expo_go_xml')}
          </Text>
          <TouchableOpacity style={styles.goBackBtn} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t('back')}>
            <Text style={styles.goBackText}>{t('back')}</Text>
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
            }}
            onMessage={handleMessage}
            onNavigationStateChange={handleNavState}
            userAgent="Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36"
          />

          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>
                {t('loading_page')}
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
              accessibilityRole="button"
              accessibilityLabel={t('extract_data')}
            >
              {extracting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.extractBtnText}>
                  {t('extract_data')}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* VAT Validation Modal */}
      <Modal
        visible={showVatModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowVatModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconContainer}>
              <Ionicons name="alert-circle-outline" size={48} color="#F59E0B" />
            </View>
            
            <Text style={styles.modalTitle}>
              {t('unknown_store')}
            </Text>
            
            <Text style={styles.modalMessage}>
              {t('vat_not_found').replace('{vat}', unknownVat)}
            </Text>
            
            {unknownStoreName && (
              <Text style={styles.modalStoreName}>
                {t('store_label')}{unknownStoreName}
              </Text>
            )}
            
            <Text style={styles.modalQuestion}>
              {t('send_for_review_question')}
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalBtnSecondary}
                onPress={() => { setShowVatModal(false); router.back(); }}
                accessibilityRole="button"
                accessibilityLabel={t('no_cancel')}
              >
                <Text style={styles.modalBtnSecondaryText}>
                  {t('no_cancel')}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalBtnPrimary}
                onPress={handleSendForReview}
                disabled={sendingReview}
                accessibilityRole="button"
                accessibilityLabel={t('yes_send')}
              >
                {sendingReview ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.modalBtnPrimaryText}>
                    {t('yes_send')}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity 
              style={styles.modalProceedLink}
              onPress={handleProceedAnyway}
              accessibilityRole="button"
              accessibilityLabel={t('continue_without_sending')}
            >
              <Text style={styles.modalProceedLinkText}>
                {t('continue_without_sending')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  instructionText: { fontSize: 13, color: '#8B7000', lineHeight: 22 },
  pdfToggleInstruction: { flexDirection: 'row', alignItems: 'center', marginVertical: 4 },
  toggleExample: { marginLeft: 8 },
  toggleTrack: { width: 36, height: 20, borderRadius: 10, backgroundColor: '#3B82F6', justifyContent: 'center', paddingHorizontal: 2 },
  toggleThumb: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#FFFFFF', alignSelf: 'flex-end' },
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
  
  // VAT Modal Styles
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'center', 
    alignItems: 'center',
    padding: 20,
  },
  modalContent: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 20, 
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  modalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
  },
  modalStoreName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  modalQuestion: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  modalBtnSecondary: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalBtnSecondaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  modalBtnPrimary: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalBtnPrimaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalProceedLink: {
    paddingVertical: 8,
  },
  modalProceedLinkText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '500',
  },
});
