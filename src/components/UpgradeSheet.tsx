// src/components/UpgradeSheet.tsx
// Monthly/yearly purchase sheet — Standard and Premium tiers.
// Loads live packages from RevenueCat so prices reflect App Store / Play Store
// configuration. Falls back to display prices when RC is unavailable (web/dev).

import { useState, useEffect } from 'react';
import type { PurchasesPackage } from '@revenuecat/purchases-capacitor';
import { getOfferings, purchasePackage, restorePurchases } from '../lib/iap';
import { colors, fonts } from '../lib/tokens';

interface Props {
  lang: 'EN' | 'ES';
  onSuccess: () => void;   // called after purchase/restore — triggers tier reload
  onClose: () => void;
}

type Period = 'monthly' | 'yearly';

interface TierPackages {
  monthly: PurchasesPackage | null;
  yearly:  PurchasesPackage | null;
}

// ── Package matching helpers ──────────────────────────────────────────────────
// Matches RC package identifiers / product identifiers for the four products.
// Handles both custom IDs (biocycle_standard_monthly) and $rc_ standard ones.

function matchesTier(pkg: PurchasesPackage, tier: 'standard' | 'premium'): boolean {
  const id = (pkg.identifier + ' ' + pkg.product.identifier).toLowerCase();
  return id.includes(tier);
}

function matchesPeriod(pkg: PurchasesPackage, period: Period): boolean {
  const id = (pkg.identifier + ' ' + pkg.product.identifier).toLowerCase();
  if (period === 'monthly') return id.includes('month') || id.includes('mo');
  return id.includes('year') || id.includes('annual') || id.includes('yr');
}

// ── Component ─────────────────────────────────────────────────────────────────

