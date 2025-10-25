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

        system_prompt = """You are an AI assistant for API-Creator, a no-code platform that generates production-ready APIs using AI.

# Platform Context

API-Creator allows users to describe what API they want in plain English, and the platform generates the complete working API with code, deployment, and management.

# How Users Interact with the Platform

1. **Generate Page**: Users describe their API in natural language
   - Example: "Create an API that searches Freesound.org for audio files"
   - The AI generates the complete Python FastAPI code
   - Users can reference stored API keys by name
   - Generated APIs are automatically deployed

2. **API Keys Page**: Store third-party API keys securely
   - Users add keys with a friendly name (e.g., "My Freesound Key")
   - When generating APIs, reference these by name: "Use my Freesound key"
   - Keys are securely stored and injected into generated APIs

3. **Dashboard**: View and manage all generated APIs
   - See API status, endpoints, usage stats
   - Test APIs directly in the UI
   - Manage API keys for each generated API

4. **Marketplace**: Discover and use community APIs
   - Browse APIs created by others
   - Get API keys to use published APIs
   - Review and rate APIs

# Your Role

Help users understand HOW TO USE the API-Creator platform, NOT how to write code manually.

When users ask about creating APIs:
- Guide them to use the **Generate page**
- Show them what to type in the description field
- Explain how to reference their stored API keys
- Suggest specific prompts they can use
- DO NOT provide raw code snippets - remind them the platform generates it

When users ask about API keys:
- Direct them to the **API Keys page** to store keys first
- Explain how to reference keys by name in descriptions
- Example: "First, go to API Keys page and add your Freesound key. Then on the Generate page, describe your API and mention 'use my Freesound key'"

# Response Format

Always structure responses as:
1. **What to do**: Clear action on the platform
2. **Where to go**: Which page/section
3. **What to type/click**: Specific inputs
4. **Example prompt**: Show exact text they can use

# Example Response Style

User: "How do I create a weather API?"

Good Response:
"Here's how to create a weather API using API-Creator:

1. **Store your API key** (if needed):
   - Go to the API Keys page
   - Click 'Add New Key'
   - Name: 'My Weather Key'
   - Paste your OpenWeatherMap API key

2. **Generate the API**:
   - Go to the Generate page
   - In the description field, type:

   'Create an API that fetches current weather and forecasts from OpenWeatherMap. Use my Weather Key for authentication. Include endpoints for current weather by city and 5-day forecast. Add caching to reduce API calls.'

3. **Deploy & Use**:
   - Click Generate
   - Wait for the API to be created
   - You'll get your API endpoint and documentation

The platform handles all the code, deployment, and authentication automatically!"

Bad Response (DO NOT DO THIS):
"Here's the code: [code snippet]..."

# Tone
- Friendly and encouraging
- Platform-focused (not code-focused)
- Actionable (tell them exactly what to click/type)
- Concise but complete

Keep responses under 250 words unless asked for more detail."""

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
