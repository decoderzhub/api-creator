# AI Assistant Setup Guide

## Overview

The AI Assistant is now fully integrated with Anthropic's Claude API, featuring real-time streaming responses with a typewriter effect.

## Features

✅ **Real-time streaming** - Text appears as it's generated (typewriter effect)
✅ **Conversation history** - Maintains context across messages
✅ **Smart system prompt** - Specialized for API generation guidance
✅ **Loading states** - Visual feedback during responses
✅ **Error handling** - Graceful fallback if API is unavailable
✅ **Example prompts** - Quick start templates for common use cases

## Setup Instructions

### 1. Get Your Anthropic API Key

1. Go to https://console.anthropic.com/
2. Sign up or log in to your account
3. Navigate to **API Keys**
4. Click **Create Key**
5. Copy your API key (starts with `sk-ant-...`)

### 2. Deploy the Edge Function

The Edge Function is located at: `supabase/functions/ai-chat/index.ts`

Deploy it using the Supabase CLI or Dashboard:

```bash
# If using Supabase CLI
supabase functions deploy ai-chat
```

Or use the `mcp__supabase__deploy_edge_function` tool (already available).

### 3. Add Environment Variable to Supabase

1. Go to your **Supabase Dashboard**
2. Navigate to **Settings > Edge Functions**
3. Click **Add Secret**
4. Add:
   - Name: `ANTHROPIC_API_KEY`
   - Value: Your Anthropic API key (e.g., `sk-ant-...`)
5. Save

### 4. Test the AI Assistant

1. Open your application
2. Click the floating chat button (bottom-right)
3. Type a message or click an example prompt
4. Watch the response stream in real-time!

## How It Works

### Frontend (React Component)

**Location:** `src/components/layout/AIAssistant.tsx`

**Features:**
- Opens as a slide-in panel from the right
- Sends messages to the Edge Function
- Streams responses character-by-character
- Displays loading spinner while waiting
- Shows example prompts for quick access

**Conversation Flow:**
1. User types message
2. Message added to UI
3. API call to Edge Function
4. Response streams back
5. Text updates in real-time (typewriter effect)
6. Maintains last 6 messages for context

### Backend (Edge Function)

**Location:** `supabase/functions/ai-chat/index.ts`

**Features:**
- Securely stores API key server-side
- Calls Anthropic API with streaming
- Custom system prompt for API guidance
- Returns SSE (Server-Sent Events) stream
- Handles errors gracefully with fallback

**System Prompt:**
The AI is configured to:
- Help users generate APIs with various integrations
- Explain API key management
- Suggest appropriate third-party services
- Provide best practices (error handling, rate limiting, caching)
- Keep responses concise and actionable

## API Details

### Model Used
**Claude 3.5 Sonnet** (`claude-3-5-sonnet-20241022`)
- Latest and most capable model
- Excellent for technical guidance
- Fast response times
- Supports streaming

### Token Limits
- Max tokens per response: 1,024
- Conversation history: Last 6 messages (3 exchanges)
- Keeps API costs reasonable while maintaining context

### Streaming Format
Uses Anthropic's streaming API:
```typescript
{
  type: 'content_block_delta',
  delta: {
    text: 'streamed text chunk'
  }
}
```

## Customization

### Modify System Prompt

Edit `supabase/functions/ai-chat/index.ts`:

```typescript
const systemPrompt = `Your custom prompt here...`;
```

Redeploy the function after changes.

### Change Model

To use a different Claude model:

```typescript
model: "claude-3-5-sonnet-20241022", // Change this
```

Available models:
- `claude-3-5-sonnet-20241022` (recommended)
- `claude-3-opus-20240229` (most capable, slower)
- `claude-3-sonnet-20240229` (balanced)
- `claude-3-haiku-20240307` (fastest, cheapest)

### Adjust Max Tokens

```typescript
max_tokens: 1024, // Increase for longer responses
```

### Change Conversation History

In `AIAssistant.tsx`:

```typescript
conversationHistory: conversationHistory.slice(-6), // Change -6 to -10 for more context
```

## Cost Estimation

**Claude 3.5 Sonnet Pricing (as of Oct 2024):**
- Input: $3 per million tokens
- Output: $15 per million tokens

**Typical Usage:**
- Average prompt: ~100 tokens
- Average response: ~200 tokens
- Cost per interaction: ~$0.0033

**Monthly Estimates:**
- 100 interactions: ~$0.33
- 1,000 interactions: ~$3.30
- 10,000 interactions: ~$33.00

## Troubleshooting

### AI Assistant Not Responding

**Check:**
1. Edge Function is deployed
2. `ANTHROPIC_API_KEY` is set in Supabase
3. API key is valid
4. Check browser console for errors
5. Check Supabase Edge Function logs

**Fallback Mode:**
If API fails, it shows a helpful fallback message with tips.

### Streaming Not Working

**Check:**
1. Response headers include `text/event-stream`
2. Browser supports ReadableStream
3. CORS headers are correct
4. No proxy/firewall blocking SSE

### Rate Limits

Anthropic rate limits:
- Free tier: 5 requests/minute
- Paid tier: Higher limits

If you hit limits, responses will fail. Consider:
- Caching common questions
- Adding rate limiting in Edge Function
- Upgrading Anthropic tier

## Security

✅ **API Key Security:**
- Stored in Supabase (server-side)
- Never exposed to frontend
- Environment variable encryption

✅ **Request Validation:**
- Authenticated users only (via Supabase Auth)
- CORS properly configured
- Input sanitization

✅ **Cost Control:**
- Max token limits
- Conversation history limits
- Rate limiting possible (not yet implemented)

## Monitoring

### Check Usage

1. Go to https://console.anthropic.com/
2. Navigate to **Usage**
3. View API calls, tokens, and costs

### Edge Function Logs

1. Go to Supabase Dashboard
2. Navigate to **Edge Functions**
3. Select `ai-chat`
4. View logs for errors/debugging

## Future Enhancements

Potential improvements:

1. **User-specific context**
   - Load user's API keys
   - Reference user's existing APIs
   - Personalized suggestions

2. **Response caching**
   - Cache common questions
   - Reduce API costs
   - Faster responses

3. **Function calling**
   - Let AI directly generate APIs
   - Create API keys
   - Manage resources

4. **Multi-modal support**
   - Image understanding
   - Code analysis
   - API spec parsing

5. **Analytics**
   - Track popular questions
   - Measure response quality
   - Optimize prompts

## Testing

### Manual Testing

```
Test Prompts:
1. "How do I create an API for weather data?"
2. "What's the best way to store API keys?"
3. "Can you help me with image processing APIs?"
4. "How do I add rate limiting to my API?"
```

### Automated Testing

Consider adding:
- Edge Function unit tests
- Frontend component tests
- E2E tests for chat flow

## Resources

- [Anthropic Documentation](https://docs.anthropic.com/)
- [Claude API Reference](https://docs.anthropic.com/claude/reference)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)

## Support

For issues:
1. Check this guide
2. Review Supabase Edge Function logs
3. Check Anthropic console for API errors
4. Review browser console for frontend errors

---

**Status:** ✅ Fully Implemented
**Build:** ✅ Passes
**Features:** ✅ Streaming, Context, Error Handling
**Ready for:** Production (after API key setup)
