const { createClient } = require('@supabase/supabase-js');

// Minimal safety-net prompt used only when the client sends no system prompt at all
const FALLBACK_SYSTEM = `You are Jules, BioCycle's biological intelligence coach. You are warm, grounded, wise, and experienced. You speak from a place of earned knowledge, not theory. You are direct but gentle. You make data collection feel like an act of care.`;

const APPROVED_MODEL  = 'claude-sonnet-4-6';
const MAX_TOKENS_CAP  = 1024;

const ALLOWED_ORIGINS = [
  'https://app.biocycle.app',
  'https://biocycle.app',
  'capacitor://localhost',
  'http://localhost',
];

function corsHeaders(requestOrigin) {
  const origin = ALLOWED_ORIGINS.includes(requestOrigin)
    ? requestOrigin
    : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin':  origin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

exports.handler = async (event) => {
  const requestOrigin = event.headers.origin || '';

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders(requestOrigin), body: '' };
  }

  // ── Auth ────────────────────────────────────────────────────────────────
  const authHeader = event.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) {
    return { statusCode: 401, headers: corsHeaders(requestOrigin), body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
  );
  const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !user) {
    return { statusCode: 401, headers: corsHeaders(requestOrigin), body: JSON.stringify({ error: 'Invalid token' }) };
  }

  // ── Build request ────────────────────────────────────────────────────────
  try {
    const parsed = JSON.parse(event.body || '{}');

    // Strip client-only fields — not valid Anthropic API fields
    delete parsed.picardia_mode;
    delete parsed.days_of_data;

    // Force approved model — never trust the client for this
    parsed.model = APPROVED_MODEL;

    // Clamp max_tokens to server-side ceiling
    parsed.max_tokens = Math.min(parsed.max_tokens ?? MAX_TOKENS_CAP, MAX_TOKENS_CAP);

    // If the client did not provide a system prompt (should never happen in normal flow),
    // inject the safety-net Jules prompt with today's date.
    if (!parsed.system) {
      const todayDate = new Date().toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      });
      parsed.system = `Today is ${todayDate}. Any date before today has already happened. Never tell a user a past date has not occurred.\n\n${FALLBACK_SYSTEM}`;
    }
    // When the client provides a system prompt it already contains the date line and the
    // correct coach identity (Jules or Sienna). Do NOT modify it here.

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(parsed),
    });

    const data = await response.json();
    return {
      statusCode: 200,
      headers: { ...corsHeaders(requestOrigin), 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers: corsHeaders(requestOrigin),
      body: JSON.stringify({ error: error.message }),
    };
  }
};
