import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Profile } from '../lib/supabase';
import { getDaysOfData } from '../lib/phaseEngine';

interface Props {
  profile: Profile;
}

interface SessionRow {
  session_date: string;
  time_slot: string;
  session_complete: boolean;
  integrity_score: number | null;
}

interface RelationshipWithScore {
  id: string;
  name: string;
  rank: number;
  category: string;
  intimacy: boolean;
  avgScore: number | null;
  trend: 'up' | 'down' | 'flat' | null;
}

function getRankColor(rank: number): string {
  if (rank === 1) return '#FFD93D';
  if (rank === 2) return '#FF6B6B';
  if (rank === 3) return '#00C896';
  return '#4A5568';
}

export function DataHubScreen({ profile }: Props) {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [relationships, setRelationships] = useState<RelationshipWithScore[]>([]);

  const idioma = profile.idioma ?? 'EN';
  const L = (en: string, es: string) => idioma === 'ES' ? es : en;

  const daysOfData = getDaysOfData(profile);
  let portfolioValue = daysOfData * 0.15;
  if (profile.height_cm && profile.weight_kg && profile.exercise_frequency) portfolioValue += 5;
  if (profile.known_conditions?.length && profile.current_medications?.length) portfolioValue += 8;
  if (profile.blood_type) portfolioValue += 3;
  if (profile.fecha_nacimiento) {
    const age = new Date().getFullYear() - new Date(profile.fecha_nacimiento).getFullYear();
    if (age >= 40) portfolioValue *= 1.3;
  }
  if (profile.wearable_connected) portfolioValue += 10;
  portfolioValue = Math.max(1.0, portfolioValue);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('conversation_sessions')
        .select('session_date, time_slot, session_complete, integrity_score')
        .eq('user_id', profile.id)
        .order('session_date', { ascending: false })
        .limit(30);

      setSessions((data ?? []) as SessionRow[]);
      setLoading(false);
    }
    load();
  }, [profile.id]);

  useEffect(() => {
    async function loadRelationships() {
      const { data: rels } = await supabase
        .from('relationships')
        .select('id, name, rank, category, intimacy')
        .eq('user_id', profile.id)
        .order('rank', { ascending: true });

      if (!rels || rels.length === 0) { setRelationships([]); return; }

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

      const enriched = await Promise.all(rels.map(async (rel) => {
        const { data: recent } = await supabase
          .from('relationship_interactions')
          .select('connection_score, interaction_date')
          .eq('relationship_id', rel.id)
          .gte('interaction_date', sevenDaysAgo.toISOString().split('T')[0]);

        const { data: previous } = await supabase
          .from('relationship_interactions')
          .select('connection_score, interaction_date')
          .eq('relationship_id', rel.id)
          .gte('interaction_date', fourteenDaysAgo.toISOString().split('T')[0])
          .lt('interaction_date', sevenDaysAgo.toISOString().split('T')[0]);

        const avgRecent = recent && recent.length > 0
          ? recent.reduce((s: number, r: { connection_score: number | null }) => s + (r.connection_score ?? 0), 0) / recent.length
          : null;

        const avgPrevious = previous && previous.length > 0
          ? previous.reduce((s: number, r: { connection_score: number | null }) => s + (r.connection_score ?? 0), 0) / previous.length
          : null;

        let trend: 'up' | 'down' | 'flat' | null = null;
        if (avgRecent !== null && avgPrevious !== null) {
          if (avgRecent > avgPrevious + 0.5) trend = 'up';
          else if (avgRecent < avgPrevious - 0.5) trend = 'down';
          else trend = 'flat';
        }

        return {
          ...rel,
          avgScore: avgRecent !== null ? Math.round(avgRecent * 10) / 10 : null,
          trend,
        } as RelationshipWithScore;
      }));

      setRelationships(enriched);
    }
    loadRelationships();
  }, [profile.id]);

  // Build streak calendar — last 14 days
  const today = new Date();
  const last14 = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (13 - i));
    return d.toISOString().split('T')[0];
  });
  const sessionDates = new Set(sessions.map(s => s.session_date));

  const slotEmoji: Record<string, string> = {
    morning: '☀️',
    afternoon: '🌤',
    midday: '🌤',
    evening: '🌆',
    night: '🌙',
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      maxWidth: '100vw',
      background: '#0A0A1A',
      fontFamily: 'Inter, system-ui, sans-serif',
      paddingBottom: 100,
      overflowX: 'hidden',
      overflowY: 'auto',
    }}>
      {/* Header */}
      <div style={{
        width: '100%',
        maxWidth: 430,
        margin: '0 auto',
        padding: '52px 24px 20px',
      }}>
        <h1 style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '1.2rem',
          fontWeight: 700,
          color: 'white',
          margin: 0,
        }}>
          {L('Data Hub', 'Centro de Datos')}
        </h1>
      </div>

      {/* Portfolio value card */}
      <div style={{
        width: '100%',
        maxWidth: 430,
        margin: '0 auto',
        padding: '0 24px 24px',
      }}>
        <div style={{
          background: 'linear-gradient(135deg, rgba(255,217,61,0.08) 0%, rgba(0,200,150,0.06) 100%)',
          border: '1px solid rgba(255,217,61,0.2)',
          borderRadius: 16,
          padding: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <p style={{ color: '#4A5568', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 6px' }}>
              {L('Portfolio value', 'Valor del portafolio')}
            </p>
            <div style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '2rem',
              fontWeight: 700,
              color: '#FFD93D',
              lineHeight: 1,
            }}>
              ${portfolioValue.toFixed(2)}
            </div>
            <p style={{ color: '#4A5568', fontSize: 11, margin: '4px 0 0' }}>
              {daysOfData} {L('days · $0.15/day', 'días · $0.15/día')}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            {daysOfData < 30 ? (
              <>
                <div style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '1.4rem',
                  fontWeight: 700,
                  color: '#4A5568',
                }}>
                  {30 - daysOfData}
                </div>
                <div style={{ color: '#4A5568', fontSize: 10, letterSpacing: '0.08em' }}>
                  {L('DAYS TO UNLOCK', 'DÍAS PARA ACTIVAR')}
                </div>
              </>
            ) : (
              <>
                <div style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '1.4rem',
                  fontWeight: 700,
                  color: '#00C896',
                }}>
                  ✓
                </div>
                <div style={{ color: '#00C896', fontSize: 10, letterSpacing: '0.08em' }}>
                  {L('ACTIVE', 'ACTIVO')}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div style={{ width: '100%', maxWidth: 430, margin: '0 auto', height: 1, background: 'rgba(255,255,255,0.05)' }} />

      {/* Streak timeline */}
      <div style={{ width: '100%', maxWidth: 430, margin: '0 auto', padding: '24px 24px 20px' }}>
        <p style={{ color: '#4A5568', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 14px' }}>
          {L('Last 14 days', 'Últimos 14 días')}
        </p>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(14, 1fr)',
          gap: 4,
        }}>
          {last14.map(date => {
            const hasData = sessionDates.has(date);
            const dayNum = new Date(date).getDate();
            return (
              <div key={date} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <div style={{
                  width: '100%',
                  aspectRatio: '1',
                  borderRadius: 6,
                  background: hasData ? '#00C896' : 'rgba(255,255,255,0.05)',
                  border: hasData ? 'none' : '1px solid rgba(255,255,255,0.06)',
                }} />
                <span style={{ fontSize: 8, color: '#4A5568', fontFamily: 'JetBrains Mono, monospace' }}>
                  {dayNum}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ width: '100%', maxWidth: 430, margin: '0 auto', height: 1, background: 'rgba(255,255,255,0.05)' }} />

      {/* Session log */}
      <div style={{ width: '100%', maxWidth: 430, margin: '0 auto', padding: '24px 24px 20px' }}>
        <p style={{ color: '#4A5568', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 14px' }}>
          {L('Session log', 'Registro de sesiones')}
        </p>

        {loading ? (
          <div style={{ color: '#4A5568', fontSize: 13 }}>
            {L('Loading...', 'Cargando...')}
          </div>
        ) : sessions.length === 0 ? (
          <div style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 14,
            padding: '32px 20px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', margin: '0 0 6px' }}>
              {L('No sessions yet', 'Sin sesiones aún')}
            </p>
            <p style={{ color: '#4A5568', fontSize: 12, margin: 0 }}>
              {L('Complete your first session with Jules to start building data.', 'Completa tu primera sesión con Jules para comenzar a construir datos.')}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sessions.slice(0, 14).map((s, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 10,
                  padding: '10px 14px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 16 }}>{slotEmoji[s.time_slot] ?? '🕐'}</span>
                  <div>
                    <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
                      {new Date(s.session_date + 'T12:00:00').toLocaleDateString(
                        idioma === 'ES' ? 'es-DO' : 'en-US',
                        { month: 'short', day: 'numeric' }
                      )}
                    </div>
                    <div style={{ color: '#4A5568', fontSize: 11, textTransform: 'capitalize' }}>
                      {s.time_slot}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {s.integrity_score != null && (
                    <span style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: 12,
                      color: s.integrity_score >= 80 ? '#00C896' : '#FFD93D',
                    }}>
                      {s.integrity_score}%
                    </span>
                  )}
                  <span style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: s.session_complete ? '#00C896' : '#4A5568',
                    display: 'inline-block',
                  }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ width: '100%', maxWidth: 430, margin: '0 auto', height: 1, background: 'rgba(255,255,255,0.05)' }} />

      {/* My Circle */}
      <div style={{ width: '100%', maxWidth: 430, margin: '0 auto', padding: '24px 24px 20px' }}>
        <p style={{ color: '#4A5568', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 16px' }}>
          {L('My Circle', 'Mi Círculo')}
        </p>

        {relationships.length === 0 ? (
          <div style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 14, padding: '28px 20px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>👥</div>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', margin: '0 0 4px' }}>
              {L(
                'Jules will start learning about the people in your life after your third session.',
                'Jules comenzará a aprender sobre las personas en tu vida después de tu tercera sesión.'
              )}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {relationships.map(rel => (
              <div key={rel.id} style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 12, padding: '14px 16px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: `${getRankColor(rel.rank)}22`,
                    border: `2px solid ${getRankColor(rel.rank)}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 16, fontWeight: 700,
                    color: getRankColor(rel.rank),
                  }}>
                    {rel.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ color: 'white', fontSize: 14, fontWeight: 600 }}>{rel.name}</div>
                    <div style={{ color: '#4A5568', fontSize: 11 }}>
                      {rel.category}{rel.intimacy ? ' · ♥' : ''}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {rel.avgScore !== null && (
                    <div style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: 18, fontWeight: 700,
                      color: rel.avgScore >= 7 ? '#00C896' : rel.avgScore >= 4 ? '#FFD93D' : '#FF6B6B',
                    }}>
                      {rel.avgScore}
                    </div>
                  )}
                  {rel.trend === 'up'   && <span style={{ color: '#00C896', fontSize: 16 }}>↑</span>}
                  {rel.trend === 'down' && <span style={{ color: '#FF6B6B', fontSize: 16 }}>↓</span>}
                  {rel.trend === 'flat' && <span style={{ color: '#4A5568', fontSize: 16 }}>→</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ width: '100%', maxWidth: 430, margin: '0 auto', height: 1, background: 'rgba(255,255,255,0.05)' }} />

      {/* Research Studies (empty state) */}
      <div style={{ width: '100%', maxWidth: 430, margin: '0 auto', padding: '24px 24px 20px' }}>
        <p style={{ color: '#4A5568', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 14px' }}>
          {L('Research Studies', 'Estudios de Investigación')}
        </p>
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 14,
          padding: '28px 20px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>🔬</div>
          {daysOfData < 30 ? (
            <>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', margin: '0 0 4px' }}>
                {L(`Unlocks at Day 30`, `Se activa el Día 30`)}
              </p>
              <p style={{ color: '#4A5568', fontSize: 11, margin: 0 }}>
                {L(
                  `${30 - daysOfData} more days until your data becomes research-eligible.`,
                  `${30 - daysOfData} días más hasta que tus datos sean aptos para investigación.`
                )}
              </p>
            </>
          ) : (
            <>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', margin: '0 0 4px' }}>
                {L('No active studies', 'Sin estudios activos')}
              </p>
              <p style={{ color: '#4A5568', fontSize: 11, margin: 0 }}>
                {L(
                  'Your data is research-eligible. Studies will appear here when they match your profile.',
                  'Tus datos son aptos para investigación. Los estudios aparecerán aquí cuando coincidan con tu perfil.'
                )}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
