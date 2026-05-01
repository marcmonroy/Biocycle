import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Profile } from '../lib/supabase';
import { getDaysOfData } from '../lib/phaseEngine';
import { computePortfolioMetrics } from '../lib/portfolioValue';
import { colors, fonts } from '../lib/tokens';

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
  if (rank === 1) return colors.amber;
  if (rank === 2) return colors.danger;
  if (rank === 3) return colors.success;
  return colors.boneFaint;
}

export function DataHubScreen({ profile }: Props) {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [relationships, setRelationships] = useState<RelationshipWithScore[]>([]);
  const [portfolioValue, setPortfolioValue] = useState(0.10);
  const [qualityScore, setQualityScore] = useState(0);
  const [consistencyScore, setConsistencyScore] = useState(0);

  const idioma = profile.idioma ?? 'EN';
  const L = (en: string, es: string) => idioma === 'ES' ? es : en;

  const daysOfData = getDaysOfData(profile);

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
    computePortfolioMetrics(profile).then(metrics => {
      setPortfolioValue(metrics.value);
      setQualityScore(metrics.qualityScore);
      setConsistencyScore(metrics.consistencyScore);
    });
  }, [profile.id]); // eslint-disable-line react-hooks/exhaustive-deps

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
      background: colors.midnight,
      fontFamily: fonts.body,
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <img src="/favicon.svg" alt="" style={{ width: 20, height: 20 }} />
          <span style={{ fontFamily: fonts.body, fontSize: 12, fontWeight: 500, color: colors.boneFaint, letterSpacing: '0.04em' }}>biocycle</span>
        </div>
        <h1 style={{
          fontFamily: fonts.display,
          fontSize: '1.3rem',
          fontWeight: 300,
          color: colors.bone,
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
          background: 'linear-gradient(135deg, rgba(239,159,39,0.08) 0%, rgba(93,202,165,0.06) 100%)',
          border: '1px solid rgba(239,159,39,0.2)',
          borderRadius: 16,
          padding: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <p style={{ color: colors.boneFaint, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 6px' }}>
              {L('Portfolio value', 'Valor del portafolio')}
            </p>
            <div style={{
              fontFamily: fonts.mono,
              fontSize: '2rem',
              fontWeight: 700,
              color: colors.amber,
              lineHeight: 1,
            }}>
              ${portfolioValue.toFixed(2)}
            </div>
            <p style={{ color: colors.boneFaint, fontSize: 11, margin: '4px 0 0' }}>
              {daysOfData} {L('days', 'días')} · {L('Quality', 'Calidad')} {qualityScore}% · {L('Consistency', 'Consistencia')} {consistencyScore}%
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            {daysOfData < 30 ? (
              <>
                <div style={{
                  fontFamily: fonts.mono,
                  fontSize: '1.4rem',
                  fontWeight: 700,
                  color: colors.boneFaint,
                }}>
                  {30 - daysOfData}
                </div>
                <div style={{ color: colors.boneFaint, fontSize: 10, letterSpacing: '0.08em' }}>
                  {L('DAYS TO UNLOCK', 'DÍAS PARA ACTIVAR')}
                </div>
              </>
            ) : (
              <>
                <div style={{
                  fontFamily: fonts.mono,
                  fontSize: '1.4rem',
                  fontWeight: 700,
                  color: colors.success,
                }}>
                  ✓
                </div>
                <div style={{ color: colors.success, fontSize: 10, letterSpacing: '0.08em' }}>
                  {L('ACTIVE', 'ACTIVO')}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div style={{ width: '100%', maxWidth: 430, margin: '0 auto', height: 1, background: 'rgba(245,242,238,0.05)' }} />

      {/* Streak timeline */}
      <div style={{ width: '100%', maxWidth: 430, margin: '0 auto', padding: '24px 24px 20px' }}>
        <p style={{ color: colors.boneFaint, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 14px' }}>
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
                  background: hasData ? colors.success : 'rgba(245,242,238,0.05)',
                  border: hasData ? 'none' : '1px solid rgba(245,242,238,0.06)',
                }} />
                <span style={{ fontSize: 8, color: colors.boneFaint, fontFamily: fonts.mono }}>
                  {dayNum}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ width: '100%', maxWidth: 430, margin: '0 auto', height: 1, background: 'rgba(245,242,238,0.05)' }} />

      {/* Session log */}
      <div style={{ width: '100%', maxWidth: 430, margin: '0 auto', padding: '24px 24px 20px' }}>
        <p style={{ color: colors.boneFaint, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 14px' }}>
          {L('Session log', 'Registro de sesiones')}
        </p>

        {loading ? (
          <div style={{ color: colors.boneFaint, fontSize: 13 }}>
            {L('Loading...', 'Cargando...')}
          </div>
        ) : sessions.length === 0 ? (
          <div style={{
            background: 'rgba(245,242,238,0.02)',
            border: '1px solid rgba(245,242,238,0.06)',
            borderRadius: 14,
            padding: '32px 20px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
            <p style={{ color: colors.boneFaint, fontSize: '0.9rem', margin: '0 0 6px' }}>
              {L('No sessions yet', 'Sin sesiones aún')}
            </p>
            <p style={{ color: colors.boneFaint, fontSize: 12, margin: 0 }}>
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
                  background: 'rgba(245,242,238,0.02)',
                  border: '1px solid rgba(245,242,238,0.06)',
                  borderRadius: 10,
                  padding: '10px 14px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 16 }}>{slotEmoji[s.time_slot] ?? '🕐'}</span>
                  <div>
                    <div style={{ color: colors.boneDim, fontSize: 13 }}>
                      {new Date(s.session_date + 'T12:00:00').toLocaleDateString(
                        idioma === 'ES' ? 'es-DO' : 'en-US',
                        { month: 'short', day: 'numeric' }
                      )}
                    </div>
                    <div style={{ color: colors.boneFaint, fontSize: 11, textTransform: 'capitalize' }}>
                      {s.time_slot}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {s.integrity_score != null && (
                    <span style={{
                      fontFamily: fonts.mono,
                      fontSize: 12,
                      color: s.integrity_score >= 80 ? colors.success : colors.amber,
                    }}>
                      {s.integrity_score}%
                    </span>
                  )}
                  <span style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: s.session_complete ? colors.success : colors.boneFaint,
                    display: 'inline-block',
                  }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ width: '100%', maxWidth: 430, margin: '0 auto', height: 1, background: 'rgba(245,242,238,0.05)' }} />

      {/* My Circle */}
      <div style={{ width: '100%', maxWidth: 430, margin: '0 auto', padding: '24px 24px 20px' }}>
        <p style={{ color: colors.boneFaint, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 16px' }}>
          {L('My Circle', 'Mi Círculo')}
        </p>

        {relationships.length === 0 ? (
          <div style={{
            background: 'rgba(245,242,238,0.02)',
            border: '1px solid rgba(245,242,238,0.06)',
            borderRadius: 14, padding: '28px 20px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>👥</div>
            <p style={{ color: colors.boneFaint, fontSize: '0.85rem', margin: '0 0 4px' }}>
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
                background: 'rgba(245,242,238,0.03)',
                border: '1px solid rgba(245,242,238,0.07)',
                borderRadius: 12, padding: '14px 16px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: `${getRankColor(rel.rank)}22`,
                    border: `2px solid ${getRankColor(rel.rank)}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: fonts.mono,
                    fontSize: 16, fontWeight: 700,
                    color: getRankColor(rel.rank),
                  }}>
                    {rel.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ color: colors.bone, fontSize: 14, fontWeight: 600 }}>{rel.name}</div>
                    <div style={{ color: colors.boneFaint, fontSize: 11 }}>
                      {rel.category}{rel.intimacy ? ' · ♥' : ''}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {rel.avgScore !== null && (
                    <div style={{
                      fontFamily: fonts.mono,
                      fontSize: 18, fontWeight: 700,
                      color: rel.avgScore >= 7 ? colors.success : rel.avgScore >= 4 ? colors.amber : colors.danger,
                    }}>
                      {rel.avgScore}
                    </div>
                  )}
                  {rel.trend === 'up'   && <span style={{ color: colors.success, fontSize: 16 }}>↑</span>}
                  {rel.trend === 'down' && <span style={{ color: colors.danger, fontSize: 16 }}>↓</span>}
                  {rel.trend === 'flat' && <span style={{ color: colors.boneFaint, fontSize: 16 }}>→</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ width: '100%', maxWidth: 430, margin: '0 auto', height: 1, background: 'rgba(245,242,238,0.05)' }} />

      {/* Research Studies */}
      <div style={{ width: '100%', maxWidth: 430, margin: '0 auto', padding: '24px 24px 20px' }}>
        <p style={{ color: colors.boneFaint, fontSize: 10, letterSpacing: '0.12em',
          textTransform: 'uppercase', margin: '0 0 14px' }}>
          {L('Research Studies', 'Estudios de Investigación')}
        </p>

        {daysOfData < 30 ? (
          <div style={{
            background: 'rgba(245,242,238,0.02)',
            border: '1px solid rgba(245,242,238,0.06)',
            borderRadius: 14, padding: '24px 20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: 'rgba(245,242,238,0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18,
              }}>🔬</div>
              <div>
                <p style={{ color: colors.boneFaint, fontSize: 13, fontWeight: 600, margin: 0 }}>
                  {L('Research Pool', 'Banco de Investigación')}
                </p>
                <p style={{ color: colors.boneFaint, fontSize: 11, margin: '2px 0 0' }}>
                  {L(`${30 - daysOfData} days until eligible`, `${30 - daysOfData} días para ser elegible`)}
                </p>
              </div>
            </div>
            <div style={{ height: 4, background: 'rgba(245,242,238,0.06)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${Math.min(100, (daysOfData / 30) * 100)}%`,
                background: colors.boneFaint,
                borderRadius: 2,
                transition: 'width 0.3s',
              }} />
            </div>
            <p style={{ color: colors.boneFaint, fontSize: 11, margin: '8px 0 0' }}>
              {L(
                'Complete 30 days of check-ins to unlock research participation and start earning.',
                'Completa 30 días de check-ins para desbloquear la participación en investigación.'
              )}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Eligibility badge */}
            <div style={{
              background: 'rgba(93,202,165,0.06)',
              border: '1px solid rgba(93,202,165,0.2)',
              borderRadius: 14, padding: '16px 20px',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: 'rgba(93,202,165,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18,
              }}>✓</div>
              <div>
                <p style={{ color: colors.success, fontSize: 13, fontWeight: 600, margin: 0 }}>
                  {L('Research Eligible', 'Elegible para Investigación')}
                </p>
                <p style={{ color: colors.boneFaint, fontSize: 11, margin: '2px 0 0' }}>
                  {L('Your data is in the research pool.', 'Tus datos están en el banco de investigación.')}
                </p>
              </div>
            </div>

            {/* Trading Floor activation status */}
            <div style={{
              background: 'rgba(239,159,39,0.04)',
              border: '1px solid rgba(239,159,39,0.12)',
              borderRadius: 14, padding: '16px 20px',
            }}>
              <p style={{ color: colors.amber, fontSize: 12, fontWeight: 600, margin: '0 0 4px' }}>
                {L('Trading Floor', 'Piso de Negociación')}
              </p>
              <p style={{ color: colors.boneFaint, fontSize: 12, margin: '0 0 10px' }}>
                {L(
                  'Activates at 500 active traders. Studies will appear here when researchers post opportunities matching your profile.',
                  'Se activa en 500 traders activos. Los estudios aparecerán aquí cuando los investigadores publiquen oportunidades que coincidan con tu perfil.'
                )}
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: colors.boneFaint, fontSize: 11 }}>
                  {L('Active traders', 'Traders activos')}
                </span>
                <span style={{ color: colors.amber, fontSize: 11, fontFamily: fonts.mono }}>
                  — / 500
                </span>
              </div>
              <div style={{ height: 3, background: 'rgba(245,242,238,0.06)', borderRadius: 2 }}>
                <div style={{ height: '100%', width: '0%', background: colors.amber, borderRadius: 2 }} />
              </div>
            </div>

            {/* No active studies placeholder */}
            <div style={{
              background: 'rgba(245,242,238,0.02)',
              border: '1px solid rgba(245,242,238,0.06)',
              borderRadius: 14, padding: '20px',
              textAlign: 'center',
            }}>
              <p style={{ color: colors.boneFaint, fontSize: 13, margin: '0 0 4px' }}>
                {L('No active studies', 'Sin estudios activos')}
              </p>
              <p style={{ color: colors.boneFaint, fontSize: 11, margin: 0 }}>
                {L(
                  'You will receive a WhatsApp notification when a study matches your profile.',
                  'Recibirás una notificación de WhatsApp cuando un estudio coincida con tu perfil.'
                )}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
