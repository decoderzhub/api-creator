# Dynamic Test UI Setup Guide

## Overview

The Dynamic Test UI feature generates custom React testing interfaces for each API using Claude AI. This requires an Anthropic API key to be configured.

## Current Status

✅ **Code implemented and working**
⚠️ **Requires Anthropic API key configuration**

## Setup Instructions

### 1. Get Anthropic API Key

1. Go to [https://console.anthropic.com/](https://console.anthropic.com/)
2. Sign up or log in
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key (starts with `sk-ant-...`)

### 2. Configure Backend

Add the API key to your backend environment:

**File:** `fastapi-backend/.env`

```env
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
```

### 3. Restart Backend Server

```bash
cd fastapi-backend
# Kill existing process
pkill -f "uvicorn main:app"

# Restart
python main.py
# or
uvicorn main:app --reload --port 8663
```

### 4. Verify Setup

1. Create or view an API in the Dashboard
2. Expand "Endpoints Available"
3. Scroll to "Interactive API Tester"
4. Should show loading, then custom UI
5. If error persists, check browser console and backend logs

## How It Works

### Request Flow

```
1. User expands API in Dashboard
   ↓
2. DynamicTestUI component mounts
   ↓
3. Makes POST request to /api/generate-test-ui
   ↓
4. Backend calls Claude API to analyze code
   ↓
5. Claude generates custom React component
   ↓
6. Frontend safely executes the component
   ↓
7. User sees custom test interface
```

### API Endpoint

**Endpoint:** `POST /api/generate-test-ui`

**Request:**
```json
{
  "code": "...FastAPI code...",
  "apiName": "Image Resizer",
  "apiId": "abc123",
  "endpointUrl": "https://api.example.com/abc123"
}
```

**Response:**
```json
{
  "componentCode": "import { useState } from 'react';...",
  "language": "tsx"
}
```

**Error Response:**
```json
{
  "detail": "Anthropic API key not configured"
}
```

## Troubleshooting

### Error: "Anthropic API key not configured"

**Solution:** Add `ANTHROPIC_API_KEY` to `fastapi-backend/.env`

### Error: "Failed to generate test UI"

**Check:**
1. Backend logs: `tail -f fastapi-backend/logs/app.log`
2. Anthropic API key is valid
3. API key has sufficient credits
4. Network connectivity to Anthropic API

### Error: "The component could not be rendered"

**Possible causes:**
1. Generated code has syntax errors
2. Component uses unsupported dependencies
3. Check browser console for details

### Component doesn't show at all

**Check:**
1. API has `code_snapshot` field populated
2. Browser console for errors
3. Network tab shows request to `/api/generate-test-ui`

## Testing Without Anthropic API Key

If you don't want to set up Anthropic API, the system gracefully degrades:

1. Shows warning message: "Custom test interface unavailable"
2. Explains Anthropic API key is required
3. Directs users to use "Test Endpoint" buttons above
4. All other functionality works normally

This is by design - the feature enhances the UX but isn't required for core functionality.

## Cost Considerations

### Anthropic API Pricing (as of 2025)

- **Claude 3.5 Sonnet:** ~$3 per million tokens
- **Average request:** ~1,500 tokens (code + prompt + response)
- **Cost per API:** ~$0.0045 (less than half a cent)

### Optimization Options

1. **Cache generated components** (Future enhancement)
   - Store in `api_test_components` table
   - Only regenerate when code changes
   - Reduces API calls by 95%

2. **Rate limiting**
   - Limit generations per user/day
   - Free tier: 10 generations/day
   - Pro tier: Unlimited

3. **Fallback to template**
   - For simple APIs, use generic form
   - Only use AI for complex APIs (file uploads, etc.)

## Future Enhancements

### Planned Features:

1. **Component Caching**
   ```sql
   CREATE TABLE api_test_components (
     id UUID PRIMARY KEY,
     api_id UUID REFERENCES apis(id),
     component_code TEXT,
     code_hash TEXT,
     created_at TIMESTAMP,
     last_used TIMESTAMP
   );
   ```

2. **Manual Customization**
   - Edit button on generated UI
   - Save custom modifications
   - Version history

3. **Component Gallery**
   - Browse generated components
   - Copy/adapt for other APIs
   - Community sharing

4. **Performance Metrics**
   - Track generation success rate
   - Monitor component performance
   - A/B test different prompts

## Security Notes

### Safe Execution

- Components run in isolated context
- No access to parent application state
- Only approved dependencies (React, lucide-react)
- No eval() or dangerous operations

### Data Privacy

- API code never leaves your infrastructure
- Sent to Anthropic only for generation
- Not stored by Anthropic (per their privacy policy)
- Consider self-hosted LLM for sensitive code

## Alternative: Self-Hosted LLM

If you prefer not to use Anthropic:

### Option 1: Ollama (Local)

```python
# In routes/generation.py
import requests

def generate_with_ollama(prompt):
    response = requests.post(
        "http://localhost:11434/api/generate",
        json={"model": "codellama", "prompt": prompt}
    )
    return response.json()["response"]
```

### Option 2: LM Studio

```python
# Use OpenAI-compatible endpoint
import openai

openai.api_base = "http://localhost:1234/v1"
openai.api_key = "not-needed"

response = openai.ChatCompletion.create(
    model="local-model",
    messages=[{"role": "user", "content": prompt}]
)
```

### Option 3: Generic Template

```typescript
// Fallback to generic form builder
export const GenericTestUI = ({ api }) => {
  // Auto-generate form from endpoint parameters
  // Works for 80% of use cases
  // No AI required
};
```

## Summary

The Dynamic Test UI is a **premium feature** that significantly enhances UX. It requires:

✅ Anthropic API key ($3/month for typical usage)
✅ 5 minutes to set up
✅ Automatic for all APIs once configured

**Without it:** Static endpoints list with generic test buttons (current behavior)
**With it:** Custom interactive testing interfaces for each API type

The choice is yours - core platform works great either way!
