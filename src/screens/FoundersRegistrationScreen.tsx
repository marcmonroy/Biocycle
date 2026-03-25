import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ArrowRight, Mail, Eye, EyeOff, Loader2 } from 'lucide-react';
import { SetupScreen } from '../components/SetupScreen';
import { HomeScreen } from './HomeScreen';
import { BottomNav, Screen } from '../components/BottomNav';
import { AmbientCoach } from '../components/AmbientCoach';
import { calculatePhase, getForecast } from '../utils/phaseEngine';
import { Profile } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';

type AuthMode = 'login' | 'signup';
type ViewState = 'loading' | 'auth' | 'setup' | 'home';

export function FoundersRegistrationScreen() {
  const [lang, setLang] = useState<'en' | 'es'>('es');
  const [viewState, setViewState] = useState<ViewState>('loading');
  const [authMode, setAuthMode] = useState<AuthMode>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        checkProfile(session.user.id);
      } else {
        setViewState('auth');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        checkProfile(session.user.id);
      } else {
        setViewState('auth');
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      setViewState('setup');
      return;
    }

    if (data) {
      setProfile(data);
      setViewState('home');
    } else {
      setViewState('setup');
    }
  };

  const handleSetupComplete = () => {
    if (session) {
      checkProfile(session.user.id);
    }
  };

  const handleProfileUpdate = () => {
    if (session) {
      checkProfile(session.user.id);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (authMode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage(lang === 'en' ? 'Account created. You can now sign in.' : 'Cuenta creada. Ya puedes iniciar sesion.');
        setAuthMode('login');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: 'google' | 'apple') => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
      setLoading(false);
    }
  };

  if (viewState === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#2D1B69] to-[#1D0B49] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#FFD93D]" />
      </div>
    );
  }

  if (viewState === 'setup' && session) {
    return <SetupScreen userId={session.user.id} onComplete={handleSetupComplete} />;
  }

  if (viewState === 'home' && profile) {
    const phaseData = calculatePhase(profile);
    const forecast = getForecast(profile);

    return (
      <div className="max-w-[430px] mx-auto bg-gray-50 min-h-screen">
        <HomeScreen
          profile={profile}
          phaseData={phaseData}
          onNavigate={setCurrentScreen}
          onProfileUpdate={handleProfileUpdate}
        />
        <BottomNav currentScreen={currentScreen} onNavigate={setCurrentScreen} profile={profile} />
        <AmbientCoach
          profile={profile}
          phaseData={phaseData}
          forecast={forecast}
          currentScreen={currentScreen}
          lastCheckinData={null}
          recentAnxiety={null}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a0f3d] text-white flex items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <button
          onClick={() => setLang(lang === 'en' ? 'es' : 'en')}
          className="px-3 py-1.5 text-sm font-medium text-slate-300 hover:text-white border border-[#2D1B69]/50 rounded-lg transition-colors"
        >
          {lang === 'en' ? 'ES' : 'EN'}
        </button>
      </div>

      <div className="bg-[#1a0f3d] border border-[#2D1B69]/50 rounded-2xl w-full max-w-md p-6 relative">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-[#2D1B69] to-[#4A2C9A] rounded-xl mx-auto mb-4 flex items-center justify-center">
            <span className="text-white font-bold">B</span>
          </div>
          <div className="inline-block px-3 py-1 bg-[#FFD93D]/10 border border-[#FFD93D]/20 rounded-full text-[#FFD93D] text-xs font-medium mb-4">
            {lang === 'en' ? 'Founders Beta Access' : 'Acceso Beta Fundadores'}
          </div>
          <h2 className="text-xl font-bold">
            {authMode === 'signup'
              ? lang === 'en' ? 'Open your trading account' : 'Abre tu cuenta de trading'
              : lang === 'en' ? 'Welcome back' : 'Bienvenido de nuevo'}
          </h2>
          {authMode === 'signup' && (
            <p className="text-slate-400 text-sm mt-2">
              {lang === 'en' ? 'One step to activate your biological intelligence.' : 'Un paso para activar tu inteligencia biologica.'}
            </p>
          )}
        </div>

        <div className="flex gap-3 mb-6">
          <button
            onClick={() => handleOAuth('google')}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#2D1B69]/30 border border-[#2D1B69]/50 rounded-xl hover:bg-[#2D1B69]/50 transition-colors disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            <span className="text-sm font-medium">Google</span>
          </button>
          <button
            onClick={() => handleOAuth('apple')}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#2D1B69]/30 border border-[#2D1B69]/50 rounded-xl hover:bg-[#2D1B69]/50 transition-colors disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
            </svg>
            <span className="text-sm font-medium">Apple</span>
          </button>
        </div>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#2D1B69]/50" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-[#1a0f3d] text-slate-500">
              {lang === 'en' ? 'or with email' : 'o con email'}
            </span>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm mb-4">
            {error}
          </div>
        )}

        {message && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-sm mb-4">
            {message}
          </div>
        )}

        <form onSubmit={handleEmailAuth} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-[#2D1B69]/20 border border-[#2D1B69]/50 rounded-xl focus:ring-2 focus:ring-[#FF6B6B] focus:border-transparent outline-none transition-all text-white"
                placeholder="you@email.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">
              {lang === 'en' ? 'Password' : 'Contrasena'}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-4 pr-10 py-3 bg-[#2D1B69]/20 border border-[#2D1B69]/50 rounded-xl focus:ring-2 focus:ring-[#FF6B6B] focus:border-transparent outline-none transition-all text-white"
                placeholder="********"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#FF6B6B] text-white font-semibold rounded-xl hover:bg-[#FF5252] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                {authMode === 'signup'
                  ? lang === 'en' ? 'Continue' : 'Continuar'
                  : lang === 'en' ? 'Sign in' : 'Iniciar sesion'}
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        <div className="text-center mt-4 text-sm">
          {authMode === 'signup' ? (
            <p className="text-slate-500">
              {lang === 'en' ? 'Already have an account?' : 'Ya tienes cuenta?'}{' '}
              <button onClick={() => setAuthMode('login')} className="text-[#FF6B6B] hover:text-[#FF8888]">
                {lang === 'en' ? 'Sign in' : 'Iniciar sesion'}
              </button>
            </p>
          ) : (
            <p className="text-slate-500">
              {lang === 'en' ? "Don't have an account?" : 'No tienes cuenta?'}{' '}
              <button onClick={() => setAuthMode('signup')} className="text-[#FF6B6B] hover:text-[#FF8888]">
                {lang === 'en' ? 'Create one' : 'Crear una'}
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
