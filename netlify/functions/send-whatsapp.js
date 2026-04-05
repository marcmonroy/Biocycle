// Twilio WhatsApp sender
// Sender: whatsapp:+15559545595
// Template EN: HX2a761c6b6589f010cd416d1bf4f386d8
// Template ES: HXa511293ce070bfd02ac0d799b2aa6526
// Body variable {{1}} = teaser text (ASCII only, no emojis, no accents, max 160 chars, no newlines)

exports.handler = async (event) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  try {
    const { to, language = 'EN', teaserText } = JSON.parse(event.body || '{}');

    if (!to || !teaserText) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'to and teaserText are required' }),
      };
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+15559545595';

    if (!accountSid || !authToken) {
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Twilio credentials not configured' }),
      };
    }

    const templateSid = language === 'ES'
      ? 'HXa511293ce070bfd02ac0d799b2aa6526'
      : 'HX2a761c6b6589f010cd416d1bf4f386d8';

    // Strip accents and emojis from teaser — template body var must be ASCII
    const safeTeaser = teaserText
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\x00-\x7F]/g, '')
      .replace(/\n/g, ' ')
      .substring(0, 160);

    const toNumber = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

    const body = new URLSearchParams({
      From: from,
      To: toNumber,
      ContentSid: templateSid,
      ContentVariables: JSON.stringify({ '1': safeTeaser }),
    });

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        },
        body: body.toString(),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers: corsHeaders,
        body: JSON.stringify({ error: data.message || 'Twilio error' }),
      };
    }

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ sid: data.sid }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: error.message }),
    };
  }
};
