import { ArrowLeft } from 'lucide-react';

export function TermsScreen() {
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
          <h1 className="text-lg font-bold text-white">Terms of Service</h1>
          <p className="text-xs text-slate-400">Last updated: March 25, 2026</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-6 py-10 space-y-10">

        <section>
          <p className="text-slate-300 leading-relaxed">
            These Terms of Service ("Terms") govern your use of BioCycle, a biological data bank and
            intelligence platform operated by BioCycle SRL. By creating an account or using the
            service, you agree to be bound by these Terms.
          </p>
        </section>

        {/* 1. Acceptance */}
        <section>
          <h2 className="text-xl font-bold text-[#FFD93D] mb-4 flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-[#2D1B69] flex items-center justify-center text-sm font-bold">1</span>
            Acceptance of Terms
          </h2>
          <div className="bg-[#150c2e] border border-[#2D1B69]/40 rounded-xl p-4 text-slate-300 leading-relaxed">
            <p>By accessing or using BioCycle, you confirm that you are at least 13 years of age, have read and understood these Terms, and agree to be bound by them. If you do not agree, do not use the service. We reserve the right to update these Terms at any time. Continued use after changes constitutes acceptance.</p>
          </div>
        </section>

        {/* 2. Description of service */}
        <section>
          <h2 className="text-xl font-bold text-[#FFD93D] mb-4 flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-[#2D1B69] flex items-center justify-center text-sm font-bold">2</span>
            Description of Service
          </h2>
          <div className="bg-[#150c2e] border border-[#2D1B69]/40 rounded-xl p-4 text-slate-300 leading-relaxed space-y-3">
            <p>BioCycle is a <span className="text-white font-semibold">biological data bank and intelligence platform</span> that enables users to:</p>
            <ul className="space-y-2 ml-2">
              {[
                'Log daily biological and behavioral self-assessments ("deposits")',
                'Receive personalized hormonal and circadian phase predictions',
                'Interact with Bio, an AI biological intelligence coach',
                'Optionally participate in a consented data research marketplace',
                'Earn revenue from approved research transactions involving their data',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-[#FFD93D] mt-0.5 flex-shrink-0">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p>BioCycle is not a medical device, diagnostic tool, or health service. It is a self-knowledge and data intelligence platform. Nothing on BioCycle constitutes medical advice.</p>
          </div>
        </section>

        {/* 3. User responsibilities */}
        <section>
          <h2 className="text-xl font-bold text-[#FFD93D] mb-4 flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-[#2D1B69] flex items-center justify-center text-sm font-bold">3</span>
            User Responsibilities
          </h2>
          <div className="space-y-4 text-slate-300 leading-relaxed">
            <div className="bg-[#150c2e] border border-[#2D1B69]/40 rounded-xl p-4">
              <h3 className="font-semibold text-white mb-2">Accurate Data</h3>
              <p>You agree to provide accurate profile information and honest self-assessments. Inaccurate data reduces the quality of your biological intelligence and may affect research marketplace transactions you participate in.</p>
            </div>
            <div className="bg-[#150c2e] border border-[#2D1B69]/40 rounded-xl p-4">
              <h3 className="font-semibold text-white mb-2">Age Requirement for Adult Features</h3>
              <p>Access to adult content features (Picardia Mode, sexual energy tracking) requires users to be <span className="text-white font-semibold">18 years of age or older</span>. By enabling these features, you confirm you meet this requirement. BioCycle reserves the right to disable these features if age verification fails.</p>
            </div>
            <div className="bg-[#150c2e] border border-[#2D1B69]/40 rounded-xl p-4">
              <h3 className="font-semibold text-white mb-2">Account Security</h3>
              <p>You are responsible for maintaining the confidentiality of your account credentials. Notify us immediately of any unauthorized access at privacy@biocycle.app.</p>
            </div>
          </div>
        </section>

        {/* 4. Data trading terms */}
        <section>
          <h2 className="text-xl font-bold text-[#FFD93D] mb-4 flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-[#2D1B69] flex items-center justify-center text-sm font-bold">4</span>
            Data Trading Terms
          </h2>
          <div className="bg-[#150c2e] border border-[#2D1B69]/40 rounded-xl p-4 text-slate-300 leading-relaxed space-y-3">
            <p><span className="text-white font-semibold">Consent required for each transaction.</span> Participation in the research marketplace is entirely voluntary. Each data transaction requires your individual, explicit approval before any data is shared or any payment is processed.</p>
            <p><span className="text-white font-semibold">75/25 revenue split.</span> You receive 75% of the gross transaction fee for every approved data sale. BioCycle retains 25% as the platform operator and exchange facilitator.</p>
            <p><span className="text-white font-semibold">BioCycle retains interpretation engine ownership.</span> The biological intelligence algorithms, predictive models, phase calculations, and aggregate insight patterns are proprietary to BioCycle and are not transferred, licensed, or shared with users or researchers through marketplace transactions.</p>
            <p><span className="text-white font-semibold">Researcher eligibility.</span> Only vetted and approved institutions and researchers may purchase data through the marketplace. BioCycle screens all research buyers for ethical compliance.</p>
          </div>
        </section>

        {/* 5. Subscription terms */}
        <section>
          <h2 className="text-xl font-bold text-[#FFD93D] mb-4 flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-[#2D1B69] flex items-center justify-center text-sm font-bold">5</span>
            Subscription Terms
          </h2>
          <div className="space-y-4 text-slate-300 leading-relaxed">
            <div className="bg-[#150c2e] border border-[#2D1B69]/40 rounded-xl p-4">
              <h3 className="font-semibold text-white mb-2">Free Tier</h3>
              <p>Free accounts include access to daily deposits, basic phase forecasting, limited Bio coach messages (30 per month), and the research marketplace. Features may be subject to change.</p>
            </div>
            <div className="bg-[#150c2e] border border-[#2D1B69]/40 rounded-xl p-4">
              <h3 className="font-semibold text-white mb-2">Premium Tier</h3>
              <p>Premium subscribers receive unlimited Bio coach messages, advanced forecasting, priority research marketplace access, and enhanced data export capabilities. Subscription fees are billed monthly or annually. Cancellation takes effect at the end of the current billing period.</p>
            </div>
          </div>
        </section>

        {/* 6. Intellectual property */}
        <section>
          <h2 className="text-xl font-bold text-[#FFD93D] mb-4 flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-[#2D1B69] flex items-center justify-center text-sm font-bold">6</span>
            Intellectual Property
          </h2>
          <div className="bg-[#150c2e] border border-[#2D1B69]/40 rounded-xl p-4 text-slate-300 leading-relaxed space-y-3">
            <p><span className="text-white font-semibold">BioCycle owns the interpretation engine and aggregate insights.</span> The BioCycle brand, platform design, algorithms, predictive models, biological intelligence engine, and all aggregate insights derived from platform data are the exclusive intellectual property of BioCycle SRL.</p>
            <p><span className="text-white font-semibold">Users own their raw data.</span> Your individual daily deposits, scores, notes, and cycle records are your property. BioCycle holds a limited license to process this data solely for the purpose of providing the service and, where you have consented, for marketplace transactions.</p>
          </div>
        </section>

        {/* 7. Limitation of liability */}
        <section>
          <h2 className="text-xl font-bold text-[#FFD93D] mb-4 flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-[#2D1B69] flex items-center justify-center text-sm font-bold">7</span>
            Limitation of Liability
          </h2>
          <div className="bg-[#150c2e] border border-[#2D1B69]/40 rounded-xl p-4 text-slate-300 leading-relaxed space-y-3">
            <p>BioCycle is provided "as is" without warranties of any kind, express or implied. BioCycle does not guarantee the accuracy of biological predictions, the availability of research marketplace transactions, or uninterrupted service access.</p>
            <p>To the maximum extent permitted by applicable law, BioCycle SRL shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the platform, including but not limited to loss of data, loss of earnings, or reliance on biological forecasts for medical decisions.</p>
            <p>BioCycle's total liability for any claim shall not exceed the amount you paid to BioCycle in the 12 months preceding the claim.</p>
          </div>
        </section>

        {/* 8. Governing law */}
        <section>
          <h2 className="text-xl font-bold text-[#FFD93D] mb-4 flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-[#2D1B69] flex items-center justify-center text-sm font-bold">8</span>
            Governing Law
          </h2>
          <div className="bg-[#150c2e] border border-[#2D1B69]/40 rounded-xl p-4 text-slate-300 leading-relaxed">
            <p>These Terms are governed by and construed in accordance with the laws of the <span className="text-white font-semibold">Dominican Republic</span>. Any disputes arising from these Terms or your use of BioCycle shall be subject to the exclusive jurisdiction of the courts of Santo Domingo, Dominican Republic.</p>
          </div>
        </section>

        {/* 9. Contact */}
        <section>
          <h2 className="text-xl font-bold text-[#FFD93D] mb-4 flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-[#2D1B69] flex items-center justify-center text-sm font-bold">9</span>
            Contact
          </h2>
          <div className="bg-[#150c2e] border border-[#2D1B69]/40 rounded-xl p-4 text-slate-300 leading-relaxed">
            <p>For questions about these Terms or legal matters, contact:</p>
            <a
              href="mailto:legal@biocycle.app"
              className="mt-3 inline-flex items-center gap-2 text-[#FFD93D] hover:underline font-medium"
            >
              legal@biocycle.app
            </a>
          </div>
        </section>

      </div>

      {/* Footer */}
      <footer className="py-8 border-t border-[#2D1B69]/30 text-center text-sm text-slate-500">
        © 2026 BioCycle SRL. All rights reserved.
      </footer>
    </div>
  );
}
