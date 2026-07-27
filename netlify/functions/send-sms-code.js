// send-sms-code.js — BioCycle SMS verification (plain SMS, not WhatsApp)
//
// Shares the same OTP table (whatsapp_verification_codes, channel='sms')
// and verification logic as send-whatsapp.js. Differs only in:
//   - 'From' uses TWILIO_SMS_FROM  (not TWILIO_WHATSAPP_FROM)
//   - 'To' / 'From' carry no 'whatsapp:' prefix
//   - Message delivered as plain Body text, not a WhatsApp content template
//
// Actions:
//   send_verification  → generate 6-digit OTP, store in DB, send via SMS
//   verify_code        → verify submitted code, mark whatsapp_verified=true
//
// Required Netlify env vars:
//   TWILIO_ACCOUNT_SID
//   TWILIO_AUTH_TOKEN
//   TWILIO_SMS_FROM          (E.164, default: +16625688859)
//   SUPABASE_URL             (not VITE_SUPABASE_URL)
//   SUPABASE_SERVICE_ROLE_KEY

const { randomInt } = require('crypto');

exports.handler = async (event) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let parsed = {};
  try {
    parsed = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const { to, action, userId, code: submittedCode } = parsed;

  console.log('[send-sms-code] action:', action);
  console.log('[send-sms-code] to:', to);

  // ── send_verification ─────────────────────────────────────────────────────
  if (action === 'send_verification') {
    if (!to || !userId) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'to and userId are required' }) };
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken  = process.env.TWILIO_AUTH_TOKEN;
    const from       = process.env.TWILIO_SMS_FROM || '+16625688859';

    console.log('[send-sms-code] TWILIO_SMS_FROM at runtime:', from);
    console.log('[send-sms-code] TWILIO_ACCOUNT_SID present:', !!accountSid);
    console.log('[send-sms-code] TWILIO_AUTH_TOKEN present:', !!authToken);

    if (!accountSid || !authToken) {
      console.error('[send-sms-code] Missing Twilio credentials');
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Missing Twilio credentials: set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in Netlify env' }),
      };
    }

    const supabaseUrl        = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    console.log('[send-sms-code] SUPABASE_URL present:', !!supabaseUrl);
    console.log('[send-sms-code] SUPABASE_SERVICE_ROLE_KEY present:', !!supabaseServiceKey);

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[send-sms-code] Missing Supabase credentials');
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Missing Supabase credentials: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Netlify env' }),
      };
    }

    const dbHeaders = {
      'Content-Type':  'application/json',
      'apikey':        supabaseServiceKey,
      'Authorization': `Bearer ${supabaseServiceKey}`,
    };

    // ── (a) Rate-limit check — touch nothing in DB if exceeded ───────────────
    try {
      const checkRes = await fetch(
        `${supabaseUrl}/rest/v1/whatsapp_verification_codes?user_id=eq.${encodeURIComponent(userId)}&select=created_at&order=created_at.desc&limit=1`,
        { method: 'GET', headers: dbHeaders }
      );
      if (checkRes.ok) {
        const rows = await checkRes.json();
        if (rows.length > 0) {
          const secondsAgo = (Date.now() - new Date(rows[0].created_at).getTime()) / 1000;
          if (secondsAgo < 60) {
            console.log('[send-sms-code] Rate limit hit — code sent', Math.round(secondsAgo), 's ago');
            return {
              statusCode: 429,
              headers: corsHeaders,
              body: JSON.stringify({ error: 'Too many codes requested. Please wait before trying again.' }),
            };
          }
        }
      }
    } catch (err) {
      console.warn('[send-sms-code] Rate-limit check error (non-fatal):', err.message);
    }

    // ── (b) Delete old codes ──────────────────────────────────────────────────
    try {
      const delRes = await fetch(
        `${supabaseUrl}/rest/v1/whatsapp_verification_codes?user_id=eq.${encodeURIComponent(userId)}`,
        { method: 'DELETE', headers: dbHeaders }
      );
      console.log('[send-sms-code] Supabase DELETE status:', delRes.status);
    } catch (err) {
      console.warn('[send-sms-code] Supabase DELETE error (non-fatal):', err.message);
    }

    // ── (c) Generate + store new code ─────────────────────────────────────────
    const code      = String(randomInt(100000, 1000000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const insertRes = await fetch(
      `${supabaseUrl}/rest/v1/whatsapp_verification_codes`,
      {
        method:  'POST',
        headers: { ...dbHeaders, Prefer: 'return=minimal' },
        body: JSON.stringify({
          user_id:    userId,
          code,
          expires_at: expiresAt,
          created_at: new Date().toISOString(),
          channel:    'sms',
        }),
      }
    );

    console.log('[send-sms-code] Supabase INSERT status:', insertRes.status);
    if (!insertRes.ok) {
      const errText = await insertRes.text();
      console.error('[send-sms-code] Supabase INSERT error:', errText);
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ error: `DB insert failed (${insertRes.status}): ${errText}` }),
      };
    }

    // ── (d) Send via Twilio SMS ───────────────────────────────────────────────
    // Plain Body — no 'whatsapp:' prefix on From or To.
    const smsPayload = new URLSearchParams({
      From: from,
      To:   to,
      Body: `Your BioCycle verification code is: ${code}. It expires in 10 minutes. Reply STOP to unsubscribe.`,
    });

    console.log('[send-sms-code] Sending SMS to:', to, 'from:', from);

    const twilioRes = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization:  `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        },
        body: smsPayload.toString(),
      }
    );

    const twilioData = await twilioRes.json();
    console.log('[send-sms-code] Twilio SMS status:', twilioRes.status);
    console.log('[send-sms-code] Twilio SMS response:', JSON.stringify(twilioData));

    if (!twilioRes.ok) {
      // Twilio failed — roll back the inserted code so the user is not blocked
      try {
        await fetch(
          `${supabaseUrl}/rest/v1/whatsapp_verification_codes?user_id=eq.${encodeURIComponent(userId)}`,
          { method: 'DELETE', headers: dbHeaders }
        );
        console.log('[send-sms-code] Rolled back inserted code after Twilio failure');
      } catch (rollbackErr) {
        console.warn('[send-sms-code] Rollback DELETE failed:', rollbackErr.message);
      }
      return {
        statusCode: twilioRes.status,
        headers: corsHeaders,
        body: JSON.stringify({ error: twilioData.message || 'Twilio error', code: twilioData.code }),
      };
    }

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ sid: twilioData.sid }),
    };
  }

  // ── verify_code ───────────────────────────────────────────────────────────
  // Server-side only: uses SERVICE ROLE key so RLS is bypassed entirely.
  // Identical logic to send-whatsapp.js verify_code — looks up by user_id,
  // channel-agnostic; marks whatsapp_verified=true on success.
  if (action === 'verify_code') {
    if (!userId || !submittedCode) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'userId and code are required' }) };
    }

    const supabaseUrl        = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseServiceKey) {
      return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'Missing Supabase credentials' }) };
    }

    const dbHeaders = {
      'Content-Type':  'application/json',
      'apikey':        supabaseServiceKey,
      'Authorization': `Bearer ${supabaseServiceKey}`,
    };

    // ORDER BY created_at DESC ensures newest row is read (stale-row guard).
    let codeRow = null;
    try {
      const readRes = await fetch(
        `${supabaseUrl}/rest/v1/whatsapp_verification_codes?user_id=eq.${encodeURIComponent(userId)}&select=code,expires_at,attempts&order=created_at.desc&limit=1`,
        { method: 'GET', headers: dbHeaders }
      );
      if (readRes.ok) {
        const rows = await readRes.json();
        if (rows.length > 0) codeRow = rows[0];
      }
    } catch (err) {
      console.error('[send-sms-code] verify_code DB read error:', err.message);
      return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'DB read failed' }) };
    }

    console.log('[send-sms-code] verify_code | now:', new Date().toISOString(),
      '| expires_at:', codeRow?.expires_at ?? 'NO ROW');

    if (!codeRow) {
      return { statusCode: 404, headers: corsHeaders, body: JSON.stringify({ error: 'not_found' }) };
    }

    if (new Date() > new Date(codeRow.expires_at)) {
      console.log('[send-sms-code] verify_code EXPIRED | now:', new Date().toISOString(), '| expires_at:', codeRow.expires_at);
      return { statusCode: 410, headers: corsHeaders, body: JSON.stringify({ error: 'expired' }) };
    }

    if (String(submittedCode).trim() !== String(codeRow.code).trim()) {
      const newAttempts = (codeRow.attempts ?? 0) + 1;
      const MAX_ATTEMPTS = 5;

      if (newAttempts >= MAX_ATTEMPTS) {
        // Burn the code — force user to request a fresh one
        try {
          await fetch(
            `${supabaseUrl}/rest/v1/whatsapp_verification_codes?user_id=eq.${encodeURIComponent(userId)}`,
            { method: 'DELETE', headers: dbHeaders }
          );
          console.log('[send-sms-code] verify_code: max attempts reached, code deleted for user', userId);
        } catch (err) {
          console.warn('[send-sms-code] verify_code: failed to delete burned code:', err.message);
        }
        return {
          statusCode: 429,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'too_many_attempts' }),
        };
      }

      // Increment attempt counter and let the user try again
      try {
        await fetch(
          `${supabaseUrl}/rest/v1/whatsapp_verification_codes?user_id=eq.${encodeURIComponent(userId)}`,
          {
            method:  'PATCH',
            headers: { ...dbHeaders, Prefer: 'return=minimal' },
            body:    JSON.stringify({ attempts: newAttempts }),
          }
        );
      } catch (err) {
        console.warn('[send-sms-code] verify_code: failed to increment attempts:', err.message);
      }

      return { statusCode: 422, headers: corsHeaders, body: JSON.stringify({ error: 'incorrect', attemptsLeft: MAX_ATTEMPTS - newAttempts }) };
    }

    // Code matches — mark verified and clean up
    try {
      await fetch(
        `${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`,
        {
          method:  'PATCH',
          headers: { ...dbHeaders, Prefer: 'return=minimal' },
          body:    JSON.stringify({ whatsapp_verified: true }),
        }
      );
      await fetch(
        `${supabaseUrl}/rest/v1/whatsapp_verification_codes?user_id=eq.${encodeURIComponent(userId)}`,
        { method: 'DELETE', headers: dbHeaders }
      );
    } catch (err) {
      console.error('[send-sms-code] verify_code post-match update error:', err.message);
      // Non-fatal: code matched, return ok
    }

    return { statusCode: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: true }) };
  }

  return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Unknown action' }) };
};
