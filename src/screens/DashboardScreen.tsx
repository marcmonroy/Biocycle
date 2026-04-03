import { useState, useEffect } from 'react';
import { supabase, Profile, Checkin } from '../lib/supabase';
import { TrendingUp, Calendar, Loader2, Sprout, TreeDeciduous, Leaf, Crown, Sparkles, Flame, AlertTriangle, Award, CheckCircle, Download, ShieldCheck, ChevronRight, Zap, ArrowUpRight, X } from 'lucide-react';

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

interface DashboardScreenProps {
  profile: Profile;
  onNavigate?: (screen: string) => void;
}

type Tier = {
  name: string;
  nameEn: string;
  min: number;
  max: number;
  color: string;
  bgColor: string;
  icon: typeof Sprout;
};

const tiers: Tier[] = [
  { name: 'Semilla', nameEn: 'Seed', min: 0, max: 10, color: 'text-gray-500', bgColor: 'bg-gray-500', icon: Sprout },
  { name: 'Raiz', nameEn: 'Root', min: 11, max: 30, color: 'text-emerald-600', bgColor: 'bg-emerald-500', icon: TreeDeciduous },
  { name: 'Crecimiento', nameEn: 'Growth', min: 31, max: 60, color: 'text-blue-600', bgColor: 'bg-blue-500', icon: Leaf },
  { name: 'Maestria', nameEn: 'Mastery', min: 61, max: 100, color: 'text-[#2D1B69]', bgColor: 'bg-[#2D1B69]', icon: Crown },
  { name: 'Oraculo', nameEn: 'Oracle', min: 101, max: Infinity, color: 'text-amber-500', bgColor: 'bg-amber-500', icon: Sparkles },
];

function getTier(deposits: number): Tier {
  for (const tier of tiers) {
    if (deposits >= tier.min && deposits <= tier.max) {
      return tier;
    }
  }
  return tiers[tiers.length - 1];
}

function getNextTier(deposits: number): Tier | null {
  const currentIndex = tiers.findIndex(t => deposits >= t.min && deposits <= t.max);
  if (currentIndex < tiers.length - 1) {
    return tiers[currentIndex + 1];
  }
  return null;
}

