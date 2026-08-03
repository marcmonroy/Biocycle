import { useState, useEffect } from 'react';
import { normalizePhone } from '../lib/phone';
import { supabase } from '../lib/supabase';
import { API_BASE } from '../lib/apiBase';
import type { Profile, UserState, TierLimits, CompatibilityConnection } from '../lib/supabase';
import { getCompatibilityTierAccess } from '../lib/supabase';
import {
  computeCompatibility,
  COMPATIBILITY_TYPES,
} from '../lib/compatibilityEngine';
import type { CompatibilityType, CompatibilityResult } from '../lib/compatibilityEngine';
import { buildTypeCalendar, TYPE_VISUAL } from '../lib/compatibilityCalendar';
import { exportToCalendar } from '../lib/icsExport';
import { sendSystemPush } from '../services/pushNotifications';
import { sendWhatsAppInvite } from '../services/whatsapp';
import { CalendarGrid, type CalendarMark, type LegendEntry } from '../components/CalendarGrid';
import { getDaysOfData } from '../lib/phaseEngine';
import { colors, fonts } from '../lib/tokens';

interface Props {
  profile: Profile;
  userState: UserState | null;
  tierLimits: TierLimits;
}

// ── Sub-components ─────────────────────────────────────────────────────────


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

    const normalized = normalizePhone(phone);
    if (normalized.replace(/\D/g, '').length < 11) {
      setError(idioma === 'ES' ? 'Número inválido (mínimo 10 dígitos)' : 'Invalid number (minimum 10 digits)');
      return;
    }

    setSending(true); setError('');
    try {
      // ── Block check: silently refuse if recipient has sender blocked ──────
      const senderPhone = (profile as any).whatsapp_phone as string | null;
      if (senderPhone && normalized) {
        const { data: blockRow } = await supabase
          .from('compatibility_blocks')
          .select('id')
          .eq('blocker_phone', normalized)
          .eq('blocked_phone', senderPhone)
          .maybeSingle();
        if (blockRow) { onSent(); return; }
      }

      // ── Lookup: is the invited number already a registered user? ──────────
      let matchedId: string | null = null;
      let matchedProfile: { id: string } | null = null;
      try {
        const { data: mp } = await supabase
          .from('profiles')
          .select('id')
          .eq('whatsapp_phone', normalized)
          .maybeSingle();
        if (mp?.id && mp.id !== profile.id) {
          matchedId = mp.id;
          matchedProfile = mp;
        }
      } catch {
        // lookup failed — fall through to WhatsApp
      }

      // ── Insert invite row (set user_b_id for registered recipients) ───────
      const { error: insErr } = await supabase.from('compatibility_connections').insert({
        user_a_id:     profile.id,
        invited_phone: normalized,
        invited_name:  name.trim(),
        type,
        status:        'pending',
        ...(matchedProfile ? { user_b_id: matchedProfile.id } : {}),
      });
      if (insErr) throw insErr;

      if (matchedId) {
        // Registered user: push first; fall back to WhatsApp if no push token.
        try {
          const { data: prefs } = await supabase
            .from('notification_prefs')
            .select('compatibility_invites')
            .eq('user_id', matchedId)
            .maybeSingle();
          const enabled = prefs == null || prefs.compatibility_invites !== false;
          if (enabled) {
            const vis = TYPE_VISUAL[type];
            const senderDisplayName = profile.nombre ?? (ES ? 'Alguien' : 'Someone');
            const pushBody = ES
              ? `${senderDisplayName} quiere ver tu compatibilidad ${vis.icon} ${vis.labelES}`
              : `${senderDisplayName} wants to check your ${vis.icon} ${vis.labelEN} compatibility`;
            const pushed = await sendSystemPush(matchedId, 'BioCycle', pushBody, { screen: 'compatibility' });
            if (!pushed) {
              // No deliverable push token — fall back to WhatsApp
              await sendWhatsAppInvite({
                recipientPhone: normalized,
                recipientName:  name.trim(),
                senderName:     profile.nombre ?? 'BioCycle',
                type,
              });
            }
          }
          // If notifications are disabled (enabled === false): do nothing — respect opt-out.
        } catch (pushErr) {
          console.warn('[compat] push notification failed:', pushErr);
        }
      } else {
        // Unregistered number: send WhatsApp quick-reply invite card template
        await sendWhatsAppInvite({
          recipientPhone: normalized,
          recipientName:  name.trim(),
          senderName:     profile.nombre ?? 'BioCycle',
          type,
        });
      }

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
      {/* Phone input + contact picker */}
      <div style={{ marginBottom: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: colors.boneFaint }}>
            {idioma === 'ES' ? 'WhatsApp' : 'WhatsApp number'}
          </span>
          {typeof (navigator as any).contacts !== 'undefined' && (
            <button
              onClick={async () => {
                try {
                  const contacts = await (navigator as any).contacts.select(
                    ['name', 'tel'],
                    { multiple: false }
                  );
                  if (contacts && contacts.length > 0) {
                    const contact = contacts[0];
                    if (contact.name && contact.name[0] && !name.trim()) {
                      setName(contact.name[0]);
                    }
                    if (contact.tel && contact.tel[0]) {
                      setPhone(contact.tel[0]);
                    }
                  }
                } catch (err) {
                  console.log('[ContactPicker] cancelled or unavailable', err);
                }
              }}
              style={{
                background: 'rgba(0,200,150,0.1)',
                border: '1px solid rgba(0,200,150,0.25)',
                borderRadius: 8, padding: '4px 12px',
                color: colors.success, fontSize: 11,
                cursor: 'pointer', fontWeight: 600,
                letterSpacing: '0.04em',
              }}
            >
              {idioma === 'ES' ? '👤 Elegir contacto' : '👤 Choose contact'}
            </button>
          )}
        </div>
        <input
          type="tel"
          placeholder="+1 829 000 0000"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 8, padding: '9px 12px', color: colors.bone,
            fontFamily: fonts.body, fontSize: 13, outline: 'none',
          }}
        />
        <div style={{ fontSize: 10, color: colors.boneFaint, marginTop: 6, lineHeight: 1.5 }}>
          {idioma === 'ES'
            ? 'Ingresa el número con código de país. Ej: +1 829 000 0000'
            : 'Include country code. e.g. +1 829 000 0000'}
        </div>
      </div>

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


