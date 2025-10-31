"""
FastAPI Gateway Service
Main entry point for the API gateway that routes requests to user-generated APIs
"""
from fastapi import FastAPI, Request, HTTPException, Header, UploadFile
from fastapi.responses import JSONResponse, Response
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os
from datetime import datetime
from typing import Optional
import time
import contextvars

from api_loader import APILoader
from api_deployer import APIDeployer
from auth import verify_api_key, log_api_usage
from config import get_settings
from rate_limiter import check_rate_limit, increment_rate_limit
from supabase import create_client
from routes.generation import router as generation_router
from routes.deployment import router as deployment_router
from routes.analytics import router as analytics_router
from routes.marketplace import router as marketplace_router
from routes.suggestions import router as suggestions_router
from routes.rate_limit import router as rate_limit_router
from routes.ai_chat import router as ai_chat_router
from routes.integration import router as integration_router
from routes.billing import router as billing_router
from routes.storage import router as storage_router
from logger import logger, generate_request_id
from monitoring import init_sentry, metrics_collector
import sentry_sdk

settings = get_settings()
supabase = create_client(settings.supabase_url, settings.supabase_service_role_key)

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
app.include_router(billing_router, prefix="/api", tags=["Billing"])
app.include_router(storage_router, prefix="/api/storage", tags=["Storage"])

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
api_deployer = APIDeployer()

app.state.api_loader = api_loader
app.state.api_deployer = api_deployer


@app.on_event("startup")
async def startup_event():
    """Deploy all active APIs in Docker containers on startup"""
    logger.info("Starting API Gateway...")
    try:
        response = supabase.table("apis").select("*").eq("status", "active").execute()

        deployed_count = 0
        for api_data in response.data:
            api_id = api_data["id"]
            code = api_data.get("code_snapshot")
            requirements = api_data.get("requirements")

            if code:
                try:
                    await api_deployer.deploy_api(api_id, code, requirements)
                    deployed_count += 1
                except Exception as e:
                    logger.error(f"Failed to deploy API {api_id} on startup: {str(e)}")

        logger.info(
            "APIs deployed successfully",
            extra={"deployed_count": deployed_count}
        )
    except Exception as e:
        logger.error(
            "Failed to deploy APIs on startup",
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
        "deployed_apis": len(api_deployer.api_containers),
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
        "deployed_apis": len(api_deployer.api_containers),
        "database": db_status,
        "sentry_enabled": sentry_enabled,
        "timestamp": datetime.utcnow().isoformat()
    }


@app.get("/api/diagnostics/{api_id}")
async def get_api_diagnostics(api_id: str):
    """Get diagnostic information for a specific API"""
    try:
        # Check if API is deployed
        is_deployed = api_id in api_deployer.api_containers

        diagnostics = {
            "api_id": api_id,
            "is_deployed": is_deployed,
            "timestamp": datetime.utcnow().isoformat()
        }

        if is_deployed:
            container_info = api_deployer.api_containers[api_id]
            container = container_info['container']

            try:
                container.reload()
                diagnostics["container_status"] = container.status
                diagnostics["port"] = container_info['port']
                diagnostics["image"] = container_info['image']

                # Try to get container logs
                try:
                    logs = container.logs(tail=50).decode('utf-8')
                    diagnostics["recent_logs"] = logs.split('\n')[-20:]  # Last 20 lines
                except Exception as log_error:
                    diagnostics["logs_error"] = str(log_error)

            except Exception as e:
                diagnostics["container_error"] = str(e)
        else:
            diagnostics["message"] = "API is not currently deployed"

        # Get API info from database
        try:
            from supabase import create_client
            supabase = create_client(settings.supabase_url, settings.supabase_service_role_key)
            api_data = supabase.table("apis").select("name,status,requirements,created_at").eq("id", api_id).single().execute()
            diagnostics["api_info"] = api_data.data
        except Exception as db_error:
            diagnostics["database_error"] = str(db_error)

        return diagnostics

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": "Failed to fetch diagnostics", "detail": str(e)}
        )


@app.get("/metrics")
async def get_metrics(authorization: str = Header(None)):
    """Get system metrics (admin only)"""
    if authorization != f"Bearer {settings.admin_api_key}":
        raise HTTPException(status_code=401, detail="Unauthorized")

    return metrics_collector.get_metrics()


@app.post("/admin/reload")
async def reload_apis(authorization: str = Header(None)):
    """Redeploy all APIs from database (admin only)"""
    if authorization != f"Bearer {settings.admin_api_key}":
        raise HTTPException(status_code=401, detail="Unauthorized")

    logger.info("Redeploying all APIs")

    response = supabase.table("apis").select("*").eq("status", "active").execute()
    deployed_count = 0

    for api_data in response.data:
        api_id = api_data["id"]
        code = api_data.get("code_snapshot")
        requirements = api_data.get("requirements")

        if code:
            try:
                await api_deployer.restart_api(api_id, code, requirements)
                deployed_count += 1
            except Exception as e:
                logger.error(f"Failed to redeploy API {api_id}: {str(e)}")

    logger.info("APIs redeployed", extra={"deployed_count": deployed_count})

    return {
        "success": True,
        "deployed_apis": deployed_count,
        "message": "APIs redeployed successfully"
    }