export function DashboardScreen({ profile, onNavigate }: DashboardScreenProps) {
  const isSpanish = profile.idioma === 'ES';
  const showSexual = isAdult(profile);

  const [loading, setLoading] = useState(true);
  const [allCheckins, setAllCheckins] = useState<Checkin[]>([]);
  const [totalDeposits, setTotalDeposits] = useState(0);
  const [avgQuality, setAvgQuality] = useState(0);
  const [daysSinceJoined, setDaysSinceJoined] = useState(0);
  const [sexualDeposits, setSexualDeposits] = useState(0);
  const [anxietyDeposits, setAnxietyDeposits] = useState(0);
  const [highestAnxietyPhase, setHighestAnxietyPhase] = useState<string | null>(null);
  const [qualityScore, setQualityScore] = useState(0);
  const [frequencyPoints, setFrequencyPoints] = useState(0);
  const [consistencyPoints, setConsistencyPoints] = useState(0);
  const [completenessPoints, setCompletenessPoints] = useState(0);
  const [depthPoints, setDepthPoints] = useState(0);
  const [showPremiumUnlocked, setShowPremiumUnlocked] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [tradingStreak, setTradingStreak] = useState(0);
  const [showPortfolioModal, setShowPortfolioModal] = useState(false);
  const [displayValue, setDisplayValue] = useState(0);
  const [arcAnimated, setArcAnimated] = useState(false);
  const [avgIntegrity, setAvgIntegrity] = useState<number | null>(null);
  const [showIntegrityInfo, setShowIntegrityInfo] = useState(false);

  // ── Profile bonus (computed from props — needed before animation effect) ──
  const profileBonusItems = [
    { key: 'height_weight', label: isSpanish ? 'Altura y peso' : 'Height & weight',     points: 5,  done: !!(profile.height_cm && profile.weight_kg) },
    { key: 'exercise',      label: isSpanish ? 'Datos de ejercicio' : 'Exercise data',   points: 5,  done: !!(profile.exercise_frequency || profile.exercise_type) },
    { key: 'sleep',         label: isSpanish ? 'Linea base de sueño' : 'Sleep baseline', points: 8,  done: !!profile.sleep_hours },
    { key: 'conditions',    label: isSpanish ? 'Condiciones conocidas' : 'Known conditions', points: 15, done: Array.isArray(profile.known_conditions) && profile.known_conditions.length > 0 },
    { key: 'medications',   label: isSpanish ? 'Medicamentos' : 'Medications',           points: 12, done: Array.isArray(profile.current_medications) && profile.current_medications.length > 0 },
    { key: 'blood_type',    label: isSpanish ? 'Tipo de sangre' : 'Blood type',          points: 10, done: !!profile.blood_type },
    { key: 'family_history',label: isSpanish ? 'Historia familiar' : 'Family history',   points: 5,  done: Array.isArray(profile.family_history) && profile.family_history.length > 0 },
  ];
  const earnedProfileBonus   = profileBonusItems.filter(i => i.done).reduce((s, i) => s + i.points, 0);
  const maxProfileBonus      = profileBonusItems.reduce((s, i) => s + i.points, 0);
  const totalProfilePossible = profileBonusItems.filter(i => !i.done).reduce((s, i) => s + i.points, 0);
  const profileComplete      = earnedProfileBonus === maxProfileBonus;

  // ── Portfolio value (computed from state + props) ──
  const healthProfileDone = !!(profile.height_cm && profile.weight_kg && profile.sleep_hours && (profile.exercise_frequency || profile.exercise_type));
  const medicalProfileDone = Array.isArray(profile.known_conditions) && profile.known_conditions.length > 0
    && Array.isArray(profile.current_medications) && profile.current_medications.length > 0
    && Array.isArray(profile.family_history) && profile.family_history.length > 0;
  const bloodTypeDone  = !!profile.blood_type;
  const exerciseDone   = !!(profile.exercise_frequency || profile.exercise_type);
  const daysValue      = daysSinceJoined * 0.15;
  const qualityMultiplier = Math.max(0.01, (qualityScore + earnedProfileBonus) / 100);
  const userAge        = profile.fecha_nacimiento ? calculateAge(profile.fecha_nacimiento) : 0;
  let portfolioValue   = daysValue * qualityMultiplier;
  if (healthProfileDone) portfolioValue += 5;
  if (medicalProfileDone) portfolioValue += 8;
  if (bloodTypeDone)  portfolioValue += 3;
  if (exerciseDone)   portfolioValue += 2;
  if (userAge >= 40)  portfolioValue *= 1.3;
  portfolioValue = Math.max(1.00, portfolioValue);
  const unlockableBonus = (healthProfileDone ? 0 : 5) + (medicalProfileDone ? 0 : 8) + (bloodTypeDone ? 0 : 3) + (exerciseDone ? 0 : 2);

  useEffect(() => {
    loadDashboardData();
  }, [profile.id]);

  // ── Count-up + arc animation: fires once when loading completes ──
  useEffect(() => {
    if (loading) return;
    setArcAnimated(false);
    const tArc = setTimeout(() => setArcAnimated(true), 150);
    const target = portfolioValue;
    const startTime = performance.now();
    const duration = 1200;
    let raf: number;
    const frame = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setDisplayValue(eased * target);
      if (t < 1) raf = requestAnimationFrame(frame);
      else setDisplayValue(target);
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); clearTimeout(tArc); };
  }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const { data: checkins, error } = await supabase
        .from('checkins')
        .select('*')
        .eq('user_id', profile.id)
        .order('checkin_date', { ascending: false });

      if (error) throw error;

      if (checkins && checkins.length > 0) {
        setAllCheckins(checkins);
        setTotalDeposits(checkins.length);
        const totalQuality = checkins.reduce((sum: number, c: Checkin) => sum + (c.calidad_score || 0), 0);
        setAvgQuality(Math.round(totalQuality / checkins.length * 10) / 10);

        const sexualCount = checkins.filter((c: Checkin) => c.factor_sexual !== null && c.factor_sexual !== undefined).length;
        setSexualDeposits(sexualCount);

        const anxietyCount = checkins.filter((c: Checkin) => c.factor_ansiedad !== null && c.factor_ansiedad !== undefined).length;
        setAnxietyDeposits(anxietyCount);

        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const last30DaysCheckins = checkins.filter((c: Checkin) => new Date(c.checkin_date) >= thirtyDaysAgo);
        const freqPts = Math.min(40, Math.round((last30DaysCheckins.length / 30) * 40));
        setFrequencyPoints(freqPts);

        const sortedDates = checkins
          .map((c: Checkin) => new Date(c.checkin_date).getTime())
          .sort((a: number, b: number) => b - a);
        let maxGap = 0;
        for (let i = 0; i < sortedDates.length - 1; i++) {
          const gapDays = (sortedDates[i] - sortedDates[i + 1]) / (1000 * 60 * 60 * 24);
          if (gapDays > maxGap) maxGap = gapDays;
        }
        const consistPts = maxGap <= 2 ? 30 : Math.max(0, 30 - Math.round((maxGap - 2) * 5));
        setConsistencyPoints(consistPts);

        const dimensionFields = ['factor_emocional', 'factor_fisico', 'factor_cognitivo', 'factor_estres', 'factor_social', 'factor_ansiedad', 'factor_sexual'];
        const completedDimensions = dimensionFields.filter(field => {
          return checkins.some((c: Checkin) => {
            const value = c[field as keyof Checkin];
            return value !== null && value !== undefined;
          });
        }).length;
        const completePts = Math.round((completedDimensions / dimensionFields.length) * 20);
        setCompletenessPoints(completePts);

        const depthPts = Math.min(10, Math.round((checkins.length / 100) * 10));
        setDepthPoints(depthPts);

        const totalScore = freqPts + consistPts + completePts + depthPts;
        setQualityScore(totalScore);

        if (checkins.length >= 31 && checkins.length <= 60 && totalScore >= 70) {
          const premiumShown = localStorage.getItem('biocycle_premium_unlocked_shown');
          if (!premiumShown) {
            setShowPremiumUnlocked(true);
            localStorage.setItem('biocycle_premium_unlocked_shown', 'true');
          }
        }

        if (anxietyCount >= 30) {
          const phaseAnxietyMap: Record<string, { total: number; count: number }> = {};
          checkins.forEach((c: Checkin) => {
            if (c.factor_ansiedad && c.phase_at_checkin) {
              if (!phaseAnxietyMap[c.phase_at_checkin]) {
                phaseAnxietyMap[c.phase_at_checkin] = { total: 0, count: 0 };
              }
              phaseAnxietyMap[c.phase_at_checkin].total += c.factor_ansiedad;
              phaseAnxietyMap[c.phase_at_checkin].count += 1;
            }
          });

          let maxAvg = 0;
          let maxPhase = '';
          Object.entries(phaseAnxietyMap).forEach(([phase, data]) => {
            const avg = data.total / data.count;
            if (avg > maxAvg) {
              maxAvg = avg;
              maxPhase = phase;
            }
          });

          if (maxPhase) {
            setHighestAnxietyPhase(maxPhase);
          }
        }
      }

      // Trading Streak: consecutive days with a completed coach session (fallback to checkins)
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
          const d = new Date(day);
          d.setHours(0, 0, 0, 0);
          const diff = Math.round((cursor.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
          if (diff === 0 || diff === 1) {
            streak++;
            cursor = d;
          } else {
            break;
          }
        }
      } else if (checkins && checkins.length > 0) {
        // Fallback: count consecutive days in checkins
        const uniqueCheckinDays = [...new Set(checkins.map((c: Checkin) => c.checkin_date))].sort((a, b) => b.localeCompare(a));
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let cursor = new Date(today);
        for (const day of uniqueCheckinDays) {
          const d = new Date(day);
          d.setHours(0, 0, 0, 0);
          const diff = Math.round((cursor.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
          if (diff === 0 || diff === 1) {
            streak++;
            cursor = d;
          } else {
            break;
          }
        }
      }
      setTradingStreak(streak);

      // Integrity score — average of last 30 scored sessions
      const { data: integritySessions } = await supabase
        .from('conversation_sessions')
        .select('integrity_score')
        .eq('user_id', profile.id)
        .not('integrity_score', 'is', null)
        .order('created_at', { ascending: false })
        .limit(30);

      if (integritySessions && integritySessions.length > 0) {
        const avg = integritySessions.reduce(
          (sum: number, s: { integrity_score: number }) => sum + s.integrity_score, 0
        ) / integritySessions.length;
        setAvgIntegrity(Math.round(avg));
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('created_at')
        .eq('id', profile.id)
        .maybeSingle();

      if (profileData?.created_at) {
        const createdAt = new Date(profileData.created_at);
        const now = new Date();
        const diffTime = now.getTime() - createdAt.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        setDaysSinceJoined(diffDays);
      }
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A1A] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#7B61FF]" />
      </div>
    );
  }

  const currentTier = getTier(totalDeposits);
  const nextTier    = getNextTier(totalDeposits);
  const TierIcon    = currentTier.icon;
  const progressToNext = nextTier
    ? ((totalDeposits - currentTier.min) / (nextTier.min - currentTier.min)) * 100
    : 100;

  const handleExportData = () => {
    const headers = ['date','phase','emotional','physical','cognitive','stress','social','sexual','anxiety','quality_score','notes'];
    const rows = allCheckins.map(c => [
      c.checkin_date, c.phase_at_checkin ?? '',
      c.factor_emocional ?? '', c.factor_fisico ?? '', c.factor_cognitivo ?? '',
      c.factor_estres ?? '', c.factor_social ?? '', c.factor_sexual ?? '',
      c.factor_ansiedad ?? '', c.calidad_score ?? '',
      `"${(c.notas ?? '').replace(/"/g, '""')}"`,
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `biocycle_data_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setExportSuccess(true);
    setTimeout(() => setExportSuccess(false), 3000);
  };

  // ── SVG arc constants (semicircle, r=80, cx=100 cy=100) ──
  const ARC_R = 80;
  const ARC_HALF_CIRC = Math.PI * ARC_R; // ≈ 251.3
  const totalQuality = qualityScore + earnedProfileBonus;
  const arcOffset = arcAnimated
    ? ARC_HALF_CIRC * (1 - Math.min(totalQuality, 100) / 100)
    : ARC_HALF_CIRC;

  // Tier pill gradient map
  const tierGradients: Record<string, string> = {
    Semilla:     'linear-gradient(135deg,#1F2937,#374151)',
    Raiz:        'linear-gradient(135deg,#064E3B,#059669)',
    Crecimiento: 'linear-gradient(135deg,#1E3A5F,#2563EB)',
    Maestria:    'linear-gradient(135deg,#2D1B69,#7C3AED)',
    Oraculo:     'linear-gradient(135deg,#78350F,#D97706)',
  };
  const tierTextColors: Record<string, string> = {
    Semilla: '#9CA3AF', Raiz: '#6EE7B7', Crecimiento: '#93C5FD',
    Maestria: '#C4B5FD', Oraculo: '#FDE68A',
  };
  const tierGrad = tierGradients[currentTier.name] ?? tierGradients['Semilla'];
  const tierText = tierTextColors[currentTier.name] ?? '#9CA3AF';

  const divider = <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '0 24px' }} />;

  return (
    <div className="min-h-screen bg-[#0A0A1A] pb-28">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-6 pt-14 pb-2">
        <span className="text-white font-semibold text-base">
          {isSpanish ? 'Tu Cuenta' : 'Your Account'}
        </span>
        <button
          onClick={handleExportData}
          disabled={allCheckins.length === 0}
          className="flex items-center gap-1.5 text-[#4A5568] text-xs disabled:opacity-30 active:text-white transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          {exportSuccess ? (isSpanish ? 'Exportado' : 'Exported') : (isSpanish ? 'Exportar' : 'Export')}
        </button>
      </div>

      {/* ── HERO: Portfolio Value ── */}
      <button
        onClick={() => setShowPortfolioModal(true)}
        className="w-full px-6 pt-8 pb-10 text-center active:opacity-70 transition-opacity"
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        <p style={{ fontSize: '0.7rem', letterSpacing: '0.12em', color: '#4A5568', fontFamily: 'Inter,system-ui,sans-serif', fontWeight: 400, textTransform: 'uppercase', marginBottom: 8 }}>
          {isSpanish ? 'VALOR DEL PORTAFOLIO' : 'DATA PORTFOLIO VALUE'}
        </p>
        <p style={{ fontFamily: 'JetBrains Mono,monospace', fontWeight: 700, fontSize: '3.5rem', color: '#FFD93D', lineHeight: 1, letterSpacing: '-0.02em' }}>
          ${displayValue.toFixed(2)}
        </p>
        <p style={{ fontSize: '0.75rem', color: '#4A5568', fontFamily: 'Inter,system-ui,sans-serif', marginTop: 8 }}>
          {isSpanish ? 'valor estimado de investigacion hoy' : 'estimated research value today'}
        </p>
      </button>

      {divider}

      {/* ── Trading Streak ── */}
      <div className="px-6 py-8 flex items-center justify-between">
        <div>
          <p style={{ fontSize: '0.7rem', letterSpacing: '0.1em', color: '#4A5568', textTransform: 'uppercase', marginBottom: 6 }}>
            Trading Streak
          </p>
          {tradingStreak > 0 ? (
            <p style={{ fontFamily: 'JetBrains Mono,monospace', fontWeight: 600, fontSize: '1.5rem', color: '#FFFFFF' }}>
              🔥 {tradingStreak} <span style={{ fontSize: '0.75rem', color: '#4A5568', fontFamily: 'Inter,system-ui,sans-serif', fontWeight: 400 }}>{isSpanish ? 'días' : 'days'}</span>
            </p>
          ) : (
            <p style={{ fontFamily: 'JetBrains Mono,monospace', fontWeight: 600, fontSize: '1.2rem', color: '#4A5568' }}>
              — <span style={{ fontSize: '0.75rem', fontFamily: 'Inter,system-ui,sans-serif', fontWeight: 400 }}>{isSpanish ? 'Empieza hoy' : 'Start today'}</span>
            </p>
          )}
        </div>
        <div className="text-right">
          <p style={{ fontSize: '0.7rem', color: '#4A5568', marginBottom: 4 }}>{isSpanish ? 'Depositos' : 'Deposits'}</p>
          <p style={{ fontFamily: 'JetBrains Mono,monospace', fontWeight: 600, fontSize: '1.5rem', color: '#FFFFFF' }}>{totalDeposits}</p>
        </div>
      </div>

      {divider}

      {/* ── Quality Arc ── */}
      <div className="px-6 py-8 flex flex-col items-center">
        <svg viewBox="0 0 200 110" width="200" height="110" overflow="visible">
          <defs>
            <linearGradient id="arcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#2D1B69" />
              <stop offset="100%" stopColor="#FFD93D" />
            </linearGradient>
          </defs>
          {/* Track */}
          <path
            d={`M 20 100 A ${ARC_R} ${ARC_R} 0 0 1 180 100`}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="8"
            strokeLinecap="round"
          />
          {/* Fill */}
          <path
            d={`M 20 100 A ${ARC_R} ${ARC_R} 0 0 1 180 100`}
            fill="none"
            stroke="url(#arcGrad)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${ARC_HALF_CIRC} ${ARC_HALF_CIRC}`}
            strokeDashoffset={arcOffset}
            style={{ transition: arcAnimated ? 'stroke-dashoffset 1.2s cubic-bezier(0.25,0.46,0.45,0.94)' : 'none' }}
          />
          {/* Center score */}
          <text x="100" y="88" textAnchor="middle" fill="#FFFFFF"
            style={{ fontFamily: 'JetBrains Mono,monospace', fontWeight: 700, fontSize: 26 }}>
            {totalQuality}
          </text>
        </svg>
        <p style={{ fontSize: '0.7rem', letterSpacing: '0.1em', color: '#4A5568', textTransform: 'uppercase', marginTop: 4 }}>
          {isSpanish ? 'Calidad de Datos' : 'Data Quality'}
        </p>
        {/* Quality sub-scores */}
        <div className="flex gap-6 mt-4">
          {[
            { label: isSpanish ? 'Frec' : 'Freq', val: frequencyPoints, max: 40 },
            { label: isSpanish ? 'Cons' : 'Cons', val: consistencyPoints, max: 30 },
            { label: isSpanish ? 'Dim' : 'Dim',  val: completenessPoints, max: 20 },
            { label: isSpanish ? 'Prof' : 'Depth', val: depthPoints, max: 10 },
          ].map(({ label, val, max }) => (
            <div key={label} className="flex flex-col items-center gap-1">
              <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '0.85rem', color: '#FFFFFF', fontWeight: 600 }}>{val}</span>
              <span style={{ fontSize: '0.6rem', color: '#4A5568' }}>{label}/{max}</span>
            </div>
          ))}
          {earnedProfileBonus > 0 && (
            <div className="flex flex-col items-center gap-1">
              <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '0.85rem', color: '#00C896', fontWeight: 600 }}>+{earnedProfileBonus}</span>
              <span style={{ fontSize: '0.6rem', color: '#4A5568' }}>{isSpanish ? 'perfil' : 'profile'}</span>
            </div>
          )}
        </div>
      </div>

      {divider}

      {/* ── Data Integrity ── */}
      <div className="px-6 py-5 flex items-center justify-between">
        <p style={{ fontSize: '0.75rem', color: '#4A5568', fontFamily: 'Inter,system-ui,sans-serif', fontWeight: 400 }}>
          {isSpanish ? 'Integridad de Datos' : 'Data Integrity'}
        </p>
        <div className="flex items-center gap-3">
          {avgIntegrity === null ? (
            <span style={{ fontSize: '0.85rem', color: '#4A5568', fontFamily: 'Inter,system-ui,sans-serif' }}>
              {isSpanish ? 'Calculando...' : 'Building...'}
            </span>
          ) : (
            <span style={{
              fontFamily: 'JetBrains Mono,monospace',
              fontWeight: 600,
              fontSize: '1.1rem',
              color: avgIntegrity >= 80 ? '#00C896' : avgIntegrity >= 60 ? '#FFD93D' : '#FF6B6B',
            }}>
              {avgIntegrity}
            </span>
          )}
          <button
            onClick={() => setShowIntegrityInfo(v => !v)}
            style={{ fontSize: '1rem', color: '#4A5568', lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            aria-label="Integrity info"
          >
            ⓘ
          </button>
        </div>
      </div>

      {showIntegrityInfo && (
        <div className="mx-6 mb-4 px-4 py-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <p style={{ fontSize: '0.78rem', color: '#8B95B0', lineHeight: 1.5 }}>
            {isSpanish
              ? 'Tu puntaje de integridad refleja la autenticidad de tus respuestas. Los datos de alta integridad tienen mayor valor en investigación.'
              : 'Your integrity score reflects the authenticity of your session responses. High integrity data commands premium research value.'}
          </p>
        </div>
      )}

      {divider}

      {/* ── Tier Badge ── */}
      <div className="px-6 py-8 flex flex-col items-center gap-4">
        <div className="flex flex-col items-center gap-2">
          <span
            style={{
              background: tierGrad,
              color: tierText,
              fontFamily: 'Inter,system-ui,sans-serif',
              fontWeight: 600,
              fontSize: '0.8rem',
              padding: '6px 20px',
              borderRadius: 999,
              letterSpacing: '0.04em',
            }}
          >
            {isSpanish ? currentTier.name : currentTier.nameEn}
          </span>
          <TierIcon style={{ width: 20, height: 20, color: tierText }} />
        </div>
        {nextTier && (
          <div className="w-full max-w-xs">
            <div className="flex justify-between mb-2">
              <span style={{ fontSize: '0.7rem', color: '#4A5568' }}>
                {totalDeposits} / {nextTier.min}
              </span>
              <span style={{ fontSize: '0.7rem', color: '#4A5568' }}>
                {nextTier.min - totalDeposits} {isSpanish ? 'para' : 'to'} {isSpanish ? nextTier.name : nextTier.nameEn}
              </span>
            </div>
            <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${Math.min(progressToNext, 100)}%`,
                background: 'linear-gradient(to right,#7B61FF,#FFD93D)',
                borderRadius: 99,
                transition: 'width 1s ease',
              }} />
            </div>
          </div>
        )}
      </div>

      {divider}

      {/* ── Stats row ── */}
      <div className="px-6 py-8 grid grid-cols-3 gap-4">
        {[
          { label: isSpanish ? 'Dias' : 'Days',   val: daysSinceJoined },
          { label: isSpanish ? 'Calidad' : 'Avg Q', val: avgQuality },
          { label: isSpanish ? 'Racha' : 'Streak', val: tradingStreak },
        ].map(({ label, val }) => (
          <div key={label} className="flex flex-col items-center gap-1">
            <span style={{ fontFamily: 'JetBrains Mono,monospace', fontWeight: 700, fontSize: '1.6rem', color: '#FFFFFF' }}>{val}</span>
            <span style={{ fontSize: '0.65rem', color: '#4A5568', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</span>
          </div>
        ))}
      </div>

      {divider}

      {/* ── Profile completeness ── */}
      <div className="px-6 py-8">
        <div className="flex items-center justify-between mb-5">
          <p style={{ fontSize: '0.7rem', letterSpacing: '0.1em', color: '#4A5568', textTransform: 'uppercase' }}>
            {isSpanish ? 'Perfil de Salud' : 'Health Profile'}
          </p>
          <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '0.8rem', color: '#00C896' }}>
            {earnedProfileBonus}/{maxProfileBonus}
          </span>
        </div>
        {/* thin progress bar */}
        <div style={{ height: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden', marginBottom: 20 }}>
          <div style={{
            height: '100%',
            width: `${maxProfileBonus > 0 ? (earnedProfileBonus / maxProfileBonus) * 100 : 0}%`,
            background: '#00C896',
            borderRadius: 99,
            transition: 'width 1s ease',
          }} />
        </div>
        <div className="space-y-4">
          {profileBonusItems.map(item => (
            <div key={item.key} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span style={{
                  width: 16, height: 16, borderRadius: '50%', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: '0.6rem', flexShrink: 0,
                  background: item.done ? '#00C896' : 'rgba(255,255,255,0.06)',
                  color: item.done ? '#0A0A1A' : '#4A5568',
                }}>
                  {item.done ? '✓' : ''}
                </span>
                <span style={{ fontSize: '0.8rem', color: item.done ? '#FFFFFF' : '#4A5568' }}>{item.label}</span>
              </div>
              <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '0.75rem', color: item.done ? '#00C896' : '#4A5568' }}>
                +{item.points}
              </span>
            </div>
          ))}
        </div>
        {!profileComplete && (
          <button
            onClick={() => onNavigate?.('profile-edit')}
            className="mt-6 w-full flex items-center justify-center gap-2 py-3 rounded-2xl active:opacity-70 transition-opacity"
            style={{ background: 'rgba(255,255,255,0.04)' }}
          >
            <span style={{ fontSize: '0.8rem', color: '#8B95B0' }}>
              {isSpanish
                ? `${totalProfilePossible} pts disponibles — completar perfil`
                : `${totalProfilePossible} pts available — complete profile`}
            </span>
            <ChevronRight style={{ width: 14, height: 14, color: '#4A5568' }} />
          </button>
        )}
      </div>

      {divider}

      {/* ── Anxiety insight ── */}
      {anxietyDeposits > 0 && (
        <>
          <div className="px-6 py-8">
            <p style={{ fontSize: '0.7rem', letterSpacing: '0.1em', color: '#4A5568', textTransform: 'uppercase', marginBottom: 12 }}>
              {isSpanish ? 'Patron de Ansiedad' : 'Anxiety Pattern'}
            </p>
            {anxietyDeposits >= 30 && highestAnxietyPhase ? (
              <p style={{ fontSize: '0.85rem', color: '#FFFFFF', lineHeight: 1.5 }}>
                {isSpanish
                  ? `Tus ventanas de mayor ansiedad ocurren en la fase ${highestAnxietyPhase}.`
                  : `Your highest anxiety windows occur during the ${highestAnxietyPhase} phase.`}
              </p>
            ) : (
              <>
                <p style={{ fontSize: '0.8rem', color: '#4A5568', marginBottom: 10 }}>
                  {anxietyDeposits}/30 {isSpanish ? 'depositos' : 'deposits'}
                </p>
                <div style={{ height: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(anxietyDeposits / 30) * 100}%`, background: '#F5C842', borderRadius: 99 }} />
                </div>
              </>
            )}
          </div>
          {divider}
        </>
      )}

      {/* ── Sexual dimension (adults) ── */}
      {showSexual && sexualDeposits > 0 && (
        <>
          <div className="px-6 py-8 flex items-center justify-between">
            <div>
              <p style={{ fontSize: '0.7rem', letterSpacing: '0.1em', color: '#4A5568', textTransform: 'uppercase', marginBottom: 6 }}>
                {isSpanish ? 'Dimension Sexual' : 'Sexual Dimension'}
              </p>
              <p style={{ fontFamily: 'JetBrains Mono,monospace', fontWeight: 700, fontSize: '1.5rem', color: '#FFFFFF' }}>
                {sexualDeposits}
              </p>
              <p style={{ fontSize: '0.7rem', color: '#00C896', marginTop: 4 }}>
                {isSpanish ? 'dato de alto valor' : 'high research value'}
              </p>
            </div>
            <Flame style={{ width: 24, height: 24, color: '#FF6B6B', opacity: 0.6 }} />
          </div>
          {divider}
        </>
      )}

      {/* ── Premium unlocked ── */}
      {showPremiumUnlocked && (
        <>
          <div className="px-6 py-6 flex items-center gap-3">
            <CheckCircle style={{ width: 18, height: 18, color: '#00C896', flexShrink: 0 }} />
            <p style={{ fontSize: '0.8rem', color: '#00C896' }}>
              {isSpanish ? 'Premium desbloqueado — la calidad de tus datos lo gano.' : 'Premium unlocked — your data quality earned it.'}
            </p>
          </div>
          {divider}
        </>
      )}

      {/* ── Tagline ── */}
      <div className="px-6 py-10">
        <p style={{ fontSize: '0.75rem', color: '#2A2A45', lineHeight: 1.6, textAlign: 'center' }}>
          {isSpanish
            ? 'Eres un Data Trader. Tus patrones biologicos son tu mercancia. BioCycle es tu exchange.'
            : 'You are a Data Trader. Your biological patterns are your commodity. BioCycle is your exchange.'}
        </p>
      </div>

      {/* ── Portfolio breakdown modal ── */}
      {showPortfolioModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.75)' }}
          onClick={() => setShowPortfolioModal(false)}
        >
          <div
            className="w-full max-w-md rounded-t-3xl px-6 pt-6 pb-10"
            style={{ background: '#111126' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Handle */}
            <div style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.12)', borderRadius: 99, margin: '0 auto 20px' }} />

            <div className="flex items-center justify-between mb-6">
              <p style={{ fontSize: '1rem', fontWeight: 600, color: '#FFFFFF' }}>
                {isSpanish ? 'Como se calcula tu valor' : 'How your value is calculated'}
              </p>
              <button onClick={() => setShowPortfolioModal(false)}>
                <X style={{ width: 18, height: 18, color: '#4A5568' }} />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              {/* Days */}
              <div className="flex justify-between items-center">
                <span style={{ fontSize: '0.8rem', color: '#8B95B0' }}>
                  {daysSinceJoined} {isSpanish ? 'días × $0.15' : 'days × $0.15'}
                </span>
                <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '0.8rem', color: '#FFFFFF' }}>
                  ${daysValue.toFixed(2)}
                </span>
              </div>
              {/* Quality */}
              <div className="flex justify-between items-center">
                <span style={{ fontSize: '0.8rem', color: '#8B95B0' }}>
                  {isSpanish ? 'Multiplicador calidad' : 'Quality multiplier'} ({Math.round(qualityMultiplier * 100)}%)
                </span>
                <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '0.8rem', color: '#FFFFFF' }}>
                  ×{qualityMultiplier.toFixed(2)}
                </span>
              </div>
              {/* Separator */}
              <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />
              {/* Bonuses */}
              {[
                { label: isSpanish ? 'Perfil de salud' : 'Health profile', done: healthProfileDone, val: '$5.00' },
                { label: isSpanish ? 'Perfil medico' : 'Medical profile',  done: medicalProfileDone, val: '$8.00' },
                { label: isSpanish ? 'Tipo de sangre' : 'Blood type',       done: bloodTypeDone,      val: '$3.00' },
                { label: isSpanish ? 'Datos de ejercicio' : 'Exercise data',done: exerciseDone,       val: '$2.00' },
              ].map(({ label, done, val }) => (
                <div key={label} className="flex justify-between items-center">
                  <span style={{ fontSize: '0.8rem', color: done ? '#00C896' : '#2A2A45' }}>
                    {done ? '✓' : '○'} {label}
                  </span>
                  <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '0.8rem', color: done ? '#00C896' : '#2A2A45' }}>
                    +{val}
                  </span>
                </div>
              ))}
              {userAge >= 40 && (
                <div className="flex justify-between items-center">
                  <span style={{ fontSize: '0.8rem', color: '#FFD93D' }}>✓ {isSpanish ? 'Bonus 40+' : '40+ bonus'}</span>
                  <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '0.8rem', color: '#FFD93D' }}>×1.3</span>
                </div>
              )}
              {/* Total */}
              <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />
              <div className="flex justify-between items-center">
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#FFFFFF' }}>
                  {isSpanish ? 'Total' : 'Total'}
                </span>
                <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: '1.4rem', fontWeight: 700, color: '#FFD93D' }}>
                  ${portfolioValue.toFixed(2)}
                </span>
              </div>
            </div>

            {unlockableBonus > 0 && (
              <div style={{ background: 'rgba(255,217,61,0.06)', borderRadius: 16, padding: '14px 16px', marginBottom: 16 }}>
                <p style={{ fontSize: '0.78rem', color: '#FFD93D', lineHeight: 1.5 }}>
                  {isSpanish
                    ? `Completa tu perfil de salud → desbloquear +$${unlockableBonus.toFixed(2)} mas`
                    : `Complete your health profile → unlock +$${unlockableBonus.toFixed(2)} more`}
                </p>
              </div>
            )}

            <button
              onClick={() => { setShowPortfolioModal(false); onNavigate?.('profile-edit'); }}
              className="w-full py-3.5 rounded-2xl font-semibold text-sm active:opacity-80 transition-opacity"
              style={{ background: 'rgba(255,255,255,0.06)', color: '#FFFFFF' }}
            >
              {isSpanish ? 'Mejorar mi perfil' : 'Improve my profile'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
