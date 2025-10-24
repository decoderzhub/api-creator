"""
API Deployment Routes
Handles API deployment and status management
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from datetime import datetime
import os
from supabase import create_client, Client

from .auth import verify_token

router = APIRouter()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


class DeployAPIRequest(BaseModel):
    apiId: str


@router.post("/deploy-api")
async def deploy_api(request: DeployAPIRequest, user_id: str = Depends(verify_token)):
    """Deploy an API by updating its status to active"""
    try:
        response = supabase.table("apis").select("*").eq("id", request.apiId).eq("user_id", user_id).execute()

        if not response.data:
            raise HTTPException(status_code=404, detail="API not found")

        supabase.table("apis").update({
            "status": "active",
            "deployed_at": datetime.utcnow().isoformat()
        }).eq("id", request.apiId).execute()

        return {
            "success": True,
            "apiId": request.apiId,
            "status": "active",
            "message": "API deployed successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to deploy API: {str(e)}")
