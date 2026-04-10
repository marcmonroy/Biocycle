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
    console.log('[delete-account] userId:', userId);

    if (!userId) {
      return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'userId required' }) };
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    console.log('[delete-account] SUPABASE_URL present:', !!supabaseUrl);
    console.log('[delete-account] SERVICE_ROLE_KEY present:', !!serviceKey);

    if (!supabaseUrl || !serviceKey) {
      return { statusCode: 500, headers: cors, body: JSON.stringify({ error: 'Missing Supabase credentials' }) };
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