// ── Multi-type merged calendar ─────────────────────────────────────────────

function MultiTypeCalendar({
  conns, litTypes, profile, tierLimits, idioma,
}: {
  conns:      CompatibilityConnection[];
  litTypes:   Set<string>;
  profile:    Profile;
  tierLimits: TierLimits;
  idioma:     'EN' | 'ES';
}) {
  const [results, setResults] = useState<Map<string, CompatibilityResult | null>>(new Map());
  const [computing, setComputing] = useState(true);
  const ES = idioma === 'ES';
  const allowedTypes = getCompatibilityTierAccess(tierLimits);

  const connKey = conns.map(c => c.id).join(',');
  useEffect(() => {
    setComputing(true);
    const map = new Map<string, CompatibilityResult | null>();
    Promise.all(
      conns.map(async conn => {
        if (!conn.partner_profile) { map.set(conn.id, null); return; }
        try {
          const r = await computeCompatibility(profile, conn.partner_profile, conn.type, tierLimits.forecastDays);
          map.set(conn.id, r);
        } catch { map.set(conn.id, null); }
      })
    ).then(() => { setResults(new Map(map)); setComputing(false); });
  }, [connKey, profile.id, tierLimits.forecastDays]); // eslint-disable-line react-hooks/exhaustive-deps

  if (computing) return (
    <div style={{ textAlign: 'center', padding: 32, color: colors.boneFaint, fontSize: 13, fontFamily: fonts.body }}>
      {ES ? 'Calculando sincronía...' : 'Computing sync...'}
    </div>
  );

  // Build merged marksByDay from all lit types
  const marksByDay: Record<string, CalendarMark[]> = {};
  let days: Date[] = [];
  let hasPeaks = false;

  for (const conn of conns) {
    if (!litTypes.has(conn.type)) continue;
    const result = results.get(conn.id);
    if (!result) continue;
    const cal = buildTypeCalendar(result);
    if (days.length === 0) days = cal.map(c => c.date);
    const vis = TYPE_VISUAL[conn.type];
    for (const c of cal) {
      if (c.isPeak) {
        hasPeaks = true;
        const key = c.date.toLocaleDateString('en-CA');
        if (!marksByDay[key]) marksByDay[key] = [];
        marksByDay[key].push({ icon: vis.icon, color: vis.color });
      }
    }
  }

  if (days.length === 0) return (
    <div style={{ textAlign: 'center', padding: 32, color: colors.boneFaint, fontSize: 12, fontFamily: fonts.body }}>
      {ES ? 'No hay datos suficientes aún.' : 'Not enough data yet.'}
    </div>
  );

  const partnerName = conns[0]?.partner_profile?.nombre ?? conns[0]?.invited_name ?? '';
  const earlyEstimate = getDaysOfData(profile) < 30 ||
    conns.some(c => c.partner_profile && getDaysOfData(c.partner_profile as Profile) < 30);

  const caption = hasPeaks
    ? (ES ? `Tus mejores días con ${partnerName}.` : `Your best days with ${partnerName}.`)
    : (ES ? 'Sin días pico compartidos por ahora.' : 'No shared peak days right now.');
  const emptyLine = hasPeaks ? undefined : caption;

  const legend: LegendEntry[] = COMPATIBILITY_TYPES.map(t => {
    const v = TYPE_VISUAL[t.id];
    return { icon: v.icon, color: v.color, label: ES ? v.labelES : v.labelEN, active: allowedTypes.includes(t.id) };
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {earlyEstimate && (
        <div style={{
          padding: '10px 14px', background: 'rgba(255,217,61,0.08)',
          border: '1px solid rgba(255,217,61,0.25)', borderRadius: 10,
          fontSize: 11.5, color: colors.amber, fontFamily: fonts.body, lineHeight: 1.5,
        }}>
          {ES
            ? 'Estimación temprana — la sincronía se afina cuando ambos alcanzan 30 días de datos.'
            : 'Early estimate — your sync sharpens once you both reach 30 days of data.'}
        </div>
      )}
      <CalendarGrid
        days={days}
        marksByDay={marksByDay}
        legend={legend}
        caption={hasPeaks ? caption : undefined}
        emptyLine={emptyLine}
        isES={ES}
      />
      {hasPeaks && (
        <button
          onClick={() => {
            const events = conns
              .filter(c => litTypes.has(c.type))
              .flatMap(c => {
                const result = results.get(c.id);
                if (!result) return [];
                const vis = TYPE_VISUAL[c.type];
                return buildTypeCalendar(result)
                  .filter(e => e.isPeak)
                  .map(e => ({
                    date:  e.date,
                    title: `${partnerName} · ${ES ? vis.labelES : vis.labelEN}`,
                    notes: ES ? 'Día pico compartido' : 'Shared peak day',
                  }));
              });
            exportToCalendar(events, 'biocycle-compatibilidad.ics');
          }}
          style={{
            marginTop: 4, width: '100%',
            background: 'rgba(245,242,238,0.06)', border: '1px solid rgba(245,242,238,0.14)',
            borderRadius: 10, padding: '10px 0',
            color: 'rgba(245,242,238,0.45)', fontSize: 12,
            fontFamily: fonts.body, cursor: 'pointer', letterSpacing: '0.02em',
          }}
        >
          {ES ? 'Añadir a mi calendario' : 'Add to my calendar'}
        </button>
      )}
    </div>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────

export function CompatibilityScreen({ profile, userState: _userState, tierLimits }: Props) {
  const [connections, setConnections] = useState<CompatibilityConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedPersonKey, setSelectedPersonKey] = useState<string | null>(null);
  const [litTypes, setLitTypes]                   = useState<Set<string>>(new Set());

  const idioma = profile.idioma ?? 'EN';
  const ES = idioma === 'ES';
  const allowedTypes = getCompatibilityTierAccess(tierLimits);
  const maxConnections = tierLimits.compatibilityMax;
  const canAdd = connections.length < maxConnections && maxConnections > 0;

  useEffect(() => {
    loadConnections();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCancel(conn: CompatibilityConnection) {
    await supabase
      .from('compatibility_connections')
      .delete()
      .eq('id', conn.id);
    loadConnections();
  }

  async function loadConnections() {
    setLoading(true);
    const { data, error } = await supabase
      .from('compatibility_connections')
      .select('*')
      .or(`user_a_id.eq.${profile.id},user_b_id.eq.${profile.id}`)
      .order('initiated_at', { ascending: false });

    if (error || !data) { setLoading(false); return; }

    // Enrich accepted connections with partner profile
    const enriched: CompatibilityConnection[] = await Promise.all(
      (data as CompatibilityConnection[]).map(async conn => {
        if (conn.status === 'accepted' && conn.user_b_id) {
          const partnerId = conn.user_a_id === profile.id ? conn.user_b_id : conn.user_a_id;
          const { data: pData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', partnerId)
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
      .then(async ({ data }) => {
        if (!data) { setIncoming([]); return; }
        // Enrich each invite with the sender's real profile (for their nombre)
        const enriched = await Promise.all(
          (data as CompatibilityConnection[]).map(async conn => {
            const { data: pData } = await supabase
              .from('profiles')
              .select('id,nombre')
              .eq('id', conn.user_a_id)
              .maybeSingle();
            return { ...conn, partner_profile: pData as any ?? null };
          })
        );
        setIncoming(enriched as CompatibilityConnection[]);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps


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
            {ES ? 'Compatibilidad' : 'Compatibility'}
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

      {/* Incoming pending requests — 3 action buttons each */}
      {incoming.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span style={{ fontSize: 11, color: colors.boneFaint, fontFamily: fonts.body, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {ES ? 'Invitaciones recibidas' : 'Incoming invitations'}
          </span>
          {incoming.map(inv => {
            const senderName = inv.partner_profile?.nombre ?? inv.invited_name;
            const typeConfig = COMPATIBILITY_TYPES.find(t => t.id === inv.type);
            const typeLbl = typeConfig ? (ES ? typeConfig.labelES : typeConfig.label) : inv.type;

            async function runAction(action: 'ACCEPT' | 'REJECT' | 'REJECT_BLOCK') {
              if (action === 'REJECT_BLOCK') {
                const ok = window.confirm(
                  ES
                    ? `¿Bloquear a ${senderName}? No podrá enviarte más invitaciones de compatibilidad.`
                    : `Block ${senderName}? They won't be able to send you compatibility requests.`
                );
                if (!ok) return;
              }
              try {
                await fetch(`${API_BASE}/.netlify/functions/compatibility-invite-action`, {
                  method:  'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body:    JSON.stringify({ invite_id: inv.id, action }),
                });
              } catch (e) {
                console.warn('[compat] action failed:', e);
              }
              // Reload both lists
              setIncoming(prev => prev.filter(i => i.id !== inv.id));
              loadConnections();
            }

            return (
              <div key={inv.id} style={{
                background: 'rgba(239,159,39,0.06)',
                border: `1px solid ${colors.amber}`,
                borderRadius: 12, padding: '12px 14px',
                display: 'flex', flexDirection: 'column', gap: 10,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 14, color: colors.bone, fontFamily: fonts.body, fontWeight: 500 }}>
                    {senderName}
                  </span>
                  <span style={{ fontSize: 11, color: colors.amber, fontFamily: fonts.body }}>
                    {typeConfig?.icon ?? ''} {typeLbl}
                  </span>
                </div>
                <p style={{ fontSize: 12, color: colors.boneFaint, margin: 0, fontFamily: fonts.body }}>
                  {ES
                    ? `${senderName} quiere sincronizar su calendario contigo.`
                    : `${senderName} wants to sync their calendar with you.`}
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => runAction('ACCEPT')}
                    style={{
                      flex: 1, padding: '8px 0', borderRadius: 8,
                      background: 'rgba(239,159,39,0.18)',
                      border: `1px solid ${colors.amber}`,
                      color: colors.amber, fontSize: 12, fontFamily: fonts.body, cursor: 'pointer',
                    }}
                  >
                    {ES ? 'Aceptar' : 'Accept'}
                  </button>
                  <button
                    onClick={() => runAction('REJECT')}
                    style={{
                      flex: 1, padding: '8px 0', borderRadius: 8,
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(245,242,238,0.15)',
                      color: colors.boneFaint, fontSize: 12, fontFamily: fonts.body, cursor: 'pointer',
                    }}
                  >
                    {ES ? 'Rechazar' : 'Decline'}
                  </button>
                  <button
                    onClick={() => runAction('REJECT_BLOCK')}
                    style={{
                      padding: '8px 10px', borderRadius: 8,
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,80,80,0.25)',
                      color: 'rgba(255,100,100,0.7)', fontSize: 11, fontFamily: fonts.body, cursor: 'pointer',
                    }}
                  >
                    {ES ? 'Bloquear' : 'Block'}
                  </button>
                </div>
              </div>
            );
          })}
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

      {/* Connection selector + calendar */}
      {!loading && connections.length === 0 && maxConnections > 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: colors.boneFaint, fontSize: 13, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 28 }}>◈</span>
          <span>{ES ? 'Sin conexiones aún' : 'No connections yet'}</span>
          <span style={{ fontSize: 11 }}>{ES ? 'Invita a alguien para ver su sincronía biológica.' : 'Invite someone to see your biological sync.'}</span>
        </div>
      ) : loading ? (
        <div style={{ textAlign: 'center', padding: 32, color: colors.boneFaint, fontSize: 13 }}>{ES ? 'Cargando...' : 'Loading...'}</div>
      ) : (() => {
        const accepted = connections.filter(c => c.status === 'accepted');
        if (accepted.length === 0) {
          return (
            <div style={{ textAlign: 'center', padding: 32, color: colors.boneFaint, fontSize: 12 }}>
              {ES ? 'Cuando acepten tu invitación, verás aquí sus mejores días juntos.' : 'Once they accept, your best days together show here.'}
            </div>
          );
        }

        // Group accepted rows by invited_phone — one person may have multiple types
        const peopleMap = new Map<string, { key: string; displayName: string; conns: CompatibilityConnection[] }>();
        for (const c of accepted) {
          const key = c.invited_phone;
          if (!peopleMap.has(key)) {
            peopleMap.set(key, { key, displayName: c.partner_profile?.nombre ?? c.invited_name, conns: [] });
          }
          peopleMap.get(key)!.conns.push(c);
        }
        const people = Array.from(peopleMap.values());

        // Resolve selected person (fall back to first)
        const currentPerson  = people.find(p => p.key === selectedPersonKey) ?? people[0];
        const primaryConn    = currentPerson.conns[0];
        // litTypes: default to first accepted type when empty (e.g. initial state or person reset)
        const activeLitTypes: Set<string> = litTypes.size > 0
          ? litTypes
          : new Set([primaryConn?.type].filter(Boolean) as string[]);

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Person selector */}
            <div style={{ fontSize: 13, color: colors.boneFaint, fontFamily: fonts.body, marginBottom: 6 }}>
              {ES ? 'Tus mejores días con:' : 'Your best days with:'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <select
                value={currentPerson.key}
                onChange={e => {
                  setSelectedPersonKey(e.target.value);
                  setLitTypes(new Set()); // reset → defaults to new person's first type
                }}
                style={{
                  flex: 1, background: 'rgba(245,242,238,0.05)', color: colors.bone,
                  border: '1px solid rgba(245,242,238,0.14)', borderRadius: 10,
                  padding: '11px 13px', fontSize: 14, fontFamily: fonts.body,
                }}
              >
                {people.map(p => (
                  <option key={p.key} value={p.key}>{p.displayName}</option>
                ))}
              </select>
              <button
                onClick={() => {
                  const tc = COMPATIBILITY_TYPES.find(t => t.id === primaryConn.type);
                  const typeLbl = tc ? (ES ? tc.labelES : tc.label) : primaryConn.type;
                  if (confirm(ES
                    ? `¿Desconectar "${typeLbl}" con ${currentPerson.displayName}?`
                    : `Disconnect "${typeLbl}" with ${currentPerson.displayName}?`
                  )) handleCancel(primaryConn);
                }}
                aria-label="options"
                style={{
                  width: 40, height: 40, borderRadius: 10, background: 'rgba(245,242,238,0.05)',
                  border: '1px solid rgba(245,242,238,0.1)', color: colors.boneFaint,
                  fontSize: 18, cursor: 'pointer', flexShrink: 0,
                }}
              >⋯</button>
            </div>

            {/* Type toggle row — one pill per accepted type, multi-select */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {currentPerson.conns.map(c => {
                const vis = TYPE_VISUAL[c.type];
                const isLit = activeLitTypes.has(c.type);
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      setLitTypes(prev => {
                        const base = prev.size > 0 ? new Set(prev) : new Set(activeLitTypes);
                        if (base.has(c.type) && base.size > 1) base.delete(c.type);
                        else base.add(c.type);
                        return new Set(base);
                      });
                    }}
                    style={{
                      padding: '5px 12px', borderRadius: 20,
                      border: `1px solid ${isLit ? vis.color : 'rgba(255,255,255,0.15)'}`,
                      background: isLit ? `${vis.color}22` : 'none',
                      color: isLit ? vis.color : colors.boneFaint,
                      fontSize: 12, fontFamily: fonts.body, cursor: 'pointer',
                    }}
                  >
                    {vis.icon} {ES ? vis.labelES : vis.labelEN}
                  </button>
                );
              })}
            </div>

            <MultiTypeCalendar
              conns={currentPerson.conns}
              litTypes={activeLitTypes}
              profile={profile}
              tierLimits={tierLimits}
              idioma={idioma}
            />

            {connections.filter(c => c.status === 'pending').length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                <span style={{ fontSize: 11, color: colors.boneFaint }}>{ES ? 'Pendientes' : 'Pending'}</span>
                {connections.filter(c => c.status === 'pending').map(c => (
                  <div key={c.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: 'rgba(245,242,238,0.03)', border: '1px solid rgba(245,242,238,0.08)',
                    borderRadius: 10, padding: '10px 12px',
                  }}>
                    <span style={{ fontSize: 13, color: colors.bone }}>{c.partner_profile?.nombre ?? c.invited_name}</span>
                    <button
                      onClick={() => handleCancel(c)}
                      style={{ background: 'none', border: 'none', color: colors.boneFaint, fontSize: 12, cursor: 'pointer' }}
                    >
                      ✕ {ES ? 'Cancelar' : 'Cancel'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
