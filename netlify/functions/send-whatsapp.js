// Twilio WhatsApp sender
// Reads sender from TWILIO_WHATSAPP_FROM env var (current: whatsapp:+16625688859)
//
// action: 'test_verification' — FIRST PRIORITY. Sends hardcoded code "999999",
//   returns full raw Twilio response. Use to test the Twilio path in isolation.
//
// action: 'send_verification'
//   → generates crypto-random 6-digit code server-side
//   → stores in whatsapp_verification_codes via Supabase REST API
//     (requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY env vars in Netlify —
//      NOT VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)
//   → attempts plain text Body; on error 21656/63016 falls back to approved template
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

  // ── Parse body ────────────────────────────────────────────────────────────
  let parsed = {};
  try {
    parsed = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const { to, language = 'EN', teaserText, action, userId, code: submittedCode } = parsed;

  console.log('[send-whatsapp] action:', action);
  console.log('[send-whatsapp] to:', to);

  // ── Credentials (needed by all paths) ────────────────────────────────────
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;
  const from       = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+16625688859';

  console.log('[send-whatsapp] TWILIO_WHATSAPP_FROM at runtime:', from);
  console.log('[send-whatsapp] TWILIO_ACCOUNT_SID present:', !!accountSid);
  console.log('[send-whatsapp] TWILIO_AUTH_TOKEN present:', !!authToken);

  // ── FIRST: test_verification ──────────────────────────────────────────────
  // Must be checked before any other validation so a missing `teaserText` does
  // not cause the function to fall through to the template route.
  if (action === 'test_verification') {
    console.log('[send-whatsapp] TEST MODE entered');

    if (!accountSid || !authToken) {
      return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'Missing Twilio credentials' }) };
    }
    if (!to) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'to is required for test_verification' }) };
    }

    const toNumber = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
    console.log('[send-whatsapp] TEST sending 999999 to:', toNumber, 'from:', from);

    const testPayload = new URLSearchParams({
      From:             from,
      To:               toNumber,
      ContentSid:       'HXfd5c75c1b32d3758bb171483d9598bf8',
      ContentVariables: JSON.stringify({ '1': '999999' }),
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
      console.log('[send-whatsapp] TEST Twilio status:', testRes.status);
      console.log('[send-whatsapp] TEST Twilio response:', JSON.stringify(testData));
      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ twilio_status: testRes.status, twilio_response: testData }),
      };
    } catch (err) {
      console.error('[send-whatsapp] TEST fetch threw:', err.message);
      return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: err.message }) };
    }
  }

  // ── All other actions require Twilio credentials ──────────────────────────
  if (!accountSid || !authToken) {
    console.error('[send-whatsapp] Missing Twilio credentials');
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'Missing Twilio credentials' }) };
  }

  const toNumber = to && to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

  // ── send_verification ─────────────────────────────────────────────────────
  if (action === 'send_verification') {
    if (!to || !userId) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'to and userId are required' }) };
    }

    const supabaseUrl        = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    console.log('[send-whatsapp] SUPABASE_URL present:', !!supabaseUrl);
    console.log('[send-whatsapp] SUPABASE_SERVICE_ROLE_KEY present:', !!supabaseServiceKey);

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[send-whatsapp] Missing Supabase credentials — set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Netlify env (not VITE_ prefixed)');
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

    // ── (a) Rate-limit check FIRST — touch nothing in DB if exceeded ──────────
    // Read created_at of any existing code row for this user.
    // If a code was issued within the last 60 seconds, refuse and preserve it.
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
            console.log('[send-whatsapp] Rate limit hit — code sent', Math.round(secondsAgo), 's ago');
            return {
              statusCode: 429,
              headers: corsHeaders,
              body: JSON.stringify({ error: 'Too many codes requested. Please wait before trying again.' }),
            };
          }
        }
      }
    } catch (err) {
      console.warn('[send-whatsapp] Rate-limit check error (non-fatal):', err.message);
    }

    // ── (b) Delete old codes ──────────────────────────────────────────────────
    try {
      const delRes = await fetch(
        `${supabaseUrl}/rest/v1/whatsapp_verification_codes?user_id=eq.${encodeURIComponent(userId)}`,
        { method: 'DELETE', headers: dbHeaders }
      );
      console.log('[send-whatsapp] Supabase DELETE status:', delRes.status);
    } catch (err) {
      console.warn('[send-whatsapp] Supabase DELETE error (non-fatal):', err.message);
    }

    // ── (c) Insert new code ───────────────────────────────────────────────────
    const code      = String(randomInt(100000, 1000000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

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
          channel:    'whatsapp',
        }),
      }
    );

    console.log('[send-whatsapp] Supabase INSERT status:', insertRes.status);
    if (!insertRes.ok) {
      const errText = await insertRes.text();
      console.error('[send-whatsapp] Supabase INSERT error:', errText);
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ error: `DB insert failed (${insertRes.status}): ${errText}` }),
      };
    }

    // ── (d) Send via Twilio ───────────────────────────────────────────────────
    const verificationTemplateSid = language === 'es'
      ? 'HX1f50aaf2631e92ccade44d1ca80109ec'
      : 'HXfd5c75c1b32d3758bb171483d9598bf8';

    const tmplPayload = new URLSearchParams({
      From:             from,
      To:               toNumber,
      ContentSid:       verificationTemplateSid,
      ContentVariables: JSON.stringify({ '1': code }),
    });

    console.log('[send-whatsapp] Sending verification template to:', toNumber, 'from:', from, 'template:', verificationTemplateSid);

    const twilioRes = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization:  `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        },
        body: tmplPayload.toString(),
      }
    );

    const twilioData = await twilioRes.json();
    console.log('[send-whatsapp] Twilio template status:', twilioRes.status);
    console.log('[send-whatsapp] Twilio template response:', JSON.stringify(twilioData));

    if (!twilioRes.ok) {
      // Twilio failed — delete the code we just stored so the user is not stuck
      // with an undeliverable code blocking future resend attempts.
      try {
        await fetch(
          `${supabaseUrl}/rest/v1/whatsapp_verification_codes?user_id=eq.${encodeURIComponent(userId)}`,
          { method: 'DELETE', headers: dbHeaders }
        );
        console.log('[send-whatsapp] Rolled back inserted code after Twilio failure');
      } catch (rollbackErr) {
        console.warn('[send-whatsapp] Rollback DELETE failed:', rollbackErr.message);
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
  // Client must never read whatsapp_verification_codes directly — RLS has
  // zero client-read policies, so the anon key always returns empty rows.
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

    // Read the stored code (service role bypasses RLS).
    // ORDER BY created_at DESC so we always get the newest row — without this,
    // limit=1 returns in heap order and a stale row from a failed prior DELETE
    // will be read instead of the fresh one, causing instant "expired" errors.
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
      console.error('[send-whatsapp] verify_code DB read error:', err.message);
      return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'DB read failed' }) };
    }

    // Diagnostic log — shows raw DB value so we can confirm tz format in Netlify logs
    console.log('[send-whatsapp] verify_code | now:', new Date().toISOString(),
      '| expires_at:', codeRow?.expires_at ?? 'NO ROW',
      '| row count check — if expired_at has no Z, column may be timestamp not timestamptz');

    if (!codeRow) {
      return { statusCode: 404, headers: corsHeaders, body: JSON.stringify({ error: 'not_found' }) };
    }

    if (new Date() > new Date(codeRow.expires_at)) {
      console.log('[send-whatsapp] verify_code EXPIRED | now:', new Date().toISOString(), '| expires_at:', codeRow.expires_at);
      return { statusCode: 410, headers: corsHeaders, body: JSON.stringify({ error: 'expired' }) };
    }

    if (String(submittedCode).trim() !== String(codeRow.code).trim()) {
      const newAttempts = (codeRow.attempts ?? 0) + 1;
      const MAX_ATTEMPTS = 5;

      if (newAttempts >= MAX_ATTEMPTS) {
        // Burn the code — force the user to request a fresh one
        try {
          await fetch(
            `${supabaseUrl}/rest/v1/whatsapp_verification_codes?user_id=eq.${encodeURIComponent(userId)}`,
            { method: 'DELETE', headers: dbHeaders }
          );
          console.log('[send-whatsapp] verify_code: max attempts reached, code deleted for user', userId);
        } catch (err) {
          console.warn('[send-whatsapp] verify_code: failed to delete burned code:', err.message);
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
        console.warn('[send-whatsapp] verify_code: failed to increment attempts:', err.message);
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
      console.error('[send-whatsapp] verify_code post-match update error:', err.message);
      // Non-fatal: code matched, return ok — client will retry profile update if needed
    }

    return { statusCode: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: true }) };
  }

  // ── compatibility_invite — plain text direct message ──────────────────────
  if (action === 'compatibility_invite') {
    if (!to || !teaserText) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'to and teaserText are required for compatibility_invite' }),
      };
    }

    const msgPayload = new URLSearchParams({
      From: from,
      To:   toNumber,
      Body: teaserText,
    });

    console.log('[send-whatsapp] sending compatibility invite to:', toNumber);

    const msgRes = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type':  'application/x-www-form-urlencoded',
          Authorization:   `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        },
        body: msgPayload.toString(),
      }
    );

    const msgData = await msgRes.json();
    console.log('[send-whatsapp] compatibility invite status:', msgRes.status, msgData.sid || msgData.message);

    if (!msgRes.ok) {
      return {
        statusCode: msgRes.status,
        headers: corsHeaders,
        body: JSON.stringify({ error: msgData.message || 'Twilio error', code: msgData.code }),
      };
    }

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ sid: msgData.sid }),
    };
  }

  // ── Default: template message (scheduled / marketing) ────────────────────
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
