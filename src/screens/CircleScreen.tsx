import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Profile } from '../lib/supabase';

interface Props {
  profile: Profile;
}

interface Relationship {
  id: string;
  name: string;
  rank: number;
  category: string;
  intimacy: boolean;
  avgScore: number | null;
  trend: 'up' | 'down' | 'flat' | null;
}

const MAX_RELATIONSHIPS = 7;

const CATEGORY_LABELS: Record<string, { en: string; es: string; emoji: string }> = {
  partner:   { en: 'Partner',   es: 'Pareja',   emoji: '💞' },
  family:    { en: 'Family',    es: 'Familia',  emoji: '👨‍👩‍👧' },
  friend:    { en: 'Friend',    es: 'Amigo',    emoji: '🤝' },
  work:      { en: 'Work',      es: 'Trabajo',  emoji: '💼' },
  ex:        { en: 'Ex',        es: 'Ex',       emoji: '🫥' },
  interest:  { en: 'Interest',  es: 'Interés',  emoji: '💫' },
  other:     { en: 'Other',     es: 'Otro',     emoji: '👤' },
};

export function CircleScreen({ profile }: Props) {
  const [rels, setRels] = useState<Relationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('friend');
  const [newIntimacy, setNewIntimacy] = useState(false);

  const idioma = profile.idioma ?? 'EN';

  async function loadRelationships() {
    const { data: rows } = await supabase
      .from('relationships')
      .select('id, name, rank, category, intimacy')
      .eq('user_id', profile.id)
      .order('rank', { ascending: true });

    if (!rows) { setLoading(false); return; }

    const enriched: Relationship[] = await Promise.all(rows.map(async (r: any) => {
      const since = new Date();
      since.setDate(since.getDate() - 30);

      const { data: interactions } = await supabase
        .from('relationship_interactions')
        .select('connection_score, interaction_date')
        .eq('relationship_id', r.id)
        .gte('interaction_date', since.toISOString().split('T')[0])
        .order('interaction_date', { ascending: true });

      let avgScore: number | null = null;
      let trend: 'up' | 'down' | 'flat' | null = null;

      if (interactions && interactions.length > 0) {
        const scores = interactions.map((i: any) => i.connection_score).filter((s: number) => s != null);
        if (scores.length > 0) {
          avgScore = Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length * 10) / 10;
        }
        if (scores.length >= 4) {
          const half = Math.floor(scores.length / 2);
          const firstAvg = scores.slice(0, half).reduce((a: number, b: number) => a + b, 0) / half;
          const secondAvg = scores.slice(half).reduce((a: number, b: number) => a + b, 0) / (scores.length - half);
          const diff = secondAvg - firstAvg;
          trend = diff > 0.5 ? 'up' : diff < -0.5 ? 'down' : 'flat';
        }
      }

      return { id: r.id, name: r.name, rank: r.rank, category: r.category, intimacy: r.intimacy, avgScore, trend };
    }));

    setRels(enriched);
    setLoading(false);
  }

  useEffect(() => { loadRelationships(); }, [profile.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function addRelationship() {
    if (!newName.trim() || rels.length >= MAX_RELATIONSHIPS) return;

    const nextRank = rels.length + 1;
    await supabase.from('relationships').insert({
      user_id: profile.id,
      name: newName.trim(),
      rank: nextRank,
      category: newCategory,
      intimacy: newIntimacy,
    });
    setNewName(''); setNewCategory('friend'); setNewIntimacy(false); setShowAdd(false);
    loadRelationships();
  }

  async function removeRelationship(id: string) {
    if (!confirm(idioma === 'ES' ? '¿Eliminar esta relación?' : 'Remove this relationship?')) return;
    await supabase.from('relationships').delete().eq('id', id);
    loadRelationships();
  }

  const atCap = rels.length >= MAX_RELATIONSHIPS;

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A1A', paddingBottom: 80 }}>
      <div style={{ width: '100%', maxWidth: 430, margin: '0 auto', padding: '28px 24px 16px' }}>
        <h1 style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '1.3rem',
          fontWeight: 700,
          color: 'white',
          margin: 0,
        }}>
          {idioma === 'ES' ? 'Tu Círculo' : 'Your Circle'}
        </h1>
        <p style={{ color: '#4A5568', fontSize: 12, margin: '6px 0 0' }}>
          {rels.length} / {MAX_RELATIONSHIPS} {idioma === 'ES' ? 'personas' : 'people'}
        </p>
      </div>

      <div style={{ width: '100%', maxWidth: 430, margin: '0 auto', padding: '0 24px' }}>
        {loading ? (
          <div style={{ color: '#4A5568', textAlign: 'center', padding: 40 }}>
            {idioma === 'ES' ? 'Cargando...' : 'Loading...'}
          </div>
        ) : rels.length === 0 ? (
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px dashed rgba(255,255,255,0.1)',
            borderRadius: 14,
            padding: '32px 20px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>⭕</div>
            <div style={{ color: 'white', fontWeight: 600, marginBottom: 8 }}>
              {idioma === 'ES' ? 'Tu círculo está vacío' : 'Your circle is empty'}
            </div>
            <div style={{ color: '#4A5568', fontSize: 12, lineHeight: 1.5 }}>
              {idioma === 'ES'
                ? 'Jules te pedirá nombres durante las sesiones, o puedes agregarlos aquí.'
                : 'Jules will ask for names during sessions, or you can add them here.'}
            </div>
          </div>
        ) : (
          rels.map(r => {
            const cat = CATEGORY_LABELS[r.category] ?? CATEGORY_LABELS.other;
            const scoreColor = r.avgScore == null ? '#4A5568' : r.avgScore >= 7 ? '#00C896' : r.avgScore >= 5 ? '#FFD93D' : '#FF6B6B';
            const trendArrow = r.trend === 'up' ? '↑' : r.trend === 'down' ? '↓' : r.trend === 'flat' ? '→' : '';
            return (
              <div key={r.id} style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 12,
                padding: '14px 16px',
                marginBottom: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(255,217,61,0.2), rgba(123,97,255,0.2))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, flexShrink: 0,
                }}>{cat.emoji}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: 'white', fontWeight: 600, fontSize: 14, marginBottom: 2 }}>
                    {r.name} {r.intimacy && <span style={{ fontSize: 12 }}>💞</span>}
                  </div>
                  <div style={{ color: '#4A5568', fontSize: 11 }}>
                    {idioma === 'ES' ? cat.es : cat.en} · #{r.rank}
                  </div>
                </div>
                <div style={{ textAlign: 'right', marginRight: 8 }}>
                  <div style={{ color: scoreColor, fontWeight: 700, fontSize: 14, fontFamily: 'JetBrains Mono, monospace' }}>
                    {r.avgScore != null ? `${r.avgScore.toFixed(1)} ${trendArrow}` : '—'}
                  </div>
                  <div style={{ color: '#4A5568', fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    {idioma === 'ES' ? '30 días' : '30 days'}
                  </div>
                </div>
                <button
                  onClick={() => removeRelationship(r.id)}
                  style={{
                    background: 'rgba(255,107,107,0.1)',
                    border: '1px solid rgba(255,107,107,0.2)',
                    borderRadius: 6,
                    width: 28, height: 28,
                    color: '#FF6B6B',
                    fontSize: 14,
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                  aria-label="Remove"
                >
                  ×
                </button>
              </div>
            );
          })
        )}

        {/* Add relationship */}
        {!showAdd ? (
          <button
            onClick={() => setShowAdd(true)}
            disabled={atCap}
            style={{
              width: '100%',
              marginTop: 12,
              background: atCap ? 'rgba(255,255,255,0.02)' : 'rgba(255,107,107,0.08)',
              border: `1px dashed ${atCap ? 'rgba(255,255,255,0.08)' : 'rgba(255,107,107,0.3)'}`,
              borderRadius: 12,
              padding: '14px',
              color: atCap ? '#4A5568' : '#FF6B6B',
              fontSize: 13,
              fontWeight: 600,
              cursor: atCap ? 'default' : 'pointer',
            }}
          >
            {atCap
              ? (idioma === 'ES' ? 'Máximo 7 personas alcanzado' : 'Maximum 7 people reached')
              : (idioma === 'ES' ? '+ Agregar persona' : '+ Add person')}
          </button>
        ) : (
          <div style={{
            marginTop: 12,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 14,
            padding: '20px',
          }}>
            <div style={{ color: 'white', fontWeight: 600, fontSize: 14, marginBottom: 14 }}>
              {idioma === 'ES' ? 'Nueva persona' : 'New person'}
            </div>

            <input
              type="text"
              placeholder={idioma === 'ES' ? 'Nombre' : 'Name'}
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addRelationship()}
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 8,
                padding: '10px 12px',
                color: 'white',
                fontSize: 14,
                marginBottom: 12,
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {Object.entries(CATEGORY_LABELS).map(([key, val]) => (
                <button
                  key={key}
                  onClick={() => setNewCategory(key)}
                  style={{
                    background: newCategory === key ? 'rgba(255,107,107,0.2)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${newCategory === key ? '#FF6B6B' : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: 20,
                    padding: '4px 10px',
                    color: newCategory === key ? '#FF6B6B' : '#8A9BB0',
                    fontSize: 11,
                    cursor: 'pointer',
                  }}
                >
                  {val.emoji} {idioma === 'ES' ? val.es : val.en}
                </button>
              ))}
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, cursor: 'pointer' }}>
              <div
                onClick={() => setNewIntimacy(v => !v)}
                style={{
                  width: 36, height: 20, borderRadius: 10,
                  background: newIntimacy ? '#FF6B6B' : 'rgba(255,255,255,0.1)',
                  position: 'relative', cursor: 'pointer', transition: 'background 0.2s',
                }}
              >
                <div style={{
                  position: 'absolute', top: 2,
                  left: newIntimacy ? 18 : 2,
                  width: 16, height: 16, borderRadius: '50%',
                  background: 'white', transition: 'left 0.2s',
                }} />
              </div>
              <span style={{ color: '#8A9BB0', fontSize: 12 }}>
                {idioma === 'ES' ? 'Vínculo íntimo' : 'Intimate bond'}
              </span>
            </label>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => { setShowAdd(false); setNewName(''); setNewCategory('friend'); setNewIntimacy(false); }}
                style={{
                  flex: 1, padding: '10px',
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8, color: '#8A9BB0', fontSize: 13, cursor: 'pointer',
                }}
              >
                {idioma === 'ES' ? 'Cancelar' : 'Cancel'}
              </button>
              <button
                onClick={addRelationship}
                disabled={!newName.trim()}
                style={{
                  flex: 1, padding: '10px',
                  background: newName.trim() ? '#FF6B6B' : 'rgba(255,107,107,0.2)',
                  border: 'none',
                  borderRadius: 8, color: 'white', fontSize: 13, fontWeight: 600,
                  cursor: newName.trim() ? 'pointer' : 'default',
                }}
              >
                {idioma === 'ES' ? 'Agregar' : 'Add'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
