"""
Rate limiting middleware and utilities
"""
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Tuple
from supabase import create_client, Client
from config import get_settings

settings = get_settings()
supabase: Client = create_client(settings.supabase_url, settings.supabase_service_role_key)


TIER_LIMITS = {
    'free': settings.rate_limit_free,
    'pro': settings.rate_limit_pro,
    'enterprise': settings.rate_limit_enterprise
}


def get_current_window_start() -> datetime:
    """Get the start of the current hour window"""
    now = datetime.now(timezone.utc)
    return now.replace(minute=0, second=0, microsecond=0)


async def check_rate_limit(user_id: str, user_plan: str) -> Tuple[bool, Dict]:
    """
    Check if user has exceeded their rate limit

    Returns:
        Tuple of (is_allowed, rate_limit_info)
        rate_limit_info contains: limit, remaining, reset_time
    """
    try:
        window_start = get_current_window_start()
        limit = TIER_LIMITS.get(user_plan, TIER_LIMITS['free'])

        # Get or create rate limit record for current window
        response = supabase.table("rate_limit_tracking")\
            .select("*")\
            .eq("user_id", user_id)\
            .eq("window_start", window_start.isoformat())\
            .execute()

        if response.data and len(response.data) > 0:
            record = response.data[0]
            current_count = record['request_count']
        else:
            # Create new record for this window
            supabase.table("rate_limit_tracking").insert({
                "user_id": user_id,
                "window_start": window_start.isoformat(),
                "request_count": 0
            }).execute()
            current_count = 0

        # Check if limit exceeded
        is_allowed = current_count < limit
        remaining = max(0, limit - current_count)
        reset_time = window_start + timedelta(hours=1)

        rate_limit_info = {
            "limit": limit,
            "remaining": remaining,
            "reset": int(reset_time.timestamp()),
            "current": current_count
        }

        return is_allowed, rate_limit_info

    except Exception as e:
        print(f"Error checking rate limit: {e}")
        # On error, allow the request (fail open)
        return True, {
            "limit": TIER_LIMITS.get(user_plan, TIER_LIMITS['free']),
            "remaining": 0,
            "reset": int((get_current_window_start() + timedelta(hours=1)).timestamp()),
            "current": 0
        }


async def increment_rate_limit(user_id: str) -> None:
    """Increment the rate limit counter for the current window"""
    try:
        window_start = get_current_window_start()

        # Get current record
        response = supabase.table("rate_limit_tracking")\
            .select("*")\
            .eq("user_id", user_id)\
            .eq("window_start", window_start.isoformat())\
            .execute()

        if response.data and len(response.data) > 0:
            record = response.data[0]
            new_count = record['request_count'] + 1

            # Update count
            supabase.table("rate_limit_tracking")\
                .update({"request_count": new_count})\
                .eq("id", record['id'])\
                .execute()
        else:
            # Create new record
            supabase.table("rate_limit_tracking").insert({
                "user_id": user_id,
                "window_start": window_start.isoformat(),
                "request_count": 1
            }).execute()

    except Exception as e:
        print(f"Error incrementing rate limit: {e}")


async def get_rate_limit_status(user_id: str, user_plan: str) -> Dict:
    """
    Get current rate limit status for a user

    Returns:
        Dict with limit, used, remaining, reset_time
    """
    try:
        window_start = get_current_window_start()
        limit = TIER_LIMITS.get(user_plan, TIER_LIMITS['free'])

        response = supabase.table("rate_limit_tracking")\
            .select("*")\
            .eq("user_id", user_id)\
            .eq("window_start", window_start.isoformat())\
            .execute()

        current_count = 0
        if response.data and len(response.data) > 0:
            current_count = response.data[0]['request_count']

        reset_time = window_start + timedelta(hours=1)

        return {
            "limit": limit,
            "used": current_count,
            "remaining": max(0, limit - current_count),
            "reset": int(reset_time.timestamp()),
            "plan": user_plan
        }

    except Exception as e:
        print(f"Error getting rate limit status: {e}")
        return {
            "limit": TIER_LIMITS.get(user_plan, TIER_LIMITS['free']),
            "used": 0,
            "remaining": TIER_LIMITS.get(user_plan, TIER_LIMITS['free']),
            "reset": int((get_current_window_start() + timedelta(hours=1)).timestamp()),
            "plan": user_plan
        }
