import { useState, useEffect, useRef } from 'react';
import { supabase } from './lib/supabase';
import type { Profile, UserState } from './lib/supabase';
import type { Session } from '@supabase/supabase-js';

import { RegisterScreen } from './screens/RegisterScreen';
import { LoginScreen } from './screens/LoginScreen';
import { DashboardScreen } from './screens/DashboardScreen';
import { CoachScreen } from './screens/CoachScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { ForecastScreen } from './screens/ForecastScreen';
import { CircleScreen } from './screens/CircleScreen';
import { DataHubScreen } from './screens/DataHubScreen';
import { BottomNav } from './components/BottomNav';
import type { Tab } from './components/BottomNav';
import { DebugOverlay, setDebug } from './components/DebugOverlay';
import { ResetPasswordForm } from './components/ResetPasswordForm';
import { colors, fonts } from './lib/tokens';

const _urlParams = new URLSearchParams(window.location.search);
if (_urlParams.get('session') === 'scheduled') {
  sessionStorage.removeItem('biocycle_adhoc_greeting');
  sessionStorage.removeItem('biocycle_adhoc_greeting_spoken');
}

// Pre-fill values from landing page redirect
const _prefillEmail = _urlParams.get('prefill_email') || '';
const _prefillPhone = _urlParams.get('prefill_phone') || '';
const _prefillLang  = _urlParams.get('prefill_lang') || '';

// Store lang preference from landing page
if (_prefillLang === 'es') localStorage.setItem('biocycle_lang', 'ES');
else if (_prefillLang === 'en') localStorage.setItem('biocycle_lang', 'EN');

// Strip prefill params from URL bar (clean URL after reading them)
if (_prefillEmail || _prefillPhone || _prefillLang) {
  window.history.replaceState({}, '', window.location.pathname);
}

// Detect Supabase password recovery redirect
const _hash = window.location.hash;
const _hashParams = new URLSearchParams(_hash.replace('#', ''));
const _isRecovery = _hashParams.get('type') === 'recovery';
const _recoveryToken = _hashParams.get('access_token') || '';
if (_isRecovery) {
  window.history.replaceState({}, '', window.location.pathname);
}

