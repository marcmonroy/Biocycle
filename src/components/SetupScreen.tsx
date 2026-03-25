import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { ArrowRight, ArrowLeft, Loader2, Calendar, User, Heart, AlertCircle, Bell } from 'lucide-react';
import {
  CheckinTime,
  DEFAULT_CHECKIN_TIMES,
  requestNotificationPermission,
  scheduleNotifications,
} from '../utils/notifications';

type SetupStep = 'name' | 'gender' | 'bloodtype' | 'birthdate' | 'cycle' | 'schedule';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

interface SetupScreenProps {
  userId: string;
  onComplete: () => void;
}

export function SetupScreen({ userId, onComplete }: SetupScreenProps) {
  const [step, setStep] = useState<SetupStep>('name');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [birthdateError, setBirthdateError] = useState(false);
  const [lang, setLang] = useState<'en' | 'es'>('es');

  const [nombre, setNombre] = useState('');
  const [genero, setGenero] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [cycleLength, setCycleLength] = useState(28);
  const [lastPeriodDate, setLastPeriodDate] = useState('');
  const [checkinTimes, setCheckinTimes] = useState<CheckinTime[]>(DEFAULT_CHECKIN_TIMES);
  const [bloodType, setBloodType] = useState<string>('');

  const isEnglish = lang === 'en';
  const showCycleStep = genero === 'femenino';

  // Step navigation
  const nextStep = () => {
    if (step === 'name') setStep('gender');
    else if (step === 'gender') setStep('bloodtype');
    else if (step === 'bloodtype') setStep('birthdate'); // blood type is optional, always proceed
    else if (step === 'birthdate') {
      if (!fechaNacimiento) { setBirthdateError(true); return; }
      setBirthdateError(false);
      setStep(showCycleStep ? 'cycle' : 'schedule');
    } else if (step === 'cycle') setStep('schedule');
    else if (step === 'schedule') handleSubmit();
  };

  const prevStep = () => {
    setBirthdateError(false);
    if (step === 'gender') setStep('name');
    else if (step === 'bloodtype') setStep('gender');
    else if (step === 'birthdate') setStep('bloodtype');
    else if (step === 'cycle') setStep('birthdate');
    else if (step === 'schedule') setStep(showCycleStep ? 'cycle' : 'birthdate');
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          nombre,
          genero,
          fecha_nacimiento: fechaNacimiento,
          cycle_length: cycleLength,
          last_period_date: lastPeriodDate || null,
          idioma: isEnglish ? 'EN' : 'ES',
          checkin_times: checkinTimes,
          blood_type: bloodType || null,
        });

      if (profileError) throw profileError;

      // Request notification permission and schedule reminders
      const granted = await requestNotificationPermission();
      if (granted) {
        scheduleNotifications(checkinTimes);
      }

      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : (isEnglish ? 'Error saving' : 'Error al guardar'));
      setLoading(false);
    }
  };

  const canProceed = () => {
    if (step === 'name') return nombre.trim().length >= 2;
    if (step === 'gender') return genero !== '';
    if (step === 'bloodtype') return true; // optional
    if (step === 'birthdate') return fechaNacimiento !== '';
    if (step === 'cycle') return true;
    if (step === 'schedule') return true;
    return false;
  };

  const totalSteps = showCycleStep ? 6 : 5;

  const stepOrder: SetupStep[] = showCycleStep
    ? ['name', 'gender', 'bloodtype', 'birthdate', 'cycle', 'schedule']
    : ['name', 'gender', 'bloodtype', 'birthdate', 'schedule'];

  const displayIndex = stepOrder.indexOf(step) + 1;

  // Time picker helpers
  const updateTime = (index: number, time: string) => {
    setCheckinTimes(prev => prev.map((t, i) => i === index ? { ...t, time } : t));
  };

  const toggleSlot = (index: number) => {
    setCheckinTimes(prev => prev.map((t, i) => i === index ? { ...t, enabled: !t.enabled } : t));
  };

  const slotLabels = {
    morning:  { en: 'Morning',  es: 'Mañana'   },
    midday:   { en: 'Midday',   es: 'Mediodía'  },
    evening:  { en: 'Evening',  es: 'Tarde'     },
    night:    { en: 'Night',    es: 'Noche'     },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-amber-50 flex items-center justify-center p-4">
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
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            {isEnglish
              ? 'Complete your trading account setup'
              : 'Completa la configuracion de tu cuenta de trading'}
          </h1>
          <p className="text-gray-600 mt-2">
            {isEnglish
              ? '2 minutes. Your biological intelligence engine activates immediately after.'
              : '2 minutos. Tu motor de inteligencia biologica se activa inmediatamente despues.'}
          </p>
          <p className="text-gray-500 mt-1 text-sm">
            {isEnglish ? `Step ${displayIndex} of ${totalSteps}` : `Paso ${displayIndex} de ${totalSteps}`}
          </p>
          <div className="flex gap-2 justify-center mt-4">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-2 w-8 rounded-full transition-colors ${
                  i < displayIndex ? 'bg-rose-400' : 'bg-gray-200'
                }`}
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

          {/* Step: Name */}
          {step === 'name' && (
            <div className="space-y-4">
              <div className="w-16 h-16 bg-rose-100 rounded-full mx-auto flex items-center justify-center">
                <User className="w-8 h-8 text-rose-500" />
              </div>
              <h2 className="text-xl font-semibold text-center text-gray-900">
                {isEnglish ? "What's your name?" : 'Como te llamas?'}
              </h2>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-400 focus:border-transparent outline-none transition-all text-center text-lg"
                placeholder={isEnglish ? 'Your name' : 'Tu nombre'}
                autoFocus
              />
            </div>
          )}

          {/* Step: Gender */}
          {step === 'gender' && (
            <div className="space-y-4">
              <div className="w-16 h-16 bg-amber-100 rounded-full mx-auto flex items-center justify-center">
                <Heart className="w-8 h-8 text-amber-500" />
              </div>
              <h2 className="text-xl font-semibold text-center text-gray-900">
                {isEnglish ? "What's your gender?" : 'Cual es tu genero?'}
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'femenino',  labelEs: 'Femenino',  labelEn: 'Female', icon: '♀' },
                  { value: 'masculino', labelEs: 'Masculino', labelEn: 'Male',   icon: '♂' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setGenero(option.value)}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      genero === option.value
                        ? 'border-rose-400 bg-rose-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-2xl block mb-1">{option.icon}</span>
                    <span className="font-medium text-gray-700">
                      {isEnglish ? option.labelEn : option.labelEs}
                    </span>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setGenero('prefiero_no_decir')}
                className={`w-full p-3 rounded-xl border-2 transition-all ${
                  genero === 'prefiero_no_decir'
                    ? 'border-rose-400 bg-rose-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="font-medium text-gray-700">
                  {isEnglish ? 'Prefer not to say' : 'Prefiero no decir'}
                </span>
              </button>
            </div>
          )}

          {/* Step: Blood Type */}
          {step === 'bloodtype' && (
            <div className="space-y-4">
              <div className="w-16 h-16 bg-red-100 rounded-full mx-auto flex items-center justify-center">
                <span className="text-2xl">🩸</span>
              </div>
              <h2 className="text-xl font-semibold text-center text-gray-900">
                {isEnglish ? 'Blood type' : 'Tipo de sangre'}
              </h2>
              <p className="text-sm text-center text-emerald-700 font-medium bg-emerald-50 rounded-xl px-4 py-2">
                {isEnglish
                  ? 'Optional — increases your data trading value by 40%'
                  : 'Opcional — aumenta el valor de tus datos en un 40%'}
              </p>
              <div className="grid grid-cols-4 gap-2">
                {BLOOD_TYPES.map((bt) => (
                  <button
                    key={bt}
                    onClick={() => setBloodType(bloodType === bt ? '' : bt)}
                    className={`py-3 rounded-xl border-2 font-bold text-sm transition-all ${
                      bloodType === bt
                        ? 'border-rose-400 bg-rose-50 text-rose-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    {bt}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 text-center">
                {isEnglish ? 'Tap to select. Tap again to deselect.' : 'Toca para seleccionar. Toca de nuevo para deseleccionar.'}
              </p>
            </div>
          )}

          {/* Step: Birthdate */}
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
                  : 'Tu fecha de nacimiento activa tu pronostico biologico'}
              </p>
              <input
                type="date"
                value={fechaNacimiento}
                onChange={(e) => {
                  setFechaNacimiento(e.target.value);
                  setBirthdateError(false);
                }}
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
                      : 'La fecha de nacimiento es necesaria para calcular tus ciclos y elegibilidad para investigacion.'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step: Cycle (female only) */}
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
                  {isEnglish ? 'Average cycle length' : 'Duracion promedio del ciclo'}
                </label>
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={() => setCycleLength(Math.max(21, cycleLength - 1))}
                    className="w-10 h-10 rounded-full border border-gray-200 hover:bg-gray-50"
                  >
                    -
                  </button>
                  <span className="text-2xl font-bold text-rose-500 w-16 text-center">
                    {cycleLength}
                  </span>
                  <button
                    onClick={() => setCycleLength(Math.min(35, cycleLength + 1))}
                    className="w-10 h-10 rounded-full border border-gray-200 hover:bg-gray-50"
                  >
                    +
                  </button>
                  <span className="text-gray-500">{isEnglish ? 'days' : 'dias'}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {isEnglish ? 'Start of your last period' : 'Inicio de tu ultimo periodo'}
                </label>
                <input
                  type="date"
                  value={lastPeriodDate}
                  onChange={(e) => setLastPeriodDate(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-400 focus:border-transparent outline-none transition-all text-center"
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>
          )}

          {/* Step: Schedule (deposit times) */}
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
                        slot.enabled
                          ? 'border-rose-300 bg-rose-50'
                          : 'border-gray-200 bg-gray-50 opacity-60'
                      }`}
                    >
                      {/* Toggle */}
                      <button
                        onClick={() => toggleSlot(index)}
                        className={`w-10 h-6 rounded-full transition-colors flex-shrink-0 relative ${
                          slot.enabled ? 'bg-rose-400' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                            slot.enabled ? 'translate-x-4' : 'translate-x-0.5'
                          }`}
                        />
                      </button>

                      {/* Label */}
                      <span className="flex-1 font-medium text-gray-700 text-sm">{label}</span>

                      {/* Time picker */}
                      <input
                        type="time"
                        value={slot.time}
                        onChange={(e) => updateTime(index, e.target.value)}
                        disabled={!slot.enabled}
                        className="px-2 py-1 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-rose-400 focus:border-transparent outline-none disabled:opacity-40 bg-white"
                      />
                    </div>
                  );
                })}
              </div>

              <p className="text-xs text-gray-400 text-center">
                {isEnglish
                  ? 'You can change these anytime in Settings'
                  : 'Puedes cambiarlos en cualquier momento en Ajustes'}
              </p>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex gap-3 mt-6">
            {displayIndex > 1 && (
              <button
                onClick={prevStep}
                className="flex-1 py-3 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-5 h-5" />
                {isEnglish ? 'Back' : 'Atras'}
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
                  {step === 'schedule'
                    ? isEnglish ? 'Activate my account' : 'Activar mi cuenta'
                    : step === 'bloodtype' && !bloodType
                    ? isEnglish ? 'Skip' : 'Omitir'
                    : isEnglish ? 'Next' : 'Siguiente'}
                  {step !== 'schedule' && <ArrowRight className="w-5 h-5" />}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
