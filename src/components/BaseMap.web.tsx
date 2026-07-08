/**
 * BaseMap.web.tsx — web-specific implementation.
 * Metro/Expo resolves this file in place of BaseMap.tsx when bundling for web.
 * Uses MapLibre GL JS loaded from CDN for a fully interactive map on the web preview.
 */
import React, { useEffect, useRef } from 'react';
import { MAP_STYLE_LIGHT, MAP_STYLE_URL } from '../config';

export interface MapMarker {
  key: string;
  coordinate: [number, number]; // [lng, lat]
  title?: string;
  avatarSeed?: string;
}

interface Props {
  center?: [number, number]; // [lng, lat]
  zoom?: number;
  dark?: boolean;
  showUser?: boolean;
  followUser?: boolean;       // continuously pan camera to user's GPS position
  destination?: [number, number]; // optional pin [lng, lat]
  route?: [number, number][];     // optional polyline coordinates
  markers?: MapMarker[];          // custom map markers (e.g. friends' positions)
  children?: React.ReactNode;
  style?: any;
  padding?: {
    paddingLeft?: number;
    paddingRight?: number;
    paddingTop?: number;
    paddingBottom?: number;
  };
}

const DEFAULT_CENTER: [number, number] = [-122.4312, 37.7719];
const ML_VERSION = '4.7.1';

const PROFILE_PHOTOS: Record<string, string> = {
  'Sofia Ramirez': 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&h=100&q=80',
  'Marcus Chen': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&h=100&q=80',
  'Ethan Brooks': 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&h=100&q=80',
  'Priya Nair': 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&h=100&q=80',
};

// Singleton loader — only injects script/css tags once.
let _mlPromise: Promise<any> | null = null;

function loadMaplibreGL(): Promise<any> {
  if (_mlPromise) return _mlPromise;
  _mlPromise = new Promise((resolve, reject) => {
    const w = window as any;
    if (w.maplibregl) { resolve(w.maplibregl); return; }

    // CSS
    if (!document.getElementById('maplibre-gl-css')) {
      const link = document.createElement('link');
      link.id  = 'maplibre-gl-css';
      link.rel = 'stylesheet';
      link.href = `https://unpkg.com/maplibre-gl@${ML_VERSION}/dist/maplibre-gl.css`;
      document.head.appendChild(link);
    }

    // JS
    const script = document.createElement('script');
    script.src = `https://unpkg.com/maplibre-gl@${ML_VERSION}/dist/maplibre-gl.js`;
    script.onload  = () => resolve(w.maplibregl);
    script.onerror = () => { _mlPromise = null; reject(new Error('MapLibre GL failed to load')); };
    document.head.appendChild(script);
  });
  return _mlPromise;
}

const updateUserMarkerStyle = (el: HTMLDivElement, isFollow: boolean) => {
  if (isFollow) {
    // Glass circle with orange navigation arrow
    el.style.cssText =
      'width:36px;height:36px;border-radius:50%;background:rgba(10, 10, 12, 0.2);' +
      'border:1.5px solid rgba(255, 255, 255, 0.22);box-shadow:0 4px 12px rgba(0,0,0,0.25);' +
      'display:flex;align-items:center;justify-content:center;backdrop-filter:blur(5px) saturate(180%);-webkit-backdrop-filter:blur(5px) saturate(180%);';
    el.innerHTML =
      '<svg width="22" height="22" viewBox="0 0 24 24" fill="#FF5A2E">' +
      '<path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>' +
      '</svg>';
  } else {
    // Standard orange dot with white border
    el.style.cssText =
      'width:18px;height:18px;border-radius:50%;background:#FF5A2E;' +
      'border:3px solid #fff;box-shadow:0 0 0 5px rgba(255,90,46,0.25),0 2px 8px rgba(0,0,0,0.4);';
    el.innerHTML = '';
  }
};

