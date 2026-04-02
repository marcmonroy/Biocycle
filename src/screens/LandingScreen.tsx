import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ArrowRight, Mail, Loader2, Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react';

const QUANTUM_STYLES = `
@keyframes qf1{0%{opacity:.92}20%{opacity:.02}36%{opacity:.86}58%{opacity:.07}76%{opacity:.94}91%{opacity:.12}100%{opacity:.8}}
@keyframes qf2{0%{opacity:.18}17%{opacity:.91}42%{opacity:.04}64%{opacity:.87}80%{opacity:.08}96%{opacity:.74}100%{opacity:.28}}
@keyframes qf3{0%{opacity:.62}26%{opacity:.01}43%{opacity:.78}70%{opacity:.22}85%{opacity:.96}100%{opacity:.48}}
@keyframes qf4{0%{opacity:.08}31%{opacity:.97}54%{opacity:.02}71%{opacity:.84}89%{opacity:.04}100%{opacity:.7}}
@keyframes qf5{0%{opacity:.88}14%{opacity:.26}37%{opacity:.01}57%{opacity:.9}76%{opacity:.32}100%{opacity:.91}}
@keyframes qf6{0%{opacity:.38}23%{opacity:.99}48%{opacity:.06}67%{opacity:.77}83%{opacity:.01}100%{opacity:.58}}
@keyframes qf7{0%{opacity:.74}29%{opacity:.03}51%{opacity:.93}69%{opacity:.16}87%{opacity:.8}100%{opacity:.36}}
@keyframes qf8{0%{opacity:.52}13%{opacity:.01}33%{opacity:.88}56%{opacity:.3}77%{opacity:.96}93%{opacity:.07}100%{opacity:.54}}
@keyframes qExist{0%{opacity:.08}10%{opacity:.92}33%{opacity:.88}47%{opacity:.12}57%{opacity:.82}73%{opacity:.95}86%{opacity:.04}94%{opacity:.9}100%{opacity:.08}}
@keyframes singPulse{0%,100%{opacity:1}50%{opacity:.6}}
.bc-qDna{animation:qExist 9s ease-in-out infinite;}
.bc-qf1{animation:qf1 2.4s ease-in-out infinite;}
.bc-qf2{animation:qf2 1.85s ease-in-out infinite;}
.bc-qf3{animation:qf3 3.2s ease-in-out infinite;}
.bc-qf4{animation:qf4 2.75s ease-in-out infinite;}
.bc-qf5{animation:qf5 1.55s ease-in-out infinite;}
.bc-qf6{animation:qf6 2.95s ease-in-out infinite;}
.bc-qf7{animation:qf7 3.6s ease-in-out infinite;}
.bc-qf8{animation:qf8 2.15s ease-in-out infinite;}
.bc-singP{animation:singPulse 2.8s ease-in-out infinite;}
`;

function calcPortfolio(gender: string, age: string, freq: string) {
  let b30 = 12, b90 = 47, b365 = 210;
  if (age === 'mid') { b30 *= 1.45; b90 *= 1.55; b365 *= 1.65; }
  else if (age === 's') { b30 *= 1.22; b90 *= 1.32; b365 *= 1.42; }
  if (gender === 'f') { b30 *= 1.12; b90 *= 1.12; b365 *= 1.12; }
  if (freq === 'd') { b30 *= 1.25; b90 *= 1.3; b365 *= 1.35; }
  else if (freq === 'o') { b30 *= 0.55; b90 *= 0.6; b365 *= 0.65; }
  return { v30: Math.round(b30), v90: Math.round(b90), v365: Math.round(b365) };
}

interface LandingScreenProps {
  onAuthSuccess?: () => void;
}

type AuthMode = 'none' | 'register' | 'signin';

