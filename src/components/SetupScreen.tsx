import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { ArrowRight, ArrowLeft, Loader2, Calendar, User, Heart, AlertCircle, Bell } from 'lucide-react';
import {
  CheckinTime,
  DEFAULT_CHECKIN_TIMES,
  requestNotificationPermission,
  scheduleNotifications,
} from '../utils/notifications';

type SetupStep =
  | 'name'
  | 'gender'
  | 'birthdate'
  | 'cycle'
  | 'schedule'
  | 'healthprofile'
  | 'medicalprofile';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const KNOWN_CONDITIONS = [
  'PCOS', 'Endometriosis', 'PMDD', 'Thyroid disorder',
  'Diabetes', 'Anxiety disorder', 'Depression', 'ADHD', 'None of the above',
];

const MEDICATIONS = [
  'Hormonal contraceptives', 'Antidepressants', 'Anxiety medication',
  'Thyroid medication', 'Metformin', 'Blood pressure medication',
  'Testosterone therapy', 'HRT', 'None',
];

const FAMILY_HISTORY = [
  'Heart disease', 'Diabetes', 'Hormonal cancers',
  'Thyroid disorders', 'Mental health conditions', 'None known',
];

interface SetupScreenProps {
  userId: string;
  onComplete: () => void;
}

