import { ArrowRight } from 'lucide-react';

interface AwakeningScreenProps {
  onContinue: () => void;
}

export function AwakeningScreen({ onContinue }: AwakeningScreenProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#2D1B69] via-[#3D2B79] to-[#1D0B49] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-32 h-32 bg-gradient-to-br from-[#FF6B6B] to-[#FFD93D] rounded-full flex items-center justify-center mb-8 shadow-2xl shadow-[#FF6B6B]/30 animate-pulse">
        <span className="text-5xl font-bold text-white">B</span>
      </div>

      <h1 className="text-4xl font-bold text-white mb-4">BioCycle</h1>
      <p className="text-xl text-[#FFD93D] font-medium mb-2">Viva · Sana · Amada</p>

      <p className="text-white/70 mt-8 max-w-xs leading-relaxed">
        Descubre tu ritmo natural. Sincroniza tu vida con tu biologia para vivir mejor cada dia.
      </p>

      <button
        onClick={onContinue}
        className="mt-12 px-8 py-4 bg-gradient-to-r from-[#FF6B6B] to-[#FFD93D] text-white font-bold rounded-full flex items-center gap-3 hover:opacity-90 transition-opacity shadow-lg shadow-[#FF6B6B]/30"
      >
        Comenzar
        <ArrowRight className="w-5 h-5" />
      </button>

      <div className="mt-16 flex gap-2">
        <div className="w-2 h-2 rounded-full bg-[#FFD93D]" />
        <div className="w-2 h-2 rounded-full bg-white/30" />
        <div className="w-2 h-2 rounded-full bg-white/30" />
      </div>
    </div>
  );
}
