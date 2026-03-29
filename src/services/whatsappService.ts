import { supabase, Profile } from '../lib/supabase';
import { getCardForUser, getWhatsAppTeaser, CardTimeSlot } from '../data/cardLibrary';

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-whatsapp-card`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export type WhatsAppSendResult =
  | { success: true; sid: string; cardId: string }
  | { success: false; error: string };

export async function sendBioCycleCard(
  userId: string,
  profile: Profile,
  timeSlot: CardTimeSlot,
  currentPhase: string,
  lastShownCardIds: string[] = [],
): Promise<WhatsAppSendResult> {
  if (!profile.whatsapp_enabled) {
    return { success: false, error: 'WhatsApp notifications disabled' };
  }

  const phone = profile.whatsapp_phone;
  if (!phone) {
    return { success: false, error: 'No WhatsApp phone number set' };
  }

  const card = getCardForUser(profile, currentPhase, timeSlot, lastShownCardIds);
  if (!card) {
    return { success: false, error: 'No matching card found for current phase and time slot' };
  }

  const teaserText = getWhatsAppTeaser(card, profile);
  const language = profile.idioma === 'EN' ? 'EN' : 'ES';

  let twilio_sid: string | null = null;
  let success = false;
  let error_message: string | null = null;

  try {
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        teaserText,
        phoneNumber: phone,
        language,
      }),
    });

    const data = await response.json();

    if (data.success && data.sid) {
      twilio_sid = data.sid;
      success = true;
    } else {
      error_message = data.error?.message ?? 'Unknown error from Edge Function';
    }
  } catch (err) {
    error_message = err instanceof Error ? err.message : 'Network error';
  }

  // Log the send attempt to whatsapp_sends table
  await supabase.from('whatsapp_sends').insert({
    user_id: userId,
    card_id: card.id,
    phone_number: phone,
    teaser_text: teaserText,
    image_url: card.image,
    twilio_sid,
    success,
    error_message,
  });

  if (success && twilio_sid) {
    return { success: true, sid: twilio_sid, cardId: card.id };
  }
  return { success: false, error: error_message ?? 'Send failed' };
}
