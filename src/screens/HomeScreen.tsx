import { useState, useRef, useEffect } from 'react';
import { supabase, Profile } from '../lib/supabase';
import { PhaseData } from '../utils/phaseEngine';
import { getTodayStats } from '../utils/statsUtils';
import { Settings, Share2, X, LogOut, Loader2, AlertTriangle, Bell, Save, Trash2, Download, MessageCircle, Lock } from 'lucide-react';
import { CheckinTime, DEFAULT_CHECKIN_TIMES, scheduleNotifications } from '../utils/notifications';
import { getCardForUser } from '../data/cardLibrary';

interface HomeScreenProps {
  profile: Profile;
  phaseData: PhaseData;
  onNavigate: (screen: 'forecast' | 'checkin' | 'coach' | 'dashboard') => void;
  onProfileUpdate: () => void;
}

type PhaseContentItem = {
  headline: string;
  headlineEn: string;
  body: string;
  bodyEn: string;
  banner: string;
  bannerEn: string;
};

const phaseContent: Record<string, PhaseContentItem> = {
  menstrual: {
    headline: 'No está disponible. En proceso de transformación. Por favor no interrumpir.',
    headlineEn: 'Unavailable. Undergoing transformation. Please do not disturb.',
    body: 'Tu cuerpo está haciendo trabajo extraordinario y solo pide una cosa: que lo dejes. El mundo seguirá existiendo en cuatro días. Descansa sin disculparte.',
    bodyEn: 'Your body is doing extraordinary work and asks only one thing: let it. The world will still exist in four days. Rest without apology.',
    banner: '[name] está convirtiéndose hoy',
    bannerEn: '[name] is becoming today',
  },
  follicular: {
    headline: 'Tu cuerpo acaba de recordar lo que le gusta.',
    headlineEn: 'Your body just remembered what it likes.',
    body: 'El estrógeno en subida vuelve el deseo específico. El comienzo del querer que empieza como un pensamiento y se convierte en una decisión. Sigue el hilo. A ver dónde lleva.',
    bodyEn: 'Rising estrogen makes desire specific. The beginning of wanting that starts as a thought and becomes a decision. Follow the thread. See where it leads.',
    banner: '[name] es imparable hoy',
    bannerEn: '[name] is unstoppable today',
  },
  ovulatory: {
    headline: 'Advertencia: peligro biológico en circulación.',
    headlineEn: '[name], biological hazard alert.',
    body: 'Estrógeno al 100%. Testosterona al 85%. La libido acaba de llegar sin avisar. Hoy vas a encontrar a las personas más atractivas de lo normal. Usa tus poderes con sabiduría. O no. BioCycle no juzga.',
    bodyEn: 'Estrogen at 100%. Testosterone at 85%. Libido just arrived uninvited and unashamed. You will find people unusually attractive today. You have approximately 48 hours of this. Use your powers wisely. Or not. BioCycle does not judge.',
    banner: '[name] es un peligro biológico hoy',
    bannerEn: '[name] is a biological hazard today',
  },
  luteal: {
    headline: 'La intimidad está disponible. Aplican requisitos previos.',
    headlineEn: 'Intimacy is available. Prerequisites apply.',
    body: 'El cortisol está por las nubes. La serotonina se fue de vacaciones. Pide exactamente lo que quieres. Estás demasiado hormonalmente honesta para tolerar nada menos.',
    bodyEn: 'Cortisol is elevated. Serotonin took a vacation without notice. Ask for exactly what you want. You are too hormonally honest to tolerate anything less.',
    banner: '[name] está en modo reina total hoy',
    bannerEn: '[name] is in full queen mode today',
  },
  weekly_peak: {
    headline: 'Es martes. Tu pareja lo notó antes que tú.',
    headlineEn: 'It is Tuesday. Your partner noticed before you did.',
    body: 'El pico semanal de testosterona te hace más magnético. Usa hoy para la negociación, el gimnasio, la conversación difícil. Y si la noche va bien ese también es el regalo del martes.',
    bodyEn: 'The weekly testosterone peak makes you physically more magnetic. Use today for negotiation, the gym, the difficult conversation. And if the evening goes well that is also Tuesday\'s gift.',
    banner: '[name] está magnético hoy',
    bannerEn: '[name] is magnetic today',
  },
  morning_peak: {
    headline: 'Buenos días. Eso es testosterona. Tienes opciones.',
    headlineEn: 'Good morning. That is testosterone. You have options.',
    body: 'El pico matutino es responsable de tu mejor rendimiento cognitivo y algo más que definitivamente ya notaste. Eres adulto. Decide qué ventana usar primero. Buenos días.',
    bodyEn: 'The morning peak drives your best cognitive performance and something else you have definitely already noticed. Both are the same hormone. Good morning.',
    banner: '[name] domina la mañana hoy',
    bannerEn: '[name] owns the morning today',
  },
  afternoon_dip: {
    headline: 'Su cortisol se cayó. Sus sueños no.',
    headlineEn: 'His cortisol dropped. His dreams did not.',
    body: 'El bajón post-almuerzo baja el rendimiento. Lo que no baja: la calidad creativa cuando el cerebro ejecutivo relaja su control. BioCycle recomienda la siesta. Lo que pasa después es asunto tuyo.',
    bodyEn: 'The post-lunch cortisol drop reduces performance. What does not drop: creative thought quality when the executive brain finally relaxes. BioCycle recommends the nap. What happens after is your business.',
    banner: '[name] es biológicamente correcto hoy',
    bannerEn: '[name] is biologically correct today',
  },
  evening_balanced: {
    headline: 'Equilibrio nocturno',
    headlineEn: 'Evening Balance',
    body: 'Energía recuperada. Buen momento para ejercicio o tiempo social.',
    bodyEn: 'Energy recovered. Good time for exercise or social time.',
    banner: '[name] en equilibrio',
    bannerEn: '[name] is balanced today',
  },
  night_rest: {
    headline: 'Lo notó. Solo está en su horario biológico.',
    headlineEn: 'He noticed. He is just on his biological schedule.',
    body: 'La testosterona nocturna es 30 a 40 por ciento menor que el pico matutino. El mismo estímulo produce algo más cálido y romántico de noche. No es menos deseo. Es deseo diferente.',
    bodyEn: 'Nighttime testosterone is 30 to 40 percent lower than morning. The same stimulus produces something warmer and more romantic at night. This is not less desire. It is different desire.',
    banner: '[name] el león descansa hoy',
    bannerEn: '[name] the lion rests today',
  },
  cortisol: {
    headline: 'El estrés y el deseo usan el mismo químico. Esto explica tanto.',
    headlineEn: 'Stress and desire use the same chemical. This explains so much.',
    body: 'El cortisol activa los mismos caminos neuronales que la atracción. Hoy puedes sentirte más atraído a personas de lo usual. Vale saber antes de tomar decisiones. 4 tiempos adentro. 8 afuera.',
    bodyEn: 'Cortisol activates the same neural pathways as attraction. Today you may feel more drawn to people than usual. Worth knowing before making decisions. 4 counts in. 8 out.',
    banner: '[name] cabalga la tormenta hoy',
    bannerEn: '[name] rides the storm today',
  },
};

