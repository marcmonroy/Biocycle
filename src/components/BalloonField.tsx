import { useState } from 'react';
import { colors, fonts } from '../lib/tokens';

export interface BalloonRel {
  id: string;
  name: string;
  category: string;
  closeness: number | null;
  importance: number | null;
  love: number | null;
  intimacy: boolean;
  _avgStress?: number | null;
  _avgAnxiety?: number | null;
}

interface Props {
  rels: BalloonRel[];
  idioma: 'EN' | 'ES';
  onEditRequest: (rel: BalloonRel) => void;
}

const CAT_EMOJI: Record<string, string> = {
  partner: '💞', family: '👨‍👩‍👧', friend: '🤝', work: '💼',
  pet: '🐾', ex: '🫥', interest: '💫', other: '👤',
};
const CAT_LABEL: Record<string, [string, string]> = {
  partner:  ['Partner',  'Pareja'],
  family:   ['Family',   'Familia'],
  friend:   ['Friend',   'Amigo'],
  work:     ['Work',     'Trabajo'],
  pet:      ['Pet',      'Mascota'],
  ex:       ['Ex',       'Ex'],
  interest: ['Interest', 'Interés'],
  other:    ['Other',    'Otro'],
};

function stressCol(s: number | null | undefined): { fill: string; stroke: string } {
  if (s == null) return { fill: 'rgba(155,150,143,0.6)',  stroke: 'rgba(155,150,143,0.85)' };
  if (s >= 7)   return { fill: 'rgba(179,64,47,0.72)',   stroke: 'rgba(200,72,52,0.95)'  };
  if (s <= 3)   return { fill: 'rgba(44,122,77,0.72)',   stroke: 'rgba(50,140,87,0.95)'  };
  return         { fill: 'rgba(155,150,143,0.6)',  stroke: 'rgba(155,150,143,0.85)' };
}

const SVG_W  = 360;
const SVG_H  = 345;
// "you" figure anchor
const HEAD_X = 181;
const HEAD_Y = 292;
// hand holding strings (left arm raised)
const HAND_X = 169;
const HAND_Y = 278;

