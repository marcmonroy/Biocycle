import { useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Profile } from '../lib/supabase';
import { getCurrentPhase, getDaysOfData } from '../lib/phaseEngine';

interface Props {
  profile: Profile;
  onProfileUpdate: (updated: Profile) => void;
  onLogout: () => void;
}

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const EXERCISE_OPTIONS_EN = ['None', 'Light (1–2×/wk)', 'Moderate (3–4×/wk)', 'Heavy (5+×/wk)'];
const EXERCISE_OPTIONS_ES = ['Ninguno', 'Ligero (1–2×/sem)', 'Moderado (3–4×/sem)', 'Intenso (5+×/sem)'];

const CONDITION_OPTIONS = [
  'None', 'Diabetes', 'Hypertension', 'Thyroid disorder', 'PCOS',
  'Endometriosis', 'Depression', 'Anxiety', 'Chronic pain',
  'Sleep disorder', 'Autoimmune condition', 'Heart condition', 'Other',
];
const MEDICATION_OPTIONS = [
  'None', 'Hormonal contraceptives', 'HRT', 'Antidepressants',
  'Anti-anxiety', 'Thyroid medication', 'Blood pressure medication',
  'Diabetes medication', 'Pain medication', 'Sleep medication',
  'Vitamins/Supplements', 'Other',
];

function parseMultiSelect(val: string | null): string[] {
  if (!val) return [];
  return val.split(',').map(s => s.trim()).filter(Boolean);
}

