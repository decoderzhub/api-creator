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
    """Deploy an API by rebuilding its Docker container with latest code and updating status"""
    try:
        from logger import logger

        logger.info(f"=== DEPLOY API REQUEST for {request.apiId} ===")

        supabase = get_supabase_client()
        response = supabase.table("apis").select("*").eq("id", request.apiId).eq("user_id", user_id).execute()

        if not response.data:
            raise HTTPException(status_code=404, detail="API not found")

        api_data = response.data[0]
        code = api_data.get("code_snapshot")
        requirements = api_data.get("requirements")

        if not code:
            raise HTTPException(status_code=400, detail="API has no code to deploy")

        logger.info(f"Fetched code from database, length: {len(code)} characters")
        logger.info(f"First 200 chars of code: {code[:200]}...")

        # Deploy the API using the deployer (rebuild container with latest code)
        if req and hasattr(req.app.state, 'api_deployer'):
            api_deployer = req.app.state.api_deployer
            logger.info(f"Calling api_deployer.deploy_api() - this will rebuild the container")
            port = await api_deployer.deploy_api(request.apiId, code, requirements)
            logger.info(f"Container rebuilt successfully on port {port}")
        else:
            raise HTTPException(status_code=500, detail="API deployer not available")

        # Update status to active
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
            "port": port,
            "message": "API deployed successfully with latest code"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to deploy API: {str(e)}")


@router.get("/diagnose-api/{api_id}")
async def diagnose_api(api_id: str, user_id: str = Depends(verify_token), req: Request = None):
    """Get diagnostic information about a deployed API container"""
    try:
        supabase = get_supabase_client()

        # Verify user owns this API
        response = supabase.table("apis").select("*").eq("id", api_id).eq("user_id", user_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="API not found")

        # Get container diagnostics
        if req and hasattr(req.app.state, 'api_deployer'):
            api_deployer = req.app.state.api_deployer
            diagnosis = await api_deployer.diagnose_container_error(api_id)
            return {
                "success": True,
                "apiId": api_id,
                "diagnosis": diagnosis
            }
        else:
            raise HTTPException(status_code=500, detail="API deployer not available")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to diagnose API: {str(e)}")


@router.get("/container-logs/{api_id}")
async def get_container_logs(api_id: str, user_id: str = Depends(verify_token), req: Request = None, tail: int = 100):
    """Get container logs for an API"""
    try:
        supabase = get_supabase_client()

        # Verify user owns this API
        response = supabase.table("apis").select("*").eq("id", api_id).eq("user_id", user_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="API not found")

        # Get logs
        if req and hasattr(req.app.state, 'api_deployer'):
            api_deployer = req.app.state.api_deployer
            logs = api_deployer.get_container_logs(api_id, tail=tail)
            return {
                "success": True,
                "apiId": api_id,
                "logs": logs
            }
        else:
            raise HTTPException(status_code=500, detail="API deployer not available")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get logs: {str(e)}")


@router.get("/container-info/{api_id}")
async def get_container_info(api_id: str, user_id: str = Depends(verify_token), req: Request = None):
    """Get detailed container information including name, ports, status"""
    try:
        supabase = get_supabase_client()

        # Verify user owns this API
        response = supabase.table("apis").select("*").eq("id", api_id).eq("user_id", user_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="API not found")

        # Get container info
        if req and hasattr(req.app.state, 'api_deployer'):
            api_deployer = req.app.state.api_deployer
            info = api_deployer.get_container_info(api_id)
            return {
                "success": True,
                "apiId": api_id,
                "container": info
            }
        else:
            raise HTTPException(status_code=500, detail="API deployer not available")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get container info: {str(e)}")


@router.post("/container-stop/{api_id}")
async def stop_container(api_id: str, user_id: str = Depends(verify_token), req: Request = None):
    """Stop a running container"""
    try:
        supabase = get_supabase_client()

        # Verify user owns this API
        response = supabase.table("apis").select("*").eq("id", api_id).eq("user_id", user_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="API not found")

        # Stop container
        if req and hasattr(req.app.state, 'api_deployer'):
            api_deployer = req.app.state.api_deployer
            success = await api_deployer.stop_api(api_id)
            if success:
                return {
                    "success": True,
                    "apiId": api_id,
                    "message": "Container stopped successfully"
                }
            else:
                raise HTTPException(status_code=404, detail="Container not found")
        else:
            raise HTTPException(status_code=500, detail="API deployer not available")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to stop container: {str(e)}")


@router.post("/container-start/{api_id}")
async def start_container(api_id: str, user_id: str = Depends(verify_token), req: Request = None):
    """Start/restart a container with current code"""
    try:
        supabase = get_supabase_client()

        # Verify user owns this API and get the code
        response = supabase.table("apis").select("*").eq("id", api_id).eq("user_id", user_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="API not found")

        api_data = response.data[0]
        code = api_data.get("code_snapshot")
        requirements = api_data.get("requirements")

        if not code:
            raise HTTPException(status_code=400, detail="API has no code to deploy")

        # Deploy/restart container
        if req and hasattr(req.app.state, 'api_deployer'):
            api_deployer = req.app.state.api_deployer
            port = await api_deployer.deploy_api(api_id, code, requirements)
            return {
                "success": True,
                "apiId": api_id,
                "port": port,
                "message": "Container started successfully"
            }
        else:
            raise HTTPException(status_code=500, detail="API deployer not available")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start container: {str(e)}")
