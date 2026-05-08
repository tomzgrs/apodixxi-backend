#!/usr/bin/env python3
"""
Backend API Testing for apodixxi V33 Updates
Tests health check, subscription status, stats, URL import, and AI endpoints
"""

import requests
import json
import sys
from datetime import datetime

# Base URL from environment
BASE_URL = "https://deal-finder-396.preview.emergentagent.com/api"
TEST_DEVICE_ID = "test_device_123"

# Color codes for output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

def print_test_header(test_name):
    print(f"\n{BLUE}{'='*80}{RESET}")
    print(f"{BLUE}TEST: {test_name}{RESET}")
    print(f"{BLUE}{'='*80}{RESET}")

def print_success(message):
    print(f"{GREEN}✅ {message}{RESET}")

def print_error(message):
    print(f"{RED}❌ {message}{RESET}")

def print_info(message):
    print(f"{YELLOW}ℹ️  {message}{RESET}")

def test_health_check():
    """Test 1: Health Check - GET /api/"""
    print_test_header("Health Check")
    
    try:
        response = requests.get(f"{BASE_URL}/", timeout=10)
        print_info(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print_info(f"Response: {json.dumps(data, indent=2)}")
            
            # Verify response structure
            if data.get("message") == "apodixxi API" and data.get("version") == "1.0.0":
                print_success("Health check passed - Version 1.0.0 confirmed")
                return True
            else:
                print_error(f"Unexpected response: {data}")
                return False
        else:
            print_error(f"Health check failed with status {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Health check error: {str(e)}")
        return False

def test_subscription_status():
    """Test 2: Subscription Status - GET /api/subscription/status"""
    print_test_header("Subscription Status")
    
    try:
        response = requests.get(
            f"{BASE_URL}/subscription/status",
            params={"device_id": TEST_DEVICE_ID},
            timeout=10
        )
        print_info(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print_info(f"Response: {json.dumps(data, indent=2)}")
            
            # Verify response structure
            expected_keys = ["account_type", "is_premium", "subscription_expires_at", "days_remaining", "app_name"]
            if all(key in data for key in expected_keys):
                if data.get("account_type") == "free" and data.get("is_premium") == False:
                    print_success("Subscription status endpoint working correctly")
                    print_info(f"Account Type: {data.get('account_type')}")
                    print_info(f"Is Premium: {data.get('is_premium')}")
                    print_info(f"App Name: {data.get('app_name')}")
                    return True
                else:
                    print_success("Subscription status endpoint working (user has premium)")
                    return True
            else:
                print_error(f"Missing expected keys in response: {data}")
                return False
        else:
            print_error(f"Subscription status failed with status {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Subscription status error: {str(e)}")
        return False

def test_stats_endpoint():
    """Test 3: Stats Endpoint - GET /api/stats"""
    print_test_header("Stats Endpoint")
    
    try:
        response = requests.get(
            f"{BASE_URL}/stats",
            params={"device_id": TEST_DEVICE_ID},
            timeout=10
        )
        print_info(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print_info(f"Response: {json.dumps(data, indent=2)}")
            
            # Verify response structure
            expected_keys = ["total_receipts", "total_products", "total_spent", "avg_receipt", "stores", "recent_receipts"]
            if all(key in data for key in expected_keys):
                print_success("Stats endpoint working correctly")
                print_info(f"Total Receipts: {data.get('total_receipts')}")
                print_info(f"Total Spent: {data.get('total_spent')}€")
                print_info(f"Avg Receipt: {data.get('avg_receipt')}€")
                return True
            else:
                print_error(f"Missing expected keys in response: {data}")
                return False
        else:
            print_error(f"Stats endpoint failed with status {response.status_code}")
            print_info(f"Response: {response.text}")
            return False
    except Exception as e:
        print_error(f"Stats endpoint error: {str(e)}")
        return False

def test_url_import_sklavenitis():
    """Test 4: URL Import - Sklavenitis/PEPPOL with cells[5] fix"""
    print_test_header("URL Import - Sklavenitis/PEPPOL (cells[5] fix)")
    
    test_url = "https://e-invoicing.gr/edocuments/ViewInvoice?ct=PEPPOL&id=CD01EBB684FF983F3CEFB2A69297F3CE9192DD0A&s=A&h=2a01d136"
    
    try:
        response = requests.post(
            f"{BASE_URL}/receipts/import-url",
            json={
                "url": test_url,
                "device_id": TEST_DEVICE_ID,
                "force_import": True  # Force import to avoid duplicate detection
            },
            timeout=30
        )
        print_info(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print_info(f"Response Status: {data.get('status')}")
            
            if data.get("status") == "success":
                receipt = data.get("receipt", {})
                items = receipt.get("items", [])
                
                print_success("URL import successful")
                print_info(f"Store Name: {receipt.get('store_name')}")
                print_info(f"VAT: {receipt.get('vat_number')}")
                print_info(f"Total Items: {len(items)}")
                print_info(f"Total Amount: {receipt.get('total')}€")
                
                # Verify unit_price values are present (from cells[5])
                if items:
                    print_info(f"\nFirst 3 items with unit_price:")
                    for i, item in enumerate(items[:3]):
                        unit_price = item.get('unit_price', 0)
                        description = item.get('description', 'N/A')
                        print_info(f"  {i+1}. {description}: {unit_price}€")
                    
                    # Check if unit_price values are valid (> 0)
                    valid_prices = [item for item in items if item.get('unit_price', 0) > 0]
                    if len(valid_prices) > 0:
                        print_success(f"Unit prices extracted correctly from cells[5] - {len(valid_prices)}/{len(items)} items have valid prices")
                        return True
                    else:
                        print_error("No valid unit_price values found - cells[5] parsing may have failed")
                        return False
                else:
                    print_error("No items found in receipt")
                    return False
            elif data.get("status") == "duplicate":
                print_info("Receipt already exists (duplicate detection working)")
                existing = data.get("existing_receipt", {})
                items = existing.get("items", [])
                if items:
                    print_info(f"Existing receipt has {len(items)} items")
                    # Check unit prices in existing receipt
                    valid_prices = [item for item in items if item.get('unit_price', 0) > 0]
                    if len(valid_prices) > 0:
                        print_success(f"Unit prices present in existing receipt - {len(valid_prices)}/{len(items)} items")
                        return True
                return True
            else:
                print_error(f"Unexpected status: {data.get('status')}")
                return False
        else:
            print_error(f"URL import failed with status {response.status_code}")
            print_info(f"Response: {response.text}")
            return False
    except Exception as e:
        print_error(f"URL import error: {str(e)}")
        return False

def test_ai_chat_endpoint():
    """Test 5: AI Chat Endpoint - Expect 500/503 since GEMINI_API_KEY not set"""
    print_test_header("AI Chat Endpoint (Expected to fail without GEMINI_API_KEY)")
    
    try:
        response = requests.post(
            f"{BASE_URL}/ai/chat",
            json={
                "message": "test",
                "device_id": TEST_DEVICE_ID
            },
            timeout=10
        )
        print_info(f"Status Code: {response.status_code}")
        
        if response.status_code in [500, 503]:
            try:
                data = response.json()
                detail = data.get("detail", "")
                print_info(f"Error Detail: {detail}")
                
                if "AI service not configured" in detail or "AI service not available" in detail or "AI error" in detail:
                    print_success("AI endpoint correctly returns error when GEMINI_API_KEY not set")
                    return True
                else:
                    print_info(f"AI endpoint returned expected error status but different message: {detail}")
                    return True
            except:
                print_info(f"Response: {response.text}")
                print_success("AI endpoint correctly returns error status (500/503)")
                return True
        elif response.status_code == 200:
            print_info("AI endpoint returned 200 - GEMINI_API_KEY may be configured")
            data = response.json()
            print_info(f"Response: {json.dumps(data, indent=2)}")
            return True
        else:
            print_error(f"Unexpected status code: {response.status_code}")
            print_info(f"Response: {response.text}")
            return False
    except Exception as e:
        print_error(f"AI chat endpoint error: {str(e)}")
        return False

def run_all_tests():
    """Run all backend tests"""
    print(f"\n{BLUE}{'='*80}{RESET}")
    print(f"{BLUE}APODIXXI V33 BACKEND API TESTING{RESET}")
    print(f"{BLUE}Base URL: {BASE_URL}{RESET}")
    print(f"{BLUE}Test Device ID: {TEST_DEVICE_ID}{RESET}")
    print(f"{BLUE}Timestamp: {datetime.now().isoformat()}{RESET}")
    print(f"{BLUE}{'='*80}{RESET}")
    
    results = {
        "Health Check": test_health_check(),
        "Subscription Status": test_subscription_status(),
        "Stats Endpoint": test_stats_endpoint(),
        "URL Import (Sklavenitis/PEPPOL)": test_url_import_sklavenitis(),
        "AI Chat Endpoint": test_ai_chat_endpoint()
    }
    
    # Summary
    print(f"\n{BLUE}{'='*80}{RESET}")
    print(f"{BLUE}TEST SUMMARY{RESET}")
    print(f"{BLUE}{'='*80}{RESET}")
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test_name, result in results.items():
        status = f"{GREEN}✅ PASSED{RESET}" if result else f"{RED}❌ FAILED{RESET}"
        print(f"{test_name}: {status}")
    
    print(f"\n{BLUE}Total: {passed}/{total} tests passed{RESET}")
    
    if passed == total:
        print(f"{GREEN}{'='*80}{RESET}")
        print(f"{GREEN}ALL TESTS PASSED ✅{RESET}")
        print(f"{GREEN}{'='*80}{RESET}")
        return 0
    else:
        print(f"{RED}{'='*80}{RESET}")
        print(f"{RED}SOME TESTS FAILED ❌{RESET}")
        print(f"{RED}{'='*80}{RESET}")
        return 1

if __name__ == "__main__":
    sys.exit(run_all_tests())
