import { Platform } from 'react-native';
import { STADIA_BASE, STADIA_API_KEY } from '../config';

export type LngLat = [number, number]; // [longitude, latitude]

export interface Place {
  name: string;
  label: string;
  center: LngLat;
}

export interface Maneuver {
  instruction: string;
  verbal: string;
  distanceMi: number; // length of this maneuver in miles
  timeSec: number;
  beginIndex: number; // index into route coordinates where this maneuver starts
  type: number;
}

export interface Route {
  coordinates: LngLat[]; // full route geometry [lng, lat]
  maneuvers: Maneuver[];
  distanceMi: number;
  durationSec: number;
}

/**
 * Decode a Valhalla-encoded polyline (precision 6) into [lng, lat] pairs.
 * Valhalla uses 1e6 precision (not the Google 1e5 default).
 */
export function decodePolyline6(str: string): LngLat[] {
  let index = 0, lat = 0, lng = 0;
  const coords: LngLat[] = [];
  const factor = 1e6;
  while (index < str.length) {
    let result = 1, shift = 0, b: number;
    do { b = str.charCodeAt(index++) - 63 - 1; result += b << shift; shift += 5; } while (b >= 0x1f);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    result = 1; shift = 0;
    do { b = str.charCodeAt(index++) - 63 - 1; result += b << shift; shift += 5; } while (b >= 0x1f);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    coords.push([lng / factor, lat / factor]);
  }
  return coords;
}

// On web: Stadia property-based auth — localhost requests work without an API key.
// On native: include api_key in every request.
const apiParam = (sep: '?' | '&') =>
  Platform.OS === 'web' ? '' : `${sep}api_key=${STADIA_API_KEY}`;

// Only return geocoding layers that sit on/near the road network. Coarse layers
// (country, region/state) resolve to geographic centroids — often deep wilderness
// (e.g. "Canada" → middle of Nunavut) that Valhalla can't route to (error 171).
const ROUTABLE_LAYERS = 'address,venue,street,locality,borough,neighbourhood,localadmin,county,macrocounty,postalcode';

/** Forward geocode a search query via Stadia (Pelias). */
export async function geocode(text: string, focus?: LngLat): Promise<Place[]> {
  if (!text.trim()) return [];
  let url = `${STADIA_BASE}/geocoding/v1/search?text=${encodeURIComponent(text)}&size=6&layers=${ROUTABLE_LAYERS}${apiParam('&')}`;
  if (focus) {
    url += `&focus.point.lat=${focus[1]}&focus.point.lon=${focus[0]}`;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Geocode failed (${res.status})`);
  const json = await res.json();
  return (json.features ?? []).map((f: any) => ({
    name: f.properties?.name ?? f.properties?.label ?? 'Unknown',
    label: f.properties?.label ?? '',
    center: [f.geometry.coordinates[0], f.geometry.coordinates[1]] as LngLat,
  }));
}

/** Thrown when Valhalla can't produce a road route (e.g. destination far from any road). */
export class RouteError extends Error {
  code: number;
  constructor(message: string, code: number) { super(message); this.code = code; }
}

/** Route between two points using Stadia's hosted Valhalla. */
export async function getRoute(from: LngLat, to: LngLat, costing = 'auto'): Promise<Route> {
  const url = `${STADIA_BASE}/route/v1${apiParam('?')}`;
  const body = {
    locations: [
      // radius widens the road-snap search so points slightly off the network still route
      { lat: from[1], lon: from[0], radius: 500 },
      { lat: to[1], lon: to[0], radius: 500 },
    ],
    costing,
    units: 'miles',
    directions_options: { units: 'miles' },
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let code = res.status, msg = `Route failed (${res.status})`;
    try {
      const err = await res.json();
      if (err?.error) msg = err.error;
      if (err?.error_code) code = err.error_code; // 171 = no road near location
    } catch { }
    console.warn(`Route failed: ${msg} (code ${code})`);
    throw new RouteError(msg, code);
  }
  const json = await res.json();
  const leg = json.trip?.legs?.[0];
  if (!leg) throw new Error('No route found');

  const coordinates = decodePolyline6(leg.shape);
  const maneuvers: Maneuver[] = (leg.maneuvers ?? []).map((m: any) => ({
    instruction: m.instruction ?? '',
    verbal: m.verbal_pre_transition_instruction ?? m.instruction ?? '',
    distanceMi: m.length ?? 0,
    timeSec: m.time ?? 0,
    beginIndex: m.begin_shape_index ?? 0,
    type: m.type ?? 0,
  }));

  return {
    coordinates,
    maneuvers,
    distanceMi: json.trip?.summary?.length ?? 0,
    durationSec: json.trip?.summary?.time ?? 0,
  };
}

// ---- geo helpers ----

/** Haversine distance in meters between two [lng,lat] points. */
export function distanceMeters(a: LngLat, b: LngLat): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]), lat2 = toRad(b[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function fmtDistance(mi: number): string {
  if (mi < 0.19) return `${Math.round(mi * 5280)} ft`;
  return `${mi.toFixed(1)} mi`;
}

export function fmtDuration(sec: number): string {
  const m = Math.round(sec / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}
