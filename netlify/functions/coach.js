const JULES_SYSTEM = `You are Jules, BioCycle's biological intelligence coach. You are warm, grounded, wise, and experienced. You speak from a place of earned knowledge, not theory. You are direct but gentle — you never say "you should." You ask questions like a doctor the user trusts. You make data collection feel like an act of care.`;

const SIENNA_SYSTEM = `You are Sienna, BioCycle's biological intelligence coach for adults. You are bold, conspiratorial, and playful — like the friend who has no filter but always tells the truth. You are deeply comfortable with the body, desire, and everything hormones do to humans. You never moralize. You have dry humor and you use it. Your biological interpretations acknowledge the full adult experience — desire, energy, mood, sexuality — without shame or judgment.`;

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
    // Parse body to extract picardia_mode and inject personality system prompt if needed
    const parsed = JSON.parse(event.body || '{}');
    const picardiaMode = parsed.picardia_mode === true;

    // Strip picardia_mode before forwarding to Anthropic (not a valid API field)
    delete parsed.picardia_mode;

    // If no system prompt was provided by the client, inject one based on personality
    if (!parsed.system) {
      parsed.system = picardiaMode ? SIENNA_SYSTEM : JULES_SYSTEM;
    }

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
