import { useState, useEffect } from 'react';
import { supabase, Profile, Checkin } from './lib/supabase';
import { SetupScreen } from './components/SetupScreen';
import { BottomNav, Screen } from './components/BottomNav';
import { HomeScreen } from './screens/HomeScreen';
import { ForecastScreen } from './screens/ForecastScreen';
import { CheckinScreen } from './screens/CheckinScreen';
import { CoachScreen, CoachSessionType } from './screens/CoachScreen';
import { DashboardScreen } from './screens/DashboardScreen';
import { AdminScreen } from './screens/AdminScreen';
import { ResearchScreen } from './screens/ResearchScreen';
import { TradingFloorScreen } from './screens/TradingFloorScreen';
import { LandingScreen } from './screens/LandingScreen';
import { PrivacyScreen } from './screens/PrivacyScreen';
import { TermsScreen } from './screens/TermsScreen';
import { ProfileEditScreen } from './screens/ProfileEditScreen';
import { AmbientCoach } from './components/AmbientCoach';
import { calculatePhase, getForecast } from './utils/phaseEngine';
import { Session } from '@supabase/supabase-js';
import { Loader2 } from 'lucide-react';

type AppState = 'loading' | 'landing' | 'setup' | 'home' | 'admin' | 'research' | 'trading-floor' | 'privacy' | 'terms';

