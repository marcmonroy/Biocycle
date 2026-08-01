// netlify/functions/compatibility-invite-action.js
//
// Shared handler for ACCEPT / REJECT / REJECT_BLOCK on a compatibility invite.
// Called by:
//   - sms-inbound (quick-reply ButtonPayload from WhatsApp template)
//   - CompatibilityScreen in-app action buttons (direct POST from client)
//
// POST JSON: { invite_id, action }
// action ∈ 'ACCEPT' | 'REJECT' | 'REJECT_BLOCK'
//
// Idempotent: if the invite status is already 'accepted' or 'rejected' → 200 no-op.
//
// ACCEPT      → status=accepted, user_b_id linked, notify sender (push → WhatsApp fallback).
// REJECT      → status=rejected.
// REJECT_BLOCK → status=rejected + INSERT into compatibility_blocks
//               (blocker=recipient phone, blocked=sender phone). Deduped on conflict.

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TWILIO_ACCOUNT_SID   = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN    = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM          = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+16625688859';

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function svcHeaders() {
  return {
    'Content-Type': 'application/json',
    apikey:         SUPABASE_SERVICE_KEY,
    Authorization:  `Bearer ${SUPABASE_SERVICE_KEY}`,
  };
}

async function dbGet(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: svcHeaders() });
  return res.ok ? res.json() : [];
}

async function dbPatch(path, body) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method:  'PATCH',
    headers: { ...svcHeaders(), Prefer: 'return=minimal' },
    body:    JSON.stringify(body),
  });
}

async function dbInsert(path, body, prefer = 'return=minimal') {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method:  'POST',
    headers: { ...svcHeaders(), Prefer: prefer },
    body:    JSON.stringify(body),
  });
}

async function sendWhatsApp(to, msgBody) {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) return;
  const toNumber = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
  const payload  = new URLSearchParams({ From: TWILIO_FROM, To: toNumber, Body: msgBody });
  await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method:  'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization:  `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64')}`,
      },
      body: payload.toString(),
    }
  ).catch(err => console.warn('[cia] WhatsApp send error:', err.message));
}

const TYPE_LABELS = {
  vibe:        { en: 'Vibe Check',          es: 'Buena Vibra' },
  cognitive:   { en: 'Cognitive Sync',      es: 'Sincronía Intelectual' },
  performance: { en: 'Performance Sync',    es: 'Sincronía de Rendimiento' },
  intimacy:    { en: 'Connection Forecast', es: 'Pronóstico de Conexión' },
};

async function notifySender(userA, responderName, typeLabel) {
  if (!userA) return;

  const isAES = userA.idioma === 'ES';
  const title  = 'BioCycle';
  const body   = isAES
    ? `${responderName} aceptó tu solicitud de ${typeLabel.es}`
    : `${responderName} accepted your ${typeLabel.en} request`;

  // Try push first: look up sender's push tokens
  const tokens = await dbGet(
    `push_tokens?user_id=eq.${encodeURIComponent(userA.id)}&select=token,platform`
  ).catch(() => []);

  if (tokens.length > 0) {
    const appUrl = process.env.URL || 'https://app.biocycle.app';
    await fetch(`${appUrl}/.netlify/functions/send-push`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ user_id: userA.id, title, body, data: { screen: 'compatibility' } }),
    }).catch(err => console.warn('[cia] push send error:', err.message));
    return;
  }

  // Fallback: WhatsApp
  if (userA.whatsapp_phone) {
    const msg = isAES
      ? `✓ ${responderName} aceptó tu solicitud de ${typeLabel.es}. Abre BioCycle: app.biocycle.app`
      : `✓ ${responderName} accepted your ${typeLabel.en} request. Open BioCycle: app.biocycle.app`;
    await sendWhatsApp(userA.whatsapp_phone, msg);
  }
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  let parsed = {};
  try { parsed = JSON.parse(event.body || '{}'); } catch {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { invite_id, action } = parsed;

  if (!invite_id || !['ACCEPT', 'REJECT', 'REJECT_BLOCK'].includes(action)) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'invite_id and action (ACCEPT|REJECT|REJECT_BLOCK) required' }),
    };
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'Missing Supabase credentials' }) };
  }

  // ── Read the invite ────────────────────────────────────────────────────────
  const rows = await dbGet(
    `compatibility_connections?id=eq.${encodeURIComponent(invite_id)}&limit=1`
  );
  if (!rows.length) {
    return { statusCode: 404, headers: corsHeaders, body: JSON.stringify({ error: 'invite not found' }) };
  }
  const invite = rows[0];

  // ── Idempotency ────────────────────────────────────────────────────────────
  if (invite.status === 'accepted' || invite.status === 'rejected') {
    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true, noop: true }),
    };
  }

  const typeLabel = TYPE_LABELS[invite.type] ?? { en: invite.type, es: invite.type };

  // ── Fetch User A (sender) ──────────────────────────────────────────────────
  const userARows = await dbGet(
    `profiles?id=eq.${encodeURIComponent(invite.user_a_id)}&select=id,nombre,idioma,whatsapp_phone&limit=1`
  );
  const userA = userARows[0] ?? null;

  // ── Fetch User B (responder) by invited_phone ──────────────────────────────
  let userB = null;
  if (invite.invited_phone) {
    const userBRows = await dbGet(
      `profiles?whatsapp_phone=eq.${encodeURIComponent(invite.invited_phone)}&select=id,nombre,idioma&limit=1`
    );
    userB = userBRows[0] ?? null;
  }

  // ── Execute action ─────────────────────────────────────────────────────────
  if (action === 'ACCEPT') {
    await dbPatch(
      `compatibility_connections?id=eq.${encodeURIComponent(invite_id)}`,
      {
        status:        'accepted',
        responded_at:  new Date().toISOString(),
        ...(userB ? { user_b_id: userB.id } : {}),
      }
    );
    const responderName = userB?.nombre ?? invite.invited_name ?? 'Your contact';
    await notifySender(userA, responderName, typeLabel);

  } else if (action === 'REJECT') {
    await dbPatch(
      `compatibility_connections?id=eq.${encodeURIComponent(invite_id)}`,
      { status: 'rejected', responded_at: new Date().toISOString() }
    );

  } else if (action === 'REJECT_BLOCK') {
    await dbPatch(
      `compatibility_connections?id=eq.${encodeURIComponent(invite_id)}`,
      { status: 'rejected', responded_at: new Date().toISOString() }
    );
    // blocker = the recipient (invited_phone), blocked = the sender
    if (invite.invited_phone && userA?.whatsapp_phone) {
      await dbInsert(
        'compatibility_blocks',
        { blocker_phone: invite.invited_phone, blocked_phone: userA.whatsapp_phone },
        'return=minimal,resolution=ignore-duplicates'
      ).catch(() => {}); // unique conflict is a no-op
    }
  }

  return {
    statusCode: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ok: true }),
  };
};
