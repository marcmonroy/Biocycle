// update-tier.js — Netlify Function
// Receives { userId }, queries RevenueCat REST API with a server-side secret key
// to determine the active entitlement, then writes the resolved tier to Supabase.
// Client never supplies or influences the tier value.

'use strict';

const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const { userId } = JSON.parse(event.body);

    if (!userId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'userId is required' }) };
    }

    // ── Query RevenueCat REST API (server-side secret — never in client) ──
    const rcSecretKey = process.env.REVENUECAT_SECRET_KEY;
    if (!rcSecretKey) throw new Error('REVENUECAT_SECRET_KEY env var not set');

    const rcRes = await fetch(
      `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`,
      { headers: { 'Authorization': `Bearer ${rcSecretKey}`, 'Content-Type': 'application/json' } }
    );

    if (!rcRes.ok) {
      const body = await rcRes.text();
      console.error('[update-tier] RC API error:', rcRes.status, body);
      return { statusCode: 402, body: JSON.stringify({ error: 'RevenueCat lookup failed' }) };
    }

    const rcData = await rcRes.json();
    const entitlements = rcData.subscriber?.entitlements ?? {};
    const now = new Date();

    // Helper: is an entitlement active (not expired)?
    function isActive(ent) {
      if (!ent) return false;
      if (!ent.expires_date) return true;           // lifetime / no expiry
      return new Date(ent.expires_date) > now;
    }

    // Resolve highest active tier (premium beats standard)
    let tier = 'free';
    if (isActive(entitlements['premium']))  tier = 'premium';
    else if (isActive(entitlements['standard'])) tier = 'standard';

    // ── Write to Supabase via service-role key ────────────────────────────
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
