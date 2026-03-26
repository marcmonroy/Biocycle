import { useState, useEffect } from 'react';
import { supabase, Profile, Checkin } from '../lib/supabase';
import { TrendingUp, Calendar, Loader2, Sprout, TreeDeciduous, Leaf, Crown, Sparkles, Flame, AlertTriangle, Award, CheckCircle, Download, ShieldCheck, ChevronRight } from 'lucide-react';

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
  const [profileBonusPoints, setProfileBonusPoints] = useState(0);

  useEffect(() => {
    loadDashboardData();
  }, [profile.id]);

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#2D1B69]" />
      </div>
    );
  }

  const currentTier = getTier(totalDeposits);
  const nextTier = getNextTier(totalDeposits);
  const TierIcon = currentTier.icon;

  const handleExportData = () => {
    const headers = [
      'date', 'emotional', 'physical', 'cognitive', 'stress',
      'social', 'sexual', 'anxiety', 'quality_score', 'phase', 'notes'
    ];
    const rows = allCheckins.map(c => [
      c.checkin_date,
      c.factor_emocional ?? '',
      c.factor_fisico ?? '',
      c.factor_cognitivo ?? '',
      c.factor_estres ?? '',
      c.factor_social ?? '',
      c.factor_sexual ?? '',
      c.factor_ansiedad ?? '',
      c.calidad_score ?? '',
      c.phase_at_checkin ?? '',
      `"${(c.notas ?? '').replace(/"/g, '""')}"`,
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `biocycle-data-${profile.nombre || 'user'}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const progressToNext = nextTier
    ? ((totalDeposits - currentTier.min) / (nextTier.min - currentTier.min)) * 100
    : 100;

  // Profile completeness bonus points
  const profileBonusItems = [
    {
      key: 'height_weight',
      label: isSpanish ? 'Altura y peso' : 'Height & weight',
      points: 5,
      done: !!(profile.height_cm && profile.weight_kg),
    },
    {
      key: 'exercise',
      label: isSpanish ? 'Datos de ejercicio' : 'Exercise data',
      points: 5,
      done: !!(profile.exercise_frequency || profile.exercise_type),
    },
    {
      key: 'sleep',
      label: isSpanish ? 'Linea base de sueño' : 'Sleep baseline',
      points: 8,
      done: !!(profile.sleep_hours),
    },
    {
      key: 'conditions',
      label: isSpanish ? 'Condiciones conocidas' : 'Known conditions',
      points: 15,
      done: Array.isArray(profile.known_conditions) && profile.known_conditions.length > 0,
    },
    {
      key: 'medications',
      label: isSpanish ? 'Medicamentos' : 'Medications',
      points: 12,
      done: Array.isArray(profile.current_medications) && profile.current_medications.length > 0,
    },
    {
      key: 'blood_type',
      label: isSpanish ? 'Tipo de sangre' : 'Blood type',
      points: 10,
      done: !!(profile.blood_type),
    },
    {
      key: 'family_history',
      label: isSpanish ? 'Historia familiar' : 'Family history',
      points: 5,
      done: Array.isArray(profile.family_history) && profile.family_history.length > 0,
    },
  ];

  const earnedProfileBonus = profileBonusItems.filter(i => i.done).reduce((sum, i) => sum + i.points, 0);
  const maxProfileBonus = profileBonusItems.reduce((sum, i) => sum + i.points, 0);
  const totalProfilePossible = profileBonusItems.filter(i => !i.done).reduce((sum, i) => sum + i.points, 0);
  const profileComplete = earnedProfileBonus === maxProfileBonus;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-[#2D1B69] px-5 pt-12 pb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              {isSpanish ? 'Tu Cuenta de Trading' : 'Your Trading Account'}
            </h1>
            <p className="text-white/70 text-sm mt-1">
              {isSpanish ? 'Tu inteligencia biologica es tu activo mas valioso.' : 'Your biological intelligence is your most valuable asset.'}
            </p>
          </div>
          <button
            onClick={handleExportData}
            disabled={allCheckins.length === 0}
            title={isSpanish ? 'Exportar mis datos' : 'Export my data'}
            className="flex items-center gap-1.5 px-3 py-2 bg-white/15 hover:bg-white/25 text-white text-xs font-semibold rounded-xl transition-colors disabled:opacity-40 flex-shrink-0 mt-1"
          >
            <Download className="w-3.5 h-3.5" />
            {isSpanish ? 'Exportar datos' : 'Export my data'}
          </button>
        </div>
      </div>

      <div className="px-5 -mt-3 space-y-4">
        <div className={`${currentTier.bgColor} rounded-2xl p-6 text-white`}>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
              <TierIcon className="w-8 h-8 text-white" />
            </div>
            <div>
              <p className="text-white/70 text-sm">
                {isSpanish ? 'Tu nivel actual' : 'Your current tier'}
              </p>
              <p className="text-2xl font-bold">
                {isSpanish ? currentTier.name : currentTier.nameEn}
              </p>
            </div>
          </div>

          {nextTier && (
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-white/70">
                  {isSpanish ? 'Progreso al siguiente nivel' : 'Progress to next tier'}
                </span>
                <span className="font-medium">
                  {totalDeposits}/{nextTier.min}
                </span>
              </div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all"
                  style={{ width: `${Math.min(progressToNext, 100)}%` }}
                />
              </div>
              <p className="text-sm text-white/70 mt-2">
                {nextTier.min - totalDeposits} {isSpanish ? 'depositos para' : 'deposits to'} {isSpanish ? nextTier.name : nextTier.nameEn}
              </p>
            </div>
          )}
        </div>

        {showPremiumUnlocked && (
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl p-5 text-white">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle className="w-6 h-6" />
              <span className="font-bold text-lg">
                {isSpanish ? 'Premium desbloqueado' : 'Premium unlocked'}
              </span>
            </div>
            <p className="text-white/90 text-sm">
              {isSpanish
                ? 'La calidad de tus datos lo gano.'
                : 'Your data quality earned it.'}
            </p>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-lg p-5 border-l-4 border-[#2D1B69]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Award className="w-6 h-6 text-[#2D1B69]" />
              <span className="font-bold text-gray-900">
                {isSpanish ? 'Puntuacion de Calidad' : 'Quality Score'}
              </span>
            </div>
            <span className="text-3xl font-bold text-[#2D1B69]">{qualityScore + earnedProfileBonus}</span>
          </div>

          <div className="h-3 bg-gray-200 rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-gradient-to-r from-[#2D1B69] to-[#FF6B6B] rounded-full transition-all"
              style={{ width: `${Math.min(qualityScore + earnedProfileBonus, 100)}%` }}
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{isSpanish ? 'Frecuencia (30 dias)' : 'Frequency (30 days)'}</span>
              <span className="font-medium text-gray-900">{frequencyPoints}/40</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{isSpanish ? 'Consistencia' : 'Consistency'}</span>
              <span className="font-medium text-gray-900">{consistencyPoints}/30</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{isSpanish ? 'Dimensiones' : 'Dimensions'}</span>
              <span className="font-medium text-gray-900">{completenessPoints}/20</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{isSpanish ? 'Profundidad' : 'Depth'}</span>
              <span className="font-medium text-gray-900">{depthPoints}/10</span>
            </div>
            {earnedProfileBonus > 0 && (
              <div className="flex justify-between text-sm pt-1 border-t border-gray-100">
                <span className="text-emerald-600 font-medium">{isSpanish ? 'Bonus perfil de salud' : 'Health profile bonus'}</span>
                <span className="font-bold text-emerald-600">+{earnedProfileBonus}</span>
              </div>
            )}
          </div>

          {totalDeposits >= 31 && totalDeposits <= 60 && (qualityScore + earnedProfileBonus) < 70 && (
            <div className="mt-4 p-3 bg-amber-50 rounded-xl">
              <p className="text-xs text-amber-700">
                {isSpanish
                  ? `Necesitas ${70 - (qualityScore + earnedProfileBonus)} puntos mas para desbloquear Premium gratis en el nivel Crecimiento.`
                  : `Need ${70 - (qualityScore + earnedProfileBonus)} more points to unlock free Premium at Growth tier.`}
              </p>
            </div>
          )}
        </div>

        {/* Profile Completeness card */}
        <div className="bg-white rounded-2xl shadow-lg p-5 border-l-4 border-emerald-500">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-emerald-500" />
              <span className="font-bold text-gray-900">
                {isSpanish ? 'Perfil de Salud' : 'Health Profile'}
              </span>
            </div>
            <span className="text-lg font-bold text-emerald-600">+{earnedProfileBonus}/{maxProfileBonus}</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all"
              style={{ width: `${(earnedProfileBonus / maxProfileBonus) * 100}%` }}
            />
          </div>
          <div className="space-y-2">
            {profileBonusItems.map(item => (
              <div key={item.key} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-xs ${item.done ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                    {item.done ? '✓' : ''}
                  </span>
                  <span className={item.done ? 'text-gray-700' : 'text-gray-400'}>{item.label}</span>
                </div>
                <span className={`font-medium ${item.done ? 'text-emerald-600' : 'text-gray-400'}`}>
                  {item.done ? `+${item.points}` : `+${item.points} pts`}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Complete your health profile CTA */}
        {!profileComplete && (
          <div className="bg-gradient-to-br from-[#1a0f3d] to-[#2D1B69] rounded-2xl p-5 text-white">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-5 h-5 text-[#FFD93D]" />
              </div>
              <div>
                <p className="font-bold text-base">
                  {isSpanish ? 'Aumenta tu valor como dato' : 'Increase your data value'}
                </p>
                <p className="text-white/70 text-sm mt-1">
                  {isSpanish
                    ? 'Completa tu perfil de salud para aumentar tu valor como mercancia. Cada campo que completes hace tus datos mas valiosos para los compradores de investigacion.'
                    : 'Complete your health profile to increase your commodity value. Each field you complete makes your data more valuable to research buyers.'}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10">
              <span className="text-sm text-white/70">
                {isSpanish
                  ? `${totalProfilePossible} pts disponibles`
                  : `${totalProfilePossible} pts available`}
              </span>
              <button
                onClick={() => onNavigate?.('profile-edit')}
                className="flex items-center gap-1 bg-[#FFD93D] text-[#1a0f3d] text-sm font-bold px-4 py-2 rounded-xl"
              >
                {isSpanish ? 'Completar perfil' : 'Complete profile'}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl shadow-lg p-5">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              <span className="text-sm text-gray-500">
                {isSpanish ? 'Total depositos' : 'Total deposits'}
              </span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{totalDeposits}</p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-5">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-[#FFD93D]" />
              <span className="text-sm text-gray-500">
                {isSpanish ? 'Calidad promedio' : 'Avg quality'}
              </span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{avgQuality}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-5">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-5 h-5 text-blue-500" />
            <span className="text-sm text-gray-500">
              {isSpanish ? 'Dias como Data Trader' : 'Days as Data Trader'}
            </span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{daysSinceJoined}</p>
        </div>

        {showSexual && (
          <div className="bg-white rounded-2xl shadow-lg p-5 border-l-4 border-[#FF6B6B]">
            <div className="flex items-center gap-2 mb-2">
              <Flame className="w-5 h-5 text-[#FF6B6B]" />
              <span className="text-sm text-gray-500">
                {isSpanish ? 'Datos dimension sexual' : 'Sexual dimension data'}
              </span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{sexualDeposits}</p>
            <p className="text-xs text-gray-400 mt-1">
              {isSpanish ? 'depositos' : 'deposits'}
            </p>
            <p className="text-xs text-emerald-600 mt-2 font-medium">
              {isSpanish ? 'Dato de alto valor para investigacion' : 'High research value data point'}
            </p>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-lg p-5 border-l-4 border-amber-500">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <span className="text-sm text-gray-500">
              {isSpanish ? 'Patron de ansiedad' : 'Anxiety pattern'}
            </span>
          </div>
          {anxietyDeposits >= 30 && highestAnxietyPhase ? (
            <>
              <p className="text-sm font-medium text-gray-900">
                {isSpanish
                  ? `Tus ventanas de mayor ansiedad ocurren en la fase ${highestAnxietyPhase}.`
                  : `Your highest anxiety windows occur during the ${highestAnxietyPhase} phase.`}
              </p>
              <p className="text-xs text-gray-400 mt-2">
                {isSpanish
                  ? `Basado en ${anxietyDeposits} depositos de ansiedad`
                  : `Based on ${anxietyDeposits} anxiety deposits`}
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-600">
                {isSpanish
                  ? 'Tu patron personal de ansiedad se esta calculando. Regresa despues de 30 depositos.'
                  : 'Your personal anxiety pattern is being calculated. Check back after 30 deposits.'}
              </p>
              <p className="text-xs text-gray-400 mt-2">
                {anxietyDeposits}/30 {isSpanish ? 'depositos' : 'deposits'}
              </p>
              <div className="h-1.5 bg-gray-200 rounded-full mt-2 overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full"
                  style={{ width: `${Math.min((anxietyDeposits / 30) * 100, 100)}%` }}
                />
              </div>
            </>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-5">
          <h3 className="font-bold text-gray-900 mb-4">
            {isSpanish ? 'Niveles' : 'Tiers'}
          </h3>
          <div className="space-y-3">
            {tiers.map((tier) => {
              const isCurrentTier = tier === currentTier;
              const TIcon = tier.icon;
              return (
                <div
                  key={tier.name}
                  className={`flex items-center gap-3 p-3 rounded-xl ${
                    isCurrentTier ? `${tier.bgColor} text-white` : 'bg-gray-50'
                  }`}
                >
                  <TIcon className={`w-5 h-5 ${isCurrentTier ? 'text-white' : tier.color}`} />
                  <div className="flex-1">
                    <p className={`font-medium ${isCurrentTier ? 'text-white' : 'text-gray-900'}`}>
                      {isSpanish ? tier.name : tier.nameEn}
                    </p>
                    <p className={`text-xs ${isCurrentTier ? 'text-white/70' : 'text-gray-500'}`}>
                      {tier.min}-{tier.max === Infinity ? '100+' : tier.max} {isSpanish ? 'depositos' : 'deposits'}
                    </p>
                  </div>
                  {isCurrentTier && (
                    <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
                      {isSpanish ? 'Actual' : 'Current'}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-gradient-to-r from-[#2D1B69] to-[#FF6B6B] rounded-2xl p-5">
          <p className="text-white/90 text-sm leading-relaxed">
            {isSpanish
              ? 'Eres un Data Trader. Tus patrones biologicos son tu mercancia. BioCycle es tu exchange.'
              : 'You are a Data Trader. Your biological patterns are your commodity. BioCycle is your exchange.'}
          </p>
        </div>
      </div>
    </div>
  );
}
