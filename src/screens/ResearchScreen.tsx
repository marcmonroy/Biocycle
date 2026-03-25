import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Database, Brain, Activity, Heart, TrendingUp, Users, Calendar, CheckCircle, Loader2 } from 'lucide-react';

interface LiveStats {
  totalTraders: number;
  avgDataDepth: number;
  researchEligible: number;
}

const RESEARCH_CATEGORIES = [
  'Pharmaceutical',
  'Nutrition',
  'Academic',
  'Corporate Wellness',
  'Femtech',
  'AI Training',
  'Other',
];

const DATASET_CARDS = [
  {
    icon: Activity,
    title: 'Hormonal Mood Patterns',
    description: 'Emotional and behavioral states correlated with cycle phase across male and female participants. Longitudinal depth up to 365+ days.',
    color: 'from-rose-500 to-rose-600',
  },
  {
    icon: Brain,
    title: 'Cognitive Performance Cycles',
    description: 'Cognitive, focus, and decision-making patterns mapped across hormonal phases. Validated across age groups.',
    color: 'from-cyan-500 to-cyan-600',
  },
  {
    icon: TrendingUp,
    title: 'Anxiety Vulnerability Windows',
    description: 'Predictive anxiety indicators correlated with biological cycle phases. Most requested dataset category.',
    color: 'from-amber-500 to-amber-600',
  },
  {
    icon: Heart,
    title: 'Sexual Health Patterns',
    description: 'Sexual energy patterns correlated with hormonal phases. Premium dataset. 18+ consented participants only.',
    color: 'from-rose-400 to-pink-500',
  },
];

export function ResearchScreen() {
  const [stats, setStats] = useState<LiveStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    contactName: '',
    email: '',
    researchCategory: '',
    researchInterest: '',
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id');

      const { data: checkins } = await supabase
        .from('checkins')
        .select('user_id');

      const totalTraders = profiles?.length || 0;

      const checkinsByUser: Record<string, number> = {};
      checkins?.forEach(c => {
        checkinsByUser[c.user_id] = (checkinsByUser[c.user_id] || 0) + 1;
      });

      const userCounts = Object.values(checkinsByUser);
      const avgDataDepth = userCounts.length
        ? Math.round((userCounts.reduce((a, b) => a + b, 0) / userCounts.length) * 10) / 10
        : 0;

      const researchEligible = userCounts.filter(c => c >= 30).length;

      setStats({ totalTraders, avgDataDepth, researchEligible });
    } catch (err) {
      console.error('Error loading stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.companyName || !formData.contactName || !formData.email || !formData.researchCategory) {
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('research_buyers').insert({
        company_name: formData.companyName,
        contact_name: formData.contactName,
        email: formData.email,
        research_category: formData.researchCategory,
        research_interest: formData.researchInterest,
      });

      if (error) throw error;
      setSubmitted(true);
    } catch (err) {
      console.error('Error submitting:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-r from-slate-900 to-slate-800 text-white">
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-24">
          <div className="flex items-center gap-3 mb-4">
            <Database className="w-8 h-8 text-amber-400" />
            <span className="text-amber-400 font-medium tracking-wide uppercase text-sm">Research Portal</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
            BioCycle Research Portal
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl leading-relaxed">
            Access the world's first consented longitudinal hormonal behavioral dataset
          </p>

          <div className="grid grid-cols-3 gap-4 mt-12">
            <StatCard
              label="Total Data Traders"
              value={loading ? '-' : stats?.totalTraders.toLocaleString() || '0'}
              icon={<Users className="w-5 h-5" />}
            />
            <StatCard
              label="Average Data Depth"
              value={loading ? '-' : `${stats?.avgDataDepth || 0} days`}
              icon={<Calendar className="w-5 h-5" />}
            />
            <StatCard
              label="Research Eligible"
              value={loading ? '-' : stats?.researchEligible.toLocaleString() || '0'}
              icon={<CheckCircle className="w-5 h-5" />}
              highlight
            />
          </div>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Available Dataset Categories</h2>
        <p className="text-slate-600 mb-8">Ethically sourced, consented behavioral data correlated with hormonal cycles</p>

        <div className="grid md:grid-cols-2 gap-6">
          {DATASET_CARDS.map((card) => (
            <div
              key={card.title}
              className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center`}>
                  <card.icon className="w-6 h-6 text-white" />
                </div>
                <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                  Dataset Growing
                </span>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">{card.title}</h3>
              <p className="text-slate-600 text-sm leading-relaxed">{card.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-slate-900 text-white">
        <div className="max-w-3xl mx-auto px-6 py-16">
          <h2 className="text-2xl font-bold mb-2">Register Research Interest</h2>
          <p className="text-slate-400 mb-8">Connect with our data partnerships team to discuss your research requirements</p>

          {submitted ? (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-8 text-center">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Registration Received</h3>
              <p className="text-slate-300">
                Thank you. A BioCycle data partnerships representative will contact you within 48 hours to discuss your research requirements.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Company Name</label>
                  <input
                    type="text"
                    required
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    placeholder="Organization name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Contact Name</label>
                  <input
                    type="text"
                    required
                    value={formData.contactName}
                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    placeholder="Your name"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    placeholder="work@company.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Research Category</label>
                  <select
                    required
                    value={formData.researchCategory}
                    onChange={(e) => setFormData({ ...formData, researchCategory: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="">Select category</option>
                    {RESEARCH_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Research Interest</label>
                <textarea
                  rows={4}
                  value={formData.researchInterest}
                  onChange={(e) => setFormData({ ...formData, researchInterest: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 resize-none"
                  placeholder="Describe your research objectives and data requirements"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 font-semibold py-4 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Register Interest'
                )}
              </button>
            </form>
          )}
        </div>
      </section>

      <footer className="bg-slate-100 border-t border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-8 text-center text-sm text-slate-500">
          BioCycle Research Portal. All data is ethically sourced from consenting participants.
        </div>
      </footer>
    </div>
  );
}

function StatCard({ label, value, icon, highlight }: { label: string; value: string; icon: React.ReactNode; highlight?: boolean }) {
  return (
    <div className={`rounded-xl p-4 md:p-6 ${highlight ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-slate-800/50 border border-slate-700/50'}`}>
      <div className={`mb-2 ${highlight ? 'text-amber-400' : 'text-slate-400'}`}>
        {icon}
      </div>
      <div className={`text-2xl md:text-3xl font-bold ${highlight ? 'text-amber-400' : 'text-white'}`}>{value}</div>
      <div className="text-xs md:text-sm text-slate-400 mt-1">{label}</div>
    </div>
  );
}
