import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { ArrowRight, ArrowLeft, Loader2, Calendar, User, Heart, AlertCircle } from 'lucide-react';

type SetupStep = 'name' | 'gender' | 'birthdate' | 'cycle';

interface SetupScreenProps {
  userId: string;
  onComplete: () => void;
}

export function SetupScreen({ userId, onComplete }: SetupScreenProps) {
  const [step, setStep] = useState<SetupStep>('name');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [birthdateError, setBirthdateError] = useState(false);

  const [nombre, setNombre] = useState('');
  const [genero, setGenero] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [cycleLength, setCycleLength] = useState(28);
  const [lastPeriodDate, setLastPeriodDate] = useState('');

  const steps: SetupStep[] = ['name', 'gender', 'birthdate', 'cycle'];
  const currentIndex = steps.indexOf(step);
  const showCycleStep = genero === 'femenino';

  const nextStep = () => {
    if (step === 'name') setStep('gender');
    else if (step === 'gender') setStep('birthdate');
    else if (step === 'birthdate') {
      if (!fechaNacimiento) {
        setBirthdateError(true);
        return;
      }
      setBirthdateError(false);
      if (showCycleStep) setStep('cycle');
      else handleSubmit();
    } else if (step === 'cycle') handleSubmit();
  };

  const prevStep = () => {
    setBirthdateError(false);
    if (step === 'gender') setStep('name');
    else if (step === 'birthdate') setStep('gender');
    else if (step === 'cycle') setStep('birthdate');
  };

  const calculateAge = (birthDate: string): number => {
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          nombre,
          genero,
          fecha_nacimiento: fechaNacimiento,
          cycle_length: cycleLength,
          last_period_date: lastPeriodDate || null,
        });

      if (profileError) throw profileError;
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
      setLoading(false);
    }
  };

  const canProceed = () => {
    if (step === 'name') return nombre.trim().length >= 2;
    if (step === 'gender') return genero !== '';
    if (step === 'birthdate') return fechaNacimiento !== '';
    if (step === 'cycle') return true;
    return false;
  };

  const totalSteps = showCycleStep ? 4 : 3;
  const displayIndex = step === 'cycle' ? 4 : currentIndex + 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-amber-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Configuremos tu perfil</h1>
          <p className="text-gray-600 mt-2">Paso {displayIndex} de {totalSteps}</p>
          <div className="flex gap-2 justify-center mt-4">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-2 w-8 rounded-full transition-colors ${
                  i < displayIndex ? 'bg-rose-400' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          {step === 'name' && (
            <div className="space-y-4">
              <div className="w-16 h-16 bg-rose-100 rounded-full mx-auto flex items-center justify-center">
                <User className="w-8 h-8 text-rose-500" />
              </div>
              <h2 className="text-xl font-semibold text-center text-gray-900">
                Como te llamas?
              </h2>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-400 focus:border-transparent outline-none transition-all text-center text-lg"
                placeholder="Tu nombre"
                autoFocus
              />
            </div>
          )}

          {step === 'gender' && (
            <div className="space-y-4">
              <div className="w-16 h-16 bg-amber-100 rounded-full mx-auto flex items-center justify-center">
                <Heart className="w-8 h-8 text-amber-500" />
              </div>
              <h2 className="text-xl font-semibold text-center text-gray-900">
                Cual es tu genero?
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'femenino', label: 'Femenino', icon: '\u2640' },
                  { value: 'masculino', label: 'Masculino', icon: '\u2642' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setGenero(option.value)}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      genero === option.value
                        ? 'border-rose-400 bg-rose-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-2xl block mb-1">{option.icon}</span>
                    <span className="font-medium text-gray-700">{option.label}</span>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setGenero('prefiero_no_decir')}
                className={`w-full p-3 rounded-xl border-2 transition-all ${
                  genero === 'prefiero_no_decir'
                    ? 'border-rose-400 bg-rose-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="font-medium text-gray-700">Prefiero no decir</span>
              </button>
            </div>
          )}

          {step === 'birthdate' && (
            <div className="space-y-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full mx-auto flex items-center justify-center">
                <Calendar className="w-8 h-8 text-blue-500" />
              </div>
              <h2 className="text-xl font-semibold text-center text-gray-900">
                Tu fecha de nacimiento
              </h2>
              <p className="text-sm text-gray-600 text-center">
                Tu fecha de nacimiento activa tu pronostico biologico
              </p>
              <input
                type="date"
                value={fechaNacimiento}
                onChange={(e) => {
                  setFechaNacimiento(e.target.value);
                  setBirthdateError(false);
                }}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-rose-400 focus:border-transparent outline-none transition-all text-center ${
                  birthdateError ? 'border-red-400 bg-red-50' : 'border-gray-200'
                }`}
                max={new Date().toISOString().split('T')[0]}
              />

              {birthdateError && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-xl">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-600">
                    La fecha de nacimiento es necesaria para calcular tus ciclos y elegibilidad para investigacion.
                  </p>
                </div>
              )}
            </div>
          )}

          {step === 'cycle' && (
            <div className="space-y-4">
              <div className="w-16 h-16 bg-rose-100 rounded-full mx-auto flex items-center justify-center">
                <span className="text-2xl">{'\uD83C\uDF19'}</span>
              </div>
              <h2 className="text-xl font-semibold text-center text-gray-900">
                Tu ciclo menstrual
              </h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duracion promedio del ciclo
                </label>
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={() => setCycleLength(Math.max(21, cycleLength - 1))}
                    className="w-10 h-10 rounded-full border border-gray-200 hover:bg-gray-50"
                  >
                    -
                  </button>
                  <span className="text-2xl font-bold text-rose-500 w-16 text-center">
                    {cycleLength}
                  </span>
                  <button
                    onClick={() => setCycleLength(Math.min(35, cycleLength + 1))}
                    className="w-10 h-10 rounded-full border border-gray-200 hover:bg-gray-50"
                  >
                    +
                  </button>
                  <span className="text-gray-500">dias</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Inicio de tu ultimo periodo
                </label>
                <input
                  type="date"
                  value={lastPeriodDate}
                  onChange={(e) => setLastPeriodDate(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-400 focus:border-transparent outline-none transition-all text-center"
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>
          )}

          <div className="flex gap-3 mt-6">
            {currentIndex > 0 && (
              <button
                onClick={prevStep}
                className="flex-1 py-3 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-5 h-5" />
                Atras
              </button>
            )}
            <button
              onClick={nextStep}
              disabled={!canProceed() || loading}
              className="flex-1 py-3 bg-gradient-to-r from-rose-400 to-amber-400 text-white font-semibold rounded-xl hover:from-rose-500 hover:to-amber-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {(step === 'birthdate' && !showCycleStep) || step === 'cycle'
                    ? 'Completar'
                    : 'Siguiente'}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
