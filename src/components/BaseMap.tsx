import React, { useEffect } from 'react';
import { View, StyleSheet, Platform, Image, ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import * as Location from 'expo-location';
import { MAP_STYLE_LIGHT, MAP_STYLE_URL } from '../config';

// MapLibre is a native module — no web build. Guard so the web export doesn't crash.
const ML: any = Platform.OS !== 'web' ? require('@maplibre/maplibre-react-native') : null;
const MLMap = ML?.Map;
const MLCamera = ML?.Camera;
const MLUser = ML?.UserLocation;

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
  destination?: [number, number]; // optional pin [lng, lat]
  route?: [number, number][];     // optional polyline coordinates
  markers?: MapMarker[];
  followUser?: boolean;           // keep the camera locked onto the user's location
  style?: ViewStyle | ViewStyle[];
  children?: React.ReactNode;
  padding?: {
    paddingLeft?: number;
    paddingRight?: number;
    paddingTop?: number;
    paddingBottom?: number;
  };
}

const DEFAULT_CENTER: [number, number] = [-122.4312, 37.7719];

export function BaseMap({ center = DEFAULT_CENTER, zoom = 13, dark = false, showUser = true, destination, route, markers = [], followUser = false, style, children, padding }: Props) {
  const cameraRef = React.useRef<any>(null);

  // Ask for location permission so the <UserLocation> puck can render "where we are".
  useEffect(() => {
    if ((showUser || followUser) && Platform.OS !== 'web') {
      Location.requestForegroundPermissionsAsync().catch(() => {});
    }
  }, [showUser, followUser]);

  // Animate to a new center/zoom when they change (e.g. recenter button). Skipped while
  // following the user, where the Camera tracks location itself. Only fires on prop change,
  // so it doesn't fight the user panning.
  useEffect(() => {
    if (followUser) return;
    cameraRef.current?.setStop?.({
      centerCoordinate: center,
      zoomLevel: zoom,
      animationDuration: 600,
      ...(padding ? { padding } : {})
    });
  }, [center, zoom, followUser, padding]);

  if (!MLMap) {
    // Web fallback — static map image so layouts still look right in the web preview.
    return (
      <Image
        source={require('../../assets/map-placeholder.png')}
        style={[StyleSheet.absoluteFill, { resizeMode: 'cover' }, style as any]}
      />
    );
  }
  return (
    <MLMap
      style={[StyleSheet.absoluteFill, style as any]}
      mapStyle={dark ? MAP_STYLE_URL : MAP_STYLE_LIGHT}
      logoEnabled={false}
      attributionEnabled
      compassEnabled={false}
    >
      <MLCamera
        ref={cameraRef}
        initialViewState={{ centerCoordinate: center, zoomLevel: zoom }}
        padding={padding}
        {...(followUser ? { trackUserLocation: 'default' as const } : {})}
      />
      {(showUser || followUser) && (
        <MLUser visible androidRenderMode="normal">
          {followUser ? (
            /* Glass circle with orange arrow pointing up */
            <View style={styles.userMarkerFollow}>
              <Svg width={20} height={20} viewBox="0 0 24 24">
                <Path d="M12 2L4.5 20.29 L5.21 21 L12 18 L18.79 21 L19.5 20.29 Z" fill="#FF5A2E" />
              </Svg>
            </View>
          ) : (
            /* Orange dot with white border */
            <View style={styles.userMarkerNormal} />
          )}
        </MLUser>
      )}
      {children}
    </MLMap>
  );
}

const styles = StyleSheet.create({
  userMarkerFollow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(10, 10, 12, 0.2)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 5,
  },
  userMarkerNormal: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FF5A2E',
    borderWidth: 3,
    borderColor: '#ffffff',
    shadowColor: '#FF5A2E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
  },
});
