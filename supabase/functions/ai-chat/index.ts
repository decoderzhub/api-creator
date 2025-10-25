import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { message, conversationHistory } = await req.json();

    if (!ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Anthropic API key not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const messages = [
      ...(conversationHistory || []),
      {
        role: "user",
        content: message,
      },
    ];

    const systemPrompt = `You are an AI assistant for API-Creator, a platform that helps users generate and manage APIs using AI.

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

Keep responses under 200 words unless more detail is specifically requested.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1024,
        system: systemPrompt,
        messages: messages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${error}`);
    }

    const stream = response.body;
    if (!stream) {
      throw new Error("No response stream");
    }

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to process request",
        fallback: "I apologize, but I'm having trouble connecting right now. Here are some tips for generating APIs:\n\n1. Store your API keys in the API Keys page\n2. Reference them by name when describing your API\n3. Include proper error handling and rate limiting\n4. Consider caching responses to reduce costs\n\nWhen ready, go to the Generate page and describe your API!"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
