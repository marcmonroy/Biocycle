import { useState, useEffect } from 'react';
import { supabase, Profile } from '../lib/supabase';
import { PhaseData } from '../utils/phaseEngine';
import {
  Heart, Dumbbell, Brain, Zap, Users, Flame, Loader2, Check, Lock,
  Moon, Clock, Droplets, Coffee, Wine, Apple, FlaskConical, TrendingUp, AlertTriangle
} from 'lucide-react';

interface CheckinScreenProps {
  profile: Profile;
  phaseData: PhaseData;
  onComplete: () => void;
}

type Tab = 'daily' | 'weekly' | 'studies' | 'nutrition';
type Factor = 'emotional' | 'physical' | 'cognitive' | 'stress' | 'social' | 'sexual' | 'anxiety';
type WakeFeeling = 'exhausted' | 'tired' | 'rested' | 'energized';
type SugarIntake = 'low' | 'medium' | 'high';

type FactorConfig = {
  key: Factor;
  label: string;
  icon: typeof Heart;
  color: string;
};

const factorsBaseEs: FactorConfig[] = [
  { key: 'emotional', label: 'Emocional', icon: Heart, color: '#FF6B6B' },
  { key: 'physical', label: 'Fisico', icon: Dumbbell, color: '#7B61FF' },
  { key: 'cognitive', label: 'Cognitivo', icon: Brain, color: '#00D4A1' },
  { key: 'stress', label: 'Estres', icon: Zap, color: '#F5C842' },
  { key: 'social', label: 'Social', icon: Users, color: '#8B95B0' },
];

const factorsBaseEn: FactorConfig[] = [
  { key: 'emotional', label: 'Emotional', icon: Heart, color: '#FF6B6B' },
  { key: 'physical', label: 'Physical', icon: Dumbbell, color: '#7B61FF' },
  { key: 'cognitive', label: 'Cognitive', icon: Brain, color: '#00D4A1' },
  { key: 'stress', label: 'Stress', icon: Zap, color: '#F5C842' },
  { key: 'social', label: 'Social', icon: Users, color: '#8B95B0' },
];

const sexualFactorEs: FactorConfig = { key: 'sexual', label: 'Energia Sexual', icon: Flame, color: '#FF6B6B' };
const sexualFactorEn: FactorConfig = { key: 'sexual', label: 'Sexual Energy', icon: Flame, color: '#FF6B6B' };

const anxietyFactorEs: FactorConfig = { key: 'anxiety', label: 'Nivel de Ansiedad', icon: AlertTriangle, color: '#F5C842' };
const anxietyFactorEn: FactorConfig = { key: 'anxiety', label: 'Anxiety Level', icon: AlertTriangle, color: '#F5C842' };

function calculateAge(birthDate: string): number {
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
  return calculateAge(profile.fecha_nacimiento) >= 18;
}

function getISOWeek(date: Date): { week: number; year: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { week, year: d.getUTCFullYear() };
}

function getNextWeekDate(): Date {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  const nextMonday = new Date(now);
  nextMonday.setDate(now.getDate() + daysUntilMonday);
  return nextMonday;
}

function getDepositLabel(isSpanish: boolean): { label: string; emoji: string } {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) {
    return { label: isSpanish ? 'Depósito Matutino' : 'Morning Deposit', emoji: '🌅' };
  } else if (hour >= 11 && hour < 15) {
    return { label: isSpanish ? 'Depósito del Mediodía' : 'Midday Deposit', emoji: '☀️' };
  } else if (hour >= 15 && hour < 20) {
    return { label: isSpanish ? 'Depósito Vespertino' : 'Evening Deposit', emoji: '🌇' };
  } else {
    return { label: isSpanish ? 'Depósito Nocturno' : 'Night Deposit', emoji: '🌙' };
  }
}

