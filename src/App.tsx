import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import type { Profile } from './lib/supabase';
import type { Session } from '@supabase/supabase-js';

import { LandingScreen } from './screens/LandingScreen';
import { RegisterScreen } from './screens/RegisterScreen';
import { DashboardScreen } from './screens/DashboardScreen';
import { CoachScreen } from './screens/CoachScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { DataHubScreen } from './screens/DataHubScreen';
import { BottomNav } from './components/BottomNav';
import type { Tab } from './components/BottomNav';

// ── URL param: clear adhoc session storage if ?session=scheduled ──────────
const _urlParams = new URLSearchParams(window.location.search);
if (_urlParams.get('session') === 'scheduled') {
  sessionStorage.removeItem('biocycle_adhoc_greeting');
  sessionStorage.removeItem('biocycle_adhoc_greeting_spoken');
}

type Screen = 'landing' | 'register' | 'home' | 'coach' | 'data' | 'profile';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [screen, setScreen] = useState<Screen>('landing');
  const [coachSessionType, setCoachSessionType] = useState<'scheduled' | 'adhoc'>('adhoc');
  const [authLoading, setAuthLoading] = useState(true);

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
      if (newSession) {
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
      // Profile not created yet — stay on landing/register
      setAuthLoading(false);
      return;
    }

    setProfile(data as Profile);
    setAuthLoading(false);

    // Navigate to home after loading profile
    setScreen('home');

    // Check if this is a scheduled session via URL
    if (_urlParams.get('session') === 'scheduled') {
      setCoachSessionType('scheduled');
      setScreen('coach');
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  function handleNavigate(tab: Tab) {
    if (!profile) return;
    // If navigating to coach manually, it's adhoc
    if (tab === 'coach') {
      setCoachSessionType('adhoc');
    }
    setScreen(tab);
  }

  function handleStartCoach() {
    setCoachSessionType('adhoc');
    setScreen('coach');
  }

  function handleRegisterComplete() {
    // Profile will be loaded via onAuthStateChange → loadProfile
    // which sets screen to 'home'
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

  // ── Unauthenticated flows ─────────────────────────────────────────────────
  if (!session || !profile) {
    if (screen === 'register') {
      return (
        <RegisterScreen
          onComplete={handleRegisterComplete}
        />

      );
    }
    return (
      <LandingScreen onRegister={() => setScreen('register')} />
    );
  }

  // ── Coach screen (full screen, no bottom nav) ─────────────────────────────
  if (screen === 'coach') {
    return (
      <CoachScreen
        profile={profile}
        sessionType={coachSessionType}
        onBack={() => setScreen('home')}
      />
    );
  }

  // ── Tab screens with bottom nav ───────────────────────────────────────────
  const activeTab: Tab = screen === 'home' ? 'home'
    : screen === 'data' ? 'data'
    : screen === 'profile' ? 'profile'
    : 'home';

  return (
    <div style={{ position: 'relative' }}>
      {screen === 'home' && (
        <DashboardScreen
          profile={profile}
          onStartCoach={handleStartCoach}
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
    </div>
  );
}
