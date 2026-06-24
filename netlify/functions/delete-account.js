exports.handler = async (event) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: cors, body: '' };
  }

  try {
    const { userId } = JSON.parse(event.body || '{}');

    if (!userId) {
      return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'userId required' }) };
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return { statusCode: 500, headers: cors, body: JSON.stringify({ error: 'Missing server credentials' }) };
    }

    const headers = {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    };

    // Delete all user data in correct foreign-key order
    // Service role key bypasses RLS — guaranteed deletion
    const tables = [
      `whatsapp_verification_codes?user_id=eq.${userId}`,
      `relationship_interactions?user_id=eq.${userId}`,
      `relationships?user_id=eq.${userId}`,
      `safety_events?user_id=eq.${userId}`,
      `validation_scores?user_id=eq.${userId}`,
      `conversation_sessions?user_id=eq.${userId}`,
      `compatibility_connections?user_a_id=eq.${userId}`,
      `compatibility_connections?user_b_id=eq.${userId}`,
      `whatsapp_sends?user_id=eq.${userId}`,
      `user_state?user_id=eq.${userId}`,
      `profiles?id=eq.${userId}`,
    ];

    for (const table of tables) {
      const r = await fetch(`${supabaseUrl}/rest/v1/${table}`, { method: 'DELETE', headers });
      console.log(`[delete-account] ${table} → ${r.status}`);
    }

    // Delete the auth account
    const authRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
      method: 'DELETE',
      headers,
    });

    const body = await authRes.text();
    console.log(`[delete-account] auth delete → ${authRes.status}: ${body}`);

    if (!authRes.ok) {
      return { statusCode: authRes.status, headers: cors, body: JSON.stringify({ error: body }) };
    }

    return { statusCode: 200, headers: cors, body: JSON.stringify({ success: true }) };

  } catch (err) {
    console.error('[delete-account] error:', err);
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: err.message }) };
  }
};
