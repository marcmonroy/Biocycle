import { ArrowLeft } from 'lucide-react';

export function PrivacyScreen() {
  return (
    <div className="min-h-screen bg-[#1a0f3d] text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#1a0f3d]/95 backdrop-blur border-b border-[#2D1B69]/40 px-5 py-4 flex items-center gap-3">
        <button
          onClick={() => window.history.back()}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-[#2D1B69]/40 hover:bg-[#2D1B69]/70 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-white">Privacy Policy</h1>
          <p className="text-xs text-slate-400">Last updated: March 25, 2026</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-6 py-10 space-y-10">

        <section>
          <p className="text-slate-300 leading-relaxed">
            BioCycle is a biological data bank and intelligence platform. We are committed to
            transparency about how your data is collected, used, and protected. This policy explains
            everything clearly — because your biology is your most personal asset.
          </p>
        </section>

        {/* 1. What data we collect */}
        <section>
          <h2 className="text-xl font-bold text-[#FFD93D] mb-4 flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-[#2D1B69] flex items-center justify-center text-sm font-bold">1</span>
            What Data We Collect
          </h2>
          <div className="space-y-4 text-slate-300 leading-relaxed">
            <div className="bg-[#150c2e] border border-[#2D1B69]/40 rounded-xl p-4">
              <h3 className="font-semibold text-white mb-2">Biological &amp; Behavioral Data</h3>
              <p>Daily self-reported scores across emotional, physical, cognitive, stress, social, sexual, and anxiety dimensions. Menstrual cycle data (start date, cycle length) for female users. Circadian and hormonal phase data derived from your inputs.</p>
            </div>
            <div className="bg-[#150c2e] border border-[#2D1B69]/40 rounded-xl p-4">
              <h3 className="font-semibold text-white mb-2">Profile Information</h3>
              <p>Name, gender, date of birth, language preference, and account credentials (email). Notification preferences and check-in schedule times.</p>
            </div>
            <div className="bg-[#150c2e] border border-[#2D1B69]/40 rounded-xl p-4">
              <h3 className="font-semibold text-white mb-2">Usage Data</h3>
              <p>App interaction patterns, feature usage frequency, session timing, and check-in consistency. This data is used exclusively to improve your personalized experience.</p>
            </div>
          </div>
        </section>

        {/* 2. How we use your data */}
        <section>
          <h2 className="text-xl font-bold text-[#FFD93D] mb-4 flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-[#2D1B69] flex items-center justify-center text-sm font-bold">2</span>
            How We Use Your Data
          </h2>
          <div className="space-y-4 text-slate-300 leading-relaxed">
            <div className="bg-[#150c2e] border border-[#2D1B69]/40 rounded-xl p-4">
              <h3 className="font-semibold text-white mb-2">Personalization</h3>
              <p>Your data powers your biological forecast, phase predictions, ambient coaching, and personalized insights delivered through Bio, your AI coach.</p>
            </div>
            <div className="bg-[#150c2e] border border-[#2D1B69]/40 rounded-xl p-4">
              <h3 className="font-semibold text-white mb-2">Research Marketplace (with your explicit consent)</h3>
              <p>When you choose to participate, your anonymized data may be sold to vetted researchers and institutions. Every single transaction requires your individual, explicit approval. You will never be enrolled automatically. You keep 75% of every transaction fee.</p>
            </div>
            <div className="bg-[#150c2e] border border-[#2D1B69]/40 rounded-xl p-4">
              <h3 className="font-semibold text-white mb-2">Improving Our Services</h3>
              <p>Aggregate, de-identified patterns help us improve the accuracy of our biological intelligence engine. No individual identifiable data is used for this purpose.</p>
            </div>
          </div>
        </section>

        {/* 3. Data ownership */}
        <section>
          <h2 className="text-xl font-bold text-[#FFD93D] mb-4 flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-[#2D1B69] flex items-center justify-center text-sm font-bold">3</span>
            Data Ownership
          </h2>
          <div className="bg-[#150c2e] border border-[#2D1B69]/40 rounded-xl p-4 text-slate-300 leading-relaxed space-y-3">
            <p><span className="text-white font-semibold">You own your raw behavioral data.</span> Your daily deposits, scores, notes, and cycle records belong to you. You may access, export, or delete them at any time.</p>
            <p><span className="text-white font-semibold">BioCycle owns the interpretation engine.</span> The algorithms, models, and aggregate biological intelligence patterns derived from the platform are proprietary to BioCycle. You own the inputs; we own the interpretive layer.</p>
          </div>
        </section>

        {/* 4. Research marketplace */}
        <section>
          <h2 className="text-xl font-bold text-[#FFD93D] mb-4 flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-[#2D1B69] flex items-center justify-center text-sm font-bold">4</span>
            Research Marketplace
          </h2>
          <div className="bg-[#150c2e] border border-[#2D1B69]/40 rounded-xl p-4 text-slate-300 leading-relaxed space-y-3">
            <p>Your data is <span className="text-[#FFD93D] font-semibold">only shared with researchers when you explicitly consent to each individual transaction.</span> There is no bulk enrollment, no automatic sharing, and no passive opt-in.</p>
            <p>You receive <span className="text-[#FFD93D] font-semibold">75% of all research transaction fees</span> generated from your data. BioCycle retains 25% as platform operator.</p>
            <p>All data shared with researchers is anonymized and aggregated in compliance with applicable research ethics standards.</p>
          </div>
        </section>

        {/* 5. Data security */}
        <section>
          <h2 className="text-xl font-bold text-[#FFD93D] mb-4 flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-[#2D1B69] flex items-center justify-center text-sm font-bold">5</span>
            Data Security
          </h2>
          <div className="bg-[#150c2e] border border-[#2D1B69]/40 rounded-xl p-4 text-slate-300 leading-relaxed space-y-3">
            <p><span className="text-white font-semibold">Encrypted at rest and in transit.</span> All data is encrypted using industry-standard protocols (AES-256 at rest, TLS 1.3 in transit).</p>
            <p><span className="text-white font-semibold">Supabase infrastructure.</span> Your data is stored on Supabase, a SOC 2 compliant platform built on PostgreSQL with enterprise-grade security.</p>
            <p><span className="text-white font-semibold">Row-Level Security (RLS).</span> Database policies ensure each user can only access their own data. No shared data tables, no cross-user visibility.</p>
          </div>
        </section>

        {/* 6. Your rights */}
        <section>
          <h2 className="text-xl font-bold text-[#FFD93D] mb-4 flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-[#2D1B69] flex items-center justify-center text-sm font-bold">6</span>
            Your Rights
          </h2>
          <div className="bg-[#150c2e] border border-[#2D1B69]/40 rounded-xl p-4 text-slate-300 leading-relaxed">
            <p className="mb-3">You have the right to:</p>
            <ul className="space-y-2">
              {[
                'Access all data we hold about you at any time',
                'Export your complete biological data history in a portable format',
                'Delete your account and all associated data permanently',
                'Withdraw consent for any active research transaction',
                'Opt out of the research marketplace at any time without affecting your core service',
                'Correct inaccurate profile information',
              ].map((right, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-[#FFD93D] mt-0.5 flex-shrink-0">✓</span>
                  <span>{right}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 7. Contact */}
        <section>
          <h2 className="text-xl font-bold text-[#FFD93D] mb-4 flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-[#2D1B69] flex items-center justify-center text-sm font-bold">7</span>
            Contact
          </h2>
          <div className="bg-[#150c2e] border border-[#2D1B69]/40 rounded-xl p-4 text-slate-300 leading-relaxed">
            <p>For privacy-related questions, data requests, or to exercise any of your rights, contact us at:</p>
            <a
              href="mailto:privacy@biocycle.app"
              className="mt-3 inline-flex items-center gap-2 text-[#FFD93D] hover:underline font-medium"
            >
              privacy@biocycle.app
            </a>
          </div>
        </section>

      </div>

      {/* Footer */}
      <footer className="py-8 border-t border-[#2D1B69]/30 text-center text-sm text-slate-500">
        © 2026 BioCycle. All rights reserved.
      </footer>
    </div>
  );
}
