"""
Rate limit status endpoint
"""
from fastapi import APIRouter, HTTPException, Depends
from auth import get_user_rate_limit_status, verify_api_key
from typing import Dict

router = APIRouter()


@router.get("/rate-limit-status/{user_id}")
async def get_rate_limit_status_endpoint(user_id: str) -> Dict:
    """
    Get the current rate limit status for a user
    """
    try:
        status = await get_user_rate_limit_status(user_id)

        if "error" in status:
            raise HTTPException(status_code=404, detail=status["error"])

        return {
            "success": True,
            "data": status
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching rate limit status: {str(e)}")
