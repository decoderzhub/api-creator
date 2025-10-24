"""
Marketplace Routes
Handles API marketplace listing and management
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from .auth import verify_token, get_supabase_client

router = APIRouter()


class PublishMarketplaceRequest(BaseModel):
    apiId: str
    title: str
    description: str
    pricePerCall: Optional[float] = 0.0
    category: Optional[str] = "general"


class UpdateMarketplaceRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    pricePerCall: Optional[float] = None
    category: Optional[str] = None
    isPublic: Optional[bool] = None


@router.get("/")
async def get_marketplace_apis(user_id: str = Depends(verify_token)):
    """Get all public marketplace APIs"""
    try:
        supabase = get_supabase_client()
        response = supabase.table("marketplace").select("*, apis(*)").eq("is_public", True).execute()

        return {"listings": response.data}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch marketplace: {str(e)}")


@router.post("/publish")
async def publish_to_marketplace(request: PublishMarketplaceRequest, user_id: str = Depends(verify_token)):
    """Publish API to marketplace"""
    try:
        supabase = get_supabase_client()
        api_response = supabase.table("apis").select("*").eq("id", request.apiId).eq("user_id", user_id).execute()

        if not api_response.data:
            raise HTTPException(status_code=404, detail="API not found")

        response = supabase.table("marketplace").insert({
            "api_id": request.apiId,
            "seller_id": user_id,
            "title": request.title,
            "description": request.description,
            "price_per_call": request.pricePerCall,
            "category": request.category,
            "is_public": True,
            "created_at": datetime.utcnow().isoformat()
        }).execute()

        return {
            "success": True,
            "listing": response.data[0] if response.data else None
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to publish to marketplace: {str(e)}")


@router.put("/{marketplace_id}")
async def update_marketplace_listing(
    marketplace_id: str,
    request: UpdateMarketplaceRequest,
    user_id: str = Depends(verify_token)
):
    """Update marketplace listing"""
    try:
        supabase = get_supabase_client()
        listing_response = supabase.table("marketplace").select("*").eq("id", marketplace_id).eq("seller_id", user_id).execute()

        if not listing_response.data:
            raise HTTPException(status_code=404, detail="Listing not found")

        update_data = {}
        if request.title is not None:
            update_data["title"] = request.title
        if request.description is not None:
            update_data["description"] = request.description
        if request.pricePerCall is not None:
            update_data["price_per_call"] = request.pricePerCall
        if request.category is not None:
            update_data["category"] = request.category
        if request.isPublic is not None:
            update_data["is_public"] = request.isPublic

        update_data["updated_at"] = datetime.utcnow().isoformat()

        response = supabase.table("marketplace").update(update_data).eq("id", marketplace_id).execute()

        return {
            "success": True,
            "listing": response.data[0] if response.data else None
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update listing: {str(e)}")
