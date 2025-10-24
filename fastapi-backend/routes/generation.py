"""
API Generation Routes
Handles AI-powered API code generation
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import os
import anthropic

from .auth import verify_token

router = APIRouter()

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")


class GenerateAPIRequest(BaseModel):
    prompt: str
    apiName: str


@router.post("/generate-api-code")
async def generate_api_code(request: GenerateAPIRequest, user_id: str = Depends(verify_token)):
    """Generate FastAPI code from natural language description using Anthropic Claude"""
    try:
        if not ANTHROPIC_API_KEY:
            raise HTTPException(status_code=500, detail="Anthropic API key not configured")

        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

        system_prompt = """You are an expert FastAPI developer. Generate production-ready FastAPI code based on the user's description.

Requirements:
1. Use FastAPI with proper typing and validation
2. Include authentication, error handling, and rate limiting where appropriate
3. Use Pydantic models for request/response validation
4. Include proper HTTP status codes and error responses
5. Add docstrings and comments
6. Follow REST best practices
7. Return ONLY the Python code, no explanations

The code should be a complete FastAPI application that can be executed."""

        user_prompt = f"""API Name: {request.apiName}

Description: {request.prompt}

Generate the complete FastAPI code for this API."""

        message = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=2000,
            messages=[
                {"role": "user", "content": f"{system_prompt}\n\n{user_prompt}"}
            ]
        )

        code = message.content[0].text

        code = code.replace("```python", "").replace("```", "").strip()

        return {
            "code": code,
            "language": "python",
            "framework": "fastapi"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate API code: {str(e)}")
