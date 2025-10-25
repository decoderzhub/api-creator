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
import time
import contextvars

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
from routes.integration import router as integration_router
from logger import logger, generate_request_id
from monitoring import init_sentry, metrics_collector
import sentry_sdk

settings = get_settings()

request_id_context = contextvars.ContextVar('request_id', default=None)

sentry_enabled = init_sentry()
if sentry_enabled:
    logger.info("Sentry monitoring initialized successfully")
else:
    logger.info("Sentry monitoring not configured (SENTRY_DSN not set)")

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
app.include_router(integration_router, prefix="/api", tags=["Integration"])

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_request_id_middleware(request: Request, call_next):
    request_id = generate_request_id()
    request_id_context.set(request_id)
    request.state.request_id = request_id

    start_time = time.time()

    response = await call_next(request)

    process_time = time.time() - start_time
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Process-Time"] = str(round(process_time * 1000, 2))

    is_error = response.status_code >= 400
    metrics_collector.increment_request(process_time * 1000, is_error)

    logger.info(
        "Request processed",
        extra={
            "request_id": request_id,
            "method": request.method,
            "path": request.url.path,
            "status_code": response.status_code,
            "process_time_ms": round(process_time * 1000, 2)
        }
    )

    return response


api_loader = APILoader()

app.state.api_loader = api_loader


@app.on_event("startup")
async def startup_event():
    """Load all active APIs from database on startup"""
    logger.info("Starting API Gateway...")
    try:
        await api_loader.load_all_apis()
        logger.info(
            "APIs loaded successfully",
            extra={"loaded_count": len(api_loader.apis)}
        )
    except Exception as e:
        logger.error(
            "Failed to load APIs on startup",
            extra={"error": str(e)},
            exc_info=True
        )
        sentry_sdk.capture_exception(e)


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
def health_check():
    """Detailed health check"""
    try:
        from supabase import create_client
        supabase = create_client(settings.supabase_url, settings.supabase_service_role_key)
        db_check = supabase.table("apis").select("id").limit(1).execute()
        db_status = "connected"
    except Exception as e:
        logger.error("Database health check failed", extra={"error": str(e)})
        db_status = "disconnected"

    return {
        "status": "healthy" if db_status == "connected" else "degraded",
        "loaded_apis": len(api_loader.apis),
        "database": db_status,
        "sentry_enabled": sentry_enabled,
        "timestamp": datetime.utcnow().isoformat()
    }


@app.get("/metrics")
async def get_metrics(authorization: str = Header(None)):
    """Get system metrics (admin only)"""
    if authorization != f"Bearer {settings.admin_api_key}":
        raise HTTPException(status_code=401, detail="Unauthorized")

    return metrics_collector.get_metrics()


@app.post("/admin/reload")
async def reload_apis(authorization: str = Header(None)):
    """Reload all APIs from database (admin only)"""
    if authorization != f"Bearer {settings.admin_api_key}":
        raise HTTPException(status_code=401, detail="Unauthorized")

    logger.info("Reloading all APIs")
    await api_loader.load_all_apis()
    logger.info("APIs reloaded", extra={"loaded_count": len(api_loader.apis)})

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

    logger.info(f"Reloading API {api_id}")
    success = await api_loader.load_api(api_id)
    if success:
        logger.info(f"API {api_id} reloaded successfully")
        return {"success": True, "message": f"API {api_id} reloaded"}
    else:
        logger.warning(f"API {api_id} not found")
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
    request_id = request.state.request_id if hasattr(request.state, 'request_id') else "unknown"

    api_key = None
    if authorization and authorization.startswith("Bearer "):
        api_key = authorization.replace("Bearer ", "")

    if not api_key:
        return JSONResponse(
            status_code=401,
            content={"error": "Missing API key. Include 'Authorization: Bearer YOUR_API_KEY' header"}
        )

    api_metadata = await verify_api_key(api_id, api_key)
    if not api_metadata:
        logger.warning(
            "Invalid API key attempt",
            extra={"api_id": api_id, "request_id": request_id}
        )
        return JSONResponse(
            status_code=401,
            content={"error": "Invalid API key or API not found"}
        )

    user_id = api_metadata.get("user_id")
    user_plan = api_metadata.get("user_plan", "free")
    is_allowed, rate_limit_info = await check_rate_limit(user_id, user_plan)

    if not is_allowed:
        logger.warning(
            "Rate limit exceeded",
            extra={"user_id": user_id, "api_id": api_id, "request_id": request_id}
        )
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

    if api_metadata.get("status") != "active":
        return JSONResponse(
            status_code=503,
            content={"error": f"API is {api_metadata.get('status')}"}
        )

    api_handler = api_loader.get_api(api_id)
    if not api_handler:
        await api_loader.load_api(api_id)
        api_handler = api_loader.get_api(api_id)

        if not api_handler:
            logger.error(
                "API not loaded",
                extra={"api_id": api_id, "request_id": request_id}
            )
            return JSONResponse(
                status_code=503,
                content={"error": "API not loaded. Please try again."}
            )

    try:
        user_app = api_handler.get_app()

        if not user_app:
            return JSONResponse(
                status_code=503,
                content={"error": "User API app not properly configured"}
            )

        from starlette.testclient import TestClient
        client = TestClient(user_app)

        url = f"/{path}" if path else "/"
        if request.query_params:
            url += f"?{request.query_params}"

        body = None
        if request.method in ["POST", "PUT", "PATCH"]:
            body = await request.body()

        method_fn = getattr(client, request.method.lower())

        if request.method in ["POST", "PUT", "PATCH"] and body:
            response = method_fn(url, data=body, headers=dict(request.headers))
        else:
            response = method_fn(url, headers=dict(request.headers))

        await increment_rate_limit(user_id)

        response_time = (datetime.utcnow() - start_time).total_seconds() * 1000
        await log_api_usage(
            api_id=api_id,
            user_id=api_metadata.get("user_id"),
            status_code=response.status_code,
            response_time_ms=int(response_time),
            request_size_bytes=len(body) if body else 0
        )

        logger.info(
            "API request successful",
            extra={
                "api_id": api_id,
                "user_id": user_id,
                "status_code": response.status_code,
                "response_time_ms": int(response_time),
                "request_id": request_id
            }
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
        logger.error(
            f"Error executing API {api_id}",
            extra={
                "api_id": api_id,
                "error": str(e),
                "request_id": request_id
            },
            exc_info=True
        )
        sentry_sdk.capture_exception(e)

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