const phaseLabels: Record<string, { es: string; en: string }> = {
  menstrual: { es: 'Menstrual', en: 'Menstrual' },
  follicular: { es: 'Folicular', en: 'Follicular' },
  ovulatory: { es: 'Ovulatoria', en: 'Ovulatory' },
  luteal: { es: 'Lutea', en: 'Luteal' },
  weekly_peak: { es: 'Pico Semanal', en: 'Weekly Peak' },
  morning_peak: { es: 'Pico Matutino', en: 'Morning Peak' },
  afternoon_dip: { es: 'Bajada', en: 'Afternoon Dip' },
  evening_balanced: { es: 'Equilibrio', en: 'Evening Balance' },
  night_rest: { es: 'Descanso', en: 'Night Rest' },
  cortisol: { es: 'Cortisol', en: 'Cortisol' },
};

const bannerEmojis: Record<string, string> = {
  menstrual: '\uD83C\uDF19',
  follicular: '\uD83C\uDFCD\uFE0F',
  ovulatory: '\uD83C\uDF39',
  luteal: '\uD83D\uDC51',
  weekly_peak: '\u2728',
  morning_peak: '\uD83D\uDC13',
  afternoon_dip: '\uD83D\uDE34',
  evening_balanced: '\u2728',
  night_rest: '\uD83E\uDD81',
  cortisol: '\uD83C\uDF2A\uFE0F',
};

function calculateAge(birthDate: string | null): number | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

function isAdult(profile: Profile): boolean {
  const age = calculateAge(profile.fecha_nacimiento);
  return age !== null && age >= 18;
}

const anxietyExplanations: Record<string, { es: string; en: string }> = {
  menstrual: {
    es: 'Durante la menstruacion, los niveles de estrogeno y progesterona estan en su punto mas bajo. Esto puede afectar la serotonina y aumentar la sensibilidad emocional.',
    en: 'During menstruation, estrogen and progesterone levels are at their lowest. This can affect serotonin and increase emotional sensitivity.',
  },
  follicular: {
    es: 'El estrogeno esta subiendo, lo que naturalmente eleva el animo y reduce la ansiedad. Tu cerebro esta biologicamente optimizado para la confianza.',
    en: 'Estrogen is rising, which naturally elevates mood and reduces anxiety. Your brain is biologically optimized for confidence.',
  },
  ovulatory: {
    es: 'Los niveles hormonales estan en su maximo equilibrio. La ansiedad suele estar en su punto mas bajo durante la ovulacion.',
    en: 'Hormone levels are at their most balanced. Anxiety is typically at its lowest during ovulation.',
  },
  luteal: {
    es: 'La progesterona alta combinada con la caida de estrogeno crea una ventana de vulnerabilidad. El GABA puede estar menos disponible, aumentando la reactividad al estres.',
    en: 'High progesterone combined with dropping estrogen creates a vulnerability window. GABA may be less available, increasing stress reactivity.',
  },
  weekly_peak: {
    es: 'La testosterona esta en su pico semanal, lo que proporciona confianza natural y reduce la ansiedad.',
    en: 'Testosterone is at its weekly peak, providing natural confidence and reduced anxiety.',
  },
  morning_peak: {
    es: 'La testosterona matutina proporciona claridad mental pero el cortisol tambien esta elevado como parte del ritmo de despertar.',
    en: 'Morning testosterone provides mental clarity but cortisol is also elevated as part of the waking rhythm.',
  },
  afternoon_dip: {
    es: 'La caida de cortisol post-almuerzo reduce el rendimiento ejecutivo. La mente puede rumiar mas cuando el prefrontal esta menos activo.',
    en: 'Post-lunch cortisol drop reduces executive performance. The mind may ruminate more when the prefrontal cortex is less active.',
  },
  evening_balanced: {
    es: 'Las hormonas se equilibran hacia el final del dia. Un buen momento para la reflexion tranquila.',
    en: 'Hormones balance out toward the end of the day. A good time for calm reflection.',
  },
  night_rest: {
    es: 'La testosterona es mas baja por la noche, lo que puede aumentar levemente la sensibilidad emocional.',
    en: 'Testosterone is lower at night, which may slightly increase emotional sensitivity.',
  },
};

const PHASE_TAB_LABEL: Record<string, string> = {
  morning_peak:     'Morning Peak ⚡',
  tuesday_peak:     'Weekly Peak 💪',
  afternoon_dip:    'Afternoon Dip 🔋',
  evening_balanced: 'Evening Balance 🌅',
  night_rest:       'Night Rest 🌙',
  ovulatory:        'Ovulatory Peak 🌹',
  follicular:       'Follicular Phase 💡',
  luteal:           'Luteal Phase 🌊',
  late_luteal:      'Late Luteal 🌧️',
  menstrual:        'Menstrual Phase 🔄',
  perimenopause:    'Hormonal Transition 🦋',
  andropause:       'Recalibration Phase 🎯',
  cortisol_high:    'High Cortisol ⚠️',
  anxiety_high:     'Anxiety Window 🧠',
  recovery:         'Recovery 💚',
};