function SliderRow({
  label,
  value,
  min,
  max,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm font-bold text-[#2D1B69]">{value} {unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-rose-400"
      />
      <div className="flex justify-between text-xs text-gray-400 mt-0.5">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

function MultiSelect({
  options,
  selected,
  onChange,
  noneOption,
}: {
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
  noneOption?: string;
}) {
  const toggle = (opt: string) => {
    if (opt === noneOption) {
      onChange(selected.includes(opt) ? [] : [opt]);
      return;
    }
    const next = selected.includes(opt)
      ? selected.filter(s => s !== opt)
      : [...selected.filter(s => s !== noneOption), opt];
    onChange(next);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button
          key={opt}
          onClick={() => toggle(opt)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border-2 transition-all ${
            selected.includes(opt)
              ? 'border-rose-400 bg-rose-50 text-rose-700'
              : 'border-gray-200 text-gray-600 hover:border-gray-300'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

export function SetupScreen({ userId, onComplete }: SetupScreenProps) {
  const [step, setStep] = useState<SetupStep>('name');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [birthdateError, setBirthdateError] = useState(false);
  const [lang, setLang] = useState<'en' | 'es'>('es');

  // Core fields
  const [nombre, setNombre] = useState('');
  const [genero, setGenero] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [cycleLength, setCycleLength] = useState(28);
  const [lastPeriodDate, setLastPeriodDate] = useState('');
  const [checkinTimes, setCheckinTimes] = useState<CheckinTime[]>(DEFAULT_CHECKIN_TIMES);

  // Health profile fields
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [exerciseFrequency, setExerciseFrequency] = useState('');
  const [exerciseType, setExerciseType] = useState('');
  const [dietType, setDietType] = useState('');
  const [sleepHours, setSleepHours] = useState(7);
  const [caffeinePerDay, setCaffeinePerDay] = useState(1);
  const [alcoholPerWeek, setAlcoholPerWeek] = useState(0);
  const [healthSkipped, setHealthSkipped] = useState(false);

  // Medical profile fields
  const [knownConditions, setKnownConditions] = useState<string[]>([]);
  const [currentMedications, setCurrentMedications] = useState<string[]>([]);
  const [bloodType, setBloodType] = useState('');
  const [familyHistory, setFamilyHistory] = useState<string[]>([]);
  const [medicalSkipped, setMedicalSkipped] = useState(false);

  const isEnglish = lang === 'en';
  const showCycleStep = genero === 'femenino';

  const bmi =
    heightCm && weightKg
      ? Math.round((Number(weightKg) / Math.pow(Number(heightCm) / 100, 2)) * 10) / 10
      : null;

  // ── Step navigation ──────────────────────────────────────────────
  const STEP_ORDER: SetupStep[] = showCycleStep
    ? ['name', 'gender', 'birthdate', 'cycle', 'schedule', 'healthprofile', 'medicalprofile']
    : ['name', 'gender', 'birthdate', 'schedule', 'healthprofile', 'medicalprofile'];

  const totalSteps = STEP_ORDER.length;
  const displayIndex = STEP_ORDER.indexOf(step) + 1;

  const nextStep = () => {
    const idx = STEP_ORDER.indexOf(step);
    if (step === 'birthdate') {
      if (!fechaNacimiento) { setBirthdateError(true); return; }
      setBirthdateError(false);
    }
    if (idx < STEP_ORDER.length - 1) {
      setStep(STEP_ORDER[idx + 1]);
    } else {
      handleSubmit();
    }
  };

  const prevStep = () => {
    setBirthdateError(false);
    const idx = STEP_ORDER.indexOf(step);
    if (idx > 0) setStep(STEP_ORDER[idx - 1]);
  };

  const canProceed = () => {
    if (step === 'name') return nombre.trim().length >= 2;
    if (step === 'gender') return genero !== '';
    if (step === 'birthdate') return fechaNacimiento !== '';
    return true; // all other steps are optional or have defaults
  };

  // ── Submit ───────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      const payload: Record<string, unknown> = {
        id: userId,
        nombre,
        genero,
        fecha_nacimiento: fechaNacimiento,
        cycle_length: cycleLength,
        last_period_date: lastPeriodDate || null,
        idioma: isEnglish ? 'EN' : 'ES',
        checkin_times: checkinTimes,
      };

      if (!healthSkipped) {
        if (heightCm) payload.height_cm = Number(heightCm);
        if (weightKg) payload.weight_kg = Number(weightKg);
        if (bmi) payload.bmi = bmi;
        if (exerciseFrequency) payload.exercise_frequency = exerciseFrequency;
        if (exerciseType) payload.exercise_type = exerciseType;
        if (dietType) payload.diet_type = dietType;
        payload.sleep_hours = sleepHours;
        payload.caffeine_per_day = caffeinePerDay;
        payload.alcohol_per_week = alcoholPerWeek;
      }

      if (!medicalSkipped) {
        if (knownConditions.length > 0) payload.known_conditions = knownConditions;
        if (currentMedications.length > 0) payload.current_medications = currentMedications;
        if (bloodType) payload.blood_type = bloodType;
        if (familyHistory.length > 0) payload.family_history = familyHistory;
      }

      const { error: profileError } = await supabase.from('profiles').insert(payload);
      if (profileError) throw profileError;

      const granted = await requestNotificationPermission();
      if (granted) scheduleNotifications(checkinTimes);

      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : (isEnglish ? 'Error saving' : 'Error al guardar'));
      setLoading(false);
    }
  };

  // ── Schedule helpers ─────────────────────────────────────────────
  const slotLabels: Record<string, { en: string; es: string }> = {
    morning: { en: 'Morning',  es: 'Mañana'  },
    midday:  { en: 'Midday',   es: 'Mediodía' },
    evening: { en: 'Evening',  es: 'Tarde'    },
    night:   { en: 'Night',    es: 'Noche'    },
  };

  const updateTime = (index: number, time: string) =>
    setCheckinTimes(prev => prev.map((t, i) => i === index ? { ...t, time } : t));

  const toggleSlot = (index: number) =>
    setCheckinTimes(prev => prev.map((t, i) => i === index ? { ...t, enabled: !t.enabled } : t));

  // ── Next button label ────────────────────────────────────────────
  const nextLabel = () => {
    if (loading) return null;
    if (step === 'medicalprofile') return isEnglish ? 'Activate my account' : 'Activar mi cuenta';
    if ((step === 'healthprofile' && healthSkipped) || (step === 'medicalprofile' && medicalSkipped))
      return isEnglish ? 'Skip' : 'Omitir';
    return isEnglish ? 'Next' : 'Siguiente';
  };

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-amber-50 flex flex-col items-center justify-start p-4 pt-8">
      <div className="w-full max-w-md">
        {/* Language toggle */}
        <div className="flex justify-end mb-4">
          <button
            onClick={() => setLang(lang === 'en' ? 'es' : 'en')}
            className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg transition-colors"
          >
            {lang === 'en' ? 'ES' : 'EN'}
          </button>
        </div>

        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-gray-900">
            {isEnglish
              ? 'Complete your trading account setup'
              : 'Completa la configuracion de tu cuenta de trading'}
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            {isEnglish ? `Step ${displayIndex} of ${totalSteps}` : `Paso ${displayIndex} de ${totalSteps}`}
          </p>
          <div className="flex gap-1.5 justify-center mt-3">
            {STEP_ORDER.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i < displayIndex ? 'bg-rose-400' : 'bg-gray-200'
                } ${i === displayIndex - 1 ? 'w-8' : 'w-4'}`}
              />
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* ── Name ── */}
          {step === 'name' && (
            <div className="space-y-4">
              <div className="w-16 h-16 bg-rose-100 rounded-full mx-auto flex items-center justify-center">
                <User className="w-8 h-8 text-rose-500" />
              </div>
              <h2 className="text-xl font-semibold text-center text-gray-900">
                {isEnglish ? "What's your name?" : '¿Cómo te llamas?'}
              </h2>
              <input
                type="text"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-400 focus:border-transparent outline-none transition-all text-center text-lg"
                placeholder={isEnglish ? 'Your name' : 'Tu nombre'}
                autoFocus
              />
            </div>
          )}

          {/* ── Gender ── */}
          {step === 'gender' && (
            <div className="space-y-4">
              <div className="w-16 h-16 bg-amber-100 rounded-full mx-auto flex items-center justify-center">
                <Heart className="w-8 h-8 text-amber-500" />
              </div>
              <h2 className="text-xl font-semibold text-center text-gray-900">
                {isEnglish ? "What's your gender?" : '¿Cuál es tu género?'}
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'femenino',  labelEs: 'Femenino',  labelEn: 'Female', icon: '♀' },
                  { value: 'masculino', labelEs: 'Masculino', labelEn: 'Male',   icon: '♂' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setGenero(opt.value)}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      genero === opt.value ? 'border-rose-400 bg-rose-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-2xl block mb-1">{opt.icon}</span>
                    <span className="font-medium text-gray-700">{isEnglish ? opt.labelEn : opt.labelEs}</span>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setGenero('prefiero_no_decir')}
                className={`w-full p-3 rounded-xl border-2 transition-all ${
                  genero === 'prefiero_no_decir' ? 'border-rose-400 bg-rose-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="font-medium text-gray-700">
                  {isEnglish ? 'Prefer not to say' : 'Prefiero no decir'}
                </span>
              </button>
            </div>
          )}

          {/* ── Birthdate ── */}
          {step === 'birthdate' && (
            <div className="space-y-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full mx-auto flex items-center justify-center">
                <Calendar className="w-8 h-8 text-blue-500" />
              </div>
              <h2 className="text-xl font-semibold text-center text-gray-900">
                {isEnglish ? 'Your birthdate' : 'Tu fecha de nacimiento'}
              </h2>
              <p className="text-sm text-gray-600 text-center">
                {isEnglish
                  ? 'Your birthdate activates your biological forecast'
                  : 'Tu fecha de nacimiento activa tu pronóstico biológico'}
              </p>
              <input
                type="date"
                value={fechaNacimiento}
                onChange={e => { setFechaNacimiento(e.target.value); setBirthdateError(false); }}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-rose-400 focus:border-transparent outline-none transition-all text-center ${
                  birthdateError ? 'border-red-400 bg-red-50' : 'border-gray-200'
                }`}
                max={new Date().toISOString().split('T')[0]}
              />
              {birthdateError && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-xl">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-600">
                    {isEnglish
                      ? 'Birthdate is required to calculate your cycles and research eligibility.'
                      : 'La fecha de nacimiento es necesaria para calcular tus ciclos y elegibilidad.'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── Cycle (female only) ── */}
          {step === 'cycle' && (
            <div className="space-y-4">
              <div className="w-16 h-16 bg-rose-100 rounded-full mx-auto flex items-center justify-center">
                <span className="text-2xl">🌙</span>
              </div>
              <h2 className="text-xl font-semibold text-center text-gray-900">
                {isEnglish ? 'Your menstrual cycle' : 'Tu ciclo menstrual'}
              </h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {isEnglish ? 'Average cycle length' : 'Duración promedio del ciclo'}
                </label>
                <div className="flex items-center justify-center gap-4">
                  <button onClick={() => setCycleLength(Math.max(21, cycleLength - 1))} className="w-10 h-10 rounded-full border border-gray-200 hover:bg-gray-50">-</button>
                  <span className="text-2xl font-bold text-rose-500 w-16 text-center">{cycleLength}</span>
                  <button onClick={() => setCycleLength(Math.min(35, cycleLength + 1))} className="w-10 h-10 rounded-full border border-gray-200 hover:bg-gray-50">+</button>
                  <span className="text-gray-500">{isEnglish ? 'days' : 'días'}</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {isEnglish ? 'Start of your last period' : 'Inicio de tu último período'}
                </label>
                <input
                  type="date"
                  value={lastPeriodDate}
                  onChange={e => setLastPeriodDate(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-400 focus:border-transparent outline-none transition-all text-center"
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>
          )}

          {/* ── Schedule ── */}
          {step === 'schedule' && (
            <div className="space-y-4">
              <div className="w-16 h-16 bg-purple-100 rounded-full mx-auto flex items-center justify-center">
                <Bell className="w-8 h-8 text-purple-500" />
              </div>
              <h2 className="text-xl font-semibold text-center text-gray-900">
                {isEnglish ? 'Your deposit schedule' : 'Tu horario de depósitos'}
              </h2>
              <p className="text-sm text-gray-500 text-center">
                {isEnglish
                  ? 'Choose when Bio reminds you to check in each day'
                  : 'Elige cuándo Bio te recuerda registrarte cada día'}
              </p>
              <div className="space-y-3">
                {checkinTimes.map((slot, index) => {
                  const labels = slotLabels[slot.label];
                  const label = isEnglish ? labels.en : labels.es;
                  return (
                    <div
                      key={slot.label}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                        slot.enabled ? 'border-rose-300 bg-rose-50' : 'border-gray-200 bg-gray-50 opacity-60'
                      }`}
                    >
                      <button
                        onClick={() => toggleSlot(index)}
                        className={`w-10 h-6 rounded-full transition-colors flex-shrink-0 relative ${slot.enabled ? 'bg-rose-400' : 'bg-gray-300'}`}
                      >
                        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${slot.enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                      </button>
                      <span className="flex-1 font-medium text-gray-700 text-sm">{label}</span>
                      <input
                        type="time"
                        value={slot.time}
                        onChange={e => updateTime(index, e.target.value)}
                        disabled={!slot.enabled}
                        className="px-2 py-1 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-rose-400 focus:border-transparent outline-none disabled:opacity-40 bg-white"
                      />
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-gray-400 text-center">
                {isEnglish ? 'You can change these anytime in Settings' : 'Puedes cambiarlos en Ajustes'}
              </p>
            </div>
          )}

          {/* ── Health Profile ── */}
          {step === 'healthprofile' && (
            <div className="space-y-4">
              <div className="text-center">
                <span className="text-3xl">💪</span>
                <h2 className="text-lg font-bold text-gray-900 mt-2">
                  {isEnglish ? 'Health Profile' : 'Perfil de Salud'}
                </h2>
                <span className="inline-block mt-1 px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full">
                  {isEnglish ? 'Increase your data trading value' : 'Aumenta el valor de tus datos'}
                </span>
              </div>

              <p className="text-xs text-gray-500 text-center bg-gray-50 rounded-xl p-3">
                {isEnglish
                  ? 'This information improves your forecast accuracy and increases your data trading value. All fields optional.'
                  : 'Esta información mejora la precisión de tu pronóstico y aumenta el valor de tus datos. Todos los campos son opcionales.'}
              </p>

              <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
                {/* Height & Weight */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      {isEnglish ? 'Height (cm)' : 'Altura (cm)'}
                    </label>
                    <input
                      type="number"
                      value={heightCm}
                      onChange={e => setHeightCm(e.target.value)}
                      placeholder="170"
                      min={100} max={250}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-400 focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      {isEnglish ? 'Weight (kg)' : 'Peso (kg)'}
                    </label>
                    <input
                      type="number"
                      value={weightKg}
                      onChange={e => setWeightKg(e.target.value)}
                      placeholder="65"
                      min={30} max={300}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-400 focus:border-transparent outline-none"
                    />
                  </div>
                </div>
                {bmi && (
                  <p className="text-xs text-center text-gray-500">
                    BMI: <span className="font-semibold text-[#2D1B69]">{bmi}</span>
                  </p>
                )}

                {/* Exercise Frequency */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {isEnglish ? 'Exercise frequency' : 'Frecuencia de ejercicio'}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['None', '1-2x/week', '3-4x/week', '5+/week'].map(opt => (
                      <button
                        key={opt}
                        onClick={() => setExerciseFrequency(exerciseFrequency === opt ? '' : opt)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border-2 transition-all ${
                          exerciseFrequency === opt
                            ? 'border-rose-400 bg-rose-50 text-rose-700'
                            : 'border-gray-200 text-gray-600'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Exercise Type */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {isEnglish ? 'Exercise type' : 'Tipo de ejercicio'}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['Cardio', 'Strength', 'Yoga', 'Mixed', 'None'].map(opt => (
                      <button
                        key={opt}
                        onClick={() => setExerciseType(exerciseType === opt ? '' : opt)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border-2 transition-all ${
                          exerciseType === opt
                            ? 'border-rose-400 bg-rose-50 text-rose-700'
                            : 'border-gray-200 text-gray-600'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Diet */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {isEnglish ? 'Diet type' : 'Tipo de dieta'}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['Omnivore', 'Vegetarian', 'Vegan', 'Keto', 'Mediterranean', 'Intermittent Fasting', 'No specific diet'].map(opt => (
                      <button
                        key={opt}
                        onClick={() => setDietType(dietType === opt ? '' : opt)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border-2 transition-all ${
                          dietType === opt
                            ? 'border-rose-400 bg-rose-50 text-rose-700'
                            : 'border-gray-200 text-gray-600'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sliders */}
                <SliderRow
                  label={isEnglish ? 'Avg sleep hours' : 'Horas de sueño'}
                  value={sleepHours} min={4} max={10} unit="h"
                  onChange={setSleepHours}
                />
                <SliderRow
                  label={isEnglish ? 'Caffeine cups/day' : 'Tazas de cafeína/día'}
                  value={caffeinePerDay} min={0} max={6} unit="cups"
                  onChange={setCaffeinePerDay}
                />
                <SliderRow
                  label={isEnglish ? 'Alcohol drinks/week' : 'Bebidas alcohólicas/semana'}
                  value={alcoholPerWeek} min={0} max={14} unit="drinks"
                  onChange={setAlcoholPerWeek}
                />
              </div>

              <button
                onClick={() => setHealthSkipped(!healthSkipped)}
                className="w-full text-xs text-gray-400 hover:text-gray-600 transition-colors py-1"
              >
                {healthSkipped
                  ? (isEnglish ? '↩ Include my health data' : '↩ Incluir mis datos de salud')
                  : (isEnglish ? 'Skip this step →' : 'Omitir este paso →')}
              </button>
            </div>
          )}

          {/* ── Medical Profile ── */}
          {step === 'medicalprofile' && (
            <div className="space-y-4">
              <div className="text-center">
                <span className="text-3xl">🧬</span>
                <h2 className="text-lg font-bold text-gray-900 mt-2">
                  {isEnglish ? 'Medical Profile' : 'Perfil Médico'}
                </h2>
                <span className="inline-block mt-1 px-3 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">
                  {isEnglish ? 'Premium data — highest research value' : 'Datos premium — mayor valor de investigación'}
                </span>
              </div>

              <p className="text-xs text-gray-500 text-center bg-purple-50 border border-purple-100 rounded-xl p-3">
                {isEnglish
                  ? 'Medical data is the highest-value research commodity. Pharmaceutical companies pay premium prices for this data. Your privacy is protected — data is anonymized before any research transaction.'
                  : 'Los datos médicos son la mercancía de investigación de mayor valor. Las farmacéuticas pagan precios premium. Tu privacidad está protegida — los datos son anonimizados antes de cualquier transacción.'}
              </p>

              <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
                {/* Known conditions */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">
                    {isEnglish ? 'Known conditions' : 'Condiciones conocidas'}
                  </label>
                  <MultiSelect
                    options={KNOWN_CONDITIONS}
                    selected={knownConditions}
                    onChange={setKnownConditions}
                    noneOption="None of the above"
                  />
                </div>

                {/* Current medications */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">
                    {isEnglish ? 'Current medications' : 'Medicamentos actuales'}
                  </label>
                  <MultiSelect
                    options={MEDICATIONS}
                    selected={currentMedications}
                    onChange={setCurrentMedications}
                    noneOption="None"
                  />
                </div>

                {/* Blood type */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">
                    {isEnglish ? 'Blood type (optional)' : 'Tipo de sangre (opcional)'}
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {BLOOD_TYPES.map(bt => (
                      <button
                        key={bt}
                        onClick={() => setBloodType(bloodType === bt ? '' : bt)}
                        className={`py-2 rounded-xl border-2 font-bold text-sm transition-all ${
                          bloodType === bt
                            ? 'border-rose-400 bg-rose-50 text-rose-700'
                            : 'border-gray-200 hover:border-gray-300 text-gray-700'
                        }`}
                      >
                        {bt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Family history */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">
                    {isEnglish ? 'Family history' : 'Antecedentes familiares'}
                  </label>
                  <MultiSelect
                    options={FAMILY_HISTORY}
                    selected={familyHistory}
                    onChange={setFamilyHistory}
                    noneOption="None known"
                  />
                </div>
              </div>

              <button
                onClick={() => setMedicalSkipped(!medicalSkipped)}
                className="w-full text-xs text-gray-400 hover:text-gray-600 transition-colors py-1"
              >
                {medicalSkipped
                  ? (isEnglish ? '↩ Include my medical data' : '↩ Incluir mis datos médicos')
                  : (isEnglish ? 'Skip this step →' : 'Omitir este paso →')}
              </button>
            </div>
          )}

          {/* ── Navigation buttons ── */}
          <div className="flex gap-3 mt-6">
            {displayIndex > 1 && (
              <button
                onClick={prevStep}
                className="flex-1 py-3 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-5 h-5" />
                {isEnglish ? 'Back' : 'Atrás'}
              </button>
            )}
            <button
              onClick={nextStep}
              disabled={!canProceed() || loading}
              className="flex-1 py-3 bg-gradient-to-r from-rose-400 to-amber-400 text-white font-semibold rounded-xl hover:from-rose-500 hover:to-amber-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {nextLabel()}
                  {step !== 'medicalprofile' && <ArrowRight className="w-5 h-5" />}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
