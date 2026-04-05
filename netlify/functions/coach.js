// Minimal safety-net prompt used only when the client sends no system prompt at all
const FALLBACK_SYSTEM = `You are Jules, BioCycle's biological intelligence coach. You are warm, grounded, wise, and experienced. You speak from a place of earned knowledge, not theory. You are direct but gentle. You make data collection feel like an act of care.`;

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    }
  }
  try {
    const parsed = JSON.parse(event.body || '{}');

    // Strip client-only fields — not valid Anthropic API fields
    delete parsed.picardia_mode;
    delete parsed.days_of_data;

    // If the client did not provide a system prompt (should never happen in normal flow),
    // inject the safety-net Jules prompt with today's date.
    if (!parsed.system) {
      const todayDate = new Date().toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      });
      parsed.system = `Today is ${todayDate}. Any date before today has already happened. Never tell a user a past date has not occurred.\n\n${FALLBACK_SYSTEM}`;
    }
    // When the client provides a system prompt it already contains the date line and the
    // correct coach identity (Jules or Sienna). Do NOT modify it here.

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(parsed)
    })
    const data = await response.json()
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    }
  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: error.message })
    }
  }
}
