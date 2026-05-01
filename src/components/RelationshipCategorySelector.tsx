import { useState } from 'react';
import { colors, fonts } from '../lib/tokens';

interface Props {
  name: string;
  isES: boolean;
  onSelect: (category: string, intimacy: boolean) => void;
}

const CATEGORIES = [
  { en: 'Family',          es: 'Familia' },
  { en: 'Relative',        es: 'Familiar' },
  { en: 'Partner',         es: 'Pareja' },
  { en: 'Friend',          es: 'Amigo/a' },
  { en: 'Colleague',       es: 'Colega' },
  { en: 'Stranger',        es: 'Conocido/a' },
  { en: 'Someone Special', es: 'Alguien Especial' },
];

export function RelationshipCategorySelector({ name, isES, onSelect }: Props) {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [intimacy, setIntimacy] = useState(false);

  return (
    <div style={{
      background: 'rgba(255,217,61,0.04)',
      border: '1px solid rgba(255,217,61,0.15)',
      borderRadius: 14,
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
    }}>
      <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, margin: 0 }}>
        {isES ? `¿Cómo conoces a ${name}?` : `How do you know ${name}?`}
      </p>

      {/* Category pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {CATEGORIES.map(cat => {
          const label = isES ? cat.es : cat.en;
          const isSelected = selectedCategory === cat.en;
          return (
            <button
              key={cat.en}
              onClick={() => setSelectedCategory(cat.en)}
              style={{
                background: isSelected ? 'rgba(255,217,61,0.15)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${isSelected ? '#FFD93D' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: 20,
                padding: '8px 14px',
                color: isSelected ? '#FFD93D' : '#4A5568',
                fontSize: 13,
                fontWeight: isSelected ? 600 : 400,
                cursor: 'pointer',
                fontFamily: fonts.body,
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Intimacy toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 }}>
        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
          {isES ? 'Intimidad sexual' : 'Sexual intimacy'}
        </span>
        <button
          onClick={() => setIntimacy(i => !i)}
          style={{
            background: intimacy ? 'rgba(255,217,61,0.2)' : 'rgba(255,255,255,0.06)',
            border: `1px solid ${intimacy ? '#FFD93D' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: 20,
            padding: '4px 14px',
            color: intimacy ? '#FFD93D' : '#4A5568',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {intimacy ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* Confirm */}
      <button
        onClick={() => selectedCategory && onSelect(selectedCategory, intimacy)}
        disabled={!selectedCategory}
        style={{
          background: selectedCategory ? colors.amber : 'rgba(255,255,255,0.06)',
          border: 'none',
          borderRadius: 10,
          padding: '12px',
          color: selectedCategory ? colors.bone : '#4A5568',
          fontSize: 14,
          fontWeight: 600,
          cursor: selectedCategory ? 'pointer' : 'default',
          fontFamily: fonts.body,
        }}
      >
        {isES ? 'Guardar' : 'Save'}
      </button>
    </div>
  );
}
