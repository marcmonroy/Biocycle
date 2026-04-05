// Twilio WhatsApp sender
// Reads sender from TWILIO_WHATSAPP_FROM env var (current: whatsapp:+16625688859)
//
// action: 'send_verification'
//   → generates crypto-random 6-digit code server-side
//   → stores in whatsapp_verification_codes via Supabase REST API
//     (requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY env vars in Netlify —
//      NOTE: these are NOT the same as VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)
//   → sends WhatsApp message
//   → first attempts plain text Body; if Twilio rejects (21656 = template required),
//     falls back to template ContentSid with code as variable {{1}}
//
// action: 'test_verification' — sends hardcoded code "999999", logs full Twilio response
//
// Default (no action) — sends template message. Requires: to, teaserText.

const { randomInt } = require('crypto');

exports.handler = async (event) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  let parsed = {};
  try {
    parsed = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const { to, language = 'EN', teaserText, action, userId } = parsed;

  console.log('[send-whatsapp] action:', action);
  console.log('[send-whatsapp] to:', to);

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;
  const from       = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+16625688859';

  console.log('[send-whatsapp] TWILIO_WHATSAPP_FROM at runtime:', from);
  console.log('[send-whatsapp] TWILIO_ACCOUNT_SID present:', !!accountSid);
  console.log('[send-whatsapp] TWILIO_AUTH_TOKEN present:', !!authToken);

  if (!accountSid || !authToken) {
    console.error('[send-whatsapp] Missing Twilio credentials');
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Missing Twilio credentials' }),
    };
  }

  const toNumber = to && to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

  // ── Test endpoint ─────────────────────────────────────────────────────────
  if (action === 'test_verification') {
    console.log('[send-whatsapp] TEST MODE — sending hardcoded code 999999 to', toNumber);
    const testPayload = new URLSearchParams({
      From: from,
      To:   toNumber,
      Body: 'BioCycle TEST: Your verification code is 999999. It expires in 10 minutes.',
    });
    try {
      const testRes = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization:  `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
          },
          body: testPayload.toString(),
        }
      );
      const testData = await testRes.json();
      console.log('[send-whatsapp] TEST Twilio response status:', testRes.status);
      console.log('[send-whatsapp] TEST Twilio response body:', JSON.stringify(testData));
      return {
        statusCode: testRes.ok ? 200 : testRes.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ twilio_status: testRes.status, twilio_response: testData }),
      };
    } catch (err) {
      console.error('[send-whatsapp] TEST fetch error:', err.message);
      return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: err.message }) };
    }
  }

  // ── Verification code flow ────────────────────────────────────────────────
  if (action === 'send_verification') {
    if (!to || !userId) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'to and userId are required' }) };
    }

    const supabaseUrl        = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    console.log('[send-whatsapp] SUPABASE_URL present:', !!supabaseUrl);
    console.log('[send-whatsapp] SUPABASE_SERVICE_ROLE_KEY present:', !!supabaseServiceKey);

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[send-whatsapp] Missing Supabase credentials — set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Netlify environment (NOT VITE_ prefixed)');
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Missing Supabase credentials: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Netlify env' }),
      };
    }

    // Cryptographically random 6-digit code (100000–999999)
    const code      = String(randomInt(100000, 1000000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const dbHeaders = {
      'Content-Type':  'application/json',
      'apikey':        supabaseServiceKey,
      'Authorization': `Bearer ${supabaseServiceKey}`,
    };

    // Delete any existing codes for this user
    try {
      const delRes = await fetch(
        `${supabaseUrl}/rest/v1/whatsapp_verification_codes?user_id=eq.${encodeURIComponent(userId)}`,
        { method: 'DELETE', headers: dbHeaders }
      );
      console.log('[send-whatsapp] Supabase DELETE status:', delRes.status);
    } catch (err) {
      console.warn('[send-whatsapp] Supabase DELETE error (non-fatal):', err.message);
    }

    // Insert new code row
    const insertRes = await fetch(
      `${supabaseUrl}/rest/v1/whatsapp_verification_codes`,
      {
        method: 'POST',
        headers: { ...dbHeaders, Prefer: 'return=minimal' },
        body: JSON.stringify({
          user_id:    userId,
          code,
          expires_at: expiresAt,
          created_at: new Date().toISOString(),
        }),
      }
    );

    console.log('[send-whatsapp] Supabase INSERT status:', insertRes.status);
    if (!insertRes.ok) {
      const errText = await insertRes.text();
      console.error('[send-whatsapp] Supabase INSERT error body:', errText);
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ error: `DB insert failed (${insertRes.status}): ${errText}` }),
      };
    }

    // ── Send WhatsApp message ────────────────────────────────────────────────
    // Attempt 1: plain text Body (works if recipient has active 24h session OR account has free-form approval)
    const messageBody = `BioCycle: Your verification code is ${code}. It expires in 10 minutes.`;

    const plainPayload = new URLSearchParams({
      From: from,
      To:   toNumber,
      Body: messageBody,
    });

    console.log('[send-whatsapp] Attempting plain text send to:', toNumber, 'from:', from);

    const twilioRes = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization:  `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        },
        body: plainPayload.toString(),
      }
    );

    const twilioData = await twilioRes.json();
    console.log('[send-whatsapp] Twilio response status:', twilioRes.status);
    console.log('[send-whatsapp] Twilio response body:', JSON.stringify(twilioData));

    // Error 21656 = "Message template must be used for outbound messages outside 24h window"
    // Error 63016 = similar sandbox/template restriction
    const needsTemplate = !twilioRes.ok && (
      twilioData.code === 21656 ||
      twilioData.code === 63016 ||
      (twilioData.message || '').toLowerCase().includes('template')
    );

    if (needsTemplate) {
      console.log('[send-whatsapp] Plain text rejected — falling back to template with code as variable');

      // Use existing approved template, passing the code (and expiry note) as variable {{1}}
      const templateSid = language === 'ES'
        ? 'HXa511293ce070bfd02ac0d799b2aa6526'
        : 'HX2a761c6b6589f010cd416d1bf4f386d8';

      const templatePayload = new URLSearchParams({
        From:             from,
        To:               toNumber,
        ContentSid:       templateSid,
        ContentVariables: JSON.stringify({ '1': `Your verification code is ${code}. It expires in 10 minutes.` }),
      });

      const tmplRes = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization:  `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
          },
          body: templatePayload.toString(),
        }
      );

      const tmplData = await tmplRes.json();
      console.log('[send-whatsapp] Template fallback status:', tmplRes.status);
      console.log('[send-whatsapp] Template fallback body:', JSON.stringify(tmplData));

      if (!tmplRes.ok) {
        return {
          statusCode: tmplRes.status,
          headers: corsHeaders,
          body: JSON.stringify({ error: tmplData.message || 'Twilio template error', code: tmplData.code }),
        };
      }

      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ sid: tmplData.sid, method: 'template_fallback' }),
      };
    }

    if (!twilioRes.ok) {
      return {
        statusCode: twilioRes.status,
        headers: corsHeaders,
        body: JSON.stringify({ error: twilioData.message || 'Twilio error', code: twilioData.code }),
      };
    }

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ sid: twilioData.sid, method: 'plain_text' }),
    };
  }

  // ── Template message flow (scheduled / marketing) ─────────────────────────
  if (!to || !teaserText) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'to and teaserText are required' }),
    };
  }

  const templateSid = language === 'ES'
    ? 'HXa511293ce070bfd02ac0d799b2aa6526'
    : 'HX2a761c6b6589f010cd416d1bf4f386d8';

  const safeTeaser = teaserText
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x00-\x7F]/g, '')
    .replace(/\n/g, ' ')
    .substring(0, 160);

  const templatePayload = new URLSearchParams({
    From:             from,
    To:               toNumber,
    ContentSid:       templateSid,
    ContentVariables: JSON.stringify({ '1': safeTeaser }),
  });

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization:  `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
      },
      body: templatePayload.toString(),
    }
  );

  const data = await response.json();
  console.log('[send-whatsapp] Template send status:', response.status, JSON.stringify(data));

  if (!response.ok) {
    return {
      statusCode: response.status,
      headers: corsHeaders,
      body: JSON.stringify({ error: data.message || 'Twilio error' }),
    };
  }

  return {
    statusCode: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ sid: data.sid }),
  };
};
