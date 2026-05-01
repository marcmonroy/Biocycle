import { useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Profile } from '../lib/supabase';
import { getCurrentPhase, getDaysOfData } from '../lib/phaseEngine';
import { colors, fonts } from '../lib/tokens';

interface Props {
  profile: Profile;
  onProfileUpdate: (updated: Profile) => void;
  onLogout: () => void;
  onComplete?: () => void;
}

// ── Check-in time helpers ───────────────────────────────────────────────────
const SLOT_HOURS = {
  morning:   [5, 6, 7, 8, 9, 10, 11],
  afternoon: [12, 13, 14, 15, 16],
  night:     [17, 18, 19, 20, 21, 22, 23],
};

function formatHour(h: number): string {
  if (h === 0) return '12am';
  if (h === 12) return '12pm';
  return h < 12 ? `${h}am` : `${h - 12}pm`;
}

function localToUTC(localHour: number): number {
  const d = new Date();
  d.setHours(localHour, 0, 0, 0);
  return d.getUTCHours();
}

function utcToLocal(utcHour: number): number {
  const d = new Date();
  d.setUTCHours(utcHour, 0, 0, 0);
  return d.getHours();
}

const slotPillStyle = (active: boolean): React.CSSProperties => ({
  background: active ? 'rgba(239, 159, 39,0.2)' : 'transparent',
  border: `1px solid ${active ? colors.amber : 'rgba(245, 242, 238,0.15)'}`,
  borderRadius: 20,
  padding: '5px 11px',
  color: active ? colors.amber : colors.boneFaint,
  fontSize: 12,
  fontWeight: active ? 600 : 400,
  cursor: 'pointer',
  fontFamily: fonts.body,
  whiteSpace: 'nowrap' as const,
});

// ── Option sets ────────────────────────────────────────────────────────────
const EXERCISE_FREQ_OPTIONS = ['Sedentary', '1-2x week', '3-4x week', '5+ week', 'Daily'];
const EXERCISE_TYPE_OPTIONS = ['None', 'Walking', 'Running', 'Weights', 'Yoga', 'Cycling', 'Swimming', 'Sports', 'Other'];
const DIET_TYPE_OPTIONS = ['Omnivore', 'Vegetarian', 'Vegan', 'Keto', 'Paleo', 'Mediterranean', 'Gluten-free', 'Other'];
const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const CAFFEINE_OPTIONS = [
  { label: '0', value: 0 },
  { label: '1', value: 1 },
  { label: '2', value: 2 },
  { label: '3', value: 3 },
  { label: '4+', value: 4 },
];
const ALCOHOL_OPTIONS = [
  { label: '0', value: 0 },
  { label: '1-2', value: 1 },
  { label: '3-5', value: 3 },
  { label: '6-10', value: 6 },
  { label: '10+', value: 10 },
];
const CONDITION_OPTIONS = [
  'None', 'Diabetes', 'Hypertension', 'Thyroid disorder', 'PCOS',
  'Endometriosis', 'Depression', 'Anxiety', 'Chronic pain',
  'Sleep disorder', 'Autoimmune condition', 'Heart condition', 'Migraine', 'Other',
];
const MEDICATION_OPTIONS = [
  'None', 'Hormonal contraceptives', 'HRT', 'Antidepressants',
  'Anti-anxiety', 'Thyroid medication', 'Blood pressure medication',
  'Diabetes medication', 'Pain medication', 'Sleep medication',
  'Vitamins/Supplements', 'Other',
];
const FAMILY_HISTORY_OPTIONS = [
  'None', 'Diabetes', 'Heart disease', 'Cancer', 'Depression',
  'Anxiety', 'Thyroid disorders', 'Hormonal conditions', 'Other',
];

// ── Helpers ────────────────────────────────────────────────────────────────
function calcBmi(heightCm: number, weightKg: number): number | null {
  if (!heightCm || !weightKg) return null;
  const bmi = weightKg / Math.pow(heightCm / 100, 2);
  return Math.round(bmi * 10) / 10;
}

function toggleMulti(prev: string[], val: string): string[] {
  if (val === 'None') return ['None'];
  const without = prev.filter(v => v !== 'None');
  return without.includes(val) ? without.filter(v => v !== val) : [...without, val];
}