export function BaseMap({
  center = DEFAULT_CENTER,
  zoom   = 13,
  dark   = false,
  followUser = false,
  destination,
  route,
  markers = [],
  children,
  padding,
}: Props) {
  const mapPadding = React.useMemo(() => {
    if (!padding) return undefined;
    return {
      top: padding.paddingTop ?? 0,
      bottom: padding.paddingBottom ?? 0,
      left: padding.paddingLeft ?? 0,
      right: padding.paddingRight ?? 0,
    };
  }, [padding?.paddingTop, padding?.paddingBottom, padding?.paddingLeft, padding?.paddingRight]);

  // Keep a ref so the destination effect can see the latest route value
  // without re-running when route changes (that effect handles camera itself).
  const routeRef = useRef<[number, number][] | undefined>(undefined);
  useEffect(() => { routeRef.current = route; }, [route]);

  // followUser ref so the watchPosition closure always sees the latest value.
  const followUserRef = useRef(followUser);
  useEffect(() => { followUserRef.current = followUser; }, [followUser]);

  // Draw (or clear) the route line + fit the camera. Reads the latest refs so it can be
  // safely called from delayed 'load' handlers without capturing stale props.
  const applyRoute = (ml: any, m: any) => {
    const src = m.getSource('route-src');
    if (!src) return;
    const rt = routeRef.current;
    const hasRoute = !!rt && rt.length > 0;
    src.setData({
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: hasRoute ? rt : [] },
    });
    // Fit bounds to show the entire route — but skip in followUser mode
    if (hasRoute && rt && !followUserRef.current) {
      const bounds = new ml.LngLatBounds(rt[0], rt[0]);
      rt.forEach((pt: [number, number]) => bounds.extend(pt));
      m.fitBounds(bounds, {
        padding: { top: 160, bottom: 320, left: 60, right: 80 },
        duration: 1200,
        maxZoom: 16,
      });
    }
  };
  const containerRef  = useRef<HTMLDivElement>(null);
  const mapRef        = useRef<any>(null);
  const markerRef     = useRef<any>(null); // MapLibre Marker for destination pin
  const userMarkerRef = useRef<any>(null); // MapLibre Marker for the user's location (blue dot)
  const customMarkersRef = useRef<any[]>([]); // custom markers (e.g. friends)
  const watchIdRef    = useRef<number | null>(null);
  const lastPosRef    = useRef<[number, number] | null>(null); // previous GPS position for bearing calc
  const mapPaddingRef = useRef<any>(undefined);

  useEffect(() => {
    mapPaddingRef.current = mapPadding;
  }, [mapPadding]);

  // Dynamically update map padding when prop changes without re-mounting
  useEffect(() => {
    if (mapRef.current && mapPadding) {
      mapRef.current.setPadding(mapPadding);
    }
  }, [mapPadding]);

  // ── Mount / unmount the map ──────────────────────────────────────────────

  /** Compute compass bearing (0–360 ° clockwise from N) between two [lng, lat] points. */
  const bearingBetween = (a: [number, number], b: [number, number]): number => {
    const toRad = (d: number) => d * Math.PI / 180;
    const toDeg = (r: number) => r * 180 / Math.PI;
    const dLon = toRad(b[0] - a[0]);
    const lat1 = toRad(a[1]), lat2 = toRad(b[1]);
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    return (toDeg(Math.atan2(y, x)) + 360) % 360;
  };

  useEffect(() => {
    let cancelled = false;

    loadMaplibreGL().then((ml) => {
      if (cancelled || !containerRef.current) return;

      const map = new ml.Map({
        container: containerRef.current,
        style: dark ? MAP_STYLE_URL : MAP_STYLE_LIGHT,
        center,
        zoom,
        attributionControl: false,
        logoPosition: 'bottom-right',
        ...(mapPaddingRef.current ? { padding: mapPaddingRef.current } : {}),
      });
      mapRef.current = map;

      map.on('load', () => {
        // Pre-create empty sources/layers for route line so they are ready
        map.addSource('route-src', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: { type: 'LineString', coordinates: [] }
          }
        });

        // Route casing
        map.addLayer({
          id: 'route-casing',
          type: 'line',
          source: 'route-src',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#7A1500', 'line-width': 10 }
        });

        // Main orange route line
        map.addLayer({
          id: 'route-line',
          type: 'line',
          source: 'route-src',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#FF5A2E', 'line-width': 5 }
        });

        // If route data is already available at mount time (e.g. HUD launching after route fetch),
        // draw + fit it immediately — avoids the race between 'load' and the route useEffect.
        applyRoute(ml, map);

        // ── User-location dot ─────────────────────────────────────────────
        // Show it immediately at the map center (fallback), then move it to the
        // real GPS position once geolocation resolves. This way there is ALWAYS
        // a visible "you are here" pointer, even where geolocation is blocked.
        const el = document.createElement('div');
        el.className = 'redline-user-dot';
        userMarkerRef.current = new ml.Marker({
          element: el,
          anchor: 'center',
          rotationAlignment: 'map',
          pitchAlignment: 'map',
        }).setLngLat(center).addTo(map);

        updateUserMarkerStyle(el, followUserRef.current);

        if (navigator.geolocation) {
          let centeredOnce = false;
          watchIdRef.current = navigator.geolocation.watchPosition(
            (pos) => {
              const ll: [number, number] = [pos.coords.longitude, pos.coords.latitude];
              userMarkerRef.current?.setLngLat(ll);

              if (followUserRef.current) {
                // Compute movement delta from last position
                let heading: number | null = null;
                let hasMoved = false;

                if (pos.coords.heading != null && !isNaN(pos.coords.heading)) {
                  // Hardware compass (mobile devices)
                  heading = pos.coords.heading;
                  hasMoved = true;
                } else if (lastPosRef.current) {
                  const dx = (ll[0] - lastPosRef.current[0]) * 111320;
                  const dy = (ll[1] - lastPosRef.current[1]) * 110540;
                  const dist = Math.sqrt(dx * dx + dy * dy);
                  if (dist > 10) { // only rotate if moved >10 m (avoids GPS noise)
                    heading = bearingBetween(lastPosRef.current, ll);
                    hasMoved = true;
                  }
                }
                lastPosRef.current = ll;

                if (hasMoved && heading !== null) {
                  userMarkerRef.current?.setRotation(heading);
                } else {
                  userMarkerRef.current?.setRotation(0);
                }

                map.easeTo({
                  center: ll,
                  zoom: 17,
                  // Only rotate + tilt when we have a real heading; otherwise stay north-up
                  ...(hasMoved && heading !== null
                    ? { bearing: heading, pitch: 45 }
                    : { bearing: 0, pitch: 0 }
                  ),
                  duration: 800,
                  ...(mapPaddingRef.current ? { padding: mapPaddingRef.current } : {}),
                });
              } else if (!centeredOnce && !route) {
                centeredOnce = true;
                map.easeTo({
                  center: ll,
                  zoom: 15,
                  duration: 800,
                  ...(mapPaddingRef.current ? { padding: mapPaddingRef.current } : {}),
                });
              }
            },
            () => {},
            { enableHighAccuracy: true, maximumAge: 2000 },
          );
        }
      });
    }).catch(console.error);

    return () => {
      cancelled = true;
      if (watchIdRef.current != null) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null; }
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      markerRef.current?.remove();
      markerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dark]);

  // ── Dynamically update user location marker style when followUser changes ────────────────
  useEffect(() => {
    const marker = userMarkerRef.current;
    if (!marker) return;
    const el = marker.getElement();
    if (el) {
      updateUserMarkerStyle(el, followUser);
    }
  }, [followUser]);

  // ── Pan/zoom when center or zoom props change ────────────────────────────
  useEffect(() => {
    mapRef.current?.easeTo({
      center,
      zoom,
      duration: 600,
      ...(mapPadding ? { padding: mapPadding } : {}),
    });
  }, [center, zoom, mapPadding]);

  // ── Destination marker — uses ml.Marker ──────────────────────────────────
  useEffect(() => {
    loadMaplibreGL().then((ml) => {
      const m = mapRef.current;
      if (!m) return;

      // Remove old marker
      markerRef.current?.remove();
      markerRef.current = null;

      if (!destination) return;

      // Teardrop pin: outer pulse ring + solid dot
      const el = document.createElement('div');
      el.style.cssText = [
        'position:relative',
        'width:28px',
        'height:28px',
        'display:flex',
        'align-items:center',
        'justify-content:center',
      ].join(';');

      // Pulse ring
      const ring = document.createElement('div');
      ring.style.cssText = [
        'position:absolute',
        'width:28px',
        'height:28px',
        'border-radius:50%',
        'background:rgba(255,90,46,0.18)',
        'border:1.5px solid rgba(255,90,46,0.5)',
        'animation:mlPulse 1.8s ease-out infinite',
      ].join(';');

      // Inner solid dot
      const dot = document.createElement('div');
      dot.style.cssText = [
        'width:14px',
        'height:14px',
        'border-radius:50%',
        'background:#FF5A2E',
        'border:2.5px solid #fff',
        'box-shadow:0 2px 10px rgba(255,90,46,0.55)',
        'position:relative',
        'z-index:1',
      ].join(';');

      // Inject keyframes once
      if (!document.getElementById('ml-pin-style')) {
        const s = document.createElement('style');
        s.id = 'ml-pin-style';
        s.textContent = '@keyframes mlPulse{0%{transform:scale(1);opacity:1}100%{transform:scale(2.2);opacity:0}}';
        document.head.appendChild(s);
      }

      el.appendChild(ring);
      el.appendChild(dot);

      const marker = new ml.Marker({ element: el, anchor: 'center' })
        .setLngLat(destination)
        .addTo(m);

      markerRef.current = marker;

      // Only fly to destination if there is no route yet —
      // when a route exists, fitBounds in the route effect handles the camera.
      if (!routeRef.current || routeRef.current.length === 0) {
        m.flyTo({
          center: destination,
          zoom: 14,
          speed: 1.4,
          curve: 1.4,
          ...(mapPadding ? { padding: mapPadding } : {}),
        });
      }
    });
  }, [destination, mapPadding]);

  // ── Custom markers (e.g. friends' positions) ─────────────────────────────
  useEffect(() => {
    loadMaplibreGL().then((ml) => {
      const m = mapRef.current;
      if (!m) return;

      // Remove existing custom markers
      customMarkersRef.current.forEach((marker) => marker.remove());
      customMarkersRef.current = [];

      markers.forEach((markerData) => {
        const el = document.createElement('div');
        el.className = 'redline-friend-dot';
        el.style.cssText =
          'width:18px;height:18px;border-radius:50%;background:#FF2E3C;' +
          'border:3px solid #fff;box-shadow:0 0 0 5px rgba(255,46,60,0.25),0 2px 8px rgba(0,0,0,0.4);' +
          'cursor:pointer;';

        const newMarker = new ml.Marker({ element: el, anchor: 'center' })
          .setLngLat(markerData.coordinate)
          .addTo(m);

        customMarkersRef.current.push(newMarker);
      });
    });

    return () => {
      customMarkersRef.current.forEach((marker) => marker.remove());
      customMarkersRef.current = [];
    };
  }, [markers]);

  // ── Route drawing — updates the pre-created GeoJSON source ────────────────
  // Retries until the map instance + style are ready. The old version bailed
  // silently when the map wasn't ready yet, so the route line never appeared.
  useEffect(() => {
    let cancelled = false;
    loadMaplibreGL().then((ml) => {
      const tryApply = (attempt = 0) => {
        if (cancelled) return;
        const m = mapRef.current;
        // Wait for the map instance AND our 'route-src' source (created in the map's
        // one-time 'load' handler). Checking isStyleLoaded() here was unreliable — it
        // flickers false during tile loads, and waiting on 'load' after it already
        // fired meant the route silently never drew.
        if (!m || !m.getSource('route-src')) {
          if (attempt < 50) setTimeout(() => tryApply(attempt + 1), 150);
          return;
        }
        applyRoute(ml, m);
      };
      tryApply();
    });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route, followUser]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {children}
    </div>
  );
}
