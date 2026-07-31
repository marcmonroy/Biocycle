// ── BioCycle mitigation library ─────────────────────────────────────────────
// Plain, editable coaching copy. NO logic depends on the wording here — you can
// rewrite any string freely (keep EN and ES arrays the same shape).
//
// These are lifestyle/wellness nudges only. Genuine distress is handled by the
// crisis-support path, NOT by these tips.
//
// Shape: LIB[kind][direction] = { en: string[], es: string[] }
//   direction 'low'  = the dimension is forecast LOW  (e.g. low energy)
//   direction 'high' = the dimension is forecast HIGH (a peak; for stress/
//                      anxiety this means a spike; for decision, a good window)

export type Dir = 'low' | 'high';
type TipSet = { en: string[]; es: string[] };
type Entry = Partial<Record<Dir, TipSet>>;

const LIB: Record<string, Entry> = {
  energy: {
    low:  { en: ['time your caffeine earlier', 'lean on protein and fruit', 'keep the schedule lighter'],
            es: ['toma tu cafeína más temprano', 'apóyate en proteína y fruta', 'mantén la agenda más ligera'] },
    high: { en: ['tackle your hardest task', 'fit in a workout', 'make the big move today'],
            es: ['encara tu tarea más difícil', 'haz ejercicio', 'da el paso importante hoy'] },
  },
  cognitive: {
    low:  { en: ['defer deep or detailed work', 'lean on checklists', 'avoid big commitments'],
            es: ['pospón el trabajo profundo o detallado', 'apóyate en listas', 'evita compromisos grandes'] },
    high: { en: ['block time for deep or creative work', 'plan and strategize', 'learn something demanding'],
            es: ['reserva tiempo para trabajo profundo o creativo', 'planifica y estrategiza', 'aprende algo exigente'] },
  },
  sleep: {
    low:  { en: ['start a wind-down routine', 'screens off earlier', 'no late caffeine'],
            es: ['empieza una rutina de relajación', 'apaga pantallas más temprano', 'sin cafeína tardía'] },
    high: { en: ['protect this good rest window', 'keep your evening calm'],
            es: ['protege esta buena ventana de descanso', 'mantén tu noche tranquila'] },
  },
  emotional: {
    low:  { en: ['be gentle with yourself', 'reach out to someone you trust', 'keep the day soft'],
            es: ['sé amable contigo', 'habla con alguien de confianza', 'mantén el día suave'] },
    high: { en: ['connect with people you love', 'share what you are feeling', 'celebrate something'],
            es: ['conéctate con quienes quieres', 'comparte lo que sientes', 'celebra algo'] },
  },
  social: {
    low:  { en: ['protect solo time', 'decline optional plans', 'recharge on your own'],
            es: ['protege tu tiempo a solas', 'declina planes opcionales', 'recárgate por tu cuenta'] },
    high: { en: ['schedule the social plans', 'plan the date', 'put yourself out there'],
            es: ['agenda los planes sociales', 'planea la cita', 'muéstrate y conecta'] },
  },
  // stress / anxiety: spike only (direction 'high')
  stress: {
    high: { en: ['set firm boundaries', 'protect real breaks', 'trim non-essential commitments'],
            es: ['pon límites firmes', 'protege descansos reales', 'recorta compromisos no esenciales'] },
  },
  anxiety: {
    high: { en: ['slow your breathing', 'ease off caffeine and stimulants', 'protect a few quiet minutes'],
            es: ['respira más lento', 'reduce cafeína y estimulantes', 'protege unos minutos de calma'] },
  },
  // decision: derived signal. high = good window to decide, low = poor window
  decision: {
    high: { en: ['make the big call', 'sign or commit', 'have the important conversation'],
            es: ['toma la decisión importante', 'firma o comprométete', 'ten la conversación importante'] },
    low:  { en: ['delay irreversible choices', 'sleep on big decisions', 'keep your options open'],
            es: ['pospón decisiones irreversibles', 'consúltalo con la almohada', 'mantén tus opciones abiertas'] },
  },
};

// Sexual is partner-aware, so it has its own helper rather than a flat table.
function sexualTips(dir: Dir, isES: boolean, partnerName?: string): string[] {
  const p = partnerName?.trim();
  if (dir === 'high') {
    if (p) return isES
      ? [`una ventana fuerte para conectar con ${p}`, `planea algo especial con ${p}`]
      : [`a strong window to connect with ${p}`, `plan something special with ${p}`];
    return isES
      ? ['tu chispa está alta — disfrútala', 'una ventana segura y magnética']
      : ['your spark runs high — enjoy it', 'a confident, magnetic window'];
  }
  // low
  if (p) return isES
    ? [`el deseo puede bajar — sin presión, solo cercanía con ${p}`, `llévalo con calma con ${p}`]
    : [`desire may dip — no pressure, just closeness with ${p}`, `keep it low-key with ${p}`];
  return isES
    ? ['el deseo puede bajar — es normal, tómalo con calma', 'una ventana más tranquila, nada que forzar']
    : ['drive may dip — that is normal, be easy on yourself', 'a quieter window, nothing to force'];
}

/** Return up to 2 candidate tips for a signal. Jules picks from these. */
export function getTips(kind: string, dir: Dir, isES: boolean, partnerName?: string): string[] {
  if (kind === 'sexual') return sexualTips(dir, isES, partnerName);
  const set = LIB[kind]?.[dir];
  const list = set ? (isES ? set.es : set.en) : [];
  return list.slice(0, 2);
}