export function ProfileScreen({ profile, onProfileUpdate, onLogout, onComplete }: Props) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showPicardiaConfirm, setShowPicardiaConfirm] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Preferences
  const [picardia, setPicardia] = useState(profile.picardia_mode);
  const [idioma, setIdioma] = useState<'EN' | 'ES'>(profile.idioma ?? 'EN');

  // Unit system — persisted to localStorage
  const [units, setUnits] = useState<'metric' | 'imperial'>(() =>
    (localStorage.getItem('biocycle_units') as 'metric' | 'imperial') || 'metric'
  );

  // Body metrics — metric fields are always the source of truth for DB
  const [heightCm, setHeightCm] = useState(String(profile.height_cm ?? ''));
  const [weightKg, setWeightKg] = useState(String(profile.weight_kg ?? ''));
  const [sleepHours, setSleepHours] = useState(String(profile.sleep_hours ?? ''));

  // Imperial display fields — initialized by converting stored metric values
  const [heightFt, setHeightFt] = useState(() => {
    if (!profile.height_cm) return '';
    return String(Math.floor(profile.height_cm / 2.54 / 12));
  });
  const [heightIn, setHeightIn] = useState(() => {
    if (!profile.height_cm) return '';
    const totalInches = profile.height_cm / 2.54;
    return String(Math.round(totalInches % 12));
  });
  const [weightLbs, setWeightLbs] = useState(() => {
    if (!profile.weight_kg) return '';
    return String(Math.round(profile.weight_kg / 0.453592 * 10) / 10);
  });

  // Lifestyle
  const [exerciseFreq, setExerciseFreq] = useState(profile.exercise_frequency ?? '');
  const [exerciseType, setExerciseType] = useState<string[]>(profile.exercise_type ?? []);
  const [dietType, setDietType] = useState(profile.diet_type ?? '');
  const [bloodType, setBloodType] = useState(profile.blood_type ?? '');
  const [caffeine, setCaffeine] = useState<number | null>(profile.caffeine_per_day ?? null);
  const [alcohol, setAlcohol] = useState<number | null>(profile.alcohol_per_week ?? null);

  // Medical
  const [knownConditions, setKnownConditions] = useState<string[]>(profile.known_conditions ?? []);
  const [currentMeds, setCurrentMeds] = useState<string[]>(profile.current_medications ?? []);
  const [familyHistory, setFamilyHistory] = useState<string[]>(profile.family_history ?? []);

  // Cycle (females only)
  const [lastPeriodDate, setLastPeriodDate] = useState(profile.last_period_date ?? '');
  const [cycleLength, setCycleLength] = useState(String(profile.cycle_length ?? 28));

  // Sexual partner
  const [sexualPartner, setSexualPartner] = useState<boolean | null>(profile.has_sexual_partner ?? null);

  // Check-in times
  const [checkinMorning, setCheckinMorning]     = useState(
    profile.checkin_times?.morning?.hour != null
      ? utcToLocal(profile.checkin_times.morning.hour)
      : 8
  );
  const [checkinAfternoon, setCheckinAfternoon] = useState(
    profile.checkin_times?.afternoon?.hour != null
      ? utcToLocal(profile.checkin_times.afternoon.hour)
      : 13
  );
  const [checkinNight, setCheckinNight]         = useState(
    profile.checkin_times?.night?.hour != null
      ? utcToLocal(profile.checkin_times.night.hour)
      : 20
  );

  const phase = getCurrentPhase(profile);
  const daysOfData = getDaysOfData(profile);
  const isES = idioma === 'ES';
  const isFemale = profile.genero === 'female';
  void phase;

  // Always compute metric values from whichever input set is active
  const metricHeightCm = units === 'metric'
    ? (parseFloat(heightCm) || 0)
    : Math.round(((parseInt(heightFt, 10) || 0) * 12 + (parseInt(heightIn, 10) || 0)) * 2.54);

  const metricWeightKg = units === 'metric'
    ? (parseFloat(weightKg) || 0)
    : Math.round((parseFloat(weightLbs) || 0) * 0.453592 * 10) / 10;

  const bmi = calcBmi(metricHeightCm, metricWeightKg);

  function handleUnitToggle(newUnit: 'metric' | 'imperial') {
    if (newUnit === units) return;
    if (newUnit === 'imperial') {
      // Convert current metric inputs → imperial display
      const cm = parseFloat(heightCm);
      const kg = parseFloat(weightKg);
      if (cm) {
        const totalInches = cm / 2.54;
        setHeightFt(String(Math.floor(totalInches / 12)));
        setHeightIn(String(Math.round(totalInches % 12)));
      }
      if (kg) setWeightLbs(String(Math.round(kg / 0.453592 * 10) / 10));
    } else {
      // Convert current imperial inputs → metric display
      const ft = parseInt(heightFt, 10) || 0;
      const inch = parseInt(heightIn, 10) || 0;
      const lbs = parseFloat(weightLbs);
      const totalInches = ft * 12 + inch;
      if (totalInches > 0) setHeightCm(String(Math.round(totalInches * 2.54)));
      if (lbs) setWeightKg(String(Math.round(lbs * 0.453592 * 10) / 10));
    }
    localStorage.setItem('biocycle_units', newUnit);
    setUnits(newUnit);
  }

  const L = (en: string, es: string) => isES ? es : en;

  async function saveProfile() {
    setSaving(true);

    const updates: Record<string, unknown> = {
      picardia_mode:      picardia,
      idioma,
      height_cm:          metricHeightCm || null,
      weight_kg:          metricWeightKg || null,
      bmi:                bmi,
      sleep_hours:        sleepHours ? parseFloat(sleepHours) : null,
      exercise_frequency: exerciseFreq || null,
      exercise_type:      exerciseType.length ? exerciseType : null,
      diet_type:          dietType || null,
      blood_type:         bloodType || null,
      caffeine_per_day:   caffeine,
      alcohol_per_week:   alcohol,
      known_conditions:   knownConditions.length ? knownConditions : null,
      current_medications: currentMeds.length ? currentMeds : null,
      family_history:     familyHistory.length ? familyHistory : null,
      has_sexual_partner: sexualPartner,
      checkin_times: {
        morning:   { hour: localToUTC(checkinMorning),   label: formatHour(checkinMorning) },
        afternoon: { hour: localToUTC(checkinAfternoon), label: formatHour(checkinAfternoon) },
        night:     { hour: localToUTC(checkinNight),     label: formatHour(checkinNight) },
      },
    };

    if (isFemale) {
      updates.last_period_date = lastPeriodDate || null;
      updates.cycle_length = cycleLength ? parseInt(cycleLength, 10) : 28;
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', profile.id)
      .select()
      .single();

    setSaving(false);
    if (!error && data) {
      onProfileUpdate(data as Profile);
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        onComplete?.();
      }, 2500);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    onLogout();
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      const uid = profile.id;
      await supabase.from('whatsapp_verification_codes').delete().eq('user_id', uid);
      await supabase.from('relationship_interactions').delete().eq('user_id', uid);
      await supabase.from('relationships').delete().eq('user_id', uid);
      await supabase.from('safety_events').delete().eq('user_id', uid);
      await supabase.from('validation_scores').delete().eq('user_id', uid);
      await supabase.from('conversation_sessions').delete().eq('user_id', uid);
      await supabase.from('user_state').delete().eq('user_id', uid);
      await supabase.from('profiles').delete().eq('id', uid);
      const deleteRes = await fetch('/.netlify/functions/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid }),
      });
      const deleteData = await deleteRes.json();
      console.log('[ProfileScreen] delete-account response:', deleteData);
      if (!deleteRes.ok) {
        console.error('[ProfileScreen] auth delete failed:', deleteData.error);
        // Still sign out even if auth delete fails
      }
      await supabase.auth.signOut();
      onLogout();
    } catch {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      maxWidth: '100vw',
      background: colors.midnight,
      fontFamily: fonts.body,
      paddingBottom: 100,
      overflowX: 'hidden',
      overflowY: 'auto',
    }}>
      {/* Header */}
      <div style={{
        width: '100%',
        maxWidth: 430,
        margin: '0 auto',
        padding: '52px 20px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <button
          onClick={onComplete}
          style={{
            background: 'rgba(245, 242, 238,0.05)',
            border: '1px solid rgba(245, 242, 238,0.1)',
            borderRadius: 8,
            width: 36,
            height: 36,
            color: colors.bone,
            fontSize: 18,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-label="Back"
        >
          ←
        </button>
        <img src="/favicon.svg" alt="" style={{ width: 22, height: 22 }} />
        <h1 style={{
          fontFamily: fonts.display,
          fontSize: '1.3rem',
          fontWeight: 300,
          color: colors.bone,
          margin: 0,
        }}>
          {profile.idioma === 'ES' ? 'Configuración' : 'Settings'}
        </h1>
      </div>

      {/* ── Preferences ───────────────────────────────────────────────────── */}
      <Section label={L('Preferences', 'Preferencias')}>
        <FieldRow label={L('Language', 'Idioma')}>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['EN', 'ES'] as const).map(lang => (
              <PillButton
                key={lang}
                label={lang === 'EN' ? 'English' : 'Español'}
                active={idioma === lang}
                onClick={() => setIdioma(lang)}
              />
            ))}
          </div>
        </FieldRow>

        <FieldRow
          label={L('Picardia Mode', 'Modo Picardía')}
          sublabel={L('More playful tone from Jules', 'Tono más juguetón de Jules')}
        >
          <button
            onClick={() => picardia ? setPicardia(false) : setShowPicardiaConfirm(true)}
            style={{
              width: 48, height: 28, borderRadius: 14,
              background: picardia ? colors.amber : 'rgba(245, 242, 238,0.1)',
              border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0,
            }}
          >
            <div style={{
              width: 22, height: 22, borderRadius: '50%', background: 'white',
              position: 'absolute', top: 3, left: picardia ? 23 : 3, transition: 'left 0.2s',
              boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
            }} />
          </button>
        </FieldRow>
      </Section>

      {/* ── Section 1: Basic info (read-only) ──────────────────────────────── */}
      <Section label={L('Account', 'Cuenta')}>
        <ReadRow label={L('Name', 'Nombre')} value={profile.nombre ?? '—'} />
        <ReadRow label={L('Gender', 'Género')} value={profile.genero ?? '—'} />
        <ReadRow
          label={L('Date of birth', 'Fecha de nacimiento')}
          value={profile.fecha_nacimiento ?? '—'}
        />
        <ReadRow label={L('Language', 'Idioma')} value={profile.idioma} />
        <ReadRow label="WhatsApp" value={profile.whatsapp_phone ?? '—'} />
      </Section>

      {/* ── Check-in times (first and most important for new users) ────────── */}
      <Section label={L('Check-in Times', 'Horarios de Check-in')}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <p style={{ color: colors.boneFaint, fontSize: 11, letterSpacing: '0.06em', margin: '0 0 8px' }}>
              {L('Morning check-in', 'Check-in Mañana')}
            </p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {SLOT_HOURS.morning.map(h => (
                <button key={h} onClick={() => setCheckinMorning(h)} style={slotPillStyle(checkinMorning === h)}>
                  {formatHour(h)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p style={{ color: colors.boneFaint, fontSize: 11, letterSpacing: '0.06em', margin: '0 0 8px' }}>
              {L('Afternoon check-in', 'Check-in Tarde')}
            </p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {SLOT_HOURS.afternoon.map(h => (
                <button key={h} onClick={() => setCheckinAfternoon(h)} style={slotPillStyle(checkinAfternoon === h)}>
                  {formatHour(h)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p style={{ color: colors.boneFaint, fontSize: 11, letterSpacing: '0.06em', margin: '0 0 8px' }}>
              {L('Night check-in', 'Check-in Noche')}
            </p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {SLOT_HOURS.night.map(h => (
                <button key={h} onClick={() => setCheckinNight(h)} style={slotPillStyle(checkinNight === h)}>
                  {formatHour(h)}
                </button>
              ))}
            </div>
          </div>
          <p style={{ color: colors.boneFaint, fontSize: 11, margin: 0 }}>
            {L('Jules will send your daily WhatsApp card at these times.', 'Jules te enviará tu tarjeta diaria por WhatsApp a estas horas.')}
          </p>
        </div>
      </Section>

      {/* ── Section 2: Body metrics ─────────────────────────────────────────── */}
      <Section label={L('Body Metrics', 'Métricas Corporales')}>
        {/* Unit toggle */}
        <div style={{ display: 'flex', gap: 6 }}>
          {(['metric', 'imperial'] as const).map(u => (
            <PillButton
              key={u}
              label={u === 'metric' ? 'Metric' : 'Imperial'}
              active={units === u}
              onClick={() => handleUnitToggle(u)}
            />
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {units === 'metric' ? (
            <div>
              <FieldLabel>{L('Height (cm)', 'Altura (cm)')}</FieldLabel>
              <input
                type="number"
                value={heightCm}
                onChange={e => setHeightCm(e.target.value)}
                placeholder="170"
                style={inputStyle}
              />
            </div>
          ) : (
            <div>
              <FieldLabel>{L('Height', 'Altura')}</FieldLabel>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  type="number"
                  value={heightFt}
                  onChange={e => setHeightFt(e.target.value)}
                  placeholder="5"
                  style={{ ...inputStyle, width: '50%' }}
                />
                <input
                  type="number"
                  value={heightIn}
                  onChange={e => setHeightIn(e.target.value)}
                  placeholder="7"
                  min={0}
                  max={11}
                  style={{ ...inputStyle, width: '50%' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                <span style={{ color: colors.boneFaint, fontSize: 10, width: '50%', textAlign: 'center' }}>ft</span>
                <span style={{ color: colors.boneFaint, fontSize: 10, width: '50%', textAlign: 'center' }}>in</span>
              </div>
            </div>
          )}

          {units === 'metric' ? (
            <div>
              <FieldLabel>{L('Weight (kg)', 'Peso (kg)')}</FieldLabel>
              <input
                type="number"
                value={weightKg}
                onChange={e => setWeightKg(e.target.value)}
                placeholder="70"
                style={inputStyle}
              />
            </div>
          ) : (
            <div>
              <FieldLabel>{L('Weight (lbs)', 'Peso (lbs)')}</FieldLabel>
              <input
                type="number"
                value={weightLbs}
                onChange={e => setWeightLbs(e.target.value)}
                placeholder="154"
                style={inputStyle}
              />
            </div>
          )}
        </div>

        {bmi !== null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: colors.boneFaint, fontSize: 13 }}>BMI</span>
            <span style={{
              fontFamily: fonts.mono,
              fontSize: '1.1rem',
              fontWeight: 700,
              color: colors.amber,
            }}>
              {bmi}
            </span>
          </div>
        )}

        <div>
          <FieldLabel>{L('Sleep hours/night', 'Horas de sueño/noche')}</FieldLabel>
          <input
            type="number"
            value={sleepHours}
            onChange={e => setSleepHours(e.target.value)}
            placeholder="7.5"
            min={0}
            max={12}
            step={0.5}
            style={{ ...inputStyle, maxWidth: 100 }}
          />
        </div>
      </Section>

      {/* ── Section 3: Lifestyle ────────────────────────────────────────────── */}
      <Section label={L('Lifestyle', 'Estilo de Vida')}>
        <div>
          <FieldLabel>{L('Exercise frequency', 'Frecuencia de ejercicio')}</FieldLabel>
          <div style={pillRowStyle}>
            {EXERCISE_FREQ_OPTIONS.map(opt => (
              <PillButton
                key={opt}
                label={opt}
                active={exerciseFreq === opt}
                onClick={() => setExerciseFreq(opt)}
              />
            ))}
          </div>
        </div>

        <div>
          <FieldLabel>{L('Exercise type (select all that apply)', 'Tipo de ejercicio (selecciona todos)')}</FieldLabel>
          <div style={pillRowStyle}>
            {EXERCISE_TYPE_OPTIONS.map(opt => (
              <PillButton
                key={opt}
                label={opt}
                active={exerciseType.includes(opt)}
                onClick={() => setExerciseType(prev => toggleMulti(prev, opt))}
              />
            ))}
          </div>
        </div>

        <div>
          <FieldLabel>{L('Diet type', 'Tipo de dieta')}</FieldLabel>
          <div style={pillRowStyle}>
            {DIET_TYPE_OPTIONS.map(opt => (
              <PillButton
                key={opt}
                label={opt}
                active={dietType === opt}
                onClick={() => setDietType(opt)}
              />
            ))}
          </div>
        </div>

        <div>
          <FieldLabel>{L('Blood type', 'Tipo de sangre')}</FieldLabel>
          <div style={pillRowStyle}>
            {BLOOD_TYPES.map(bt => (
              <PillButton
                key={bt}
                label={bt}
                active={bloodType === bt}
                onClick={() => setBloodType(bt)}
              />
            ))}
          </div>
        </div>

        <div>
          <FieldLabel>{L('Caffeine per day (cups)', 'Cafeína por día (tazas)')}</FieldLabel>
          <div style={pillRowStyle}>
            {CAFFEINE_OPTIONS.map(opt => (
              <PillButton
                key={opt.label}
                label={opt.label}
                active={caffeine === opt.value}
                onClick={() => setCaffeine(opt.value)}
              />
            ))}
          </div>
        </div>

        <div>
          <FieldLabel>{L('Alcohol per week (drinks)', 'Alcohol por semana (bebidas)')}</FieldLabel>
          <div style={pillRowStyle}>
            {ALCOHOL_OPTIONS.map(opt => (
              <PillButton
                key={opt.label}
                label={opt.label}
                active={alcohol === opt.value}
                onClick={() => setAlcohol(opt.value)}
              />
            ))}
          </div>
        </div>
      </Section>

      {/* ── Section 4: Medical ──────────────────────────────────────────────── */}
      <Section label={L('Medical', 'Salud')}>
        <div>
          <FieldLabel>{L('Known conditions (optional)', 'Condiciones conocidas (opcional)')}</FieldLabel>
          <div style={pillRowStyle}>
            {CONDITION_OPTIONS.map(opt => (
              <PillButton
                key={opt}
                label={opt}
                active={knownConditions.includes(opt)}
                onClick={() => setKnownConditions(prev => toggleMulti(prev, opt))}
              />
            ))}
          </div>
        </div>

        <div>
          <FieldLabel>{L('Current medications (optional)', 'Medicamentos actuales (opcional)')}</FieldLabel>
          <div style={pillRowStyle}>
            {MEDICATION_OPTIONS.map(opt => (
              <PillButton
                key={opt}
                label={opt}
                active={currentMeds.includes(opt)}
                onClick={() => setCurrentMeds(prev => toggleMulti(prev, opt))}
              />
            ))}
          </div>
        </div>

        <div>
          <FieldLabel>{L('Family history (optional)', 'Historial familiar (opcional)')}</FieldLabel>
          <div style={pillRowStyle}>
            {FAMILY_HISTORY_OPTIONS.map(opt => (
              <PillButton
                key={opt}
                label={opt}
                active={familyHistory.includes(opt)}
                onClick={() => setFamilyHistory(prev => toggleMulti(prev, opt))}
              />
            ))}
          </div>
        </div>
      </Section>

      {/* ── Section 5: Cycle (females only) ────────────────────────────────── */}
      {isFemale && (
        <Section label={L('Cycle', 'Ciclo')}>
          <div>
            <FieldLabel>{L('Last period date', 'Fecha del último período')}</FieldLabel>
            <input
              type="date"
              value={lastPeriodDate}
              onChange={e => setLastPeriodDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              style={{ ...inputStyle, maxWidth: 180 }}
            />
          </div>
          <div>
            <FieldLabel>{L('Cycle length (days)', 'Duración del ciclo (días)')}</FieldLabel>
            <input
              type="number"
              value={cycleLength}
              onChange={e => setCycleLength(e.target.value)}
              min={21}
              max={45}
              style={{ ...inputStyle, maxWidth: 100 }}
            />
          </div>
        </Section>
      )}

      {/* ── Section 6: Sexual partner ───────────────────────────────────────── */}
      <Section label={L('Partner', 'Pareja')}>
        <div>
          <FieldLabel>{L('Currently have a sexual partner?', '¿Tienes pareja sexual actualmente?')}</FieldLabel>
          <div style={pillRowStyle}>
            {[
              { label: L('Yes', 'Sí'), value: true as boolean | null },
              { label: 'No', value: false as boolean | null },
              { label: L('Prefer not to say', 'Prefiero no decir'), value: null as boolean | null },
            ].map(opt => (
              <PillButton
                key={opt.label}
                label={opt.label}
                active={sexualPartner === opt.value}
                onClick={() => setSexualPartner(opt.value)}
              />
            ))}
          </div>
        </div>
      </Section>

      {/* ── Save button ─────────────────────────────────────────────────────── */}
      <div style={{ width: '100%', maxWidth: 430, margin: '0 auto', padding: '8px 24px 16px' }}>
        <button
          onClick={saveProfile}
          disabled={saving || saved}
          style={{
            width: '100%',
            background: saved ? 'rgba(93, 202, 165,0.2)' : saving ? 'rgba(239, 159, 39,0.4)' : colors.amber,
            border: saved ? '1px solid rgba(93, 202, 165,0.4)' : 'none',
            borderRadius: 14,
            padding: '16px',
            color: saved ? colors.success : colors.bone,
            fontSize: '1rem',
            fontWeight: 600,
            cursor: (saving || saved) ? 'default' : 'pointer',
            fontFamily: fonts.body,
            transition: 'background 0.2s, color 0.2s',
          }}
        >
          {saved ? L('Saved ✓', 'Guardado ✓') : saving ? L('Saving...', 'Guardando...') : L('Save changes', 'Guardar cambios')}
        </button>

        {(profile.days_of_data === null || profile.days_of_data === 0) && onComplete && (
          <button
            onClick={onComplete}
            style={{
              width: '100%',
              marginTop: 12,
              background: colors.amber,
              border: 'none',
              borderRadius: 14,
              padding: '18px',
              color: colors.bone,
              fontSize: '1rem',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: fonts.body,
            }}
          >
            {idioma === 'ES' ? 'Conoce a Jules →' : 'Meet Jules →'}
          </button>
        )}
      </div>

      {/* ── Logout + Delete ─────────────────────────────────────────────────── */}
      <div style={{ width: '100%', maxWidth: 430, margin: '0 auto', padding: '0 24px 40px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button
          onClick={() => setShowLogoutConfirm(true)}
          style={{
            width: '100%',
            background: 'none',
            border: '1px solid rgba(245, 242, 238,0.08)',
            borderRadius: 14,
            padding: '14px',
            color: colors.boneFaint,
            fontSize: '0.9rem',
            cursor: 'pointer',
            fontFamily: fonts.body,
          }}
        >
          {L('Sign out', 'Cerrar sesión')}
        </button>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          style={{
            width: '100%',
            background: 'none',
            border: '1px solid rgba(239, 159, 39,0.2)',
            borderRadius: 14,
            padding: '14px',
            color: 'rgba(239, 159, 39,0.5)',
            fontSize: '0.85rem',
            cursor: 'pointer',
            fontFamily: fonts.body,
          }}
        >
          {L('Delete account', 'Eliminar cuenta')}
        </button>
      </div>

      {/* ── Picardia confirm modal ───────────────────────────────────────────── */}
      {showPicardiaConfirm && (
        <Modal>
          <h3 style={modalHeadingStyle}>{L('Enable Picardia Mode?', '¿Activar Modo Picardía?')}</h3>
          <p style={modalBodyStyle}>
            {L(
              'Jules will use a more playful, flirtatious tone. Adult content (18+). You can turn it off at any time.',
              'Jules usará un tono más juguetón y coqueto. Contenido para adultos (+18). Puedes desactivarlo en cualquier momento.',
            )}
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <ModalBtn onClick={() => setShowPicardiaConfirm(false)} variant="ghost">
              {L('Cancel', 'Cancelar')}
            </ModalBtn>
            <ModalBtn onClick={() => { setPicardia(true); setShowPicardiaConfirm(false); }} variant="coral">
              {L('Yes, enable', 'Sí, activar')}
            </ModalBtn>
          </div>
        </Modal>
      )}

      {/* ── Logout confirm modal ─────────────────────────────────────────────── */}
      {showLogoutConfirm && (
        <Modal>
          <h3 style={modalHeadingStyle}>{L('Sign out?', '¿Cerrar sesión?')}</h3>
          <p style={modalBodyStyle}>{L('Your data is saved in the cloud.', 'Tus datos están guardados en la nube.')}</p>
          <div style={{ display: 'flex', gap: 10 }}>
            <ModalBtn onClick={() => setShowLogoutConfirm(false)} variant="ghost">
              {L('Cancel', 'Cancelar')}
            </ModalBtn>
            <ModalBtn onClick={handleLogout} variant="ghost">
              {L('Sign out', 'Cerrar sesión')}
            </ModalBtn>
          </div>
        </Modal>
      )}

      {/* ── Delete account confirm modal ─────────────────────────────────────── */}
      {showDeleteConfirm && (
        <Modal>
          <h3 style={modalHeadingStyle}>{L('Delete account?', '¿Eliminar cuenta?')}</h3>
          <p style={modalBodyStyle}>
            {isES
              ? `Eliminar tu cuenta borra permanentemente todos tus datos biológicos. Tu portafolio — actualmente valorado en $${Math.max(1.0, daysOfData * 0.15).toFixed(2)} — se perderá para siempre. Esto no se puede deshacer.`
              : `Deleting your account permanently removes all your biological data. Your portfolio — currently worth $${Math.max(1.0, daysOfData * 0.15).toFixed(2)} — will be gone forever. This cannot be undone.`}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <ModalBtn onClick={() => setShowDeleteConfirm(false)} variant="coral">
              {L('Keep my account', 'Conservar mi cuenta')}
            </ModalBtn>
            <ModalBtn onClick={handleDeleteAccount} variant="ghost">
              {deleting ? '...' : L('Delete everything', 'Eliminar todo')}
            </ModalBtn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ width: '100%', maxWidth: 430, margin: '0 auto' }}>
      <div style={{ padding: '20px 24px 6px' }}>
        <p style={{ color: colors.boneFaint, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', margin: 0 }}>
          {label}
        </p>
      </div>
      <div style={{ padding: '8px 24px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {children}
      </div>
      <div style={{ height: 1, background: 'rgba(245, 242, 238,0.05)', margin: '0 24px' }} />
    </div>
  );
}

function FieldRow({ label, sublabel, children }: { label: string; sublabel?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
      <div>
        <div style={{ color: colors.boneDim, fontSize: 14 }}>{label}</div>
        {sublabel && <div style={{ color: colors.boneFaint, fontSize: 11, marginTop: 2 }}>{sublabel}</div>}
      </div>
      {children}
    </div>
  );
}

function ReadRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ color: colors.boneFaint, fontSize: 13 }}>{label}</span>
      <span style={{ color: colors.boneDim, fontSize: 13, fontFamily: fonts.body }}>{value}</span>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ color: colors.boneFaint, fontSize: 11, letterSpacing: '0.06em', margin: '0 0 6px' }}>
      {children}
    </p>
  );
}

function PillButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? colors.amber : 'transparent',
        border: `1px solid ${active ? colors.amber : colors.boneFaint}`,
        borderRadius: 8,
        padding: '6px 12px',
        color: active ? colors.bone : colors.boneFaint,
        fontSize: 12,
        fontWeight: active ? 600 : 400,
        cursor: 'pointer',
        fontFamily: fonts.body,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  );
}

function Modal({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 24,
    }}>
      <div style={{
        background: colors.midnightDeep, border: '1px solid rgba(245, 242, 238,0.1)',
        borderRadius: 20, padding: 28, maxWidth: 360, width: '100%',
        display: 'flex', flexDirection: 'column', gap: 16,
      }}>
        {children}
      </div>
    </div>
  );
}

function ModalBtn({ children, onClick, variant }: { children: React.ReactNode; onClick: () => void; variant: 'ghost' | 'coral' }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        background: variant === 'coral' ? 'rgba(239, 159, 39,0.15)' : 'rgba(245, 242, 238,0.06)',
        border: variant === 'coral' ? '1px solid rgba(239, 159, 39,0.35)' : '1px solid rgba(245, 242, 238,0.1)',
        borderRadius: 10, padding: '12px',
        color: variant === 'coral' ? colors.amber : colors.boneFaint,
        cursor: 'pointer', fontSize: 14, fontWeight: variant === 'coral' ? 600 : 400,
        fontFamily: fonts.body,
      }}
    >
      {children}
    </button>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(245, 242, 238,0.04)',
  border: '1px solid rgba(245, 242, 238,0.1)',
  borderRadius: 10,
  padding: '10px 12px',
  color: colors.bone,
  fontSize: '0.9rem',
  fontFamily: fonts.body,
  outline: 'none',
  boxSizing: 'border-box',
};

const pillRowStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 6,
};

const modalHeadingStyle: React.CSSProperties = {
  fontFamily: fonts.display,
  color: colors.bone,
  fontSize: '1.1rem',
  fontWeight: 300,
  margin: 0,
};

const modalBodyStyle: React.CSSProperties = {
  color: colors.boneFaint,
  fontSize: 13,
  lineHeight: 1.6,
  margin: 0,
};
