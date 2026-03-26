import { useState } from 'react';
import { supabase, Profile } from '../lib/supabase';
import { ArrowLeft, Lock, Loader2, Save, CheckCircle } from 'lucide-react';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const KNOWN_CONDITIONS = [
  'PCOS', 'Endometriosis', 'PMDD', 'Thyroid disorder',
  'Diabetes', 'Anxiety disorder', 'Depression', 'ADHD', 'None of the above',
];

const MEDICATIONS = [
  'Hormonal contraceptives', 'Antidepressants', 'Anxiety medication',
  'Thyroid medication', 'Metformin', 'Blood pressure medication',
  'Testosterone therapy', 'HRT', 'None',
];

const FAMILY_HISTORY = [
  'Heart disease', 'Diabetes', 'Hormonal cancers',
  'Thyroid disorders', 'Mental health conditions', 'None known',
];

const EXERCISE_FREQ_OPTIONS = ['Sedentary', '1-2x/week', '3-4x/week', '5+x/week'];
const EXERCISE_TYPE_OPTIONS = ['Cardio', 'Strength', 'Yoga/Pilates', 'Mixed', 'Sports', 'Walking'];
const DIET_OPTIONS = ['Omnivore', 'Vegetarian', 'Vegan', 'Keto', 'Paleo', 'Gluten-free', 'Other'];

interface ProfileEditScreenProps {
  profile: Profile;
  onBack: () => void;
  onSaved: () => void;
}

