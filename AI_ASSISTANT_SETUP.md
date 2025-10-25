# AI Assistant Setup Guide

## Overview

The AI Assistant is fully integrated with your existing **FastAPI backend**, using Anthropic's Claude API for real-time streaming responses with a typewriter effect.

## ⚡ Already Working!

The AI Assistant is **already configured** in your FastAPI backend! The Anthropic API key is set up in your existing backend infrastructure.

**No additional setup required** - it just works! 🎉

## Features

✅ **Real-time streaming** - Text appears as it's generated (typewriter effect)
✅ **Conversation history** - Maintains context across messages
✅ **Smart system prompt** - Specialized for API generation guidance
✅ **Loading states** - Visual feedback during responses
✅ **Error handling** - Graceful fallback if API is unavailable
✅ **Example prompts** - Quick start templates for common use cases
✅ **Integrated with FastAPI** - Uses your existing backend

## Architecture

### Backend (FastAPI)

**New Route:** `fastapi-backend/routes/ai_chat.py`

**Endpoint:** `POST /api/ai-chat`

**Already integrated into:** `fastapi-backend/main.py`

**Configuration:** API key from `fastapi-backend/config.py` (already set)

### Frontend (React)

**Component:** `src/components/layout/AIAssistant.tsx`

**Calls:** `${VITE_FASTAPI_GATEWAY_URL}/api/ai-chat`

## How to Use

1. **Start FastAPI backend** (if not running):
   ```bash
   cd fastapi-backend
   python main.py
   ```

2. **Start frontend**:
   ```bash
   npm run dev
   ```

3. **Click chat button** in bottom-right corner

4. **Type or click example prompts** - watch responses stream!

## What It Does

The AI Assistant helps users understand **how to use the API-Creator platform**, NOT how to write code.

**Platform-Focused Guidance:**
- ✅ Guides users through the Generate page
- ✅ Shows example prompts to type
- ✅ Explains how to store and use API keys
- ✅ Walks through platform features
- ✅ Provides step-by-step instructions

**It Will NOT:**
- ❌ Provide raw code snippets
- ❌ Explain how to manually code APIs
- ❌ Give programming tutorials

**Example Interaction:**

```
User: "How do I create a weather API?"

AI Response:
"Here's how to create a weather API using API-Creator:

1. Store your API key (if needed):
   - Go to the API Keys page
   - Click 'Add New Key'
   - Name: 'My Weather Key'
   - Paste your OpenWeatherMap API key

2. Generate the API:
   - Go to the Generate page
   - In the description field, type:

   'Create an API that fetches current weather and forecasts
   from OpenWeatherMap. Use my Weather Key for authentication.
   Include endpoints for current weather by city and 5-day
   forecast. Add caching to reduce API calls.'

3. Deploy & Use:
   - Click Generate
   - Wait for the API to be created
   - You'll get your API endpoint and documentation

The platform handles all the code, deployment, and
authentication automatically!"
```

## Testing

Try these platform-focused prompts:
- "How do I create an API for weather data?"
- "I have a Freesound API key, how do I use it?"
- "Can you show me what to type in the Generate page?"
- "Walk me through creating my first API step by step"

## Technical Details

**Model:** Claude 3.5 Sonnet (`claude-3-5-sonnet-20241022`)
**Max Tokens:** 1,024 per response
**History:** Last 6 messages (3 exchanges)
**Streaming:** Server-Sent Events (SSE)

## Cost Estimation

**Per interaction:** ~$0.0033
**100 chats:** ~$0.33
**1,000 chats:** ~$3.30

## Files Changed

**New:**
- ✅ `fastapi-backend/routes/ai_chat.py` - AI chat endpoint

**Modified:**
- ✅ `fastapi-backend/main.py` - Added router
- ✅ `src/components/layout/AIAssistant.tsx` - Now calls FastAPI

**Removed:**
- ❌ `supabase/functions/ai-chat/` - No longer needed!

## Troubleshooting

**Not responding?**
1. Check FastAPI backend is running
2. Verify API key in `fastapi-backend/.env`
3. Check browser console for errors
4. Check FastAPI terminal for logs

**Test backend directly:**
```bash
curl -X POST http://localhost:8663/api/ai-chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello"}'
```

## Customization

**Change system prompt:** Edit `fastapi-backend/routes/ai_chat.py`

**Change model:** Update model name in `ai_chat.py`

**Adjust tokens:** Modify `max_tokens` value

**More history:** Change `.slice(-6)` to `.slice(-10)` in frontend

---

**Status:** ✅ Working with FastAPI backend
**Setup Required:** None (already configured)
**Ready for:** Immediate use!
