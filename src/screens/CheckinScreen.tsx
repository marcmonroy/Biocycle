import { useState, useEffect, useMemo } from 'react';
import { supabase, Profile } from '../lib/supabase';
import { PhaseData } from '../utils/phaseEngine';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import {
  Heart, Dumbbell, Brain, Zap, Users, Flame, Loader2, Check, Lock,
  Moon, Clock, Droplets, Coffee, Wine, Apple, FlaskConical, TrendingUp, AlertTriangle
} from 'lucide-react';

interface CheckinScreenProps {
  profile: Profile;
  phaseData: PhaseData;
  onComplete: () => void;
}

type Factor ='emotional' | 'physical' | 'cognitive' | 'stress' | 'social' | 'sexual' | 'anxiety';
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
  if (hour >= 5 && hour < 12) {
    return { label: isSpanish ? 'Depósito Matutino' : 'Morning Deposit', emoji: '🌅' };
  } else if (hour >= 12 && hour < 19) {
    return { label: isSpanish ? 'Depósito Vespertino' : 'Afternoon Deposit', emoji: '☀️' };
  } else {
    return { label: isSpanish ? 'Depósito Nocturno' : 'Night Deposit', emoji: '🌙' };
  }
}

export function CheckinScreen({ profile, phaseData, onComplete }: CheckinScreenProps) {
  const isSpanish = profile.idioma === 'ES';
  const showSexual = isAdult(profile);
  const depositLabel = getDepositLabel(isSpanish);

  return (
    <div className="min-h-screen bg-[#0A0A1A] pb-24">
      <div className="bg-[#0A0A1A] border-b border-[#1E1E3A] px-5 pt-12 pb-4">
        <h1 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: 'Clash Display, system-ui, sans-serif' }}>
          {isSpanish ? 'Centro de Datos' : 'Data Hub'}
        </h1>
        {/* Time-of-day deposit label */}
        <div className="flex items-center gap-2">
          <span className="text-lg">{depositLabel.emoji}</span>
          <span className="text-[#F5C842] font-semibold text-base tracking-wide">
            {depositLabel.label}
          </span>
        </div>
      </div>

      <div className="px-5 pt-4">
        <DailyTab profile={profile} phaseData={phaseData} onComplete={onComplete} showSexual={showSexual} isSpanish={isSpanish} />
      </div>
    </div>
  );
}

// ── Dimension color palette for charts ─────────────────────────────────────
const DIM_COLORS = {
  physical:  '#F5C842', // gold
  cognitive: '#00D4A1', // green
  emotional: '#FF6B6B', // coral
  stress:    '#7B61FF', // purple
  social:    '#4ECDC4', // teal
  anxiety:   '#FF4444', // red
  sexual:    '#FF69B4', // pink
};

