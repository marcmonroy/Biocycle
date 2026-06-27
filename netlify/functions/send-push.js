const admin = require('firebase-admin');

// Initialize Firebase Admin once (reused across warm invocations)
let app;
function getApp() {
  if (!app) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }
  return app;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { token, title, body, imageUrl, data } = JSON.parse(event.body);

    if (!token || !title || !body) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'token, title, and body are required' }),
      };
    }

    getApp();

    const message = {
      token,
      notification: {
        title,
        body,
        ...(imageUrl ? { imageUrl } : {}),
      },
      data: data || {},
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
            'mutable-content': 1,
          },
        },
        ...(imageUrl ? {
          fcmOptions: { imageUrl },
        } : {}),
      },
      android: {
        notification: {
          sound: 'default',
          ...(imageUrl ? { imageUrl } : {}),
        },
      },
    };

    const response = await admin.messaging().send(message);
    console.log('[send-push] sent:', response);

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, messageId: response }),
    };
  } catch (err) {
    console.error('[send-push] error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: err.message }),
    };
  }
};
