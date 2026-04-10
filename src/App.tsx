import { useState, useEffect, useRef } from 'react';
import { supabase } from './lib/supabase';
import type { Profile } from './lib/supabase';
import type { Session } from '@supabase/supabase-js';

import { LandingScreen } from './screens/LandingScreen';
import { RegisterScreen } from './screens/RegisterScreen';
import { LoginScreen } from './screens/LoginScreen';
import { DashboardScreen } from './screens/DashboardScreen';
import { CoachScreen } from './screens/CoachScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { DataHubScreen } from './screens/DataHubScreen';
import { BottomNav } from './components/BottomNav';
import type { Tab } from './components/BottomNav';
import { DebugOverlay, setDebug } from './components/DebugOverlay';

// ── URL param: clear adhoc session storage if ?session=scheduled ──────────
const _urlParams = new URLSearchParams(window.location.search);
if (_urlParams.get('session') === 'scheduled') {
  sessionStorage.removeItem('biocycle_adhoc_greeting');
  sessionStorage.removeItem('biocycle_adhoc_greeting_spoken');
}

type Screen = 'landing' | 'register' | 'login' | 'home' | 'coach' | 'data' | 'profile';
type VerifyResume = { userId: string; phone: string } | null;

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [screen, setScreen] = useState<Screen>('landing');
  const [authLoading, setAuthLoading] = useState(true);
  const [verifyResume, setVerifyResume] = useState<VerifyResume>(null);
  // Ref so the onAuthStateChange closure can read the live screen value
  const screenRef = useRef<Screen>('landing');

  // Keep screenRef in sync so the auth listener closure always sees the live screen
  useEffect(() => { screenRef.current = screen; }, [screen]);

  // Debug: track active screen
  useEffect(() => { setDebug('screen', screen); }, [screen]);

  // ── Auth state ────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) {
        loadProfile(data.session.user.id);
      } else {
        setAuthLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (screenRef.current === 'register') return; // registration wizard owns its own state
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
  }, []);

  // ── Load profile ──────────────────────────────────────────────────────────
  async function loadProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error || !data) {
      // Profile not created yet — stay on current screen (registration in progress)
      setAuthLoading(false);
      return;
    }

    const p = data as Profile;
    setProfile(p);

    // If WhatsApp not verified, route back to step 5 to complete verification
    if (!p.whatsapp_verified) {
      setVerifyResume({ userId: p.id, phone: (p as any).whatsapp_phone || '' });
      setAuthLoading(false);
      return;
    }

    setVerifyResume(null);
    setAuthLoading(false);
    setScreen('home');

    // Check if this is a scheduled session via URL
    if (_urlParams.get('session') === 'scheduled') {
      setScreen('coach');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  function handleNavigate(tab: Tab) {
    if (!profile) return;
    setScreen(tab);
  }

  function handleStartCoach() {
    setScreen('coach');
  }

  function handleRegisterComplete() {
    // Re-fetch profile so whatsapp_verified is fresh; loadProfile routes to 'home'
    if (session) {
      setAuthLoading(true);
      loadProfile(session.user.id);
    } else {
      setScreen('home');
    }
  }

  function handleProfileUpdate(updated: Profile) {
    setProfile(updated);
  }

  function handleLogout() {
    setProfile(null);
    setSession(null);
    setScreen('landing');
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0A0A1A',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace',
          color: 'rgba(255,217,61,0.5)',
          fontSize: 12,
          letterSpacing: '0.15em',
          animation: 'pulse 1.5s ease-in-out infinite',
        }}>
          <style>{`@keyframes pulse { 0%,100%{opacity:.3} 50%{opacity:1} }`}</style>
          BIOCYCLE
        </div>
      </div>
    );
  }

  // ── Resume WhatsApp verification for logged-in but unverified users ────────
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

  // ── Unauthenticated flows ─────────────────────────────────────────────────
  if (!session || !profile) {
    if (screen === 'register') {
      return (
        <RegisterScreen
          onComplete={handleRegisterComplete}
          onSignIn={() => setScreen('login')}
        />
      );
    }
    if (screen === 'login') {
      return (
        <LoginScreen onRegister={() => setScreen('register')} />
      );
    }
    return (
      <LandingScreen
        onRegister={() => setScreen('register')}
        onSignIn={() => setScreen('login')}
      />
    );
  }

  // ── Tab screens with bottom nav ───────────────────────────────────────────
  const activeTab: Tab = screen === 'home' ? 'home'
    : screen === 'coach' ? 'coach'
    : screen === 'data' ? 'data'
    : screen === 'profile' ? 'profile'
    : 'home';

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
          onStartCoach={handleStartCoach}
        />
      )}
      {screen === 'coach' && (
        <CoachScreen
          profile={profile}
          onBack={() => setScreen('home')}
          onNavigate={handleNavigate}
        />
      )}
      {screen === 'data' && (
        <DataHubScreen profile={profile} />
      )}
      {screen === 'profile' && (
        <ProfileScreen
          profile={profile}
          onProfileUpdate={handleProfileUpdate}
          onLogout={handleLogout}
        />
      )}

      <BottomNav
        active={activeTab}
        onNavigate={handleNavigate}
      />
      <DebugOverlay />
    </div>
  );
}
