import { API_BASE } from '../lib/apiBase';
import type { CompatibilityType } from '../lib/supabase';

export async function sendWhatsAppInvite({
  recipientPhone,
  recipientName,
  senderName,
  type,
}: {
  recipientPhone: string;
  recipientName:  string;
  senderName:     string;
  type:           CompatibilityType;
}): Promise<void> {
  await fetch(`${API_BASE}/.netlify/functions/send-whatsapp`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action:        'compatibility_invite',
      to:            recipientPhone,
      type,
      recipientName,
      senderName,
    }),
  });
}
