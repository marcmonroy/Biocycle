// Twilio WhatsApp sender
// Reads sender from TWILIO_WHATSAPP_FROM env var (current: whatsapp:+16625688859)
// Template EN: HX2a761c6b6589f010cd416d1bf4f386d8
// Template ES: HXa511293ce070bfd02ac0d799b2aa6526
//
// action: 'send_verification' — generates crypto-random code, stores in
//   whatsapp_verification_codes (via SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY),
//   sends plain text WhatsApp message. Requires: to, userId.
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

  try {
    const { to, language = 'EN', teaserText, action, userId } = JSON.parse(event.body || '{}');

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken  = process.env.TWILIO_AUTH_TOKEN;
    const from       = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+16625688859';

    if (!accountSid || !authToken) {
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Twilio credentials not configured' }),
      };
    }

    const toNumber = to && to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

    // ── Verification code flow ────────────────────────────────────────────
    if (action === 'send_verification') {
      if (!to || !userId) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'to and userId are required' }),
        };
      }

      const supabaseUrl        = process.env.SUPABASE_URL;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !supabaseServiceKey) {
        return {
          statusCode: 500,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Supabase credentials not configured' }),
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

      // Delete any existing codes for this user before inserting the new one
      await fetch(
        `${supabaseUrl}/rest/v1/whatsapp_verification_codes?user_id=eq.${encodeURIComponent(userId)}`,
        { method: 'DELETE', headers: dbHeaders }
      );

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

      if (!insertRes.ok) {
        const errText = await insertRes.text();
        return {
          statusCode: 500,
          headers: corsHeaders,
          body: JSON.stringify({ error: `DB insert failed: ${errText}` }),
        };
      }

      // Send plain text WhatsApp message — not a template
      const messageBody = `BioCycle: Your verification code is ${code}. It expires in 10 minutes.`;

      const twilioPayload = new URLSearchParams({
        From: from,
        To:   toNumber,
        Body: messageBody,
      });

      const twilioRes = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization:  `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
          },
          body: twilioPayload.toString(),
        }
      );

      const twilioData = await twilioRes.json();

      if (!twilioRes.ok) {
        return {
          statusCode: twilioRes.status,
          headers: corsHeaders,
          body: JSON.stringify({ error: twilioData.message || 'Twilio error' }),
        };
      }

      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ sid: twilioData.sid }),
      };
    }

    // ── Template message flow (scheduled / marketing) ─────────────────────
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

    // Strip accents and emojis — template body var must be ASCII
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

  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: error.message }),
    };
  }
};
