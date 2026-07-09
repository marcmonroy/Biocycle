// daily-push-scheduler.js — BioCycle hourly check-in reminder scheduler
// Cron: 0 * * * *  (set in netlify.toml)
//
// KILL SWITCH: PUSH_SCHEDULER_ENABLED
//   'true'  → LIVE mode: calls APNs / FCM, writes dry_run=false rows to push_send_log
//   anything else (or absent) → DRY-RUN: logs every would-be send, writes dry_run=true rows
//
// CRITICAL: dry_run=true rows are audit logs only — they NEVER gate a real send.
// All guards (frequency cap, slot dedup) are enforced exclusively against dry_run=false rows.

'use strict';

const jwt   = require('jsonwebtoken');
const http2 = require('http2');
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getMessaging }                 = require('firebase-admin/messaging');
const { createClient }                 = require('@supabase/supabase-js');
const { getCardForUser, getBannerPreview } = require('./card-utils');

// ── APNs constants (mirrors send-push.js — do NOT modify send-push.js) ───────

const APNS_KEY_ID    = '2T47Q4HDBD';
const APNS_TEAM_ID   = 'N928YZ4T62';
const APNS_BUNDLE_ID = 'app.biocycle.app';

// ── Shared helpers (copied from send-push.js to keep functions independent) ──

function repairPemKey(raw) {
  let key = raw.replace(/\\n/g, '\n').trim();
  if (!key.includes('\n')) {
    key = key
      .replace('-----BEGIN PRIVATE KEY-----', '-----BEGIN PRIVATE KEY-----\n')
      .replace('-----END PRIVATE KEY-----',   '\n-----END PRIVATE KEY-----');
    const match = key.match(/-----BEGIN PRIVATE KEY-----\n(.+?)\n-----END PRIVATE KEY-----/s);
    if (match) {
      const body = match[1].replace(/\s/g, '').replace(/(.{64})/g, '$1\n');
      key = `-----BEGIN PRIVATE KEY-----\n${body}\n-----END PRIVATE KEY-----\n`;
    }
  }
  return key;
}

function makeProviderToken() {
  const raw = process.env.APNS_KEY;
  if (!raw) throw new Error('APNS_KEY env var not set');
  return jwt.sign(
    { iss: APNS_TEAM_ID, iat: Math.floor(Date.now() / 1000) },
    repairPemKey(raw),
    { algorithm: 'ES256', header: { alg: 'ES256', kid: APNS_KEY_ID } }
  );
}

function sendToApns(deviceToken, payload, useSandbox) {
  return new Promise((resolve, reject) => {
    const host   = useSandbox ? 'api.sandbox.push.apple.com' : 'api.push.apple.com';
    const client = http2.connect(`https://${host}`);
    client.on('error', reject);
    const body = JSON.stringify(payload);
    const req  = client.request({
      ':method':        'POST',
      ':path':          `/3/device/${deviceToken}`,
      'authorization':  `bearer ${makeProviderToken()}`,
      'apns-topic':     APNS_BUNDLE_ID,
      'apns-push-type': 'alert',
      'apns-priority':  '10',
      'apns-expiration': String(Math.floor(Date.now() / 1000) + 3600),
      'content-type':   'application/json',
      'content-length': Buffer.byteLength(body),
    });
    let status = 0, responseBody = '';
    req.on('response', (h) => { status = h[':status']; });
    req.on('data',     (c) => { responseBody += c; });
    req.on('end',      ()  => { client.close(); resolve({ ok: status === 200, status, body: responseBody }); });
    req.on('error',    (e) => { client.close(); reject(e); });
    req.write(body); req.end();
  });
}

function getFcm() {
  if (!getApps().length) {
    initializeApp({ credential: cert({
      projectId:   process.env.FCM_PROJECT_ID,
      clientEmail: process.env.FCM_CLIENT_EMAIL,
      privateKey:  repairPemKey(process.env.FCM_PRIVATE_KEY),
    }) });
  }
  return getMessaging();
}

async function sendToFcm(deviceToken, title, body, data, imageUrl) {
  const message = {
    token: deviceToken,
    notification: { title, body, ...(imageUrl ? { imageUrl } : {}) },
    data: data || {},
    android: {
      priority: 'high',
      notification: {
        sound: 'default',
        icon:  'ic_stat_notification',
        color: '#F0A830',
        ...(imageUrl ? { imageUrl } : {}),
      },
    },
  };
  const messageId = await getFcm().send(message);
  return { ok: true, messageId };
}

// ── Supabase client ───────────────────────────────────────────────────────────

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  return createClient(url, key);
}

// ── Deliver to one token row, return { ok, stale } ───────────────────────────

