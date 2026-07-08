import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator,
  Modal, Platform, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';
import { MAP_STYLE_URL, MAP_STYLE_LIGHT, STADIA_API_KEY } from '../config';
import {
  geocode, getRoute, distanceMeters, fmtDistance, fmtDuration,
  Place, Route, LngLat,
} from '../services/navigation';

// MapLibre is a native module — no web build. Guard so the web export doesn't crash.
const ML: any = Platform.OS !== 'web' ? require('@maplibre/maplibre-react-native') : null;
const MLMap    = ML?.Map;
const MLCamera = ML?.Camera;
const MLSource = ML?.GeoJSONSource;
const MLLayer  = ML?.Layer;
const MLUser   = ML?.UserLocation;
const MLMarker = ML?.Marker;

// ─── Web-only MapLibre GL JS loader ─────────────────────────────────────────
const ML_VERSION = '4.7.1';
let _webMLPromise: Promise<any> | null = null;
function loadWebML(): Promise<any> {
  if (_webMLPromise) return _webMLPromise;
  _webMLPromise = new Promise((resolve, reject) => {
    const w = window as any;
    if (w.maplibregl) { resolve(w.maplibregl); return; }
    if (!document.getElementById('maplibre-gl-css')) {
      const link = document.createElement('link');
      link.id = 'maplibre-gl-css';
      link.rel = 'stylesheet';
      link.href = `https://unpkg.com/maplibre-gl@${ML_VERSION}/dist/maplibre-gl.css`;
      document.head.appendChild(link);
    }
    const script = document.createElement('script');
    script.src = `https://unpkg.com/maplibre-gl@${ML_VERSION}/dist/maplibre-gl.js`;
    script.onload  = () => resolve(w.maplibregl);
    script.onerror = () => { _webMLPromise = null; reject(); };
    document.head.appendChild(script);
  });
  return _webMLPromise;
}

/** Web map component rendered inside NavigationScreen when Platform.OS === 'web' */
function WebNavMap({
  center, route, dest,
}: { center: LngLat; route: Route | null; dest: Place | null }) {
  const containerRef  = useRef<HTMLDivElement>(null);
  const mapRef        = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const watchIdRef    = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadWebML().then((ml) => {
      if (cancelled || !containerRef.current) return;
      const map = new ml.Map({
        container: containerRef.current,
        style: MAP_STYLE_URL,
        center,
        zoom: 13,
        attributionControl: false,
      });
      mapRef.current = map;
      map.on('load', () => {
        // Route polyline
        map.addSource('route', { type: 'geojson', data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [] }, properties: {} } });
        map.addLayer({ id: 'route-casing', type: 'line', source: 'route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#7A1500', 'line-width': 11 } });
        map.addLayer({ id: 'route-line',   type: 'line', source: 'route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#FF5A2E', 'line-width': 6 } });

        // Live user-location dot — show immediately at center, then track GPS.
        const el = document.createElement('div');
        el.style.cssText =
          'width:18px;height:18px;border-radius:50%;background:#2A82FF;' +
          'border:3px solid #fff;box-shadow:0 0 0 5px rgba(42,130,255,0.25),0 2px 8px rgba(0,0,0,0.4);';
        userMarkerRef.current = new ml.Marker({ element: el, anchor: 'center' }).setLngLat(center).addTo(map);
        if (navigator.geolocation) {
          watchIdRef.current = navigator.geolocation.watchPosition(
            (pos) => userMarkerRef.current?.setLngLat([pos.coords.longitude, pos.coords.latitude]),
            () => {},
            { enableHighAccuracy: true, maximumAge: 5000 },
          );
        }
      });
    });
    return () => {
      cancelled = true;
      if (watchIdRef.current != null) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null; }
      userMarkerRef.current?.remove(); userMarkerRef.current = null;
      mapRef.current?.remove(); mapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update route when it changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const src = map.getSource('route');
    if (src) {
      src.setData({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: route ? route.coordinates : [] },
        properties: {},
      });
      if (route) {
        const bounds = route.coordinates.reduce(
          (b: any, c: LngLat) => b.extend(c),
          new (window as any).maplibregl.LngLatBounds(route.coordinates[0], route.coordinates[0])
        );
        map.fitBounds(bounds, { padding: 60, duration: 700 });
      }
    }
    // Destination marker
    if (dest) {
      if (map.getLayer('dest-circle')) map.removeLayer('dest-circle');
      if (map.getSource('dest')) map.removeSource('dest');
      map.addSource('dest', { type: 'geojson', data: { type: 'Feature', geometry: { type: 'Point', coordinates: dest.center }, properties: {} } });
      map.addLayer({ id: 'dest-circle', type: 'circle', source: 'dest', paint: { 'circle-radius': 10, 'circle-color': '#FF5A2E', 'circle-stroke-width': 2.5, 'circle-stroke-color': '#fff' } });
    }
  }, [route, dest]);

  return (
    <div
      ref={containerRef}
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }}
    />
  );
}

