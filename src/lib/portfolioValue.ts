import { supabase } from './supabase';
import type { Profile } from './supabase';

export interface PortfolioMetrics {
  value: number;
  qualityScore: number;
  consistencyScore: number;
  daysOfData: number;
}

const DIMS = [
  'factor_energia','factor_cognitivo','factor_estres','factor_ansiedad',
  'factor_sueno','factor_cafeina','factor_emocional','factor_social','factor_sexual',
  'factor_hidratacion','day_rating','day_memory','factor_alcohol'
];

export async function computePortfolioMetrics(profile: Profile): Promise<PortfolioMetrics> {
  const daysOfData = profile.days_of_data ?? 0;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: allSessions } = await supabase
    .from('conversation_sessions')
    .select(['session_date', ...DIMS].join(','))
    .eq('user_id', profile.id)
    .eq('session_complete', true)
    .order('session_date', { ascending: false })
    .limit(90);

  if (!allSessions || allSessions.length === 0) {
    return { value: 0.10, qualityScore: 0, consistencyScore: 0, daysOfData };
  }

  const last30 = allSessions.filter((s: any) =>
    s.session_date >= thirtyDaysAgo.toISOString().split('T')[0]
  );

  // Quality score
  let quality = 0;
  if (last30.length > 0) {
    const depositFreq = Math.min(40, (last30.length / 30) * 40);
    const dates30 = [...new Set(last30.map((s: any) => s.session_date as string))].sort();
    let hasGap = false;
    for (let i = 1; i < dates30.length; i++) {
      const diff = (Date.parse(dates30[i]) - Date.parse(dates30[i - 1])) / 86_400_000;
      if (diff > 2) { hasGap = true; break; }
    }
    const consistency = hasGap ? 15 : 30;
    const totalFields = last30.length * DIMS.length;
    const filledFields = last30.reduce((acc: number, s: any) =>
      acc + DIMS.filter(d => s[d] !== null && s[d] !== undefined).length, 0);
    const completeness = (filledFields / totalFields) * 20;
    const depth = Math.min(10, (daysOfData / 90) * 10);
    quality = Math.min(100, Math.round(depositFreq + consistency + completeness + depth));
  }

  // Consistency score
  let consistencyScore = 0;
  if (last30.length > 0) {
    const expectedSessions = Math.min(daysOfData, 30) * 3;
    const sessionRatio = Math.min(1, last30.length / expectedSessions);
    const dates30 = [...new Set(last30.map((s: any) => s.session_date as string))].sort();
    let gaps = 0;
    for (let i = 1; i < dates30.length; i++) {
      const diff = (Date.parse(dates30[i]) - Date.parse(dates30[i - 1])) / 86_400_000;
      if (diff > 1) gaps += diff - 1;
    }
    const gapPenalty = Math.min(1, gaps / 10);
    consistencyScore = Math.round((sessionRatio * 60 + (1 - gapPenalty) * 40));
  }

  // Data Value formula — same as DashboardScreen
  const researchEligible = daysOfData >= 30;
  let value = daysOfData * 0.02;
  value *= (quality / 100) || 0.1;

  if (researchEligible) {
    if (profile.height_cm && profile.weight_kg && profile.exercise_frequency) value += 1.5;
    if (profile.known_conditions?.length && profile.current_medications?.length) value += 2.5;
    if (profile.blood_type) value += 1.0;

    if (profile.fecha_nacimiento) {
      const age = new Date().getFullYear() - new Date(profile.fecha_nacimiento).getFullYear();
      if (age >= 40) value *= 1.3;
    }
    if (profile.wearable_connected) value += 3.0;
  }

  value = Math.max(0.10, value);

  return { value, qualityScore: quality, consistencyScore, daysOfData };
}
