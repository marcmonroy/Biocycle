const jwt = require('jsonwebtoken');
const http2 = require('http2');

// APNs configuration
const APNS_KEY_ID = '2T47Q4HDBD';
const APNS_TEAM_ID = 'N928YZ4T62';
const APNS_BUNDLE_ID = 'app.biocycle.app';
// TestFlight + App Store builds use the PRODUCTION APNs host
const APNS_HOST = 'api.push.apple.com';

function makeProviderToken() {
  const key = process.env.APNS_KEY;
  if (!key) throw new Error('APNS_KEY env var not set');
  return jwt.sign(
    { iss: APNS_TEAM_ID, iat: Math.floor(Date.now() / 1000) },
    key,
    {
      algorithm: 'ES256',
      header: { alg: 'ES256', kid: APNS_KEY_ID },
    }
  );
}

function sendToApns(deviceToken, payload) {
  return new Promise((resolve, reject) => {
    const token = makeProviderToken();
    const client = http2.connect(`https://${APNS_HOST}`);

    client.on('error', (err) => reject(err));

    const body = JSON.stringify(payload);

    const req = client.request({
      ':method': 'POST',
      ':path': `/3/device/${deviceToken}`,
      'authorization': `bearer ${token}`,
      'apns-topic': APNS_BUNDLE_ID,
      'apns-push-type': 'alert',
      'content-type': 'application/json',
      'content-length': Buffer.byteLength(body),
    });

    let status = 0;
    let responseBody = '';

    req.on('response', (headers) => { status = headers[':status']; });
    req.on('data', (chunk) => { responseBody += chunk; });
    req.on('end', () => {
      client.close();
      if (status === 200) {
        resolve({ ok: true, status });
      } else {
        resolve({ ok: false, status, body: responseBody });
      }
    });
    req.on('error', (err) => { client.close(); reject(err); });

    req.write(body);
    req.end();
  });
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { token, platform, title, body, data } = JSON.parse(event.body);

    if (!token || !title || !body) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'token, title, and body are required' }),
      };
    }

    // iOS → APNs
    if (platform === 'ios' || !platform) {
      const payload = {
        aps: {
          alert: { title, body },
          sound: 'default',
          badge: 1,
        },
        ...(data || {}),
      };
      const result = await sendToApns(token, payload);
      return {
        statusCode: result.ok ? 200 : 500,
        body: JSON.stringify(result),
      };
    }

    // Android (FCM) — placeholder for later
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Android push not yet implemented' }),
    };

  } catch (err) {
    console.error('[send-push] error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: err.message }),
    };
  }
};