export function BalloonField({ rels, idioma, onEditRequest }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const ES = idioma === 'ES';
  const n = rels.length;

  // Max radius shrinks as count grows so 10 balloons don't cram
  const maxR = Math.max(11, Math.min(24, 145 / Math.max(n, 1)));
  const minR = 10;
  const availW = SVG_W - 60;   // 30px padding each side
  const spacing = availW / n;

  const balloons = rels.map((r, i) => {
    const closeness  = r.closeness  ?? 4;
    const importance = r.importance ?? 4;
    const love       = r.love       ?? 0;

    // Radius ← importance
    const radius = minR + (importance - 1) / 6 * (maxR - minR);

    // Y ← closeness: closer (7) → lower y (near figure); distant (1) → higher y (far from figure)
    const baseY  = 50 + (closeness - 1) / 6 * 150;
    // Stagger adjacent balloons ±14 px to avoid overlap at same closeness
    const jitter = (i % 2 === 0 ? 14 : -14);
    const y = Math.max(radius + 14, Math.min(SVG_H - 130, baseY + jitter));

    // X: evenly spaced
    const x = 30 + (i + 0.5) * spacing;

    const col           = stressCol(r._avgStress);
    const heartFontSize = love === 0 ? 0 : 5 + love * 1.6;
    const isSelected    = selectedId === r.id;

    return { r, x, y, radius, col, love, heartFontSize, isSelected };
  });

  const selRel = selectedId ? rels.find(r => r.id === selectedId) ?? null : null;

  return (
    <div style={{ fontFamily: fonts.body }}>

      {/* ── Balloon SVG ───────────────────────────────────────────────── */}
      <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>

        {/* Strings */}
        {balloons.map(({ r, x, y, radius }) => (
          <line key={`s-${r.id}`}
            x1={x}      y1={y + radius * 1.15 + 1}
            x2={HAND_X} y2={HAND_Y}
            stroke="rgba(245,242,238,0.2)" strokeWidth={0.9}
          />
        ))}

        {/* "You" figure */}
        {/* head */}
        <circle cx={HEAD_X} cy={HEAD_Y} r={9} fill={colors.amber} opacity={0.9} />
        {/* body */}
        <line x1={HEAD_X} y1={HEAD_Y + 9}  x2={HEAD_X} y2={HEAD_Y + 24} stroke={colors.amber} strokeWidth={2} opacity={0.9} />
        {/* left arm raised → hand holding strings */}
        <line x1={HEAD_X} y1={HEAD_Y + 13} x2={HAND_X} y2={HAND_Y}      stroke={colors.amber} strokeWidth={2} opacity={0.9} />
        {/* right arm */}
        <line x1={HEAD_X} y1={HEAD_Y + 13} x2={HEAD_X + 10} y2={HEAD_Y + 19} stroke={colors.amber} strokeWidth={2} opacity={0.9} />
        {/* left leg */}
        <line x1={HEAD_X} y1={HEAD_Y + 24} x2={HEAD_X - 6}  y2={HEAD_Y + 34} stroke={colors.amber} strokeWidth={2} opacity={0.9} />
        {/* right leg */}
        <line x1={HEAD_X} y1={HEAD_Y + 24} x2={HEAD_X + 6}  y2={HEAD_Y + 34} stroke={colors.amber} strokeWidth={2} opacity={0.9} />
        {/* label */}
        <text x={HEAD_X} y={HEAD_Y + 46} textAnchor="middle" fontSize={9}
          fill={colors.boneFaint} fontFamily={fonts.body}>
          {ES ? 'tú' : 'you'}
        </text>

        {/* Balloons */}
        {balloons.map(({ r, x, y, radius, col, love, heartFontSize, isSelected }) => (
          <g key={`b-${r.id}`}
            onClick={() => setSelectedId(isSelected ? null : r.id)}
            style={{ cursor: 'pointer' }}
          >
            {/* body (ellipse slightly taller than wide) */}
            <ellipse
              cx={x} cy={y}
              rx={radius} ry={radius * 1.15}
              fill={col.fill}
              stroke={isSelected ? colors.amber : col.stroke}
              strokeWidth={isSelected ? 2.5 : 1.2}
            />
            {/* knot */}
            <ellipse cx={x} cy={y + radius * 1.15 + 1.5} rx={2.5} ry={3} fill={col.stroke} />
            {/* heart — centered in balloon, sized by love */}
            {love > 0 && (
              <text
                x={x} y={y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={heartFontSize}
                fill="rgba(255,255,255,0.82)"
                style={{ userSelect: 'none' as const, pointerEvents: 'none' as const }}
              >♥</text>
            )}
            {/* name label above balloon */}
            <text
              x={x} y={y - radius * 1.15 - 5}
              textAnchor="middle" fontSize={8.5}
              fill={isSelected ? colors.amber : colors.boneFaint}
              fontFamily={fonts.body}
              style={{ userSelect: 'none' as const }}
            >
              {r.name.length > 9 ? r.name.slice(0, 8) + '…' : r.name}
            </text>
          </g>
        ))}
      </svg>

      {/* ── Tap-detail panel ──────────────────────────────────────────── */}
      {selRel && (() => {
        const s      = selRel._avgStress;
        const anx    = selRel._avgAnxiety;
        const emoji  = CAT_EMOJI[selRel.category]  ?? '👤';
        const catLbl = (CAT_LABEL[selRel.category] ?? ['Other','Otro'])[ES ? 1 : 0];
        const sc     = s == null ? colors.boneFaint : s >= 7 ? colors.danger : s <= 3 ? colors.success : colors.boneFaint;
        return (
          <div style={{ marginTop: 10, background: 'rgba(245,242,238,0.04)', border: '1px solid rgba(245,242,238,0.12)', borderRadius: 12, padding: '14px 16px' }}>
            {/* header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>{emoji}</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: colors.bone }}>{selRel.name}</div>
                  <div style={{ fontSize: 11, color: colors.boneFaint }}>{catLbl}</div>
                </div>
              </div>
              <button onClick={() => setSelectedId(null)}
                style={{ background: 'none', border: 'none', color: colors.boneFaint, fontSize: 18, cursor: 'pointer', padding: 0, lineHeight: 1 }}>×</button>
            </div>
            {/* ratings */}
            <div style={{ display: 'flex', gap: 14, marginBottom: 10 }}>
              {([
                [ES ? 'Cercanía'    : 'Closeness',  selRel.closeness],
                [ES ? 'Importancia' : 'Importance', selRel.importance],
                [ES ? 'Amor'        : 'Love',        selRel.love],
              ] as [string, number | null][]).map(([lbl, val]) => (
                <div key={lbl} style={{ fontSize: 11, color: colors.boneFaint }}>
                  {lbl}: <span style={{ color: colors.bone, fontWeight: 600, fontFamily: fonts.mono }}>{val ?? '—'}</span>
                </div>
              ))}
            </div>
            {/* stress insight */}
            {s != null ? (
              <div style={{ fontSize: 12, color: 'rgba(245,242,238,0.72)', lineHeight: 1.5, paddingLeft: 10, borderLeft: `2px solid ${sc}`, marginBottom: 10 }}>
                {s >= 7
                  ? (ES ? `Tu estrés es más alto los días con ${selRel.name} — promedio ${s}/10.` : `Your stress is higher on days with ${selRel.name} — avg ${s}/10.`)
                  : s <= 3
                  ? (ES ? `Tu estrés es más bajo los días con ${selRel.name} — promedio ${s}/10.` : `Your stress is lower on days with ${selRel.name} — avg ${s}/10.`)
                  : (ES ? `Estrés moderado los días con ${selRel.name} — promedio ${s}/10.` : `Moderate stress on days with ${selRel.name} — avg ${s}/10.`)}
                {anx != null && (
                  <span style={{ color: colors.boneFaint }}>
                    {ES ? ` Ansiedad: ${anx}/10.` : ` Anxiety: ${anx}/10.`}
                  </span>
                )}
              </div>
            ) : (
              <div style={{ fontSize: 11, color: colors.boneFaint, marginBottom: 10 }}>
                {ES ? 'Sin datos de sesiones aún.' : 'No session data yet.'}
              </div>
            )}
            {/* edit button */}
            <button
              onClick={() => { onEditRequest(selRel); setSelectedId(null); }}
              style={{ width: '100%', padding: '8px 0', background: 'rgba(239,159,39,0.1)', border: '1px solid rgba(239,159,39,0.3)', borderRadius: 8, color: colors.amber, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: fonts.body }}
            >
              {ES ? 'Editar' : 'Edit'}
            </button>
          </div>
        );
      })()}

      {/* ── Legend ────────────────────────────────────────────────────── */}
      <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px 12px', padding: '10px 12px', background: 'rgba(245,242,238,0.02)', border: '1px solid rgba(245,242,238,0.06)', borderRadius: 8 }}>
        {([
          [ES ? 'Tamaño' : 'Size',   ES ? '= importancia'           : '= importance'],
          [ES ? 'Altura' : 'Height', ES ? '= cercanía'               : '= closeness'],
          [ES ? 'Color'  : 'Color',  ES ? '= calma / neutral / tensa' : '= calms / neutral / tenses'],
          ['♥',                      ES ? '= amor'                   : '= love'],
        ] as [string, string][]).map(([k, v]) => (
          <div key={k} style={{ fontSize: 10, color: colors.boneFaint, lineHeight: 1.4 }}>
            <span style={{ fontWeight: 600, color: 'rgba(245,242,238,0.5)' }}>{k}</span>{' '}{v}
          </div>
        ))}
      </div>
    </div>
  );
}
