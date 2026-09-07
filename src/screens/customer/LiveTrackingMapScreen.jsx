import { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, Linking, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Phone, MessageCircle, Share2, ShieldCheck, Navigation, CheckCircle2, ArrowLeft, Sparkles } from 'lucide-react-native';
import { mockBookings } from '@data/mockBookings';
import { mockWorkers } from '@data/mockWorkers';
import Badge from '@components/ui/Badge';
import { colors, spacing, radii, shadows, fontSizes, fontWeights, fontFamilies } from '@theme';

/**
 * LiveTrackingMapScreen — ported from web pages/customer/LiveTrackingMap.jsx.
 *
 * WHAT'S REAL vs MOCK (per product decision): the worker's MOVEMENT is a scripted showcase —
 * the worker travels a hardcoded 9-waypoint route (CUSTOMER_ROUTE) via a timed simulation, exactly
 * like the web mockup (there is no real GPS/worker backend). BUT the worker↔customer DISTANCE and
 * the ETA derived from it are computed for real: every animation tick runs the haversine formula
 * between the worker's live interpolated coordinate and the customer's home coordinate. So the
 * shrinking "distance away" is genuine geographic math on the two points, not the web's fake
 * `2400m * (1 - progress)` countdown. If real GPS coordinates ever replace the scripted route,
 * the distance/ETA logic works unchanged.
 *
 * Web used Leaflet + OpenStreetMap (no key). Here we use react-native-maps with the Google
 * provider (key in .env → AndroidManifest meta-data). Markers + polylines + region animation
 * cover everything the web did. Preserved: booking/worker resolution, OTP 4892, worker
 * call/message/share card, camera modes (overview/worker/home), play/pause + replay.
 */

// Hardcoded showcase route to the customer's home (Sector 14, Gurugram NCR) — ported verbatim.
const CUSTOMER_ROUTE = [
  { lat: 28.4550, lng: 77.0220, statusMsg: 'Worker started from Cooperative Hub' },
  { lat: 28.4580, lng: 77.0245, statusMsg: 'Worker is driving along Sector 14 Main Road' },
  { lat: 28.4610, lng: 77.0270, statusMsg: 'Passing MG Road Junction • Normal traffic' },
  { lat: 28.4645, lng: 77.0298, statusMsg: 'Worker is crossing Central Market' },
  { lat: 28.4680, lng: 77.0325, statusMsg: 'Approaching your neighborhood (Block C)' },
  { lat: 28.4715, lng: 77.0355, statusMsg: 'Worker is 500m away on Sahakar Marg' },
  { lat: 28.4740, lng: 77.0375, statusMsg: 'Worker reached Society Main Gate' },
  { lat: 28.4760, lng: 77.0385, statusMsg: 'Worker is entering your apartment building' },
  { lat: 28.4770, lng: 77.0390, statusMsg: 'Worker has arrived at your doorstep!' },
];

// Haversine distance in meters between two lat/lng points. This is the REAL distance math.
function haversineMeters(aLat, aLng, bLat, bLng) {
  const R = 6371000; // earth radius (m)
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Micro-interpolation for smooth movement (ported from web: 35 steps/segment).
function interpolateRoute(points, stepsPerSegment = 35) {
  const result = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    for (let s = 0; s < stepsPerSegment; s++) {
      const t = s / stepsPerSegment;
      result.push({
        lat: p1.lat + (p2.lat - p1.lat) * t,
        lng: p1.lng + (p2.lng - p1.lng) * t,
        statusMsg: p1.statusMsg,
        totalProgress: ((i * stepsPerSegment + s) / ((points.length - 1) * stepsPerSegment)) * 100,
      });
    }
  }
  const last = points[points.length - 1];
  result.push({ lat: last.lat, lng: last.lng, statusMsg: last.statusMsg, totalProgress: 100 });
  return result;
}

// Assumed average travel speed for the ETA estimate (~22 km/h city two-wheeler = ~366 m/min).
const SPEED_M_PER_MIN = 366;

