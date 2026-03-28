import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Brain, Zap, Heart, Shield, DollarSign, Check, Users, Database, ArrowRight, Mail, Loader2, Sprout, Dna, TrendingUp, ChevronRight, Lock, Settings2, Eye, EyeOff, ArrowLeft } from 'lucide-react';

const content = {
  hero: {
    headline: { en: 'Know yourself before it happens.', es: 'Conocete antes de que suceda.' },
    subheadline: { en: 'Knowing yourself pays.', es: 'Conocerte paga.' },
    subtitle: {
      en: 'Every self-observation grows into biological intelligence. Your patterns become a tradeable asset. BioCycle is where your data blooms.',
      es: 'Cada auto-observacion crece hasta convertirse en inteligencia biologica. Tus patrones se convierten en un activo negociable. BioCycle es donde tus datos florecen.',
    },
  },
  registerButton: { en: 'Create Account', es: 'Crear Cuenta' },
  openAccountButton: { en: 'Open your data account — free', es: 'Abre tu cuenta de datos — gratis' },
  signInButton: { en: 'Sign in', es: 'Iniciar sesion' },
  backToLanding: { en: 'Back', es: 'Volver' },
  promises: [
    {
      icon: Brain,
      title: { en: 'Predict your mood', es: 'Predice tu estado de animo' },
      desc: { en: 'Know your emotional state 48 hours before it arrives.', es: 'Conoce tu estado emocional 48 horas antes de que llegue.' },
    },
    {
      icon: Zap,
      title: { en: 'Understand your energy', es: 'Entiende tu energia' },
      desc: { en: 'Your physical and cognitive performance follows predictable biological cycles.', es: 'Tu rendimiento fisico y cognitivo sigue ciclos biologicos predecibles.' },
    },
    {
      icon: Heart,
      title: { en: 'Know your impulses', es: 'Conoce tus impulsos' },
      desc: { en: 'Your desires and reactions are biologically driven. BioCycle shows you the pattern before it shows up.', es: 'Tus deseos y reacciones tienen base biologica. BioCycle te muestra el patron antes de que aparezca.' },
    },
  ],
  dataBank: {
    title: { en: 'Your biological intelligence is worth money.', es: 'Tu inteligencia biologica vale dinero.' },
    subtitle: {
      en: 'Every observation becomes a deposit. Your patterns become a tradeable commodity. BioCycle pays you when researchers buy your insights.',
      es: 'Cada observacion se convierte en un deposito. Tus patrones se convierten en mercancia. BioCycle te paga cuando los investigadores compran tus datos.',
    },
    columns: [
      { icon: Shield, title: { en: 'You own everything', es: 'Eres dueno de todo' } },
      { icon: DollarSign, title: { en: 'You keep 75%', es: 'Te quedas el 75%' } },
      { icon: Check, title: { en: 'You approve every trade', es: 'Apruebas cada operacion' } },
    ],
  },
  social: {
    title: {
      en: "Join the Data Traders building the world's first biological intelligence exchange.",
      es: 'Unete a los Data Traders que construyen el primer exchange de inteligencia biologica del mundo.',
    },
  },
  researcher: {
    title: { en: 'Are you a researcher or institution?', es: 'Eres investigador o institucion?' },
    subtitle: {
      en: "Access the world's first consented longitudinal hormonal behavioral dataset.",
      es: 'Accede al primer conjunto de datos conductuales hormonales longitudinales con consentimiento del mundo.',
    },
    link: { en: 'Visit Research Portal', es: 'Visitar Portal de Investigacion' },
  },
  stages: {
    title: { en: 'How your data grows', es: 'Como crecen tus datos' },
    items: [
      {
        icon: Sprout,
        title: { en: 'Plant', es: 'Siembra' },
        desc: {
          en: 'Make daily deposits. Every self-observation is a seed. Your biological data account opens the moment you register.',
          es: 'Realiza depositos diarios. Cada auto-observacion es una semilla. Tu cuenta se abre en el momento en que te registras.',
        },
      },
      {
        icon: Dna,
        title: { en: 'Grow', es: 'Crece' },
        desc: {
          en: 'Your biological intelligence develops. Patterns emerge across your moods, energy, and cycles. Your forecast sharpens with every deposit.',
          es: 'Tu inteligencia biologica se desarrolla. Emergen patrones en tus estados de animo, energia y ciclos. Tu pronostico se afina con cada deposito.',
        },
      },
      {
        icon: TrendingUp,
        title: { en: 'Trade', es: 'Trade' },
        desc: {
          en: 'Your data matures into a commodity. Researchers buy your anonymized insights. You keep 75% of every transaction you approve.',
          es: 'Tus datos maduran hasta convertirse en mercancia. Los investigadores compran tus datos anonimizados. Te quedas el 75% de cada transaccion que apruebas.',
        },
      },
    ],
  },
  preview: {
    title: { en: 'Know yourself before it happens.', es: 'Conocete antes de que suceda.' },
    subtitle: {
      en: 'BioCycle predicts your moods, energy, and impulses 7 days in advance.',
      es: 'BioCycle predice tus estados de animo, energia e impulsos con 7 dias de anticipacion.',
    },
  },
  tradingBenefits: {
    title: {
      en: 'Your biological data. Your commodity. Your earnings.',
      es: 'Tus datos biologicos. Tu mercancia. Tus ganancias.',
    },
    items: [
      {
        icon: Lock,
        title: { en: 'You own everything', es: 'Eres dueno de todo' },
        desc: {
          en: 'Your raw data never leaves your control. You approve every transaction individually.',
          es: 'Tus datos en bruto nunca salen de tu control. Apruebas cada transaccion individualmente.',
        },
      },
      {
        icon: DollarSign,
        title: { en: 'You keep 75%', es: 'Te quedas el 75%' },
        desc: {
          en: 'Of every research transaction. BioCycle takes 25% as exchange operator.',
          es: 'De cada transaccion de investigacion. BioCycle toma el 25% como operador del exchange.',
        },
      },
      {
        icon: Settings2,
        title: { en: 'You set the terms', es: 'Tu pones las condiciones' },
        desc: {
          en: 'Granular consent controls. You decide exactly what data is shared, with whom, and for what purpose.',
          es: 'Controles de consentimiento granulares. Tu decides exactamente que datos se comparten, con quien y para que proposito.',
        },
      },
    ],
  },
  liveCounter: {
    title: {
      en: "Join the Data Traders building the world's first biological intelligence exchange.",
      es: 'Unete a los Data Traders que construyen el primer exchange de inteligencia biologica del mundo.',
    },
    enrolled: { en: 'Data Traders enrolled', es: 'Data Traders inscritos' },
  },
  form: {
    email: { en: 'Email', es: 'Correo electronico' },
    password: { en: 'Password', es: 'Contrasena' },
    passwordHint: { en: 'Minimum 6 characters', es: 'Minimo 6 caracteres' },
    haveAccount: { en: 'Already have an account?', es: 'Ya tienes cuenta?' },
    signIn: { en: 'Sign in', es: 'Iniciar sesion' },
  },
};