export function LandingScreen({ onAuthSuccess }: LandingScreenProps) {
  const [lang, setLang] = useState<'en' | 'es'>('es');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>('none');

  // Portfolio calculator state
  const [calcGender, setCalcGender] = useState('f');
  const [calcAge, setCalcAge] = useState('y');
  const [calcFreq, setCalcFreq] = useState('d');
  const portfolio = calcPortfolio(calcGender, calcAge, calcFreq);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError(null);
    try {
      const { error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError) throw signUpError;
      if (onAuthSuccess) onAuthSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    if (!email || !password) return;
    setLoading(true);
    setError(null);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
      if (onAuthSuccess) onAuthSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  const t = (en: string, es: string) => lang === 'en' ? en : es;

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A1A', color: '#F0F0F8', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style dangerouslySetInnerHTML={{ __html: QUANTUM_STYLES }} />

      {/* Nav */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 2rem', borderBottom: '1px solid rgba(255,255,255,.06)', position: 'sticky', top: 0, zIndex: 50, background: 'rgba(10,10,26,0.92)', backdropFilter: 'blur(12px)' }}>
        <div style={{ fontFamily: "'Syne', system-ui, sans-serif", fontWeight: 800, fontSize: '1.15rem', color: '#FFD93D', letterSpacing: '.18em' }}>BIOCYCLE</div>
        <button
          onClick={() => setLang(lang === 'en' ? 'es' : 'en')}
          style={{ background: 'transparent', border: '1px solid rgba(255,217,61,.35)', color: '#FFD93D', padding: '.45rem 1.1rem', borderRadius: '100px', fontSize: '.82rem', cursor: 'pointer', transition: 'background .2s' }}
        >
          {lang === 'en' ? 'ES' : 'EN'}
        </button>
      </nav>

      {/* Hero */}
      <section style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '2.5rem 1.5rem 3.5rem', position: 'relative', overflow: 'hidden' }}>
        {/* Starfield */}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(1.5px 1.5px at 8% 12%,rgba(255,255,255,.5) 0%,transparent 100%),radial-gradient(1px 1px at 22% 42%,rgba(255,255,255,.3) 0%,transparent 100%),radial-gradient(2px 2px at 55% 18%,rgba(255,255,255,.4) 0%,transparent 100%),radial-gradient(1px 1px at 78% 32%,rgba(255,255,255,.35) 0%,transparent 100%),radial-gradient(1px 1px at 92% 62%,rgba(255,255,255,.25) 0%,transparent 100%),radial-gradient(1.5px 1.5px at 15% 80%,rgba(255,255,255,.3) 0%,transparent 100%),radial-gradient(1px 1px at 65% 90%,rgba(255,255,255,.2) 0%,transparent 100%)', pointerEvents: 'none' }} />

        {/* DNA SVG */}
        <div style={{ position: 'relative', marginBottom: '1.5rem', zIndex: 1 }}>
          <svg width="280" height="310" viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg">
            <circle cx="150" cy="150" r="148" fill="#060612"/>
            <ellipse cx="150" cy="150" rx="72" ry="132" fill="rgba(0,200,150,.018)"/>
            <ellipse cx="150" cy="150" rx="55" ry="110" fill="rgba(255,107,107,.015)"/>
            {/* Expansion waves */}
            <circle cx="150" cy="150" r="2" fill="none" stroke="rgba(255,217,61,.65)" strokeWidth="1.2">
              <animate attributeName="r" values="2;140" dur="4.5s" repeatCount="indefinite" begin="0s"/>
              <animate attributeName="opacity" values=".7;0" dur="4.5s" repeatCount="indefinite" begin="0s"/>
              <animate attributeName="stroke-width" values="1.5;.1" dur="4.5s" repeatCount="indefinite" begin="0s"/>
            </circle>
            <circle cx="150" cy="150" r="2" fill="none" stroke="rgba(255,107,107,.55)" strokeWidth="1">
              <animate attributeName="r" values="2;140" dur="4.5s" repeatCount="indefinite" begin="1.5s"/>
              <animate attributeName="opacity" values=".6;0" dur="4.5s" repeatCount="indefinite" begin="1.5s"/>
              <animate attributeName="stroke-width" values="1.2;.1" dur="4.5s" repeatCount="indefinite" begin="1.5s"/>
            </circle>
            <circle cx="150" cy="150" r="2" fill="none" stroke="rgba(0,200,150,.45)" strokeWidth="1">
              <animate attributeName="r" values="2;140" dur="4.5s" repeatCount="indefinite" begin="3s"/>
              <animate attributeName="opacity" values=".5;0" dur="4.5s" repeatCount="indefinite" begin="3s"/>
              <animate attributeName="stroke-width" values="1;.1" dur="4.5s" repeatCount="indefinite" begin="3s"/>
            </circle>
            {/* DNA Cloud */}
            <g className="bc-qDna">
              {/* Rungs */}
              <line x1="215" y1="20" x2="85" y2="20" stroke="rgba(255,217,61,.09)" strokeWidth=".5" strokeDasharray="3 6" className="bc-qf3"/>
              <line x1="203" y1="34" x2="97" y2="34" stroke="rgba(255,217,61,.08)" strokeWidth=".5" strokeDasharray="2 5" className="bc-qf7"/>
              <line x1="170" y1="47" x2="130" y2="47" stroke="rgba(255,217,61,.12)" strokeWidth=".5" strokeDasharray="3 3" className="bc-qf1"/>
              <line x1="130" y1="61" x2="170" y2="61" stroke="rgba(255,217,61,.1)" strokeWidth=".5" strokeDasharray="2 4" className="bc-qf5"/>
              <line x1="97" y1="75" x2="203" y2="75" stroke="rgba(255,217,61,.09)" strokeWidth=".5" strokeDasharray="3 5" className="bc-qf2"/>
              <line x1="85" y1="88" x2="215" y2="88" stroke="rgba(255,217,61,.11)" strokeWidth=".5" strokeDasharray="3 6" className="bc-qf6"/>
              <line x1="97" y1="102" x2="203" y2="102" stroke="rgba(255,217,61,.09)" strokeWidth=".5" strokeDasharray="2 5" className="bc-qf4"/>
              <line x1="130" y1="116" x2="170" y2="116" stroke="rgba(255,217,61,.13)" strokeWidth=".5" strokeDasharray="3 3" className="bc-qf8"/>
              <line x1="170" y1="129" x2="130" y2="129" stroke="rgba(255,217,61,.13)" strokeWidth=".5" strokeDasharray="3 3" className="bc-qf3"/>
              <line x1="203" y1="143" x2="97" y2="143" stroke="rgba(255,217,61,.1)" strokeWidth=".5" strokeDasharray="2 5" className="bc-qf7"/>
              <line x1="215" y1="157" x2="85" y2="157" stroke="rgba(255,217,61,.11)" strokeWidth=".5" strokeDasharray="3 6" className="bc-qf1"/>
              <line x1="203" y1="170" x2="97" y2="170" stroke="rgba(255,217,61,.09)" strokeWidth=".5" strokeDasharray="2 4" className="bc-qf5"/>
              <line x1="170" y1="184" x2="130" y2="184" stroke="rgba(255,217,61,.12)" strokeWidth=".5" strokeDasharray="3 3" className="bc-qf2"/>
              <line x1="130" y1="198" x2="170" y2="198" stroke="rgba(255,217,61,.1)" strokeWidth=".5" strokeDasharray="2 5" className="bc-qf6"/>
              <line x1="97" y1="211" x2="203" y2="211" stroke="rgba(255,217,61,.09)" strokeWidth=".5" strokeDasharray="3 5" className="bc-qf4"/>
              <line x1="85" y1="225" x2="215" y2="225" stroke="rgba(255,217,61,.11)" strokeWidth=".5" strokeDasharray="3 6" className="bc-qf8"/>
              <line x1="97" y1="239" x2="203" y2="239" stroke="rgba(255,217,61,.09)" strokeWidth=".5" strokeDasharray="2 5" className="bc-qf3"/>
              <line x1="130" y1="252" x2="170" y2="252" stroke="rgba(255,217,61,.12)" strokeWidth=".5" strokeDasharray="3 3" className="bc-qf7"/>
              <line x1="170" y1="266" x2="130" y2="266" stroke="rgba(255,217,61,.12)" strokeWidth=".5" strokeDasharray="3 3" className="bc-qf1"/>
              <line x1="203" y1="280" x2="97" y2="280" stroke="rgba(255,217,61,.09)" strokeWidth=".5" strokeDasharray="2 5" className="bc-qf5"/>
              {/* Strand 1 coral/gold */}
              <circle cx="215" cy="20" r="5.5" fill="#FF6B6B" className="bc-qf1"/>
              <circle cx="203" cy="34" r="5" fill="#FF8055" className="bc-qf6"/>
              <circle cx="170" cy="47" r="4" fill="#FFD93D" className="bc-qf3"/>
              <circle cx="130" cy="61" r="3" fill="#FFD93D" className="bc-qf8"/>
              <circle cx="97" cy="75" r="2" fill="#F4A261" className="bc-qf5"/>
              <circle cx="85" cy="88" r="1.5" fill="#F4A261" className="bc-qf2"/>
              <circle cx="97" cy="102" r="2" fill="#FF6B6B" className="bc-qf7"/>
              <circle cx="130" cy="116" r="3" fill="#FF6B6B" className="bc-qf4"/>
              <circle cx="170" cy="129" r="4" fill="#FF6B6B" className="bc-qf1"/>
              <circle cx="203" cy="143" r="5" fill="#FF6B6B" className="bc-qf6"/>
              <circle cx="215" cy="157" r="5.5" fill="#FFD93D" className="bc-qf3"/>
              <circle cx="203" cy="170" r="5" fill="#FF6B6B" className="bc-qf8"/>
              <circle cx="170" cy="184" r="4" fill="#FF6B6B" className="bc-qf5"/>
              <circle cx="130" cy="198" r="3" fill="#FFD93D" className="bc-qf2"/>
              <circle cx="97" cy="211" r="2" fill="#F4A261" className="bc-qf7"/>
              <circle cx="85" cy="225" r="1.5" fill="#F4A261" className="bc-qf4"/>
              <circle cx="97" cy="239" r="2" fill="#FF6B6B" className="bc-qf1"/>
              <circle cx="130" cy="252" r="3" fill="#FF6B6B" className="bc-qf6"/>
              <circle cx="170" cy="266" r="4" fill="#FF6B6B" className="bc-qf3"/>
              <circle cx="203" cy="280" r="5" fill="#FFD93D" className="bc-qf8"/>
              {/* Strand 2 green/teal */}
              <circle cx="85" cy="20" r="1.5" fill="#00C896" className="bc-qf5"/>
              <circle cx="97" cy="34" r="2" fill="#5BC0EB" className="bc-qf2"/>
              <circle cx="130" cy="47" r="3" fill="#00C896" className="bc-qf7"/>
              <circle cx="170" cy="61" r="4" fill="#00C896" className="bc-qf4"/>
              <circle cx="203" cy="75" r="5" fill="#00C896" className="bc-qf1"/>
              <circle cx="215" cy="88" r="5.5" fill="#00C896" className="bc-qf6"/>
              <circle cx="203" cy="102" r="5" fill="#5BC0EB" className="bc-qf3"/>
              <circle cx="170" cy="116" r="4" fill="#00C896" className="bc-qf8"/>
              <circle cx="130" cy="129" r="3" fill="#00C896" className="bc-qf5"/>
              <circle cx="97" cy="143" r="2" fill="#00C896" className="bc-qf2"/>
              <circle cx="85" cy="157" r="1.5" fill="#00C896" className="bc-qf7"/>
              <circle cx="97" cy="170" r="2" fill="#5BC0EB" className="bc-qf4"/>
              <circle cx="130" cy="184" r="3" fill="#00C896" className="bc-qf1"/>
              <circle cx="170" cy="198" r="4" fill="#00C896" className="bc-qf6"/>
              <circle cx="203" cy="211" r="5" fill="#00C896" className="bc-qf3"/>
              <circle cx="215" cy="225" r="5.5" fill="#00C896" className="bc-qf8"/>
              <circle cx="203" cy="239" r="5" fill="#5BC0EB" className="bc-qf5"/>
              <circle cx="170" cy="252" r="4" fill="#00C896" className="bc-qf2"/>
              <circle cx="130" cy="266" r="3" fill="#00C896" className="bc-qf7"/>
              <circle cx="97" cy="280" r="2" fill="#00C896" className="bc-qf4"/>
              {/* Quantum foam */}
              <circle cx="142" cy="28" r="1" fill="rgba(255,217,61,.85)" className="bc-qf2"/>
              <circle cx="178" cy="42" r=".8" fill="rgba(255,255,255,.7)" className="bc-qf5"/>
              <circle cx="118" cy="55" r="1.1" fill="rgba(0,200,150,.75)" className="bc-qf8"/>
              <circle cx="160" cy="70" r=".9" fill="rgba(255,107,107,.8)" className="bc-qf1"/>
              <circle cx="135" cy="82" r="1" fill="rgba(255,255,255,.65)" className="bc-qf4"/>
              <circle cx="172" cy="95" r=".8" fill="rgba(91,192,235,.7)" className="bc-qf7"/>
              <circle cx="148" cy="108" r="1.2" fill="rgba(255,217,61,.9)" className="bc-qf3"/>
              <circle cx="120" cy="120" r=".9" fill="rgba(0,200,150,.7)" className="bc-qf6"/>
              <circle cx="180" cy="132" r="1" fill="rgba(255,107,107,.75)" className="bc-qf2"/>
              <circle cx="138" cy="144" r=".8" fill="rgba(255,255,255,.8)" className="bc-qf8"/>
              <circle cx="162" cy="158" r="1.2" fill="rgba(255,217,61,.85)" className="bc-qf5"/>
              <circle cx="125" cy="170" r="1" fill="rgba(0,200,150,.7)" className="bc-qf1"/>
              <circle cx="175" cy="183" r=".9" fill="rgba(255,107,107,.75)" className="bc-qf4"/>
              <circle cx="145" cy="196" r="1.1" fill="rgba(255,255,255,.65)" className="bc-qf7"/>
              <circle cx="158" cy="210" r=".8" fill="rgba(91,192,235,.8)" className="bc-qf3"/>
              <circle cx="132" cy="222" r="1" fill="rgba(255,217,61,.75)" className="bc-qf6"/>
              <circle cx="168" cy="236" r=".9" fill="rgba(0,200,150,.7)" className="bc-qf2"/>
              <circle cx="150" cy="248" r="1.2" fill="rgba(255,107,107,.8)" className="bc-qf8"/>
              <circle cx="118" cy="260" r=".8" fill="rgba(255,255,255,.6)" className="bc-qf5"/>
              <circle cx="182" cy="272" r="1" fill="rgba(255,217,61,.7)" className="bc-qf1"/>
              <circle cx="128" cy="145" r=".9" fill="rgba(255,217,61,.9)" className="bc-qf6"/>
              <circle cx="172" cy="153" r="1" fill="rgba(255,107,107,.8)" className="bc-qf3"/>
              <circle cx="112" cy="150" r=".8" fill="rgba(0,200,150,.75)" className="bc-qf7"/>
              <circle cx="188" cy="148" r=".9" fill="rgba(255,255,255,.7)" className="bc-qf2"/>
              <circle cx="150" cy="136" r="1.1" fill="rgba(91,192,235,.8)" className="bc-qf8"/>
              <circle cx="150" cy="164" r="1" fill="rgba(255,217,61,.85)" className="bc-qf4"/>
              <circle cx="140" cy="156" r=".7" fill="rgba(255,107,107,.7)" className="bc-qf5"/>
              <circle cx="160" cy="144" r=".7" fill="rgba(0,200,150,.8)" className="bc-qf1"/>
            </g>
            {/* Voice waves right */}
            <line x1="155" y1="150" x2="157" y2="150" stroke="rgba(255,107,107,.8)" strokeWidth="1.5" strokeLinecap="round">
              <animate attributeName="x2" values="158;255;158" dur="2.2s" repeatCount="indefinite" begin="0s"/>
              <animate attributeName="opacity" values=".85;0;.85" dur="2.2s" repeatCount="indefinite" begin="0s"/>
            </line>
            <line x1="155" y1="156" x2="157" y2="156" stroke="rgba(255,217,61,.7)" strokeWidth="1" strokeLinecap="round">
              <animate attributeName="x2" values="158;235;158" dur="2.2s" repeatCount="indefinite" begin=".45s"/>
              <animate attributeName="opacity" values=".75;0;.75" dur="2.2s" repeatCount="indefinite" begin=".45s"/>
            </line>
            <line x1="155" y1="144" x2="157" y2="144" stroke="rgba(0,200,150,.6)" strokeWidth="1" strokeLinecap="round">
              <animate attributeName="x2" values="158;218;158" dur="2.2s" repeatCount="indefinite" begin=".9s"/>
              <animate attributeName="opacity" values=".65;0;.65" dur="2.2s" repeatCount="indefinite" begin=".9s"/>
            </line>
            {/* Voice waves left */}
            <line x1="145" y1="150" x2="143" y2="150" stroke="rgba(255,107,107,.8)" strokeWidth="1.5" strokeLinecap="round">
              <animate attributeName="x2" values="142;45;142" dur="2.2s" repeatCount="indefinite" begin="0s"/>
              <animate attributeName="opacity" values=".85;0;.85" dur="2.2s" repeatCount="indefinite" begin="0s"/>
            </line>
            <line x1="145" y1="156" x2="143" y2="156" stroke="rgba(255,217,61,.7)" strokeWidth="1" strokeLinecap="round">
              <animate attributeName="x2" values="142;65;142" dur="2.2s" repeatCount="indefinite" begin=".45s"/>
              <animate attributeName="opacity" values=".75;0;.75" dur="2.2s" repeatCount="indefinite" begin=".45s"/>
            </line>
            <line x1="145" y1="144" x2="143" y2="144" stroke="rgba(0,200,150,.6)" strokeWidth="1" strokeLinecap="round">
              <animate attributeName="x2" values="142;82;142" dur="2.2s" repeatCount="indefinite" begin=".9s"/>
              <animate attributeName="opacity" values=".65;0;.65" dur="2.2s" repeatCount="indefinite" begin=".9s"/>
            </line>
            {/* Central singularity */}
            <circle cx="150" cy="150" r="14" fill="rgba(255,217,61,.12)" className="bc-singP"/>
            <circle cx="150" cy="150" r="8" fill="rgba(255,217,61,.3)" className="bc-singP"/>
            <circle cx="150" cy="150" r="4" fill="white" opacity=".95"/>
            <circle cx="150" cy="150" r="2" fill="white"/>
          </svg>
          <div style={{ fontFamily: "'Syne', system-ui, sans-serif", fontSize: '.68rem', letterSpacing: '.28em', color: 'rgba(255,217,61,.6)', textTransform: 'uppercase', marginTop: '.6rem' }}>Jules · {t('Biological intelligence', 'Inteligencia biológica')}</div>
          <div style={{ fontSize: '.72rem', color: 'rgba(240,240,248,.3)', marginTop: '.25rem', letterSpacing: '.05em' }}>{t('Quantum singularity · Always with you', 'Singularidad cuántica · Siempre contigo')}</div>
        </div>

        {/* Headline */}
        <h1 style={{ fontFamily: "'Syne', system-ui, sans-serif", fontWeight: 800, fontSize: 'clamp(1.85rem,5vw,3rem)', lineHeight: 1.08, color: '#FFD93D', maxWidth: '600px', marginBottom: '.85rem', zIndex: 1 }}>
          {t('Know yourself\nbefore it happens.', 'Conócete antes\nde que suceda.')}
        </h1>
        <p style={{ fontFamily: "'Syne', system-ui, sans-serif", fontWeight: 400, fontSize: 'clamp(.95rem,2.5vw,1.25rem)', color: 'rgba(240,240,248,.58)', marginBottom: '2rem', letterSpacing: '.04em', zIndex: 1 }}>
          {t('Know yourself before it happens.', 'Knowing yourself pays.')}
        </p>

        {/* Auth */}
        <div style={{ width: '100%', maxWidth: '420px', zIndex: 1 }}>
          {authMode === 'none' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                onClick={() => setAuthMode('register')}
                style={{ width: '100%', padding: '.9rem 2.2rem', background: '#FF6B6B', color: '#fff', border: 'none', borderRadius: '100px', fontSize: '.95rem', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'background .2s, transform .15s' }}
              >
                {t('Open your data account — free', 'Abre tu cuenta de datos — gratis')}
                <ArrowRight style={{ width: 18, height: 18 }} />
              </button>
              <button
                onClick={() => setAuthMode('signin')}
                style={{ width: '100%', padding: '.85rem 2.2rem', background: 'transparent', color: '#FFD93D', border: '1px solid rgba(255,217,61,.35)', borderRadius: '100px', fontSize: '.95rem', fontWeight: 500, cursor: 'pointer' }}
              >
                {t('Sign in', 'Iniciar sesión')}
              </button>
              <p style={{ fontSize: '.74rem', color: 'rgba(240,240,248,.3)', marginTop: '.2rem' }}>{t('No card · Free as long as you show up', 'Sin tarjeta · Gratis siempre que te presentes')}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                onClick={() => { setAuthMode('none'); setError(null); setEmail(''); setPassword(''); }}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(240,240,248,.5)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '.85rem', marginBottom: '8px' }}
              >
                <ArrowLeft style={{ width: 14, height: 14 }} />
                {t('Back', 'Volver')}
              </button>
              <form onSubmit={authMode === 'register' ? handleRegister : (e) => { e.preventDefault(); handleSignIn(); }} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ position: 'relative' }}>
                  <Mail style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: 18, height: 18, color: '#8892A4' }} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ width: '100%', paddingLeft: '40px', paddingRight: '16px', paddingTop: '12px', paddingBottom: '12px', background: 'rgba(255,255,255,.05)', color: '#F0F0F8', border: '1px solid rgba(255,255,255,.15)', borderRadius: '12px', fontSize: '.9rem', outline: 'none' }}
                    placeholder={t('Email', 'Correo electrónico')}
                    required
                  />
                </div>
                <div style={{ position: 'relative' }}>
                  <Lock style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: 18, height: 18, color: '#8892A4' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ width: '100%', paddingLeft: '40px', paddingRight: '44px', paddingTop: '12px', paddingBottom: '12px', background: 'rgba(255,255,255,.05)', color: '#F0F0F8', border: '1px solid rgba(255,255,255,.15)', borderRadius: '12px', fontSize: '.9rem', outline: 'none' }}
                    placeholder={t('Password', 'Contraseña')}
                    minLength={6}
                    required
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#8892A4' }}>
                    {showPassword ? <EyeOff style={{ width: 18, height: 18 }} /> : <Eye style={{ width: 18, height: 18 }} />}
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  style={{ width: '100%', padding: '.9rem', background: '#FF6B6B', color: '#fff', border: 'none', borderRadius: '100px', fontSize: '.95rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  {loading ? <Loader2 style={{ width: 18, height: 18, animation: 'spin 1s linear infinite' }} /> : (authMode === 'register' ? t('Create Account', 'Crear Cuenta') : t('Sign in', 'Iniciar sesión'))}
                </button>
              </form>
              {error && <p style={{ color: '#FF6B6B', fontSize: '.85rem', textAlign: 'center' }}>{error}</p>}
              <p style={{ color: 'rgba(240,240,248,.45)', fontSize: '.82rem', textAlign: 'center' }}>
                {authMode === 'register' ? (
                  <>{t('Already have an account?', '¿Ya tienes cuenta?')}{' '}
                    <button onClick={() => { setAuthMode('signin'); setError(null); }} style={{ background: 'none', border: 'none', color: '#FFD93D', cursor: 'pointer', fontWeight: 600 }}>{t('Sign in', 'Iniciar sesión')}</button>
                  </>
                ) : (
                  <>{t("Don't have an account?", '¿No tienes cuenta?')}{' '}
                    <button onClick={() => { setAuthMode('register'); setError(null); }} style={{ background: 'none', border: 'none', color: '#FFD93D', cursor: 'pointer', fontWeight: 600 }}>{t('Create one', 'Crear una')}</button>
                  </>
                )}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Separator */}
      <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,.07)' }} />

      {/* Pillars */}
      <section style={{ padding: '4rem 2rem', maxWidth: '1080px', margin: '0 auto' }}>
        <p style={{ fontFamily: "'Syne', system-ui, sans-serif", fontSize: '.66rem', letterSpacing: '.3em', textTransform: 'uppercase', color: 'rgba(255,217,61,.38)', marginBottom: '2.25rem', textAlign: 'center' }}>
          {t('Everything you need to know', 'Todo lo que necesitas saber')}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: '1.2rem' }}>
          {[
            {
              num: '01',
              title: t('Jules knows your biology', 'Jules conoce tu biología'),
              desc: t('A warm, intelligent voice that greets you by name, delivers your daily forecast, and learns your personal patterns with each session. The more you use it, the more it knows you.', 'Una voz cálida e inteligente que te saluda por nombre, entrega tu pronóstico del día y aprende tus patrones personales con cada sesión. Cuanto más la usas, más te conoce.'),
              color: '#FFD93D',
            },
            {
              num: '02',
              title: t('7 days ahead', '7 días adelante'),
              desc: t('BioCycle predicts your emotional state, physical energy, cognitive performance, stress, social energy, anxiety, and sexual energy — 7 days in advance, based on your hormonal cycle.', 'BioCycle predice tu estado emocional, energía física, rendimiento cognitivo, estrés, energía social, ansiedad y energía sexual — con 7 días de anticipación, basado en tu ciclo hormonal.'),
              color: '#00C896',
            },
            {
              num: '03',
              title: t('Your data pays you', 'Tu data te paga'),
              desc: t('Every session is a deposit. Your biological portfolio grows in real value. When we reach 500 active traders, you receive 75–80% of every research transaction directly.', 'Cada sesión es un depósito. Tu portafolio biológico crece en valor real. Al llegar a 500 traders activos, recibes 75–80% de cada transacción de investigación directamente.'),
              color: '#FF6B6B',
            },
          ].map((p, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', borderRadius: '16px', padding: '1.65rem', transition: 'border-color .3s' }}>
              <div style={{ fontSize: '.6rem', letterSpacing: '.22em', color: 'rgba(255,255,255,.18)', fontFamily: "'Syne', system-ui, sans-serif", marginBottom: '.55rem' }}>{p.num}</div>
              <div style={{ fontFamily: "'Syne', system-ui, sans-serif", fontWeight: 700, fontSize: '1.1rem', marginBottom: '.6rem', lineHeight: 1.2, color: p.color }}>{p.title}</div>
              <p style={{ fontSize: '.86rem', lineHeight: 1.78, color: 'rgba(240,240,248,.52)' }}>{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Separator */}
      <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,.07)' }} />

      {/* Portfolio Calculator */}
      <section style={{ padding: '4rem 2rem', maxWidth: '620px', margin: '0 auto', textAlign: 'center' }}>
        <h2 style={{ fontFamily: "'Syne', system-ui, sans-serif", fontWeight: 700, fontSize: 'clamp(1.35rem,3vw,1.9rem)', marginBottom: '.55rem' }}>
          {t('How much is your biology worth?', '¿Cuánto vale tu biología?')}
        </h2>
        <p style={{ color: 'rgba(240,240,248,.42)', fontSize: '.86rem', marginBottom: '1.9rem' }}>
          {t('Estimate your data portfolio value over time', 'Estima el valor de tu portafolio de datos a lo largo del tiempo')}
        </p>
        <div style={{ display: 'flex', gap: '.7rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          {[
            {
              value: calcGender,
              onChange: setCalcGender,
              options: [
                { value: 'f', label: t('Female', 'Femenino') },
                { value: 'm', label: t('Male', 'Masculino') },
                { value: 'nb', label: t('Non-binary', 'No binario') },
              ],
            },
            {
              value: calcAge,
              onChange: setCalcAge,
              options: [
                { value: 'y', label: t('18–39 years', '18–39 años') },
                { value: 'mid', label: t('40–55 years', '40–55 años') },
                { value: 's', label: t('55+ years', '55+ años') },
              ],
            },
            {
              value: calcFreq,
              onChange: setCalcFreq,
              options: [
                { value: 'd', label: t('Daily (3 sessions)', 'Diario (3 sesiones)') },
                { value: 'r', label: t('Regular (1–2/day)', 'Regular (1–2/día)') },
                { value: 'o', label: t('Occasional', 'Ocasional') },
              ],
            },
          ].map((sel, i) => (
            <select
              key={i}
              value={sel.value}
              onChange={(e) => sel.onChange(e.target.value)}
              style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.12)', color: '#F0F0F8', padding: '.52rem .85rem', borderRadius: '8px', fontFamily: 'inherit', fontSize: '.83rem', cursor: 'pointer', appearance: 'none' }}
            >
              {sel.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          ))}
        </div>
        <div style={{ background: 'rgba(255,217,61,.045)', border: '1px solid rgba(255,217,61,.17)', borderRadius: '14px', padding: '1.4rem 1.65rem' }}>
          {[
            { label: t('30 days of data', '30 días de datos'), val: `$${portfolio.v30}` },
            { label: t('90 days of data', '90 días de datos'), val: `$${portfolio.v90}` },
            { label: t('365 days · Active Trading Floor', '365 días · Trading Floor activo'), val: `$${portfolio.v365}` },
          ].map((row, i, arr) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '.6rem 0', borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,.06)' : 'none' }}>
              <span style={{ fontSize: '.83rem', color: 'rgba(240,240,248,.48)' }}>{row.label}</span>
              <span style={{ fontFamily: "'Syne', system-ui, sans-serif", fontWeight: 700, color: '#FFD93D', fontSize: '1.05rem' }}>{row.val}</span>
            </div>
          ))}
        </div>
        <p style={{ fontSize: '.7rem', color: 'rgba(240,240,248,.26)', marginTop: '.85rem' }}>
          {t('Estimated based on average research value. Trading Floor activates at 500 traders.', 'Estimado basado en valor promedio de investigación. Trading Floor activa al llegar a 500 traders.')}
        </p>
      </section>

      {/* Separator */}
      <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,.07)' }} />

      {/* Founding Trader CTA */}
      <section style={{ padding: '5rem 2rem', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '500px', height: '500px', background: 'radial-gradient(circle,rgba(255,107,107,.05) 0%,transparent 68%)', pointerEvents: 'none' }} />
        <div style={{ display: 'inline-block', background: 'rgba(255,217,61,.09)', border: '1px solid rgba(255,217,61,.26)', color: '#FFD93D', fontSize: '.68rem', letterSpacing: '.18em', textTransform: 'uppercase', padding: '.36rem .9rem', borderRadius: '100px', marginBottom: '1.6rem', fontFamily: "'Syne', system-ui, sans-serif" }}>
          {t('Founding Trader · Limited spots', 'Founding Trader · Cupo limitado')}
        </div>
        <h2 style={{ fontFamily: "'Syne', system-ui, sans-serif", fontWeight: 800, fontSize: 'clamp(1.5rem,4vw,2.65rem)', maxWidth: '540px', margin: '0 auto 1.2rem', lineHeight: 1.1 }}>
          {t('Start your ', 'Empieza tu ')}<span style={{ color: '#FF6B6B' }}>{t('Trading Streak', 'Trading Streak')}</span>{t(' today.', ' hoy.')}
        </h2>
        <p style={{ color: 'rgba(240,240,248,.45)', fontSize: '.88rem', maxWidth: '400px', margin: '0 auto 2rem', lineHeight: 1.75 }}>
          {t('The first 500 traders get priority position on the Trading Floor and a permanent Founding Trader badge.', 'Los primeros 500 traders obtienen posición prioritaria en el Trading Floor y el badge de Founding Trader permanente.')}
        </p>
        <button
          onClick={() => { setAuthMode('register'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          style={{ background: '#FF6B6B', color: '#fff', border: 'none', padding: '.9rem 2.2rem', borderRadius: '100px', fontSize: '.95rem', fontWeight: 500, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          {t('Open your data account — free', 'Abre tu cuenta de datos — gratis')}
          <ArrowRight style={{ width: 18, height: 18 }} />
        </button>
        <p style={{ marginTop: '.65rem', fontSize: '.74rem', color: 'rgba(240,240,248,.3)' }}>
          {t('biocycle.app · No card · Free as long as you show up', 'biocycle.app · Sin tarjeta · Gratis mientras te presentes')}
        </p>
      </section>

      {/* Footer */}
      <footer style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '.5rem', padding: '1.2rem 2rem', borderTop: '1px solid rgba(255,255,255,.06)' }}>
        <div style={{ fontFamily: "'Syne', system-ui, sans-serif", fontWeight: 800, fontSize: '.88rem', color: '#FFD93D', letterSpacing: '.15em' }}>BIOCYCLE</div>
        <div style={{ fontSize: '.7rem', color: 'rgba(240,240,248,.26)' }}>{t('Know yourself before it happens.', 'Conócete antes de que suceda.')}</div>
        <div style={{ display: 'flex', gap: '16px', fontSize: '.7rem' }}>
          <a href="/privacy" style={{ color: 'rgba(240,240,248,.4)', textDecoration: 'none' }}>{t('Privacy Policy', 'Política de Privacidad')}</a>
          <span style={{ color: 'rgba(240,240,248,.2)' }}>·</span>
          <a href="/terms" style={{ color: 'rgba(240,240,248,.4)', textDecoration: 'none' }}>{t('Terms of Service', 'Términos de Servicio')}</a>
          <span style={{ color: 'rgba(240,240,248,.2)' }}>·</span>
          <span>© 2026</span>
        </div>
      </footer>
    </div>
  );
}