export function CheckinScreen({ profile, phaseData, onComplete }: CheckinScreenProps) {
  const [activeTab, setActiveTab] = useState<Tab>('daily');
  const isSpanish = profile.idioma === 'ES';
  const showSexual = isAdult(profile);
  const depositLabel = getDepositLabel(isSpanish);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'daily', label: isSpanish ? 'Diario' : 'Daily' },
    { key: 'weekly', label: isSpanish ? 'Semanal' : 'Weekly' },
    { key: 'studies', label: isSpanish ? 'Estudios' : 'Studies' },
    { key: 'nutrition', label: isSpanish ? 'Nutricion' : 'Nutrition' },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A1A] pb-24">
      <div className="bg-[#0A0A1A] border-b border-[#1E1E3A] px-5 pt-12 pb-4">
        <h1 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: 'Clash Display, system-ui, sans-serif' }}>
          {isSpanish ? 'Centro de Datos' : 'Data Hub'}
        </h1>
        {/* Time-of-day deposit label */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">{depositLabel.emoji}</span>
          <span className="text-[#F5C842] font-semibold text-base tracking-wide">
            {depositLabel.label}
          </span>
        </div>
        <div className="flex gap-1 bg-[#111126] border border-[#1E1E3A] rounded-xl p-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2 px-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-[#7B61FF] text-white shadow-sm'
                  : 'text-[#8B95B0] hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 pt-4">
        {activeTab === 'daily' && (
          <DailyTab profile={profile} phaseData={phaseData} onComplete={onComplete} showSexual={showSexual} isSpanish={isSpanish} />
        )}
        {activeTab === 'weekly' && (
          <WeeklyTab profile={profile} isSpanish={isSpanish} showSexual={showSexual} />
        )}
        {activeTab === 'studies' && (
          <StudiesTab isSpanish={isSpanish} />
        )}
        {activeTab === 'nutrition' && (
          <NutritionTab profile={profile} isSpanish={isSpanish} showSexual={showSexual} />
        )}
      </div>
    </div>
  );
}

interface DailyTabProps {
  profile: Profile;
  phaseData: PhaseData;
  onComplete: () => void;
  showSexual: boolean;
  isSpanish: boolean;
}

function DailyTab({ profile, phaseData, onComplete, showSexual, isSpanish }: DailyTabProps) {
  const baseFacs = isSpanish ? factorsBaseEs : factorsBaseEn;
  const sexualFac = isSpanish ? sexualFactorEs : sexualFactorEn;
  const anxietyFac = isSpanish ? anxietyFactorEs : anxietyFactorEn;

  const factors = showSexual
    ? [...baseFacs, sexualFac, anxietyFac]
    : [...baseFacs, anxietyFac];

  const [values, setValues] = useState<Record<Factor, number>>({
    emotional: 5,
    physical: 5,
    cognitive: 5,
    stress: 5,
    social: 5,
    sexual: 5,
    anxiety: 5,
  });
  const [notas, setNotas] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingToday, setCheckingToday] = useState(true);
  const [alreadyCheckedIn, setAlreadyCheckedIn] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkTodayCheckin();
  }, [profile.id]);

  const checkTodayCheckin = async () => {
    setCheckingToday(true);
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('checkins')
      .select('id')
      .eq('user_id', profile.id)
      .eq('checkin_date', today)
      .maybeSingle();

    if (!error && data) {
      setAlreadyCheckedIn(true);
    }
    setCheckingToday(false);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    const factorsToAverage = showSexual
      ? [values.emotional, values.physical, values.cognitive, values.stress, values.social, values.sexual]
      : [values.emotional, values.physical, values.cognitive, values.stress, values.social];

    const avgScore = factorsToAverage.reduce((a, b) => a + b, 0) / factorsToAverage.length;

    try {
      const insertData: Record<string, unknown> = {
        user_id: profile.id,
        checkin_date: new Date().toISOString().split('T')[0],
        factor_emocional: values.emotional,
        factor_fisico: values.physical,
        factor_cognitivo: values.cognitive,
        factor_estres: values.stress,
        factor_social: values.social,
        factor_ansiedad: values.anxiety,
        calidad_score: avgScore,
        phase_at_checkin: phaseData.phase,
        notas: notas || null,
      };

      if (showSexual) {
        insertData.factor_sexual = values.sexual;
      }

      const { error: insertError } = await supabase.from('checkins').insert(insertData);

      if (insertError) throw insertError;

      setSuccess(true);
      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : (isSpanish ? 'Error al guardar' : 'Error saving'));
    } finally {
      setLoading(false);
    }
  };

  if (checkingToday) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#7B61FF]" />
      </div>
    );
  }

  if (alreadyCheckedIn) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-20 h-20 bg-[#1E1E3A] rounded-full mx-auto flex items-center justify-center mb-4">
            <Lock className="w-10 h-10 text-[#8B95B0]" />
          </div>
          <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Clash Display, system-ui, sans-serif' }}>
            {isSpanish ? 'Deposito ya realizado hoy.' : 'Deposit already made today.'}
          </h2>
          <p className="text-[#8B95B0] mt-2">
            {isSpanish ? 'Vuelve manana.' : 'Come back tomorrow.'}
          </p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-20 h-20 bg-[#00D4A1]/20 border border-[#00D4A1]/40 rounded-full mx-auto flex items-center justify-center mb-4">
            <Check className="w-10 h-10 text-[#00D4A1]" />
          </div>
          <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Clash Display, system-ui, sans-serif' }}>
            {isSpanish ? 'Deposito recibido.' : 'Deposit received.'}
          </h2>
          <p className="text-[#8B95B0] mt-2">
            {isSpanish ? 'Conocerte a ti mismo tiene valor.' : 'Knowing yourself pays.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-950/50 border border-red-900/50 rounded-xl p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      {factors.map(({ key, label, icon: Icon, color }) => (
        <div key={key} className="bg-[#111126] border border-[#1E1E3A] rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: color + '22', border: `1px solid ${color}44` }}>
              <Icon className="w-5 h-5" style={{ color }} />
            </div>
            <div className="flex-1">
              <p className="font-bold text-white">{label}</p>
              <p className="text-sm text-[#8B95B0]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{values[key]}/10</p>
            </div>
          </div>

          <input
            type="range"
            min="1"
            max="10"
            value={values[key]}
            onChange={(e) => setValues({ ...values, [key]: parseInt(e.target.value) })}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, ${color} 0%, ${color} ${(values[key] - 1) / 9 * 100}%, #1E1E3A ${(values[key] - 1) / 9 * 100}%, #1E1E3A 100%)`
            }}
          />
          <div className="flex justify-between mt-1">
            <span className="text-xs text-[#4A5568]">1</span>
            <span className="text-xs text-[#4A5568]">10</span>
          </div>
        </div>
      ))}

      <div className="bg-[#111126] border border-[#1E1E3A] rounded-2xl p-5">
        <label className="block font-bold text-white mb-3">
          {isSpanish ? 'Notas (opcional)' : 'Notes (optional)'}
        </label>
        <textarea
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          placeholder={isSpanish ? 'Como fue tu dia? Algo que quieras recordar...' : 'How was your day? Anything you want to remember...'}
          className="w-full h-24 p-4 bg-[#0A0A1A] border border-[#1E1E3A] rounded-xl resize-none focus:ring-2 focus:ring-[#7B61FF] outline-none text-white placeholder-[#4A5568]"
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full py-4 bg-[#F5C842] text-[#0A0A1A] font-bold rounded-2xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          isSpanish ? 'Depositar' : 'Deposit'
        )}
      </button>
    </div>
  );
}

