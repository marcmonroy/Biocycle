import { Profile } from '../lib/supabase';
import { ForecastDay } from '../utils/phaseEngine';
import { Battery, Brain, Heart, Dumbbell, Flame, AlertTriangle } from 'lucide-react';

interface ForecastScreenProps {
  profile: Profile;
  forecast: ForecastDay[];
}

const phaseNames: Record<string, { es: string; en: string }> = {
  menstrual: { es: 'Menstrual', en: 'Menstrual' },
  follicular: { es: 'Folicular', en: 'Follicular' },
  ovulatory: { es: 'Ovulatoria', en: 'Ovulatory' },
  luteal: { es: 'Lutea', en: 'Luteal' },
  weekly_peak: { es: 'Pico Semanal', en: 'Weekly Peak' },
  morning_peak: { es: 'Pico Matutino', en: 'Morning Peak' },
  afternoon_dip: { es: 'Bajada', en: 'Afternoon Dip' },
  evening_balanced: { es: 'Equilibrio', en: 'Evening Balance' },
  night_rest: { es: 'Descanso', en: 'Night Rest' },
};

const phaseInsightsEs: Record<string, string> = {
  menstrual: 'Tiempo de descanso y reflexion. Prioriza el autocuidado.',
  follicular: 'Tu energia crece. Ideal para iniciar proyectos nuevos.',
  ovulatory: 'Estas en tu mejor momento. Aprovecha para socializar.',
  luteal: 'Fase de introspeccion. Enfocate en completar tareas.',
  weekly_peak: 'Maxima energia semanal. Ideal para retos importantes.',
  morning_peak: 'Tu mente esta en su punto maximo. Tareas complejas.',
  afternoon_dip: 'Energia natural baja. Tareas rutinarias o pausa.',
  evening_balanced: 'Equilibrio recuperado. Ejercicio o actividades sociales.',
  night_rest: 'Tu cuerpo pide descanso. Prepara una buena noche.',
};

const phaseInsightsEn: Record<string, string> = {
  menstrual: 'Time for rest and reflection. Prioritize self-care.',
  follicular: 'Your energy is rising. Ideal for starting new projects.',
  ovulatory: 'You are at your peak. Take advantage for socializing.',
  luteal: 'Introspection phase. Focus on completing tasks.',
  weekly_peak: 'Maximum weekly energy. Ideal for important challenges.',
  morning_peak: 'Your mind is at its peak. Complex tasks.',
  afternoon_dip: 'Natural energy dip. Routine tasks or a break.',
  evening_balanced: 'Balance recovered. Exercise or social activities.',
  night_rest: 'Your body asks for rest. Prepare a good night.',
};

const phaseColors: Record<string, string> = {
  menstrual: 'border-red-500',
  follicular: 'border-emerald-500',
  ovulatory: 'border-[#FFD93D]',
  luteal: 'border-[#2D1B69]',
  weekly_peak: 'border-[#FF6B6B]',
  morning_peak: 'border-[#FFD93D]',
  afternoon_dip: 'border-blue-500',
  evening_balanced: 'border-[#2D1B69]',
  night_rest: 'border-slate-600',
};

const dayNamesEs = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
const dayNamesEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const monthNamesEs = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const monthNamesEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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

