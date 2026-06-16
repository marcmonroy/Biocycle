// Receives inbound WhatsApp messages from Twilio
// Handles: YES activation, day-30 reconfirmation, general replies
// Webhook URL to set in Twilio Console:
// Messaging → Phone Numbers → +16625688859 → A message comes in → Webhook
// URL: https://app.biocycle.app/.netlify/functions/sms-inbound

const SUPABASE_URL        = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TWILIO_ACCOUNT_SID  = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN   = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM         = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+16625688859';

async function sendWhatsAppReply(to, body) {
  const toNumber = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
  const payload = new URLSearchParams({ From: TWILIO_FROM, To: toNumber, Body: body });
  await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64')}`,
      },
      body: payload.toString(),
    }
  );
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'text/xml',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const params  = new URLSearchParams(event.body || '');
    const from    = params.get('From') || '';
    const body    = (params.get('Body') || '').trim().toLowerCase();

    console.log(`[sms-inbound] from=${from} body=${body}`);

    // Extract E.164 phone number from whatsapp:+1XXXXXXXXXX format
    const phone = from.replace('whatsapp:', '');

    // Check if this is a YES activation message
    const isYes = ['yes', 'si', 'sí', 'ok', 'okay', 'sure', 'activate', 'activar'].some(word => body.startsWith(word));

    const slotMap = {
      'morning': 'morning', 'mañana': 'morning', 'manana': 'morning', 'madrugada': 'morning',
      'afternoon': 'afternoon', 'tarde': 'afternoon',
      'night': 'night', 'noche': 'night', 'evening': 'night',
    };
    const preferredSlot = slotMap[body] ?? null;

    if (isYes && SUPABASE_URL && SUPABASE_SERVICE_KEY) {
      // Find user by phone number
      const searchRes = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?whatsapp_phone=eq.${encodeURIComponent(phone)}&select=id,nombre,idioma,days_of_data&limit=1`,
        {
          headers: {
            apikey: SUPABASE_SERVICE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          },
        }
      );

      const users = await searchRes.json();

      if (users && users.length > 0) {
        const user = users[0];
        const isES = user.idioma === 'ES';
        const name = user.nombre ?? (isES ? 'Trader' : 'Trader');

        // Mark whatsapp_enabled = true
        await fetch(
          `${SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}`,
          {
            method: 'PATCH',
            headers: {
              apikey: SUPABASE_SERVICE_KEY,
              Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
              'Content-Type': 'application/json',
              Prefer: 'return=minimal',
            },
            body: JSON.stringify({ whatsapp_enabled: true }),
          }
        );

        console.log(`[sms-inbound] activated whatsapp for user ${user.id}`);

        // Send welcome confirmation
        const welcomeMsg = isES
          ? `Bienvenido a BioCycle, ${name}. Jules te enviará tu recordatorio diario aquí. Abre la app cuando llegue: https://app.biocycle.app`
          : `Welcome to BioCycle, ${name}. Jules will send your daily reminder here. Open the app when it arrives: https://app.biocycle.app`;

        await sendWhatsAppReply(from, welcomeMsg);
      } else {
        console.log(`[sms-inbound] no user found for phone ${phone}`);
      }
    }

    if (preferredSlot && SUPABASE_URL && SUPABASE_SERVICE_KEY) {
      // Find user by phone and update their preferred slot
      const searchRes = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?whatsapp_phone=eq.${encodeURIComponent(phone)}&select=id,nombre,idioma&limit=1`,
        { headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` } }
      );
      const users = await searchRes.json();
      if (users && users.length > 0) {
        const user = users[0];
        const isES = user.idioma === 'ES';
        await fetch(
          `${SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}`,
          {
            method: 'PATCH',
            headers: {
              apikey: SUPABASE_SERVICE_KEY,
              Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
              'Content-Type': 'application/json',
              Prefer: 'return=minimal',
            },
            body: JSON.stringify({ preferred_checkin_slot: preferredSlot }),
          }
        );
        const confirmMsg = isES
          ? `Perfecto. Jules te enviará tu recordatorio diario por la ${preferredSlot === 'morning' ? 'mañana' : preferredSlot === 'afternoon' ? 'tarde' : 'noche'}. Puedes cambiarlo cuando quieras en la app.`
          : `Perfect. Jules will send your daily reminder in the ${preferredSlot}. You can change this anytime in the app.`;
        await sendWhatsAppReply(from, confirmMsg);
      }
    }

    // Always return valid TwiML — required by Twilio
    return {
      statusCode: 200,
      headers,
      body: `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
    };
  } catch (err) {
    console.error('[sms-inbound] error:', err);
    return {
      statusCode: 200,
      headers,
      body: `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
    };
  }
};