interface ForecastCardProps {
  day: string;
  date: string;
  phase: { en: string; es: string };
  phaseColor: string;
  scores: Array<{
    label: { en: string; es: string };
    value: number;
    color: string;
  }>;
  lang: 'en' | 'es';
}

function ForecastCard({ day, date, phase, phaseColor, scores, lang }: ForecastCardProps) {
  const t = (obj: { en: string; es: string }) => obj[lang];

  return (
    <div className="bg-[#150c2e] border border-[#2D1B69]/30 rounded-2xl p-6 hover:border-[#FFD93D]/20 transition-colors">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-lg font-semibold">{day}</p>
          <p className="text-sm text-slate-400">{date}</p>
        </div>
        <div
          className="px-3 py-1 rounded-full text-sm font-medium"
          style={{ backgroundColor: `${phaseColor}20`, color: phaseColor }}
        >
          {t(phase)}
        </div>
      </div>
      <div className="space-y-4">
        {scores.map((score, i) => (
          <div key={i}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-slate-400">{t(score.label)}</span>
              <span className="text-sm font-medium" style={{ color: score.color }}>{score.value}%</span>
            </div>
            <div className="h-2 bg-[#1a0f3d] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${score.value}%`, backgroundColor: score.color }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface LandingScreenProps {
  onAuthSuccess?: () => void;
}

type AuthMode = 'none' | 'register' | 'signin';

export function LandingScreen({ onAuthSuccess }: LandingScreenProps) {
  const [lang, setLang] = useState<'en' | 'es'>('es');
  const [traderCount, setTraderCount] = useState<number | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [heroLoaded, setHeroLoaded] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('none');

  const t = (obj: { en: string; es: string }) => obj[lang];

  useEffect(() => {
    loadTraderCount();
  }, []);

  const loadTraderCount = async () => {
    const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
    setTraderCount(count || 0);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setError(null);

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        throw signUpError;
      }

      if (onAuthSuccess) {
        onAuthSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    if (!email || !password) return;

    setLoading(true);
    setError(null);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        throw signInError;
      }

      if (onAuthSuccess) {
        onAuthSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A1A] text-white">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0A0A1A]/90 backdrop-blur-lg border-b border-[#1E1E3A]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img
              src="https://hguqyuupwfpszsmdjrzz.supabase.co/storage/v1/object/public/assets/Biocycle_small.png"
              alt="BioCycle"
              className="w-8 h-8 object-contain"
            />
            <span className="font-bold text-lg">BioCycle</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setLang(lang === 'en' ? 'es' : 'en')}
              className="px-3 py-1.5 text-sm font-medium text-slate-300 hover:text-white border border-[#2D1B69]/50 rounded-lg transition-colors"
            >
              {lang === 'en' ? 'ES' : 'EN'}
            </button>
          </div>
        </div>
      </nav>

      <section className="relative min-h-screen flex flex-col items-center justify-center pb-12 overflow-hidden">
        <div className="relative z-10 flex flex-col items-center px-6 text-center">
          <img
            src="https://hguqyuupwfpszsmdjrzz.supabase.co/storage/v1/object/public/assets/Biocycle_med.png"
            alt="BioCycle"
            className="w-[220px] h-auto mx-auto mt-[60px] mb-8"
          />

          <h1 className="text-4xl md:text-6xl font-bold mb-4 leading-tight max-w-3xl text-[#F5C842]" style={{ fontFamily: 'Clash Display, system-ui, sans-serif' }}>
            {t(content.hero.headline)}
          </h1>
          <p className="text-2xl md:text-3xl font-semibold text-white mb-6">
            {t(content.hero.subheadline)}
          </p>
          <p className="text-lg md:text-xl text-slate-400 mb-10 leading-relaxed max-w-2xl">
            {t(content.hero.subtitle)}
          </p>

          <div className="w-full max-w-md">
            {authMode === 'none' ? (
              <div className="space-y-4">
                <button
                  onClick={() => setAuthMode('register')}
                  className="w-full px-6 py-4 bg-[#FF6B6B] text-white font-semibold rounded-xl hover:bg-[#FF5252] transition-all shadow-lg shadow-[#FF6B6B]/25 flex items-center justify-center gap-2"
                >
                  {t(content.openAccountButton)}
                  <ArrowRight className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setAuthMode('signin')}
                  className="w-full px-6 py-4 bg-transparent border-2 border-[#FFD93D] text-[#FFD93D] font-semibold rounded-xl hover:bg-[#FFD93D]/10 transition-all flex items-center justify-center gap-2"
                >
                  {t(content.signInButton)}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <button
                  onClick={() => {
                    setAuthMode('none');
                    setError(null);
                    setEmail('');
                    setPassword('');
                  }}
                  className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {t(content.backToLanding)}
                </button>
                <form onSubmit={authMode === 'register' ? handleRegister : (e) => { e.preventDefault(); handleSignIn(); }} className="space-y-4">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8892A4]" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-[#1A1A2E] text-white border border-white/20 focus:border-[#2D1B69] focus:outline-none placeholder-[#8892A4] rounded-xl transition-all"
                      placeholder={t(content.form.email)}
                      required
                    />
                  </div>
                  <div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8892A4]" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-12 py-3 bg-[#1A1A2E] text-white border border-white/20 focus:border-[#2D1B69] focus:outline-none placeholder-[#8892A4] rounded-xl transition-all"
                        placeholder={t(content.form.password)}
                        minLength={6}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {authMode === 'register' && (
                      <p className="text-xs text-slate-500 mt-1 ml-1">{t(content.form.passwordHint)}</p>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full px-6 py-4 bg-[#FF6B6B] text-white font-semibold rounded-xl hover:bg-[#FF5252] transition-all shadow-lg shadow-[#FF6B6B]/25 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        {authMode === 'register' ? t(content.registerButton) : t(content.signInButton)}
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </form>
                {error && (
                  <p className="text-red-400 text-sm mt-3 text-center">{error}</p>
                )}
                <p className="text-slate-400 text-sm mt-4 text-center">
                  {authMode === 'register' ? (
                    <>
                      {t(content.form.haveAccount)}{' '}
                      <button
                        onClick={() => {
                          setAuthMode('signin');
                          setError(null);
                        }}
                        className="text-[#FFD93D] hover:underline font-medium"
                      >
                        {t(content.form.signIn)}
                      </button>
                    </>
                  ) : (
                    <>
                      {lang === 'en' ? "Don't have an account?" : "No tienes cuenta?"}{' '}
                      <button
                        onClick={() => {
                          setAuthMode('register');
                          setError(null);
                        }}
                        className="text-[#FFD93D] hover:underline font-medium"
                      >
                        {lang === 'en' ? 'Create one' : 'Crear una'}
                      </button>
                    </>
                  )}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="py-24 bg-[#150c2e]">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">{t(content.stages.title)}</h2>
          <div className="grid md:grid-cols-3 gap-4 md:gap-0 relative">
            {content.stages.items.map((stage, i) => (
              <div key={i} className="relative flex flex-col items-center">
                <div className="bg-[#1a0f3d] border border-[#2D1B69]/30 rounded-2xl p-8 w-full hover:border-[#FFD93D]/30 transition-colors relative z-10">
                  <div className="w-16 h-16 bg-gradient-to-br from-[#2D1B69] to-[#4A2C9A] rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <stage.icon className="w-8 h-8 text-[#FFD93D]" />
                  </div>
                  <h3 className="text-2xl font-bold text-center mb-4">{t(stage.title)}</h3>
                  <p className="text-slate-400 leading-relaxed text-center">{t(stage.desc)}</p>
                </div>
                {i < 2 && (
                  <div className="hidden md:flex absolute top-1/2 -right-2 transform -translate-y-1/2 z-20">
                    <div className="w-8 h-8 bg-[#FFD93D] rounded-full flex items-center justify-center">
                      <ChevronRight className="w-5 h-5 text-[#1a0f3d]" />
                    </div>
                  </div>
                )}
                {i < 2 && (
                  <div className="md:hidden flex justify-center my-4">
                    <div className="w-8 h-8 bg-[#FFD93D] rounded-full flex items-center justify-center rotate-90">
                      <ChevronRight className="w-5 h-5 text-[#1a0f3d]" />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 bg-[#1a0f3d]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t(content.preview.title)}</h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">{t(content.preview.subtitle)}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <ForecastCard
              day={lang === 'en' ? 'Today' : 'Hoy'}
              date="Mar 24"
              phase={{ en: 'Peak', es: 'Pico' }}
              phaseColor="#FFD93D"
              scores={[
                { label: { en: 'Energy', es: 'Energia' }, value: 85, color: '#FFD93D' },
                { label: { en: 'Mood', es: 'Animo' }, value: 78, color: '#FF6B6B' },
                { label: { en: 'Focus', es: 'Enfoque' }, value: 92, color: '#4ECDC4' },
              ]}
              lang={lang}
            />
            <ForecastCard
              day={lang === 'en' ? 'Tomorrow' : 'Manana'}
              date="Mar 25"
              phase={{ en: 'Transition', es: 'Transicion' }}
              phaseColor="#FF6B6B"
              scores={[
                { label: { en: 'Energy', es: 'Energia' }, value: 72, color: '#FFD93D' },
                { label: { en: 'Mood', es: 'Animo' }, value: 65, color: '#FF6B6B' },
                { label: { en: 'Focus', es: 'Enfoque' }, value: 80, color: '#4ECDC4' },
              ]}
              lang={lang}
            />
            <ForecastCard
              day={lang === 'en' ? 'Day 3' : 'Dia 3'}
              date="Mar 26"
              phase={{ en: 'Recovery', es: 'Recuperacion' }}
              phaseColor="#4ECDC4"
              scores={[
                { label: { en: 'Energy', es: 'Energia' }, value: 58, color: '#FFD93D' },
                { label: { en: 'Mood', es: 'Animo' }, value: 70, color: '#FF6B6B' },
                { label: { en: 'Focus', es: 'Enfoque' }, value: 65, color: '#4ECDC4' },
              ]}
              lang={lang}
            />
          </div>
        </div>
      </section>

      <section className="py-24 bg-[#150c2e]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-6">
            {content.promises.map((promise, i) => (
              <div key={i} className="bg-[#1a0f3d]/80 border border-[#2D1B69]/30 rounded-2xl p-8 hover:border-[#FFD93D]/30 transition-colors">
                <div className="w-14 h-14 bg-[#2D1B69]/30 rounded-xl flex items-center justify-center mb-6">
                  <promise.icon className="w-7 h-7 text-[#FFD93D]" />
                </div>
                <h3 className="text-xl font-bold mb-3">{t(promise.title)}</h3>
                <p className="text-slate-400 leading-relaxed">{t(promise.desc)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 bg-[#1a0f3d]">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">{t(content.tradingBenefits.title)}</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {content.tradingBenefits.items.map((item, i) => (
              <div key={i} className="bg-[#150c2e] border border-[#2D1B69]/30 rounded-2xl p-8 hover:border-[#FFD93D]/30 transition-colors">
                <div className="w-14 h-14 bg-gradient-to-br from-[#2D1B69] to-[#4A2C9A] rounded-xl flex items-center justify-center mb-6">
                  <item.icon className="w-7 h-7 text-[#FFD93D]" />
                </div>
                <h3 className="text-xl font-bold mb-3">{t(item.title)}</h3>
                <p className="text-slate-400 leading-relaxed">{t(item.desc)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 bg-gradient-to-br from-[#2D1B69]/30 to-[#1a0f3d]">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-10 leading-relaxed max-w-2xl mx-auto">
            {t(content.liveCounter.title)}
          </h2>
          <div className="flex flex-col items-center gap-6 mb-10">
            <div className="flex items-center gap-4">
              <Users className="w-10 h-10 text-[#FFD93D]" />
              {traderCount !== null && (
                <span className="text-5xl md:text-6xl font-bold text-[#FFD93D]">{traderCount.toLocaleString()}</span>
              )}
            </div>
            <span className="text-slate-300 text-lg">{t(content.liveCounter.enrolled)}</span>
          </div>

          <div className="max-w-md mx-auto">
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => {
                  setAuthMode('register');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="px-6 py-4 bg-[#FF6B6B] text-white font-semibold rounded-xl hover:bg-[#FF5252] transition-all shadow-lg shadow-[#FF6B6B]/25 flex items-center justify-center gap-2"
              >
                {t(content.openAccountButton)}
                <ArrowRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => {
                  setAuthMode('signin');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="px-6 py-4 bg-transparent border-2 border-[#FFD93D] text-[#FFD93D] font-semibold rounded-xl hover:bg-[#FFD93D]/10 transition-all flex items-center justify-center gap-2"
              >
                {t(content.signInButton)}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 border-t border-[#2D1B69]/30 bg-[#1a0f3d]">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="w-14 h-14 bg-[#2D1B69]/30 rounded-xl flex items-center justify-center mx-auto mb-6">
            <Database className="w-7 h-7 text-[#FFD93D]" />
          </div>
          <h3 className="text-2xl font-bold mb-4">{t(content.researcher.title)}</h3>
          <p className="text-slate-400 text-lg mb-8 max-w-2xl mx-auto leading-relaxed">
            {t(content.researcher.subtitle)}
          </p>
          <a
            href="/research"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#2D1B69]/50 border border-[#2D1B69] text-[#FFD93D] hover:bg-[#2D1B69] font-semibold rounded-xl transition-colors"
          >
            {t(content.researcher.link)}
            <ArrowRight className="w-5 h-5" />
          </a>
        </div>
      </section>

      <footer className="py-8 border-t border-[#2D1B69]/30 bg-[#150c2e]">
        <div className="max-w-6xl mx-auto px-6 text-center text-sm text-slate-500 space-y-3">
          <p>BioCycle. {lang === 'en' ? 'Your biology, your data, your profit.' : 'Tu biologia, tus datos, tu ganancia.'}</p>
          <div className="flex items-center justify-center gap-4">
            <a href="/privacy" className="text-slate-400 hover:text-[#FFD93D] transition-colors underline-offset-2 hover:underline">
              {lang === 'en' ? 'Privacy Policy' : 'Política de Privacidad'}
            </a>
            <span className="text-slate-600">·</span>
            <a href="/terms" className="text-slate-400 hover:text-[#FFD93D] transition-colors underline-offset-2 hover:underline">
              {lang === 'en' ? 'Terms of Service' : 'Términos de Servicio'}
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
