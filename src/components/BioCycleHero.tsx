export function BioCycleHero() {
  return (
    <svg
      viewBox="0 0 200 300"
      className="w-[300px] md:w-[400px] h-auto"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="helixGradient" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#2D1B69" />
          <stop offset="50%" stopColor="#4A2C9A" />
          <stop offset="100%" stopColor="#FFD93D" />
        </linearGradient>
        <linearGradient id="seedGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#8B7355" />
          <stop offset="100%" stopColor="#5D4E37" />
        </linearGradient>
        <linearGradient id="stemGradient" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#2D1B69" />
          <stop offset="100%" stopColor="#4A2C9A" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="particleGlow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <ellipse
        cx="100"
        cy="280"
        rx="8"
        ry="5"
        fill="url(#seedGradient)"
        className="animate-seed"
      />

      <path
        d="M100 275 Q100 200 100 140"
        stroke="url(#stemGradient)"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        className="animate-stem"
      />

      <g className="animate-helix" filter="url(#glow)">
        <path
          d="M85 140 Q100 130 115 140 Q100 150 85 160 Q100 170 115 180 Q100 190 85 200 Q100 210 115 220 Q100 230 85 240"
          stroke="#2D1B69"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          className="animate-helix-strand-1"
        />
        <path
          d="M115 140 Q100 150 85 140 Q100 130 115 160 Q100 170 85 180 Q100 190 115 200 Q100 210 85 220 Q100 230 115 240"
          stroke="#FFD93D"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          className="animate-helix-strand-2"
        />

        <line x1="85" y1="140" x2="115" y2="140" stroke="#FFFFFF" strokeWidth="2" opacity="0.6" className="animate-connector" />
        <line x1="85" y1="160" x2="115" y2="160" stroke="#FFFFFF" strokeWidth="2" opacity="0.6" className="animate-connector" style={{ animationDelay: '0.2s' }} />
        <line x1="85" y1="180" x2="115" y2="180" stroke="#FFFFFF" strokeWidth="2" opacity="0.6" className="animate-connector" style={{ animationDelay: '0.4s' }} />
        <line x1="85" y1="200" x2="115" y2="200" stroke="#FFFFFF" strokeWidth="2" opacity="0.6" className="animate-connector" style={{ animationDelay: '0.6s' }} />
        <line x1="85" y1="220" x2="115" y2="220" stroke="#FFFFFF" strokeWidth="2" opacity="0.6" className="animate-connector" style={{ animationDelay: '0.8s' }} />
        <line x1="85" y1="240" x2="115" y2="240" stroke="#FFFFFF" strokeWidth="2" opacity="0.6" className="animate-connector" style={{ animationDelay: '1s' }} />
      </g>

      <g filter="url(#particleGlow)">
        <circle cx="90" cy="120" r="3" fill="#FFD93D" className="animate-particle-1" />
        <circle cx="110" cy="100" r="2" fill="#FFD93D" className="animate-particle-2" />
        <circle cx="95" cy="80" r="2.5" fill="#FFD93D" className="animate-particle-3" />
        <circle cx="105" cy="60" r="2" fill="#FFD93D" className="animate-particle-4" />
        <circle cx="100" cy="40" r="3" fill="#FFD93D" className="animate-particle-5" />
        <circle cx="88" cy="50" r="1.5" fill="#FFD93D" className="animate-particle-6" />
        <circle cx="112" cy="70" r="2" fill="#FFD93D" className="animate-particle-7" />
      </g>

      <style>{`
        .animate-seed {
          animation: seed 8s ease-in-out infinite;
          transform-origin: center bottom;
        }

        .animate-stem {
          stroke-dasharray: 140;
          stroke-dashoffset: 140;
          animation: stem 8s ease-in-out infinite;
        }

        .animate-helix {
          opacity: 0;
          animation: helix-appear 8s ease-in-out infinite;
        }

        .animate-helix-strand-1,
        .animate-helix-strand-2 {
          stroke-dasharray: 300;
          stroke-dashoffset: 300;
          animation: helix-draw 8s ease-in-out infinite;
        }

        .animate-helix-strand-2 {
          animation-delay: 0.3s;
        }

        .animate-connector {
          animation: connector-pulse 8s ease-in-out infinite;
        }

        .animate-particle-1 { animation: particle-float 8s ease-in-out infinite; animation-delay: 3s; }
        .animate-particle-2 { animation: particle-float 8s ease-in-out infinite; animation-delay: 3.3s; }
        .animate-particle-3 { animation: particle-float 8s ease-in-out infinite; animation-delay: 3.6s; }
        .animate-particle-4 { animation: particle-float 8s ease-in-out infinite; animation-delay: 3.9s; }
        .animate-particle-5 { animation: particle-float 8s ease-in-out infinite; animation-delay: 4.2s; }
        .animate-particle-6 { animation: particle-float 8s ease-in-out infinite; animation-delay: 4.5s; }
        .animate-particle-7 { animation: particle-float 8s ease-in-out infinite; animation-delay: 4.8s; }

        @keyframes seed {
          0%, 5% { transform: scale(1); opacity: 1; }
          15%, 100% { transform: scale(0.5); opacity: 0; }
        }

        @keyframes stem {
          0%, 5% { stroke-dashoffset: 140; }
          25% { stroke-dashoffset: 0; }
          85%, 100% { stroke-dashoffset: 0; opacity: 1; }
        }

        @keyframes helix-appear {
          0%, 20% { opacity: 0; }
          30%, 90% { opacity: 1; }
          100% { opacity: 0; }
        }

        @keyframes helix-draw {
          0%, 20% { stroke-dashoffset: 300; }
          50% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: 0; }
        }

        @keyframes connector-pulse {
          0%, 25% { opacity: 0; }
          35%, 85% { opacity: 0.6; }
          90%, 100% { opacity: 0; }
        }

        @keyframes particle-float {
          0%, 30% {
            opacity: 0;
            transform: translateY(0);
          }
          40% {
            opacity: 1;
          }
          80% {
            opacity: 0.8;
            transform: translateY(-30px);
          }
          100% {
            opacity: 0;
            transform: translateY(-50px);
          }
        }
      `}</style>
    </svg>
  );
}