type Screen = 'register' | 'login' | 'home' | 'forecast' | 'coach' | 'circle' | 'earnings' | 'profile';
type VerifyResume = { userId: string; phone: string } | null;

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userState, setUserState] = useState<UserState | null>(null);
  const [screen, setScreen] = useState<Screen>('register');
  const [authLoading, setAuthLoading] = useState(true);
  const [verifyResume, setVerifyResume] = useState<VerifyResume>(null);
  const [showResetPassword, setShowResetPassword] = useState(
    _isRecovery && !!_recoveryToken
  );
  const [resetPasswordDone, setResetPasswordDone] = useState(false);
  const screenRef = useRef<Screen>('register');

  useEffect(() => { screenRef.current = screen; }, [screen]);
  useEffect(() => { setDebug('screen', screen); }, [screen]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) loadProfile(data.session.user.id);
      else setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (screenRef.current === 'register') return;
      if (newSession) {
        setAuthLoading(true);
        loadProfile(newSession.user.id);
      } else {
        setProfile(null);
        setScreen('register');
        setAuthLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadProfile(userId: string) {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (error || !data) { setAuthLoading(false); return; }

    const p = data as Profile;
    setProfile(p);

    const { data: userStateData } = await supabase.from('user_state').select('*').eq('user_id', userId).maybeSingle();
    setUserState(userStateData as UserState | null);

    if (!p.whatsapp_verified) {
      setVerifyResume({ userId: p.id, phone: (p as any).whatsapp_phone || '' });
      setAuthLoading(false);
      return;
    }

    setVerifyResume(null);
    setAuthLoading(false);
    setScreen('home');

    if (_urlParams.get('session') === 'scheduled') {
      setScreen('coach');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }

  function handleNavigate(tab: Tab) {
    if (!profile) return;
    if (tab === 'home' && session) loadProfile(session.user.id);
    setScreen(tab);
  }

  function handleStartCoach() { setScreen('coach'); }
  function handleOpenProfile() { setScreen('profile'); }

  async function handleRegisterComplete() {
    setAuthLoading(true);
    const { data: { session: freshSession } } = await supabase.auth.getSession();
    if (freshSession) {
      setSession(freshSession);
      await loadProfile(freshSession.user.id);
      setScreen('profile');
    } else {
      setAuthLoading(false);
      setScreen('login');
    }
  }

  function handleProfileUpdate(updated: Profile) { setProfile(updated); }
  function handleLogout() { setProfile(null); setSession(null); setScreen('register'); }

  if (showResetPassword && !resetPasswordDone) {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.midnight,
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        fontFamily: fonts.body,
      }}>
        <img src="/favicon.svg" alt="" style={{ width: 40, height: 40, marginBottom: 16 }} />
        <h2 style={{
          fontFamily: fonts.display,
          fontWeight: 300,
          fontSize: 26,
          color: colors.bone,
          marginBottom: 8,
          textAlign: 'center',
        }}>Set a new password</h2>
        <p style={{ color: colors.boneFaint, fontSize: 14, marginBottom: 24, textAlign: 'center' }}>
          Choose a new password for your BioCycle account.
        </p>
        <ResetPasswordForm
          onDone={() => {
            setResetPasswordDone(true);
            setShowResetPassword(false);
            setScreen('login');
          }}
        />
      </div>
    );
  }

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#042C53', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'IBM Plex Sans, system-ui, sans-serif', color: 'rgba(239,159,39,0.6)', fontSize: 13, letterSpacing: '0.15em', animation: 'pulse 1.5s ease-in-out infinite' }}>
          <style>{`@keyframes pulse { 0%,100%{opacity:.3} 50%{opacity:1} }`}</style>
          biocycle
        </div>
      </div>
    );
  }

  if (session && verifyResume) {
    return (
      <RegisterScreen
        onComplete={handleRegisterComplete}
        onSignIn={() => setScreen('login')}
        initialStep={5}
        initialUserId={verifyResume.userId}
        initialPhone={verifyResume.phone}
      />
    );
  }

  if (!session || !profile) {
    if (screen === 'login') return <LoginScreen onRegister={() => setScreen('register')} />;
    return (
      <RegisterScreen
        onComplete={handleRegisterComplete}
        onSignIn={() => setScreen('login')}
        initialEmail={_prefillEmail}
        initialPhone={_prefillPhone}
      />
    );
  }

  const activeTab: Tab = screen === 'home' ? 'home'
    : screen === 'forecast' ? 'forecast'
    : screen === 'coach' ? 'coach'
    : screen === 'circle' ? 'circle'
    : screen === 'earnings' ? 'earnings'
    : 'home';

  const idioma = profile.idioma ?? 'EN';

  return (
    <div style={{
      width: '100%',
      maxWidth: 430,
      margin: '0 auto',
      minHeight: '100vh',
      position: 'relative',
      background: '#042C53',
      overflowX: 'hidden',
      overflowY: 'auto',
    }}>
      {screen === 'home' && (
        <DashboardScreen
          profile={profile}
          userState={userState}
          onStartCoach={handleStartCoach}
          onOpenProfile={handleOpenProfile}
          onNavigate={handleNavigate}
        />
      )}
      {screen === 'forecast' && <ForecastScreen profile={profile} />}
      {screen === 'coach'    && <CoachScreen profile={profile} onBack={() => { if (session) loadProfile(session.user.id); setScreen('home'); }} onNavigate={handleNavigate} />}
      {screen === 'circle'   && <CircleScreen profile={profile} />}
      {screen === 'earnings' && <DataHubScreen profile={profile} />}
      {screen === 'profile'  && (
        <ProfileScreen
          profile={profile}
          onProfileUpdate={handleProfileUpdate}
          onLogout={handleLogout}
          onComplete={() => setScreen('home')}
        />
      )}

      {screen !== 'profile' && <BottomNav active={activeTab} onNavigate={handleNavigate} idioma={idioma} />}
      <DebugOverlay />
    </div>
  );
}
