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
  onboarding_complete: boolean | null;
  created_at: string;
}

export interface UserState {
  id: string;
  user_id: string;
  state: 'active_trader' | 'paused' | 'churned';
  last_response_date: string | null;
  streak_at_lapse: number | null;
  returned_at: string | null;
  return_method: string | null;
  founding_trader: boolean;
  created_at: string;
  updated_at: string;
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
