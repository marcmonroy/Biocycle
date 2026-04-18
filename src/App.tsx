import { useState, useEffect, useRef } from 'react';
import { supabase } from './lib/supabase';
import type { Profile, UserState } from './lib/supabase';
import type { Session } from '@supabase/supabase-js';

import { LandingScreen } from './screens/LandingScreen';
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

const _urlParams = new URLSearchParams(window.location.search);
if (_urlParams.get('session') === 'scheduled') {
  sessionStorage.removeItem('biocycle_adhoc_greeting');
  sessionStorage.removeItem('biocycle_adhoc_greeting_spoken');
}

type Screen = 'landing' | 'register' | 'login' | 'home' | 'forecast' | 'coach' | 'circle' | 'earnings' | 'profile';
type VerifyResume = { userId: string; phone: string } | null;

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userState, setUserState] = useState<UserState | null>(null);
  const [screen, setScreen] = useState<Screen>('landing');
  const [authLoading, setAuthLoading] = useState(true);
  const [verifyResume, setVerifyResume] = useState<VerifyResume>(null);
  const screenRef = useRef<Screen>('landing');

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
        setScreen('landing');
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
  function handleLogout() { setProfile(null); setSession(null); setScreen('landing'); }

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0A0A1A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', color: 'rgba(255,217,61,0.5)', fontSize: 12, letterSpacing: '0.15em', animation: 'pulse 1.5s ease-in-out infinite' }}>
          <style>{`@keyframes pulse { 0%,100%{opacity:.3} 50%{opacity:1} }`}</style>
          BIOCYCLE
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
    if (screen === 'register') return <RegisterScreen onComplete={handleRegisterComplete} onSignIn={() => setScreen('login')} />;
    if (screen === 'login')    return <LoginScreen onRegister={() => setScreen('register')} />;
    return <LandingScreen onRegister={() => setScreen('register')} onSignIn={() => setScreen('login')} />;
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
      background: '#0A0A1A',
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
      {screen === 'coach'    && <CoachScreen profile={profile} onBack={() => setScreen('home')} onNavigate={handleNavigate} />}
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
