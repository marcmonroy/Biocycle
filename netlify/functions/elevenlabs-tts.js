const { createClient } = require('@supabase/supabase-js');

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

  // ── Proxy to ElevenLabs ─────────────────────────────────────────────────
  try {
    const { text, voiceId } = JSON.parse(event.body || '{}');

    if (!text || !voiceId) {
      return {
        statusCode: 400,
        headers: corsHeaders(requestOrigin),
        body: JSON.stringify({ error: 'text and voiceId are required' }),
      };
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        headers: corsHeaders(requestOrigin),
        body: JSON.stringify({ error: 'ELEVENLABS_API_KEY not configured' }),
      };
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true,
          },
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      return {
        statusCode: response.status,
        headers: corsHeaders(requestOrigin),
        body: JSON.stringify({ error: `ElevenLabs error ${response.status}: ${errorText}` }),
      };
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    return {
      statusCode: 200,
      headers: { ...corsHeaders(requestOrigin), 'Content-Type': 'application/json' },
      body: JSON.stringify({ audio: base64 }),
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers: corsHeaders(requestOrigin),
      body: JSON.stringify({ error: error.message }),
    };
  }
};
