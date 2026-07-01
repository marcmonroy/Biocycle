// send-push.js — Netlify Function
// Two modes:
//   push_type: 'daily_card' → looks up card automatically from user profile
//   manual                  → caller passes title + body directly (unchanged behavior)

'use strict';

const jwt   = require('jsonwebtoken');
const http2 = require('http2');
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getMessaging } = require('firebase-admin/messaging');
const { createClient }  = require('@supabase/supabase-js');
const { getCardForUser, getBannerPreview } = require('./card-utils');

function repairPemKey(raw) {
  let key = raw.replace(/\\n/g, '\n').trim();
  if (!key.includes('\n')) {
    key = key
      .replace('-----BEGIN PRIVATE KEY-----', '-----BEGIN PRIVATE KEY-----\n')
      .replace('-----END PRIVATE KEY-----', '\n-----END PRIVATE KEY-----');
    const match = key.match(/-----BEGIN PRIVATE KEY-----\n(.+?)\n-----END PRIVATE KEY-----/s);
    if (match) {
      const body = match[1].replace(/\s/g, '').replace(/(.{64})/g, '$1\n');
      key = `-----BEGIN PRIVATE KEY-----\n${body}\n-----END PRIVATE KEY-----\n`;
    }
  }
  return key;
}

const APNS_KEY_ID    = '2T47Q4HDBD';
const APNS_TEAM_ID   = 'N928YZ4T62';
const APNS_BUNDLE_ID = 'app.biocycle.app';
const APNS_HOST_PROD    = 'api.push.apple.com';
const APNS_HOST_SANDBOX = 'api.sandbox.push.apple.com';

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
    const host   = useSandbox ? APNS_HOST_SANDBOX : APNS_HOST_PROD;
    const client = http2.connect(`https://${host}`);
    client.on('error', reject);
    const body = JSON.stringify(payload);
    const req  = client.request({
      ':method': 'POST', ':path': `/3/device/${deviceToken}`,
      'authorization': `bearer ${makeProviderToken()}`,
      'apns-topic': APNS_BUNDLE_ID, 'apns-push-type': 'alert',
      'apns-priority': '10',
      'apns-expiration': String(Math.floor(Date.now() / 1000) + 3600),
      'content-type': 'application/json',
      'content-length': Buffer.byteLength(body),
    });
    let status = 0, responseBody = '', apnsId = null;
    req.on('response', (h) => { status = h[':status']; apnsId = h['apns-id'] || null; });
    req.on('data',  (c) => { responseBody += c; });
    req.on('end',   ()  => { client.close(); resolve({ ok: status === 200, status, apnsId, body: responseBody }); });
    req.on('error', (e) => { client.close(); reject(e); });
    req.write(body); req.end();
  });
}

function getFcm() {
  if (!getApps().length) {
    initializeApp({ credential: cert({
      projectId:   process.env.FCM_PROJECT_ID,
      clientEmail: process.env.FCM_CLIENT_EMAIL,
      privateKey:  repairPemKey(process.env.FCM_PRIVATE_KEY),
    })});
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
        icon: 'ic_stat_notification',
        color: '#F0A830',
        ...(imageUrl ? { imageUrl } : {}),
      },
    },
  };
  const messageId = await getFcm().send(message);
  return { ok: true, messageId };
}

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  return createClient(url, key);
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  try {
    const parsed = JSON.parse(event.body);
    const { token, platform } = parsed;
    if (!token) return { statusCode: 400, body: JSON.stringify({ error: 'token is required' }) };

    const useSandbox = event.queryStringParameters?.env === 'sandbox';

    // ── MODE A: daily card push ──────────────────────────────────────────
    if (parsed.push_type === 'daily_card') {
      const { user_id } = parsed;
      if (!user_id) return { statusCode: 400, body: JSON.stringify({ error: 'user_id required' }) };

      const supabase = getSupabase();
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('days_of_data, genero, fecha_nacimiento, picardia_mode, idioma')
        .eq('id', user_id)
        .single();

      if (profileErr || !profile) {
        return { statusCode: 404, body: JSON.stringify({ error: 'profile not found', detail: profileErr?.message }) };
      }

      const card   = getCardForUser(profile);
      const title  = card.headline;
      const banner = getBannerPreview(card.copyText);
      const dataPayload = {
        push_type: 'daily_card',
        card_id:   card.cardId,
        headline:  card.headline,
        copy_text: card.copyText,
        image_url: card.imageUrl ?? '',
        screen:    'home',
      };

      if (platform === 'ios' || !platform) {
        const payload = {
          aps: {
            alert: { title, body: banner },
            sound: 'default', badge: 1,
            'mutable-content': 1,
          },
          ...dataPayload,
        };
        const result = await sendToApns(token, payload, useSandbox);
        return { statusCode: result.ok ? 200 : 500, body: JSON.stringify({ ...result, card_id: card.cardId }) };
      }

      if (platform === 'android') {
        const result = await sendToFcm(token, title, banner, dataPayload, card.imageUrl);
        return { statusCode: 200, body: JSON.stringify({ ...result, card_id: card.cardId }) };
      }
    }

    // ── MODE B: manual push (unchanged) ─────────────────────────────────
    const { title, body, data } = parsed;
    if (!title || !body) return { statusCode: 400, body: JSON.stringify({ error: 'title and body are required' }) };

    if (platform === 'ios' || !platform) {
      const payload = { aps: { alert: { title, body }, sound: 'default', badge: 1 }, ...(data || {}) };
      const result  = await sendToApns(token, payload, useSandbox);
      return { statusCode: result.ok ? 200 : 500, body: JSON.stringify(result) };
    }

    if (platform === 'android') {
      const result = await sendToFcm(token, title, body, data, data?.image_url);
      return { statusCode: 200, body: JSON.stringify(result) };
    }

    return { statusCode: 400, body: JSON.stringify({ error: 'unknown platform' }) };

  } catch (err) {
    console.error('[send-push] error:', err);
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: err.message }) };
  }
};
