"""
API routes for integration code generation and management.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Header
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid

from supabase import create_client
from config import get_settings
from logger import logger

settings = get_settings()

router = APIRouter(prefix="/integration", tags=["integrations"])


def get_supabase_client():
    """Get Supabase client instance"""
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


async def get_current_user(authorization: str = Header(None)) -> dict:
    """Extract and verify user from authorization header"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization header"
        )

    token = authorization.replace("Bearer ", "")
    supabase = get_supabase_client()

    try:
        user_response = supabase.auth.get_user(token)
        if not user_response or not user_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
        return {"id": user_response.user.id, "email": user_response.user.email}
    except Exception as e:
        logger.error(f"Authentication error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed"
        )


class GenerateIntegrationRequest(BaseModel):
    """Request body for generating integration code."""
    api_id: str = Field(..., description="UUID of the API to integrate")
    description: str = Field(..., description="What the user wants to accomplish")
    target_language: str = Field(..., description="Target programming language")
    integration_type: str = Field(default="custom", description="Type of integration")
    save_template: bool = Field(default=True, description="Save as template for reuse")


class GenerateSDKRequest(BaseModel):
    """Request body for generating SDK code."""
    api_id: str = Field(..., description="UUID of the API")
    languages: List[str] = Field(..., description="Target languages for SDK generation")


class IntegrationResponse(BaseModel):
    """Response containing generated integration code."""
    id: Optional[str] = None
    code: str
    dependencies: List[str]
    setup_instructions: str
    usage_example: str
    language: str
    integration_type: str


class SavedIntegrationResponse(BaseModel):
    """Response for saved integration templates."""
    id: str
    template_name: str
    integration_type: str
    target_language: str
    description: Optional[str] = None
    created_at: datetime


@router.post("/generate", response_model=IntegrationResponse)
async def generate_integration(
    request: GenerateIntegrationRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Generate integration code for a user's API.

    This endpoint:
    1. Retrieves the API details from database
    2. Calls Claude to generate integration code
    3. Optionally saves the code as a template
    4. Returns the generated code with dependencies and instructions
    """

    from services.integration_generator import integration_generator

    supabase = get_supabase_client()
    user_id = current_user["id"]

    try:
        api_response = supabase.table("apis").select("*").eq("id", request.api_id).eq("user_id", user_id).execute()

        if not api_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="API not found or you don't have permission to access it"
            )

        api_data = api_response.data[0]

        logger.info(f"Generating integration code for API {request.api_id}", extra={
            "user_id": user_id,
            "api_id": request.api_id,
            "language": request.target_language,
            "integration_type": request.integration_type
        })

        result = integration_generator.generate_integration_code(
            api_endpoint=api_data["endpoint_url"],
            api_key=api_data["api_key"],
            api_description=api_data.get("description", api_data.get("prompt", "")),
            user_description=request.description,
            target_language=request.target_language,
            integration_type=request.integration_type
        )

        template_id = None
        if request.save_template:
            template_name = f"{api_data['name']} - {request.integration_type} ({request.target_language})"

            template_data = {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "api_id": request.api_id,
                "template_name": template_name,
                "integration_type": request.integration_type,
                "target_language": request.target_language,
                "code": result["code"],
                "description": request.description,
                "dependencies": result["dependencies"],
                "setup_instructions": result["setup_instructions"]
            }

            save_response = supabase.table("integration_templates").insert(template_data).execute()

            if save_response.data:
                template_id = save_response.data[0]["id"]

                supabase.table("apis").update({
                    "integration_count": api_data.get("integration_count", 0) + 1
                }).eq("id", request.api_id).execute()

        return IntegrationResponse(
            id=template_id,
            code=result["code"],
            dependencies=result["dependencies"],
            setup_instructions=result["setup_instructions"],
            usage_example=result.get("usage_example", ""),
            language=request.target_language,
            integration_type=request.integration_type
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to generate integration: {str(e)}", extra={
            "user_id": user_id,
            "api_id": request.api_id
        })
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate integration code: {str(e)}"
        )


@router.post("/generate-sdk")
async def generate_sdk(
    request: GenerateSDKRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Generate SDK code in multiple languages for an API.

    Returns a dictionary mapping each language to its SDK code.
    """

    from services.integration_generator import integration_generator

    supabase = get_supabase_client()
    user_id = current_user["id"]

    try:
        api_response = supabase.table("apis").select("*").eq("id", request.api_id).eq("user_id", user_id).execute()

        if not api_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="API not found"
            )

        api_data = api_response.data[0]

        api_methods = [
            {"method": "GET", "path": "/", "description": "Root endpoint"},
            {"method": "POST", "path": "/", "description": "Create resource"},
        ]

        logger.info(f"Generating SDKs for API {request.api_id}", extra={
            "user_id": user_id,
            "api_id": request.api_id,
            "languages": request.languages
        })

        results = integration_generator.generate_sdk(
            api_endpoint=api_data["endpoint_url"],
            api_key=api_data["api_key"],
            api_description=api_data.get("description", ""),
            api_methods=api_methods,
            languages=request.languages
        )

        return {
            "api_id": request.api_id,
            "sdks": results
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to generate SDKs: {str(e)}", extra={
            "user_id": user_id,
            "api_id": request.api_id
        })
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate SDKs: {str(e)}"
        )


@router.get("/templates", response_model=List[SavedIntegrationResponse])
async def get_user_templates(
    api_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Get user's saved integration templates.
    Optionally filter by API ID.
    """

    supabase = get_supabase_client()
    user_id = current_user["id"]

    try:
        query = supabase.table("integration_templates").select("*").eq("user_id", user_id)

        if api_id:
            query = query.eq("api_id", api_id)

        response = query.order("created_at", desc=True).execute()

        return response.data

    except Exception as e:
        logger.error(f"Failed to fetch templates: {str(e)}", extra={"user_id": user_id})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch integration templates"
        )


@router.get("/templates/{template_id}")
async def get_template(
    template_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific integration template by ID."""

    supabase = get_supabase_client()
    user_id = current_user["id"]

    try:
        response = supabase.table("integration_templates").select("*").eq("id", template_id).eq("user_id", user_id).execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Template not found"
            )

        return response.data[0]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch template: {str(e)}", extra={
            "user_id": user_id,
            "template_id": template_id
        })
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch template"
        )


@router.delete("/templates/{template_id}")
async def delete_template(
    template_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete an integration template."""

    supabase = get_supabase_client()
    user_id = current_user["id"]

    try:
        response = supabase.table("integration_templates").delete().eq("id", template_id).eq("user_id", user_id).execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Template not found"
            )

        return {"message": "Template deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete template: {str(e)}", extra={
            "user_id": user_id,
            "template_id": template_id
        })
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete template"
        )


@router.get("/system-templates")
async def get_system_templates(
    integration_type: Optional[str] = None
):
    """
    Get pre-built system integration templates.
    These are available to all users.
    """

    supabase = get_supabase_client()

    try:
        query = supabase.table("integration_templates").select("id, template_name, integration_type, target_language, description, created_at").eq("is_template", True)

        if integration_type:
            query = query.eq("integration_type", integration_type)

        response = query.execute()

        return response.data

    except Exception as e:
        logger.error(f"Failed to fetch system templates: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch system templates"
        )
