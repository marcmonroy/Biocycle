import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Type definitions ─────────────────────────────────────────────────────

export interface Profile {
  id: string;
  nombre: string | null;
  genero: string | null;
  idioma: 'EN' | 'ES';
  picardia_mode: boolean;
  fecha_nacimiento: string | null;
  age_verified: boolean;
  whatsapp_phone: string | null;
  whatsapp_verified: boolean;
  whatsapp_enabled: boolean | null;
  preferred_checkin_slot: 'morning' | 'afternoon' | 'night' | null;

  // Body metrics
  height_cm: number | null;
  weight_kg: number | null;
  bmi: number | null;
  sleep_hours: number | null;

  // Lifestyle
  exercise_frequency: string | null;
  exercise_type: string[] | null;
  diet_type: string | null;
  blood_type: string | null;
  caffeine_per_day: number | null;
  alcohol_per_week: number | null;

  // Medical (jsonb arrays)
  known_conditions: string[] | null;
  current_medications: string[] | null;
  family_history: string[] | null;
  hormonal_transition: string | null;
  has_sexual_partner: boolean | null;

  // Cycle
  cycle_start_date: string | null;
  last_period_date: string | null;
  cycle_length: number | null;

  // Check-in schedule
  checkin_times: {
    morning: { hour: number; label: string };
    afternoon: { hour: number; label: string };
    night: { hour: number; label: string };
  } | null;

  // System
  pattern_summary: string | null;
  pattern_updated_at: string | null;
  wearable_connected: boolean;
  wearable_source: string | null;
  validation_due_date: string | null;
  days_of_data: number | null;
  pattern_delta_vector: Record<string, number> | null;
  compatibility_opt_in: boolean;
  cycle_auto_detect_enabled: boolean;
  onboarding_complete: boolean | null;
  created_at: string;
}

export interface UserState {
  id: string;
  user_id: string;
  state: 'active_trader' | 'paused_trader' | 'paid_trader';
  last_response_date: string | null;
  streak_at_lapse: number | null;
  returned_at: string | null;
  return_method: string | null;
  founding_trader: boolean;
  tier: 'free' | 'standard' | 'premium' | null;
  created_at: string;
  updated_at: string;
}

// ── Tier limits — single source of truth ─────────────────────────────────

export interface TierLimits {
  adhocTurns: number;       // max ADHOC turns per session
  circleMax: number;        // max people in Circle
  compatibilityMax: number; // max compatibility connections
  forecastDays: number;     // forecast horizon in days
  forecastAllDims: boolean; // show all 8 dimensions (false = energy + sexual only)
  forecastComposite: boolean; // show composite scores
  forecastHighlights: boolean; // show best/worst day highlights
  vulnerabilityAlerts: boolean; // show vulnerability window alerts
  accuracyDisplay: boolean; // show forecast accuracy %
  dataTrading: boolean;     // eligible for data trading
  dataTradingShare: number; // revenue share % (0 if not eligible)
  lapseProtection: boolean; // keeps access if lapses 7+ days
}

export function getTierLimits(userState: UserState | null): TierLimits {
  // Founding traders get full premium forever
  if (userState?.founding_trader) {
    return {
      adhocTurns: 7, circleMax: 10, compatibilityMax: 7,
      forecastDays: 14, forecastAllDims: true, forecastComposite: true,
      forecastHighlights: true, vulnerabilityAlerts: true, accuracyDisplay: true,
      dataTrading: true, dataTradingShare: 80, lapseProtection: true,
    };
  }
  const tier = userState?.tier ?? 'free';
  if (tier === 'premium') {
    return {
      adhocTurns: 7, circleMax: 10, compatibilityMax: 7,
      forecastDays: 14, forecastAllDims: true, forecastComposite: true,
      forecastHighlights: true, vulnerabilityAlerts: true, accuracyDisplay: true,
      dataTrading: true, dataTradingShare: 80, lapseProtection: true,
    };
  }
  if (tier === 'standard') {
    return {
      adhocTurns: 3, circleMax: 5, compatibilityMax: 3,
      forecastDays: 7, forecastAllDims: true, forecastComposite: false,
      forecastHighlights: false, vulnerabilityAlerts: true, accuracyDisplay: true,
      dataTrading: true, dataTradingShare: 70, lapseProtection: true,
    };
  }
  // free (default)
  return {
    adhocTurns: 1, circleMax: 3, compatibilityMax: 1,
    forecastDays: 3, forecastAllDims: false, forecastComposite: false,
    forecastHighlights: false, vulnerabilityAlerts: false, accuracyDisplay: false,
    dataTrading: false, dataTradingShare: 0, lapseProtection: false,
  };
}

export interface ConversationSession {
  id: string;
  user_id: string;
  session_date: string;
  time_slot: 'morning' | 'afternoon' | 'night';
  phase_at_session: string | null;
  personality_mode: 'jules' | 'sienna';
  session_complete: boolean;
  integrity_score: number | null;
  session_duration_seconds: number | null;
  manual_entry: boolean;
  session_summary: string | null;
  factor_energia: number | null;
  factor_cognitivo: number | null;
  factor_estres: number | null;
  factor_ansiedad: number | null;
  factor_emocional: number | null;
  factor_social: number | null;
  factor_sueno: number | null;
  factor_sexual: number | null;
  factor_hidratacion: string | null;
  factor_cafeina: number | null;
  factor_alcohol: boolean | null;
  day_memory: string | null;
  day_rating: number | null;
  interrupted_at_state: string | null;
  created_at: string;
}

// ── Compatibility ─────────────────────────────────────────────────────────

export type CompatibilityType = 'vibe' | 'cognitive' | 'performance' | 'intimacy';

export interface CompatibilityConnection {
  id: string;
  user_a_id: string;
  user_b_id: string | null;
  invited_phone: string;
  invited_name: string;
  type: CompatibilityType;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  initiated_at: string;
  responded_at: string | null;
  last_viewed_at: string | null;
  // Joined from profiles when user_b exists
  partner_profile?: Profile | null;
}

// Which compatibility types a tier can initiate
export function getCompatibilityTierAccess(tierLimits: TierLimits): CompatibilityType[] {
  const types: CompatibilityType[] = ['vibe'];
  if (tierLimits.adhocTurns >= 3) {
    types.push('cognitive', 'performance');
  }
  if (tierLimits.adhocTurns === 7) {
    types.push('intimacy');
  }
  return types;
}