const DEFAULT_CENTER: LngLat = [-122.4312, 37.7719];
const ARRIVE_RADIUS_M = 28;

interface Props {
  visible: boolean;
  destination?: Place | null; // optional preset destination
  onClose: () => void;
}

function boundsOf(coords: LngLat[]): [number, number, number, number] {
  let w = 180, s = 90, e = -180, n = -90;
  for (const [lng, lat] of coords) {
    if (lng < w) w = lng; if (lng > e) e = lng;
    if (lat < s) s = lat; if (lat > n) n = lat;
  }
  const padX = (e - w) * 0.18 || 0.01;
  const padY = (n - s) * 0.18 || 0.01;
  return [w - padX, s - padY, e + padX, n + padY];
}

export function NavigationScreen({ visible, destination, onClose }: Props) {
  const [origin, setOrigin] = useState<LngLat | null>(null);
  const [dest, setDest] = useState<Place | null>(destination ?? null);
  const [route, setRoute] = useState<Route | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [navigating, setNavigating] = useState(false);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);

  const [stepIdx, setStepIdx] = useState(0);
  const [distToNext, setDistToNext] = useState(0);
  const [remainingMi, setRemainingMi] = useState(0);
  const [remainingSec, setRemainingSec] = useState(0);

  const [autoStart, setAutoStart] = useState(false);

  const cameraRef = useRef<any>(null);
  const watchRef = useRef<Location.LocationSubscription | null>(null);
  const stepRef = useRef(0);
  const routeRef = useRef<Route | null>(null);

  // On web, Stadia property auth covers localhost — no key needed in the browser.
  const keyMissing = Platform.OS !== 'web' && (!STADIA_API_KEY || STADIA_API_KEY === 'YOUR_STADIA_API_KEY');

  // Sync destination prop to state and prepare auto-start
  useEffect(() => {
    if (visible && destination) {
      setDest(destination);
      setAutoStart(true);
    } else if (!visible) {
      setDest(null);
      setAutoStart(false);
    }
  }, [destination, visible]);

  // Get current location when opened
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') { setError('Location permission denied'); return; }
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        if (!cancelled) {
          const lng = pos?.coords?.longitude;
          const lat = pos?.coords?.latitude;
          if (typeof lng === 'number' && typeof lat === 'number' && (lng !== 0 || lat !== 0)) {
            setOrigin([lng, lat]);
          } else {
            setOrigin(DEFAULT_CENTER);
          }
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(null); // fail silently on web
          setOrigin(DEFAULT_CENTER);
        }
      }
    })();
    return () => { cancelled = true; stopWatch(); };
  }, [visible]);

  // Route whenever origin + dest are known
  useEffect(() => {
    if (!origin || !dest) return;
    let cancelled = false;
    setLoading(true); setError(null);
    const safeOrigin = distanceMeters(origin, dest.center) > 800000 ? DEFAULT_CENTER : origin;
    getRoute(safeOrigin, dest.center)
      .then(r => {
        if (cancelled) return;
        setRoute(r); routeRef.current = r;
        setRemainingMi(r.distanceMi); setRemainingSec(r.durationSec);
        setStepIdx(0); stepRef.current = 0;
        // Fit the whole route
        setTimeout(() => cameraRef.current?.fitBounds(boundsOf(r.coordinates), { animationDuration: 700 }), 60);

        if (autoStart) {
          setAutoStart(false);
          startNav(r);
        }
      })
      .catch(e => !cancelled && setError(e?.message ?? 'Routing failed'))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [origin, dest, autoStart]);

  const runSearch = async (text: string) => {
    setQuery(text);
    if (text.trim().length < 3) { setResults([]); return; }
    try {
      setSearching(true);
      const r = await geocode(text);
      setResults(r);
    } catch (e: any) { setError(e?.message ?? 'Search failed'); }
    finally { setSearching(false); }
  };

  const pickDestination = (p: Place) => {
    setResults([]); setQuery(''); setRoute(null); setError(null);
    setDest(p);
  };

  const stopWatch = () => {
    watchRef.current?.remove();
    watchRef.current = null;
    Speech.stop();
  };

  const onPosition = (lng: number, lat: number) => {
    const r = routeRef.current;
    if (!r) return;
    const user: LngLat = [lng, lat];
    // follow camera
    cameraRef.current?.setStop?.({ centerCoordinate: user, zoomLevel: 16, pitch: 45, animationDuration: 800 });

    let idx = stepRef.current;
    const nextMan = r.maneuvers[idx + 1];
    if (nextMan) {
      const target = r.coordinates[nextMan.beginIndex] ?? r.coordinates[r.coordinates.length - 1];
      const d = distanceMeters(user, target);
      setDistToNext(d);
      if (d < ARRIVE_RADIUS_M && idx + 1 < r.maneuvers.length - 1) {
        idx += 1; stepRef.current = idx; setStepIdx(idx);
        Speech.stop();
        Speech.speak(r.maneuvers[idx + 1]?.verbal || r.maneuvers[idx].verbal);
      }
    }
    // remaining distance/time from current maneuver onward
    let mi = 0, sec = 0;
    for (let i = idx; i < r.maneuvers.length; i++) { mi += r.maneuvers[i].distanceMi; sec += r.maneuvers[i].timeSec; }
    setRemainingMi(mi); setRemainingSec(sec);
  };

  const startNav = async (overrideRoute?: Route) => {
    const activeRoute = overrideRoute || route;
    if (!activeRoute) return;
    setNavigating(true);
    stepRef.current = 0; setStepIdx(0);
    Speech.speak(activeRoute.maneuvers[1]?.verbal || activeRoute.maneuvers[0]?.verbal || 'Starting navigation');

    // Check if we should simulate driving (always on Web, or if GPS is > 800km away from route start)
    const startPoint = activeRoute.coordinates[0];
    const shouldSimulate = Platform.OS === 'web' || !origin || distanceMeters(origin, startPoint) > 800000;

    if (shouldSimulate) {
      let coordIndex = 0;
      const intervalId = setInterval(() => {
        if (coordIndex >= activeRoute.coordinates.length) {
          clearInterval(intervalId);
          endNav();
          return;
        }
        const [lng, lat] = activeRoute.coordinates[coordIndex];
        onPosition(lng, lat);
        // Advance along the polyline. Target ~60-80 updates total.
        const stepSize = Math.max(1, Math.floor(activeRoute.coordinates.length / 70));
        coordIndex += stepSize;
      }, 1000);

      // Save custom subscription object with a remove method so stopWatch cleans it up
      watchRef.current = {
        remove: () => clearInterval(intervalId)
      } as any;
    } else {
      watchRef.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 8, timeInterval: 1500 },
        (pos) => onPosition(pos.coords.longitude, pos.coords.latitude),
      );
    }
  };

  const endNav = () => { setNavigating(false); stopWatch(); };
  const close = () => { endNav(); setRoute(null); setDest(null); setResults([]); setQuery(''); onClose(); };

  const banner = route ? route.maneuvers[Math.min(stepIdx + 1, route.maneuvers.length - 1)] : null;
  const routeGeoJSON = route
    ? { type: 'Feature' as const, geometry: { type: 'LineString' as const, coordinates: route.coordinates }, properties: {} }
    : null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={close}>
      <View style={styles.container}>
        {/* Map */}
        {MLMap ? (
          <MLMap style={StyleSheet.absoluteFill} mapStyle={MAP_STYLE_URL} logoEnabled={false} attributionEnabled compassEnabled={false} rotateEnabled>
            <MLCamera ref={cameraRef} initialViewState={{ centerCoordinate: origin ?? DEFAULT_CENTER, zoomLevel: 13 }} />
            <MLUser visible androidRenderMode="normal" />
            {routeGeoJSON && (
              <MLSource id="route" shape={routeGeoJSON}>
                <MLLayer id="route-casing" type="line" layout={{ 'line-cap': 'round', 'line-join': 'round' }} paint={{ 'line-color': '#7A1500', 'line-width': 11 }} />
                <MLLayer id="route-line" type="line" layout={{ 'line-cap': 'round', 'line-join': 'round' }} paint={{ 'line-color': '#FF5A2E', 'line-width': 6 }} />
              </MLSource>
            )}
            {dest && MLMarker && (
              <MLMarker id="dest" coordinate={dest.center}>
                <View style={styles.destPin}><Ionicons name="location" size={20} color="#fff" /></View>
              </MLMarker>
            )}
          </MLMap>
        ) : (
          /* Web: live MapLibre GL JS map */
          <WebNavMap center={origin ?? DEFAULT_CENTER} route={route} dest={dest} />
        )}

        {/* Turn banner (while navigating) */}
        {navigating && banner && (
          <View style={styles.banner}>
            <Ionicons name="navigate" size={26} color="#fff" />
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerDist}>{fmtDistance(distToNext / 1609)}</Text>
              <Text style={styles.bannerText} numberOfLines={2}>{banner.instruction}</Text>
            </View>
          </View>
        )}

        {/* Search (when not navigating) */}
        {!navigating && (
          <View style={styles.searchWrap}>
            <View style={styles.searchBar}>
              <TouchableOpacity onPress={close}><Ionicons name="arrow-back" size={22} color="#3A3A40" /></TouchableOpacity>
              <TextInput
                style={styles.searchInput}
                placeholder="Where to?"
                placeholderTextColor="#8A8A90"
                value={dest && !query ? dest.name : query}
                onChangeText={runSearch}
                autoFocus={!dest}
              />
              {searching && <ActivityIndicator size="small" color="#8A8A90" />}
            </View>
            {results.length > 0 && (
              <ScrollView style={styles.results} keyboardShouldPersistTaps="handled">
                {results.map((p, i) => (
                  <TouchableOpacity key={i} style={styles.resultRow} onPress={() => pickDestination(p)}>
                    <Ionicons name="location-outline" size={18} color="#8A8A90" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.resultName} numberOfLines={1}>{p.name}</Text>
                      <Text style={styles.resultLabel} numberOfLines={1}>{p.label}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        )}

        {/* Error / key notice */}
        {keyMissing && (
          <View style={styles.notice}><Text style={styles.noticeText}>Set your Stadia API key in src/config.ts to enable maps & routing.</Text></View>
        )}
        {error && !keyMissing && (
          <View style={styles.notice}><Text style={styles.noticeText}>{error}</Text></View>
        )}

        {/* Bottom card: route summary + start / end */}
        {route && (
          <View style={styles.bottomCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.eta}>{fmtDuration(remainingSec)}</Text>
              <Text style={styles.etaSub}>{fmtDistance(remainingMi)}{dest ? ` · ${dest.name}` : ''}</Text>
            </View>
            {navigating ? (
              <TouchableOpacity style={styles.endBtn} onPress={endNav}>
                <Text style={styles.endText}>End</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.startBtn} onPress={() => startNav()} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : (<><Ionicons name="navigate" size={16} color="#fff" /><Text style={styles.startText}>Start</Text></>)}
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </Modal>
  );
}

const CARD = 'rgba(0,0,0,0.38)';
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0B0C' },
  webFallback: { alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#111214' },
  webFallbackText: { color: '#7A7A80', fontSize: 13 },

  destPin: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#FF5A2E', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },

  searchWrap: { position: 'absolute', top: 52, left: 16, right: 16 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10, height: 50, borderRadius: 14, paddingHorizontal: 14,
    backgroundColor: 'rgba(255,255,255,0.92)',
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 5,
  },
  searchInput: { flex: 1, color: '#111', fontSize: 15, outlineStyle: 'none' as any },
  results: { 
    marginTop: 8, backgroundColor: CARD, borderRadius: 20, maxHeight: 280, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    ...Platform.select({
      web: { backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' } as any,
      default: {},
    }),
  },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  resultName: { color: '#fff', fontSize: 15, fontWeight: '500' },
  resultLabel: { color: '#8A8A90', fontSize: 12 },

  banner: {
    position: 'absolute', top: 52, left: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#FF5A2E', borderRadius: 18, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 8,
  },
  bannerDist: { color: '#fff', fontSize: 22, fontWeight: '800' },
  bannerText: { color: 'rgba(255,255,255,0.95)', fontSize: 14, fontWeight: '500', marginTop: 2 },

  notice: { position: 'absolute', bottom: 130, left: 16, right: 16, backgroundColor: 'rgba(120,20,10,0.9)', borderRadius: 12, padding: 12 },
  noticeText: { color: '#fff', fontSize: 13, textAlign: 'center' },

  bottomCard: {
    position: 'absolute', bottom: 28, left: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: CARD, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 12,
    ...Platform.select({
      web: { backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' } as any,
      default: {},
    }),
  },
  eta: { color: '#fff', fontSize: 24, fontWeight: '800' },
  etaSub: { color: '#9A9AA0', fontSize: 13, marginTop: 2 },
  startBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FF5A2E', paddingHorizontal: 26, paddingVertical: 14, borderRadius: 16 },
  startText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  endBtn: { backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 26, paddingVertical: 14, borderRadius: 16 },
  endText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