@app.post("/admin/reload/{api_id}")
async def reload_single_api(api_id: str, authorization: str = Header(None)):
    """Redeploy a single API from database (admin only)"""
    if authorization != f"Bearer {settings.admin_api_key}":
        raise HTTPException(status_code=401, detail="Unauthorized")

    logger.info(f"Redeploying API {api_id}")

    try:
        response = supabase.table("apis").select("*").eq("id", api_id).single().execute()

        if response.data:
            api_data = response.data
            code = api_data.get("code_snapshot")
            requirements = api_data.get("requirements")

            if code:
                await api_deployer.restart_api(api_id, code, requirements)
                logger.info(f"API {api_id} redeployed successfully")
                return {"success": True, "message": f"API {api_id} redeployed"}

        logger.warning(f"API {api_id} not found")
        raise HTTPException(status_code=404, detail="API not found")
    except Exception as e:
        logger.error(f"Error redeploying API {api_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/admin/deployments")
async def list_deployments(authorization: str = Header(None)):
    """List all deployed APIs (admin only)"""
    if authorization != f"Bearer {settings.admin_api_key}":
        raise HTTPException(status_code=401, detail="Unauthorized")

    return {
        "success": True,
        "deployments": api_deployer.get_deployed_apis()
    }


@app.get("/admin/deployment/{api_id}")
async def get_deployment_status(api_id: str, authorization: str = Header(None)):
    """Get deployment status and health for a specific API (admin only)"""
    if authorization != f"Bearer {settings.admin_api_key}":
        raise HTTPException(status_code=401, detail="Unauthorized")

    health = await api_deployer.get_api_health(api_id)
    return {
        "success": True,
        "api_id": api_id,
        "health": health
    }


@app.post("/admin/deployment/{api_id}/stop")
async def stop_deployment(api_id: str, authorization: str = Header(None)):
    """Stop a deployed API container (admin only)"""
    if authorization != f"Bearer {settings.admin_api_key}":
        raise HTTPException(status_code=401, detail="Unauthorized")

    try:
        success = await api_deployer.stop_api(api_id)
        if success:
            return {"success": True, "message": f"API {api_id} stopped"}
        else:
            raise HTTPException(status_code=404, detail="API not found")
    except Exception as e:
        logger.error(f"Error stopping API {api_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/admin/deployment/{api_id}/start")
async def start_deployment(api_id: str, authorization: str = Header(None)):
    """Start/deploy an API container (admin only)"""
    if authorization != f"Bearer {settings.admin_api_key}":
        raise HTTPException(status_code=401, detail="Unauthorized")

    try:
        response = supabase.table("apis").select("*").eq("id", api_id).single().execute()

        if response.data:
            api_data = response.data
            code = api_data.get("code_snapshot")
            requirements = api_data.get("requirements")

            if code:
                port = await api_deployer.deploy_api(api_id, code, requirements)
                return {
                    "success": True,
                    "message": f"API {api_id} deployed",
                    "port": port
                }

        raise HTTPException(status_code=404, detail="API not found")
    except Exception as e:
        logger.error(f"Error starting API {api_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/admin/cleanup")