interface WeeklyTabProps {
  profile: Profile;
  isSpanish: boolean;
  showSexual: boolean;
}

function WeeklyTab({ profile, isSpanish, showSexual }: WeeklyTabProps) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [completedThisWeek, setCompletedThisWeek] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [bedtime, setBedtime] = useState('22:00');
  const [wakeTime, setWakeTime] = useState('07:00');
  const [sleepQuality, setSleepQuality] = useState(5);
  const [interruptions, setInterruptions] = useState(0);
  const [wakeFeeling, setWakeFeeling] = useState<WakeFeeling | ''>('');
  const [dreamRecall, setDreamRecall] = useState(false);
  const [sexualEnergy, setSexualEnergy] = useState(5);
  const [anxietyAffectedSleep, setAnxietyAffectedSleep] = useState(false);

  const { week, year } = getISOWeek(new Date());

  useEffect(() => {
    checkWeeklyCompletion();
  }, [profile.id]);

  const checkWeeklyCompletion = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('weekly_checkins')
      .select('id')
      .eq('user_id', profile.id)
      .eq('year', year)
      .eq('week_number', week)
      .maybeSingle();

    if (data) {
      setCompletedThisWeek(true);
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!wakeFeeling) {
      setError(isSpanish ? 'Selecciona como despertaste' : 'Select how you woke up');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const insertData: Record<string, unknown> = {
        user_id: profile.id,
        week_number: week,
        year: year,
        study_type: 'sleep',
        bedtime: bedtime,
        wake_time: wakeTime,
        sleep_quality: sleepQuality,
        interruptions: interruptions,
        wake_feeling: wakeFeeling,
        dream_recall: dreamRecall,
        anxiety_affected_sleep: anxietyAffectedSleep,
      };

      if (showSexual) {
        insertData.sexual_energy = sexualEnergy;
      }

      const { error: insertError } = await supabase.from('weekly_checkins').insert(insertData);

      if (insertError) throw insertError;
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : (isSpanish ? 'Error al guardar' : 'Error saving'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#2D1B69]" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-20 h-20 bg-emerald-500 rounded-full mx-auto flex items-center justify-center mb-4">
            <Check className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">
            {isSpanish ? 'Estudio completado.' : 'Study completed.'}
          </h2>
          <p className="text-gray-500 mt-2">
            {isSpanish ? 'Gracias por tu contribucion.' : 'Thank you for your contribution.'}
          </p>
        </div>
      </div>
    );
  }

  if (completedThisWeek) {
    const nextAvailable = getNextWeekDate();
    const formattedDate = nextAvailable.toLocaleDateString(isSpanish ? 'es-ES' : 'en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });

    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-20 h-20 bg-[#2D1B69] rounded-full mx-auto flex items-center justify-center mb-4">
            <Check className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">
            {isSpanish ? 'Estudio semanal completado' : 'Weekly study completed'}
          </h2>
          <p className="text-gray-500 mt-2">
            {isSpanish ? `Proximo disponible: ${formattedDate}` : `Next available: ${formattedDate}`}
          </p>
        </div>
      </div>
    );
  }

  const wakeFeelings: { value: WakeFeeling; labelEs: string; labelEn: string }[] = [
    { value: 'exhausted', labelEs: 'Agotado/a', labelEn: 'Exhausted' },
    { value: 'tired', labelEs: 'Cansado/a', labelEn: 'Tired' },
    { value: 'rested', labelEs: 'Descansado/a', labelEn: 'Rested' },
    { value: 'energized', labelEs: 'Energizado/a', labelEn: 'Energized' },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-[#2D1B69] to-[#4A2D8C] rounded-2xl p-5 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Moon className="w-6 h-6" />
          <h2 className="text-lg font-bold">{isSpanish ? 'Estudio del Sueno' : 'Sleep Study'}</h2>
        </div>
        <p className="text-white/80 text-sm">
          {isSpanish
            ? 'Esta semana exploramos tus patrones de sueno. Solo una vez por semana.'
            : 'This week we explore your sleep patterns. Once per week only.'}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-red-600 text-sm">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-lg p-5 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Clock className="w-4 h-4 inline mr-1" />
              {isSpanish ? 'Hora de dormir' : 'Bedtime'}
            </label>
            <input
              type="time"
              value={bedtime}
              onChange={(e) => setBedtime(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 rounded-xl border-0 focus:ring-2 focus:ring-[#2D1B69] outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Clock className="w-4 h-4 inline mr-1" />
              {isSpanish ? 'Hora de despertar' : 'Wake time'}
            </label>
            <input
              type="time"
              value={wakeTime}
              onChange={(e) => setWakeTime(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 rounded-xl border-0 focus:ring-2 focus:ring-[#2D1B69] outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {isSpanish ? 'Calidad del sueno' : 'Sleep quality'}: {sleepQuality}/10
          </label>
          <input
            type="range"
            min="1"
            max="10"
            value={sleepQuality}
            onChange={(e) => setSleepQuality(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #2D1B69 0%, #2D1B69 ${(sleepQuality - 1) / 9 * 100}%, #e5e7eb ${(sleepQuality - 1) / 9 * 100}%, #e5e7eb 100%)`
            }}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {isSpanish ? 'Interrupciones' : 'Interruptions'}: {interruptions}
          </label>
          <input
            type="range"
            min="0"
            max="10"
            value={interruptions}
            onChange={(e) => setInterruptions(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #f97316 0%, #f97316 ${interruptions / 10 * 100}%, #e5e7eb ${interruptions / 10 * 100}%, #e5e7eb 100%)`
            }}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            {isSpanish ? 'Como despertaste?' : 'How did you wake up?'}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {wakeFeelings.map((feeling) => (
              <button
                key={feeling.value}
                onClick={() => setWakeFeeling(feeling.value)}
                className={`py-3 px-4 rounded-xl text-sm font-medium transition-all ${
                  wakeFeeling === feeling.value
                    ? 'bg-[#2D1B69] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {isSpanish ? feeling.labelEs : feeling.labelEn}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between py-3 border-t border-gray-100">
          <span className="text-sm font-medium text-gray-700">
            {isSpanish ? 'Recuerdo de suenos' : 'Dream recall'}
          </span>
          <button
            onClick={() => setDreamRecall(!dreamRecall)}
            className={`w-14 h-8 rounded-full transition-all ${
              dreamRecall ? 'bg-[#2D1B69]' : 'bg-gray-200'
            }`}
          >
            <div
              className={`w-6 h-6 bg-white rounded-full shadow transition-transform ${
                dreamRecall ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between py-3 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-medium text-gray-700">
              {isSpanish ? 'La ansiedad afecto mi sueno' : 'Anxiety affected my sleep'}
            </span>
          </div>
          <button
            onClick={() => setAnxietyAffectedSleep(!anxietyAffectedSleep)}
            className={`w-14 h-8 rounded-full transition-all ${
              anxietyAffectedSleep ? 'bg-amber-500' : 'bg-gray-200'
            }`}
          >
            <div
              className={`w-6 h-6 bg-white rounded-full shadow transition-transform ${
                anxietyAffectedSleep ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {showSexual && (
          <div className="pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <Flame className="w-4 h-4 text-[#FF6B6B]" />
              <label className="text-sm font-medium text-gray-700">
                {isSpanish ? 'Energia sexual hoy' : 'Sexual energy today'}: {sexualEnergy}/10
              </label>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              value={sexualEnergy}
              onChange={(e) => setSexualEnergy(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #FF6B6B 0%, #FF6B6B ${(sexualEnergy - 1) / 9 * 100}%, #e5e7eb ${(sexualEnergy - 1) / 9 * 100}%, #e5e7eb 100%)`
              }}
            />
          </div>
        )}
      </div>

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full py-4 bg-gradient-to-r from-[#2D1B69] to-[#FF6B6B] text-white font-bold rounded-2xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {submitting ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          isSpanish ? 'Completar Estudio' : 'Complete Study'
        )}
      </button>
    </div>
  );
}

interface StudiesTabProps {
  isSpanish: boolean;
}

function StudiesTab({ isSpanish }: StudiesTabProps) {
  const [userCount, setUserCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const targetCount = 500;

  useEffect(() => {
    fetchUserCount();
  }, []);

  const fetchUserCount = async () => {
    const { count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    setUserCount(count || 0);
    setLoading(false);
  };

  const progressPercent = Math.min((userCount / targetCount) * 100, 100);

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-400/20 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />

        <div className="relative">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-amber-400/20 rounded-xl flex items-center justify-center">
              <FlaskConical className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {isSpanish ? 'Mercado de Investigacion' : 'Research Marketplace'}
              </h2>
              <span className="text-xs bg-amber-400/20 text-amber-400 px-2 py-0.5 rounded-full">
                {isSpanish ? 'Proximamente' : 'Coming Soon'}
              </span>
            </div>
          </div>

          <p className="text-gray-300 text-sm mb-4">
            {isSpanish
              ? 'El Trading Floor se activa con 500 Data Traders. Estas construyendo el mercado.'
              : 'The Trading Floor activates at 500 Data Traders. You are building the market.'}
          </p>

          <p className="text-gray-400 text-xs mb-6">
            {isSpanish
              ? 'Categorias de estudios incluyen: salud hormonal, bienestar sexual, nutricion, sueno e investigacion de ejercicio. Cada uno te paga directamente.'
              : 'Upcoming study categories include hormonal health, sexual wellness, nutrition, sleep, and exercise research. Each pays you directly.'}
          </p>

          <div className="bg-white/10 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-300">
                {isSpanish ? 'Progreso hacia activacion' : 'Progress to activation'}
              </span>
              <span className="text-sm font-bold text-amber-400">
                {loading ? '...' : `${userCount}/${targetCount}`}
              </span>
            </div>
            <div className="h-3 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex items-center gap-2 mt-3">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-gray-400">
                {isSpanish
                  ? `${targetCount - userCount} inversores mas necesarios`
                  : `${targetCount - userCount} more investors needed`}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-5 opacity-50">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center">
            <Lock className="w-8 h-8 text-gray-300" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-400">
              {isSpanish ? 'Estudio de Fertilidad' : 'Fertility Study'}
            </h3>
            <p className="text-sm text-gray-300">$50 USD</p>
            <p className="text-xs text-gray-300 mt-1">
              {isSpanish ? '4 semanas - Universidad de Stanford' : '4 weeks - Stanford University'}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-5 opacity-50">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center">
            <Lock className="w-8 h-8 text-gray-300" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-400">
              {isSpanish ? 'Estudio de Energia' : 'Energy Study'}
            </h3>
            <p className="text-sm text-gray-300">$35 USD</p>
            <p className="text-xs text-gray-300 mt-1">
              {isSpanish ? '2 semanas - MIT Health Lab' : '2 weeks - MIT Health Lab'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

type SexualNutritionImpact = 'decreased' | 'neutral' | 'increased';

interface NutritionTabProps {
  profile: Profile;
  isSpanish: boolean;
  showSexual: boolean;
}

function NutritionTab({ profile, isSpanish, showSexual }: NutritionTabProps) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [alreadyLogged, setAlreadyLogged] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [meals, setMeals] = useState(3);
  const [hydration, setHydration] = useState(6);
  const [caffeine, setCaffeine] = useState(1);
  const [alcohol, setAlcohol] = useState(0);
  const [sugarIntake, setSugarIntake] = useState<SugarIntake>('medium');
  const [cycleAligned, setCycleAligned] = useState(false);
  const [sexualNutritionImpact, setSexualNutritionImpact] = useState<SexualNutritionImpact>('neutral');

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    checkTodayLog();
  }, [profile.id]);

  const checkTodayLog = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('nutrition_logs')
      .select('id')
      .eq('user_id', profile.id)
      .eq('log_date', today)
      .maybeSingle();

    if (data) {
      setAlreadyLogged(true);
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id ?? profile.id;

      const insertData: Record<string, unknown> = {
        user_id: userId,
        log_date: today,
        meals_today: meals,
        hydration,
        caffeine,
        alcohol,
        sugar_intake: sugarIntake,
        cycle_eating: cycleAligned,
      };

      if (showSexual) {
        insertData.sexual_nutrition_impact = sexualNutritionImpact;
      }

      console.log("Attempting nutrition save with data:", insertData);

      const { error: insertError } = await supabase.from('nutrition_logs').insert(insertData);

      if (insertError) {
        console.log("Nutrition save error:", insertError);
        throw insertError;
      }
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : (isSpanish ? 'Error al guardar' : 'Error saving'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#2D1B69]" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-20 h-20 bg-emerald-500 rounded-full mx-auto flex items-center justify-center mb-4">
            <Check className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">
            {isSpanish ? 'Nutricion registrada.' : 'Nutrition logged.'}
          </h2>
          <p className="text-gray-500 mt-2">
            {isSpanish ? 'Buen seguimiento!' : 'Great tracking!'}
          </p>
        </div>
      </div>
    );
  }

  if (alreadyLogged) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-20 h-20 bg-gray-200 rounded-full mx-auto flex items-center justify-center mb-4">
            <Lock className="w-10 h-10 text-gray-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">
            {isSpanish ? 'Ya registraste hoy.' : 'Already logged today.'}
          </h2>
          <p className="text-gray-500 mt-2">
            {isSpanish ? 'Vuelve manana.' : 'Come back tomorrow.'}
          </p>
        </div>
      </div>
    );
  }

  const sugarOptions: { value: SugarIntake; labelEs: string; labelEn: string }[] = [
    { value: 'low', labelEs: 'Bajo', labelEn: 'Low' },
    { value: 'medium', labelEs: 'Medio', labelEn: 'Medium' },
    { value: 'high', labelEs: 'Alto', labelEn: 'High' },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Apple className="w-6 h-6" />
          <h2 className="text-lg font-bold">{isSpanish ? 'Nutricion Diaria' : 'Daily Nutrition'}</h2>
        </div>
        <p className="text-white/80 text-sm">
          {isSpanish
            ? 'Registra tu alimentacion para entender patrones.'
            : 'Log your nutrition to understand patterns.'}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-red-600 text-sm">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-lg p-5 space-y-5">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Apple className="w-4 h-4 text-emerald-500" />
            <label className="text-sm font-medium text-gray-700">
              {isSpanish ? 'Comidas hoy' : 'Meals today'}: {meals}
            </label>
          </div>
          <input
            type="range"
            min="1"
            max="5"
            value={meals}
            onChange={(e) => setMeals(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #10b981 0%, #10b981 ${(meals - 1) / 4 * 100}%, #e5e7eb ${(meals - 1) / 4 * 100}%, #e5e7eb 100%)`
            }}
          />
          <div className="flex justify-between mt-1">
            <span className="text-xs text-gray-400">1</span>
            <span className="text-xs text-gray-400">5</span>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <Droplets className="w-4 h-4 text-blue-500" />
            <label className="text-sm font-medium text-gray-700">
              {isSpanish ? 'Vasos de agua' : 'Glasses of water'}: {hydration}
            </label>
          </div>
          <input
            type="range"
            min="0"
            max="12"
            value={hydration}
            onChange={(e) => setHydration(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${hydration / 12 * 100}%, #e5e7eb ${hydration / 12 * 100}%, #e5e7eb 100%)`
            }}
          />
          <div className="flex justify-between mt-1">
            <span className="text-xs text-gray-400">0</span>
            <span className="text-xs text-gray-400">12</span>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <Coffee className="w-4 h-4 text-amber-700" />
            <label className="text-sm font-medium text-gray-700">
              {isSpanish ? 'Tazas de cafeina' : 'Cups of caffeine'}: {caffeine}
            </label>
          </div>
          <input
            type="range"
            min="0"
            max="6"
            value={caffeine}
            onChange={(e) => setCaffeine(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #92400e 0%, #92400e ${caffeine / 6 * 100}%, #e5e7eb ${caffeine / 6 * 100}%, #e5e7eb 100%)`
            }}
          />
          <div className="flex justify-between mt-1">
            <span className="text-xs text-gray-400">0</span>
            <span className="text-xs text-gray-400">6</span>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <Wine className="w-4 h-4 text-rose-600" />
            <label className="text-sm font-medium text-gray-700">
              {isSpanish ? 'Bebidas alcoholicas' : 'Alcoholic drinks'}: {alcohol}
            </label>
          </div>
          <input
            type="range"
            min="0"
            max="6"
            value={alcohol}
            onChange={(e) => setAlcohol(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #e11d48 0%, #e11d48 ${alcohol / 6 * 100}%, #e5e7eb ${alcohol / 6 * 100}%, #e5e7eb 100%)`
            }}
          />
          <div className="flex justify-between mt-1">
            <span className="text-xs text-gray-400">0</span>
            <span className="text-xs text-gray-400">6</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            {isSpanish ? 'Consumo de azucar' : 'Sugar intake'}
          </label>
          <div className="grid grid-cols-3 gap-2">
            {sugarOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setSugarIntake(option.value)}
                className={`py-3 px-4 rounded-xl text-sm font-medium transition-all ${
                  sugarIntake === option.value
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {isSpanish ? option.labelEs : option.labelEn}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between py-3 border-t border-gray-100">
          <span className="text-sm font-medium text-gray-700">
            {isSpanish ? 'Comi segun mi ciclo' : 'Ate according to my cycle'}
          </span>
          <button
            onClick={() => setCycleAligned(!cycleAligned)}
            className={`w-14 h-8 rounded-full transition-all ${
              cycleAligned ? 'bg-emerald-500' : 'bg-gray-200'
            }`}
          >
            <div
              className={`w-6 h-6 bg-white rounded-full shadow transition-transform ${
                cycleAligned ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {showSexual && (
          <div className="pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <Flame className="w-4 h-4 text-[#FF6B6B]" />
              <label className="text-sm font-medium text-gray-700">
                {isSpanish ? 'Impacto en energia sexual' : 'Sexual energy impact of diet'}
              </label>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {([
                { value: 'decreased' as SexualNutritionImpact, labelEs: 'Disminuyo', labelEn: 'Decreased' },
                { value: 'neutral' as SexualNutritionImpact, labelEs: 'Neutral', labelEn: 'Neutral' },
                { value: 'increased' as SexualNutritionImpact, labelEs: 'Aumento', labelEn: 'Increased' },
              ]).map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSexualNutritionImpact(option.value)}
                  className={`py-3 px-4 rounded-xl text-sm font-medium transition-all ${
                    sexualNutritionImpact === option.value
                      ? 'bg-[#FF6B6B] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {isSpanish ? option.labelEs : option.labelEn}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold rounded-2xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {submitting ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          isSpanish ? 'Registrar Nutricion' : 'Log Nutrition'
        )}
      </button>
    </div>
  );
}
