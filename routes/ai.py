"""AI routes using Gemini via Emergent integrations."""
import uuid
import json
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from ..config import db, logger, GEMINI_API_KEY

router = APIRouter(prefix="/ai", tags=["AI"])

# Import Emergent LLM integration
try:
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    EMERGENT_AVAILABLE = True
except ImportError:
    EMERGENT_AVAILABLE = False
    logger.warning("Emergent integrations not available")

# ============ MODELS ============

class AIInsightRequest(BaseModel):
    device_id: str
    insight_type: str = "spending"  # spending, savings, recommendations

class AIChatRequest(BaseModel):
    device_id: str
    message: str
    session_id: Optional[str] = None

class AIRecommendationRequest(BaseModel):
    device_id: str
    category: Optional[str] = None
    limit: int = 5

# ============ HELPER FUNCTIONS ============

async def get_user_stats(device_id: str) -> dict:
    """Get user shopping statistics for AI context."""
    receipts = await db.receipts.find({"device_id": device_id}).to_list(100)
    
    if not receipts:
        return None
    
    total_spent = sum(r.get("total_amount", r.get("total", 0)) for r in receipts)
    stores = {}
    categories = {}
    products = {}
    
    for receipt in receipts:
        store = receipt.get("store_name", "Άγνωστο")
        stores[store] = stores.get(store, 0) + receipt.get("total_amount", receipt.get("total", 0))
        
        for item in receipt.get("items", []):
            cat = item.get("category", "Άλλο")
            categories[cat] = categories.get(cat, 0) + item.get("total_price", 0)
            
            name = item.get("name", "")
            if name:
                products[name] = products.get(name, 0) + item.get("quantity", 1)
    
    return {
        "receipts": receipts,
        "total_spent": total_spent,
        "stores": sorted(stores.items(), key=lambda x: x[1], reverse=True)[:5],
        "categories": sorted(categories.items(), key=lambda x: x[1], reverse=True)[:5],
        "products": sorted(products.items(), key=lambda x: x[1], reverse=True)[:10]
    }

# ============ ENDPOINTS ============

@router.post("/insights")
async def get_ai_insights(request: AIInsightRequest):
    """Get AI-powered insights about user's shopping habits."""
    if not GEMINI_API_KEY or not EMERGENT_AVAILABLE:
        raise HTTPException(status_code=500, detail="AI service not configured")
    
    stats = await get_user_stats(request.device_id)
    
    if not stats:
        return {"insight": "Δεν υπάρχουν αρκετά δεδομένα για ανάλυση. Σκανάρετε περισσότερες αποδείξεις!"}
    
    context = f"""
Στοιχεία χρήστη apodixxi:
- Συνολικές αποδείξεις: {len(stats['receipts'])}
- Συνολικά έξοδα: {stats['total_spent']:.2f}€
- Top καταστήματα: {', '.join([f'{s[0]} ({s[1]:.2f}€)' for s in stats['stores']])}
- Top κατηγορίες: {', '.join([f'{c[0]} ({c[1]:.2f}€)' for c in stats['categories']])}
- Συχνά προϊόντα: {', '.join([f'{p[0]} (x{p[1]})' for p in stats['products']])}
"""
    
    prompts = {
        "spending": f"""Με βάση τα παρακάτω δεδομένα αγορών, δώσε μια σύντομη ανάλυση (2-3 προτάσεις) για τα έξοδα του χρήστη στα ελληνικά:
{context}

Δώσε πρακτικές συμβουλές για εξοικονόμηση χρημάτων.""",
        "savings": f"""Με βάση τα παρακάτω δεδομένα αγορών, προτείνε 3 συγκεκριμένους τρόπους εξοικονόμησης στα ελληνικά:
{context}

Να είσαι συγκεκριμένος με ποσά και καταστήματα.""",
        "recommendations": f"""Με βάση τα παρακάτω δεδομένα αγορών, προτείνε προϊόντα ή προσφορές που μπορεί να ενδιαφέρουν τον χρήστη στα ελληνικά:
{context}

Προτείνε 3-5 προϊόντα με βάση τις αγοραστικές του συνήθειες."""
    }
    
    prompt = prompts.get(request.insight_type, prompts["spending"])
    
    try:
        chat = LlmChat(
            api_key=GEMINI_API_KEY,
            session_id=f"insights_{request.device_id}_{request.insight_type}",
            system_message="Είσαι ο AI βοηθός του apodixxi, μιας εφαρμογής παρακολούθησης αποδείξεων. Δίνεις σύντομες, πρακτικές συμβουλές στα ελληνικά."
        ).with_model("gemini", "gemini-2.5-flash")
        
        response = await chat.send_message(UserMessage(text=prompt))
        
        return {
            "insight": response,
            "stats": {
                "total_receipts": len(stats['receipts']),
                "total_spent": round(stats['total_spent'], 2),
                "top_store": stats['stores'][0][0] if stats['stores'] else None,
                "top_category": stats['categories'][0][0] if stats['categories'] else None
            }
        }
    except Exception as e:
        logger.error(f"AI insight error: {e}")
        raise HTTPException(status_code=500, detail=f"AI error: {str(e)}")


