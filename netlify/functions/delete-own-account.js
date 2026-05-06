const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }
  const authHeader = event.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) return { statusCode: 401, body: 'Unauthorized' };

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !user) return { statusCode: 401, body: 'Invalid token' };

  const uid = user.id;
  try {
    await supabase.from('whatsapp_verification_codes').delete().eq('user_id', uid);
    await supabase.from('relationship_interactions').delete().eq('user_id', uid);
    await supabase.from('relationships').delete().eq('user_id', uid);
    await supabase.from('conversation_sessions').delete().eq('user_id', uid);
    await supabase.from('user_state').delete().eq('user_id', uid);
    await supabase.from('profiles').delete().eq('id', uid);
    await supabase.auth.admin.deleteUser(uid);
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