// ── Circular quality gauge ──────────────────────────────────────────────────
function QualityGauge({ pct, isSpanish }: { pct: number; isSpanish: boolean }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const stroke = circ * (1 - pct / 100);
  return (
    <div className="flex flex-col items-center">
      <svg width="96" height="96" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={r} fill="none" stroke="#1E1E3A" strokeWidth="8" />
        <circle
          cx="48" cy="48" r={r} fill="none"
          stroke="#F5C842" strokeWidth="8"
          strokeDasharray={circ}
          strokeDashoffset={stroke}
          strokeLinecap="round"
          transform="rotate(-90 48 48)"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
        <text x="48" y="52" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">{pct}%</text>
      </svg>
      <p className="text-xs text-[#8B95B0] mt-1">{isSpanish ? 'Calidad de datos' : 'Data Quality'}</p>
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

function DailyTab({ profile, phaseData, showSexual, isSpanish }: DailyTabProps) {
  // ── Portfolio data ──────────────────────────────────────────────────────
  type SessionRow = {
    session_date: string;
    time_slot: string;
    phase_at_session: string;
    physical_score: number | null;
    cognitive_score: number | null;
    emotional_score: number | null;
    stress_score: number | null;
    social_score: number | null;
    anxiety_score: number | null;
    sexual_score: number | null;
  };

  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [streak, setStreak] = useState(0);
  const [missedCount, setMissedCount] = useState(0);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    (async () => {
      setLoadingData(true);
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const { data } = await supabase
        .from('conversation_sessions')
        .select('session_date,time_slot,phase_at_session,physical_score,cognitive_score,emotional_score,stress_score,social_score,anxiety_score,sexual_score')
        .eq('user_id', profile.id)
        .eq('session_complete', true)
        .gte('session_date', since.toISOString().split('T')[0])
        .order('session_date', { ascending: true });
      setSessions((data as SessionRow[]) ?? []);

      // Compute missed slots for today
      const todayStr = new Date().toISOString().split('T')[0];
      const todaySlots = new Set(
        (data ?? [])
          .filter((s: SessionRow) => s.session_date === todayStr)
          .map((s: SessionRow) => s.time_slot)
      );
      const missed = ['morning', 'afternoon', 'night'].filter(slot => !todaySlots.has(slot)).length;
      setMissedCount(missed);

      // Compute streak from all completed sessions
      const { data: allSessions } = await supabase
        .from('conversation_sessions')
        .select('session_date')
        .eq('user_id', profile.id)
        .eq('session_complete', true)
        .order('session_date', { ascending: false });

      if (allSessions && allSessions.length > 0) {
        const uniqueDays = [...new Set(allSessions.map((s: { session_date: string }) => s.session_date))];
        let s = 0;
        const today = new Date(); today.setHours(0, 0, 0, 0);
        let cursor = new Date(today);
        for (const day of uniqueDays) {
          const d = new Date(day as string); d.setHours(0, 0, 0, 0);
          const diff = Math.round((cursor.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
          if (diff === 0 || diff === 1) { s++; cursor = d; } else break;
        }
        setStreak(s);
      }
      setLoadingData(false);
    })();
  }, [profile.id]);

  // Build chart data — one point per day, averaged across sessions
  const chartData = useMemo(() => {
    const byDay: Record<string, { counts: Record<string, number>; sums: Record<string, number> }> = {};
    for (const s of sessions) {
      const d = s.session_date;
      if (!byDay[d]) byDay[d] = { counts: {}, sums: {} };
      const dims: (keyof typeof DIM_COLORS)[] = ['physical', 'cognitive', 'emotional', 'stress', 'social', 'anxiety', 'sexual'];
      for (const dim of dims) {
        const val = s[`${dim}_score` as keyof SessionRow] as number | null;
        if (val !== null && val !== undefined) {
          byDay[d].sums[dim] = (byDay[d].sums[dim] ?? 0) + val;
          byDay[d].counts[dim] = (byDay[d].counts[dim] ?? 0) + 1;
        }
      }
    }
    return Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b)).map(([date, { sums, counts }]) => {
      const point: Record<string, unknown> = { date: date.slice(5) }; // MM-DD
      for (const dim of Object.keys(sums)) {
        point[dim] = Math.round((sums[dim] / counts[dim]) * 10) / 10;
      }
      return point;
    });
  }, [sessions]);

  // Data quality score: sessions completed / (days × 3 target) capped 0–100
  const qualityPct = useMemo(() => {
    if (sessions.length === 0) return 0;
    const days = Math.max(1, chartData.length);
    return Math.min(100, Math.round((sessions.length / (days * 3)) * 100));
  }, [sessions, chartData]);

  // Average scores over last 30 days
  const avgScores = useMemo(() => {
    const sums: Record<string, number> = {};
    const counts: Record<string, number> = {};
    for (const s of sessions) {
      const dims: (keyof typeof DIM_COLORS)[] = ['physical', 'cognitive', 'emotional', 'stress', 'social', 'anxiety', 'sexual'];
      for (const dim of dims) {
        const val = s[`${dim}_score` as keyof SessionRow] as number | null;
        if (val !== null && val !== undefined) {
          sums[dim] = (sums[dim] ?? 0) + val;
          counts[dim] = (counts[dim] ?? 0) + 1;
        }
      }
    }
    return Object.fromEntries(
      Object.entries(sums).map(([k, v]) => [k, Math.round((v / (counts[k] ?? 1)) * 10) / 10])
    );
  }, [sessions]);

  const dimLabels: Record<string, { en: string; es: string }> = {
    physical:  { en: 'Energy',    es: 'Energía'    },
    cognitive: { en: 'Cognitive', es: 'Cognitivo'  },
    emotional: { en: 'Emotional', es: 'Emocional'  },
    stress:    { en: 'Stress',    es: 'Estrés'     },
    social:    { en: 'Social',    es: 'Social'     },
    anxiety:   { en: 'Anxiety',   es: 'Ansiedad'   },
    sexual:    { en: 'Sexual',    es: 'Sexual'     },
  };

  // ── Manual deposit state ────────────────────────────────────────────────
  const [showManual, setShowManual] = useState(false);
  const manualDate = new Date().toISOString().split('T')[0]; // always today
  const [manualSlot, setManualSlot] = useState<'morning' | 'afternoon' | 'night'>('morning');
  const [manualValues, setManualValues] = useState<Record<string, number>>({
    physical: 5, cognitive: 5, emotional: 5, stress: 5, social: 5, anxiety: 5, sexual: 5,
  });
  const [manualNotes, setManualNotes] = useState('');
  const [manualLoading, setManualLoading] = useState(false);
  const [manualSuccess, setManualSuccess] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);

  const handleManualSubmit = async () => {
    setManualLoading(true);
    setManualError(null);
    try {
      const payload: Record<string, unknown> = {
        user_id: profile.id,
        session_date: manualDate,
        time_slot: manualSlot,
        phase_at_session: phaseData.phase,
        personality_mode: 'jules',
        physical_score:  manualValues.physical,
        cognitive_score: manualValues.cognitive,
        emotional_score: manualValues.emotional,
        stress_score:    manualValues.stress,
        social_score:    manualValues.social,
        anxiety_score:   manualValues.anxiety,
        session_complete: true,
        manual_entry: true,
        enrichment_notes: manualNotes || null,
      };
      if (showSexual) payload.sexual_score = manualValues.sexual;

      const { error: insertError } = await supabase.from('conversation_sessions').insert(payload);
      if (insertError) throw insertError;
      setManualSuccess(true);
      setShowManual(false);
      // Refresh data
      const since = new Date(); since.setDate(since.getDate() - 30);
      const { data } = await supabase
        .from('conversation_sessions')
        .select('session_date,time_slot,phase_at_session,physical_score,cognitive_score,emotional_score,stress_score,social_score,anxiety_score,sexual_score')
        .eq('user_id', profile.id)
        .eq('session_complete', true)
        .gte('session_date', since.toISOString().split('T')[0])
        .order('session_date', { ascending: true });
      setSessions((data as SessionRow[]) ?? []);
    } catch (err) {
      setManualError(err instanceof Error ? err.message : (isSpanish ? 'Error al guardar' : 'Error saving'));
    } finally {
      setManualLoading(false);
    }
  };

  const visibleDims = showSexual
    ? ['physical', 'cognitive', 'emotional', 'stress', 'social', 'anxiety', 'sexual']
    : ['physical', 'cognitive', 'emotional', 'stress', 'social', 'anxiety'];

  if (loadingData) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#7B61FF]" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">

      {/* ── SECTION A: DATA PORTFOLIO ──────────────────────────────── */}

      {/* Trading Streak */}
      <div className="bg-[#111126] border border-[#1E1E3A] rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[#8B95B0] text-xs uppercase tracking-widest font-semibold mb-1">
              {isSpanish ? 'Racha de trading' : 'Trading streak'}
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-bold" style={{ color: '#F5C842', fontFamily: 'Clash Display, system-ui, sans-serif' }}>
                {streak}
              </span>
              <span className="text-[#8B95B0] text-sm">{isSpanish ? 'días' : 'days'}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <QualityGauge pct={qualityPct} isSpanish={isSpanish} />
          </div>
        </div>
        <div className="flex gap-4 mt-4 pt-4 border-t border-[#1E1E3A]">
          <div>
            <p className="text-[#8B95B0] text-xs">{isSpanish ? 'Sesiones totales' : 'Total sessions'}</p>
            <p className="text-white font-bold text-lg">{sessions.length}</p>
          </div>
          <div>
            <p className="text-[#8B95B0] text-xs">{isSpanish ? 'Días activos' : 'Active days'}</p>
            <p className="text-white font-bold text-lg">{chartData.length}</p>
          </div>
          <div>
            <p className="text-[#8B95B0] text-xs">{isSpanish ? 'Fase actual' : 'Current phase'}</p>
            <p className="text-white font-bold text-sm">{phaseData.phase}</p>
          </div>
        </div>
      </div>

      {/* Dimension Trend Chart */}
      <div className="bg-[#111126] border border-[#1E1E3A] rounded-2xl p-5">
        <p className="text-white font-bold mb-1">
          {isSpanish ? 'Tendencias — últimos 30 días' : '30-Day Dimension Trends'}
        </p>
        <p className="text-[#8B95B0] text-xs mb-4">
          {isSpanish ? 'Promedio de tus sesiones por día' : 'Daily average across sessions'}
        </p>
        {chartData.length < 2 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <p className="text-[#4A5568] text-sm">
              {isSpanish
                ? 'Completa algunas sesiones con Jules para ver tus tendencias aquí.'
                : 'Complete a few sessions with Jules to see your trends here.'}
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E1E3A" />
              <XAxis dataKey="date" tick={{ fill: '#4A5568', fontSize: 10 }} tickLine={false} />
              <YAxis domain={[0, 10]} tick={{ fill: '#4A5568', fontSize: 10 }} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#111126', border: '1px solid #1E1E3A', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#8B95B0' }}
                itemStyle={{ color: '#fff' }}
              />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
              {visibleDims.map(dim => (
                <Line
                  key={dim}
                  type="monotone"
                  dataKey={dim}
                  stroke={DIM_COLORS[dim as keyof typeof DIM_COLORS]}
                  strokeWidth={2}
                  dot={false}
                  name={isSpanish ? dimLabels[dim]?.es : dimLabels[dim]?.en}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Average scores grid */}
      {Object.keys(avgScores).length > 0 && (
        <div className="bg-[#111126] border border-[#1E1E3A] rounded-2xl p-5">
          <p className="text-white font-bold mb-3">
            {isSpanish ? 'Promedios del período' : '30-Day Averages'}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {visibleDims.filter(d => avgScores[d] !== undefined).map(dim => (
              <div key={dim} className="flex items-center gap-2 p-2 rounded-lg bg-[#0A0A1A]">
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ background: DIM_COLORS[dim as keyof typeof DIM_COLORS] }}
                />
                <div className="min-w-0">
                  <p className="text-[#8B95B0] text-xs truncate">
                    {isSpanish ? dimLabels[dim]?.es : dimLabels[dim]?.en}
                  </p>
                  <p className="text-white font-bold text-sm">{avgScores[dim]}/10</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SECTION B: RESEARCH STUDIES ────────────────────────────── */}
      {(() => {
        const isStudyAvailable = false;
        return (
          <div className="bg-[#111126] border border-[#1E1E3A] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[#F5C842] font-bold text-sm uppercase tracking-widest">
                {isSpanish ? 'Estudios de Investigación' : 'Research Studies'}
              </p>
              {isStudyAvailable ? (
                <span className="px-2 py-0.5 bg-[#00C896]/20 text-[#00C896] text-xs font-semibold rounded-full border border-[#00C896]/30">
                  {isSpanish ? 'Nuevo' : 'New'}
                </span>
              ) : (
                <span className="px-2 py-0.5 bg-[#1E1E3A] text-[#4A5568] text-xs font-semibold rounded-full">
                  {isSpanish ? 'Sin activos' : 'None active'}
                </span>
              )}
            </div>
            {isStudyAvailable ? (
              <div className="space-y-3">
                <p className="text-[#8B95B0] text-sm">
                  {isSpanish
                    ? 'Nuevo estudio disponible — coincide con tu perfil'
                    : 'New study available — matches your profile'}
                </p>
                <button
                  onClick={() => window.location.href = '/trading-floor'}
                  className="w-full py-2.5 bg-[#00C896] text-[#0A0A1A] font-semibold rounded-xl text-sm transition-colors hover:bg-[#00B085]"
                >
                  {isSpanish ? 'Ver estudio' : 'View study'}
                </button>
              </div>
            ) : (
              <p className="text-[#4A5568] text-sm">
                {isSpanish
                  ? 'Sin estudios activos por ahora'
                  : 'No active studies right now'}
              </p>
            )}
          </div>
        );
      })()}

      {/* ── SECTION C: EMERGENCY MANUAL DEPOSIT ───────────────────── */}

      {manualSuccess && (
        <div className="flex items-center gap-3 p-4 bg-[#00D4A1]/10 border border-[#00D4A1]/30 rounded-xl">
          <Check className="w-5 h-5 text-[#00D4A1] flex-shrink-0" />
          <p className="text-[#00D4A1] text-sm">
            {isSpanish
              ? 'Depósito manual guardado. Nota: los datos ingresados manualmente se ponderan diferente en el matching de investigación.'
              : 'Manual deposit logged. Note: manually entered data is weighted differently in research matching.'}
          </p>
        </div>
      )}

      {!showManual ? (
        <button
          onClick={() => setShowManual(true)}
          className={`w-full py-3 text-sm rounded-xl border transition-colors flex items-center justify-center gap-2 ${
            missedCount === 0
              ? 'text-[#4A5568] border-[#1E1E3A] hover:border-[#2A2A45] hover:text-[#8B95B0]'
              : missedCount === 1
              ? 'bg-[#FFD93D] text-[#0A0A1A] font-semibold border-transparent hover:bg-[#F0CA30]'
              : 'bg-[#FF6B6B] text-white font-semibold border-transparent hover:bg-[#F05050]'
          }`}
        >
          {missedCount > 0 && (
            <span className={`w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 ${
              missedCount === 1 ? 'bg-[#0A0A1A]/20 text-[#0A0A1A]' : 'bg-white/20 text-white'
            }`}>
              {missedCount}
            </span>
          )}
          {isSpanish
            ? missedCount === 0
              ? '¿Perdiste una sesión? Ingrésala manualmente'
              : missedCount === 1
              ? '1 sesión perdida hoy — regístrala ahora'
              : `${missedCount} sesiones perdidas — regístralas ahora`
            : missedCount === 0
            ? 'Missed a session? Log it manually'
            : missedCount === 1
            ? '1 session missed today — log it now'
            : `${missedCount} sessions missed — log them now`}
        </button>
      ) : (
        <div className="bg-[#111126] border border-[#1E1E3A] rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-white font-bold">
              {isSpanish ? 'Depósito manual' : 'Manual Deposit'}
            </p>
            <button
              onClick={() => setShowManual(false)}
              className="text-[#4A5568] hover:text-white transition-colors text-xl leading-none"
            >
              ×
            </button>
          </div>

          {manualError && (
            <div className="bg-red-950/50 border border-red-900/50 rounded-xl p-3 text-red-400 text-sm">
              {manualError}
            </div>
          )}

          {/* Today's date — read-only */}
          <div className="flex items-center gap-2 px-3 py-2 bg-[#0A0A1A] border border-[#1E1E3A] rounded-xl">
            <span className="text-[#8B95B0] text-xs">{isSpanish ? 'Fecha:' : 'Date:'}</span>
            <span className="text-white text-sm font-medium">{new Date().toLocaleDateString(isSpanish ? 'es-ES' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
          </div>

          {/* Slot selector */}
          <div>
            <label className="block text-sm text-[#8B95B0] mb-1">
              {isSpanish ? 'Sesión' : 'Session'}
            </label>
            <div className="flex gap-2">
              {(['morning', 'afternoon', 'night'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setManualSlot(s)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                    manualSlot === s
                      ? 'bg-[#7B61FF] text-white'
                      : 'bg-[#0A0A1A] text-[#8B95B0] border border-[#1E1E3A]'
                  }`}
                >
                  {isSpanish
                    ? s === 'morning' ? 'Mañana' : s === 'afternoon' ? 'Tarde' : 'Noche'
                    : s === 'morning' ? 'Morning' : s === 'afternoon' ? 'Afternoon' : 'Night'}
                </button>
              ))}
            </div>
          </div>

          {/* Dimension sliders */}
          {visibleDims.map(dim => (
            <div key={dim}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-white font-medium">
                  {isSpanish ? dimLabels[dim]?.es : dimLabels[dim]?.en}
                </span>
                <span
                  className="text-sm font-bold"
                  style={{ color: DIM_COLORS[dim as keyof typeof DIM_COLORS], fontFamily: 'JetBrains Mono, monospace' }}
                >
                  {manualValues[dim]}/10
                </span>
              </div>
              <input
                type="range" min="1" max="10"
                value={manualValues[dim]}
                onChange={e => setManualValues(prev => ({ ...prev, [dim]: parseInt(e.target.value) }))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, ${DIM_COLORS[dim as keyof typeof DIM_COLORS]} 0%, ${DIM_COLORS[dim as keyof typeof DIM_COLORS]} ${(manualValues[dim] - 1) / 9 * 100}%, #1E1E3A ${(manualValues[dim] - 1) / 9 * 100}%, #1E1E3A 100%)`
                }}
              />
            </div>
          ))}

          {/* Notes */}
          <div>
            <label className="block text-sm text-[#8B95B0] mb-1">
              {isSpanish ? 'Notas (opcional)' : 'Notes (optional)'}
            </label>
            <textarea
              value={manualNotes}
              onChange={e => setManualNotes(e.target.value)}
              rows={2}
              placeholder={isSpanish ? 'Contexto del día...' : 'Context for the day...'}
              className="w-full p-3 bg-[#0A0A1A] border border-[#1E1E3A] rounded-xl resize-none focus:ring-1 focus:ring-[#7B61FF] outline-none text-white placeholder-[#4A5568] text-sm"
            />
          </div>

          <button
            onClick={handleManualSubmit}
            disabled={manualLoading}
            className="w-full py-3 bg-[#4A5568] text-white font-semibold rounded-xl disabled:opacity-50 flex items-center justify-center gap-2 transition-colors hover:bg-[#5A6578]"
          >
            {manualLoading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : (isSpanish ? 'Guardar depósito manual' : 'Log Manual Deposit')}
          </button>
          <p className="text-xs text-[#4A5568] text-center leading-relaxed">
            {isSpanish
              ? 'Solo para sesiones perdidas de hoy. Los datos manuales se ponderan diferente en investigación.'
              : 'Today only. Manually entered data is weighted differently in research.'}
          </p>
        </div>
      )}
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