async def cleanup_containers(authorization: str = Header(None)):
    """Clean up stopped containers (admin only)"""
    if authorization != f"Bearer {settings.admin_api_key}":
        raise HTTPException(status_code=401, detail="Unauthorized")

    try:
        await api_deployer.cleanup_stopped_containers()
        return {
            "success": True,
            "message": "Cleanup completed",
            "remaining_deployments": len(api_deployer.api_containers)
        }
    except Exception as e:
        logger.error(f"Error cleaning up containers: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.api_route("/run/{api_id}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
@app.api_route("/run/{api_id}/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def proxy_to_user_api(
    api_id: str,
    request: Request,
    path: str = "",
    authorization: Optional[str] = Header(None)
):
    """
    Route requests to user-generated APIs
    Format: /run/{api_id} or /run/{api_id}/{endpoint_path}
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

    # Get custom rate limit if set
    user_response = supabase.table("users").select("custom_rate_limit").eq("id", user_id).single().execute()
    custom_rate_limit = user_response.data.get('custom_rate_limit') if user_response.data else None

    is_allowed, rate_limit_info = await check_rate_limit(user_id, user_plan, custom_rate_limit)

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

    port = api_deployer.get_api_port(api_id)

    if not port or not api_deployer.is_api_deployed(api_id):
        logger.info(f"API {api_id} not deployed, deploying now")
        try:
            response = supabase.table("apis").select("*").eq("id", api_id).single().execute()
            api_data = response.data
            code = api_data.get("code_snapshot")
            requirements = api_data.get("requirements")

            if code:
                port = await api_deployer.deploy_api(api_id, code, requirements)
            else:
                logger.error(f"No code found for API {api_id}")
                return JSONResponse(
                    status_code=503,
                    content={"error": "API code not found"}
                )
        except Exception as e:
            logger.error(
                "Failed to deploy API",
                extra={"api_id": api_id, "error": str(e), "request_id": request_id}
            )
            return JSONResponse(
                status_code=503,
                content={"error": "Failed to deploy API. Please try again."}
            )

    try:
        import httpx

        url_path = f"/{path}" if path else "/"

        content_type = request.headers.get("content-type", "")

        files = None
        data = None
        json_data = None
        body_bytes = None

        if "multipart/form-data" in content_type:
            form = await request.form()
            files = {}
            data = {}

            for key, value in form.items():
                if isinstance(value, UploadFile):
                    files[key] = (
                        value.filename,
                        await value.read(),
                        value.content_type
                    )
                else:
                    data[key] = value

        elif "application/json" in content_type:
            try:
                json_data = await request.json()
            except Exception:
                body_bytes = await request.body()

        elif request.method in ["POST", "PUT", "PATCH"]:
            body_bytes = await request.body()

        headers_to_forward = {
            k: v for k, v in request.headers.items()
            if k.lower() not in [
                'host',
                'content-length',
                'transfer-encoding',
                'content-type'  # Let httpx set this with correct boundary for multipart
            ]
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.request(
                method=request.method,
                url=f"http://localhost:{port}{url_path}",
                params=dict(request.query_params),
                headers=headers_to_forward,
                files=files,
                data=data,
                json=json_data,
                content=body_bytes if body_bytes else None,
            )

        await increment_rate_limit(user_id)

        response_time = (datetime.utcnow() - start_time).total_seconds() * 1000
        request_size = len(body_bytes) if body_bytes else 0

        await log_api_usage(
            api_id=api_id,
            user_id=api_metadata.get("user_id"),
            status_code=response.status_code,
            response_time_ms=int(response_time),
            request_size_bytes=request_size
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

        response_headers = dict(response.headers)
        response_headers.update({
            "X-RateLimit-Limit": str(rate_limit_info["limit"]),
            "X-RateLimit-Remaining": str(max(0, rate_limit_info["remaining"] - 1)),
            "X-RateLimit-Reset": str(rate_limit_info["reset"])
        })

        return Response(
            content=response.content,
            status_code=response.status_code,
            headers=response_headers
        )

    except Exception as e:
        import traceback

        error_type = type(e).__name__
        error_message = str(e)
        stack_trace = traceback.format_exc()

        logger.error(
            f"Error executing API {api_id}",
            extra={
                "api_id": api_id,
                "error": error_message,
                "error_type": error_type,
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

        # Build detailed error response with troubleshooting tips
        error_details = {
            "error": "API Execution Error",
            "error_type": error_type,
            "message": error_message,
            "request_id": request_id,
            "troubleshooting": []
        }

        # Add specific troubleshooting based on error type
        if "ConnectError" in error_type or "Connection" in error_message:
            error_details["troubleshooting"].extend([
                "The API container is not responding. This usually means:",
                "1. The container crashed due to missing dependencies",
                "2. The code has syntax errors or import failures",
                "3. The container is still starting up (wait 10-15 seconds)",
                "Check the backend logs for 'API deployed successfully' message",
                "Verify all required Python packages are listed in requirements"
            ])
        elif "timeout" in error_message.lower():
            error_details["troubleshooting"].extend([
                "The API request timed out. This could mean:",
                "1. The API endpoint is taking too long to process",
                "2. The API is stuck in an infinite loop",
                "3. Network issues between gateway and container",
                "Consider optimizing the API code or increasing timeout limits"
            ])
        elif "ModuleNotFoundError" in error_type or "ImportError" in error_type:
            error_details["troubleshooting"].extend([
                "Missing Python dependency detected:",
                "1. Add the missing package to the API's requirements field",
                "2. The API will automatically redeploy with the new dependency",
                "3. Common packages: Pillow (images), pandas (data), requests (HTTP)"
            ])
        else:
            error_details["troubleshooting"].extend([
                "An unexpected error occurred:",
                "1. Check the backend logs for detailed error information",
                "2. Verify the API code doesn't have syntax errors",
                "3. Ensure all API endpoints are properly defined",
                "4. Test the API code locally before deploying"
            ])

        # Add stack trace in development mode
        if settings.environment != "production":
            error_details["stack_trace"] = stack_trace

        return JSONResponse(
            status_code=500,
            content=error_details
        )


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8663,
        reload=True,
        log_level="info"
    )
