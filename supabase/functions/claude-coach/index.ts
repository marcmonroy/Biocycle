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

interface UserContext {
  name: string;
  phase: string;
  gender: string;
  language: string;
  currentAnxietyScore?: number;
  recentAnxietyAverage?: number | null;
}

interface RequestBody {
  messages: ChatMessage[];
  userContext: UserContext;
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
          error: "Coach service unavailable",
          errorCode: "MISSING_API_KEY",
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
          error: "Invalid request",
          errorCode: "INVALID_REQUEST",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { messages, userContext } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({
          error: "Messages required",
          errorCode: "MISSING_MESSAGES",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const isSpanish = userContext?.language === "ES";
    const genderLabel = userContext?.gender === "femenino" ? "Female" :
                        userContext?.gender === "masculino" ? "Male" : "Not specified";

    const anxietyContext = userContext?.currentAnxietyScore !== undefined
      ? `\n- Current biological anxiety vulnerability score: ${userContext.currentAnxietyScore}% (40-69 = elevated, 70+ = high vulnerability window)`
      : "";

    const recentAnxietyContext = userContext?.recentAnxietyAverage !== null && userContext?.recentAnxietyAverage !== undefined
      ? `\n- Recent self-reported anxiety average (last 5 checkins): ${userContext.recentAnxietyAverage}/10`
      : "";

    const systemPrompt = `You are BioCycle's AI coach. Help users understand their hormonal cycles and behavioral patterns. Speak with warmth and scientific grounding. Never judge.

Current user context:
- Name: ${userContext?.name || "User"}
- Current phase: ${userContext?.phase || "Unknown"}
- Gender: ${genderLabel}
- Language preference: ${isSpanish ? "Spanish" : "English"}${anxietyContext}${recentAnxietyContext}

When users ask about stress, anxiety, or emotional wellbeing, reference their current anxiety vulnerability score and recent self-reported anxiety data as context. Explain how their current biological phase affects anxiety vulnerability and provide phase-appropriate coping strategies.

Please respond in ${isSpanish ? "Spanish" : "English"}.`;

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
        system: systemPrompt,
        messages: messages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Anthropic API error:", response.status, errorText);

      let errorMessage = isSpanish
        ? "El coach no esta disponible. Intenta de nuevo."
        : "Coach temporarily unavailable. Try again shortly.";

      if (response.status === 401) {
        errorMessage = isSpanish
          ? "Error de autenticacion con el servicio."
          : "Authentication error with service.";
      } else if (response.status === 429) {
        errorMessage = isSpanish
          ? "Demasiadas solicitudes. Espera un momento."
          : "Too many requests. Please wait a moment.";
      }

      return new Response(
        JSON.stringify({
          error: errorMessage,
          errorCode: "API_ERROR",
        }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data = await response.json();
    const assistantMessage = data.content?.[0]?.text || "";

    if (!assistantMessage) {
      return new Response(
        JSON.stringify({
          error: isSpanish ? "Respuesta vacia" : "Empty response",
          errorCode: "EMPTY_RESPONSE",
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
        error: "Coach temporarily unavailable. Try again shortly.",
        errorCode: "INTERNAL_ERROR",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
