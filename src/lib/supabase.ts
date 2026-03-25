import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Profile = {
  id: string;
  nombre: string | null;
  genero: string | null;
  fecha_nacimiento: string;
  idioma: string;
  cycle_length: number;
  last_period_date: string | null;
  picardia_mode: boolean;
  trust_stage: string;
  checkin_times?: import('../utils/notifications').CheckinTime[] | null;
};

export type Checkin = {
  id: string;
  user_id: string;
  checkin_date: string;
  factor_emocional: number | null;
  factor_fisico: number | null;
  factor_cognitivo: number | null;
  factor_estres: number | null;
  factor_social: number | null;
  factor_sexual: number | null;
  factor_ansiedad: number | null;
  calidad_score: number | null;
  phase_at_checkin: string | null;
  notas: string | null;
};
