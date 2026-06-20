import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Profile, UserState, TierLimits, CompatibilityConnection } from '../lib/supabase';
import { getCompatibilityTierAccess } from '../lib/supabase';
import {
  computeCompatibility,
  COMPATIBILITY_TYPES,
} from '../lib/compatibilityEngine';
import type { CompatibilityType, CompatibilityResult } from '../lib/compatibilityEngine';
import { colors, fonts } from '../lib/tokens';

interface Props {
  profile: Profile;
  userState: UserState | null;
  tierLimits: TierLimits;
}

// ── Sub-components ─────────────────────────────────────────────────────────

function StatusDot({ status }: { status: CompatibilityConnection['status'] }) {
  const dotColor =
    status === 'accepted' ? '#00c896' :
    status === 'pending'  ? colors.amber :
    status === 'declined' ? '#ef4444' : colors.boneFaint;
  return (
    <span style={{
      display: 'inline-block',
      width: 8, height: 8,
      borderRadius: '50%',
      background: dotColor,
      flexShrink: 0,
    }} />
  );
}

function ScoreArc({ score, color, label }: { score: number; color: string; label: string }) {
  const r = 44;
  const cx = 56, cy = 56;
  const circ = 2 * Math.PI * r;
  const arc = circ * (score / 100);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <svg width={112} height={112} viewBox="0 0 112 112">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={10} />
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={color}
          strokeWidth={10}
          strokeDasharray={`${arc} ${circ - arc}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
        <text x={cx} y={cy + 6} textAnchor="middle" fill={colors.bone} fontSize={22} fontFamily={fonts.display} fontWeight={300}>
          {score}
        </text>
      </svg>
      <span style={{ fontSize: 11, color: colors.boneFaint, fontFamily: fonts.body, textAlign: 'center' }}>{label}</span>
    </div>
  );
}

function DayBar({
  result,
  idioma,
}: {
  result: CompatibilityResult;
  idioma: 'EN' | 'ES';
}) {
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {result.days.map((day, i) => {
        const pct = day.sharedScore;
        const barColor =
          day.isSharedPeak ? '#00c896' :
          day.isSharedRisk ? '#ef4444' :
          pct >= 50        ? colors.amber : colors.boneFaint;
        const label = idioma === 'ES' ? day.dateLabelES : day.dateLabel;
        const insight = idioma === 'ES' ? day.insightES : day.insight;
        const isOpen = expanded === i;

        return (
          <div key={i}>
            <button
              onClick={() => setExpanded(isOpen ? null : i)}
              style={{
                width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0',
              }}
            >
              <span style={{ width: 70, fontSize: 11, color: colors.boneFaint, fontFamily: fonts.body, textAlign: 'left', flexShrink: 0 }}>
                {label}
              </span>
              <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                <div style={{
                  width: `${pct}%`, height: '100%',
                  borderRadius: 3, background: barColor,
                  transition: 'width 0.5s ease',
                }} />
              </div>
              <span style={{ width: 30, fontSize: 11, color: colors.bone, fontFamily: fonts.body, textAlign: 'right', flexShrink: 0 }}>
                {pct}
              </span>
              {day.isSharedPeak && <span style={{ fontSize: 10 }}>★</span>}
            </button>
            {isOpen && (
              <div style={{ padding: '4px 0 6px 78px', fontSize: 11, color: colors.boneFaint, fontFamily: fonts.body, lineHeight: 1.5 }}>
                {insight}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function NewInviteForm({
  profile,
  allowedTypes,
  onSent,
  onCancel,
  idioma,
}: {
  profile: Profile;
  allowedTypes: CompatibilityType[];
  onSent: () => void;
  onCancel: () => void;
  idioma: 'EN' | 'ES';
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [type, setType] = useState<CompatibilityType>(allowedTypes[0] ?? 'vibe');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const ES = idioma === 'ES';

  async function handleSend() {
    if (!name.trim()) { setError(idioma === 'ES' ? 'Ingresa un nombre' : 'Enter a name'); return; }

    // Strip everything except digits
    const digits = phone.replace(/\D/g, '');

    // Handle international formats — strip leading 1 if 11 digits starting with 1
    const coreDigits = digits.startsWith('1') && digits.length === 11
      ? digits.slice(1) : digits;

    if (coreDigits.length < 10) {
      setError(idioma === 'ES' ? 'Número inválido (mínimo 10 dígitos)' : 'Invalid number (minimum 10 digits)');
      return;
    }

    setSending(true); setError('');
    try {
      // Always normalize to E.164 with +1 prefix for consistency with stored profiles
      const normalized = `+1${coreDigits}`;

      const { error: insErr } = await supabase.from('compatibility_connections').insert({
        user_a_id: profile.id,
        invited_phone: normalized,
        invited_name: name.trim(),
        type,
        status: 'pending',
      });
      if (insErr) throw insErr;

      // Send WhatsApp invite
      const typeConfig = COMPATIBILITY_TYPES.find(t => t.id === type)!;
      const senderName = profile.nombre ?? (ES ? 'Tu contacto' : 'Your contact');
      const msgEN = `${senderName} wants to measure your *${typeConfig.label}* compatibility on BioCycle.\n\nReply *YES* to accept or *NO* to decline.\n\nNot on BioCycle yet? Join free: https://biocycle.app`;
      const msgES = `${senderName} quiere medir tu compatibilidad de *${typeConfig.labelES}* en BioCycle.\n\nResponde *SÍ* para aceptar o *NO* para rechazar.\n\n¿Aún no estás en BioCycle? Únete gratis: https://biocycle.app`;

      await fetch('/api/send-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'compatibility_invite', to: normalized, teaserText: ES ? msgES : msgEN }),
      });

      onSent();
    } catch (e: any) {
      setError(e.message ?? (ES ? 'Error al enviar.' : 'Failed to send.'));
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      borderRadius: 12,
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
    }}>
      <span style={{ fontSize: 13, color: colors.bone, fontFamily: fonts.body, fontWeight: 600 }}>
        {ES ? 'Nueva invitación' : 'New invitation'}
      </span>

      {/* Type selector */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {COMPATIBILITY_TYPES.map(t => {
          const locked = !allowedTypes.includes(t.id);
          const isSelected = type === t.id;
          return (
            <button
              key={t.id}
              onClick={() => !locked && setType(t.id)}
              disabled={locked}
              style={{
                padding: '5px 10px',
                borderRadius: 20,
                border: `1px solid ${isSelected ? colors.amber : 'rgba(255,255,255,0.15)'}`,
                background: isSelected ? 'rgba(239,159,39,0.15)' : 'none',
                color: locked ? colors.boneFaint : isSelected ? colors.amber : colors.bone,
                fontSize: 11,
                fontFamily: fonts.body,
                cursor: locked ? 'default' : 'pointer',
                opacity: locked ? 0.4 : 1,
              }}
            >
              {t.icon} {ES ? t.labelES : t.label}
            </button>
          );
        })}
      </div>

      <input
        type="text"
        placeholder={ES ? 'Nombre del contacto' : 'Contact name'}
        value={name}
        onChange={e => setName(e.target.value)}
        style={{
          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 8, padding: '9px 12px', color: colors.bone,
          fontFamily: fonts.body, fontSize: 13, outline: 'none',
        }}
      />
      <input
        type="tel"
        placeholder={ES ? 'WhatsApp (+52...)' : 'WhatsApp (+1...)'}
        value={phone}
        onChange={e => setPhone(e.target.value)}
        style={{
          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 8, padding: '9px 12px', color: colors.bone,
          fontFamily: fonts.body, fontSize: 13, outline: 'none',
        }}
      />

      {error && <span style={{ fontSize: 11, color: '#ef4444', fontFamily: fonts.body }}>{error}</span>}

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={onCancel}
          style={{
            flex: 1, padding: '10px 0', borderRadius: 8,
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
            color: colors.boneFaint, fontFamily: fonts.body, fontSize: 13, cursor: 'pointer',
          }}
        >
          {ES ? 'Cancelar' : 'Cancel'}
        </button>
        <button
          onClick={handleSend}
          disabled={sending}
          style={{
            flex: 2, padding: '10px 0', borderRadius: 8,
            background: sending ? 'rgba(239,159,39,0.3)' : colors.amber,
            border: 'none', color: '#042C53',
            fontFamily: fonts.body, fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          {sending ? (ES ? 'Enviando...' : 'Sending...') : (ES ? 'Enviar invitación' : 'Send invite')}
        </button>
      </div>
    </div>
  );
}

function CompatibilityDetail({
  conn,
  profile,
  tierLimits,
  idioma,
  onClose,
}: {
  conn: CompatibilityConnection;
  profile: Profile;
  tierLimits: TierLimits;
  idioma: 'EN' | 'ES';
  onClose: () => void;
}) {
  const [result, setResult] = useState<CompatibilityResult | null>(null);
  const [loading, setLoading] = useState(true);
  const ES = idioma === 'ES';

  useEffect(() => {
    if (!conn.partner_profile) { setLoading(false); return; }
    computeCompatibility(profile, conn.partner_profile, conn.type, tierLimits.forecastDays)
      .then(r => { setResult(r); setLoading(false); })
      .catch(() => setLoading(false));
  }, [conn, profile, tierLimits.forecastDays]);

  const typeConfig = COMPATIBILITY_TYPES.find(t => t.id === conn.type)!;
  const typeLabel = ES ? typeConfig.labelES : typeConfig.label;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          onClick={onClose}
          style={{
            background: 'none', border: 'none', color: colors.boneFaint,
            cursor: 'pointer', fontSize: 18, padding: 0, lineHeight: 1,
          }}
        >
          ←
        </button>
        <span style={{ fontSize: 14, color: colors.bone, fontFamily: fonts.body, fontWeight: 600 }}>
          {conn.invited_name} · {typeConfig.icon} {typeLabel}
        </span>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: 32, color: colors.boneFaint, fontSize: 13, fontFamily: fonts.body }}>
          {ES ? 'Calculando sincronía...' : 'Computing sync...'}
        </div>
      )}

      {!loading && !result && (
        <div style={{ textAlign: 'center', padding: 32, color: colors.boneFaint, fontSize: 13, fontFamily: fonts.body }}>
          {ES ? 'No hay datos suficientes aún.' : 'Not enough data yet.'}
        </div>
      )}

      {!loading && result && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-around', padding: '8px 0' }}>
            <ScoreArc
              score={result.todayScore}
              color={result.overallColor}
              label={ES ? 'Hoy' : 'Today'}
            />
            <ScoreArc
              score={result.weekAverage}
              color={result.overallColor}
              label={ES ? `Promedio ${tierLimits.forecastDays}d` : `${tierLimits.forecastDays}d avg`}
            />
          </div>

          <div style={{
            padding: '10px 14px',
            background: 'rgba(255,255,255,0.04)',
            borderRadius: 10,
            fontSize: 12,
            color: result.overallColor,
            fontFamily: fonts.body,
            textAlign: 'center',
          }}>
            {ES ? result.overallLabelES : result.overallLabel}
            {result.bestDayLabel !== '—' && (
              <span style={{ color: colors.boneFaint }}>
                {' · '}{ES ? 'Mejor día:' : 'Best day:'} {ES ? result.bestDayLabelES : result.bestDayLabel}
              </span>
            )}
          </div>

          <DayBar result={result} idioma={idioma} />
        </>
      )}
    </div>
  );
}