export function HomeScreen({ profile, phaseData, onProfileUpdate }: HomeScreenProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [showAnxietyModal, setShowAnxietyModal] = useState(false);
  const [language, setLanguage] = useState<'ES' | 'EN'>(profile.idioma === 'EN' ? 'EN' : 'ES');
  const [picardiaMode, setPicardiaMode] = useState(profile.picardia_mode || false);
  const [saving, setSaving] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [copyToast, setCopyToast] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Normalize to exactly 3 slots regardless of what is stored in the DB
  const normalizeCheckinTimes = (times: CheckinTime[]): CheckinTime[] => {
    const morning   = times.find(t => t.label === 'morning')   ?? { label: 'morning',   time: '07:30', enabled: true };
    const afternoon = times.find(t => t.label === 'afternoon') ?? { label: 'afternoon', time: '14:00', enabled: true };
    const night     = times.find(t => t.label === 'night')     ?? { label: 'night',     time: '21:30', enabled: true };
    return [morning, afternoon, night];
  };

  // Schedule editor state
  const [checkinTimes, setCheckinTimes] = useState<CheckinTime[]>(
    normalizeCheckinTimes(
      profile.checkin_times && profile.checkin_times.length > 0
        ? profile.checkin_times
        : DEFAULT_CHECKIN_TIMES
    )
  );
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [scheduleSaved, setScheduleSaved] = useState(false);

  // Delete account state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteComplete, setDeleteComplete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Export state
  const [exportingData, setExportingData] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  // Card library state
  const [recentCardIds, setRecentCardIds] = useState<string[]>([]);

  // Trading streak
  const [tradingStreak, setTradingStreak] = useState(0);

  useEffect(() => {
    (async () => {
      const { data: sessions } = await supabase
        .from('conversation_sessions')
        .select('session_date')
        .eq('user_id', profile.id)
        .eq('session_complete', true)
        .order('session_date', { ascending: false });

      let streak = 0;
      if (sessions && sessions.length > 0) {
        const uniqueDays = [...new Set(sessions.map((s: { session_date: string }) => s.session_date))];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let cursor = new Date(today);
        for (const day of uniqueDays) {
          const d = new Date(day as string);
          d.setHours(0, 0, 0, 0);
          const diff = Math.round((cursor.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
          if (diff === 0 || diff === 1) { streak++; cursor = d; } else break;
        }
      }
      setTradingStreak(streak);
    })();
  }, [profile.id]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('whatsapp_sends')
        .select('card_id')
        .eq('user_id', profile.id)
        .not('card_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(5);
      if (data) {
        const ids = data.map((r: { card_id: string }) => r.card_id).filter(Boolean);
        setRecentCardIds(ids);
      }
    })();
  }, [profile.id]);

  // WhatsApp state
  const [whatsappEnabled, setWhatsappEnabled] = useState(profile.whatsapp_enabled ?? false);
  const [whatsappPhone, setWhatsappPhone] = useState(profile.whatsapp_phone ?? '');
  const [editingPhone, setEditingPhone] = useState(false);
  const [phoneInput, setPhoneInput] = useState(profile.whatsapp_phone ?? '');
  const [settingsCountryCode, setSettingsCountryCode] = useState('+1809');
  const [settingsPhoneNumber, setSettingsPhoneNumber] = useState('');
  const [savingWhatsapp, setSavingWhatsapp] = useState(false);

  const isEnglish = language === 'EN';
  const showSexual = isAdult(profile);
  const canUsePicardia = showSexual;

  // ── Single source of truth for today's stats ─────────────────────
  const todayStats = getTodayStats(profile);

  const anxietyScore = todayStats.anxiety;
  const anxietyLevel = anxietyScore >= 70 ? 'high' : anxietyScore >= 40 ? 'elevated' : 'low';

  const phaseLabel = phaseLabels[todayStats.phase] || phaseLabels.follicular;
  const emoji = bannerEmojis[todayStats.phase] || '';

  const userName = profile.nombre || 'User';
  const replaceNamePlaceholder = (text: string) => text.replace(/\[name\]/gi, userName);

  const content = phaseContent[todayStats.phase] || phaseContent.follicular;
  const fallbackHeadline = replaceNamePlaceholder(isEnglish ? content.headlineEn : content.headline);
  const fallbackBody = isEnglish ? content.bodyEn : content.body;
  const fallbackBanner = replaceNamePlaceholder(isEnglish ? content.bannerEn : content.banner) + ' ' + emoji;

  let selectedCard = null;
  try {
    const currentHour = new Date().getHours();
    const timeSlot: 'morning' | 'midday' | 'evening' | 'night' =
      currentHour >= 5  && currentHour <= 11 ? 'morning' :
      currentHour >= 12 && currentHour <= 14 ? 'midday'  :
      currentHour >= 15 && currentHour <= 20 ? 'evening' : 'night';
    selectedCard = getCardForUser(profile, todayStats.phase, timeSlot, recentCardIds);
  } catch { /* fall through to defaults */ }

  const imageUrl = selectedCard?.image ?? 'https://hguqyuupwfpszsmdjrzz.supabase.co/storage/v1/object/public/library/706.png';
  const headline = (profile?.idioma === 'ES' ? selectedCard?.headline_ES : selectedCard?.headline_EN) ?? fallbackHeadline;
  const body = (profile?.idioma === 'ES' ? selectedCard?.copy_ES : selectedCard?.copy_EN) ?? fallbackBody;
  const banner = (profile?.idioma === 'ES' ? selectedCard?.banner_ES : selectedCard?.banner_EN) ?? fallbackBanner;

  const baseMetrics = [
    { label: isEnglish ? 'Energy' : 'Energia', value: todayStats.energy, color: '#F5C842' },
    { label: isEnglish ? 'Cognitive' : 'Cognitivo', value: todayStats.cognitive, color: '#00D4A1' },
    { label: isEnglish ? 'Emotional' : 'Emocional', value: todayStats.emotional, color: '#FF6B6B' },
    { label: isEnglish ? 'Physical' : 'Fisico', value: todayStats.physical, color: '#7B61FF' },
  ];

  const metrics = showSexual
    ? [...baseMetrics, { label: 'Sexual', value: todayStats.sexual, color: '#FF6B6B' }]
    : baseMetrics;

  const handleLanguageChange = async (newLang: 'ES' | 'EN') => {
    setLanguage(newLang);
    setSaving(true);
    await supabase
      .from('profiles')
      .update({ idioma: newLang })
      .eq('id', profile.id);
    setSaving(false);
    onProfileUpdate();
  };

  const handlePicardiaChange = async (enabled: boolean) => {
    if (!canUsePicardia) return;
    setPicardiaMode(enabled);
    setSaving(true);
    await supabase
      .from('profiles')
      .update({ picardia_mode: enabled })
      .eq('id', profile.id);
    setSaving(false);
    onProfileUpdate();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleWhatsappToggle = async (enabled: boolean) => {
    setWhatsappEnabled(enabled);
    setSavingWhatsapp(true);
    await supabase.from('profiles').update({ whatsapp_enabled: enabled }).eq('id', profile.id);
    setSavingWhatsapp(false);
    onProfileUpdate();
  };

  const handlePhoneSave = async () => {
    setSavingWhatsapp(true);
    const cleaned = phoneInput.trim();
    setWhatsappPhone(cleaned);
    await supabase.from('profiles').update({ whatsapp_phone: cleaned || null }).eq('id', profile.id);
    setSavingWhatsapp(false);
    setEditingPhone(false);
    onProfileUpdate();
  };


  const handleScheduleSave = async () => {
    setSavingSchedule(true);
    await supabase
      .from('profiles')
      .update({ checkin_times: checkinTimes })
      .eq('id', profile.id);
    scheduleNotifications(checkinTimes);
    setSavingSchedule(false);
    setScheduleSaved(true);
    setTimeout(() => setScheduleSaved(false), 2000);
  };

  const updateCheckinTime = (index: number, time: string) => {
    setCheckinTimes(prev => prev.map((t, i) => i === index ? { ...t, time } : t));
  };

  const toggleCheckinSlot = (index: number) => {
    setCheckinTimes(prev => prev.map((t, i) => i === index ? { ...t, enabled: !t.enabled } : t));
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    setDeleteError(null);
    const userId = profile.id;
    try {
      console.log('[Delete] Step 1: Deleting checkins...');
      const { error: e1 } = await supabase.from('checkins').delete().eq('user_id', userId);
      if (e1) throw new Error(`checkins: ${e1.message}`);

      console.log('[Delete] Step 2: Deleting weekly_checkins...');
      const { error: e2 } = await supabase.from('weekly_checkins').delete().eq('user_id', userId);
      if (e2) throw new Error(`weekly_checkins: ${e2.message}`);

      console.log('[Delete] Step 3: Deleting nutrition_logs...');
      const { error: e3 } = await supabase.from('nutrition_logs').delete().eq('user_id', userId);
      if (e3) throw new Error(`nutrition_logs: ${e3.message}`);

      console.log('[Delete] Step 4: Deleting profile...');
      const { error: e4 } = await supabase.from('profiles').delete().eq('id', userId);
      if (e4) throw new Error(`profiles: ${e4.message}`);

      console.log('[Delete] Step 5: Signing out...');
      setDeleteComplete(true);
      setTimeout(async () => {
        await supabase.auth.signOut();
      }, 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error('[Delete] Error:', msg);
      setDeleteError(isEnglish ? `Error: ${msg}. Please try again.` : `Error: ${msg}. Intenta de nuevo.`);
      setDeleting(false);
    }
  };

  const handleExportData = async () => {
    setExportingData(true);
    try {
      const { data: checkins, error } = await supabase
        .from('checkins')
        .select('*')
        .eq('user_id', profile.id)
        .order('checkin_date', { ascending: false });
      if (error) throw error;

      const headers = ['date', 'phase', 'emotional', 'physical', 'cognitive', 'stress', 'social', 'sexual', 'anxiety', 'quality_score', 'notes'];
      const rows = (checkins ?? []).map((c: Record<string, unknown>) => [
        c.checkin_date ?? '',
        c.phase_at_checkin ?? '',
        c.factor_emocional ?? '',
        c.factor_fisico ?? '',
        c.factor_cognitivo ?? '',
        c.factor_estres ?? '',
        c.factor_social ?? '',
        c.factor_sexual ?? '',
        c.factor_ansiedad ?? '',
        c.calidad_score ?? '',
        `"${String(c.notas ?? '').replace(/"/g, '""')}"`,
      ]);
      const csv = [headers.join(','), ...rows.map((r: unknown[]) => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `biocycle_data_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (err) {
      console.error('[Export] Error:', err);
    } finally {
      setExportingData(false);
    }
  };

  const handleShare = async () => {
    if (!cardRef.current) return;
    setSharing(true);

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas not supported');

      const cardWidth = 380;
      const cardHeight = 480;
      canvas.width = cardWidth;
      canvas.height = cardHeight;

      const img = new Image();
      img.crossOrigin = 'anonymous';

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = imageUrl;
      });

      // 1. Card image fills entire canvas
      ctx.drawImage(img, 0, 0, cardWidth, cardHeight);

      // 2. Dark gradient over bottom 35%
      const gradientTop = cardHeight * 0.65;
      const gradient = ctx.createLinearGradient(0, gradientTop, 0, cardHeight);
      gradient.addColorStop(0, 'rgba(10,10,26,0)');
      gradient.addColorStop(1, 'rgba(10,10,26,0.92)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, gradientTop, cardWidth, cardHeight - gradientTop);

      // 3. Headline only — word-wrapped, Clash Display bold, bottom of canvas
      try {
        const clashFont = new FontFace('Clash Display', 'url(https://api.fontshare.com/v2/css?f[]=clash-display@700&display=swap)');
        await clashFont.load();
        document.fonts.add(clashFont);
      } catch { /* fall back to system-ui if font fails to load */ }
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 32px "Clash Display", system-ui, sans-serif';
      ctx.textAlign = 'left';
      const maxWidth = cardWidth - 40;
      const lineHeight = 38;
      const words = headline.split(' ');
      const lines: string[] = [];
      let current = '';
      for (const word of words) {
        const test = current ? current + ' ' + word : word;
        if (ctx.measureText(test).width > maxWidth && current) {
          lines.push(current);
          current = word;
        } else {
          current = test;
        }
      }
      if (current) lines.push(current);
      const textBlockHeight = lines.length * lineHeight;
      let textY = cardHeight - 24 - textBlockHeight + lineHeight;
      for (const line of lines) {
        ctx.fillText(line, 20, textY);
        textY += lineHeight;
      }

      canvas.toBlob(async (blob) => {
        if (!blob) {
          setSharing(false);
          return;
        }

        const file = new File([blob], 'biocycle-card.png', { type: 'image/png' });

        const shareText = isEnglish
          ? 'Know yourself before it happens. 👉 https://biocycle.app'
          : 'Conócete antes de que suceda. 👉 https://biocycle.app';

        if (navigator.share && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: 'BioCycle',
              text: shareText,
            });
          } catch (err) {
            if ((err as Error).name !== 'AbortError') {
              await copyToClipboard(blob, shareText);
            }
          }
        } else {
          await copyToClipboard(blob, shareText);
        }

        setSharing(false);
      }, 'image/png');
    } catch (err) {
      console.error('Share error:', err);
      setSharing(false);
    }
  };

  const showCopyToast = () => {
    setCopyToast(true);
    setTimeout(() => setCopyToast(false), 2000);
  };

  const copyToClipboard = async (blob: Blob, shareText?: string) => {
    try {
      await navigator.clipboard.writeText(
        shareText ?? (isEnglish
          ? `Know yourself before it happens. 👉 https://biocycle.app`
          : `Conócete antes de que suceda. 👉 https://biocycle.app`)
      );
      showCopyToast();
    } catch {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'biocycle-card.png';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A1A] pb-24">
      {/* Copy toast */}
      {copyToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] px-5 py-2.5 bg-[#00D4A1] text-[#0A0A1A] text-sm font-semibold rounded-full shadow-lg pointer-events-none">
          {isEnglish ? 'Link copied!' : '¡Enlace copiado!'}
        </div>
      )}
      <div className="px-5 pt-12 pb-4 flex items-center justify-between">
        <div>
          <p className="text-[#8B95B0] text-sm">
            {isEnglish ? 'Hello' : 'Hola'}, {profile.nombre || 'Usuario'}
          </p>
          <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'Clash Display, system-ui, sans-serif' }}>
            {isEnglish ? 'Your day' : 'Tu dia'}
          </h1>
        </div>
        <button
          onClick={() => setShowSettings(true)}
          className="w-10 h-10 bg-[#111126] border border-[#1E1E3A] rounded-full flex items-center justify-center"
        >
          <Settings className="w-5 h-5 text-[#8B95B0]" />
        </button>
      </div>

      {/* Trading Streak */}
      <div className="px-5 mb-4">
        {tradingStreak > 0 ? (
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔥</span>
            <span className="text-3xl font-bold text-[#FFD93D]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{tradingStreak}</span>
            <span className="text-sm text-[#8B95B0]">{isEnglish ? 'Trading days' : 'días de Trading'}</span>
          </div>
        ) : (
          <p className="text-sm font-medium text-[#FF6B6B]">
            {isEnglish ? '🔥 Start your streak today' : '🔥 Empieza tu racha hoy'}
          </p>
        )}
      </div>

      <div className="px-5">
        <div ref={cardRef} className="rounded-3xl overflow-hidden shadow-xl">

          {/* 1. IMAGE with headline overlaid at bottom */}
          <div className="relative" style={{ aspectRatio: '4/5' }}>
            <img
              src={imageUrl}
              alt={phaseLabel.es}
              className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Bottom gradient — transparent top to dark bottom */}
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(to bottom, transparent 55%, rgba(10,10,26,0.92) 100%)' }}
            />

            {/* Share button — top-right */}
            <button
              onClick={handleShare}
              disabled={sharing}
              className="absolute top-4 right-4 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              {sharing ? (
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              ) : (
                <Share2 className="w-5 h-5 text-white" />
              )}
            </button>

            {/* Anxiety badge — below phase badge */}
            <button
              onClick={() => setShowAnxietyModal(true)}
              className={`absolute top-16 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-sm ${
                anxietyLevel === 'high'
                  ? 'bg-[#FF4444]/90 text-white'
                  : anxietyLevel === 'elevated'
                  ? 'bg-[#FFB347]/90 text-white'
                  : 'bg-emerald-500/90 text-white'
              }`}
            >
              <span className="text-xs font-medium">
                {anxietyLevel === 'high'
                  ? isEnglish ? 'Vulnerability Window' : 'Ventana de Vulnerabilidad'
                  : anxietyLevel === 'elevated'
                  ? isEnglish ? 'Sensitivity: Elevated' : 'Sensibilidad: Elevada'
                  : isEnglish ? 'Anxiety: Low' : 'Ansiedad: Baja'}
              </span>
            </button>

            {/* Headline overlaid at bottom of image over gradient */}
            <div className="absolute bottom-0 left-0 right-0 px-5 pb-5">
              <h2 className="text-2xl font-bold text-white leading-snug">
                {headline}
              </h2>
            </div>
          </div>

          {/* 2. PHASE TAB — single clean label below image */}
          <div className="bg-[#1A1A2E] py-3 flex items-center justify-center">
            <span className="text-white text-sm font-medium">
              {PHASE_TAB_LABEL[todayStats.phase] ?? `${isEnglish ? phaseLabel.en : phaseLabel.es} ${emoji}`}
            </span>
          </div>

          {/* 3. COPY TEXT below phase tab */}
          <div className="bg-[#0F0F20] px-5 pt-4 pb-5">
            <p className="text-slate-400 text-sm leading-relaxed">
              {body}
            </p>
            {banner && (
              <p className="text-[#FFD93D] font-semibold italic text-sm mt-4">
                {banner}
              </p>
            )}
          </div>

        </div>
      </div>

      {/* Research study notification — hardcoded false until a study is live */}
      {(() => {
        const isStudyAvailable = false;
        if (!isStudyAvailable) return null;
        return (
          <div className="px-5 mt-4">
            <div className="bg-[#111126] border border-[#F5C842]/30 rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#F5C842' + '22', border: '1px solid #F5C84244' }}>
                  <span className="text-lg">🔬</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm mb-0.5" style={{ color: '#F5C842' }}>
                    {isEnglish ? 'Research Opportunity Available' : 'Oportunidad de Investigación Disponible'}
                  </p>
                  <p className="text-[#8B95B0] text-xs leading-relaxed">
                    {isEnglish
                      ? 'A study matching your profile is open. Review the details on the Trading Floor.'
                      : 'Hay un estudio que coincide con tu perfil. Revisa los detalles en el Trading Floor.'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => window.location.href = '/trading-floor'}
                className="mt-4 w-full py-2.5 bg-[#F5C842] text-[#0A0A1A] text-sm font-bold rounded-xl hover:opacity-90 transition-opacity"
              >
                {isEnglish ? 'View Study' : 'Ver Estudio'}
              </button>
            </div>
          </div>
        );
      })()}

      <div className="px-5 mt-6">
        <h3 className="text-base font-semibold text-[#8B95B0] mb-3 tracking-wide uppercase" style={{ fontSize: '0.7rem', letterSpacing: '0.1em' }}>
          {isEnglish ? 'Your levels today' : 'Tus niveles hoy'}
        </h3>
        <div className="bg-[#111126] border border-[#1E1E3A] rounded-2xl p-5 space-y-4">
          {metrics.map(({ label, value, color }) => (
            <div key={label}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-[#8B95B0]">{label}</span>
                <span className="text-sm font-bold font-mono text-white" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{value}%</span>
              </div>
              <div className="h-1 bg-[#1E1E3A] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${value}%`, backgroundColor: color }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {showSettings && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end justify-center">
          <div className="relative bg-[#0F0F1F] border border-[#1E1E3A] rounded-t-3xl w-full max-w-[430px] flex flex-col animate-slide-up" style={{ maxHeight: '80vh' }}>
            <div className="flex items-center justify-between p-6 pb-4 flex-shrink-0">
              <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Clash Display, system-ui, sans-serif' }}>
                {isEnglish ? 'Settings' : 'Configuracion'}
              </h2>
              <button
                onClick={() => setShowSettings(false)}
                className="w-10 h-10 bg-[#1E1E3A] rounded-full flex items-center justify-center"
              >
                <X className="w-5 h-5 text-[#8B95B0]" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 min-h-0 px-6 pb-24 space-y-4">
              <div className="flex items-center justify-between p-4 bg-[#111126] border border-[#1E1E3A] rounded-xl">
                <div>
                  <p className="font-semibold text-white">
                    {isEnglish ? 'Language' : 'Idioma'}
                  </p>
                  <p className="text-sm text-[#8B95B0]">
                    {isEnglish ? 'Change app language' : 'Cambiar idioma de la app'}
                  </p>
                </div>
                <div className="flex bg-[#1E1E3A] rounded-lg p-1">
                  <button
                    onClick={() => handleLanguageChange('ES')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      language === 'ES'
                        ? 'bg-[#7B61FF] text-white'
                        : 'text-[#8B95B0]'
                    }`}
                  >
                    ES
                  </button>
                  <button
                    onClick={() => handleLanguageChange('EN')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      language === 'EN'
                        ? 'bg-[#7B61FF] text-white'
                        : 'text-[#8B95B0]'
                    }`}
                  >
                    EN
                  </button>
                </div>
              </div>

              <div className={`flex items-center justify-between p-4 bg-[#111126] border border-[#1E1E3A] rounded-xl ${!canUsePicardia ? 'opacity-50' : ''}`}>
                <div>
                  <p className="font-semibold text-white">
                    {isEnglish ? 'Picardia Mode' : 'Modo Picardia'}
                  </p>
                  <p className="text-sm text-[#8B95B0]">
                    {!canUsePicardia
                      ? isEnglish
                        ? 'Available for 18+ only'
                        : 'Solo para mayores de 18'
                      : isEnglish
                      ? 'Spicier content and advice'
                      : 'Contenido y consejos mas picantes'}
                  </p>
                </div>
                <button
                  onClick={() => handlePicardiaChange(!picardiaMode)}
                  disabled={!canUsePicardia}
                  className={`w-14 h-8 rounded-full transition-colors relative ${
                    picardiaMode && canUsePicardia ? 'bg-[#00C896]' : 'bg-[#1E1E3A]'
                  }`}
                >
                  <div
                    className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                      picardiaMode && canUsePicardia ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* WhatsApp Cards */}
              <div className="p-4 bg-[#111126] border border-[#1E1E3A] rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-[#00D4A1]" />
                    <p className="font-semibold text-white">
                      {isEnglish ? 'WhatsApp Cards' : 'Cartas por WhatsApp'}
                    </p>
                  </div>
                  <button
                    onClick={() => handleWhatsappToggle(!whatsappEnabled)}
                    disabled={savingWhatsapp}
                    className={`w-14 h-8 rounded-full transition-colors relative disabled:opacity-50 ${
                      whatsappEnabled ? 'bg-[#00D4A1]' : 'bg-[#1E1E3A]'
                    }`}
                  >
                    <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                      whatsappEnabled ? 'translate-x-7' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
                <p className="text-sm text-[#8B95B0]">
                  {isEnglish ? 'Receive your daily BioCycle card on WhatsApp' : 'Recibe tu carta diaria de BioCycle por WhatsApp'}
                </p>

                {/* Phone number display / edit */}
                {!editingPhone ? (
                  <div className="flex items-center justify-between bg-[#0A0A1A] rounded-lg px-3 py-2">
                    <span className="text-sm font-mono text-white">
                      {whatsappPhone || (isEnglish ? 'No number set' : 'Sin número')}
                    </span>
                    <button
                      onClick={() => { setPhoneInput(whatsappPhone); setEditingPhone(true); }}
                      className="text-xs text-[#7B61FF] hover:text-white transition-colors"
                    >
                      {isEnglish ? 'Edit' : 'Editar'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <select
                        value={settingsCountryCode}
                        onChange={e => {
                          setSettingsCountryCode(e.target.value);
                          setPhoneInput(`${e.target.value}${settingsPhoneNumber.replace(/\D/g, '')}`);
                        }}
                        className="px-2 py-2 bg-[#1A1A2E] text-white border border-white/20 focus:border-[#00D4A1] focus:outline-none rounded-lg text-xs"
                      >
                        <option value="+1809">Dominican Republic +1 809</option>
                        <option value="+1829">Dominican Republic +1 829</option>
                        <option value="+1849">Dominican Republic +1 849</option>
                        <option value="+1">USA / Canada +1</option>
                        <option value="+52">Mexico +52</option>
                        <option value="+57">Colombia +57</option>
                        <option value="+54">Argentina +54</option>
                        <option value="+56">Chile +56</option>
                        <option value="+51">Peru +51</option>
                        <option value="+58">Venezuela +58</option>
                        <option value="+593">Ecuador +593</option>
                        <option value="+502">Guatemala +502</option>
                        <option value="+53">Cuba +53</option>
                        <option value="+591">Bolivia +591</option>
                        <option value="+504">Honduras +504</option>
                        <option value="+595">Paraguay +595</option>
                        <option value="+503">El Salvador +503</option>
                        <option value="+505">Nicaragua +505</option>
                        <option value="+506">Costa Rica +506</option>
                        <option value="+507">Panama +507</option>
                        <option value="+598">Uruguay +598</option>
                        <option value="+1787">Puerto Rico +1787</option>
                        <option value="+34">Spain +34</option>
                        <option value="+55">Brazil +55</option>
                        <option value="+44">UK +44</option>
                        <option value="+33">France +33</option>
                        <option value="+49">Germany +49</option>
                        <option value="+39">Italy +39</option>
                        <option value="+61">Australia +61</option>
                        <option value="+91">India +91</option>
                        <option value="+81">Japan +81</option>
                        <option value="+86">China +86</option>
                        <option value="+27">South Africa +27</option>
                      </select>
                      <input
                        type="tel"
                        value={settingsPhoneNumber}
                        onChange={e => {
                          setSettingsPhoneNumber(e.target.value);
                          setPhoneInput(`${settingsCountryCode}${e.target.value.replace(/\D/g, '')}`);
                        }}
                        className="flex-1 px-3 py-2 bg-[#1A1A2E] text-white border border-white/20 focus:border-[#00D4A1] focus:outline-none placeholder-[#8892A4] rounded-lg text-sm font-mono"
                        placeholder="8095551234"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingPhone(false)}
                        className="flex-1 py-1.5 text-sm border border-[#1E1E3A] text-[#8B95B0] rounded-lg hover:text-white transition-colors"
                      >
                        {isEnglish ? 'Cancel' : 'Cancelar'}
                      </button>
                      <button
                        onClick={handlePhoneSave}
                        disabled={savingWhatsapp}
                        className="flex-1 py-1.5 text-sm bg-[#00D4A1] text-[#0A0A1A] font-semibold rounded-lg disabled:opacity-50 flex items-center justify-center gap-1"
                      >
                        {savingWhatsapp ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                        {isEnglish ? 'Save' : 'Guardar'}
                      </button>
                    </div>
                  </div>
                )}

              </div>

              {/* Check-in schedule editor */}
              <div className="p-4 bg-[#111126] border border-[#1E1E3A] rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                  <Bell className="w-4 h-4 text-[#F5C842]" />
                  <p className="font-semibold text-white">
                    {isEnglish ? 'Deposit Schedule' : 'Horario de Depósitos'}
                  </p>
                </div>
                <div className="space-y-2">
                  {checkinTimes.map((slot, index) => {
                    const labelMap: Record<string, { en: string; es: string }> = {
                      morning:   { en: 'Morning',    es: 'Mañana'        },
                      afternoon: { en: 'Afternoon',  es: 'Tarde'          },
                      night:     { en: 'Night Wrap', es: 'Cierre del día' },
                    };
                    const label = isEnglish ? (labelMap[slot.label]?.en ?? slot.label) : (labelMap[slot.label]?.es ?? slot.label);
                    return (
                      <div key={slot.label} className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${slot.enabled ? 'border-[#7B61FF]/30 bg-[#1E1E3A]' : 'border-[#1E1E3A] bg-[#0A0A1A] opacity-60'}`}>
                        <button
                          onClick={() => toggleCheckinSlot(index)}
                          className={`w-9 h-5 rounded-full flex-shrink-0 relative transition-colors ${slot.enabled ? 'bg-[#7B61FF]' : 'bg-[#2A2A45]'}`}
                        >
                          <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${slot.enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                        </button>
                        <span className="flex-1 text-sm font-medium text-white">{label}</span>
                        <input
                          type="time"
                          value={slot.time}
                          onChange={e => updateCheckinTime(index, e.target.value)}
                          disabled={!slot.enabled}
                          className="text-sm px-2 py-1 border border-[#1E1E3A] rounded-lg bg-[#0A0A1A] text-white focus:outline-none focus:ring-1 focus:ring-[#7B61FF] disabled:opacity-40"
                        />
                      </div>
                    );
                  })}
                  {/* 4th slot — Premium locked */}
                  <div className="flex items-center gap-2 p-2 rounded-lg border border-[#1E1E3A] bg-[#0A0A1A] opacity-50 cursor-not-allowed">
                    <div className="w-9 h-5 rounded-full bg-[#2A2A45] flex-shrink-0 relative">
                      <span className="absolute top-0.5 left-0.5 w-4 h-4 bg-white/30 rounded-full shadow" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-medium text-white">
                          {isEnglish ? 'Extra Session' : 'Sesión Extra'}
                        </span>
                        <Lock className="w-3 h-3 text-[#4A5568]" />
                      </div>
                      <p className="text-xs text-[#4A5568]">
                        {isEnglish ? 'Premium feature' : 'Función Premium'}
                      </p>
                    </div>
                    <div className="text-sm px-2 py-1 border border-[#1E1E3A] rounded-lg bg-[#0A0A1A] text-[#4A5568] opacity-40">
                      --:--
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleScheduleSave}
                  disabled={savingSchedule}
                  className="mt-3 w-full flex items-center justify-center gap-2 py-2 bg-[#7B61FF] text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition-colors"
                >
                  {savingSchedule ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {scheduleSaved ? (isEnglish ? 'Saved!' : '¡Guardado!') : (isEnglish ? 'Save schedule' : 'Guardar horario')}
                </button>
              </div>

              {/* Legal links */}
              <div className="grid grid-cols-2 gap-2">
                <a href="/privacy" className="flex items-center justify-center p-3 bg-[#111126] border border-[#1E1E3A] rounded-xl text-sm text-[#8B95B0] hover:text-white transition-colors">
                  {isEnglish ? 'Privacy Policy' : 'Privacidad'}
                </a>
                <a href="/terms" className="flex items-center justify-center p-3 bg-[#111126] border border-[#1E1E3A] rounded-xl text-sm text-[#8B95B0] hover:text-white transition-colors">
                  {isEnglish ? 'Terms' : 'Términos'}
                </a>
              </div>

              {/* Export My Data */}
              <button
                onClick={handleExportData}
                disabled={exportingData}
                className="w-full flex items-center justify-center gap-2 p-4 bg-[#111126] border border-[#1E1E3A] text-[#8B95B0] rounded-xl font-semibold hover:text-white transition-colors disabled:opacity-50"
              >
                {exportingData ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                {exportSuccess
                  ? (isEnglish ? 'Your data has been exported.' : 'Tus datos han sido exportados.')
                  : (isEnglish ? 'Export My Data' : 'Exportar mis datos')}
              </button>

              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 p-4 bg-red-950/50 border border-red-900/30 text-red-400 rounded-xl font-semibold hover:bg-red-950 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                {isEnglish ? 'Log out' : 'Cerrar sesion'}
              </button>

              {/* Delete account */}
              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full flex items-center justify-center gap-2 p-3 text-red-500/60 text-sm hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  {isEnglish ? 'Delete my account' : 'Eliminar mi cuenta'}
                </button>
              ) : (
                <div className="p-4 bg-red-950/50 border border-red-900/50 rounded-xl space-y-3">
                  <p className="text-sm font-semibold text-red-300 text-center">
                    {isEnglish
                      ? '⚠️ This will permanently delete all your data including your biological portfolio. This cannot be undone. Are you sure?'
                      : '⚠️ Esto eliminará permanentemente todos tus datos, incluyendo tu portafolio biológico. Esta acción no se puede deshacer. ¿Estás seguro?'}
                  </p>
                  {deleteError && (
                    <p className="text-xs text-red-400 text-center">{deleteError}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setShowDeleteConfirm(false); setDeleteError(null); }}
                      className="flex-1 py-2 border border-[#1E1E3A] rounded-lg text-sm text-[#8B95B0] hover:text-white transition-colors"
                    >
                      {isEnglish ? 'Cancel' : 'Cancelar'}
                    </button>
                    <button
                      onClick={handleDeleteAccount}
                      disabled={deleting}
                      className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      {isEnglish ? 'Delete everything' : 'Eliminar todo'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {saving && (
              <div className="absolute inset-0 bg-[#0A0A1A]/80 flex items-center justify-center rounded-t-3xl">
                <Loader2 className="w-6 h-6 animate-spin text-[#7B61FF]" />
              </div>
            )}

            {deleteComplete && (
              <div className="absolute inset-0 bg-[#2D1B69] flex flex-col items-center justify-center rounded-t-3xl p-8 text-center">
                <span className="text-4xl mb-4">🌱</span>
                <p className="text-white font-bold text-lg mb-2">
                  {isEnglish ? 'Your account and all data have been permanently deleted.' : 'Tu cuenta y todos tus datos han sido eliminados permanentemente.'}
                </p>
                <p className="text-white/70 text-sm">
                  {isEnglish ? 'Thank you for being a Data Trader.' : 'Gracias por ser un Data Trader.'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {showAnxietyModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  anxietyLevel === 'high' ? 'bg-red-100' : anxietyLevel === 'elevated' ? 'bg-amber-100' : 'bg-emerald-100'
                }`}>
                  <AlertTriangle className={`w-5 h-5 ${
                    anxietyLevel === 'high' ? 'text-red-600' : anxietyLevel === 'elevated' ? 'text-amber-600' : 'text-emerald-600'
                  }`} />
                </div>
                <h2 className="text-lg font-bold text-gray-900">
                  {isEnglish ? 'Anxiety Level' : 'Nivel de Ansiedad'}
                </h2>
              </div>
              <button
                onClick={() => setShowAnxietyModal(false)}
                className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            <div className={`rounded-xl p-4 mb-4 ${
              anxietyLevel === 'high' ? 'bg-red-50' : anxietyLevel === 'elevated' ? 'bg-amber-50' : 'bg-emerald-50'
            }`}>
              <p className={`text-sm font-medium ${
                anxietyLevel === 'high' ? 'text-red-800' : anxietyLevel === 'elevated' ? 'text-amber-800' : 'text-emerald-800'
              }`}>
                {isEnglish ? 'Current Level' : 'Nivel Actual'}: {anxietyScore}%
              </p>
            </div>

            <p className="text-gray-600 text-sm leading-relaxed mb-4">
              {anxietyExplanations[todayStats.phase]
                ? isEnglish
                  ? anxietyExplanations[todayStats.phase].en
                  : anxietyExplanations[todayStats.phase].es
                : isEnglish
                ? 'Your biology affects anxiety vulnerability. This is normal and temporary.'
                : 'Tu biologia afecta la vulnerabilidad a la ansiedad. Esto es normal y temporal.'}
            </p>

            <button
              onClick={() => setShowAnxietyModal(false)}
              className="w-full mt-4 py-3 bg-[#2D1B69] text-white font-semibold rounded-xl"
            >
              {isEnglish ? 'Got it' : 'Entendido'}
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