export default function LiveTrackingMapScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const bookingId = route?.params?.bookingId;

  const mapRef = useRef(null);
  const [simIndex, setSimIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [cameraMode, setCameraMode] = useState('overview'); // 'overview' | 'worker' | 'home' | 'manual'

  // Booking + worker resolution — same fallback chain as web.
  const booking =
    mockBookings.find((b) => b.id === bookingId) ||
    mockBookings.find((b) => b.status === 'en-route') ||
    mockBookings[0];
  const worker = mockWorkers.find((w) => w.id === booking?.workerId) || mockWorkers[0];

  const home = CUSTOMER_ROUTE[CUSTOMER_ROUTE.length - 1];
  const interpolatedRoute = useMemo(() => interpolateRoute(CUSTOMER_ROUTE, 35), []);
  const currentPoint = interpolatedRoute[simIndex] || interpolatedRoute[0];
  const isArrived = simIndex >= interpolatedRoute.length - 1;
  const progressPercent = Math.round(currentPoint.totalProgress);

  // REAL distance + ETA from the worker's current coordinate to the customer's home.
  const remainingDistanceMeters = Math.round(
    haversineMeters(currentPoint.lat, currentPoint.lng, home.lat, home.lng)
  );
  const etaMinutes = isArrived ? 0 : Math.max(1, Math.ceil(remainingDistanceMeters / SPEED_M_PER_MIN));

  const fullRouteCoords = useMemo(
    () => CUSTOMER_ROUTE.map((p) => ({ latitude: p.lat, longitude: p.lng })),
    []
  );
  const traveledCoords = useMemo(
    () => interpolatedRoute.slice(0, simIndex + 1).map((p) => ({ latitude: p.lat, longitude: p.lng })),
    [interpolatedRoute, simIndex]
  );

  // Animation loop — advance the scripted position (ported: 130ms/tick).
  useEffect(() => {
    if (!isPlaying || isArrived) return undefined;
    const interval = setInterval(() => {
      setSimIndex((prev) => {
        if (prev < interpolatedRoute.length - 1) return prev + 1;
        setIsPlaying(false);
        return prev;
      });
    }, 130);
    return () => clearInterval(interval);
  }, [isPlaying, isArrived, interpolatedRoute.length]);

  // Camera follow: when in worker/home mode, keep the map centered as the worker moves.
  useEffect(() => {
    if (!mapRef.current) return;
    if (cameraMode === 'worker') {
      mapRef.current.animateCamera({ center: { latitude: currentPoint.lat, longitude: currentPoint.lng } }, { duration: 250 });
    } else if (cameraMode === 'home') {
      mapRef.current.animateCamera({ center: { latitude: home.lat, longitude: home.lng } }, { duration: 250 });
    }
  }, [simIndex, cameraMode, currentPoint.lat, currentPoint.lng, home.lat, home.lng]);

  const fitOverview = () => {
    setCameraMode('overview');
    mapRef.current?.fitToCoordinates(fullRouteCoords, {
      edgePadding: { top: 90, right: 70, bottom: 320, left: 70 },
      animated: true,
    });
  };

  const focusWorker = () => {
    setCameraMode('worker');
    mapRef.current?.animateCamera({ center: { latitude: currentPoint.lat, longitude: currentPoint.lng }, zoom: 16 }, { duration: 400 });
  };

  const focusHome = () => {
    setCameraMode('home');
    mapRef.current?.animateCamera({ center: { latitude: home.lat, longitude: home.lng }, zoom: 16 }, { duration: 400 });
  };

  const replay = () => {
    setSimIndex(0);
    setIsPlaying(true);
    fitOverview();
  };

  const callWorker = () => {
    const tel = (worker.phone || '9876543210').replace(/\s/g, '');
    Linking.openURL(`tel:${tel}`).catch(() => Alert.alert('Unable to place call'));
  };

  const initialRegion = {
    latitude: 28.4660,
    longitude: 77.0305,
    latitudeDelta: 0.03,
    longitudeDelta: 0.03,
  };

  return (
    <View style={styles.root}>
      {/* Map fills the screen; overlays float on top. */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_GOOGLE}
        initialRegion={initialRegion}
        onMapReady={fitOverview}
        onPanDrag={() => setCameraMode('manual')}
        showsMyLocationButton={false}
        toolbarEnabled={false}
      >
        {/* Full planned route (indigo brand) */}
        <Polyline coordinates={fullRouteCoords} strokeColor={colors.primary400} strokeWidth={6} lineCap="round" lineJoin="round" />
        {/* Traveled portion (muted, drawn on top) */}
        <Polyline coordinates={traveledCoords} strokeColor={colors.primary600} strokeWidth={6} lineCap="round" />

        {/* Customer home marker */}
        <Marker coordinate={{ latitude: home.lat, longitude: home.lng }} title="Your Home" description={booking?.address} anchor={{ x: 0.5, y: 1 }}>
          <View style={styles.homeMarker}>
            <Text style={styles.homeMarkerEmoji}>🏠</Text>
          </View>
        </Marker>

        {/* Worker moving marker */}
        <Marker coordinate={{ latitude: currentPoint.lat, longitude: currentPoint.lng }} title={worker.name} anchor={{ x: 0.5, y: 0.5 }} flat>
          <View style={styles.workerMarker}>
            <Text style={styles.workerMarkerEmoji}>🛵</Text>
          </View>
        </Marker>
      </MapView>

      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.space2 }]}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={8} accessibilityLabel="Go back">
          <ArrowLeft size={20} color={colors.gray800} />
        </Pressable>
        <View style={styles.topTitleWrap}>
          <Text style={styles.topTitle} numberOfLines={1}>Track Your Professional</Text>
          <Text style={styles.topSub} numberOfLines={1}>{booking?.serviceName} • #{booking?.id}</Text>
        </View>
        <Badge variant={isArrived ? 'success' : 'primary'}>{isArrived ? 'Arrived ✓' : 'On the way'}</Badge>
      </View>

      {/* Live distance pill */}
      <View style={[styles.livePill, { top: insets.top + 64 }]}>
        <View style={styles.livePulseDot} />
        <Text style={styles.livePillText}>{isArrived ? 'REACHED' : `${remainingDistanceMeters} m away`}</Text>
      </View>

      {/* Camera controls */}
      <View style={styles.cameraControls}>
        <CamBtn label="🗺️ Route" active={cameraMode === 'overview'} onPress={fitOverview} />
        <CamBtn label="🛵 Worker" active={cameraMode === 'worker'} onPress={focusWorker} />
        <CamBtn label="🏠 Home" active={cameraMode === 'home'} onPress={focusHome} />
      </View>

      {/* Bottom sheet */}
      <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.space3 }]}>
        {/* Status line */}
        <View style={styles.statusRow}>
          {isArrived ? <CheckCircle2 size={20} color={colors.success600} /> : <Navigation size={20} color={colors.primary600} />}
          <Text style={styles.statusText} numberOfLines={2}>{currentPoint.statusMsg}</Text>
        </View>

        {/* ETA + play/pause */}
        <View style={styles.etaRow}>
          <View>
            <Text style={styles.etaTime}>{isArrived ? 'Arrived!' : `${etaMinutes} min`}</Text>
            <Text style={styles.etaSub} numberOfLines={1}>📍 {booking?.address || 'Green Valley Apts, Sector 14'}</Text>
          </View>
          {isArrived ? (
            <Pressable style={styles.playBtn} onPress={replay}><Text style={styles.playBtnText}>🔁 Replay</Text></Pressable>
          ) : (
            <Pressable style={styles.playBtn} onPress={() => setIsPlaying((p) => !p)}>
              <Text style={styles.playBtnText}>{isPlaying ? '⏸ Pause' : '▶ Play'}</Text>
            </Pressable>
          )}
        </View>

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
        </View>

        {/* OTP */}
        <View style={styles.otpCard}>
          <ShieldCheck size={20} color={colors.success600} />
          <Text style={styles.otpText}>Start-Service OTP: <Text style={styles.otpCode}>4892</Text></Text>
        </View>

        {/* Worker card */}
        <View style={styles.workerCard}>
          <View style={styles.workerAvatar}><Text style={styles.workerAvatarText}>{worker.name[0]}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.workerName}>{worker.name}</Text>
            <Text style={styles.workerMeta}>⭐ {worker.rating?.toFixed(1)} • {worker.cooperative || 'Sahakar Cooperative'}</Text>
          </View>
        </View>
        <View style={styles.actionRow}>
          <Pressable style={styles.actionBtn} onPress={callWorker}>
            <Phone size={16} color={colors.primary600} /><Text style={styles.actionText}>Call</Text>
          </Pressable>
          <Pressable style={styles.actionBtn} onPress={() => Alert.alert('Message', `Connecting with ${worker.name.split(' ')[0]}…`)}>
            <MessageCircle size={16} color={colors.primary600} /><Text style={styles.actionText}>Message</Text>
          </Pressable>
          <Pressable style={styles.actionBtn} onPress={() => Alert.alert('Share ETA', 'Live tracking link copied.')}>
            <Share2 size={16} color={colors.primary600} /><Text style={styles.actionText}>Share</Text>
          </Pressable>
        </View>

        <View style={styles.safetyTip}>
          <Sparkles size={14} color={colors.primary600} />
          <Text style={styles.safetyText}>All workers are police-verified and health-screened by the cooperative.</Text>
        </View>
      </View>
    </View>
  );
}

