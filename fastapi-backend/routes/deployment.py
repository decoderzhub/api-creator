"""
API Deployment Routes
Handles API deployment and status management
"""
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from datetime import datetime

from .auth import verify_token, get_supabase_client

router = APIRouter()


class DeployAPIRequest(BaseModel):
    apiId: str


@router.post("/deploy-api")
async def deploy_api(request: DeployAPIRequest, user_id: str = Depends(verify_token), req: Request = None):
    """Deploy an API by updating its status to active and load it into memory"""
    try:
        supabase = get_supabase_client()
        response = supabase.table("apis").select("*").eq("id", request.apiId).eq("user_id", user_id).execute()

        if not response.data:
            raise HTTPException(status_code=404, detail="API not found")

        supabase.table("apis").update({
            "status": "active"
        }).eq("id", request.apiId).execute()

        # Load the API into the gateway's memory
        if req and hasattr(req.app.state, 'api_loader'):
            api_loader = req.app.state.api_loader
            success = await api_loader.load_api(request.apiId)
            if not success:
                print(f"Warning: Failed to load API {request.apiId} into memory")

        return {
            "success": True,
            "apiId": request.apiId,
            "status": "active",
            "message": "API deployed and loaded successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to deploy API: {str(e)}")
