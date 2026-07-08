// Stadia Maps API key — used for MapLibre basemap tiles, geocoding, and Valhalla routing.
// API keys are for mobile / desktop / server apps.
// For web: Stadia uses property-based domain auth; localhost "just works" with no key.
// Get a key at https://client.stadiamaps.com/ and set EXPO_PUBLIC_STADIA_API_KEY in .env.
import { Platform } from 'react-native';

export const STADIA_API_KEY =
  process.env.EXPO_PUBLIC_STADIA_API_KEY ?? 'YOUR_STADIA_API_KEY';

// On web (browser), don't include api_key — Stadia allows localhost without it.
// On native, append the key so tile & API requests are authenticated.
const stadiaQ = Platform.OS === 'web' ? '' : `?api_key=${STADIA_API_KEY}`;

// Dark MapLibre style — used for turn-by-turn navigation.
export const MAP_STYLE_URL = `https://tiles.stadiamaps.com/styles/alidade_smooth_dark.json${stadiaQ}`;

// Light MapLibre style — used as the Drive screen map backdrop.
export const MAP_STYLE_LIGHT = `https://tiles.stadiamaps.com/styles/alidade_smooth.json${stadiaQ}`;

export const STADIA_BASE = 'https://api.stadiamaps.com';
