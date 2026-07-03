// src/lib/iap.ts
// RevenueCat IAP wrapper — works on iOS (App Store) and Android (Google Play).
// The code operates on entitlement IDs ("standard", "premium"), never on
// store-specific product IDs, so the same logic runs on both platforms.

import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';

const UPDATE_TIER_URL = '/.netlify/functions/update-tier';

// ── Init ─────────────────────────────────────────────────────────────────────

export async function initIAP(userId: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  const platform = Capacitor.getPlatform();
  const apiKey = platform === 'ios'
    ? import.meta.env.VITE_REVENUECAT_IOS_KEY
    : import.meta.env.VITE_REVENUECAT_ANDROID_KEY;

  if (!apiKey) {
    console.warn('[iap] No RevenueCat key configured for platform:', platform);
    return;
  }

  try {
    await Purchases.configure({ apiKey, appUserID: userId });
    if (import.meta.env.DEV) await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
  } catch (e) {
    console.error('[iap] configure failed:', e);
  }
}

// ── Offerings ────────────────────────────────────────────────────────────────

export async function getOfferings() {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const { current } = await Purchases.getOfferings();
    return current;
  } catch (e) {
    console.error('[iap] getOfferings failed:', e);
    return null;
  }
}

// ── Purchase ─────────────────────────────────────────────────────────────────

export async function purchaseTier(
  tier: 'standard' | 'premium'
): Promise<{ ok: boolean; cancelled?: boolean; error?: string }> {
  if (!Capacitor.isNativePlatform()) {
    return { ok: false, error: 'IAP only available on native platforms' };
  }
  try {
    const { current } = await Purchases.getOfferings();
    if (!current) return { ok: false, error: 'No offerings available' };

    // Match the package whose identifier contains the tier name.
    // In RevenueCat dashboard the packages should be named e.g. "$rc_monthly_standard"
    // or use the entitlement identifier. Fall back to any package if no match.
    const pkg =
      current.availablePackages.find(p =>
        p.identifier.toLowerCase().includes(tier)
      ) ?? current.availablePackages[tier === 'premium' ? 0 : 1];

    if (!pkg) return { ok: false, error: `No package found for ${tier}` };

    const result = await Purchases.purchasePackage({ aPackage: pkg });
    const active = result.customerInfo.entitlements.active;

    if (active[tier]) {
      await _syncTierToServer(result.customerInfo.originalAppUserId, tier);
      return { ok: true };
    }
    return { ok: false, error: 'Entitlement not active after purchase' };
  } catch (e: any) {
    if (e?.userCancelled) return { ok: false, cancelled: true };
    console.error('[iap] purchaseTier failed:', e);
    return { ok: false, error: e?.message ?? 'Purchase failed' };
  }
}

// ── Restore ──────────────────────────────────────────────────────────────────

export async function restorePurchases(): Promise<{
  ok: boolean;
  tier: string | null;
  error?: string;
}> {
  if (!Capacitor.isNativePlatform()) return { ok: false, tier: null, error: 'Native only' };
  try {
    const result = await Purchases.restorePurchases();
    const tier = _highestActiveTier(result.customerInfo.entitlements.active);
    if (tier) await _syncTierToServer(result.customerInfo.originalAppUserId, tier);
    return { ok: true, tier };
  } catch (e: any) {
    console.error('[iap] restorePurchases failed:', e);
    return { ok: false, tier: null, error: e?.message ?? 'Restore failed' };
  }
}

// ── Check on launch ───────────────────────────────────────────────────────────
// Call after initIAP. Returns the active tier from RevenueCat (or null).
// Also fires a server sync if the entitlement is active, so Supabase stays
// current across devices/platforms.

export async function checkEntitlements(): Promise<string | null> {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const result = await Purchases.getCustomerInfo();
    const tier = _highestActiveTier(result.customerInfo.entitlements.active);
    if (tier) await _syncTierToServer(result.customerInfo.originalAppUserId, tier);
    return tier;
  } catch (e) {
    console.warn('[iap] checkEntitlements failed:', e);
    return null;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function _highestActiveTier(
  active: Record<string, unknown>
): 'standard' | 'premium' | null {
  if (active['premium']) return 'premium';
  if (active['standard']) return 'standard';
  return null;
}

async function _syncTierToServer(userId: string, tier: string): Promise<void> {
  try {
    const res = await fetch(UPDATE_TIER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, tier }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.warn('[iap] syncTierToServer non-ok:', res.status, body);
    }
  } catch (e) {
    console.error('[iap] syncTierToServer failed:', e);
  }
}
