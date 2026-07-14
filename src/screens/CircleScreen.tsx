import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Profile, UserState, TierLimits } from '../lib/supabase';
import { colors, fonts } from '../lib/tokens';

interface Props {
  profile: Profile;
  userState: UserState | null;
  tierLimits: TierLimits;
}

interface Relationship {
  id: string;
  name: string;
  rank: number;
  category: string;
  intimacy: boolean;
  avgScore: number | null;
  trend: 'up' | 'down' | 'flat' | null;
  _avgStress?: number | null;
  _avgAnxiety?: number | null;
}


const CATEGORY_LABELS: Record<string, { en: string; es: string; emoji: string }> = {
  partner:   { en: 'Partner',   es: 'Pareja',   emoji: '💞' },
  family:    { en: 'Family',    es: 'Familia',  emoji: '👨‍👩‍👧' },
  friend:    { en: 'Friend',    es: 'Amigo',    emoji: '🤝' },
  work:      { en: 'Work',      es: 'Trabajo',  emoji: '💼' },
  ex:        { en: 'Ex',        es: 'Ex',       emoji: '🫥' },
  interest:  { en: 'Interest',  es: 'Interés',  emoji: '💫' },
  other:     { en: 'Other',     es: 'Otro',     emoji: '👤' },
};

export function CircleScreen({ profile, userState: _userState, tierLimits }: Props) {
  const [rels, setRels] = useState<Relationship[]>([]);
  const [loading, setLoading] = useState(true);

  // Add state
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('friend');
  const [newIntimacy, setNewIntimacy] = useState(false);

  // Edit state
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('friend');
  const [editIntimacy, setEditIntimacy] = useState(false);

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
        .gte('interaction_date', since.toLocaleDateString('en-CA'))
        .order('interaction_date', { ascending: true });

      let avgScore: number | null = null;
      let trend: 'up' | 'down' | 'flat' | null = null;

      if (interactions && interactions.length > 0) {
        const scores = interactions.map((i: any) => i.connection_score).filter((s: number) => s != null);
        if (scores.length > 0) {
          avgScore = Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length * 10) / 10;
        }

        const interactionDates = interactions.map((i: any) => i.interaction_date);
        if (interactionDates.length > 0) {
          const { data: stressSessions } = await supabase
            .from('conversation_sessions')
            .select('factor_estres, factor_ansiedad, session_date')
            .eq('user_id', profile.id)
            .eq('session_complete', true)
            .in('session_date', interactionDates);

          if (stressSessions && stressSessions.length > 0) {
            const stressVals = (stressSessions as any[])
              .map((s: any) => s.factor_estres)
              .filter((v: any) => v != null);
            const anxietyVals = (stressSessions as any[])
              .map((s: any) => s.factor_ansiedad)
              .filter((v: any) => v != null);
            if (stressVals.length > 0) {
              const avgStress = stressVals.reduce((a: number, b: number) => a + b, 0) / stressVals.length;
              const avgAnxiety = anxietyVals.length > 0
                ? anxietyVals.reduce((a: number, b: number) => a + b, 0) / anxietyVals.length
                : null;
              (r as any)._avgStress = Math.round(avgStress * 10) / 10;
              (r as any)._avgAnxiety = avgAnxiety != null ? Math.round(avgAnxiety * 10) / 10 : null;
            }
          }
        }

        if (scores.length >= 4) {
          const half = Math.floor(scores.length / 2);
          const firstAvg = scores.slice(0, half).reduce((a: number, b: number) => a + b, 0) / half;
          const secondAvg = scores.slice(half).reduce((a: number, b: number) => a + b, 0) / (scores.length - half);
          const diff = secondAvg - firstAvg;
          trend = diff > 0.5 ? 'up' : diff < -0.5 ? 'down' : 'flat';
        }
      }

      return {
        id: r.id, name: r.name, rank: r.rank,
        category: r.category, intimacy: r.intimacy,
        avgScore, trend,
        _avgStress: (r as any)._avgStress ?? null,
        _avgAnxiety: (r as any)._avgAnxiety ?? null,
      };
    }));

    setRels(enriched);
    setLoading(false);
  }

  useEffect(() => { loadRelationships(); }, [profile.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function addRelationship() {
    const tierMax = tierLimits.circleMax;
    if (!newName.trim() || rels.length >= tierMax) return;
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

  function openEdit(r: Relationship) {
    setEditId(r.id);
    setEditName(r.name);
    setEditCategory(r.category);
    setEditIntimacy(r.intimacy);
    setShowAdd(false);
  }

  function closeEdit() {
    setEditId(null);
    setEditName('');
    setEditCategory('friend');
    setEditIntimacy(false);
  }

  async function saveEdit() {
    if (!editId || !editName.trim()) return;
    await supabase.from('relationships')
      .update({ name: editName.trim(), category: editCategory, intimacy: editIntimacy })
      .eq('id', editId);
    closeEdit();
    loadRelationships();
  }

  async function removeRelationship(id: string) {
    if (!confirm(idioma === 'ES' ? '¿Eliminar esta relación?' : 'Remove this relationship?')) return;
    await supabase.from('relationships').delete().eq('id', id);
    if (editId === id) closeEdit();
    loadRelationships();
  }

  const stressInsights = rels.filter(r => r._avgStress != null);
  const highStress = stressInsights.filter(r => (r._avgStress ?? 0) >= 7);
  const lowStress  = stressInsights.filter(r => (r._avgStress ?? 10) <= 3);
  const atCap = rels.length >= tierLimits.circleMax;

  return (
    <div style={{ minHeight: '100vh', background: colors.midnight, paddingBottom: 80 }}>
      <div style={{ width: '100%', maxWidth: 430, margin: '0 auto', padding: '28px 24px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <img src="/favicon.svg" alt="" style={{ width: 20, height: 20 }} />
          <span style={{ fontFamily: fonts.body, fontSize: 12, fontWeight: 500, color: colors.boneFaint, letterSpacing: '0.04em' }}>biocycle</span>
        </div>
        <h1 style={{ fontFamily: fonts.display, fontSize: '1.3rem', fontWeight: 300, color: colors.bone, margin: 0 }}>
          {idioma === 'ES' ? 'Tu Círculo' : 'Your Circle'}
        </h1>
        <p style={{ color: colors.boneFaint, fontSize: 12, margin: '6px 0 0' }}>
          {rels.length} / {tierLimits.circleMax} {idioma === 'ES' ? 'personas' : 'people'}
        </p>
      </div>

      <div style={{ width: '100%', maxWidth: 430, margin: '0 auto', padding: '0 24px' }}>

        {/* Stress & Anxiety Insight Panel */}
        {stressInsights.length > 0 && (
          <div style={{ background: 'rgba(245,242,238,0.03)', border: '1px solid rgba(245,242,238,0.08)', borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: colors.amber, marginBottom: 10, fontFamily: fonts.mono }}>
              {idioma === 'ES' ? 'Tu estrés y tu círculo' : 'Your stress & your circle'}
            </div>
            {highStress.map(r => (
              <div key={r.id} style={{ fontSize: 12, color: colors.boneDim, lineHeight: 1.55, marginBottom: 4, paddingLeft: 10, borderLeft: `2px solid ${colors.danger}` }}>
                {idioma === 'ES'
                  ? `Tu estrés es consistentemente más alto los días con ${r.name} — promedio ${r._avgStress}/10.`
                  : `Your stress is consistently higher on days with ${r.name} — avg ${r._avgStress}/10.`}
                {r._avgAnxiety != null && (
                  <span style={{ color: colors.boneFaint }}>
                    {idioma === 'ES' ? ` Ansiedad: ${r._avgAnxiety}/10.` : ` Anxiety: ${r._avgAnxiety}/10.`}
                  </span>
                )}
              </div>
            ))}
            {lowStress.map(r => (
              <div key={r.id} style={{ fontSize: 12, color: colors.boneDim, lineHeight: 1.55, marginBottom: 4, paddingLeft: 10, borderLeft: `2px solid ${colors.success}` }}>
                {idioma === 'ES'
                  ? `Tu estrés es más bajo los días con ${r.name} — promedio ${r._avgStress}/10.`
                  : `Your stress is lowest on days with ${r.name} — avg ${r._avgStress}/10.`}
              </div>
            ))}
            {highStress.length === 0 && lowStress.length === 0 && (
              <div style={{ fontSize: 12, color: colors.boneFaint }}>
                {idioma === 'ES' ? 'Tus niveles de estrés son moderados con todos en tu círculo.' : 'Your stress levels are moderate with everyone in your circle.'}
              </div>
            )}
            <div style={{ fontSize: 10, color: colors.boneFaint, marginTop: 8, fontStyle: 'italic' }}>
              {idioma === 'ES' ? 'Basado en los últimos 30 días de sesiones.' : 'Based on the last 30 days of sessions.'}
            </div>
          </div>
        )}

        {/* Relationship cards */}
        {loading ? (
          <div style={{ color: colors.boneFaint, textAlign: 'center', padding: 40 }}>
            {idioma === 'ES' ? 'Cargando...' : 'Loading...'}
          </div>
        ) : rels.length === 0 ? (
          <div style={{ background: 'rgba(245,242,238,0.03)', border: '1px dashed rgba(245,242,238,0.1)', borderRadius: 14, padding: '32px 20px', textAlign: 'center' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', border: `3px solid ${colors.amber}`, margin: '0 auto 12px' }} />
            <div style={{ color: colors.bone, fontWeight: 600, marginBottom: 8 }}>
              {idioma === 'ES' ? 'Tu círculo está vacío' : 'Your circle is empty'}
            </div>
            <div style={{ color: colors.boneFaint, fontSize: 12, lineHeight: 1.5 }}>
              {idioma === 'ES'
                ? 'Jules te pedirá nombres durante las sesiones, o puedes agregarlos aquí.'
                : 'Jules will ask for names during sessions, or you can add them here.'}
            </div>
          </div>
        ) : (
          rels.map(r => {
            const cat = CATEGORY_LABELS[r.category] ?? CATEGORY_LABELS.other;
            const scoreColor = r.avgScore == null ? colors.boneFaint : r.avgScore >= 7 ? colors.success : r.avgScore >= 5 ? colors.amber : colors.danger;
            const trendArrow = r.trend === 'up' ? '↑' : r.trend === 'down' ? '↓' : r.trend === 'flat' ? '→' : '';
            const isEditing = editId === r.id;

            return (
              <div key={r.id} style={{ marginBottom: 8 }}>
                {/* Card row */}
                <div style={{
                  background: isEditing ? 'rgba(239,159,39,0.05)' : 'rgba(245,242,238,0.03)',
                  border: `1px solid ${isEditing ? 'rgba(239,159,39,0.25)' : 'rgba(245,242,238,0.06)'}`,
                  borderRadius: isEditing ? '12px 12px 0 0' : 12,
                  padding: '14px 16px',
                  display: 'flex', alignItems: 'center', gap: 12,
                  cursor: 'pointer', transition: 'border-color 0.2s',
                }} onClick={() => isEditing ? closeEdit() : openEdit(r)}>

                  {/* Avatar */}
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                    background: ['linear-gradient(135deg,rgba(239,159,39,.35),rgba(239,159,39,.1))','linear-gradient(135deg,rgba(93,202,165,.35),rgba(93,202,165,.1))','linear-gradient(135deg,rgba(133,183,235,.35),rgba(133,183,235,.1))','linear-gradient(135deg,rgba(224,122,95,.35),rgba(224,122,95,.1))','linear-gradient(135deg,rgba(239,159,39,.35),rgba(133,183,235,.1))','linear-gradient(135deg,rgba(93,202,165,.35),rgba(239,159,39,.1))','linear-gradient(135deg,rgba(133,183,235,.35),rgba(93,202,165,.1))'][r.rank-1] ?? 'linear-gradient(135deg,rgba(239,159,39,.2),rgba(133,183,235,.1))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                  }}>{cat.emoji}</div>

                  {/* Name + label + stress */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: colors.bone, fontWeight: 600, fontSize: 14, marginBottom: 2 }}>
                      {r.name} {r.intimacy && <span style={{ fontSize: 12 }}>💞</span>}
                    </div>
                    <div style={{ color: colors.boneFaint, fontSize: 11, fontFamily: fonts.body }}>
                      {idioma === 'ES' ? cat.es : cat.en} · #{r.rank}
                    </div>
                    {r._avgStress != null && (
                      <div style={{ fontSize: 10, color: r._avgStress >= 7 ? colors.danger : r._avgStress >= 4 ? colors.amber : colors.success, fontFamily: fonts.mono, marginTop: 2 }}>
                        {r._avgStress >= 7
                          ? (idioma === 'ES' ? `↑ estrés ${r._avgStress}/10` : `↑ stress ${r._avgStress}/10`)
                          : r._avgStress >= 4
                          ? (idioma === 'ES' ? `estrés moderado ${r._avgStress}/10` : `moderate stress ${r._avgStress}/10`)
                          : (idioma === 'ES' ? `↓ estrés bajo ${r._avgStress}/10` : `↓ low stress ${r._avgStress}/10`)}
                      </div>
                    )}
                  </div>

                  {/* Score bar */}
                  <div style={{ textAlign: 'right' as const, marginRight: 8, minWidth: 80 }}>
                    {r.avgScore != null ? (
                      <>
                        <div style={{ color: scoreColor, fontWeight: 600, fontSize: 13, fontFamily: fonts.mono, marginBottom: 3 }}>
                          {r.avgScore.toFixed(1)} {trendArrow}
                        </div>
                        <div style={{ height: 3, background: colors.surfaceBorder, borderRadius: 999, overflow: 'hidden', marginBottom: 3, width: 72 }}>
                          <div style={{ height: '100%', width: `${(r.avgScore/10)*100}%`, background: scoreColor, borderRadius: 999 }} />
                        </div>
                        <div style={{ color: colors.boneFaint, fontSize: 9, letterSpacing: '0.06em', textTransform: 'uppercase' as const, fontFamily: fonts.mono }}>
                          {r.avgScore >= 7 ? (idioma === 'ES' ? 'Te potencia' : 'Energizes') : r.avgScore >= 5 ? 'Neutral' : (idioma === 'ES' ? 'Te drena' : 'Drains')}
                        </div>
                      </>
                    ) : (
                      <div style={{ color: colors.boneFaint, fontSize: 11, fontFamily: fonts.mono }}>
                        {idioma === 'ES' ? 'Sin datos' : 'No data'}
                      </div>
                    )}
                  </div>

                  {/* Edit + Delete buttons */}
                  <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 4, flexShrink: 0 }}>
                    <button onClick={e => { e.stopPropagation(); isEditing ? closeEdit() : openEdit(r); }}
                      style={{ background: isEditing ? 'rgba(239,159,39,.25)' : 'rgba(245,242,238,.06)', border: `1px solid ${isEditing ? colors.amber : 'rgba(245,242,238,.1)'}`, borderRadius: 6, width: 28, height: 28, color: isEditing ? colors.amber : colors.boneFaint, fontSize: 13, cursor: 'pointer' }}
                      aria-label="Edit">✎</button>
                    <button onClick={e => { e.stopPropagation(); removeRelationship(r.id); }}
                      style={{ background: 'rgba(239,159,39,.1)', border: '1px solid rgba(239,159,39,.2)', borderRadius: 6, width: 28, height: 28, color: colors.amber, fontSize: 14, cursor: 'pointer' }}
                      aria-label="Remove">×</button>
                  </div>
                </div>

                {/* Edit panel — slides in below card when open */}
                {isEditing && (
                  <div style={{ background: 'rgba(239,159,39,0.04)', border: '1px solid rgba(239,159,39,0.2)', borderTop: 'none', borderRadius: '0 0 12px 12px', padding: '14px 16px' }}>
                    <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && saveEdit()}
                      placeholder={idioma === 'ES' ? 'Nombre' : 'Name'} autoFocus
                      style={{ width: '100%', background: 'rgba(245,242,238,.05)', border: '1px solid rgba(245,242,238,.12)', borderRadius: 8, padding: '9px 12px', color: colors.bone, fontSize: 14, marginBottom: 12, boxSizing: 'border-box' as const, outline: 'none' }}
                    />
                    <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6, marginBottom: 12 }}>
                      {Object.entries(CATEGORY_LABELS).map(([key, val]) => (
                        <button key={key} onClick={() => setEditCategory(key)}
                          style={{ background: editCategory===key ? 'rgba(239,159,39,.2)' : 'rgba(245,242,238,.04)', border: `1px solid ${editCategory===key ? colors.amber : 'rgba(245,242,238,.1)'}`, borderRadius: 20, padding: '4px 10px', color: editCategory===key ? colors.amber : colors.boneFaint, fontSize: 11, cursor: 'pointer' }}>
                          {val.emoji} {idioma === 'ES' ? val.es : val.en}
                        </button>
                      ))}
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, cursor: 'pointer' }}>
                      <div onClick={() => setEditIntimacy(v => !v)}
                        style={{ width: 36, height: 20, borderRadius: 10, background: editIntimacy ? colors.amber : 'rgba(245,242,238,.1)', position: 'relative' as const, cursor: 'pointer', transition: 'background 0.2s' }}>
                        <div style={{ position: 'absolute' as const, top: 2, left: editIntimacy ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: 'white', transition: 'left 0.2s' }} />
                      </div>
                      <span style={{ color: colors.boneFaint, fontSize: 12 }}>{idioma === 'ES' ? 'Vínculo íntimo' : 'Intimate bond'}</span>
                    </label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={closeEdit}
                        style={{ flex: 1, padding: '9px', background: 'transparent', border: '1px solid rgba(245,242,238,.1)', borderRadius: 8, color: colors.boneFaint, fontSize: 13, cursor: 'pointer' }}>
                        {idioma === 'ES' ? 'Cancelar' : 'Cancel'}
                      </button>
                      <button onClick={saveEdit} disabled={!editName.trim()}
                        style={{ flex: 1, padding: '9px', background: editName.trim() ? colors.amber : 'rgba(239,159,39,.2)', border: 'none', borderRadius: 8, color: colors.midnight, fontSize: 13, fontWeight: 600, cursor: editName.trim() ? 'pointer' : 'default' }}>
                        {idioma === 'ES' ? 'Guardar' : 'Save'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Add person */}
        {!showAdd ? (
          <button onClick={() => { setShowAdd(true); closeEdit(); }} disabled={atCap}
            style={{ width: '100%', marginTop: 12, background: atCap ? 'rgba(245,242,238,.02)' : 'rgba(239,159,39,.08)', border: `1px dashed ${atCap ? 'rgba(245,242,238,.08)' : 'rgba(239,159,39,.3)'}`, borderRadius: 12, padding: '14px', color: atCap ? colors.boneFaint : colors.amber, fontSize: 13, fontWeight: 600, cursor: atCap ? 'default' : 'pointer' }}>
            {atCap ? (idioma === 'ES' ? 'Máximo 7 personas alcanzado' : 'Maximum 7 people reached') : (idioma === 'ES' ? '+ Agregar persona' : '+ Add person')}
          </button>
        ) : (
          <div style={{ marginTop: 12, background: 'rgba(245,242,238,.03)', border: '1px solid rgba(245,242,238,.1)', borderRadius: 14, padding: '20px' }}>
            <div style={{ color: colors.bone, fontWeight: 600, fontSize: 14, marginBottom: 14 }}>
              {idioma === 'ES' ? 'Nueva persona' : 'New person'}
            </div>
            <input type="text" placeholder={idioma === 'ES' ? 'Nombre' : 'Name'} value={newName}
              onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addRelationship()} autoFocus
              style={{ width: '100%', background: 'rgba(245,242,238,.05)', border: '1px solid rgba(245,242,238,.12)', borderRadius: 8, padding: '10px 12px', color: colors.bone, fontSize: 14, marginBottom: 12, boxSizing: 'border-box' as const, outline: 'none' }}
            />
            <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6, marginBottom: 12 }}>
              {Object.entries(CATEGORY_LABELS).map(([key, val]) => (
                <button key={key} onClick={() => setNewCategory(key)}
                  style={{ background: newCategory===key ? 'rgba(239,159,39,.2)' : 'rgba(245,242,238,.04)', border: `1px solid ${newCategory===key ? colors.amber : 'rgba(245,242,238,.1)'}`, borderRadius: 20, padding: '4px 10px', color: newCategory===key ? colors.amber : colors.boneFaint, fontSize: 11, cursor: 'pointer' }}>
                  {val.emoji} {idioma === 'ES' ? val.es : val.en}
                </button>
              ))}
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, cursor: 'pointer' }}>
              <div onClick={() => setNewIntimacy(v => !v)}
                style={{ width: 36, height: 20, borderRadius: 10, background: newIntimacy ? colors.amber : 'rgba(245,242,238,.1)', position: 'relative' as const, cursor: 'pointer', transition: 'background 0.2s' }}>
                <div style={{ position: 'absolute' as const, top: 2, left: newIntimacy ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: 'white', transition: 'left 0.2s' }} />
              </div>
              <span style={{ color: colors.boneFaint, fontSize: 12 }}>{idioma === 'ES' ? 'Vínculo íntimo' : 'Intimate bond'}</span>
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setShowAdd(false); setNewName(''); setNewCategory('friend'); setNewIntimacy(false); }}
                style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid rgba(245,242,238,.1)', borderRadius: 8, color: colors.boneFaint, fontSize: 13, cursor: 'pointer' }}>
                {idioma === 'ES' ? 'Cancelar' : 'Cancel'}
              </button>
              <button onClick={addRelationship} disabled={!newName.trim()}
                style={{ flex: 1, padding: '10px', background: newName.trim() ? colors.amber : 'rgba(239,159,39,.2)', border: 'none', borderRadius: 8, color: colors.midnight, fontSize: 13, fontWeight: 600, cursor: newName.trim() ? 'pointer' : 'default' }}>
                {idioma === 'ES' ? 'Agregar' : 'Add'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