function SliderRow({
  label,
  value,
  min,
  max,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm font-bold text-[#2D1B69]">{value} {unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-[#2D1B69]"
      />
      <div className="flex justify-between text-xs text-gray-400 mt-0.5">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

function MultiSelect({
  options,
  selected,
  onChange,
  noneOption,
}: {
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
  noneOption?: string;
}) {
  const toggle = (opt: string) => {
    if (noneOption && opt === noneOption) {
      onChange([noneOption]);
      return;
    }
    const without = selected.filter(s => s !== noneOption);
    if (without.includes(opt)) {
      onChange(without.filter(s => s !== opt));
    } else {
      onChange([...without, opt]);
    }
  };
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button
          key={opt}
          type="button"
          onClick={() => toggle(opt)}
          className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
            selected.includes(opt)
              ? 'bg-[#2D1B69] text-white border-[#2D1B69]'
              : 'bg-white text-gray-700 border-gray-300 hover:border-[#2D1B69]'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function LockedField({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm font-semibold text-gray-500">{label}</span>
        <Lock className="w-3.5 h-3.5 text-gray-400" title="This field cannot be changed after registration" />
      </div>
      <p className="text-gray-900 font-medium">{value}</p>
      <p className="text-xs text-gray-400 mt-1">This field cannot be changed after registration</p>
    </div>
  );
}

export function ProfileEditScreen({ profile, onBack, onSaved }: ProfileEditScreenProps) {
  const isSpanish = profile.idioma === 'ES';

  const [heightCm, setHeightCm] = useState(profile.height_cm ?? 165);
  const [weightKg, setWeightKg] = useState(profile.weight_kg ?? 65);
  const [exerciseFreq, setExerciseFreq] = useState(profile.exercise_frequency ?? '');
  const [exerciseType, setExerciseType] = useState(profile.exercise_type ?? '');
  const [dietType, setDietType] = useState(profile.diet_type ?? '');
  const [sleepHours, setSleepHours] = useState(profile.sleep_hours ?? 7);
  const [caffeine, setCaffeine] = useState(profile.caffeine_per_day ?? 1);
  const [alcohol, setAlcohol] = useState(profile.alcohol_per_week ?? 0);
  const [conditions, setConditions] = useState<string[]>(profile.known_conditions ?? []);
  const [medications, setMedications] = useState<string[]>(profile.current_medications ?? []);
  const [familyHistory, setFamilyHistory] = useState<string[]>(profile.family_history ?? []);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bmi = parseFloat((weightKg / ((heightCm / 100) ** 2)).toFixed(1));

  const genderLabel = profile.genero === 'female'
    ? (isSpanish ? 'Mujer' : 'Female')
    : profile.genero === 'male'
    ? (isSpanish ? 'Hombre' : 'Male')
    : (profile.genero ?? '—');

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          height_cm: heightCm,
          weight_kg: weightKg,
          bmi,
          exercise_frequency: exerciseFreq || null,
          exercise_type: exerciseType || null,
          diet_type: dietType || null,
          sleep_hours: sleepHours,
          caffeine_per_day: caffeine,
          alcohol_per_week: alcohol,
          known_conditions: conditions.length > 0 ? conditions : null,
          current_medications: medications.length > 0 ? medications : null,
          family_history: familyHistory.length > 0 ? familyHistory : null,
        })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      setSaved(true);
      setTimeout(() => {
        onSaved();
      }, 1200);
    } catch (err) {
      setError(isSpanish ? 'Error al guardar. Intenta de nuevo.' : 'Error saving. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-[#2D1B69] px-5 pt-12 pb-6">
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={onBack}
            className="w-9 h-9 bg-white/15 rounded-full flex items-center justify-center hover:bg-white/25 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-xl font-bold text-white">
            {isSpanish ? 'Editar Perfil de Salud' : 'Edit Health Profile'}
          </h1>
        </div>
        <p className="text-white/60 text-sm ml-12">
          {isSpanish
            ? 'Completa tu perfil para aumentar tu valor como dato'
            : 'Complete your profile to increase your data value'}
        </p>
      </div>

      <div className="px-5 pt-5 space-y-5">
        {/* Locked fields */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            {isSpanish ? 'Campos bloqueados' : 'Locked fields'}
          </p>
          <div className="space-y-3">
            <LockedField
              label={isSpanish ? 'Género' : 'Gender'}
              value={genderLabel}
            />
            <LockedField
              label={isSpanish ? 'Fecha de nacimiento' : 'Date of birth'}
              value={profile.fecha_nacimiento}
            />
            <LockedField
              label={isSpanish ? 'Tipo de sangre' : 'Blood type'}
              value={profile.blood_type ?? (isSpanish ? 'No especificado' : 'Not specified')}
            />
          </div>
        </div>

        {/* Body measurements */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <p className="font-bold text-gray-900 mb-4">
            {isSpanish ? 'Medidas corporales' : 'Body measurements'}
          </p>
          <div className="space-y-4">
            <SliderRow
              label={isSpanish ? 'Altura' : 'Height'}
              value={heightCm}
              min={140}
              max={220}
              unit="cm"
              onChange={setHeightCm}
            />
            <SliderRow
              label={isSpanish ? 'Peso' : 'Weight'}
              value={weightKg}
              min={35}
              max={180}
              unit="kg"
              onChange={setWeightKg}
            />
            <div className="flex items-center justify-between p-3 bg-[#2D1B69]/5 rounded-xl">
              <span className="text-sm font-medium text-gray-700">BMI</span>
              <span className="text-sm font-bold text-[#2D1B69]">
                {bmi} — {bmi < 18.5 ? (isSpanish ? 'Bajo peso' : 'Underweight') : bmi < 25 ? (isSpanish ? 'Normal' : 'Normal') : bmi < 30 ? (isSpanish ? 'Sobrepeso' : 'Overweight') : (isSpanish ? 'Obesidad' : 'Obese')}
              </span>
            </div>
          </div>
        </div>

        {/* Exercise */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <p className="font-bold text-gray-900 mb-4">
            {isSpanish ? 'Ejercicio' : 'Exercise'}
          </p>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">
                {isSpanish ? 'Frecuencia' : 'Frequency'}
              </p>
              <div className="flex flex-wrap gap-2">
                {EXERCISE_FREQ_OPTIONS.map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setExerciseFreq(opt === exerciseFreq ? '' : opt)}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                      exerciseFreq === opt
                        ? 'bg-[#2D1B69] text-white border-[#2D1B69]'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-[#2D1B69]'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">
                {isSpanish ? 'Tipo de ejercicio' : 'Exercise type'}
              </p>
              <div className="flex flex-wrap gap-2">
                {EXERCISE_TYPE_OPTIONS.map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setExerciseType(opt === exerciseType ? '' : opt)}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                      exerciseType === opt
                        ? 'bg-[#2D1B69] text-white border-[#2D1B69]'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-[#2D1B69]'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Diet */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <p className="font-bold text-gray-900 mb-3">
            {isSpanish ? 'Dieta' : 'Diet'}
          </p>
          <div className="flex flex-wrap gap-2">
            {DIET_OPTIONS.map(opt => (
              <button
                key={opt}
                type="button"
                onClick={() => setDietType(opt === dietType ? '' : opt)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                  dietType === opt
                    ? 'bg-[#2D1B69] text-white border-[#2D1B69]'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-[#2D1B69]'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Lifestyle sliders */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <p className="font-bold text-gray-900 mb-4">
            {isSpanish ? 'Estilo de vida' : 'Lifestyle'}
          </p>
          <div className="space-y-4">
            <SliderRow
              label={isSpanish ? 'Horas de sueño' : 'Sleep hours'}
              value={sleepHours}
              min={4}
              max={10}
              unit="hrs"
              onChange={setSleepHours}
            />
            <SliderRow
              label={isSpanish ? 'Cafeína al día' : 'Caffeine per day'}
              value={caffeine}
              min={0}
              max={6}
              unit={isSpanish ? 'tazas' : 'cups'}
              onChange={setCaffeine}
            />
            <SliderRow
              label={isSpanish ? 'Alcohol por semana' : 'Alcohol per week'}
              value={alcohol}
              min={0}
              max={14}
              unit={isSpanish ? 'bebidas' : 'drinks'}
              onChange={setAlcohol}
            />
          </div>
        </div>

        {/* Known conditions */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <p className="font-bold text-gray-900 mb-3">
            {isSpanish ? 'Condiciones conocidas' : 'Known conditions'}
          </p>
          <MultiSelect
            options={KNOWN_CONDITIONS}
            selected={conditions}
            onChange={setConditions}
            noneOption="None of the above"
          />
        </div>

        {/* Medications */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <p className="font-bold text-gray-900 mb-3">
            {isSpanish ? 'Medicamentos actuales' : 'Current medications'}
          </p>
          <MultiSelect
            options={MEDICATIONS}
            selected={medications}
            onChange={setMedications}
            noneOption="None"
          />
        </div>

        {/* Family history */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <p className="font-bold text-gray-900 mb-3">
            {isSpanish ? 'Historia familiar' : 'Family history'}
          </p>
          <MultiSelect
            options={FAMILY_HISTORY}
            selected={familyHistory}
            onChange={setFamilyHistory}
            noneOption="None known"
          />
        </div>

        {error && (
          <p className="text-red-500 text-sm text-center">{error}</p>
        )}

        <button
          onClick={handleSave}
          disabled={saving || saved}
          className="w-full flex items-center justify-center gap-2 py-4 bg-[#2D1B69] text-white font-bold rounded-2xl text-base disabled:opacity-70 transition-all"
        >
          {saved ? (
            <>
              <CheckCircle className="w-5 h-5" />
              {isSpanish ? '¡Guardado!' : 'Saved!'}
            </>
          ) : saving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Save className="w-5 h-5" />
              {isSpanish ? 'Guardar cambios' : 'Save changes'}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
