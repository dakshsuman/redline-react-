import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform,
  Animated, PanResponder, TextInput, ActivityIndicator, useWindowDimensions,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { colors } from '../theme/colors';
import { Speedometer } from '../components/Speedometer';
import { BaseMap } from '../components/BaseMap';
import { Drive, drives } from '../data/mockData';
import { useAppContext } from '../context/AppContext';
import { geocode, getRoute, Place, LngLat, Route, Maneuver, distanceMeters, RouteError } from '../services/navigation';
import { CarPicker } from '../components/CarPicker';

const SHEET_EXPANDED_TOP = 140; // leaves a gap below the search bar when fully open
// Minimized: keep a fixed peek (header + filter bar) visible above the floating tab bar
const SHEET_MIN_PEEK = 256;
// Snap offsets (translateY from the fully-expanded position) for a given window height.
// Computed per-render from live dimensions — module-level constants went stale when the
// window was resized, which made the sheet snap to wrong positions.
const POS_FULL = 0;
const snapPointsFor = (winH: number): [number, number, number] => {
  const origin = Math.max(60, Math.round(winH * 0.44) - SHEET_EXPANDED_TOP);
  const min = Math.max(origin + 40, winH - SHEET_MIN_PEEK - SHEET_EXPANDED_TOP);
  return [POS_FULL, origin, min];
};

const REGION = { latitude: 37.7719, longitude: -122.4312 };

type Trip = { id: number; date: string; time: string; dist: number; dur: string; mph: number; clip: boolean; car: string };

const TRIPS: Trip[] = drives.map(d => {
  const parts = d.date.split(' \· ');
  const datePart = parts[0];
  const timePart = parts[1] ? parts[1] + ' – ' + d.dur : d.dur;
  return {
    id: d.id,
    date: datePart,
    time: timePart,
    dist: d.dist,
    dur: d.dur,
    mph: d.top,
    clip: d.pb,
    car: d.car,
  };
});

const TOTAL_MI = TRIPS.reduce((s, t) => s + t.dist, 0).toFixed(1);

// GPS ETA calculations based on speed and remaining distance
const getRemainingDurationSec = (remDistMi: number, totalDistMi: number, totalDurationSec: number, currentSpeedMph: number): number => {
  if (remDistMi <= 0) return 0;
  if (currentSpeedMph > 10) {
    return (remDistMi / currentSpeedMph) * 3600; // calculate using active speed
  }
  const ratio = totalDistMi > 0 ? remDistMi / totalDistMi : 1;
  return totalDurationSec * ratio; // fallback to proportional routing estimate
};

// Interpolates a coordinate along route coordinate segments based on cumulative distance (meters)
const getCoordinateAtDistance = (routeCoords: LngLat[], distMeters: number): { coords: LngLat, coordIndex: number } => {
  if (!routeCoords || routeCoords.length === 0) return { coords: [0, 0], coordIndex: 0 };
  if (distMeters <= 0) return { coords: routeCoords[0], coordIndex: 0 };
  
  let accumulated = 0;
  for (let i = 0; i < routeCoords.length - 1; i++) {
    const d = distanceMeters(routeCoords[i], routeCoords[i + 1]);
    if (accumulated + d >= distMeters) {
      const ratio = d > 0 ? (distMeters - accumulated) / d : 0;
      const lng = routeCoords[i][0] + (routeCoords[i + 1][0] - routeCoords[i][0]) * ratio;
      const lat = routeCoords[i][1] + (routeCoords[i + 1][1] - routeCoords[i][1]) * ratio;
      return { coords: [lng, lat], coordIndex: i };
    }
    accumulated += d;
  }
  return { coords: routeCoords[routeCoords.length - 1], coordIndex: routeCoords.length - 1 };
};

// Pretty formats remaining time
const fmtTripTime = (sec: number) => {
  if (sec <= 0) return '0 min';
  const hrs = Math.floor(sec / 3600);
  const mins = Math.floor((sec % 3600) / 60);
  if (hrs > 0) {
    return `${hrs} hr ${mins} min`;
  }
  return `${mins} min`;
};