function CamBtn({ label, active, onPress }) {
  return (
    <Pressable style={[styles.camBtn, active && styles.camBtnActive]} onPress={onPress}>
      <Text style={[styles.camBtnText, active && styles.camBtnTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray100 },

  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', gap: spacing.space3,
    paddingHorizontal: spacing.space3, paddingBottom: spacing.space2,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderBottomLeftRadius: radii.radiusLg, borderBottomRightRadius: radii.radiusLg,
    ...shadows.shadowMd,
  },
  backBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.gray100 },
  topTitleWrap: { flex: 1 },
  topTitle: { fontSize: fontSizes.fsBase, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.gray900 },
  topSub: { fontSize: fontSizes.fsXs, color: colors.gray500, fontFamily: fontFamilies.interRegular },

  livePill: {
    position: 'absolute', alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 6, paddingHorizontal: 14, borderRadius: radii.radiusFull,
    backgroundColor: colors.gray900, ...shadows.shadowMd,
  },
  livePulseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success500 },
  livePillText: { color: colors.white, fontSize: fontSizes.fsXs, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold },

  homeMarker: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.white,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.danger500, ...shadows.shadowMd,
  },
  homeMarkerEmoji: { fontSize: 20 },
  workerMarker: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primary600,
    alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: colors.white, ...shadows.shadowLg,
  },
  workerMarkerEmoji: { fontSize: 20 },

  cameraControls: {
    position: 'absolute', right: spacing.space3, bottom: 430,
    gap: spacing.space2,
  },
  camBtn: {
    paddingVertical: 8, paddingHorizontal: 12, borderRadius: radii.radiusFull,
    backgroundColor: 'rgba(255,255,255,0.96)', ...shadows.shadowSm,
  },
  camBtnActive: { backgroundColor: colors.primary600 },
  camBtnText: { fontSize: fontSizes.fsXs, fontWeight: fontWeights.fwSemibold, fontFamily: fontFamilies.interSemiBold, color: colors.gray700 },
  camBtnTextActive: { color: colors.white },

  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: colors.white,
    borderTopLeftRadius: radii.radius2xl, borderTopRightRadius: radii.radius2xl,
    padding: spacing.space4, gap: spacing.space3,
    ...shadows.shadowXl,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.space2 },
  statusText: { flex: 1, fontSize: fontSizes.fsSm, color: colors.gray700, fontFamily: fontFamilies.interMedium },

  etaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  etaTime: { fontSize: fontSizes.fsXl, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.gray900 },
  etaSub: { fontSize: fontSizes.fsXs, color: colors.gray500, fontFamily: fontFamilies.interRegular, marginTop: 2, maxWidth: 240 },
  playBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: radii.radiusFull, backgroundColor: colors.primary50, borderWidth: 1, borderColor: colors.primary200 },
  playBtnText: { fontSize: fontSizes.fsSm, fontWeight: fontWeights.fwSemibold, fontFamily: fontFamilies.interSemiBold, color: colors.primary700 },

  progressTrack: { height: 6, borderRadius: 3, backgroundColor: colors.gray200, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: colors.primary600 },

  otpCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.space2,
    padding: spacing.space3, backgroundColor: colors.success50, borderRadius: radii.radiusLg,
  },
  otpText: { fontSize: fontSizes.fsSm, color: colors.gray700, fontFamily: fontFamilies.interMedium },
  otpCode: { fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.success700, letterSpacing: 2 },

  workerCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.space3 },
  workerAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accent500, alignItems: 'center', justifyContent: 'center' },
  workerAvatarText: { color: colors.white, fontSize: fontSizes.fsLg, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold },
  workerName: { fontSize: fontSizes.fsBase, fontWeight: fontWeights.fwSemibold, fontFamily: fontFamilies.interSemiBold, color: colors.gray900 },
  workerMeta: { fontSize: fontSizes.fsXs, color: colors.gray500, fontFamily: fontFamilies.interRegular, marginTop: 2 },

  actionRow: { flexDirection: 'row', gap: spacing.space2 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: spacing.space3, borderRadius: radii.radiusLg, borderWidth: 1, borderColor: colors.gray200, backgroundColor: colors.gray50,
  },
  actionText: { fontSize: fontSizes.fsSm, fontWeight: fontWeights.fwSemibold, fontFamily: fontFamilies.interSemiBold, color: colors.primary700 },

  safetyTip: { flexDirection: 'row', alignItems: 'center', gap: spacing.space2 },
  safetyText: { flex: 1, fontSize: fontSizes.fsXs, color: colors.gray500, fontFamily: fontFamilies.interRegular, lineHeight: 16 },
});
