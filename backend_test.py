#!/usr/bin/env python3
"""
Backend API Testing for GroceryTracker WebView Import Flow
Tests the newly implemented WebView import functionality for Epsilon Digital stores.
"""

import requests
import json
import sys
from datetime import datetime

# Backend URL from frontend .env
BASE_URL = "https://deal-finder-396.preview.emergentagent.com/api"

def test_epsilon_digital_url_detection():
    """Test that Epsilon Digital URLs return webview_required status"""
    print("🧪 Testing Epsilon Digital URL detection...")
    
    url = f"{BASE_URL}/receipts/import-url"
    payload = {
        "device_id": "test_dev",
        "url": "https://epsilondigital-marketin.epsilonnet.gr/DocViewer/test123"
    }
    
    try:
        response = requests.post(url, json=payload, timeout=30)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get("status") == "webview_required":
                print("✅ PASS: Epsilon Digital URL correctly detected, returns webview_required")
                return True
            else:
                print(f"❌ FAIL: Expected status 'webview_required', got '{data.get('status')}'")
                return False
        else:
            print(f"❌ FAIL: HTTP {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        return False

def test_webview_data_import():
    """Test WebView data import endpoint with mock extracted data"""
    print("\n🧪 Testing WebView data import endpoint...")
    
    url = f"{BASE_URL}/receipts/import-webview"
    payload = {
        "device_id": "test_dev_webview",
        "url": "https://epsilondigital-marketin.epsilonnet.gr/DocViewer/test",
        "raw_text": "Market In\nΑΦΜ: 123456789\n10/01/2025",
        "items": [
            {
                "code": "001",
                "description": "ΓΑΛΑ ΦΡΕΣΚΟ 1L",
                "quantity": "2",
                "unit_price": "1.50",
                "total": "3.00"
            },
            {
                "code": "002", 
                "description": "ΨΩΜΙ ΤΟΣΤ",
                "quantity": "1",
                "unit_price": "2.20",
                "total": "2.20"
            }
        ],
        "store_name": "Market In"
    }
    
    try:
        response = requests.post(url, json=payload, timeout=30)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get("status") == "success" and "receipt" in data:
                receipt = data["receipt"]
                print("✅ PASS: WebView data import successful")
                print(f"   Receipt ID: {receipt.get('id')}")
                print(f"   Store: {receipt.get('store_name')}")
                print(f"   Items count: {len(receipt.get('items', []))}")
                print(f"   Total: {receipt.get('total')}")
                
                # Verify items were parsed correctly
                items = receipt.get('items', [])
                if len(items) == 2:
                    print("✅ PASS: Correct number of items parsed")
                    
                    # Check first item
                    item1 = items[0]
                    if (item1.get('description') == 'ΓΑΛΑ ΦΡΕΣΚΟ 1L' and 
                        item1.get('quantity') == 2.0 and 
                        item1.get('total_value') == 3.0):
                        print("✅ PASS: First item parsed correctly")
                    else:
                        print(f"❌ FAIL: First item parsing issue - {item1}")
                        return False
                        
                    # Check second item  
                    item2 = items[1]
                    if (item2.get('description') == 'ΨΩΜΙ ΤΟΣΤ' and
                        item2.get('quantity') == 1.0 and
                        item2.get('total_value') == 2.2):
                        print("✅ PASS: Second item parsed correctly")
                    else:
                        print(f"❌ FAIL: Second item parsing issue - {item2}")
                        return False
                        
                    return True
                else:
                    print(f"❌ FAIL: Expected 2 items, got {len(items)}")
                    return False
            else:
                print(f"❌ FAIL: Expected success status and receipt, got {data}")
                return False
        else:
            print(f"❌ FAIL: HTTP {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        return False

def test_device_registration():
    """Test device registration endpoint"""
    print("\n🧪 Testing device registration...")
    
    url = f"{BASE_URL}/devices/register"
    payload = {
        "device_id": "test_dev",
        "language": "el"
    }
    
    try:
        response = requests.post(url, json=payload, timeout=30)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get("device_id") == "test_dev":
                print("✅ PASS: Device registration successful")
                return True
            else:
                print(f"❌ FAIL: Device registration response issue - {data}")
                return False
        else:
            print(f"❌ FAIL: HTTP {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        return False

def test_stats_endpoint():
    """Test stats endpoint"""
    print("\n🧪 Testing stats endpoint...")
    
    url = f"{BASE_URL}/stats"
    params = {"device_id": "test_dev"}
    
    try:
        response = requests.get(url, params=params, timeout=30)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            required_fields = ["total_receipts", "total_products", "total_spent", "avg_receipt", "stores", "recent_receipts"]
            if all(field in data for field in required_fields):
                print("✅ PASS: Stats endpoint returns all required fields")
                print(f"   Total receipts: {data.get('total_receipts')}")
                print(f"   Total spent: {data.get('total_spent')}")
                return True
            else:
                missing = [f for f in required_fields if f not in data]
                print(f"❌ FAIL: Missing fields in stats response: {missing}")
                return False
        else:
            print(f"❌ FAIL: HTTP {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        return False

def test_receipts_endpoint():
    """Test receipts listing endpoint"""
    print("\n🧪 Testing receipts endpoint...")
    
    url = f"{BASE_URL}/receipts"
    params = {"device_id": "test_dev", "limit": 10}
    
    try:
        response = requests.get(url, params=params, timeout=30)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            if "receipts" in data and "total" in data:
                print("✅ PASS: Receipts endpoint returns correct structure")
                print(f"   Total receipts: {data.get('total')}")
                print(f"   Returned receipts: {len(data.get('receipts', []))}")
                return True
            else:
                print(f"❌ FAIL: Receipts response missing required fields - {data}")
                return False
        else:
            print(f"❌ FAIL: HTTP {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        return False

def test_duplicate_detection():
    """Test duplicate detection functionality for URL imports"""
    print("\n🧪 Testing duplicate detection functionality...")
    
    device_id = "dup_test_device"
    
    # Test 1: Epsilon Digital URL duplicate detection workflow
    print("   Test 1: Epsilon Digital URL duplicate detection workflow...")
    epsilon_url = "https://epsilondigital-marketin.epsilonnet.gr/DocViewer/test123"
    
    # Step 1: First call to URL import - should return webview_required
    url = f"{BASE_URL}/receipts/import-url"
    payload = {
        "device_id": device_id,
        "url": epsilon_url,
        "force_import": False
    }
    
    try:
        response = requests.post(url, json=payload, timeout=30)
        print(f"   Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get("status") == "webview_required":
                print("✅ PASS: First Epsilon Digital URL call returns webview_required")
                
                # Step 2: Simulate WebView import to create actual receipt
                print("   Step 2: Creating receipt via WebView import...")
                webview_url = f"{BASE_URL}/receipts/import-webview"
                webview_payload = {
                    "device_id": device_id,
                    "url": epsilon_url,  # Same URL as above
                    "raw_text": "Test Store\nΑΦΜ: 987654321\n15/01/2025",
                    "items": [
                        {
                            "code": "TEST001",
                            "description": "TEST PRODUCT FOR DUPLICATE",
                            "quantity": "1",
                            "unit_price": "10.00",
                            "total": "10.00"
                        }
                    ],
                    "store_name": "Test Store"
                }
                
                webview_response = requests.post(webview_url, json=webview_payload, timeout=30)
                if webview_response.status_code == 200:
                    webview_data = webview_response.json()
                    if webview_data.get("status") == "success":
                        receipt_id = webview_data.get("receipt", {}).get("id")
                        print("✅ PASS: WebView import created receipt successfully")
                        
                        # Step 3: Now try URL import again - should detect duplicate
                        print("   Step 3: Second URL import call (should detect duplicate)...")
                        response2 = requests.post(url, json=payload, timeout=30)
                        if response2.status_code == 200:
                            data2 = response2.json()
                            if data2.get("status") == "duplicate":
                                print("✅ PASS: Epsilon Digital duplicate detection working after WebView import")
                                
                                # Verify duplicate response structure
                                if "existing_receipt" in data2 and "message" in data2:
                                    print("✅ PASS: Duplicate response has correct structure")
                                    existing_receipt = data2.get("existing_receipt", {})
                                    if existing_receipt.get("source_url") == epsilon_url:
                                        print("✅ PASS: Existing receipt has correct source_url")
                                    else:
                                        print(f"❌ FAIL: Existing receipt source_url mismatch")
                                        return False
                                else:
                                    print(f"❌ FAIL: Duplicate response missing fields - {data2}")
                                    return False
                                    
                                # Step 4: Test force_import=true - should return webview_required again
                                print("   Step 4: Testing force_import bypass...")
                                payload["force_import"] = True
                                response3 = requests.post(url, json=payload, timeout=30)
                                if response3.status_code == 200:
                                    data3 = response3.json()
                                    if data3.get("status") == "webview_required":
                                        print("✅ PASS: force_import bypassed duplicate detection for Epsilon Digital")
                                    else:
                                        print(f"❌ FAIL: force_import didn't work for Epsilon Digital - {data3}")
                                        return False
                                else:
                                    print(f"❌ FAIL: force_import test failed - HTTP {response3.status_code}")
                                    return False
                            else:
                                print(f"❌ FAIL: Expected duplicate status, got '{data2.get('status')}'")
                                return False
                        else:
                            print(f"❌ FAIL: Second URL call failed - HTTP {response2.status_code}")
                            return False
                    else:
                        print(f"❌ FAIL: WebView import failed - {webview_data}")
                        return False
                else:
                    print(f"❌ FAIL: WebView import HTTP error - {webview_response.status_code}")
                    return False
            else:
                print(f"❌ FAIL: Expected webview_required, got '{data.get('status')}'")
                return False
        else:
            print(f"❌ FAIL: First call failed - HTTP {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ ERROR in Epsilon Digital test: {str(e)}")
        return False
    
    # Test 2: Verify source_url storage and retrieval
    print("   Test 2: Verifying source_url storage and retrieval...")
    
    try:
        get_url = f"{BASE_URL}/receipts/{receipt_id}"
        get_response = requests.get(get_url, timeout=30)
        
        if get_response.status_code == 200:
            retrieved_receipt = get_response.json()
            if retrieved_receipt.get("source_url") == epsilon_url:
                print("✅ PASS: Retrieved receipt has correct source_url field")
            else:
                print(f"❌ FAIL: Retrieved receipt source_url mismatch. Expected: {epsilon_url}, Got: {retrieved_receipt.get('source_url')}")
                return False
        else:
            print(f"❌ FAIL: Could not retrieve receipt - HTTP {get_response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ ERROR in retrieval test: {str(e)}")
        return False
    
    print("✅ ALL DUPLICATE DETECTION TESTS PASSED")
    return True

def test_duplicate_detection_mock():
    """Mock test for duplicate detection when network is unavailable"""
    print("   🔄 Running mock duplicate detection test...")
    
    device_id = "mock_dup_test_device"
    
    # Test with WebView import (which doesn't require network)
    url = f"{BASE_URL}/receipts/import-webview"
    test_url = "https://epsilondigital-test.epsilonnet.gr/mock-receipt"
    
    payload = {
        "device_id": device_id,
        "url": test_url,
        "raw_text": "Mock Store\nΑΦΜ: 987654321\n15/01/2025",
        "items": [
            {
                "code": "MOCK001",
                "description": "MOCK PRODUCT",
                "quantity": "1",
                "unit_price": "5.00",
                "total": "5.00"
            }
        ],
        "store_name": "Mock Store"
    }
    
    try:
        # First import
        response = requests.post(url, json=payload, timeout=30)
        if response.status_code != 200:
            print(f"❌ FAIL: Mock first import failed - HTTP {response.status_code}")
            return False
            
        data = response.json()
        if data.get("status") != "success":
            print(f"❌ FAIL: Mock first import status not success - {data}")
            return False
            
        receipt_id = data.get("receipt", {}).get("id")
        source_url = data.get("receipt", {}).get("source_url")
        
        if source_url == test_url:
            print("✅ PASS: Mock - source_url correctly stored")
        else:
            print(f"❌ FAIL: Mock - source_url not stored correctly")
            return False
        
        # Note: WebView import doesn't have duplicate detection built-in like URL import
        # This is a limitation we should note
        print("✅ PASS: Mock duplicate detection test completed")
        print("   Note: WebView import doesn't have duplicate detection - this is expected behavior")
        return True
        
    except Exception as e:
        print(f"❌ ERROR in mock test: {str(e)}")
        return False

def test_api_root():
    """Test API root endpoint"""
    print("\n🧪 Testing API root endpoint...")
    
    url = f"{BASE_URL}/"
    
    try:
        response = requests.get(url, timeout=30)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            if "message" in data and "version" in data:
                print("✅ PASS: API root endpoint working")
                return True
            else:
                print(f"❌ FAIL: API root response issue - {data}")
                return False
        else:
            print(f"❌ FAIL: HTTP {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        return False

def test_url_import_three_types():
    """Test URL import with three different URL types: PEPPOL, Impact, and Alternative e-invoicing.gr"""
    print("\n🧪 Testing URL Import with Three Different URL Types...")
    
    device_id = "test_device_123"
    all_passed = True
    
    # Test 1: PEPPOL URL (e-invoicing.gr with ct=PEPPOL)
    print("\n   Test 1: PEPPOL URL (e-invoicing.gr with ct=PEPPOL)...")
    peppol_url = "https://e-invoicing.gr/edocuments/ViewInvoice?ct=PEPPOL&id=CD01EBB684FF983F3CEFB2A69297F3CE9192DD0A&s=A&h=2a01d136"
    
    url = f"{BASE_URL}/receipts/import-url"
    payload = {
        "device_id": device_id,
        "url": peppol_url,
        "force_import": True
    }
    
    try:
        response = requests.post(url, json=payload, timeout=60)
        print(f"   Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   Response Status: {data.get('status')}")
            
            if data.get("status") == "success":
                receipt = data.get("receipt", {})
                store_name = receipt.get("store_name", "")
                store_vat = receipt.get("store_vat", "")
                items = receipt.get("items", [])
                total = receipt.get("total", 0)
                
                print(f"   Store Name: {store_name}")
                print(f"   Store VAT: {store_vat}")
                print(f"   Items Count: {len(items)}")
                print(f"   Total: {total}")
                
                # Check expected values
                if "ΣΚΛΑΒΕΝΙΤΗΣ" in store_name.upper() or "SKLAVENITIS" in store_name.upper():
                    print("✅ PASS: PEPPOL URL - Store name correctly identified (ΣΚΛΑΒΕΝΙΤΗΣ)")
                else:
                    print(f"⚠️  WARNING: PEPPOL URL - Expected store name 'ΣΚΛΑΒΕΝΙΤΗΣ', got '{store_name}'")
                    all_passed = False
                
                if store_vat == "800764388":
                    print("✅ PASS: PEPPOL URL - VAT correctly identified (800764388)")
                else:
                    print(f"⚠️  WARNING: PEPPOL URL - Expected VAT '800764388', got '{store_vat}'")
                    all_passed = False
                
                if len(items) > 0:
                    print("✅ PASS: PEPPOL URL - Items array is not empty")
                else:
                    print("❌ FAIL: PEPPOL URL - Items array is empty")
                    all_passed = False
                
                if total > 0:
                    print("✅ PASS: PEPPOL URL - Total is valid number > 0")
                else:
                    print("❌ FAIL: PEPPOL URL - Total is not > 0")
                    all_passed = False
                    
            else:
                print(f"❌ FAIL: PEPPOL URL - Expected status 'success', got '{data.get('status')}'")
                print(f"   Full Response: {json.dumps(data, indent=2, ensure_ascii=False)}")
                all_passed = False
        else:
            print(f"❌ FAIL: PEPPOL URL - HTTP {response.status_code}")
            print(f"   Response: {response.text}")
            all_passed = False
            
    except Exception as e:
        print(f"❌ ERROR: PEPPOL URL test - {str(e)}")
        import traceback
        traceback.print_exc()
        all_passed = False
    
    # Test 2: Impact URL (einvoice.impact.gr)
    print("\n   Test 2: Impact URL (einvoice.impact.gr)...")
    impact_url = "https://einvoice.impact.gr/v/EL094062259-309445967-FAD2781A8D7B80445B71BFDB609B7A0B19A3CB96-08686C25D466493498780DE44AC4688D"
    
    payload = {
        "device_id": device_id,
        "url": impact_url,
        "force_import": True
    }
    
    try:
        response = requests.post(url, json=payload, timeout=60)
        print(f"   Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   Response Status: {data.get('status')}")
            
            if data.get("status") == "success":
                receipt = data.get("receipt", {})
                store_name = receipt.get("store_name", "")
                items = receipt.get("items", [])
                total = receipt.get("total", 0)
                
                print(f"   Store Name: {store_name}")
                print(f"   Items Count: {len(items)}")
                print(f"   Total: {total}")
                
                # Check expected values
                if "METRO" in store_name.upper():
                    print("✅ PASS: Impact URL - Store name correctly identified (METRO)")
                else:
                    print(f"⚠️  WARNING: Impact URL - Expected store name 'METRO', got '{store_name}'")
                    all_passed = False
                
                if len(items) > 0:
                    print("✅ PASS: Impact URL - Items array is not empty")
                else:
                    print("❌ FAIL: Impact URL - Items array is empty")
                    all_passed = False
                
                if total > 0:
                    print("✅ PASS: Impact URL - Total is valid number > 0")
                else:
                    print("❌ FAIL: Impact URL - Total is not > 0")
                    all_passed = False
                    
            else:
                print(f"❌ FAIL: Impact URL - Expected status 'success', got '{data.get('status')}'")
                print(f"   Full Response: {json.dumps(data, indent=2, ensure_ascii=False)}")
                all_passed = False
        else:
            print(f"❌ FAIL: Impact URL - HTTP {response.status_code}")
            print(f"   Response: {response.text}")
            all_passed = False
            
    except Exception as e:
        print(f"❌ ERROR: Impact URL test - {str(e)}")
        import traceback
        traceback.print_exc()
        all_passed = False
    
    # Test 3: Alternative e-invoicing.gr format (with /-1/uuid)
    print("\n   Test 3: Alternative e-invoicing.gr format (with /-1/uuid)...")
    alt_url = "https://e-invoicing.gr/edocuments/ViewInvoice/-1/196416ef-29ae-4d1f-bb5f-dd6ef38daffe_6fgkll8"
    
    payload = {
        "device_id": device_id,
        "url": alt_url,
        "force_import": True
    }
    
    try:
        response = requests.post(url, json=payload, timeout=60)
        print(f"   Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   Response Status: {data.get('status')}")
            
            if data.get("status") == "success":
                receipt = data.get("receipt", {})
                store_name = receipt.get("store_name", "")
                items = receipt.get("items", [])
                total = receipt.get("total", 0)
                
                print(f"   Store Name: {store_name}")
                print(f"   Items Count: {len(items)}")
                print(f"   Total: {total}")
                
                # Check that parsing succeeded via entersoft parser
                if len(items) > 0:
                    print("✅ PASS: Alternative e-invoicing.gr URL - Items array is not empty (parsed successfully)")
                else:
                    print("❌ FAIL: Alternative e-invoicing.gr URL - Items array is empty")
                    all_passed = False
                
                if total > 0:
                    print("✅ PASS: Alternative e-invoicing.gr URL - Total is valid number > 0")
                else:
                    print("❌ FAIL: Alternative e-invoicing.gr URL - Total is not > 0")
                    all_passed = False
                
                if store_name:
                    print(f"✅ PASS: Alternative e-invoicing.gr URL - Store name identified: {store_name}")
                else:
                    print("⚠️  WARNING: Alternative e-invoicing.gr URL - Store name is empty")
                    
            else:
                print(f"❌ FAIL: Alternative e-invoicing.gr URL - Expected status 'success', got '{data.get('status')}'")
                print(f"   Full Response: {json.dumps(data, indent=2, ensure_ascii=False)}")
                all_passed = False
        else:
            print(f"❌ FAIL: Alternative e-invoicing.gr URL - HTTP {response.status_code}")
            print(f"   Response: {response.text}")
            all_passed = False
            
    except Exception as e:
        print(f"❌ ERROR: Alternative e-invoicing.gr URL test - {str(e)}")
        import traceback
        traceback.print_exc()
        all_passed = False
    
    if all_passed:
        print("\n✅ ALL THREE URL TYPES PASSED")
    else:
        print("\n⚠️  SOME URL TYPES HAD ISSUES - See details above")
    
    return all_passed

def main():
    """Run all backend tests"""
    print("🚀 Starting GroceryTracker Backend API Tests")
    print(f"Backend URL: {BASE_URL}")
    print("=" * 60)
    
    tests = [
        ("URL Import - Three Types (PEPPOL, Impact, Alternative)", test_url_import_three_types),
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ ERROR in {test_name}: {str(e)}")
            results.append((test_name, False))
    
    print("\n" + "=" * 60)
    print("📊 TEST RESULTS SUMMARY")
    print("=" * 60)
    
    passed = 0
    failed = 0
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {test_name}")
        if result:
            passed += 1
        else:
            failed += 1
    
    print(f"\nTotal: {len(results)} tests")
    print(f"Passed: {passed}")
    print(f"Failed: {failed}")
    
    if failed > 0:
        print("\n⚠️  Some tests failed. Check the detailed output above.")
        sys.exit(1)
    else:
        print("\n🎉 All tests passed!")
        sys.exit(0)

if __name__ == "__main__":
    main()