"""
AI Chat Assistant Route
Handles streaming chat with Anthropic Claude API
"""
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
import anthropic
import json

from config import get_settings

router = APIRouter()
settings = get_settings()


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    conversationHistory: Optional[List[ChatMessage]] = None


async def generate_stream(message: str, conversation_history: List[ChatMessage] = None):
    """Generate streaming response from Anthropic API"""
    try:
        client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

        system_prompt = """You are an AI assistant for API-Creator, a platform that helps users generate and manage APIs using AI.

Your role:
- Help users understand how to generate APIs with various integrations (sound, images, weather, etc.)
- Explain how to reference stored API keys when generating APIs
- Provide guidance on API best practices
- Suggest appropriate third-party services for different use cases
- Keep responses concise and actionable

Key points to remember:
1. Users can store API keys in the "API Keys" page
2. When generating APIs, users should reference keys by name (e.g., "Use my OpenAI key")
3. Encourage proper error handling, rate limiting, and caching
4. Suggest specific services: Freesound for audio, Cloudinary for images, OpenWeatherMap for weather, etc.
5. Always be helpful and encouraging

Keep responses under 200 words unless more detail is specifically requested."""

        messages = []
        if conversation_history:
            messages = [{"role": msg.role, "content": msg.content} for msg in conversation_history]

        messages.append({"role": "user", "content": message})

        with client.messages.stream(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1024,
            system=system_prompt,
            messages=messages,
        ) as stream:
            for text in stream.text_stream:
                chunk = {
                    "type": "content_block_delta",
                    "delta": {"text": text}
                }
                yield f"data: {json.dumps(chunk)}\n\n"

        yield "data: [DONE]\n\n"

    except Exception as e:
        error_chunk = {
            "type": "error",
            "error": str(e)
        }
        yield f"data: {json.dumps(error_chunk)}\n\n"


@router.post("/ai-chat")
async def chat(request: ChatRequest):
    """
    Stream chat responses from Claude AI

    Returns: Server-Sent Events stream with chat responses
    """
    try:
        return StreamingResponse(
            generate_stream(request.message, request.conversationHistory),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
