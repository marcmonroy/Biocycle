Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  try {
    const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID')
    const twilioToken = Deno.env.get('TWILIO_AUTH_TOKEN')
    const twilioFrom = Deno.env.get('TWILIO_WHATSAPP_FROM')
    const body = await req.json()
    const phoneNumber = body.phoneNumber
    const language = body.language
    const teaserText = body.teaserText || 'Tu biologia tiene algo que decirte hoy.'
    const templateSid = language === 'ES' ? 'HXa511293ce070bfd02ac0d799b2aa6526' : 'HX2a761c6b6589f010cd416d1bf4f386d8'
    const contentVariables = JSON.stringify({"1": teaserText.substring(0, 1024)})
    const twilioUrl = 'https://api.twilio.com/2010-04-01/Accounts/' + twilioSid + '/Messages.json'
    const formData = new URLSearchParams()
    formData.append('To', 'whatsapp:' + phoneNumber)
    formData.append('From', twilioFrom)
    formData.append('ContentSid', templateSid)
    formData.append('ContentVariables', contentVariables)
    const credentials = btoa(twilioSid + ':' + twilioToken)
    const twilioResponse = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + credentials,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString()
    })
    const twilioData = await twilioResponse.json()
    console.log('Twilio response:', JSON.stringify(twilioData))
    if (!twilioResponse.ok) {
      return new Response(JSON.stringify({ error: twilioData }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    return new Response(JSON.stringify({ success: true, sid: twilioData.sid }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    console.error('Error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
