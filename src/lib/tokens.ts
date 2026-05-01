/**
 * BioCycle design tokens — single source of truth for colors, typography, spacing.
 * All UI files import from here. No hardcoded hex values anywhere in screens or components.
 * These values match the landing page at biocycle.app exactly for visual continuity.
 */

export const colors = {
  midnight:        '#042C53',
  midnightDeep:    '#021A33',
  midnightSoft:    '#073868',
  midnightShadow:  '#01081A',
  amber:           '#EF9F27',
  amberDeep:       '#BA7517',
  amberGlow:       'rgba(239, 159, 39, 0.12)',
  bone:            '#F5F2EE',
  boneDim:         'rgba(245, 242, 238, 0.72)',
  boneFaint:       'rgba(245, 242, 238, 0.45)',
  boneTrace:       'rgba(245, 242, 238, 0.12)',
  surfaceLow:      'rgba(245, 242, 238, 0.04)',
  surfaceMid:      'rgba(245, 242, 238, 0.06)',
  surfaceBorder:   'rgba(245, 242, 238, 0.08)',
  surfaceBorderHi: 'rgba(245, 242, 238, 0.18)',
  success:         '#5DCAA5',
  warning:         '#EF9F27',
  danger:          '#E07A5F',
  info:            '#85B7EB',
  tierFounding:    '#EF9F27',
  tierElite:       '#85B7EB',
  tierPremium:     '#F5F2EE',
  tierStandard:    'rgba(245, 242, 238, 0.72)',
  tierNew:         'rgba(245, 242, 238, 0.45)',
} as const;

export const fonts = {
  display: '"Fraunces", Georgia, serif',
  body:    '"IBM Plex Sans", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
  mono:    '"IBM Plex Mono", "SF Mono", Menlo, Consolas, monospace',
} as const;

export const radius = {
  sm:   6,
  md:   10,
  lg:   14,
  xl:   18,
  pill: 999,
} as const;

export const spacing = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  xxl:  24,
  xxxl: 32,
} as const;

export const shadows = {
  card:     '0 12px 32px -16px rgba(0, 0, 0, 0.4)',
  cta:      '0 1px 0 rgba(255,255,255,0.25) inset, 0 8px 24px -8px rgba(239, 159, 39, 0.45)',
  elevated: '0 24px 60px -24px rgba(0, 0, 0, 0.6)',
} as const;

export const easing = {
  out:  'cubic-bezier(0.16, 1, 0.3, 1)',
  soft: 'cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

export const typeScale = {
  display1: 32,
  display2: 26,
  display3: 22,
  bodyLg:   17,
  body:     15,
  bodySm:   13,
  bodyXs:   11,
  metricLg: 26,
  metricMd: 20,
  metricSm: 14,
  eyebrow:  11,
  label:    12,
} as const;
