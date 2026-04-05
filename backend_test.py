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

def main():
    """Run all backend tests"""
    print("🚀 Starting GroceryTracker Backend API Tests")
    print(f"Backend URL: {BASE_URL}")
    print("=" * 60)
    
    tests = [
        ("API Root", test_api_root),
        ("Device Registration", test_device_registration),
        ("Epsilon Digital URL Detection", test_epsilon_digital_url_detection),
        ("WebView Data Import", test_webview_data_import),
        ("Stats Endpoint", test_stats_endpoint),
        ("Receipts Endpoint", test_receipts_endpoint),
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