@router.post("/chat")
async def ai_chat(request: AIChatRequest):
    """Chat with AI assistant about shopping habits."""
    if not GEMINI_API_KEY or not EMERGENT_AVAILABLE:
        raise HTTPException(status_code=500, detail="AI service not configured")
    
    stats = await get_user_stats(request.device_id)
    
    context = ""
    if stats:
        context = f"""
Πληροφορίες χρήστη:
- Αριθμός αποδείξεων: {len(stats['receipts'])}
- Συνολικά έξοδα: {stats['total_spent']:.2f}€
- Πρόσφατες αγορές: {', '.join([s[0] for s in stats['stores'][:5]])}
"""
    
    session_id = request.session_id or f"chat_{request.device_id}_{uuid.uuid4().hex[:8]}"
    
    try:
        chat = LlmChat(
            api_key=GEMINI_API_KEY,
            session_id=session_id,
            system_message=f"""Είσαι ο AI βοηθός του apodixxi, μιας εφαρμογής παρακολούθησης αποδείξεων supermarket στην Ελλάδα.
Απαντάς πάντα στα ελληνικά, σύντομα και φιλικά.
{context}
Μπορείς να βοηθήσεις με ερωτήσεις σχετικά με έξοδα, εξοικονόμηση, σύγκριση τιμών."""
        ).with_model("gemini", "gemini-2.5-flash")
        
        response = await chat.send_message(UserMessage(text=request.message))
        
        # Store chat message
        await db.ai_chats.insert_one({
            "device_id": request.device_id,
            "session_id": session_id,
            "user_message": request.message,
            "ai_response": response,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        return {
            "response": response,
            "session_id": session_id
        }
    except Exception as e:
        logger.error(f"AI chat error: {e}")
        raise HTTPException(status_code=500, detail=f"AI error: {str(e)}")


@router.post("/smart-recommendations")
async def get_ai_recommendations(request: AIRecommendationRequest):
    """Get AI-powered product recommendations based on shopping history."""
    if not GEMINI_API_KEY or not EMERGENT_AVAILABLE:
        raise HTTPException(status_code=500, detail="AI service not configured")
    
    stats = await get_user_stats(request.device_id)
    
    if not stats:
        return {"recommendations": [], "message": "Σκανάρετε αποδείξεις για εξατομικευμένες προτάσεις!"}
    
    category_filter = f"για την κατηγορία {request.category}" if request.category else ""
    
    prompt = f"""Με βάση το ιστορικό αγορών του χρήστη, προτείνε {request.limit} προϊόντα {category_filter} στα ελληνικά.

Συχνά αγοραζόμενα προϊόντα:
{chr(10).join([f'- {p[0]} (x{p[1]})' for p in stats['products']])}

Καταστήματα: {', '.join([s[0] for s in stats['stores'][:5]])}

Απάντησε σε μορφή JSON array με objects: title, description, reason
Παράδειγμα: [{{"title": "Γάλα σε προσφορά", "description": "Αγοράζετε συχνά γάλα", "reason": "Βασισμένο στις αγορές σας"}}]"""

    try:
        chat = LlmChat(
            api_key=GEMINI_API_KEY,
            session_id=f"recs_{request.device_id}",
            system_message="Είσαι ένας έξυπνος βοηθός αγορών. Απαντάς ΜΟΝΟ με valid JSON, χωρίς markdown."
        ).with_model("gemini", "gemini-2.5-flash")
        
        response = await chat.send_message(UserMessage(text=prompt))
        
        # Try to parse JSON response
        try:
            clean_response = response.strip()
            if clean_response.startswith("```"):
                clean_response = clean_response.split("```")[1]
                if clean_response.startswith("json"):
                    clean_response = clean_response[4:]
            recommendations = json.loads(clean_response)
        except:
            recommendations = [{"title": "AI Προτάσεις", "description": response, "reason": "AI-generated"}]
        
        return {
            "recommendations": recommendations[:request.limit],
            "source": "ai",
            "based_on_receipts": len(stats['receipts'])
        }
    except Exception as e:
        logger.error(f"AI recommendations error: {e}")
        raise HTTPException(status_code=500, detail=f"AI error: {str(e)}")


@router.get("/weekly-summary")
async def get_weekly_summary(device_id: str = Query(...)):
    """Get AI-generated weekly shopping summary."""
    if not GEMINI_API_KEY or not EMERGENT_AVAILABLE:
        raise HTTPException(status_code=500, detail="AI service not configured")
    
    # Get receipts from last 7 days
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    
    receipts = await db.receipts.find({
        "device_id": device_id,
        "created_at": {"$gte": week_ago.isoformat()}
    }).to_list(100)
    
    if not receipts:
        return {
            "summary": "Δεν υπάρχουν αγορές αυτή την εβδομάδα.",
            "stats": None
        }
    
    total = sum(r.get("total_amount", r.get("total", 0)) for r in receipts)
    stores = set(r.get("store_name", "") for r in receipts)
    
    prompt = f"""Δημιούργησε μια σύντομη εβδομαδιαία περίληψη (3-4 προτάσεις) στα ελληνικά:

- Αποδείξεις: {len(receipts)}
- Συνολικά: {total:.2f}€
- Καταστήματα: {', '.join(list(stores)[:5])}

Να είναι φιλική και ενθαρρυντική."""

    try:
        chat = LlmChat(
            api_key=GEMINI_API_KEY,
            session_id=f"weekly_{device_id}",
            system_message="Είσαι ο AI βοηθός του apodixxi."
        ).with_model("gemini", "gemini-2.5-flash")
        
        response = await chat.send_message(UserMessage(text=prompt))
        
        return {
            "summary": response,
            "stats": {
                "receipts_count": len(receipts),
                "total_spent": round(total, 2),
                "stores_visited": len(stores)
            }
        }
    except Exception as e:
        logger.error(f"AI weekly summary error: {e}")
        raise HTTPException(status_code=500, detail=f"AI error: {str(e)}")
