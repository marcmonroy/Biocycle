// Animated quantum DNA helix — colorful rotating SVG/CSS
// States: idle | listening | thinking | speaking

export type QuantumState = 'idle' | 'listening' | 'thinking' | 'speaking';

interface Props {
  size?: number;
  state?: QuantumState;
}

const STYLES = `
@keyframes qd-rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes qd-pulse  { 0%,100% { opacity:.55; } 50% { opacity:1; } }
@keyframes qd-speak  { 0%,100% { transform:scale(1); opacity:.7; } 40% { transform:scale(1.08); opacity:1; } }
@keyframes qd-think  { 0%,100% { transform:rotate(0deg) scale(1); } 50% { transform:rotate(180deg) scale(1.05); } }
@keyframes qd-listen { 0%,100% { transform:scale(1); box-shadow:0 0 0 0 rgba(255,107,107,.5); } 50% { transform:scale(1.06); box-shadow:0 0 28px 8px rgba(255,107,107,.35); } }
`;

export function QuantumDNA({ size = 64, state = 'idle' }: Props) {
  const r = size / 2;
  const cx = r;
  const cy = r;

  // Colors
  const colors = {
    idle:      ['#FFD93D', '#7B61FF', '#00C896', '#FF6B6B'],
    listening: ['#FF6B6B', '#FF9A9A', '#FF6B6B', '#FF9A9A'],
    thinking:  ['#7B61FF', '#A89DFF', '#7B61FF', '#A89DFF'],
    speaking:  ['#00C896', '#FFD93D', '#00C896', '#FFD93D'],
  };
  const c = colors[state];

  const animation = {
    idle:      'qd-pulse 3.5s ease-in-out infinite',
    listening: 'qd-listen 1s ease-in-out infinite',
    thinking:  'qd-think 1.5s ease-in-out infinite',
    speaking:  'qd-speak 0.75s ease-in-out infinite',
  }[state];

  const rotateAnim = state === 'thinking'
    ? 'qd-rotate 2s linear infinite'
    : 'qd-rotate 8s linear infinite';

  const strandR = r * 0.72;
  const dotR = size * 0.055;

  // Generate helix strands as dots on a rotating ring
  const dots1 = Array.from({ length: 6 }, (_, i) => {
    const angle = (i / 6) * Math.PI * 2;
    return {
      x: cx + strandR * Math.cos(angle),
      y: cy + strandR * Math.sin(angle),
      color: c[i % 2],
    };
  });
  const dots2 = Array.from({ length: 6 }, (_, i) => {
    const angle = (i / 6) * Math.PI * 2 + Math.PI / 6;
    return {
      x: cx + strandR * 0.55 * Math.cos(angle),
      y: cy + strandR * 0.55 * Math.sin(angle),
      color: c[(i + 2) % 4],
    };
  });

  return (
    <>
      <style>{STYLES}</style>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: 'radial-gradient(circle at 40% 35%, #1A1A3E 0%, #0A0A1A 100%)',
          boxShadow: state === 'idle'
            ? '0 0 32px 4px rgba(123,97,255,0.18), 0 0 0 1px rgba(255,217,61,0.12)'
            : state === 'listening'
            ? '0 0 40px 8px rgba(255,107,107,0.35)'
            : state === 'thinking'
            ? '0 0 40px 8px rgba(123,97,255,0.45)'
            : '0 0 40px 8px rgba(0,200,150,0.4)',
          animation,
          position: 'relative',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ animation: rotateAnim, position: 'absolute', inset: 0 }}
        >
          {/* Outer ring */}
          <circle cx={cx} cy={cy} r={strandR} fill="none" stroke="rgba(255,217,61,0.12)" strokeWidth="1" />
          {/* Inner ring */}
          <circle cx={cx} cy={cy} r={strandR * 0.55} fill="none" stroke="rgba(123,97,255,0.12)" strokeWidth="1" />
          {/* Connecting lines */}
          {dots1.map((d1, i) => {
            const d2 = dots2[i];
            return (
              <line key={i} x1={d1.x} y1={d1.y} x2={d2.x} y2={d2.y}
                stroke={c[i % 4]} strokeWidth="0.8" strokeOpacity="0.35" />
            );
          })}
          {/* Outer dots */}
          {dots1.map((d, i) => (
            <circle key={`o${i}`} cx={d.x} cy={d.y} r={dotR} fill={d.color} fillOpacity="0.85" />
          ))}
          {/* Inner dots */}
          {dots2.map((d, i) => (
            <circle key={`i${i}`} cx={d.x} cy={d.y} r={dotR * 0.7} fill={d.color} fillOpacity="0.65" />
          ))}
        </svg>
        {/* Center glyph */}
        <svg width={size * 0.3} height={size * 0.3} viewBox="0 0 24 24" style={{ position: 'relative', zIndex: 1 }}>
          <path d="M12 2C8 2 5 6 5 12s3 10 7 10 7-4 7-10S16 2 12 2z"
            fill="none" stroke={c[0]} strokeWidth="1.5" strokeOpacity="0.7" />
          <line x1="12" y1="4" x2="12" y2="20" stroke={c[1]} strokeWidth="1" strokeOpacity="0.5" />
          <line x1="4" y1="12" x2="20" y2="12" stroke={c[2]} strokeWidth="1" strokeOpacity="0.5" />
        </svg>
      </div>
    </>
  );
}
