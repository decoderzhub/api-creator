"""
FastAPI Gateway Service
Main entry point for the API gateway that routes requests to user-generated APIs
"""
from fastapi import FastAPI, Request, HTTPException, Header
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os
from datetime import datetime
from typing import Optional

from api_loader import APILoader
from auth import verify_api_key, log_api_usage
from config import get_settings
from rate_limiter import check_rate_limit, increment_rate_limit
from routes.generation import router as generation_router
from routes.deployment import router as deployment_router
from routes.analytics import router as analytics_router
from routes.marketplace import router as marketplace_router
from routes.suggestions import router as suggestions_router
from routes.rate_limit import router as rate_limit_router
from routes.ai_chat import router as ai_chat_router

settings = get_settings()

app = FastAPI(
    title="API Builder Gateway",
    description="Dynamic API Gateway for user-generated APIs",
    version="1.0.0"
)

app.include_router(generation_router, prefix="/api", tags=["Generation"])
app.include_router(deployment_router, prefix="/api", tags=["Deployment"])
app.include_router(analytics_router, prefix="/api/api-analytics", tags=["Analytics"])
app.include_router(marketplace_router, prefix="/api/marketplace", tags=["Marketplace"])
app.include_router(suggestions_router, prefix="/api", tags=["AI Suggestions"])
app.include_router(rate_limit_router, prefix="/api", tags=["Rate Limiting"])
app.include_router(ai_chat_router, prefix="/api", tags=["AI Chat"])

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_loader = APILoader()

# Make api_loader accessible to routes via app.state
app.state.api_loader = api_loader


@app.on_event("startup")
async def startup_event():
    """Load all active APIs from database on startup"""
    print("🚀 Starting API Gateway...")
    await api_loader.load_all_apis()
    print(f"✅ Loaded {len(api_loader.apis)} APIs")


@app.get("/")
async def root():
    """Gateway health check"""
    return {
        "service": "API Builder Gateway",
        "status": "running",
        "loaded_apis": len(api_loader.apis),
        "timestamp": datetime.utcnow().isoformat()
    }


@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "loaded_apis": len(api_loader.apis),
        "uptime": "running",
        "database": "connected"
    }


@app.post("/admin/reload")
async def reload_apis(authorization: str = Header(None)):
    """Reload all APIs from database (admin only)"""
    if authorization != f"Bearer {settings.admin_api_key}":
        raise HTTPException(status_code=401, detail="Unauthorized")

    await api_loader.load_all_apis()
    return {
        "success": True,
        "loaded_apis": len(api_loader.apis),
        "message": "APIs reloaded successfully"
    }


@app.post("/admin/reload/{api_id}")
async def reload_single_api(api_id: str, authorization: str = Header(None)):
    """Reload a single API from database (admin only)"""
    if authorization != f"Bearer {settings.admin_api_key}":
        raise HTTPException(status_code=401, detail="Unauthorized")

    success = await api_loader.load_api(api_id)
    if success:
        return {"success": True, "message": f"API {api_id} reloaded"}
    else:
        raise HTTPException(status_code=404, detail="API not found")


@app.api_route("/{api_id}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
@app.api_route("/{api_id}/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def proxy_to_user_api(
    api_id: str,
    request: Request,
    path: str = "",
    authorization: Optional[str] = Header(None)
):
    """
    Route requests to user-generated APIs
    Format: /{api_id} or /{api_id}/{endpoint_path}
    """
    start_time = datetime.utcnow()

    # Verify API key
    api_key = None
    if authorization and authorization.startswith("Bearer "):
        api_key = authorization.replace("Bearer ", "")

    if not api_key:
        return JSONResponse(
            status_code=401,
            content={"error": "Missing API key. Include 'Authorization: Bearer YOUR_API_KEY' header"}
        )

    # Verify the API key and get API metadata
    api_metadata = await verify_api_key(api_id, api_key)
    if not api_metadata:
        return JSONResponse(
            status_code=401,
            content={"error": "Invalid API key or API not found"}
        )

    # Check rate limit
    user_id = api_metadata.get("user_id")
    user_plan = api_metadata.get("user_plan", "free")
    is_allowed, rate_limit_info = await check_rate_limit(user_id, user_plan)

    if not is_allowed:
        return JSONResponse(
            status_code=429,
            content={
                "error": "Rate limit exceeded",
                "limit": rate_limit_info["limit"],
                "reset": rate_limit_info["reset"]
            },
            headers={
                "X-RateLimit-Limit": str(rate_limit_info["limit"]),
                "X-RateLimit-Remaining": str(rate_limit_info["remaining"]),
                "X-RateLimit-Reset": str(rate_limit_info["reset"])
            }
        )

    # Check if API is active
    if api_metadata.get("status") != "active":
        return JSONResponse(
            status_code=503,
            content={"error": f"API is {api_metadata.get('status')}"}
        )

    # Get the loaded API handler
    api_handler = api_loader.get_api(api_id)
    if not api_handler:
        # Try to load it if not already loaded
        await api_loader.load_api(api_id)
        api_handler = api_loader.get_api(api_id)

        if not api_handler:
            return JSONResponse(
                status_code=503,
                content={"error": "API not loaded. Please try again."}
            )

    try:
        # Get the user's FastAPI app
        user_app = api_handler.get_app()

        if not user_app:
            return JSONResponse(
                status_code=503,
                content={"error": "User API app not properly configured"}
            )

        # Forward the request to the user's app
        from starlette.testclient import TestClient
        client = TestClient(user_app)

        # Prepare the request
        url = f"/{path}" if path else "/"
        if request.query_params:
            url += f"?{request.query_params}"

        # Get request body if present
        body = None
        if request.method in ["POST", "PUT", "PATCH"]:
            body = await request.body()

        # Make the request to the user's app
        method_fn = getattr(client, request.method.lower())

        if request.method in ["POST", "PUT", "PATCH"] and body:
            response = method_fn(url, data=body, headers=dict(request.headers))
        else:
            response = method_fn(url, headers=dict(request.headers))

        # Increment rate limit counter
        await increment_rate_limit(user_id)

        # Log usage
        response_time = (datetime.utcnow() - start_time).total_seconds() * 1000
        await log_api_usage(
            api_id=api_id,
            user_id=api_metadata.get("user_id"),
            status_code=response.status_code,
            response_time_ms=int(response_time),
            request_size_bytes=len(body) if body else 0
        )

        return JSONResponse(
            content=response.json() if response.headers.get("content-type") == "application/json" else {"response": response.text},
            status_code=response.status_code,
            headers={
                "X-RateLimit-Limit": str(rate_limit_info["limit"]),
                "X-RateLimit-Remaining": str(max(0, rate_limit_info["remaining"] - 1)),
                "X-RateLimit-Reset": str(rate_limit_info["reset"])
            }
        )

    except Exception as e:
        print(f"Error executing API {api_id}: {str(e)}")

        # Log error
        response_time = (datetime.utcnow() - start_time).total_seconds() * 1000
        await log_api_usage(
            api_id=api_id,
            user_id=api_metadata.get("user_id"),
            status_code=500,
            response_time_ms=int(response_time),
            request_size_bytes=0
        )

        return JSONResponse(
            status_code=500,
            content={"error": "Internal API error", "detail": str(e)}
        )


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8663,
        reload=True,
        log_level="info"
    )
