"""Statistics routes."""
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Query
from collections import defaultdict

from ..config import db

router = APIRouter(prefix="/stats", tags=["Statistics"])

# ============ ENDPOINTS ============

@router.get("")
async def get_stats(device_id: str = Query(...)):
    """Get basic statistics for a device."""
    receipts = await db.receipts.find({"device_id": device_id}).to_list(10000)
    
    total_spent = 0
    stores = defaultdict(float)
    categories = defaultdict(float)
    
    for receipt in receipts:
        amount = receipt.get("total_amount", receipt.get("total", 0))
        total_spent += amount
        
        store = receipt.get("store_name", "Άγνωστο")
        stores[store] += amount
        
        for item in receipt.get("items", []):
            cat = item.get("category", "Άλλο")
            categories[cat] += item.get("total_price", item.get("total_value", 0))
    
    return {
        "total_receipts": len(receipts),
        "total_spent": round(total_spent, 2),
        "stores": dict(sorted(stores.items(), key=lambda x: x[1], reverse=True)[:10]),
        "categories": dict(sorted(categories.items(), key=lambda x: x[1], reverse=True)[:10]),
        "average_receipt": round(total_spent / len(receipts), 2) if receipts else 0
    }

@router.get("/analytics")
async def get_analytics(device_id: str = Query(...), months: int = Query(default=6, ge=1, le=12)):
    """Get detailed analytics for a device."""
    # Calculate date range
    end_date = datetime.now(timezone.utc)
    start_date = end_date - timedelta(days=months * 30)
    
    receipts = await db.receipts.find({"device_id": device_id}).to_list(10000)
    
    # Filter by date if possible
    filtered_receipts = []
    for r in receipts:
        created = r.get("created_at", "")
        if created:
            try:
                if isinstance(created, str):
                    r_date = datetime.fromisoformat(created.replace('Z', '+00:00'))
                else:
                    r_date = created
                if r_date >= start_date:
                    filtered_receipts.append(r)
            except:
                filtered_receipts.append(r)
        else:
            filtered_receipts.append(r)
    
    # Monthly breakdown
    monthly_spending = defaultdict(float)
    monthly_receipts = defaultdict(int)
    store_spending = defaultdict(float)
    category_spending = defaultdict(float)
    product_frequency = defaultdict(int)
    
    for receipt in filtered_receipts:
        amount = receipt.get("total_amount", receipt.get("total", 0))
        
        # Get month
        created = receipt.get("created_at", receipt.get("date", ""))
        if created:
            try:
                if isinstance(created, str):
                    if 'T' in created:
                        r_date = datetime.fromisoformat(created.replace('Z', '+00:00'))
                    else:
                        r_date = datetime.strptime(created.split()[0], '%Y-%m-%d')
                else:
                    r_date = created
                month_key = r_date.strftime('%Y-%m')
                monthly_spending[month_key] += amount
                monthly_receipts[month_key] += 1
            except:
                pass
        
        # Store breakdown
        store = receipt.get("store_name", "Άγνωστο")
        store_spending[store] += amount
        
        # Category and product breakdown
        for item in receipt.get("items", []):
            cat = item.get("category", "Άλλο")
            category_spending[cat] += item.get("total_price", item.get("total_value", 0))
            
            name = item.get("name", item.get("description", ""))
            if name:
                product_frequency[name] += 1
    
    # Sort and limit
    top_stores = dict(sorted(store_spending.items(), key=lambda x: x[1], reverse=True)[:5])
    top_categories = dict(sorted(category_spending.items(), key=lambda x: x[1], reverse=True)[:5])
    top_products = dict(sorted(product_frequency.items(), key=lambda x: x[1], reverse=True)[:10])
    
    # Calculate trends
    total_spent = sum(monthly_spending.values())
    avg_monthly = total_spent / months if months > 0 else 0
    
    return {
        "period": {
            "months": months,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat()
        },
        "summary": {
            "total_receipts": len(filtered_receipts),
            "total_spent": round(total_spent, 2),
            "average_monthly": round(avg_monthly, 2),
            "average_receipt": round(total_spent / len(filtered_receipts), 2) if filtered_receipts else 0
        },
        "monthly_breakdown": {
            "spending": dict(sorted(monthly_spending.items())),
            "receipts": dict(sorted(monthly_receipts.items()))
        },
        "top_stores": top_stores,
        "top_categories": top_categories,
        "top_products": top_products
    }