function App() {
  const [appState, setAppState] = useState<AppState>('loading');
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [lastCheckinData, setLastCheckinData] = useState<{ lowestDimension: string; lowestScore: number } | null>(null);
  const [recentAnxiety, setRecentAnxiety] = useState<number | null>(null);
  const [coachSessionType, setCoachSessionType] = useState<CoachSessionType>('adhoc');

  useEffect(() => {
    // Detect ?session=scheduled from WhatsApp link
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('session') === 'scheduled') {
      sessionStorage.setItem('biocycle_pending_scheduled', '1');
      window.history.replaceState({}, '', window.location.pathname);
    }

    if (window.location.pathname === '/admin') {
      setAppState('admin');
      return;
    }

    if (window.location.pathname === '/research') {
      setAppState('research');
      return;
    }

    if (window.location.pathname === '/trading-floor') {
      setAppState('trading-floor');
      return;
    }

    if (window.location.pathname === '/privacy') {
      setAppState('privacy' as AppState);
      return;
    }

    if (window.location.pathname === '/terms') {
      setAppState('terms' as AppState);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        checkProfile(session.user.id);
      } else {
        setAppState('landing');
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        checkProfile(session.user.id);
      } else {
        setAppState('landing');
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
      console.error('Error checking profile:', error);
      setAppState('setup');
      return;
    }

    if (data) {
      setProfile(data);
      setAppState('home');
      const pending = sessionStorage.getItem('biocycle_pending_scheduled');
      if (pending) {
        sessionStorage.removeItem('biocycle_pending_scheduled');
        setCoachSessionType('scheduled');
        setCurrentScreen('coach');
      }
    } else {
      setAppState('setup');
    }
  };

  const handleSetupComplete = () => {
    if (session) {
      checkProfile(session.user.id);
    }
  };

  const handleCheckinComplete = () => {
    setCurrentScreen('home');
    loadRecentCheckinData();
  };

  const loadRecentCheckinData = async () => {
    if (!profile) return;

    const { data } = await supabase
      .from('checkins')
      .select('*')
      .eq('user_id', profile.id)
      .order('checkin_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      const factors: { key: string; value: number }[] = [
        { key: 'emotional', value: data.factor_emocional || 5 },
        { key: 'physical', value: data.factor_fisico || 5 },
        { key: 'cognitive', value: data.factor_cognitivo || 5 },
        { key: 'stress', value: data.factor_estres || 5 },
        { key: 'social', value: data.factor_social || 5 },
      ];
      if (data.factor_ansiedad) {
        factors.push({ key: 'anxiety', value: data.factor_ansiedad });
      }

      const lowest = factors.reduce((min, f) => f.value < min.value ? f : min, factors[0]);
      setLastCheckinData({ lowestDimension: lowest.key, lowestScore: lowest.value });
    }

    const { data: anxietyData } = await supabase
      .from('checkins')
      .select('factor_ansiedad')
      .eq('user_id', profile.id)
      .not('factor_ansiedad', 'is', null)
      .order('checkin_date', { ascending: false })
      .limit(5);

    if (anxietyData && anxietyData.length > 0) {
      const avg = anxietyData.reduce((sum: number, c: Checkin) => sum + (c.factor_ansiedad || 0), 0) / anxietyData.length;
      setRecentAnxiety(Math.round(avg * 10) / 10);
    }
  };

  useEffect(() => {
    if (profile) {
      loadRecentCheckinData();
    }
  }, [profile?.id]);

  const handleProfileUpdate = () => {
    if (session) {
      checkProfile(session.user.id);
    }
  };

  const handleNavigate = (screen: Screen) => {
    if (screen === 'coach') setCoachSessionType('adhoc');
    setCurrentScreen(screen);
  };

  if (appState === 'loading') {
    return (
      <div className="min-h-screen bg-[#0A0A1A] flex flex-col items-center justify-center gap-6">
        <img
          src="https://hguqyuupwfpszsmdjrzz.supabase.co/storage/v1/object/public/assets/Biocycle_med.png"
          alt="BioCycle"
          className="w-[200px] h-auto object-contain"
        />
        <Loader2 className="w-6 h-6 animate-spin text-[#F5C842]" />
      </div>
    );
  }

  if (appState === 'admin') {
    return <AdminScreen />;
  }

  if (appState === 'research') {
    return <ResearchScreen />;
  }

  if (appState === 'trading-floor') {
    return <TradingFloorScreen />;
  }

  if (appState === ('privacy' as AppState)) {
    return <PrivacyScreen />;
  }

  if (appState === ('terms' as AppState)) {
    return <TermsScreen />;
  }

  if (appState === 'landing') {
    return <LandingScreen />;
  }

  if (appState === 'setup' && session) {
    return <SetupScreen userId={session.user.id} onComplete={handleSetupComplete} />;
  }

  if (appState === 'home' && profile) {
    const phaseData = calculatePhase(profile);
    const forecast = getForecast(profile);

    return (
      <div className="max-w-[430px] mx-auto bg-gray-50 min-h-screen">
        {currentScreen === 'home' && (
          <HomeScreen
            profile={profile}
            phaseData={phaseData}
            onNavigate={handleNavigate}
            onProfileUpdate={handleProfileUpdate}
          />
        )}
        {currentScreen === 'forecast' && (
          <ForecastScreen profile={profile} forecast={forecast} />
        )}
        {currentScreen === 'checkin' && (
          <CheckinScreen
            profile={profile}
            phaseData={phaseData}
            onComplete={handleCheckinComplete}
          />
        )}
        {currentScreen === 'coach' && (
          <CoachScreen profile={profile} phaseData={phaseData} sessionType={coachSessionType} />
        )}
        {currentScreen === 'dashboard' && (
          <DashboardScreen profile={profile} onNavigate={setCurrentScreen} />
        )}
        {currentScreen === 'profile-edit' && (
          <ProfileEditScreen
            profile={profile}
            onBack={() => setCurrentScreen('dashboard')}
            onSaved={() => {
              checkProfile(session!.user.id);
              setCurrentScreen('dashboard');
            }}
          />
        )}
        <BottomNav currentScreen={currentScreen} onNavigate={handleNavigate} profile={profile} />
        <AmbientCoach
          profile={profile}
          phaseData={phaseData}
          forecast={forecast}
          currentScreen={currentScreen}
          lastCheckinData={lastCheckinData}
          recentAnxiety={recentAnxiety}
          onNavigate={handleNavigate}
        />
      </div>
    );
  }

  return null;
}

export default App;
