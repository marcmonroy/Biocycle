import { useEffect } from 'react';

export type QuantumState = 'idle' | 'listening' | 'speaking' | 'thinking';

interface QuantumDNAProps {
  size?: number;
  state?: QuantumState;
}

const QDNA_STYLE_ID = 'bc-quantum-dna-styles';

const QDNA_STYLES = `
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
/* State-based DNA cloud speed */
.bc-s-idle    .bc-qDna { animation-duration: 9s; }
.bc-s-listening .bc-qDna { animation-duration: 3.5s; }
.bc-s-speaking  .bc-qDna { animation-duration: 6s; }
.bc-s-thinking  .bc-qDna { animation-duration: 18s; }
`;

// Wave colors per state: [gold-wave, coral-wave, green-wave]
const WAVE_COLORS: Record<QuantumState, [string, string, string]> = {
  idle:      ['rgba(255,217,61,.65)', 'rgba(255,107,107,.55)', 'rgba(0,200,150,.45)'],
  listening: ['rgba(255,107,107,.8)', 'rgba(255,107,107,.65)', 'rgba(255,107,107,.5)'],
  speaking:  ['rgba(255,217,61,.85)', 'rgba(255,217,61,.65)', 'rgba(255,217,61,.45)'],
  thinking:  ['rgba(0,200,150,.7)',   'rgba(0,200,150,.55)',  'rgba(0,200,150,.4)'],
};

export function QuantumDNA({ size = 80, state = 'idle' }: QuantumDNAProps) {
  useEffect(() => {
    if (document.getElementById(QDNA_STYLE_ID)) return;
    const tag = document.createElement('style');
    tag.id = QDNA_STYLE_ID;
    tag.textContent = QDNA_STYLES;
    document.head.appendChild(tag);
  }, []);

  const [w1, w2, w3] = WAVE_COLORS[state];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 300 300"
      xmlns="http://www.w3.org/2000/svg"
      className={`bc-s-${state}`}
      style={{ display: 'block', flexShrink: 0 }}
    >
      <circle cx="150" cy="150" r="148" fill="#060612"/>
      <ellipse cx="150" cy="150" rx="72" ry="132" fill="rgba(0,200,150,.018)"/>
      <ellipse cx="150" cy="150" rx="55" ry="110" fill="rgba(255,107,107,.015)"/>

      {/* Expansion waves — color driven by state */}
      <circle cx="150" cy="150" r="2" fill="none" stroke={w1} strokeWidth="1.2">
        <animate attributeName="r" values="2;140" dur="4.5s" repeatCount="indefinite" begin="0s"/>
        <animate attributeName="opacity" values=".7;0" dur="4.5s" repeatCount="indefinite" begin="0s"/>
        <animate attributeName="stroke-width" values="1.5;.1" dur="4.5s" repeatCount="indefinite" begin="0s"/>
      </circle>
      <circle cx="150" cy="150" r="2" fill="none" stroke={w2} strokeWidth="1">
        <animate attributeName="r" values="2;140" dur="4.5s" repeatCount="indefinite" begin="1.5s"/>
        <animate attributeName="opacity" values=".6;0" dur="4.5s" repeatCount="indefinite" begin="1.5s"/>
        <animate attributeName="stroke-width" values="1.2;.1" dur="4.5s" repeatCount="indefinite" begin="1.5s"/>
      </circle>
      <circle cx="150" cy="150" r="2" fill="none" stroke={w3} strokeWidth="1">
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

      {/* Central singularity — always solid */}
      <circle cx="150" cy="150" r="14" fill="rgba(255,217,61,.12)" className="bc-singP"/>
      <circle cx="150" cy="150" r="8" fill="rgba(255,217,61,.3)" className="bc-singP"/>
      <circle cx="150" cy="150" r="4" fill="white" opacity=".95"/>
      <circle cx="150" cy="150" r="2" fill="white"/>
    </svg>
  );
}
