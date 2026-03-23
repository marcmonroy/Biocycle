import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface RequestBody {
  messages: ChatMessage[];
  system: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");

    if (!anthropicApiKey) {
      console.error("ANTHROPIC_API_KEY environment variable is not set");
      return new Response(
        JSON.stringify({
          error: "API key not configured",
          errorCode: "MISSING_API_KEY",
          message: "The coach service is not available. Please contact support."
        }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let body: RequestBody;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({
          error: "Invalid request body",
          errorCode: "INVALID_REQUEST"
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { messages, system } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({
          error: "Messages are required",
          errorCode: "MISSING_MESSAGES"
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: system || "You are a helpful assistant.",
        messages: messages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Anthropic API error:", response.status, errorText);

      let errorMessage = "The coach is temporarily unavailable. Please try again.";
      if (response.status === 401) {
        errorMessage = "Authentication error with AI service.";
      } else if (response.status === 429) {
        errorMessage = "Too many requests. Please wait a moment and try again.";
      } else if (response.status >= 500) {
        errorMessage = "The AI service is experiencing issues. Please try again later.";
      }

      return new Response(
        JSON.stringify({
          error: errorMessage,
          errorCode: "API_ERROR",
          status: response.status
        }),
        {
          status: response.status >= 500 ? 503 : response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data = await response.json();
    const assistantMessage = data.content?.[0]?.text || "";

    if (!assistantMessage) {
      return new Response(
        JSON.stringify({
          error: "Empty response from AI",
          errorCode: "EMPTY_RESPONSE"
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ content: assistantMessage, success: true }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({
        error: "An unexpected error occurred. Please try again.",
        errorCode: "INTERNAL_ERROR"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
