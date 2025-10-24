"""
Authentication utilities for route protection
"""
from fastapi import Header, HTTPException
from supabase import create_client, Client
from functools import lru_cache
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import get_settings


@lru_cache()
def get_supabase_client() -> Client:
    """Get cached Supabase client"""
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


async def verify_token(authorization: str = Header(None)) -> str:
    """Verify JWT token and return user ID"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")

    token = authorization.replace("Bearer ", "")

    try:
        supabase = get_supabase_client()
        response = supabase.auth.get_user(token)
        if response.user:
            return response.user.id
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")