async function deliverToToken({ token, platform }, title, banner, dataPayload, useSandbox) {
  if (platform === 'ios') {
    const payload = {
      aps: {
        alert: { title, body: banner },
        sound: 'default',
        badge: 1,
        'mutable-content': 1,
      },
      ...dataPayload,
    };
    const result = await sendToApns(token, payload, useSandbox);
    // APNs stale-token signals: HTTP 410 (device unregistered) or JSON reason codes
    let stale = result.status === 410;
    if (!stale && result.body) {
      try {
        const parsed = JSON.parse(result.body);
        stale = parsed.reason === 'Unregistered' || parsed.reason === 'BadDeviceToken';
      } catch (_) {}
    }
    return { ok: result.ok, stale };
  }

  if (platform === 'android') {
    try {
      await sendToFcm(token, title, banner, dataPayload, dataPayload.image_url || null);
      return { ok: true, stale: false };
    } catch (err) {
      // FCM stale-token error codes
      const stale = err.code === 'messaging/registration-token-not-registered'
                 || err.code === 'messaging/invalid-registration-token';
      return { ok: false, stale, error: err.message };
    }
  }

  return { ok: false, stale: false, error: 'unknown platform' };
}

// ── Main handler ──────────────────────────────────────────────────────────────

exports.handler = async () => {
  const isDryRun   = process.env.PUSH_SCHEDULER_ENABLED !== 'true';
  const useSandbox = process.env.APNS_ENV === 'sandbox';

  const now       = new Date();
  const utcHour   = now.getUTCHours();
  // UTC day window for send-log queries
  const dayStart  = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
  const dayEnd    = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)).toISOString();

  console.log(`[scheduler] start — UTC hour=${utcHour} dry_run=${isDryRun} sandbox=${useSandbox}`);

  const supabase = getSupabase();

  // ── Step 1: Fetch all profiles that have checkin_times set ───────────────
  // For closed-test scale (< 100 users), fetch all and filter in JS.
  // When user base grows, replace with a Supabase RPC that does JSONB path filtering.

  const { data: profiles, error: profilesErr } = await supabase
    .from('profiles')
    .select('id, idioma, genero, fecha_nacimiento, picardia_mode, days_of_data, checkin_times')
    .not('checkin_times', 'is', null);

  if (profilesErr) {
    console.error('[scheduler] profiles fetch failed:', profilesErr.message);
    return { statusCode: 500, body: 'profiles fetch error' };
  }

  // Find users with a slot matching the current UTC hour
  const eligible = [];
  for (const profile of (profiles || [])) {
    const ct = profile.checkin_times;
    let slot = null;
    if      (ct.morning?.hour   === utcHour) slot = 'morning';
    else if (ct.afternoon?.hour === utcHour) slot = 'afternoon';
    else if (ct.night?.hour     === utcHour) slot = 'night';
    if (slot) eligible.push({ profile, slot });
  }

  console.log(`[scheduler] UTC hour ${utcHour}: ${eligible.length} eligible user(s)`);
  if (eligible.length === 0) {
    return { statusCode: 200, body: JSON.stringify({ sent: 0, skipped: 0, dry_run: isDryRun }) };
  }

  const eligibleIds = eligible.map(e => e.profile.id);

  // ── Step 2: Fetch today's real send log (dry_run=false ONLY) ─────────────
  // Amendment B + correction: dry_run=true rows are audit logs only.
  // Frequency cap and slot dedup are enforced exclusively against real sends.

  const { data: todayLogs, error: logsErr } = await supabase
    .from('push_send_log')
    .select('user_id, push_type, slot')
    .in('user_id', eligibleIds)
    .eq('dry_run', false)                 // ← NEVER read dry-run rows for gating
    .gte('sent_at', dayStart)
    .lt('sent_at',  dayEnd);

  if (logsErr) {
    console.error('[scheduler] send_log fetch failed:', logsErr.message);
    return { statusCode: 500, body: 'send_log fetch error' };
  }

  // Build lookup structures from real sends only
  const dailySentCount = {};    // user_id → number of real pushes sent today
  const sentSlots      = new Set(); // `${user_id}:daily_checkin:${slot}` sent today (real only)

  for (const row of (todayLogs || [])) {
    dailySentCount[row.user_id] = (dailySentCount[row.user_id] || 0) + 1;
    sentSlots.add(`${row.user_id}:${row.push_type}:${row.slot}`);
  }

  // ── Step 3: Fetch push tokens for eligible users ─────────────────────────

  const { data: allTokenRows, error: tokensErr } = await supabase
    .from('push_tokens')
    .select('user_id, token, platform')
    .in('user_id', eligibleIds);

  if (tokensErr) {
    console.error('[scheduler] push_tokens fetch failed:', tokensErr.message);
    return { statusCode: 500, body: 'push_tokens fetch error' };
  }

  const tokensByUser = {};
  for (const row of (allTokenRows || [])) {
    (tokensByUser[row.user_id] = tokensByUser[row.user_id] || []).push(row);
  }

  // ── Step 4: Process each eligible user ───────────────────────────────────

  let sent = 0, skipped = 0;
  const staleTokens = []; // { user_id, platform } to prune after the loop

  for (const { profile, slot } of eligible) {
    const userId = profile.id;
    const tokens = tokensByUser[userId] || [];

    // Guard: no tokens
    if (tokens.length === 0) {
      console.log(`[scheduler] skip user=${userId} — no tokens`);
      skipped++;
      continue;
    }

    // Guard: frequency cap — max 2 real sends per user per UTC day
    // daily_checkin is priority 1; lower-priority types (1B) will check this same cap
    const capCount = dailySentCount[userId] || 0;
    if (capCount >= 2) {
      console.log(`[scheduler] skip user=${userId} — cap (${capCount}/2 today)`);
      skipped++;
      continue;
    }

    // Guard: slot dedup — only real sends (dry_run=false) count here
    const dedupKey = `${userId}:daily_checkin:${slot}`;
    if (sentSlots.has(dedupKey)) {
      console.log(`[scheduler] skip user=${userId} — slot '${slot}' already sent today (real)`);
      skipped++;
      continue;
    }

    // Resolve card content for this user
    const card    = getCardForUser(profile, profile.idioma);
    const title   = card.headline;
    const banner  = getBannerPreview(card.copyText);
    const dataPld = {
      push_type: 'daily_checkin',
      card_id:   card.cardId,
      headline:  card.headline,
      copy_text: card.copyText,
      image_url: card.imageUrl ?? '',
      screen:    'home',
    };

    // ── DRY-RUN path ─────────────────────────────────────────────────────
    if (isDryRun) {
      console.log(
        `[DRY-RUN] user=${userId} slot=${slot} utc_hour=${utcHour}` +
        ` tokens=${tokens.length} card=${card.cardId} title="${title}"`
      );
      // Write audit row — dry_run=true, NEVER read back for gating
      await supabase.from('push_send_log').insert({
        user_id:     userId,
        push_type:   'daily_checkin',
        slot,
        card_id:     card.cardId,
        dry_run:     true,
        platform:    tokens.map(t => t.platform).join('+'),
        token_count: tokens.length,
      });
      sent++;
      continue;
    }

    // ── LIVE path ────────────────────────────────────────────────────────
    let anyOk = false;
    for (const tokenRow of tokens) {
      try {
        const result = await deliverToToken(tokenRow, title, banner, dataPld, useSandbox);
        if (result.ok) {
          anyOk = true;
          console.log(`[scheduler] sent user=${userId} platform=${tokenRow.platform} card=${card.cardId}`);
        } else if (result.stale) {
          console.log(`[scheduler] stale token user=${userId} platform=${tokenRow.platform} — queued for deletion`);
          staleTokens.push({ user_id: userId, platform: tokenRow.platform });
        } else {
          console.error(`[scheduler] send failed user=${userId} platform=${tokenRow.platform} error=${result.error}`);
        }
      } catch (err) {
        console.error(`[scheduler] deliver threw user=${userId} platform=${tokenRow.platform}:`, err.message);
      }
    }

    if (anyOk) {
      // Log the real send — this is what future cap/dedup checks read
      await supabase.from('push_send_log').insert({
        user_id:     userId,
        push_type:   'daily_checkin',
        slot,
        card_id:     card.cardId,
        dry_run:     false,
        platform:    tokens.map(t => t.platform).join('+'),
        token_count: tokens.length,
      });
      // Update in-memory state so later users in this same run see accurate counts
      dailySentCount[userId] = capCount + 1;
      sentSlots.add(dedupKey);
      sent++;
    } else {
      skipped++;
    }
  }

  // ── Step 5: Prune stale tokens ───────────────────────────────────────────

  for (const { user_id, platform } of staleTokens) {
    const { error } = await supabase
      .from('push_tokens')
      .delete()
      .eq('user_id', user_id)
      .eq('platform', platform);
    if (error) {
      console.error(`[scheduler] stale token delete failed user=${user_id} platform=${platform}:`, error.message);
    } else {
      console.log(`[scheduler] deleted stale token user=${user_id} platform=${platform}`);
    }
  }

  console.log(
    `[scheduler] done — sent=${sent} skipped=${skipped}` +
    ` stale_pruned=${staleTokens.length} dry_run=${isDryRun}`
  );
  return {
    statusCode: 200,
    body: JSON.stringify({ sent, skipped, stale_pruned: staleTokens.length, dry_run: isDryRun }),
  };
};