function RouteThumb() {
  return (
    <View style={styles.thumb}>
      <Svg width={22} height={22} viewBox="0 0 26 26">
        <Path d="M3 15 L7 9 L10.5 14 L14 7 L17.5 12.5 L23 6" stroke="#FF3B30" strokeWidth={2.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </View>
  );
}

export function DriveScreen() {
  const { openProfile: onOpenProfile, openDetail: onOpenDetail, openNav } = useAppContext();

  // ── Inline search + routing state ────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Place[]>([]);
  const [searchBusy, setSearchBusy] = useState(false);
  const [destination, setDestination] = useState<Place | null>(null);
  const [route, setRoute] = useState<LngLat[] | null>(null);
  const [maneuvers, setManeuvers] = useState<Maneuver[]>([]);
  const [routeInfo, setRouteInfo] = useState<{ distanceMi: number; durationSec: number } | null>(null);
  const [routeBusy, setRouteBusy] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [userLoc, setUserLoc] = useState<LngLat | null>(null);
  const [mapCenter, setMapCenter] = useState<LngLat>([REGION.longitude, REGION.latitude]);
  const [mapZoom, setMapZoom] = useState(13);
  // ── Navigation state (active during HUD) ─────────────────────────────────
  const [navManeuverIdx, setNavManeuverIdx] = useState(0);
  const [navDistToNext, setNavDistToNext] = useState<number | null>(null); // metres
  const [remDist, setRemDist] = useState<number | null>(null);
  const [remDur, setRemDur] = useState<number | null>(null);
  const navWatchRef = useRef<any>(null);
  const searchDebounce = useRef<any>(null);
  const searchSeq = useRef(0);          // guards against out-of-order geocode responses
  const userLocRef = useRef<LngLat | null>(null);
  useEffect(() => { userLocRef.current = userLoc; }, [userLoc]);
  const routeRef = useRef<LngLat[] | null>(null);
  useEffect(() => { routeRef.current = route; }, [route]);
  const prevGpsRef = useRef<{ coords: LngLat, time: number } | null>(null);

  // Recenter the map back onto the user's live location. Always responds:
  // fresh GPS fix → last known fix → map default. (It used to silently do
  // nothing when GPS was denied/unavailable and no fix had been captured.)
  const recenterMap = () => {
    const apply = (lng: number, lat: number, zoom = 15) => {
      if (typeof lng !== 'number' || typeof lat !== 'number' || (lng === 0 && lat === 0)) return fallback();
      setUserLoc([lng, lat]);
      setMapCenter([lng, lat]);
      setMapZoom(zoom);
    };
    const fallback = () => {
      const last = userLocRef.current;
      if (last) { setMapCenter([last[0], last[1]]); setMapZoom(15); }
      else { setMapCenter([REGION.longitude, REGION.latitude]); setMapZoom(13); }
    };
    if (Platform.OS === 'web') {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          p => apply(p.coords.longitude, p.coords.latitude),
          fallback,
          { enableHighAccuracy: true, timeout: 4000, maximumAge: 30000 },
        );
      } else fallback();
      return;
    }
    Location.getCurrentPositionAsync({})
      .then(p => apply(p?.coords?.longitude as number, p?.coords?.latitude as number))
      .catch(fallback);
  };

  // Get GPS position once on mount so route calculation uses real location
  useEffect(() => {
    const onFix = (lng: number, lat: number) => {
      if (typeof lng !== 'number' || typeof lat !== 'number' || (lng === 0 && lat === 0)) return;
      setUserLoc([lng, lat]);
      // Don't yank the camera if a route is being shown — the GPS fix can arrive
      // seconds late and used to cancel the route's fit-to-bounds mid-animation.
      if (!routeRef.current) setMapCenter([lng, lat]);
    };
    const webFallback = () => {
      if (Platform.OS === 'web' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          pos => onFix(pos.coords.longitude, pos.coords.latitude),
          () => {},
        );
      }
    };
    Location.requestForegroundPermissionsAsync().then(({ status }) => {
      if (status === 'granted') {
        Location.getCurrentPositionAsync({})
          .then(loc => onFix(loc?.coords?.longitude, loc?.coords?.latitude))
          .catch(webFallback);
      } else {
        webFallback();
      }
    }).catch(webFallback);
  }, []);

  const fmtEta = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m} min`;
  };

  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
    if (!text.trim()) { setSearchResults([]); setDestination(null); setRoute(null); setRouteInfo(null); setRouteError(null); return; }
    setRouteError(null);
    clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(async () => {
      if (text.trim().length < 3) return;
      const seq = ++searchSeq.current;
      try {
        setSearchBusy(true);
        const r = await geocode(text, userLocRef.current ?? [REGION.longitude, REGION.latitude]);
        if (seq !== searchSeq.current) return; // a newer search superseded this one
        setSearchResults(r);
      } catch { if (seq === searchSeq.current) setSearchResults([]); }
      finally { if (seq === searchSeq.current) setSearchBusy(false); }
    }, 350);
  }, []);

  // Cancel any pending debounce when leaving the screen.
  useEffect(() => () => clearTimeout(searchDebounce.current), []);

  const pickDestination = async (place: Place) => {
    const seq = ++searchSeq.current; // invalidate pending searches AND older route fetches
    setDestination(place);
    setSearchQuery(place.name);
    setSearchResults([]);
    setSearchBusy(false);

    // Fetch route from current user location → destination
    const origin: LngLat = userLocRef.current ?? mapCenter ?? [REGION.longitude, REGION.latitude];

    try {
      setRouteBusy(true);
      setRoute(null);
      setManeuvers([]);
      setRouteInfo(null);
      setRouteError(null);
      const r: Route = await getRoute(origin, place.center);
      if (seq !== searchSeq.current) return; // user picked a different destination meanwhile
      setRoute(r.coordinates);
      setManeuvers(r.maneuvers);
      setRouteInfo({ distanceMi: r.distanceMi, durationSec: r.durationSec });
    } catch (err) {
      if (seq !== searchSeq.current) return;
      // No fake straight-line fallback — it produced misleading paths/ETAs. Explain instead.
      const noRoad = err instanceof RouteError && (err.code === 171 || err.code === 170 || err.code === 442);
      setRouteError(noRoad
        ? `"${place.name}" isn't near a drivable road — try a more specific place (a city or address).`
        : 'Couldn’t find a route. Check your connection and try again.');
      setDestination(null);
    } finally {
      if (seq === searchSeq.current) setRouteBusy(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setDestination(null);
    setRoute(null);
    setManeuvers([]);
    setRouteInfo(null);
    setRouteError(null);
  };
  const [hudActive, setHudActive] = useState(false);
  const [speed, setSpeed] = useState(0);
  const [topSpeed, setTopSpeed] = useState(0);
  const [distance, setDistance] = useState(0);
  const [duration, setDuration] = useState(0);
  const [sortMode, setSortMode] = useState('Recent');
  const [carFilter, setCarFilter] = useState('All Cars');
  const [carPickerOpen, setCarPickerOpen] = useState(false);
  const intervalRef = useRef<any>(null);
  const durationRef = useRef<any>(null);

  // Draggable bottom sheet — 3 snap points: Full / Origin / Minimized (starts at Origin).
  // Snap points follow the live window size (they used to be frozen at load time, which
  // broke the sheet whenever the window/orientation changed).
  const { height: winH } = useWindowDimensions();
  const snapPoints = useMemo(() => snapPointsFor(winH), [winH]);
  const snapRef = useRef(snapPoints);
  const sheetY = useRef(new Animated.Value(snapPoints[1])).current;
  const dragStart = useRef(snapPoints[1]);
  const posIdx = useRef(1); // 0=full, 1=origin, 2=min
  const expandedRef = useRef(false);
  const snapToIdx = (idx: number) => {
    posIdx.current = idx;
    expandedRef.current = idx === 0;
    Animated.spring(sheetY, {
      toValue: snapRef.current[idx],
      useNativeDriver: false,
      tension: 90,
      friction: 14,   // no overshoot, quick settle
      restDisplacementThreshold: 0.5,
      restSpeedThreshold: 0.5,
    }).start();
  };
  // When the window resizes, refresh the snap table and re-settle at the current index.
  useEffect(() => {
    snapRef.current = snapPoints;
    snapToIdx(posIdx.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapPoints]);
  const expand = () => { if (!expandedRef.current) snapToIdx(0); };
  const nearest = (v: number) => {
    const pts = snapRef.current;
    return pts.reduce((best, p, i) => (Math.abs(p - v) < Math.abs(pts[best] - v) ? i : best), 0);
  };
  const settle = (g: { dy: number; vy: number }) => {
    const pts = snapRef.current;
    const cur = Math.max(pts[0], Math.min(pts[2], dragStart.current + g.dy));
    const startIdx = nearest(dragStart.current);
    const up = g.dy < -6 || g.vy < -0.25;
    const down = g.dy > 6 || g.vy > 0.25;
    // Step one snap point in the drag direction; otherwise settle to nearest.
    const idx = up ? Math.max(0, startIdx - 1)
      : down ? Math.min(pts.length - 1, startIdx + 1)
        : nearest(cur);
    snapToIdx(idx);
  };
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      // 8px dead zone (was 3px): taps with a tiny wobble were being captured as drags,
      // which made the header buttons/pills feel like they randomly ignored presses.
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 8 && Math.abs(g.dy) > Math.abs(g.dx) * 1.2,
      onPanResponderGrant: () => { sheetY.stopAnimation((v: number) => (dragStart.current = v)); },
      onPanResponderMove: (_, g) => {
        const pts = snapRef.current;
        const ny = Math.max(pts[0], Math.min(pts[2], dragStart.current + g.dy));
        sheetY.setValue(ny);
      },
      // Don't let the ScrollView steal the drag mid-gesture (was causing it to stick).
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderRelease: (_, g) => settle(g),
      onPanResponderTerminate: (_, g) => settle(g),
    })
  ).current;

  const trips = [...TRIPS]
    .filter(t => carFilter === 'All Cars' || t.car === carFilter)
    .sort((a, b) =>
      sortMode === 'Oldest' ? b.id - a.id
        : sortMode === 'Fastest' ? b.mph - a.mph
          : sortMode === 'Longest' ? b.dist - a.dist
            : a.id - b.id
    );

  const startTrack = () => {
    // Guard: double-taps used to spawn duplicate timers (stats then ticked at 2x
    // and End Drive only cleared one of them).
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (durationRef.current) clearInterval(durationRef.current);
    if (navWatchRef.current) {
      if (typeof navWatchRef.current === 'number') navigator.geolocation?.clearWatch(navWatchRef.current);
      else navWatchRef.current.remove?.();
      navWatchRef.current = null;
    }
    // Always launch the live HUD — regardless of whether a destination was picked
    setHudActive(true); setSpeed(0); setTopSpeed(0); setDistance(0); setDuration(0);
    setNavManeuverIdx(0); setNavDistToNext(null);
    setRemDist(routeRef.current && routeInfo ? routeInfo.distanceMi : null);
    setRemDur(routeRef.current && routeInfo ? routeInfo.durationSec : null);
    
    // Reset previous GPS state for calculations
    prevGpsRef.current = null;

    const t0 = Date.now();
    durationRef.current = setInterval(() => setDuration(Math.floor((Date.now() - t0) / 1000)), 1000);

    const onLocationUpdate = (coords: { longitude: number; latitude: number; speed: number | null }) => {
      const ll: LngLat = [coords.longitude, coords.latitude];
      setUserLoc(ll);
      setMapCenter(ll);

      const now = Date.now();

      // 1. Calculate live speed (MPH)
      let calculatedSpeed = 0;
      if (prevGpsRef.current) {
        const distanceDiffM = distanceMeters(prevGpsRef.current.coords, ll);
        const timeDiffSec = (now - prevGpsRef.current.time) / 1000;
        if (timeDiffSec > 0.5) {
          calculatedSpeed = Math.round((distanceDiffM / timeDiffSec) * 2.23694);
        }
      }

      const liveSpeedMph = coords.speed !== null && coords.speed >= 0
        ? Math.round(coords.speed * 2.23694)
        : calculatedSpeed;

      setSpeed(liveSpeedMph);
      setTopSpeed(p => Math.max(p, liveSpeedMph));

      // 2. Accumulate driven distance
      if (prevGpsRef.current) {
        const distM = distanceMeters(prevGpsRef.current.coords, ll);
        const distMi = distM * 0.000621371;
        setDistance(p => p + distMi);
      }

      prevGpsRef.current = { coords: ll, time: now };

      // 3. Navigation Calculations
      const rt = routeRef.current;
      if (rt && rt.length > 0 && routeInfo) {
        // Find closest route coordinate index
        let closestIdx = 0;
        let minDistance = Infinity;
        for (let i = 0; i < rt.length; i++) {
          const d = distanceMeters(ll, rt[i]);
          if (d < minDistance) {
            minDistance = d;
            closestIdx = i;
          }
        }

        // Update maneuvers index
        let activeMIdx = 0;
        for (let i = 0; i < maneuvers.length; i++) {
          if (closestIdx >= maneuvers[i].beginIndex) {
            activeMIdx = i;
          }
        }
        setNavManeuverIdx(activeMIdx);

        // Distance to next maneuver
        const nextM = maneuvers[activeMIdx + 1];
        let distToNext = null;
        if (nextM) {
          const nextPt = rt[nextM.beginIndex];
          if (nextPt) distToNext = distanceMeters(ll, nextPt);
        } else {
          // Final leg: distance to destination
          const destPt = rt[rt.length - 1];
          if (destPt) distToNext = distanceMeters(ll, destPt);
        }
        setNavDistToNext(distToNext);

        // Sum remaining distance along route segments
        let remDistM = distanceMeters(ll, rt[closestIdx]);
        for (let i = closestIdx; i < rt.length - 1; i++) {
          remDistM += distanceMeters(rt[i], rt[i + 1]);
        }
        const remDistMi = remDistM * 0.000621371;
        setRemDist(remDistMi);

        // Calculate dynamic ETA duration
        const remDurSec = getRemainingDurationSec(remDistMi, routeInfo.distanceMi, routeInfo.durationSec, liveSpeedMph);
        setRemDur(remDurSec);
      }
    };

    // Start live GPS watching
    if (Platform.OS === 'web' && navigator.geolocation) {
      navWatchRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          onLocationUpdate({
            longitude: pos.coords.longitude,
            latitude: pos.coords.latitude,
            speed: pos.coords.speed,
          });
        },
        () => { },
        { enableHighAccuracy: true, maximumAge: 1000 },
      );
    } else {
      Location.watchPositionAsync({ accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 1 }, loc => {
        onLocationUpdate({
          longitude: loc.coords.longitude,
          latitude: loc.coords.latitude,
          speed: loc.coords.speed,
        });
      }).then(sub => { navWatchRef.current = sub; }).catch(() => { });
    }
  };
  const endDrive = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (durationRef.current) clearInterval(durationRef.current);
    // Stop GPS nav watcher
    if (navWatchRef.current) {
      if (typeof navWatchRef.current === 'number') navigator.geolocation.clearWatch(navWatchRef.current);
      else navWatchRef.current.remove?.();
      navWatchRef.current = null;
    }
    setHudActive(false);
    setNavManeuverIdx(0);
    setNavDistToNext(null);
    setRemDist(null);
    setRemDur(null);
  };
  const fmt = (sec: number) => `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, '0')}`;

  // Stop timers + GPS watcher if the screen unmounts mid-drive (they leaked before).
  useEffect(() => () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (durationRef.current) clearInterval(durationRef.current);
    if (navWatchRef.current) {
      if (typeof navWatchRef.current === 'number') navigator.geolocation?.clearWatch(navWatchRef.current);
      else navWatchRef.current.remove?.();
      navWatchRef.current = null;
    }
  }, []);

  // ---- Live tracking HUD (dark cockpit) ----
  if (hudActive) {
    const curManeuver = maneuvers[navManeuverIdx] ?? null;
    const distToNextM = navDistToNext;
    const fmtNavDist = (m: number | null) => {
      if (m === null) return '';
      if (m < 160) return `${Math.round(m)} m`;
      return `${(m * 0.000621371).toFixed(1)} mi`;
    };
    // Maneuver type → arrow icon
    const maneuverIcon = (type: number): string => {
      if (type === 10 || type === 11) return '←'; // turn left
      if (type === 12 || type === 13) return '→'; // turn right
      if (type === 1) return '↑';                  // continue straight
      if (type === 23) return '🏁';                 // arrive
      return '↑';
    };

    return (
      <View style={styles.hudContainer}>
        {/* Live map as the HUD background — shows route if one was fetched */}
        <BaseMap
          center={mapCenter}
          zoom={17}
          dark
          showUser
          followUser
          destination={destination?.center}
          route={route ?? undefined}
          padding={{ paddingBottom: 300 }}
        />
        {/* Slight dark tint so the panel text stays readable */}
        <View style={styles.hudMapTint} pointerEvents="none" />

        {/* Nav instruction banner — only when a route is active */}
        {curManeuver && (
          <View style={styles.navBanner}>
            <View style={styles.navArrowBox}>
              <Text style={styles.navArrow}>{maneuverIcon(curManeuver.type)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.navInstruction} numberOfLines={2}>{curManeuver.instruction}</Text>
              {distToNextM !== null && (
                <Text style={styles.navDist}>{fmtNavDist(distToNextM)}</Text>
              )}
            </View>
          </View>
        )}

        <View style={styles.htop}>
          <View style={styles.liveBadge}><View style={styles.liveDot} /><Text style={styles.liveText}>LIVE</Text></View>
          <View style={styles.limitBadge}><Text style={styles.limitLabel}>LIMIT</Text><Text style={styles.limitValue}>45</Text></View>
        </View>
        <View style={styles.hpanel}>
          <View style={styles.htop2}>
            <Speedometer speed={speed} />
            <View style={styles.gst}>
              <View style={styles.gr}>
                <Text style={styles.gl}>{routeInfo ? 'Remaining Dist' : 'Distance'}</Text>
                <Text style={styles.gv}>
                  {routeInfo && remDist !== null ? `${remDist.toFixed(1)} mi` : `${distance.toFixed(1)} mi`}
                </Text>
              </View>
              <View style={styles.gr}>
                <Text style={styles.gl}>{routeInfo ? 'Time to Dest' : 'Top speed'}</Text>
                <Text style={[styles.gv, routeInfo ? {} : { color: colors.acc }]}>
                  {routeInfo && remDur !== null ? fmtTripTime(remDur) : `${topSpeed} mph`}
                </Text>
              </View>
              <View style={styles.gr}>
                <Text style={styles.gl}>{routeInfo ? 'Time Elapsed' : 'Duration'}</Text>
                <Text style={styles.gv}>{fmt(duration)}</Text>
              </View>
            </View>
          </View>
          <View style={styles.hctrls}>
            <TouchableOpacity style={styles.hbtnReport}><Text style={{ color: '#d8d8de', fontSize: 14, fontWeight: '500' }}>Report</Text></TouchableOpacity>
            <TouchableOpacity style={styles.hbtnEnd} onPress={endDrive}><Text style={{ color: '#fff', fontSize: 15, fontWeight: '500' }}>End Drive</Text></TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // ---- Drive home (dark theme, matching reference) ----
  return (
    <View style={styles.container}>
      {/* Live MapLibre backdrop — dark style to match the app theme */}
      <BaseMap
        center={mapCenter}
        zoom={mapZoom}
        dark
        destination={destination?.center}
        route={route ?? undefined}
        padding={{ paddingBottom: 300 }}
      />


      {/* Dark map overlay tint */}
      <View style={styles.mapOverlay} pointerEvents="none" />

      {/* Inline search bar + live results dropdown */}
      <View style={styles.searchWrap}>
        <View style={styles.search}>
          <Ionicons name="search" size={18} color="#8A8A90" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search Here"
            placeholderTextColor="#8A8A90"
            value={searchQuery}
            onChangeText={handleSearchChange}
            onFocus={() => snapToIdx(2)}
            returnKeyType="search"
          />
          {searchBusy
            ? <ActivityIndicator size="small" color="#8A8A90" />
            : searchQuery
              ? <TouchableOpacity onPress={clearSearch}><Ionicons name="close-circle" size={18} color="#8A8A90" /></TouchableOpacity>
              : <Ionicons name="navigate" size={18} color="#FF5A2E" />
          }
        </View>
        {routeError && (
          <View style={styles.routeErrorBox}>
            <Ionicons name="alert-circle" size={16} color="#FF7A6E" />
            <Text style={styles.routeErrorText}>{routeError}</Text>
          </View>
        )}
        {searchResults.length > 0 && (
          <ScrollView style={styles.searchResults} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {searchResults.map((place, i) => (
              <TouchableOpacity key={i} style={styles.resultRow} onPress={() => pickDestination(place)}>
                <Ionicons name="location-outline" size={16} color="#FF5A2E" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.resultName} numberOfLines={1}>{place.name}</Text>
                  <Text style={styles.resultLabel} numberOfLines={1}>{place.label}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Route info card — behind the drive panel, fades as panel rises */}
      {(routeBusy || routeInfo) && (
        <Animated.View style={[styles.routeCard, {
          opacity: sheetY.interpolate({
            inputRange: [snapPoints[1], snapPoints[2]],
            outputRange: [0, 1],
            extrapolate: 'clamp',
          }),
        }]}>
          {routeBusy ? (
            <ActivityIndicator color="#FF5A2E" size="small" />
          ) : routeInfo ? (
            <>
              <View style={styles.routeCardLeft}>
                <Ionicons name="navigate" size={20} color="#FF5A2E" />
                <View style={{ marginLeft: 10 }}>
                  <Text style={styles.routeDist}>{routeInfo.distanceMi.toFixed(1)} mi</Text>
                  <Text style={styles.routeEta}>{fmtEta(routeInfo.durationSec)} · via fastest route</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.goBtn} onPress={startTrack} activeOpacity={0.85}>
                <View style={styles.goDot} />
                <Text style={styles.goBtnText}>Start Track</Text>
              </TouchableOpacity>
            </>
          ) : null}
        </Animated.View>
      )}

      {/* Map controls (dark glass pill, right side) */}
      <View style={styles.mapCtrls}>
        <TouchableOpacity style={styles.ctrlBtn}>
          <Ionicons name="settings-sharp" size={18} color="#fff" />
        </TouchableOpacity>
        <View style={styles.ctrlDivider} />
        <TouchableOpacity style={styles.ctrlBtn}>
          <Ionicons name="moon" size={18} color="#fff" />
        </TouchableOpacity>
        <View style={styles.ctrlDivider} />
        <TouchableOpacity style={styles.ctrlBtn} onPress={recenterMap}>
          <Ionicons name="location-sharp" size={18} color="#fff" />
        </TouchableOpacity>
        <View style={styles.ctrlDivider} />
        <TouchableOpacity style={styles.ctrlBtn} onPress={onOpenProfile}>
          <Ionicons name="person-circle" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Dark frosted glass Drawer (draggable bottom sheet) */}
      <Animated.View style={[styles.drawer, { transform: [{ translateY: sheetY }] }]}>
        {/* Whole header is the drag zone (handle + title + filter bar) */}
        <View {...pan.panHandlers}>
          <View style={styles.grabber}>
            <View style={styles.handle} />
          </View>

          {/* Header: Drives + Start Track */}
          <View style={styles.dhd}>
            <View style={styles.dhdTopRow}>
              <Text style={styles.dhdTitle}>Drives</Text>
              <TouchableOpacity style={styles.trackBtn} onPress={startTrack} activeOpacity={0.85}>
                <View style={styles.trackDot} />
                <Text style={styles.trackText}>Start Track</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.dhdSub}>{TRIPS.length} drives · {TOTAL_MI} mi</Text>
          </View>

          {/* Filter bar: Car filter + Sort pills */}
          <View style={styles.filterBar}>
            <TouchableOpacity style={styles.carFilter} activeOpacity={0.7} onPress={() => setCarPickerOpen(true)}>
              <Ionicons name="car-sport-outline" size={14} color="#9A9AA5" />
              <Text style={styles.carFilterText} numberOfLines={1}>{carFilter}</Text>
              <Text style={{ color: '#9A9AA5', fontSize: 10 }}>▾</Text>
            </TouchableOpacity>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={styles.sortPillsContainer}>
              {['Recent', 'Oldest', 'Fastest', 'Longest'].map(s => (
                <TouchableOpacity
                  key={s}
                  style={[styles.sortPill, sortMode === s && styles.sortPillActive]}
                  onPress={() => setSortMode(s)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.sortPillText, sortMode === s && styles.sortPillTextActive]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          onScrollBeginDrag={expand}
          scrollEventThrottle={16}
        >
          {trips.map(t => (
            <TouchableOpacity
              key={t.id}
              style={styles.card}
              activeOpacity={0.85}
              onPress={() => onOpenDetail({ id: t.id, name: t.date, date: t.time, dist: t.dist, top: t.mph, dur: t.dur, pb: t.clip, car: 'Civic Type R' })}
            >
              <RouteThumb />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.cardDate}>{t.date}</Text>
                  {t.clip && <View style={styles.clip}><Text style={styles.clipText}>CLIP</Text></View>}
                </View>
                <Text style={styles.cardTime}>{t.time}</Text>
                <Text style={styles.cardMeta}>{t.dist} mi · {t.dur}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', paddingLeft: 8 }}>
                <Text style={styles.mph}>{t.mph}</Text>
                <Text style={styles.mphUnit}>MPH</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.25)" />
            </TouchableOpacity>
          ))}
          <View style={{ height: 120 }} />
        </ScrollView>
      </Animated.View>

      {/* Garage car picker */}
      <CarPicker
        visible={carPickerOpen}
        current={carFilter}
        onSelect={setCarFilter}
        onClose={() => setCarPickerOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0b0e' },
  map: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  mapOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(7,7,9,0.15)',
  },

  // Search bar wrapper — positioned absolute
  searchWrap: {
    position: 'absolute', top: 52, left: 16, right: 16,
    zIndex: 110,
  },
  search: {
    height: 46, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.38)',
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 4,
    ...Platform.select({
      web: { backdropFilter: 'blur(20px) saturate(180%) brightness(0.9)', WebkitBackdropFilter: 'blur(20px) saturate(180%) brightness(0.9)' } as any,
      default: {},
    }),
  },
  searchInput: {
    flex: 1, color: '#fff', fontSize: 15,
    ...Platform.select({ web: { outlineStyle: 'none' } as any, default: {} }),
  },
  searchResults: {
    marginTop: 6, backgroundColor: 'rgba(15,16,22,0.96)', borderRadius: 14,
    maxHeight: 260, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 10,
  },
  resultRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 14, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  resultName: { color: '#fff', fontSize: 14, fontWeight: '500' },
  resultLabel: { color: '#6A6A75', fontSize: 11, marginTop: 1 },
  routeErrorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6,
    backgroundColor: 'rgba(90,20,14,0.92)', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: 'rgba(255,110,90,0.35)',
  },
  routeErrorText: { flex: 1, color: '#FFD9D2', fontSize: 12.5, lineHeight: 17 },

  // Route info card — behind the drive panel, fades with sheet position
  routeCard: {
    position: 'absolute',
    // Sits 8px above the sheet's minimized peek (sheet snaps to min when search is focused)
    bottom: SHEET_MIN_PEEK + 8,
    left: 16, right: 16,
    zIndex: 98,  // below the drive panel (100) so it lives behind it
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.38)',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 10,
    ...Platform.select({
      web: { backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)' } as any,
      default: {},
    }),
  },
  routeCardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  routeDist: { color: '#fff', fontSize: 16, fontWeight: '700' },
  routeEta: { color: '#8A8A95', fontSize: 12, marginTop: 1 },
  goBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.acc, borderRadius: 22,
    paddingHorizontal: 16, paddingVertical: 10,
    shadowColor: 'rgba(255,64,20,.5)', shadowOpacity: 1, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  goDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#fff' },
  goBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },


  mapCtrls: {
    position: 'absolute', top: 112, right: 14, zIndex: 90,
    backgroundColor: 'rgba(0,0,0,0.38)',
    borderRadius: 20,
    paddingVertical: 4, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 3 }, elevation: 4,
    ...Platform.select({
      web: { backdropFilter: 'blur(20px) saturate(180%) brightness(0.9)', WebkitBackdropFilter: 'blur(20px) saturate(180%) brightness(0.9)' } as any,
      default: {},
    }),
  },
  ctrlBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  ctrlDivider: { height: 1, width: 26, backgroundColor: 'rgba(255,255,255,0.08)' },

  // Drawer — dark frosted glass
  grabber: { alignItems: 'center', paddingBottom: 12, marginTop: -4, paddingTop: 4 },
  drawer: {
    position: 'absolute', left: 12, right: 12, bottom: 12, top: SHEET_EXPANDED_TOP,
    zIndex: 100,
    backgroundColor: 'rgba(0,0,0,0.38)',
    borderRadius: 32,
    paddingHorizontal: 20, paddingTop: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 40, shadowOffset: { width: 0, height: -10 }, elevation: 12,
    ...Platform.select({
      web: { backdropFilter: 'blur(10px) saturate(180%) brightness(0.9)', WebkitBackdropFilter: 'blur(20px) saturate(180%) brightness(0.9)' } as any,
      default: {},
    }),
  },
  handle: {
    width: 36, height: 5, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.22)', alignSelf: 'center',
  },
  dhd: { marginBottom: 24 },
  dhdTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dhdTitle: { color: '#f2f2f5', fontSize: 34, fontWeight: '800', letterSpacing: -0.5, lineHeight: 38 },
  dhdSub: { color: '#555560', fontSize: 13, fontWeight: '500', marginTop: 4 },

  // Start Track button — gradient-style
  trackBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 20, paddingVertical: 12, borderRadius: 50,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.22)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8,
    elevation: 4,
    ...Platform.select({
      web: { backdropFilter: 'blur(12px) saturate(180%)', WebkitBackdropFilter: 'blur(12px) saturate(180%)' } as any,
      default: {},
    }),
  },
  trackDot: {
    width: 10, height: 10, borderRadius: 5, backgroundColor: '#fff',
  },
  trackText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  // Filter bar
  filterBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14,
  },
  carFilter: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  carFilterText: { color: '#9A9AA5', fontSize: 12, fontWeight: '600', maxWidth: 120 },

  // Sort pills
  sortPillsContainer: { flexDirection: 'row', gap: 4, paddingRight: 20 },
  sortPill: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 50,
  },
  sortPillActive: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  sortPillText: { color: '#66666e', fontSize: 12, fontWeight: '600' },
  sortPillTextActive: { color: '#fff' },

  // Dark glass drive cards
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(0,0,0,0.38)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20, padding: 12, marginBottom: 6,
    ...Platform.select({
      web: { backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' } as any,
      default: {},
    }),
  },
  // Route thumb — square with rounded corners (matching reference)
  thumb: {
    width: 42, height: 42, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  cardDate: { color: '#f2f2f5', fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
  clip: { backgroundColor: '#FF5E1A', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  clipText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  cardTime: { color: '#9A9AA5', fontSize: 11, marginTop: 1 },
  cardMeta: { color: '#888892', fontSize: 11, marginTop: 1 },
  mph: { color: '#FF2E3C', fontSize: 26, fontWeight: '600', lineHeight: 28, letterSpacing: -1 },
  mphUnit: { color: '#888892', fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },

  // ---- HUD (dark) ----
  hudContainer: { flex: 1, backgroundColor: '#070809' },
  hudMapTint: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(4,5,8,0.18)' },
  htop: { position: 'absolute', top: 54, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', zIndex: 6 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: colors.liveRed, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#fff' },
  liveText: { color: '#fff', fontSize: 12, fontWeight: '500', letterSpacing: 1 },
  limitBadge: { width: 64, backgroundColor: '#fff', borderRadius: 9, paddingVertical: 5, alignItems: 'center' },
  limitLabel: { color: '#0b0b0b', fontSize: 11, fontWeight: '500' },
  limitValue: { color: '#0b0b0b', fontSize: 28, fontWeight: '600', lineHeight: 30 },
  hpanel: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.38)',
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    borderTopWidth: 1, borderColor: 'rgba(255,255,255,.1)',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 112, zIndex: 8,
    ...Platform.select({
      web: { backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)' } as any,
      default: {},
    }),
  },
  htop2: { flexDirection: 'row', gap: 16, marginBottom: 14 },
  gst: { flex: 1, justifyContent: 'center' },
  gr: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,.08)' },
  gl: { color: '#9A9AA0', fontSize: 14 },
  gv: { color: '#fff', fontSize: 18, fontWeight: '500' },
  hctrls: { flexDirection: 'row', gap: 10 },
  hbtnReport: { flex: 1, paddingVertical: 15, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,.16)', alignItems: 'center', justifyContent: 'center' },
  hbtnEnd: { flex: 1.6, paddingVertical: 15, borderRadius: 15, backgroundColor: colors.acc, alignItems: 'center', justifyContent: 'center' },

  // Navigation instruction banner
  navBanner: {
    position: 'absolute', top: 120, left: 16, right: 16, zIndex: 10,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: 'rgba(0,0,0,0.38)',
    borderRadius: 20, padding: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 12,
    ...Platform.select({
      web: { backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)' } as any,
      default: {},
    }),
  },
  navArrowBox: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: colors.acc,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: 'rgba(255,64,20,.6)', shadowOpacity: 1, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  navArrow: { fontSize: 26, color: '#fff' },
  navInstruction: { color: '#fff', fontSize: 16, fontWeight: '700', lineHeight: 22 },
  navDist: { color: colors.acc, fontSize: 13, fontWeight: '600', marginTop: 4 },
});
