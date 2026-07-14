'use strict';

// send-email-code.js — BioCycle email verification
//
// Actions:
//   send_verification  → generate 6-digit code, store in whatsapp_verification_codes
//                        (channel='email'), send via Resend API.
//   verify_code        → verify submitted code against DB, mark whatsapp_verified=true.
//
// Required Netlify env vars:
//   SUPABASE_URL              (not VITE_SUPABASE_URL)
//   SUPABASE_SERVICE_ROLE_KEY
//   RESEND_API_KEY            (from resend.com — verify biocycle.app domain there first)
//   EMAIL_FROM                (optional, default "BioCycle <noreply@biocycle.app>")

const { randomInt } = require('crypto');

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS, body: '' };
  }

  let parsed = {};
  try { parsed = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  const { action, userId, email, code: submittedCode } = parsed;

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error('[send-email-code] Missing Supabase env vars');
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Server configuration error' }) };
  }

  const dbHeaders = {
    'Content-Type':  'application/json',
    'apikey':        serviceKey,
    'Authorization': `Bearer ${serviceKey}`,
  };

  // ── send_verification ──────────────────────────────────────────────────────
  if (action === 'send_verification') {
    if (!userId || !email) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'userId and email are required' }) };
    }

    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      console.error('[send-email-code] RESEND_API_KEY not set');
      return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Email service not configured (RESEND_API_KEY missing)' }) };
    }

    // ── (a) Rate-limit: refuse if a code was issued within the last 60 s ────
    try {
      const checkRes = await fetch(
        `${supabaseUrl}/rest/v1/whatsapp_verification_codes?user_id=eq.${encodeURIComponent(userId)}&channel=eq.email&select=created_at&order=created_at.desc&limit=1`,
        { method: 'GET', headers: dbHeaders }
      );
      if (checkRes.ok) {
        const rows = await checkRes.json();
        if (rows.length > 0) {
          const secondsAgo = (Date.now() - new Date(rows[0].created_at).getTime()) / 1000;
          if (secondsAgo < 60) {
            console.log('[send-email-code] rate limit hit —', Math.round(secondsAgo), 's ago');
            return { statusCode: 429, headers: CORS, body: JSON.stringify({ error: 'Too many codes requested. Please wait.' }) };
          }
        }
      }
    } catch (err) {
      console.warn('[send-email-code] rate-limit check error (non-fatal):', err.message);
    }

    // ── (b) Delete all prior codes for this user (any channel) ──────────────
    try {
      await fetch(
        `${supabaseUrl}/rest/v1/whatsapp_verification_codes?user_id=eq.${encodeURIComponent(userId)}`,
        { method: 'DELETE', headers: dbHeaders }
      );
    } catch (err) {
      console.warn('[send-email-code] DELETE prior codes error (non-fatal):', err.message);
    }

    // ── (c) Generate + store new code ────────────────────────────────────────
    const code      = String(randomInt(100000, 1000000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const insertRes = await fetch(
      `${supabaseUrl}/rest/v1/whatsapp_verification_codes`,
      {
        method:  'POST',
        headers: { ...dbHeaders, Prefer: 'return=minimal' },
        body:    JSON.stringify({
          user_id:    userId,
          code,
          expires_at: expiresAt,
          created_at: new Date().toISOString(),
          channel:    'email',
        }),
      }
    );

    if (!insertRes.ok) {
      const errText = await insertRes.text();
      console.error('[send-email-code] DB insert failed:', errText);
      return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: `DB insert failed: ${errText}` }) };
    }

    // ── (d) Send via Resend ──────────────────────────────────────────────────
    const from    = process.env.EMAIL_FROM || 'BioCycle <noreply@biocycle.app>';
    const subject = `Your BioCycle verification code: ${code}`;
    const html    = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0b0e12;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0b0e12;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#12161d;border-radius:16px;padding:40px 32px;">
        <tr><td>
          <p style="margin:0 0 8px;color:#9ea8b3;font-size:13px;letter-spacing:0.12em;text-transform:uppercase;">BioCycle</p>
          <h1 style="margin:0 0 24px;color:#F5F2EE;font-size:24px;font-weight:300;">Your verification code</h1>
          <div style="background:#0b0e12;border-radius:12px;padding:24px;text-align:center;margin:0 0 24px;">
            <span style="font-size:40px;font-weight:700;letter-spacing:0.4em;color:#F0A830;font-family:'Courier New',monospace;">${code}</span>
          </div>
          <p style="margin:0 0 8px;color:#9ea8b3;font-size:14px;line-height:1.6;">
            Enter this code in the BioCycle app to verify your account.
            It expires in <strong style="color:#F5F2EE;">10 minutes</strong>.
          </p>
          <p style="margin:16px 0 0;color:#9ea8b3;font-size:12px;line-height:1.5;">
            If you did not request this code, you can safely ignore this email.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();

    let emailOk = false;
    let emailError = '';
    try {
      const emailRes = await fetch('https://api.resend.com/emails', {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${resendKey}`,
        },
        body: JSON.stringify({ from, to: [email], subject, html }),
      });
      const emailData = await emailRes.json();
      console.log('[send-email-code] Resend status:', emailRes.status, emailData.id ?? emailData.message ?? '');
      if (emailRes.ok) {
        emailOk = true;
      } else {
        emailError = emailData.message || `Resend error ${emailRes.status}`;
      }
    } catch (err) {
      emailError = err.message;
    }

    if (!emailOk) {
      // Roll back the inserted code so the user is not stuck
      try {
        await fetch(
          `${supabaseUrl}/rest/v1/whatsapp_verification_codes?user_id=eq.${encodeURIComponent(userId)}`,
          { method: 'DELETE', headers: dbHeaders }
        );
      } catch (_) {}
      console.error('[send-email-code] Resend failed:', emailError);
      return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: `Failed to send email: ${emailError}` }) };
    }

    return { statusCode: 200, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: true }) };
  }

  // ── verify_code ────────────────────────────────────────────────────────────
  // Channel-agnostic: reads newest code row for this userId, validates, marks
  // whatsapp_verified=true on success. ORDER BY created_at DESC ensures the
  // newest row is read (stale-row bug fix from send-whatsapp.js applies here).
  if (action === 'verify_code') {
    if (!userId || !submittedCode) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'userId and code are required' }) };
    }

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
      console.error('[send-email-code] verify DB read error:', err.message);
      return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'DB read failed' }) };
    }

    console.log('[send-email-code] verify_code | now:', new Date().toISOString(),
      '| expires_at:', codeRow?.expires_at ?? 'NO ROW');

    if (!codeRow) {
      return { statusCode: 404, headers: CORS, body: JSON.stringify({ error: 'not_found' }) };
    }
    if (new Date() > new Date(codeRow.expires_at)) {
      return { statusCode: 410, headers: CORS, body: JSON.stringify({ error: 'expired' }) };
    }

    if (String(submittedCode).trim() !== String(codeRow.code).trim()) {
      const newAttempts = (codeRow.attempts ?? 0) + 1;
      const MAX_ATTEMPTS = 5;

      if (newAttempts >= MAX_ATTEMPTS) {
        try {
          await fetch(
            `${supabaseUrl}/rest/v1/whatsapp_verification_codes?user_id=eq.${encodeURIComponent(userId)}`,
            { method: 'DELETE', headers: dbHeaders }
          );
        } catch (_) {}
        return { statusCode: 429, headers: CORS, body: JSON.stringify({ error: 'too_many_attempts' }) };
      }

      try {
        await fetch(
          `${supabaseUrl}/rest/v1/whatsapp_verification_codes?user_id=eq.${encodeURIComponent(userId)}`,
          {
            method:  'PATCH',
            headers: { ...dbHeaders, Prefer: 'return=minimal' },
            body:    JSON.stringify({ attempts: newAttempts }),
          }
        );
      } catch (_) {}
      return { statusCode: 422, headers: CORS, body: JSON.stringify({ error: 'incorrect', attemptsLeft: MAX_ATTEMPTS - newAttempts }) };
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
      console.error('[send-email-code] post-match update error (non-fatal):', err.message);
    }

    return { statusCode: 200, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: true }) };
  }

  return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Unknown action' }) };
};