export function ProfileScreen({ profile, onProfileUpdate, onLogout }: Props) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showPicardiaConfirm, setShowPicardiaConfirm] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Editable fields
  const [picardia, setPicardia] = useState(profile.picardia_mode);
  const [idioma, setIdioma] = useState<'EN' | 'ES'>(profile.idioma ?? 'EN');
  const [height, setHeight] = useState(String(profile.height ?? ''));
  const [weight, setWeight] = useState(String(profile.weight ?? ''));
  const [exercise, setExercise] = useState(profile.exercise_frequency ?? '');
  const [bloodType, setBloodType] = useState(profile.blood_type ?? '');
  const [conditions, setConditions] = useState<string[]>(() => parseMultiSelect(profile.medical_conditions));
  const [medications, setMedications] = useState<string[]>(() => parseMultiSelect(profile.medications));

  const phase = getCurrentPhase(profile);
  const daysOfData = getDaysOfData(profile);
  const phaseLabel = idioma === 'ES' ? phase.displayNameES : phase.displayName;
  const phaseDesc = idioma === 'ES' ? phase.descriptionES : phase.description;

  const exerciseOptions = idioma === 'ES' ? EXERCISE_OPTIONS_ES : EXERCISE_OPTIONS_EN;

  function toggleCondition(val: string) {
    if (val === 'None') { setConditions(['None']); return; }
    setConditions(prev => {
      const without = prev.filter(v => v !== 'None');
      return without.includes(val) ? without.filter(v => v !== val) : [...without, val];
    });
  }

  function toggleMedication(val: string) {
    if (val === 'None') { setMedications(['None']); return; }
    setMedications(prev => {
      const without = prev.filter(v => v !== 'None');
      return without.includes(val) ? without.filter(v => v !== val) : [...without, val];
    });
  }

  async function saveProfile() {
    setSaving(true);
    const updates: Partial<Profile> = {
      picardia_mode: picardia,
      idioma,
      height: height ? parseFloat(height) : null,
      weight: weight ? parseFloat(weight) : null,
      exercise_frequency: exercise || null,
      blood_type: bloodType || null,
      medical_conditions: conditions.length ? conditions.join(', ') : null,
      medications: medications.length ? medications.join(', ') : null,
    };

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', profile.id)
      .select()
      .single();

    setSaving(false);
    if (!error && data) {
      onProfileUpdate(data as Profile);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    onLogout();
  }

  const L = (en: string, es: string) => idioma === 'ES' ? es : en;

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0A0A1A',
      fontFamily: 'Inter, system-ui, sans-serif',
      paddingBottom: 100,
      overflowY: 'auto',
    }}>
      {/* Header */}
      <div style={{
        width: '100%',
        maxWidth: 430,
        margin: '0 auto',
        padding: '52px 24px 24px',
      }}>
        <h1 style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '1.2rem',
          fontWeight: 700,
          color: 'white',
          margin: '0 0 4px',
        }}>
          {profile.nombre ?? 'Profile'}
        </h1>
        <p style={{ color: '#4A5568', fontSize: 12, margin: 0 }}>
          {daysOfData} {L('days of data', 'días de datos')}
        </p>
      </div>

      {/* Phase card */}
      <div style={{
        width: '100%',
        maxWidth: 430,
        margin: '0 auto',
        padding: '0 24px 24px',
      }}>
        <div style={{
          background: 'rgba(123,97,255,0.08)',
          border: '1px solid rgba(123,97,255,0.2)',
          borderRadius: 16,
          padding: '20px',
          display: 'flex',
          gap: 16,
          alignItems: 'center',
        }}>
          <span style={{ fontSize: 36 }}>{phase.emoji}</span>
          <div>
            <div style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '0.95rem',
              fontWeight: 700,
              color: 'white',
              marginBottom: 4,
            }}>
              {phaseLabel}
            </div>
            <div style={{ color: '#4A5568', fontSize: 12, lineHeight: 1.5 }}>
              {phaseDesc}
            </div>
          </div>
        </div>
      </div>

      <div style={{ width: '100%', maxWidth: 430, margin: '0 auto', height: 1, background: 'rgba(255,255,255,0.05)' }} />

      {/* Preferences section */}
      <Section label={L('Preferences', 'Preferencias')}>
        {/* Language toggle */}
        <FieldRow label={L('Language', 'Idioma')}>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['EN', 'ES'] as const).map(lang => (
              <button
                key={lang}
                onClick={() => setIdioma(lang)}
                style={{
                  background: idioma === lang ? 'rgba(255,107,107,0.15)' : 'rgba(255,255,255,0.04)',
                  border: idioma === lang ? '1px solid rgba(255,107,107,0.4)' : '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8,
                  padding: '6px 16px',
                  color: idioma === lang ? '#FF6B6B' : '#4A5568',
                  fontSize: 13,
                  fontWeight: idioma === lang ? 600 : 400,
                  cursor: 'pointer',
                  fontFamily: 'Inter, system-ui, sans-serif',
                }}
              >
                {lang}
              </button>
            ))}
          </div>
        </FieldRow>

        {/* Picardia mode */}
        <FieldRow label={L('Picardia Mode', 'Modo Picardía')} sublabel={L('More playful, flirtatious tone from Jules', 'Tono más juguetón y coqueto de Jules')}>
          <button
            onClick={() => {
              if (!picardia) {
                setShowPicardiaConfirm(true);
              } else {
                setPicardia(false);
              }
            }}
            style={{
              width: 48,
              height: 28,
              borderRadius: 14,
              background: picardia ? '#FF6B6B' : 'rgba(255,255,255,0.1)',
              border: 'none',
              cursor: 'pointer',
              position: 'relative',
              transition: 'background 0.2s',
              flexShrink: 0,
            }}
          >
            <div style={{
              width: 22,
              height: 22,
              borderRadius: '50%',
              background: 'white',
              position: 'absolute',
              top: 3,
              left: picardia ? 23 : 3,
              transition: 'left 0.2s',
              boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
            }} />
          </button>
        </FieldRow>
      </Section>

      {/* Picardia confirm modal */}
      {showPicardiaConfirm && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: 24,
        }}>
          <div style={{
            background: '#12122A',
            border: '1px solid rgba(255,107,107,0.3)',
            borderRadius: 20,
            padding: 28,
            maxWidth: 360,
            width: '100%',
          }}>
            <h3 style={{
              fontFamily: 'JetBrains Mono, monospace',
              color: 'white',
              fontSize: '1rem',
              margin: '0 0 12px',
            }}>
              {L('Enable Picardia Mode?', '¿Activar Modo Picardía?')}
            </h3>
            <p style={{ color: '#4A5568', fontSize: 13, lineHeight: 1.6, margin: '0 0 20px' }}>
              {L(
                'Jules will use a more playful, flirtatious tone. This is adult content (18+). You can turn it off at any time.',
                'Jules usará un tono más juguetón y coqueto. Este es contenido para adultos (+18). Puedes desactivarlo en cualquier momento.'
              )}
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowPicardiaConfirm(false)}
                style={{
                  flex: 1,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 10,
                  padding: '12px',
                  color: '#4A5568',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontFamily: 'Inter, system-ui, sans-serif',
                }}
              >
                {L('Cancel', 'Cancelar')}
              </button>
              <button
                onClick={() => {
                  setPicardia(true);
                  setShowPicardiaConfirm(false);
                }}
                style={{
                  flex: 1,
                  background: 'rgba(255,107,107,0.15)',
                  border: '1px solid rgba(255,107,107,0.35)',
                  borderRadius: 10,
                  padding: '12px',
                  color: '#FF6B6B',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 600,
                  fontFamily: 'Inter, system-ui, sans-serif',
                }}
              >
                {L('Yes, enable', 'Sí, activar')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Health data section */}
      <Section label={L('Health Data', 'Datos de Salud')}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <FieldLabel>{L('Height (cm)', 'Altura (cm)')}</FieldLabel>
            <input
              type="number"
              value={height}
              onChange={e => setHeight(e.target.value)}
              placeholder="170"
              style={inputStyle}
            />
          </div>
          <div>
            <FieldLabel>{L('Weight (kg)', 'Peso (kg)')}</FieldLabel>
            <input
              type="number"
              value={weight}
              onChange={e => setWeight(e.target.value)}
              placeholder="70"
              style={inputStyle}
            />
          </div>
        </div>

        <div>
          <FieldLabel>{L('Exercise frequency', 'Frecuencia de ejercicio')}</FieldLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {exerciseOptions.map(opt => (
              <button
                key={opt}
                onClick={() => setExercise(opt)}
                style={{
                  background: exercise === opt ? 'rgba(0,200,150,0.12)' : 'rgba(255,255,255,0.04)',
                  border: exercise === opt ? '1px solid rgba(0,200,150,0.3)' : '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 8,
                  padding: '6px 12px',
                  color: exercise === opt ? '#00C896' : '#4A5568',
                  fontSize: 12,
                  cursor: 'pointer',
                  fontFamily: 'Inter, system-ui, sans-serif',
                }}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        <div>
          <FieldLabel>{L('Blood type', 'Tipo de sangre')}</FieldLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {BLOOD_TYPES.map(bt => (
              <button
                key={bt}
                onClick={() => setBloodType(bt)}
                style={{
                  background: bloodType === bt ? 'rgba(255,107,107,0.12)' : 'rgba(255,255,255,0.04)',
                  border: bloodType === bt ? '1px solid rgba(255,107,107,0.3)' : '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 8,
                  padding: '6px 12px',
                  color: bloodType === bt ? '#FF6B6B' : '#4A5568',
                  fontSize: 12,
                  cursor: 'pointer',
                  fontFamily: 'Inter, system-ui, sans-serif',
                }}
              >
                {bt}
              </button>
            ))}
          </div>
        </div>

        <div>
          <FieldLabel>{L('Medical conditions (optional)', 'Condiciones médicas (opcional)')}</FieldLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {CONDITION_OPTIONS.map(opt => {
              const active = conditions.includes(opt);
              return (
                <button
                  key={opt}
                  onClick={() => toggleCondition(opt)}
                  style={{
                    background: active ? 'rgba(255,107,107,0.15)' : 'rgba(255,255,255,0.04)',
                    border: active ? '1px solid rgba(255,107,107,0.45)' : '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 8,
                    padding: '6px 12px',
                    color: active ? '#FF6B6B' : '#4A5568',
                    fontSize: 12,
                    cursor: 'pointer',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    fontWeight: active ? 600 : 400,
                  }}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <FieldLabel>{L('Medications (optional)', 'Medicamentos (opcional)')}</FieldLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {MEDICATION_OPTIONS.map(opt => {
              const active = medications.includes(opt);
              return (
                <button
                  key={opt}
                  onClick={() => toggleMedication(opt)}
                  style={{
                    background: active ? 'rgba(255,107,107,0.15)' : 'rgba(255,255,255,0.04)',
                    border: active ? '1px solid rgba(255,107,107,0.45)' : '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 8,
                    padding: '6px 12px',
                    color: active ? '#FF6B6B' : '#4A5568',
                    fontSize: 12,
                    cursor: 'pointer',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    fontWeight: active ? 600 : 400,
                  }}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      </Section>

      {/* Save button */}
      <div style={{ width: '100%', maxWidth: 430, margin: '0 auto', padding: '8px 24px 16px' }}>
        <button
          onClick={saveProfile}
          disabled={saving || saved}
          style={{
            width: '100%',
            background: saved ? 'rgba(0,200,150,0.2)' : saving ? 'rgba(255,107,107,0.4)' : '#FF6B6B',
            border: saved ? '1px solid rgba(0,200,150,0.4)' : 'none',
            borderRadius: 14,
            padding: '16px',
            color: saved ? '#00C896' : 'white',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: (saving || saved) ? 'default' : 'pointer',
            fontFamily: 'Inter, system-ui, sans-serif',
            transition: 'background 0.2s, color 0.2s',
          }}
        >
          {saved ? L('Saved', 'Guardado') : saving ? L('Saving...', 'Guardando...') : L('Save changes', 'Guardar cambios')}
        </button>
      </div>

      {/* Logout */}
      <div style={{ width: '100%', maxWidth: 430, margin: '0 auto', padding: '0 24px' }}>
        <button
          onClick={() => setShowLogoutConfirm(true)}
          style={{
            width: '100%',
            background: 'none',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 14,
            padding: '14px',
            color: '#4A5568',
            fontSize: '0.9rem',
            cursor: 'pointer',
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          {L('Sign out', 'Cerrar sesión')}
        </button>
      </div>

      {/* Logout confirm */}
      {showLogoutConfirm && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: 24,
        }}>
          <div style={{
            background: '#12122A',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 20,
            padding: 28,
            maxWidth: 340,
            width: '100%',
          }}>
            <h3 style={{ fontFamily: 'JetBrains Mono, monospace', color: 'white', fontSize: '1rem', margin: '0 0 10px' }}>
              {L('Sign out?', '¿Cerrar sesión?')}
            </h3>
            <p style={{ color: '#4A5568', fontSize: 13, margin: '0 0 20px' }}>
              {L('Your data is saved in the cloud.', 'Tus datos están guardados en la nube.')}
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                style={{
                  flex: 1,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 10,
                  padding: '12px',
                  color: '#4A5568',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontFamily: 'Inter, system-ui, sans-serif',
                }}
              >
                {L('Cancel', 'Cancelar')}
              </button>
              <button
                onClick={handleLogout}
                style={{
                  flex: 1,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 10,
                  padding: '12px',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontFamily: 'Inter, system-ui, sans-serif',
                }}
              >
                {L('Sign out', 'Cerrar sesión')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ width: '100%', maxWidth: 430, margin: '0 auto' }}>
      <div style={{ padding: '20px 24px 6px' }}>
        <p style={{
          color: '#4A5568',
          fontSize: 10,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          margin: 0,
        }}>
          {label}
        </p>
      </div>
      <div style={{ padding: '8px 24px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {children}
      </div>
      <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '0 24px' }} />
    </div>
  );
}

function FieldRow({ label, sublabel, children }: { label: string; sublabel?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
      <div>
        <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>{label}</div>
        {sublabel && <div style={{ color: '#4A5568', fontSize: 11, marginTop: 2 }}>{sublabel}</div>}
      </div>
      {children}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ color: '#4A5568', fontSize: 11, letterSpacing: '0.06em', margin: '0 0 6px' }}>
      {children}
    </p>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10,
  padding: '10px 12px',
  color: 'white',
  fontSize: '0.9rem',
  fontFamily: 'Inter, system-ui, sans-serif',
  outline: 'none',
  boxSizing: 'border-box',
};