export function ForecastScreen({ profile, forecast }: ForecastScreenProps) {
  const isSpanish = profile.idioma === 'ES';
  const showSexual = isAdult(profile);
  const dayNames = isSpanish ? dayNamesEs : dayNamesEn;
  const monthNames = isSpanish ? monthNamesEs : monthNamesEn;
  const phaseInsights = isSpanish ? phaseInsightsEs : phaseInsightsEn;

  const formatDate = (date: Date) => {
    return `${dayNames[date.getDay()]} ${date.getDate()} ${monthNames[date.getMonth()]}`;
  };

  const getMetrics = (day: ForecastDay) => {
    const baseMetrics = [
      { label: isSpanish ? 'Energia' : 'Energy', value: day.energy, color: '#F5C842', icon: Battery },
      { label: isSpanish ? 'Cognitivo' : 'Cognitive', value: day.cognitive, color: '#00D4A1', icon: Brain },
      { label: isSpanish ? 'Emocional' : 'Emotional', value: day.emotional, color: '#FF6B6B', icon: Heart },
      { label: isSpanish ? 'Fisico' : 'Physical', value: day.physical, color: '#7B61FF', icon: Dumbbell },
    ];

    if (showSexual) {
      baseMetrics.push({ label: 'Sexual', value: day.sexual, color: '#FF6B6B', icon: Flame });
    }

    return baseMetrics;
  };

  const getAnxietyIndicator = (anxiety: number) => {
    if (anxiety >= 70) return { level: 'high', bgColor: 'bg-[#FF4444]', textBgColor: 'bg-red-950/50', textColor: 'text-red-400' };
    if (anxiety >= 40) return { level: 'elevated', bgColor: 'bg-[#FFB347]', textBgColor: 'bg-amber-950/50', textColor: 'text-amber-400' };
    return { level: 'low', bgColor: 'bg-[#00D4A1]', textBgColor: 'bg-emerald-950/50', textColor: 'text-emerald-400' };
  };

  const upcomingHighAnxiety = forecast.slice(1, 3).find(day => day.anxiety >= 70);
  const hoursUntilHighAnxiety = upcomingHighAnxiety
    ? Math.round((upcomingHighAnxiety.date.getTime() - new Date().getTime()) / (1000 * 60 * 60))
    : null;

  return (
    <div className="min-h-screen bg-[#0A0A1A] pb-24">
      <div className="bg-[#0A0A1A] border-b border-[#1E1E3A] px-5 pt-12 pb-6">
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Clash Display, system-ui, sans-serif' }}>
          {isSpanish ? 'Tu Pronostico — 7 Dias' : 'Your 7-Day Forecast'}
        </h1>
        <p className="text-[#8B95B0] text-sm mt-1">
          {isSpanish ? 'Inteligencia biologica predictiva' : 'Predictive biological intelligence'}
        </p>
      </div>

      {hoursUntilHighAnxiety && (
        <div className="mx-4 mt-3 mb-3 bg-red-950/60 border border-red-900/50 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-300 text-sm font-medium leading-relaxed">
              {isSpanish
                ? `Ventana de vulnerabilidad se aproxima en ${hoursUntilHighAnxiety} horas. Reduce cafeina, protege tu sueno, evita decisiones importantes.`
                : `Anxiety vulnerability window approaching in ${hoursUntilHighAnxiety} hours. Reduce caffeine, protect sleep, avoid high-stakes decisions.`}
            </p>
          </div>
        </div>
      )}

      <div className="px-4 mt-3 space-y-3">
        {forecast.map((day, index) => {
          const isToday = index === 0;
          const phaseName = phaseNames[day.phase] || { es: day.phase, en: day.phase };
          const insight = phaseInsights[day.phase] || day.insight;
          const anxietyIndicator = getAnxietyIndicator(day.anxiety);
          const metrics = getMetrics(day);

          return (
            <div
              key={index}
              className={`bg-[#111126] rounded-2xl p-4 border-l-4 ${phaseColors[day.phase] || 'border-[#1E1E3A]'} ${
                isToday ? 'border border-[#F5C842]/40 border-l-4' : 'border border-[#1E1E3A]'
              }`}
              style={isToday ? { borderLeftColor: undefined } : undefined}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs text-[#8B95B0]">
                    {isToday ? (isSpanish ? 'Hoy' : 'Today') : formatDate(day.date)}
                  </p>
                  <p className="text-base font-bold text-white mt-0.5" style={{ fontFamily: 'Clash Display, system-ui, sans-serif' }}>
                    {isSpanish ? phaseName.es : phaseName.en}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {isToday && (
                    <span className="px-2 py-1 bg-[#F5C842]/10 text-[#F5C842] text-xs font-medium rounded-full border border-[#F5C842]/30">
                      {isSpanish ? 'Hoy' : 'Today'}
                    </span>
                  )}
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${anxietyIndicator.textBgColor} ${anxietyIndicator.textColor}`}>
                    {anxietyIndicator.level === 'high'
                      ? isSpanish
                        ? 'Vulnerabilidad'
                        : 'Vulnerability'
                      : anxietyIndicator.level === 'elevated'
                      ? isSpanish
                        ? 'Elevada'
                        : 'Elevated'
                      : isSpanish
                      ? 'Baja'
                      : 'Low'}
                  </span>
                </div>
              </div>

              <div className="space-y-2 mb-3">
                {metrics.map(({ label, value, color, icon: Icon }) => (
                  <div key={label}>
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="w-3.5 h-3.5 text-[#4A5568]" />
                      <span className="text-xs text-[#8B95B0] flex-1">{label}</span>
                      <span className="text-xs font-bold text-white" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{value}%</span>
                    </div>
                    <div className="h-1 bg-[#1E1E3A] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${value}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-sm text-[#8B95B0] leading-relaxed pt-2 border-t border-[#1E1E3A]">
                {insight}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
