"""
Backend API Tests for GroceryTracker
Tests all API endpoints with real URLs and data validation
"""
import pytest
import requests
import os

# Read from frontend .env file
import sys
sys.path.insert(0, '/app/frontend')
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path('/app/frontend/.env'))
BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    raise ValueError("EXPO_PUBLIC_BACKEND_URL not set in /app/frontend/.env")
API_BASE = f"{BASE_URL}/api"

# Test URLs from agent context
TEST_URLS = {
    'sklavenitis': 'https://e-invoicing.gr/edocuments/ViewInvoice?ct=PEPPOL&id=CD01EBB684FF983F3CEFB2A69297F3CE9192DD0A&s=A&h=2a01d136',
    'masoutis': 'https://e-invoicing.gr/edocuments/ViewInvoice/-1/196416ef-29ae-4d1f-bb5f-dd6ef38daffe_6fgkll8',
    'jumbo': 'https://e-invoicing.gr/edocuments/ViewInvoice/-1/46ba6325-4688-4e61-9d19-a7cdc0cf77e0_b3hghk78',
    'mymarket': 'https://einvoice.impact.gr/v/EL094062259-326282007-A2B24EF8735214A76841F3EC40CF786F822AA2E8-6130BFADF436440E90A0EAD1CCEC8CAB',
    'epsilon_digital': 'https://epsilondigital.gr/some-receipt-url'
}

TEST_DEVICE_ID = 'test_dev_1'

@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


