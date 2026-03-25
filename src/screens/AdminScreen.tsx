import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Lock, Users, Activity, TrendingUp, DollarSign, Clock, Shield, Loader2, Mail } from 'lucide-react';

interface AdminMetrics {
  totalTraders: number;
  activeToday: number;
  avgDepositsPerDay: number;
  avgDataDepth: number;
  tierDistribution: { tier: string; count: number }[];
  researchByGender: { gender: string; count: number }[];
  researchByAge: { range: string; count: number }[];
  subscriptionRevenue: number;
  totalRevenue: number;
  recentRegistrations: { date: string; gender: string }[];
  recentCheckins: { date: string; qualityScore: number }[];
  waitlistCount: number;
  waitlistEmails: { email: string; date: string }[];
}

const TIERS = [
  { name: 'Seed', min: 0, max: 10 },
  { name: 'Root', min: 11, max: 30 },
  { name: 'Growth', min: 31, max: 60 },
  { name: 'Mastery', min: 61, max: 100 },
  { name: 'Oracle', min: 101, max: Infinity },
];

const AGE_RANGES = [
  { label: '18-25', min: 18, max: 25 },
  { label: '26-35', min: 26, max: 35 },
  { label: '36-45', min: 36, max: 45 },
  { label: '46+', min: 46, max: 150 },
];

