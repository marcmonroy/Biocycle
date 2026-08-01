export function normalizePhone(rawPhone: string): string {
  const cleaned = (rawPhone || '').replace(/^whatsapp:/i, '');
  const digits = cleaned.replace(/\D/g, '');
  return digits ? `+${digits}` : '';
}
