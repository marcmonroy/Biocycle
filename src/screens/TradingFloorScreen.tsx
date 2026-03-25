import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { TrendingUp, Users, Shield, DollarSign, Database, ArrowRight } from 'lucide-react';

const TARGET_TRADERS = 500;

export function TradingFloorScreen() {
  const [traderCount, setTraderCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTraderCount();
  }, []);

  const loadTraderCount = async () => {
    try {
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      setTraderCount(count || 0);
    } catch (err) {
      console.error('Error loading trader count:', err);
      setTraderCount(0);
    } finally {
      setLoading(false);
    }
  };

  const progress = traderCount !== null ? Math.min((traderCount / TARGET_TRADERS) * 100, 100) : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-amber-500/10" />
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-5xl mx-auto px-6 py-20 md:py-28">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <span className="text-emerald-400 font-medium tracking-wide uppercase text-sm">Trading Floor</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-bold mb-4 leading-tight">
            BioCycle Trading Floor
          </h1>
          <p className="text-xl md:text-2xl text-slate-400 max-w-2xl leading-relaxed">
            Knowing yourself pays. Literally.
          </p>
        </div>
      </header>

      <section className="max-w-5xl mx-auto px-6 py-12">
        <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 md:p-12">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Users className="w-6 h-6 text-emerald-400" />
              <span className="text-lg font-medium text-slate-300">Data Trader Enrollment</span>
            </div>
            <span className="text-emerald-400 font-mono text-lg">
              {loading ? '...' : `${traderCount} of ${TARGET_TRADERS}`}
            </span>
          </div>

          <div className="relative h-4 bg-slate-800 rounded-full overflow-hidden mb-4">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-1000"
              style={{ width: loading ? '0%' : `${progress}%` }}
            />
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-400/50 to-transparent rounded-full animate-pulse"
              style={{ width: loading ? '0%' : `${progress}%` }}
            />
          </div>

          <p className="text-slate-400 text-center">
            {loading ? 'Loading...' : `${traderCount} of ${TARGET_TRADERS} Data Traders enrolled`}
          </p>
        </div>

        <div className="mt-8 bg-slate-900/30 border border-slate-800/50 rounded-2xl p-6 md:p-8">
          <p className="text-slate-300 text-center text-lg leading-relaxed max-w-3xl mx-auto">
            The Trading Floor activates at {TARGET_TRADERS} Data Traders. You are building the market.
          </p>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 rounded-3xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold text-white">For Data Traders</h2>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                <p className="text-slate-300">Your biological patterns become a tradeable commodity</p>
              </div>
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                <p className="text-slate-300">You approve every transaction</p>
              </div>
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                <p className="text-slate-300">You keep 75% of every trade</p>
              </div>
            </div>

            <a
              href="/"
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
            >
              Open Trading Account
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>

          <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20 rounded-3xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center">
                <Database className="w-6 h-6 text-amber-400" />
              </div>
              <h2 className="text-xl font-bold text-white">For Research Buyers</h2>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                <p className="text-slate-300">Access the world's first consented longitudinal hormonal behavioral dataset</p>
              </div>
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                <p className="text-slate-300">Post study requirements</p>
              </div>
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                <p className="text-slate-300">BioCycle matches eligible traders automatically</p>
              </div>
            </div>

            <a
              href="/research"
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold px-6 py-3 rounded-xl transition-colors"
            >
              Register Research Interest
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-800 mt-12">
        <div className="max-w-5xl mx-auto px-6 py-8 text-center text-sm text-slate-500">
          BioCycle Trading Floor. Where biological data meets research demand.
        </div>
      </footer>
    </div>
  );
}