export function UpgradeSheet({ lang, onSuccess, onClose }: Props) {
  const isES = lang === 'ES';
  const L = (en: string, es: string) => isES ? es : en;

  const [period, setPeriod]     = useState<Period>('monthly');
  const [packages, setPackages] = useState<{ standard: TierPackages; premium: TierPackages } | null>(null);
  const [loading, setLoading]   = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);   // pkg identifier
  const [restoring, setRestoring]   = useState(false);
  const [error, setError]           = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const offering = await getOfferings();
      if (cancelled) return;
      if (offering) {
        const find = (tier: 'standard' | 'premium', p: Period) =>
          offering.availablePackages.find(pkg => matchesTier(pkg, tier) && matchesPeriod(pkg, p)) ?? null;

        setPackages({
          standard: { monthly: find('standard', 'monthly'), yearly: find('standard', 'yearly') },
          premium:  { monthly: find('premium',  'monthly'), yearly: find('premium',  'yearly') },
        });
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  async function handlePurchase(pkg: PurchasesPackage | null) {
    if (!pkg) return;
    setPurchasing(pkg.identifier);
    setError(null);
    const result = await purchasePackage(pkg);
    setPurchasing(null);
    if (result.ok) {
      onSuccess();
    } else if (!result.cancelled) {
      setError(result.error ?? L('Purchase failed. Please try again.', 'Error al procesar. Inténtalo de nuevo.'));
    }
  }

  async function handleRestore() {
    setRestoring(true);
    setError(null);
    const result = await restorePurchases();
    setRestoring(false);
    if (result.ok && result.tier) {
      onSuccess();
    } else if (result.ok) {
      setError(L('No active purchases found.', 'No se encontraron compras activas.'));
    } else {
      setError(result.error ?? L('Restore failed.', 'Error al restaurar.'));
    }
  }

  // Display prices — used as fallback when RC package price is unavailable
  const displayPrice = {
    standard: { monthly: '$12.99', yearly: '$99' },
    premium:  { monthly: '$22.99', yearly: '$199' },
  };

  function priceString(pkg: PurchasesPackage | null, tier: 'standard' | 'premium'): string {
    if (pkg?.product?.priceString) return pkg.product.priceString;
    return period === 'monthly' ? displayPrice[tier].monthly : displayPrice[tier].yearly;
  }

  const periodSuffix = period === 'monthly'
    ? L('/mo', '/mes')
    : L('/yr', '/año');

  const isWorking = purchasing !== null || restoring;

  return (
    // Backdrop
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(2,26,51,0.85)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
    >
      {/* Sheet */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 480,
          background: colors.midnightDeep,
          borderRadius: '20px 20px 0 0',
          padding: '28px 20px 40px',
          fontFamily: fonts.body,
        }}
      >
        {/* Handle */}
        <div style={{ width: 36, height: 4, background: 'rgba(245,242,238,0.15)', borderRadius: 2, margin: '0 auto 24px' }} />

        {/* Title */}
        <div style={{ fontSize: 20, fontWeight: 700, color: colors.bone, textAlign: 'center', marginBottom: 6, fontFamily: fonts.display }}>
          {L('Upgrade BioCycle', 'Actualizar BioCycle')}
        </div>
        <div style={{ fontSize: 13, color: colors.boneFaint, textAlign: 'center', marginBottom: 20 }}>
          {L('Unlock full access. Cancel anytime.', 'Acceso completo. Cancela cuando quieras.')}
        </div>

        {/* Monthly / Yearly toggle */}
        <div style={{ display: 'flex', background: 'rgba(245,242,238,0.06)', borderRadius: 10, padding: 3, marginBottom: 20 }}>
          {(['monthly', 'yearly'] as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, fontFamily: fonts.body,
                background: period === p ? colors.amber : 'transparent',
                color: period === p ? colors.midnight : colors.boneFaint,
                transition: 'all 0.15s',
              }}
            >
              {p === 'monthly' ? L('Monthly', 'Mensual') : L('Yearly', 'Anual')}
              {p === 'yearly' && (
                <span style={{ fontSize: 10, fontWeight: 700, marginLeft: 4,
                  background: period === 'yearly' ? colors.midnight : colors.amber,
                  color: period === 'yearly' ? colors.amber : colors.midnight,
                  borderRadius: 4, padding: '1px 5px' }}>
                  {L('SAVE 36%', '-36%')}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading && (
          <div style={{ textAlign: 'center', color: colors.boneFaint, fontSize: 13, padding: '20px 0' }}>
            {L('Loading…', 'Cargando…')}
          </div>
        )}

        {!loading && (
          <>
            {/* Standard */}
            <div style={{
              background: 'rgba(245,242,238,0.04)', border: '1px solid rgba(245,242,238,0.12)',
              borderRadius: 14, padding: '16px', marginBottom: 10,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: colors.bone }}>
                  {L('Standard', 'Estándar')}
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: colors.bone, fontFamily: fonts.mono }}>
                  {priceString(packages?.standard[period] ?? null, 'standard')}
                  <span style={{ fontSize: 11, fontWeight: 400, color: colors.boneFaint }}>{periodSuffix}</span>
                </div>
              </div>
              <div style={{ fontSize: 11, color: colors.boneFaint, lineHeight: 1.6, marginBottom: 12 }}>
                {L(
                  '3 Jules turns · 7-day forecast · Circle of 5 · 1 compatibility',
                  '3 turnos con Jules · Pronóstico 7 días · Círculo de 5 · 1 compatibilidad'
                )}
              </div>
              <button
                onClick={() => handlePurchase(packages?.standard[period] ?? null)}
                disabled={isWorking || !packages?.standard[period]}
                style={{
                  width: '100%', padding: '11px', border: '1px solid rgba(245,242,238,0.2)',
                  borderRadius: 10, cursor: isWorking ? 'default' : 'pointer',
                  background: 'rgba(245,242,238,0.08)', color: colors.bone,
                  fontSize: 13, fontWeight: 600, fontFamily: fonts.body,
                  opacity: isWorking ? 0.5 : 1,
                }}
              >
                {purchasing && packages?.standard[period]?.identifier === purchasing
                  ? L('Processing…', 'Procesando…')
                  : L(`Subscribe — ${priceString(packages?.standard[period] ?? null, 'standard')}${periodSuffix}`,
                      `Suscribirse — ${priceString(packages?.standard[period] ?? null, 'standard')}${periodSuffix}`)}
              </button>
            </div>

            {/* Premium */}
            <div style={{
              background: 'rgba(133,183,235,0.06)', border: '1px solid rgba(133,183,235,0.3)',
              borderRadius: 14, padding: '16px', marginBottom: 16,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: colors.tierElite }}>
                  Premium
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: colors.tierElite, fontFamily: fonts.mono }}>
                  {priceString(packages?.premium[period] ?? null, 'premium')}
                  <span style={{ fontSize: 11, fontWeight: 400, color: colors.boneFaint }}>{periodSuffix}</span>
                </div>
              </div>
              <div style={{ fontSize: 11, color: colors.boneFaint, lineHeight: 1.6, marginBottom: 12 }}>
                {L(
                  '7 Jules turns · 14-day forecast · Circle of 10 · 3 compatibilities · Priority data trading',
                  '7 turnos con Jules · Pronóstico 14 días · Círculo de 10 · 3 compatibilidades · Trading prioritario'
                )}
              </div>
              <button
                onClick={() => handlePurchase(packages?.premium[period] ?? null)}
                disabled={isWorking || !packages?.premium[period]}
                style={{
                  width: '100%', padding: '11px', border: '1px solid rgba(133,183,235,0.4)',
                  borderRadius: 10, cursor: isWorking ? 'default' : 'pointer',
                  background: 'rgba(133,183,235,0.12)', color: colors.tierElite,
                  fontSize: 13, fontWeight: 600, fontFamily: fonts.body,
                  opacity: isWorking ? 0.5 : 1,
                }}
              >
                {purchasing && packages?.premium[period]?.identifier === purchasing
                  ? L('Processing…', 'Procesando…')
                  : L(`Subscribe — ${priceString(packages?.premium[period] ?? null, 'premium')}${periodSuffix}`,
                      `Suscribirse — ${priceString(packages?.premium[period] ?? null, 'premium')}${periodSuffix}`)}
              </button>
            </div>
          </>
        )}

        {error && (
          <div style={{ fontSize: 12, color: colors.danger, textAlign: 'center', marginBottom: 12, lineHeight: 1.5 }}>
            {error}
          </div>
        )}

        {/* Restore */}
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <button
            onClick={handleRestore}
            disabled={isWorking}
            style={{
              background: 'none', border: 'none', cursor: isWorking ? 'default' : 'pointer',
              color: 'rgba(245,242,238,0.4)', fontSize: 12, fontFamily: fonts.body,
              opacity: isWorking ? 0.4 : 1,
            }}
          >
            {restoring ? L('Restoring…', 'Restaurando…') : L('Restore Purchases', 'Restaurar compras')}
          </button>
        </div>

        {/* Legal / auto-renew disclosure — required by Apple and Google */}
        <div style={{ fontSize: 10, color: 'rgba(245,242,238,0.3)', textAlign: 'center', lineHeight: 1.6, padding: '0 8px', marginBottom: 10 }}>
          {L(
            'Subscription automatically renews at the end of each period unless cancelled at least 24 hours before renewal. Manage or cancel in your App Store or Google Play account settings.',
            'La suscripción se renueva automáticamente al final de cada período a menos que la canceles al menos 24 horas antes. Gestiona o cancela en la configuración de tu cuenta de App Store o Google Play.'
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 20 }}>
          <a href="https://biocycle.app/terms" target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 10, color: 'rgba(245,242,238,0.3)', textDecoration: 'underline' }}>
            {L('Terms of Use', 'Términos de uso')}
          </a>
          <a href="https://biocycle.app/privacy" target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 10, color: 'rgba(245,242,238,0.3)', textDecoration: 'underline' }}>
            {L('Privacy Policy', 'Privacidad')}
          </a>
        </div>
      </div>
    </div>
  );
}
