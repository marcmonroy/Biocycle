// update-tier.js — Netlify Function
// Verifies a RevenueCat entitlement server-side, then writes tier to Supabase.
// Never trusts the client's claimed tier — always verifies via RC REST API.

'use strict';

const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const { userId, tier } = JSON.parse(event.body);

    if (!userId || !tier) {
      return { statusCode: 400, body: JSON.stringify({ error: 'userId and tier are required' }) };
    }
    if (!['standard', 'premium'].includes(tier)) {
      return { statusCode: 400, body: JSON.stringify({ error: 'tier must be standard or premium' }) };
    }

    // ── Verify entitlement via RevenueCat REST API ──────────────────────
    const rcSecretKey = process.env.REVENUECAT_SECRET_KEY;
    if (!rcSecretKey) throw new Error('REVENUECAT_SECRET_KEY env var not set');

    const rcRes = await fetch(
      `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`,
      { headers: { 'Authorization': `Bearer ${rcSecretKey}`, 'Content-Type': 'application/json' } }
    );

    if (!rcRes.ok) {
      const body = await rcRes.text();
      console.error('[update-tier] RC API error:', rcRes.status, body);
      return { statusCode: 402, body: JSON.stringify({ error: 'RevenueCat verification failed' }) };
    }

    const rcData = await rcRes.json();
    const entitlement = rcData.subscriber?.entitlements?.[tier];

    if (!entitlement) {
      return { statusCode: 402, body: JSON.stringify({ error: `Entitlement '${tier}' not found` }) };
    }
    // expires_date is null for lifetime; string ISO date for subscriptions
    if (entitlement.expires_date && new Date(entitlement.expires_date) < new Date()) {
      return { statusCode: 402, body: JSON.stringify({ error: `Entitlement '${tier}' has expired` }) };
    }

    // ── Write tier to Supabase via service-role key ─────────────────────
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { error: dbErr } = await supabase
      .from('user_state')
      .update({ tier })
      .eq('user_id', userId);

    if (dbErr) throw dbErr;

    console.log(`[update-tier] ${userId} → ${tier}`);
    return { statusCode: 200, body: JSON.stringify({ ok: true, tier }) };

  } catch (err) {
    console.error('[update-tier] error:', err);
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: err.message }) };
  }
};