export function AdminScreen() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);

  const handleLogin = () => {
    const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD;
    if (password === adminPassword) {
      setAuthenticated(true);
      setError('');
      loadMetrics();
    } else {
      setError('Invalid password');
    }
  };

  const loadMetrics = async () => {
    setLoading(true);
    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, genero, fecha_nacimiento, created_at, subscription_active');

      const { data: allCheckins } = await supabase
        .from('checkins')
        .select('user_id, checkin_date, calidad_score, created_at');

      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const totalTraders = profiles?.length || 0;

      const recentCheckinUserIds = new Set(
        allCheckins
          ?.filter(c => new Date(c.created_at) >= yesterday)
          .map(c => c.user_id) || []
      );
      const activeToday = recentCheckinUserIds.size;

      const checkinsByUser: Record<string, number> = {};
      allCheckins?.forEach(c => {
        checkinsByUser[c.user_id] = (checkinsByUser[c.user_id] || 0) + 1;
      });

      const totalCheckins = allCheckins?.length || 0;
      const firstCheckinDate = allCheckins?.length
        ? new Date(Math.min(...allCheckins.map(c => new Date(c.checkin_date).getTime())))
        : now;
      const daysSinceFirst = Math.max(1, Math.ceil((now.getTime() - firstCheckinDate.getTime()) / (1000 * 60 * 60 * 24)));
      const avgDepositsPerDay = Math.round((totalCheckins / daysSinceFirst) * 10) / 10;

      const userCheckinCounts = Object.values(checkinsByUser);
      const avgDataDepth = userCheckinCounts.length
        ? Math.round((userCheckinCounts.reduce((a, b) => a + b, 0) / userCheckinCounts.length) * 10) / 10
        : 0;

      const tierDistribution = TIERS.map(tier => {
        const count = userCheckinCounts.filter(c => c >= tier.min && c <= tier.max).length;
        return { tier: tier.name, count };
      });

      const eligibleUsers = Object.entries(checkinsByUser)
        .filter(([, count]) => count >= 30)
        .map(([userId]) => userId);

      const eligibleProfiles = profiles?.filter(p => eligibleUsers.includes(p.id)) || [];

      const researchByGender = [
        { gender: 'Female', count: eligibleProfiles.filter(p => p.genero === 'femenino').length },
        { gender: 'Male', count: eligibleProfiles.filter(p => p.genero === 'masculino').length },
      ];

      const getAge = (birthDate: string) => {
        const birth = new Date(birthDate);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
          age--;
        }
        return age;
      };

      const researchByAge = AGE_RANGES.map(range => {
        const count = eligibleProfiles.filter(p => {
          if (!p.fecha_nacimiento) return false;
          const age = getAge(p.fecha_nacimiento);
          return age >= range.min && age <= range.max;
        }).length;
        return { range: range.label, count };
      });

      const subscribedCount = profiles?.filter(p => p.subscription_active).length || 0;
      const subscriptionRevenue = subscribedCount * 9.99;
      const totalRevenue = subscriptionRevenue;

      const recentRegistrations = (profiles || [])
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10)
        .map(p => ({
          date: new Date(p.created_at).toLocaleDateString(),
          gender: p.genero === 'femenino' ? 'F' : p.genero === 'masculino' ? 'M' : '-',
        }));

      const recentCheckins = (allCheckins || [])
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10)
        .map(c => ({
          date: new Date(c.created_at).toLocaleDateString(),
          qualityScore: c.calidad_score ? Math.round(c.calidad_score * 10) / 10 : 0,
        }));

      const { data: waitlistData, count: waitlistCount } = await supabase
        .from('waitlist')
        .select('email, created_at', { count: 'exact' })
        .order('created_at', { ascending: false });

      const waitlistEmails = (waitlistData || []).map(w => ({
        email: w.email,
        date: new Date(w.created_at).toLocaleDateString(),
      }));

      setMetrics({
        totalTraders,
        activeToday,
        avgDepositsPerDay,
        avgDataDepth,
        tierDistribution,
        researchByGender,
        researchByAge,
        subscriptionRevenue,
        totalRevenue,
        recentRegistrations,
        recentCheckins,
        waitlistCount: waitlistCount || 0,
        waitlistEmails,
      });
    } catch (err) {
      console.error('Error loading metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const stored = sessionStorage.getItem('admin_authenticated');
    if (stored === 'true') {
      setAuthenticated(true);
      loadMetrics();
    }
  }, []);

  useEffect(() => {
    if (authenticated) {
      sessionStorage.setItem('admin_authenticated', 'true');
    }
  }, [authenticated]);

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-8 w-full max-w-md">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center">
              <Shield className="w-8 h-8 text-amber-500" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white text-center mb-2">Admin Access</h1>
          <p className="text-slate-400 text-center mb-6">Enter password to continue</p>

          <div className="space-y-4">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="Password"
                className="w-full bg-slate-900/50 border border-slate-600 rounded-xl pl-11 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
            </div>
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
            <button
              onClick={handleLogin}
              className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold py-3 rounded-xl transition-colors"
            >
              Access Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading || !metrics) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  const maxTierCount = Math.max(...metrics.tierDistribution.map(t => t.count), 1);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4 pb-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">BioCycle Admin</h1>
            <p className="text-slate-400 text-sm">Research Dashboard</p>
          </div>
          <button
            onClick={() => {
              sessionStorage.removeItem('admin_authenticated');
              setAuthenticated(false);
            }}
            className="text-slate-400 hover:text-white text-sm"
          >
            Sign Out
          </button>
        </header>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-500" />
            Supply Overview
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              label="Total Registered"
              value={metrics.totalTraders}
              icon={<Users className="w-5 h-5" />}
            />
            <MetricCard
              label="Active Today"
              value={metrics.activeToday}
              icon={<Activity className="w-5 h-5" />}
              highlight={metrics.activeToday > 0}
            />
            <MetricCard
              label="Avg Deposits/Day"
              value={metrics.avgDepositsPerDay}
              icon={<TrendingUp className="w-5 h-5" />}
            />
            <MetricCard
              label="Avg Data Depth"
              value={`${metrics.avgDataDepth} days`}
              icon={<Clock className="w-5 h-5" />}
            />
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
            Tier Distribution
          </h2>
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
            <div className="space-y-3">
              {metrics.tierDistribution.map((tier) => (
                <div key={tier.tier} className="flex items-center gap-4">
                  <div className="w-20 text-sm text-slate-400">{tier.tier}</div>
                  <div className="flex-1 h-8 bg-slate-900/50 rounded-lg overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-amber-600 rounded-lg transition-all duration-500 flex items-center justify-end pr-2"
                      style={{ width: `${(tier.count / maxTierCount) * 100}%`, minWidth: tier.count > 0 ? '2rem' : '0' }}
                    >
                      {tier.count > 0 && (
                        <span className="text-xs font-semibold text-slate-900">{tier.count}</span>
                      )}
                    </div>
                  </div>
                  <div className="w-12 text-right text-sm text-slate-500">{tier.count}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-700 text-xs text-slate-500">
              Seed: 0-10 | Root: 11-30 | Growth: 31-60 | Mastery: 61-100 | Oracle: 100+
            </div>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-cyan-500" />
            Research Eligibility (30+ checkins)
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
              <h3 className="text-sm font-medium text-slate-400 mb-4">By Gender</h3>
              <div className="flex gap-6">
                {metrics.researchByGender.map((g) => (
                  <div key={g.gender} className="text-center">
                    <div className="text-3xl font-bold text-white">{g.count}</div>
                    <div className="text-sm text-slate-400">{g.gender}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
              <h3 className="text-sm font-medium text-slate-400 mb-4">By Age Range</h3>
              <div className="flex gap-4 justify-between">
                {metrics.researchByAge.map((a) => (
                  <div key={a.range} className="text-center">
                    <div className="text-2xl font-bold text-white">{a.count}</div>
                    <div className="text-xs text-slate-400">{a.range}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-500" />
            Revenue (Placeholder)
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
              <div className="text-sm text-slate-400 mb-1">Subscriptions</div>
              <div className="text-2xl font-bold text-white">${metrics.subscriptionRevenue.toFixed(2)}</div>
              <div className="text-xs text-slate-500 mt-1">active x $9.99</div>
            </div>
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
              <div className="text-sm text-slate-400 mb-1">Research Transactions</div>
              <div className="text-2xl font-bold text-white">$0.00</div>
              <div className="text-xs text-slate-500 mt-1">placeholder</div>
            </div>
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
              <div className="text-sm text-slate-400 mb-1">Total Revenue</div>
              <div className="text-2xl font-bold text-emerald-400">${metrics.totalRevenue.toFixed(2)}</div>
              <div className="text-xs text-slate-500 mt-1">this month</div>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Mail className="w-5 h-5 text-violet-500" />
            Waitlist
          </h2>
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="text-3xl font-bold text-white">{metrics.waitlistCount}</div>
                <div className="text-sm text-slate-400">Total signups</div>
              </div>
              <div className="w-12 h-12 bg-violet-500/10 rounded-full flex items-center justify-center">
                <Mail className="w-6 h-6 text-violet-400" />
              </div>
            </div>
            <div className="border-t border-slate-700 pt-4">
              <h3 className="text-sm font-medium text-slate-400 mb-3">All waitlist emails</h3>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {metrics.waitlistEmails.map((w, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-slate-300 truncate pr-4">{w.email}</span>
                    <span className="text-slate-500 flex-shrink-0">{w.date}</span>
                  </div>
                ))}
                {metrics.waitlistEmails.length === 0 && (
                  <p className="text-slate-500 text-sm">No waitlist signups yet</p>
                )}
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-rose-500" />
            Recent Activity
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
              <h3 className="text-sm font-medium text-slate-400 mb-4">Last 10 Registrations</h3>
              <div className="space-y-2">
                {metrics.recentRegistrations.map((r, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-slate-300">{r.date}</span>
                    <span className={`font-medium ${r.gender === 'F' ? 'text-rose-400' : r.gender === 'M' ? 'text-cyan-400' : 'text-slate-500'}`}>
                      {r.gender}
                    </span>
                  </div>
                ))}
                {metrics.recentRegistrations.length === 0 && (
                  <p className="text-slate-500 text-sm">No registrations yet</p>
                )}
              </div>
            </div>
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6">
              <h3 className="text-sm font-medium text-slate-400 mb-4">Last 10 Checkins</h3>
              <div className="space-y-2">
                {metrics.recentCheckins.map((c, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-slate-300">{c.date}</span>
                    <span className={`font-medium ${c.qualityScore >= 7 ? 'text-emerald-400' : c.qualityScore >= 4 ? 'text-amber-400' : 'text-rose-400'}`}>
                      {c.qualityScore.toFixed(1)}
                    </span>
                  </div>
                ))}
                {metrics.recentCheckins.length === 0 && (
                  <p className="text-slate-500 text-sm">No checkins yet</p>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon, highlight }: { label: string; value: string | number; icon: React.ReactNode; highlight?: boolean }) {
  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-4">
      <div className={`mb-2 ${highlight ? 'text-emerald-500' : 'text-slate-400'}`}>
        {icon}
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-sm text-slate-400">{label}</div>
    </div>
  );
}
