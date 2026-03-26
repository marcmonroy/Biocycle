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
    <div className="min-h-screen bg-[#0F0F1F]">
      <header className="bg-[#0F0F1F] border-b border-[#1E1E3A] text-white">
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-24">
          <div className="flex items-center gap-3 mb-4">
            <Database className="w-8 h-8 text-[#F5C842]" />
            <span className="text-[#F5C842] font-medium tracking-wide uppercase text-sm" style={{ fontFamily: 'JetBrains Mono, monospace' }}>Research Portal</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight" style={{ fontFamily: 'Clash Display, system-ui, sans-serif' }}>
            BioCycle Research Portal
          </h1>
          <p className="text-xl text-[#8B95B0] max-w-2xl leading-relaxed">
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
        <h2 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: 'Clash Display, system-ui, sans-serif' }}>Available Dataset Categories</h2>
        <p className="text-[#8B95B0] mb-8">Ethically sourced, consented behavioral data correlated with hormonal cycles</p>

        <div className="grid md:grid-cols-2 gap-6">
          {DATASET_CARDS.map((card) => (
            <div
              key={card.title}
              className="bg-[#111126] rounded-2xl border border-[#1E1E3A] p-6 hover:border-[#F5C842]/30 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center`}>
                  <card.icon className="w-6 h-6 text-white" />
                </div>
                <span className="px-3 py-1 bg-[#F5C842]/10 text-[#F5C842] text-xs font-medium rounded-full border border-[#F5C842]/20">
                  Dataset Growing
                </span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{card.title}</h3>
              <p className="text-[#8B95B0] text-sm leading-relaxed">{card.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[#0A0A1A] border-t border-[#1E1E3A] text-white">
        <div className="max-w-3xl mx-auto px-6 py-16">
          <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: 'Clash Display, system-ui, sans-serif' }}>Register Research Interest</h2>
          <p className="text-[#8B95B0] mb-8">Connect with our data partnerships team to discuss your research requirements</p>

          {submitted ? (
            <div className="bg-[#00D4A1]/10 border border-[#00D4A1]/20 rounded-2xl p-8 text-center">
              <div className="w-16 h-16 bg-[#00D4A1]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-[#00D4A1]" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Registration Received</h3>
              <p className="text-[#8B95B0]">
                Thank you. A BioCycle data partnerships representative will contact you within 48 hours to discuss your research requirements.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-[#8B95B0] mb-2">Company Name</label>
                  <input
                    type="text"
                    required
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className="w-full bg-[#111126] border border-[#1E1E3A] rounded-xl px-4 py-3 text-white placeholder-[#4A5568] focus:outline-none focus:border-[#F5C842] focus:ring-1 focus:ring-[#F5C842]"
                    placeholder="Organization name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#8B95B0] mb-2">Contact Name</label>
                  <input
                    type="text"
                    required
                    value={formData.contactName}
                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                    className="w-full bg-[#111126] border border-[#1E1E3A] rounded-xl px-4 py-3 text-white placeholder-[#4A5568] focus:outline-none focus:border-[#F5C842] focus:ring-1 focus:ring-[#F5C842]"
                    placeholder="Your name"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-[#8B95B0] mb-2">Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-[#111126] border border-[#1E1E3A] rounded-xl px-4 py-3 text-white placeholder-[#4A5568] focus:outline-none focus:border-[#F5C842] focus:ring-1 focus:ring-[#F5C842]"
                    placeholder="work@company.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#8B95B0] mb-2">Research Category</label>
                  <select
                    required
                    value={formData.researchCategory}
                    onChange={(e) => setFormData({ ...formData, researchCategory: e.target.value })}
                    className="w-full bg-[#111126] border border-[#1E1E3A] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#F5C842] focus:ring-1 focus:ring-[#F5C842]"
                  >
                    <option value="">Select category</option>
                    {RESEARCH_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#8B95B0] mb-2">Research Interest</label>
                <textarea
                  rows={4}
                  value={formData.researchInterest}
                  onChange={(e) => setFormData({ ...formData, researchInterest: e.target.value })}
                  className="w-full bg-[#111126] border border-[#1E1E3A] rounded-xl px-4 py-3 text-white placeholder-[#4A5568] focus:outline-none focus:border-[#F5C842] focus:ring-1 focus:ring-[#F5C842] resize-none"
                  placeholder="Describe your research objectives and data requirements"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-[#F5C842] hover:bg-[#F5C842]/90 disabled:opacity-50 disabled:cursor-not-allowed text-[#0A0A1A] font-semibold py-4 rounded-xl transition-colors flex items-center justify-center gap-2"
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

      <footer className="bg-[#0A0A1A] border-t border-[#1E1E3A]">
        <div className="max-w-6xl mx-auto px-6 py-8 text-center text-sm text-[#4A5568]">
          BioCycle Research Portal. All data is ethically sourced from consenting participants.
        </div>
      </footer>
    </div>
  );
}

function StatCard({ label, value, icon, highlight }: { label: string; value: string; icon: React.ReactNode; highlight?: boolean }) {
  return (
    <div className={`rounded-xl p-4 md:p-6 ${highlight ? 'bg-[#F5C842]/10 border border-[#F5C842]/20' : 'bg-[#111126] border border-[#1E1E3A]'}`}>
      <div className={`mb-2 ${highlight ? 'text-[#F5C842]' : 'text-[#8B95B0]'}`}>
        {icon}
      </div>
      <div className={`text-2xl md:text-3xl font-bold ${highlight ? 'text-[#F5C842]' : 'text-white'}`} style={{ fontFamily: 'JetBrains Mono, monospace' }}>{value}</div>
      <div className="text-xs md:text-sm text-[#8B95B0] mt-1">{label}</div>
    </div>
  );
}