function ConnectionCard({
  conn,
  idioma,
  onSelect,
}: {
  conn: CompatibilityConnection;
  idioma: 'EN' | 'ES';
  onSelect: () => void;
}) {
  const ES = idioma === 'ES';
  const typeConfig = COMPATIBILITY_TYPES.find(t => t.id === conn.type)!;
  const typeLabel = ES ? typeConfig.labelES : typeConfig.label;

  const statusLabel =
    conn.status === 'accepted' ? (ES ? 'Activo' : 'Active') :
    conn.status === 'pending'  ? (ES ? 'Pendiente' : 'Pending') :
    conn.status === 'declined' ? (ES ? 'Rechazado' : 'Declined') :
    (ES ? 'Expirado' : 'Expired');

  return (
    <button
      onClick={conn.status === 'accepted' ? onSelect : undefined}
      disabled={conn.status !== 'accepted'}
      style={{
        width: '100%', textAlign: 'left',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12, padding: '12px 14px',
        display: 'flex', alignItems: 'center', gap: 10,
        cursor: conn.status === 'accepted' ? 'pointer' : 'default',
      }}
    >
      <StatusDot status={conn.status} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontSize: 13, color: colors.bone, fontFamily: fonts.body, fontWeight: 600 }}>
          {conn.invited_name}
        </span>
        <span style={{ fontSize: 11, color: colors.boneFaint, fontFamily: fonts.body }}>
          {typeConfig.icon} {typeLabel} · {statusLabel}
        </span>
      </div>
      {conn.status === 'accepted' && (
        <span style={{ color: colors.boneFaint, fontSize: 14 }}>›</span>
      )}
    </button>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────

