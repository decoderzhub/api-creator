"""
API Analytics Routes
Handles usage tracking and analytics
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from datetime import datetime, timedelta
import os
from supabase import create_client, Client

from .auth import verify_token

router = APIRouter()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


class TrackUsageRequest(BaseModel):
    apiId: str
    statusCode: int
    responseTimeMs: int
    requestSizeBytes: int


@router.get("/stats/{api_id}")
async def get_api_analytics(api_id: str, user_id: str = Depends(verify_token)):
    """Get analytics for a specific API"""
    try:
        api_response = supabase.table("apis").select("*").eq("id", api_id).eq("user_id", user_id).execute()

        if not api_response.data:
            raise HTTPException(status_code=404, detail="API not found")

        thirty_days_ago = (datetime.utcnow() - timedelta(days=30)).isoformat()

        usage_response = supabase.table("api_usage_logs").select("*").eq("api_id", api_id).gte("created_at", thirty_days_ago).execute()

        total_requests = len(usage_response.data)
        successful_requests = sum(1 for log in usage_response.data if 200 <= log.get("status_code", 0) < 300)
        failed_requests = total_requests - successful_requests

        avg_response_time = 0
        if usage_response.data:
            avg_response_time = sum(log.get("response_time_ms", 0) for log in usage_response.data) / len(usage_response.data)

        daily_stats = {}
        for log in usage_response.data:
            date = log.get("created_at", "")[:10]
            if date not in daily_stats:
                daily_stats[date] = {"requests": 0, "errors": 0}
            daily_stats[date]["requests"] += 1
            if log.get("status_code", 0) >= 400:
                daily_stats[date]["errors"] += 1

        return {
            "apiId": api_id,
            "totalRequests": total_requests,
            "successfulRequests": successful_requests,
            "failedRequests": failed_requests,
            "avgResponseTime": round(avg_response_time, 2),
            "dailyStats": daily_stats
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch analytics: {str(e)}")


@router.get("/overview")
async def get_analytics_overview(user_id: str = Depends(verify_token)):
    """Get overview analytics for all user APIs"""
    try:
        apis_response = supabase.table("apis").select("*").eq("user_id", user_id).execute()

        total_apis = len(apis_response.data)
        active_apis = sum(1 for api in apis_response.data if api.get("status") == "active")

        thirty_days_ago = (datetime.utcnow() - timedelta(days=30)).isoformat()

        usage_response = supabase.table("api_usage_logs").select("*").eq("user_id", user_id).gte("created_at", thirty_days_ago).execute()

        total_requests = len(usage_response.data)

        return {
            "totalAPIs": total_apis,
            "activeAPIs": active_apis,
            "totalRequests": total_requests,
            "apis": apis_response.data
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch overview: {str(e)}")


@router.post("/track")
async def track_api_usage(request: TrackUsageRequest, user_id: str = Depends(verify_token)):
    """Track API usage"""
    try:
        supabase.table("api_usage_logs").insert({
            "api_id": request.apiId,
            "user_id": user_id,
            "status_code": request.statusCode,
            "response_time_ms": request.responseTimeMs,
            "request_size_bytes": request.requestSizeBytes,
            "created_at": datetime.utcnow().isoformat()
        }).execute()

        return {"success": True, "message": "Usage tracked successfully"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to track usage: {str(e)}")
