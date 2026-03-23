import { useState, useEffect } from 'react';
import { supabase, Profile, Checkin } from '../lib/supabase';
import { TrendingUp, Calendar, Loader2, Sprout, TreeDeciduous, Leaf, Crown, Sparkles, Flame, AlertTriangle } from 'lucide-react';

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

export function DashboardScreen({ profile }: DashboardScreenProps) {
  const isSpanish = profile.idioma === 'ES';
  const showSexual = isAdult(profile);

  const [loading, setLoading] = useState(true);
  const [totalDeposits, setTotalDeposits] = useState(0);
  const [avgQuality, setAvgQuality] = useState(0);
  const [daysSinceJoined, setDaysSinceJoined] = useState(0);
  const [sexualDeposits, setSexualDeposits] = useState(0);
  const [anxietyDeposits, setAnxietyDeposits] = useState(0);
  const [highestAnxietyPhase, setHighestAnxietyPhase] = useState<string | null>(null);

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
        setTotalDeposits(checkins.length);
        const totalQuality = checkins.reduce((sum: number, c: Checkin) => sum + (c.calidad_score || 0), 0);
        setAvgQuality(Math.round(totalQuality / checkins.length * 10) / 10);

        const sexualCount = checkins.filter((c: Checkin) => c.factor_sexual !== null && c.factor_sexual !== undefined).length;
        setSexualDeposits(sexualCount);

        const anxietyCount = checkins.filter((c: Checkin) => c.factor_ansiedad !== null && c.factor_ansiedad !== undefined).length;
        setAnxietyDeposits(anxietyCount);

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

  const progressToNext = nextTier
    ? ((totalDeposits - currentTier.min) / (nextTier.min - currentTier.min)) * 100
    : 100;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-[#2D1B69] px-5 pt-12 pb-6">
        <h1 className="text-2xl font-bold text-white">
          {isSpanish ? 'Tu Portafolio Biologico' : 'Your Biological Portfolio'}
        </h1>
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
              {isSpanish ? 'Dias como inversor' : 'Days as investor'}
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
              ? 'A los 500 inversores con 30 o mas depositos cada uno, BioCycle activa el mercado de investigacion. Tus datos empiezan a generar retornos.'
              : 'At 500 investors with 30 or more deposits each, BioCycle activates the research marketplace. Your data starts generating returns.'}
          </p>
        </div>
      </div>
    </div>
  );
}