export function CompatibilityScreen({ profile, userState: _userState, tierLimits }: Props) {
  const [connections, setConnections] = useState<CompatibilityConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedConn, setSelectedConn] = useState<CompatibilityConnection | null>(null);

  const idioma = profile.idioma ?? 'EN';
  const ES = idioma === 'ES';
  const allowedTypes = getCompatibilityTierAccess(tierLimits);
  const maxConnections = tierLimits.compatibilityMax;
  const canAdd = connections.length < maxConnections && maxConnections > 0;

  useEffect(() => {
    loadConnections();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadConnections() {
    setLoading(true);
    const { data, error } = await supabase
      .from('compatibility_connections')
      .select('*')
      .eq('user_a_id', profile.id)
      .order('initiated_at', { ascending: false });

    if (error || !data) { setLoading(false); return; }

    // Enrich accepted connections with partner profile
    const enriched: CompatibilityConnection[] = await Promise.all(
      (data as CompatibilityConnection[]).map(async conn => {
        if (conn.status === 'accepted' && conn.user_b_id) {
          const { data: pData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', conn.user_b_id)
            .maybeSingle();
          return { ...conn, partner_profile: pData ?? null };
        }
        return conn;
      })
    );

    setConnections(enriched);
    setLoading(false);
  }

  // Pending incoming requests (where this user is user_b)
  const [incoming, setIncoming] = useState<CompatibilityConnection[]>([]);
  useEffect(() => {
    supabase
      .from('compatibility_connections')
      .select('*')
      .eq('user_b_id', profile.id)
      .eq('status', 'pending')
      .then(({ data }) => setIncoming((data as CompatibilityConnection[]) ?? []));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (selectedConn) {
    return (
      <div style={{
        minHeight: '100vh', background: colors.midnight,
        padding: '24px 16px 96px',
        fontFamily: fonts.body,
      }}>
        <CompatibilityDetail
          conn={selectedConn}
          profile={profile}
          tierLimits={tierLimits}
          idioma={idioma}
          onClose={() => setSelectedConn(null)}
        />
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh', background: colors.midnight,
      padding: '24px 16px 96px',
      fontFamily: fonts.body,
      display: 'flex', flexDirection: 'column', gap: 20,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{
            fontFamily: fonts.display, fontWeight: 300,
            fontSize: 22, color: colors.bone,
            margin: 0, letterSpacing: '-0.02em',
          }}>
            {ES ? 'Sincronía' : 'Sync'}
          </h2>
          <p style={{ fontSize: 12, color: colors.boneFaint, margin: '4px 0 0' }}>
            {ES ? 'Alineación biológica con tus contactos' : 'Biological alignment with your contacts'}
          </p>
        </div>
        {canAdd && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            style={{
              padding: '8px 14px', borderRadius: 20,
              background: 'rgba(239,159,39,0.15)',
              border: `1px solid ${colors.amber}`,
              color: colors.amber, fontSize: 12,
              fontFamily: fonts.body, cursor: 'pointer',
            }}
          >
            + {ES ? 'Nuevo' : 'New'}
          </button>
        )}
      </div>

      {/* Free tier locked */}
      {maxConnections === 0 && (
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 14, padding: 20,
          textAlign: 'center', display: 'flex',
          flexDirection: 'column', gap: 10, alignItems: 'center',
        }}>
          <span style={{ fontSize: 28 }}>◈</span>
          <span style={{ fontSize: 14, color: colors.bone, fontFamily: fonts.body }}>
            {ES ? 'Sincronía disponible en Standard y Premium' : 'Sync available on Standard and Premium'}
          </span>
          <span style={{ fontSize: 12, color: colors.boneFaint }}>
            {ES
              ? 'Compara tu pronóstico biológico con tus contactos y encuentra los mejores momentos compartidos.'
              : 'Compare your biological forecast with contacts and find your best shared windows.'
            }
          </span>
        </div>
      )}

      {/* Incoming pending requests */}
      {incoming.length > 0 && (
        <div style={{
          background: 'rgba(239,159,39,0.08)',
          border: `1px solid ${colors.amber}`,
          borderRadius: 12, padding: '12px 14px',
          fontSize: 12, color: colors.amber, fontFamily: fonts.body,
        }}>
          {incoming.length === 1
            ? (ES
                ? `${incoming[0].invited_name} te invitó a ver sincronía. Responde SÍ o NO por WhatsApp.`
                : `${incoming[0].invited_name} invited you to view sync. Reply YES or NO on WhatsApp.`)
            : (ES
                ? `${incoming.length} invitaciones pendientes. Responde SÍ o NO por WhatsApp.`
                : `${incoming.length} pending invitations. Reply YES or NO on WhatsApp.`)
          }
        </div>
      )}

      {/* New invite form */}
      {showForm && (
        <NewInviteForm
          profile={profile}
          allowedTypes={allowedTypes}
          idioma={idioma}
          onSent={() => { setShowForm(false); loadConnections(); }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Connection list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 32, color: colors.boneFaint, fontSize: 13 }}>
          {ES ? 'Cargando...' : 'Loading...'}
        </div>
      ) : connections.length === 0 && maxConnections > 0 ? (
        <div style={{
          textAlign: 'center', padding: 40,
          color: colors.boneFaint, fontSize: 13,
          display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center',
        }}>
          <span style={{ fontSize: 28 }}>◈</span>
          <span>{ES ? 'Sin conexiones aún' : 'No connections yet'}</span>
          <span style={{ fontSize: 11 }}>
            {ES ? 'Invita a alguien para ver su sincronía biológica.' : 'Invite someone to see your biological sync.'}
          </span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {connections.map(conn => (
            <ConnectionCard
              key={conn.id}
              conn={conn}
              idioma={idioma}
              onSelect={() => setSelectedConn(conn)}
            />
          ))}
          {connections.length >= maxConnections && maxConnections > 0 && !showForm && (
            <p style={{ fontSize: 11, color: colors.boneFaint, textAlign: 'center', margin: '4px 0 0' }}>
              {ES
                ? `Límite de ${maxConnections} conexiones en tu plan.`
                : `${maxConnections}-connection limit on your plan.`}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
