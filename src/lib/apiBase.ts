import { Capacitor } from '@capacitor/core';

// On native (iOS/Android), the app runs from capacitor://localhost and cannot
// use relative URLs — it must call the deployed Netlify site directly.
// On web, relative URLs work because the app is served from Netlify.
export const API_BASE = Capacitor.isNativePlatform()
  ? 'https://app.biocycle.app'
  : '';