class TestHealthCheck:
    """Basic health check"""
    
    def test_api_root(self, api_client):
        """Test API root endpoint"""
        response = api_client.get(f"{API_BASE}/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "version" in data
        print(f"✓ API root: {data}")


class TestDeviceRegistration:
    """Device registration tests"""
    
    def test_register_device(self, api_client):
        """Test device registration"""
        payload = {
            "device_id": f"TEST_{TEST_DEVICE_ID}",
            "language": "el"
        }
        response = api_client.post(f"{API_BASE}/devices/register", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert data["device_id"] == payload["device_id"]
        print(f"✓ Device registered: {data}")
    
    def test_register_device_update(self, api_client):
        """Test device registration update (existing device)"""
        payload = {
            "device_id": TEST_DEVICE_ID,
            "language": "en"
        }
        response = api_client.post(f"{API_BASE}/devices/register", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] in ["registered", "updated"]
        print(f"✓ Device update: {data}")


class TestURLImport:
    """URL import tests for different providers"""
    
    def test_import_sklavenitis_url(self, api_client):
        """Test Σκλαβενίτης URL import (Entersoft)"""
        payload = {
            "device_id": TEST_DEVICE_ID,
            "url": TEST_URLS['sklavenitis']
        }
        response = api_client.post(f"{API_BASE}/receipts/import-url", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "receipt" in data
        receipt = data["receipt"]
        assert receipt["device_id"] == TEST_DEVICE_ID
        assert receipt["source_type"] == "entersoft"
        assert len(receipt["items"]) > 0
        assert receipt["total"] > 0
        assert "id" in receipt
        print(f"✓ Σκλαβενίτης import: {receipt['store_name']}, {len(receipt['items'])} items, €{receipt['total']}")
    
    def test_import_jumbo_url(self, api_client):
        """Test Jumbo URL import (Entersoft)"""
        payload = {
            "device_id": TEST_DEVICE_ID,
            "url": TEST_URLS['jumbo']
        }
        response = api_client.post(f"{API_BASE}/receipts/import-url", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        receipt = data["receipt"]
        assert receipt["source_type"] == "entersoft"
        assert len(receipt["items"]) > 0
        assert receipt["total"] > 0
        print(f"✓ Jumbo import: {receipt['store_name']}, {len(receipt['items'])} items, €{receipt['total']}")
    
    def test_import_mymarket_url(self, api_client):
        """Test My Market URL import (Impact)"""
        payload = {
            "device_id": TEST_DEVICE_ID,
            "url": TEST_URLS['mymarket']
        }
        response = api_client.post(f"{API_BASE}/receipts/import-url", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        receipt = data["receipt"]
        assert receipt["source_type"] == "impact"
        assert len(receipt["items"]) > 0
        assert receipt["total"] > 0
        print(f"✓ My Market import: {receipt['store_name']}, {len(receipt['items'])} items, €{receipt['total']}")
    
    def test_reject_epsilon_digital_url(self, api_client):
        """Test Epsilon Digital URL rejection"""
        payload = {
            "device_id": TEST_DEVICE_ID,
            "url": TEST_URLS['epsilon_digital']
        }
        response = api_client.post(f"{API_BASE}/receipts/import-url", json=payload)
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        assert "Epsilon Digital" in data["detail"] or "XML" in data["detail"]
        print(f"✓ Epsilon Digital rejected: {data['detail']}")
    
    def test_reject_unknown_url(self, api_client):
        """Test unknown provider URL rejection"""
        payload = {
            "device_id": TEST_DEVICE_ID,
            "url": "https://unknown-provider.com/receipt/123"
        }
        response = api_client.post(f"{API_BASE}/receipts/import-url", json=payload)
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        print(f"✓ Unknown provider rejected: {data['detail']}")


class TestReceiptRetrieval:
    """Receipt retrieval and search tests"""
    
    def test_get_receipts(self, api_client):
        """Test GET receipts for device"""
        response = api_client.get(f"{API_BASE}/receipts?device_id={TEST_DEVICE_ID}")
        assert response.status_code == 200
        data = response.json()
        assert "receipts" in data
        assert "total" in data
        assert isinstance(data["receipts"], list)
        assert data["total"] >= 0
        print(f"✓ Get receipts: {data['total']} receipts found")
        
        # Verify data structure if receipts exist
        if data["receipts"]:
            receipt = data["receipts"][0]
            assert "id" in receipt
            assert "store_name" in receipt
            assert "total" in receipt
            assert "items" in receipt
            assert "_id" not in receipt  # MongoDB _id should be excluded
            print(f"  First receipt: {receipt['store_name']}, €{receipt['total']}")
    
    def test_get_receipts_with_search(self, api_client):
        """Test GET receipts with search query"""
        response = api_client.get(f"{API_BASE}/receipts?device_id={TEST_DEVICE_ID}&search=ΓΑΛΑ")
        assert response.status_code == 200
        data = response.json()
        assert "receipts" in data
        print(f"✓ Search receipts: {len(data['receipts'])} results for 'ΓΑΛΑ'")
    
    def test_get_single_receipt(self, api_client):
        """Test GET single receipt by ID"""
        # First get list of receipts
        list_response = api_client.get(f"{API_BASE}/receipts?device_id={TEST_DEVICE_ID}")
        receipts = list_response.json()["receipts"]
        
        if not receipts:
            pytest.skip("No receipts available for testing")
        
        receipt_id = receipts[0]["id"]
        response = api_client.get(f"{API_BASE}/receipts/{receipt_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == receipt_id
        assert "items" in data
        assert "_id" not in data
        print(f"✓ Get single receipt: {data['store_name']}, {len(data['items'])} items")
    
    def test_get_nonexistent_receipt(self, api_client):
        """Test GET nonexistent receipt returns 404"""
        response = api_client.get(f"{API_BASE}/receipts/nonexistent-id-12345")
        assert response.status_code == 404
        print("✓ Nonexistent receipt returns 404")


class TestStats:
    """Statistics endpoint tests"""
    
    def test_get_stats(self, api_client):
        """Test GET stats for device"""
        response = api_client.get(f"{API_BASE}/stats?device_id={TEST_DEVICE_ID}")
        assert response.status_code == 200
        data = response.json()
        
        # Verify all required fields
        assert "total_receipts" in data
        assert "total_products" in data
        assert "total_spent" in data
        assert "avg_receipt" in data
        assert "stores" in data
        assert "recent_receipts" in data
        
        # Verify data types
        assert isinstance(data["total_receipts"], int)
        assert isinstance(data["total_products"], int)
        assert isinstance(data["total_spent"], (int, float))
        assert isinstance(data["avg_receipt"], (int, float))
        assert isinstance(data["stores"], list)
        assert isinstance(data["recent_receipts"], list)
        
        print(f"✓ Stats: {data['total_receipts']} receipts, €{data['total_spent']} spent, {len(data['stores'])} stores")
        
        # Verify store structure
        if data["stores"]:
            store = data["stores"][0]
            assert "name" in store
            assert "count" in store
            assert "total" in store
            print(f"  Top store: {store['name']} ({store['count']} visits, €{store['total']})")


class TestProductComparison:
    """Product comparison tests"""
    
    def test_compare_products(self, api_client):
        """Test product price comparison"""
        response = api_client.get(f"{API_BASE}/products/compare?q=ΓΑΛΑ")
        assert response.status_code == 200
        data = response.json()
        
        assert "query" in data
        assert "stores" in data
        assert "total_products" in data
        assert data["query"] == "ΓΑΛΑ"
        assert isinstance(data["stores"], dict)
        
        print(f"✓ Compare products: {data['total_products']} products found for 'ΓΑΛΑ'")
        
        # Verify store data structure
        for store_name, products in data["stores"].items():
            assert isinstance(products, list)
            if products:
                product = products[0]
                assert "description" in product
                assert "last_price" in product
                print(f"  {store_name}: {len(products)} products")
    
    def test_compare_products_no_results(self, api_client):
        """Test product comparison with no results"""
        response = api_client.get(f"{API_BASE}/products/compare?q=NONEXISTENTPRODUCT12345")
        assert response.status_code == 200
        data = response.json()
        assert data["total_products"] == 0
        print("✓ Compare with no results returns empty")


class TestBackupExport:
    """Backup and export tests"""
    
    def test_export_data(self, api_client):
        """Test data export for device"""
        response = api_client.get(f"{API_BASE}/backup/export?device_id={TEST_DEVICE_ID}")
        assert response.status_code == 200
        data = response.json()
        
        assert "device_id" in data
        assert "exported_at" in data
        assert "total_receipts" in data
        assert "receipts" in data
        assert data["device_id"] == TEST_DEVICE_ID
        assert isinstance(data["receipts"], list)
        
        print(f"✓ Export data: {data['total_receipts']} receipts exported")
        
        # Verify no MongoDB _id in exported data
        for receipt in data["receipts"]:
            assert "_id" not in receipt


class TestManualReceipt:
    """Manual receipt entry tests"""
    
    def test_create_manual_receipt(self, api_client):
        """Test manual receipt creation"""
        payload = {
            "device_id": f"TEST_{TEST_DEVICE_ID}",
            "store_name": "TEST_Manual Store",
            "date": "20-03-2026",
            "items": [
                {
                    "code": "",
                    "description": "TEST_Product 1",
                    "unit": "ΤΕΜ",
                    "quantity": 2.0,
                    "unit_price": 5.50,
                    "pre_discount_value": 11.0,
                    "discount": 0.0,
                    "vat_percent": 24.0,
                    "total_value": 11.0
                },
                {
                    "code": "",
                    "description": "TEST_Product 2",
                    "unit": "ΤΕΜ",
                    "quantity": 1.0,
                    "unit_price": 3.20,
                    "pre_discount_value": 3.20,
                    "discount": 0.0,
                    "vat_percent": 13.0,
                    "total_value": 3.20
                }
            ],
            "total": 14.20,
            "payment_method": "Cash"
        }
        response = api_client.post(f"{API_BASE}/receipts/manual", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "receipt" in data
        receipt = data["receipt"]
        assert receipt["source_type"] == "manual"
        assert receipt["store_name"] == "TEST_Manual Store"
        assert len(receipt["items"]) == 2
        assert receipt["total"] == 14.20
        print(f"✓ Manual receipt created: {receipt['store_name']}, €{receipt['total']}")


class TestDeleteReceipt:
    """Receipt deletion tests"""
    
    def test_delete_receipt(self, api_client):
        """Test receipt deletion"""
        # Create a test receipt first
        payload = {
            "device_id": f"TEST_{TEST_DEVICE_ID}_delete",
            "store_name": "TEST_Delete Store",
            "date": "20-03-2026",
            "items": [
                {
                    "code": "",
                    "description": "TEST_Delete Product",
                    "unit": "ΤΕΜ",
                    "quantity": 1.0,
                    "unit_price": 1.0,
                    "pre_discount_value": 1.0,
                    "discount": 0.0,
                    "vat_percent": 0.0,
                    "total_value": 1.0
                }
            ],
            "total": 1.0,
            "payment_method": ""
        }
        create_response = api_client.post(f"{API_BASE}/receipts/manual", json=payload)
        assert create_response.status_code == 200
        receipt_id = create_response.json()["receipt"]["id"]
        
        # Delete the receipt
        delete_response = api_client.delete(f"{API_BASE}/receipts/{receipt_id}")
        assert delete_response.status_code == 200
        data = delete_response.json()
        assert data["status"] == "deleted"
        
        # Verify it's deleted
        get_response = api_client.get(f"{API_BASE}/receipts/{receipt_id}")
        assert get_response.status_code == 404
        print(f"✓ Receipt deleted: {receipt_id}")
    
    def test_delete_nonexistent_receipt(self, api_client):
        """Test deleting nonexistent receipt returns 404"""
        response = api_client.delete(f"{API_BASE}/receipts/nonexistent-id-12345")
        assert response.status_code == 404
        print("✓ Delete nonexistent receipt returns 404")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
