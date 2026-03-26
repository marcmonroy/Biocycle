import { Home, Calendar, SquarePen as PenSquare, Sparkles, BarChart3 } from 'lucide-react';
import { Profile } from '../lib/supabase';

export type Screen = 'home' | 'forecast' | 'checkin' | 'coach' | 'dashboard' | 'profile-edit';

interface BottomNavProps {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
  profile: Profile;
}

type TabConfig = {
  screen: Screen;
  labelEs: string;
  labelEn: string;
  icon: typeof Home;
};

const tabs: TabConfig[] = [
  { screen: 'home', labelEs: 'Inicio', labelEn: 'Home', icon: Home },
  { screen: 'forecast', labelEs: 'Pronostico', labelEn: 'Forecast', icon: Calendar },
  { screen: 'checkin', labelEs: 'Deposito', labelEn: 'Deposit', icon: PenSquare },
  { screen: 'coach', labelEs: 'Coach', labelEn: 'Coach', icon: Sparkles },
  { screen: 'dashboard', labelEs: 'Cuenta Trading', labelEn: 'Trading Account', icon: BarChart3 },
];

export function BottomNav({ currentScreen, onNavigate, profile }: BottomNavProps) {
  const isSpanish = profile.idioma === 'ES';

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 safe-area-bottom z-50">
      <div className="max-w-[430px] mx-auto flex">
        {tabs.map(({ screen, labelEs, labelEn, icon: Icon }) => {
          const isActive = currentScreen === screen;
          const label = isSpanish ? labelEs : labelEn;
          return (
            <button
              key={screen}
              onClick={() => onNavigate(screen)}
              className={`flex-1 flex flex-col items-center py-2 pt-3 transition-colors ${
                isActive ? 'text-[#2D1B69]' : 'text-gray-400'
              }`}
            >
              <Icon
                className={`w-6 h-6 mb-1 transition-transform ${
                  isActive ? 'scale-110' : ''
                }`}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span className={`text-xs ${isActive ? 'font-semibold' : 'font-medium'}`}>
                {label}
              </span>
              {isActive && (
                <div className="absolute bottom-0 w-12 h-0.5 bg-[#2D1B69] rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
