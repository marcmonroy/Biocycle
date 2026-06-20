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

    // ── Compatibility invite response (YES / NO) ──────────────────────────
    // Check BEFORE the reminder opt-in handler since both use YES/NO
    const isCompatYes = ['yes', 'si', 'sí'].includes(body);
    const isCompatNo  = ['no', 'nope', 'cancel'].includes(body);

    if ((isCompatYes || isCompatNo) && SUPABASE_URL && SUPABASE_SERVICE_KEY) {
      // Look for a pending compatibility invite sent to this phone
      const compatRes = await fetch(
        `${SUPABASE_URL}/rest/v1/compatibility_connections?invited_phone=eq.${encodeURIComponent(phone)}&status=eq.pending&order=initiated_at.desc&limit=1`,
        {
          headers: {
            apikey: SUPABASE_SERVICE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          },
        }
      );
      const compatRows = await compatRes.json();

      if (compatRows && compatRows.length > 0) {
        const conn = compatRows[0];
        const newStatus = isCompatYes ? 'accepted' : 'declined';

        // Update connection status
        await fetch(
          `${SUPABASE_URL}/rest/v1/compatibility_connections?id=eq.${conn.id}`,
          {
            method: 'PATCH',
            headers: {
              apikey: SUPABASE_SERVICE_KEY,
              Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
              'Content-Type': 'application/json',
              Prefer: 'return=minimal',
            },
            body: JSON.stringify({
              status: newStatus,
              responded_at: new Date().toISOString(),
              // Link user_b_id if this phone belongs to a BioCycle user
            }),
          }
        );

        // Link user_b_id if phone belongs to a registered user
        const userRes = await fetch(
          `${SUPABASE_URL}/rest/v1/profiles?whatsapp_phone=eq.${encodeURIComponent(phone)}&select=id,nombre,idioma&limit=1`,
          {
            headers: {
              apikey: SUPABASE_SERVICE_KEY,
              Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
            },
          }
        );
        const userRows = await userRes.json();
        const responder = userRows?.[0] ?? null;
        const isES = responder?.idioma === 'ES';

        if (responder) {
          await fetch(
            `${SUPABASE_URL}/rest/v1/compatibility_connections?id=eq.${conn.id}`,
            {
              method: 'PATCH',
              headers: {
                apikey: SUPABASE_SERVICE_KEY,
                Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
                'Content-Type': 'application/json',
                Prefer: 'return=minimal',
              },
              body: JSON.stringify({ user_b_id: responder.id }),
            }
          );
        }

        // Fetch User A profile to get their phone + name + language
        const userARes = await fetch(
          `${SUPABASE_URL}/rest/v1/profiles?id=eq.${conn.user_a_id}&select=id,nombre,idioma,whatsapp_phone&limit=1`,
          {
            headers: {
              apikey: SUPABASE_SERVICE_KEY,
              Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
            },
          }
        );
        const userARows = await userARes.json();
        const userA = userARows?.[0] ?? null;
        const isAES = userA?.idioma === 'ES';

        // Compatibility type label
        const typeLabels = {
          vibe:        { en: 'Vibe Check',            es: 'Buena Vibra' },
          cognitive:   { en: 'Cognitive Sync',        es: 'Sincronía Intelectual' },
          performance: { en: 'Performance Sync',      es: 'Sincronía de Rendimiento' },
          intimacy:    { en: 'Connection Forecast',   es: 'Pronóstico de Conexión' },
        };
        const typeLabel = typeLabels[conn.type] ?? { en: conn.type, es: conn.type };

        if (isCompatYes) {
          // Confirm to User B (responder)
          const msgB = isES
            ? `✓ Conectados. Abre BioCycle para ver tu pronóstico de compatibilidad de ${typeLabel.es} con ${userA?.nombre ?? 'tu contacto'}. app.biocycle.app`
            : `✓ Connected. Open BioCycle to see your ${typeLabel.en} compatibility forecast with ${userA?.nombre ?? 'your contact'}. app.biocycle.app`;
          await sendWhatsAppReply(from, msgB);

          // Notify User A
          if (userA?.whatsapp_phone) {
            const responderName = responder?.nombre ?? conn.invited_name;
            const msgA = isAES
              ? `✓ ${responderName} aceptó tu solicitud de ${typeLabel.es}. Abre BioCycle para ver su pronóstico compartido. app.biocycle.app`
              : `✓ ${responderName} accepted your ${typeLabel.en} request. Open BioCycle to see your shared forecast. app.biocycle.app`;
            await sendWhatsAppReply(`whatsapp:${userA.whatsapp_phone}`, msgA);
          }
        } else {
          // Declined — confirm to User B
          const msgB = isES
            ? `Entendido. La solicitud de ${typeLabel.es} ha sido rechazada.`
            : `Understood. The ${typeLabel.en} request has been declined.`;
          await sendWhatsAppReply(from, msgB);

          // Notify User A of decline
          if (userA?.whatsapp_phone) {
            const responderName = responder?.nombre ?? conn.invited_name;
            const msgA = isAES
              ? `${responderName} rechazó tu solicitud de ${typeLabel.es}.`
              : `${responderName} declined your ${typeLabel.en} request.`;
            await sendWhatsAppReply(`whatsapp:${userA.whatsapp_phone}`, msgA);
          }
        }

        // Return early — don't fall through to reminder opt-in handler
        return {
          statusCode: 200,
          headers,
          body: `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
        };
      }
      // No pending compatibility invite found — fall through to reminder handler
    }
    // ── End compatibility handler ─────────────────────────────────────────

    // Check if this is a YES activation message
    const isYes = body.includes('yes') || body.includes('si') || body.includes('sí') || body.includes('ok') || body.includes('acepto') || body.includes('accept') || body.includes('activar') || body.includes('activate');

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
