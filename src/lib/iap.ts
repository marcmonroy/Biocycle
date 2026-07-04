// src/lib/iap.ts
// RevenueCat IAP wrapper — iOS (App Store) + Android (Google Play).
// Operates on entitlement IDs ("standard", "premium") — never raw product IDs.

import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor';
import type { PurchasesPackage } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';

export type { PurchasesPackage };

const UPDATE_TIER_URL = '/.netlify/functions/update-tier';

// ── Init ──────────────────────────────────────────────────────────────────────

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

// ── Offerings ─────────────────────────────────────────────────────────────────

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

// ── Purchase a specific package ───────────────────────────────────────────────
// The UpgradeSheet loads offerings, lets the user pick a package, then calls this.

export async function purchasePackage(
  pkg: PurchasesPackage
): Promise<{ ok: boolean; cancelled?: boolean; error?: string }> {
  if (!Capacitor.isNativePlatform()) {
    return { ok: false, error: 'IAP only available on native platforms' };
  }
  try {
    const result = await Purchases.purchasePackage({ aPackage: pkg });
    const userId  = result.customerInfo.originalAppUserId;
    const tier    = _highestActiveTier(result.customerInfo.entitlements.active);
    if (tier) {
      await _syncToServer(userId);
      return { ok: true };
    }
    return { ok: false, error: 'Entitlement not active after purchase' };
  } catch (e: any) {
    if (e?.userCancelled) return { ok: false, cancelled: true };
    console.error('[iap] purchasePackage failed:', e);
    return { ok: false, error: e?.message ?? 'Purchase failed' };
  }
}

// ── Restore ───────────────────────────────────────────────────────────────────

export async function restorePurchases(): Promise<{
  ok: boolean;
  tier: string | null;
  error?: string;
}> {
  if (!Capacitor.isNativePlatform()) return { ok: false, tier: null, error: 'Native only' };
  try {
    const result = await Purchases.restorePurchases();
    const tier   = _highestActiveTier(result.customerInfo.entitlements.active);
    if (tier) await _syncToServer(result.customerInfo.originalAppUserId);
    return { ok: true, tier };
  } catch (e: any) {
    console.error('[iap] restorePurchases failed:', e);
    return { ok: false, tier: null, error: e?.message ?? 'Restore failed' };
  }
}

// ── On-launch entitlement check ───────────────────────────────────────────────
// Reads RC CustomerInfo (cached by RC SDK), syncs to server if tier is active.
// Renamed from checkEntitlements to match spec naming.

export async function getActiveTierFromEntitlements(): Promise<string | null> {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const result = await Purchases.getCustomerInfo();
    const tier   = _highestActiveTier(result.customerInfo.entitlements.active);
    if (tier) await _syncToServer(result.customerInfo.originalAppUserId);
    return tier;
  } catch (e) {
    console.warn('[iap] getActiveTierFromEntitlements failed:', e);
    return null;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function _highestActiveTier(
  active: Record<string, unknown>
): 'standard' | 'premium' | null {
  if (active['premium'])  return 'premium';
  if (active['standard']) return 'standard';
  return null;
}

// Server determines the authoritative tier from RevenueCat REST API — client
// sends only the userId, never a self-reported tier value.
async function _syncToServer(userId: string): Promise<void> {
  try {
    const res = await fetch(UPDATE_TIER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) console.warn('[iap] syncToServer non-ok:', res.status, await res.text());
  } catch (e) {
    console.error('[iap] syncToServer failed:', e);
  }
}
