"""
Authentication and authorization utilities
"""
from typing import Optional, Dict
from supabase import create_client, Client
from config import get_settings

settings = get_settings()
supabase: Client = create_client(settings.supabase_url, settings.supabase_service_role_key)


async def verify_api_key(api_id: str, api_key: str) -> Optional[Dict]:
    """
    Verify API key and return API metadata
    """
    try:
        response = supabase.table("apis").select("*").eq("id", api_id).eq("api_key", api_key).execute()

        if response.data and len(response.data) > 0:
            return response.data[0]
        return None
    except Exception as e:
        print(f"Error verifying API key: {e}")
        return None


async def log_api_usage(
    api_id: str,
    user_id: str,
    status_code: int,
    response_time_ms: int,
    request_size_bytes: int
):
    """
    Log API usage to database
    """
    try:
        # Insert usage log
        supabase.table("api_usage_logs").insert({
            "api_id": api_id,
            "user_id": user_id,
            "status_code": status_code,
            "response_time_ms": response_time_ms,
            "request_size_bytes": request_size_bytes
        }).execute()

        # Increment usage counter
        api_data = supabase.table("apis").select("usage_count").eq("id", api_id).single().execute()
        if api_data.data:
            new_count = api_data.data.get("usage_count", 0) + 1
            supabase.table("apis").update({"usage_count": new_count}).eq("id", api_id).execute()

    except Exception as e:
        print(f"Error logging API usage: {e}")
