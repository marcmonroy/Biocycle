exports.handler = async (event) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: cors, body: '' };
  }

  try {
    const { userId } = JSON.parse(event.body || '{}');

    if (!userId) {
      return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'userId required' }) };
    }

    // Security: verify the caller owns this account using their auth token
    const authHeader = event.headers['authorization'] || event.headers['Authorization'] || '';
    const callerToken = authHeader.replace('Bearer ', '').trim();

    if (!callerToken) {
      return { statusCode: 401, headers: cors, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    // Verify the token belongs to the userId being deleted
    const supabaseUrl = process.env.SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY;
    if (!anonKey) {
      console.error('[delete-account] SUPABASE_ANON_KEY not set — cannot verify token ownership');
      return { statusCode: 500, headers: cors, body: JSON.stringify({ error: 'Server configuration error' }) };
    }

    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { 'Authorization': `Bearer ${callerToken}`, 'apikey': anonKey }
    });
    if (!userRes.ok) {
      return { statusCode: 401, headers: cors, body: JSON.stringify({ error: 'Invalid token' }) };
    }
    const userData = await userRes.json();
    if (userData.id !== userId) {
      return { statusCode: 403, headers: cors, body: JSON.stringify({ error: 'Forbidden — token does not match userId' }) };
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;

    console.log('[delete-account] SUPABASE_URL present:', !!supabaseUrl);
    console.log('[delete-account] SERVICE_ROLE_KEY present:', !!serviceKey);

    if (!supabaseUrl || !serviceKey) {
      return { statusCode: 500, headers: cors, body: JSON.stringify({ error: 'Missing Supabase credentials' }) };
    }

    // Delete all user data server-side using service role key (bypasses RLS)
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;
    const headers = {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    };

    const tables = [
      `whatsapp_verification_codes?user_id=eq.${userId}`,
      `relationship_interactions?user_id=eq.${userId}`,
      `relationships?user_id=eq.${userId}`,
      `safety_events?user_id=eq.${userId}`,
      `validation_scores?user_id=eq.${userId}`,
      `conversation_sessions?user_id=eq.${userId}`,
      `compatibility_connections?user_a_id=eq.${userId}`,
      `compatibility_connections?user_b_id=eq.${userId}`,
      `user_state?user_id=eq.${userId}`,
      `profiles?id=eq.${userId}`,
    ];

    for (const table of tables) {
      const delRes = await fetch(`${supabaseUrl}/rest/v1/${table}`, {
        method: 'DELETE',
        headers,
      });
      console.log(`[delete-account] deleted ${table}: ${delRes.status}`);
    }

    const url = `${supabaseUrl}/auth/v1/admin/users/${userId}`;
    console.log('[delete-account] DELETE URL:', url);

    const res = await fetch(url, {
      method: 'DELETE',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
    });

    const responseText = await res.text();
    console.log('[delete-account] Response status:', res.status);
    console.log('[delete-account] Response body:', responseText);

    if (!res.ok) {
      return {
        statusCode: res.status,
        headers: cors,
        body: JSON.stringify({ error: `Auth delete failed: ${responseText}` })
      };
    }

    console.log('[delete-account] Auth user deleted successfully');
    return { statusCode: 200, headers: cors, body: JSON.stringify({ success: true }) };

  } catch (err) {
    console.error('[delete-account] unexpected error:', err);
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: err.message }) };
  }
};
