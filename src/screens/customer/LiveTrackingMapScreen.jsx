import { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, Linking, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline } from 'react-native-maps';
import {
  Phone, MessageCircle, Share2, ShieldCheck, Navigation, CheckCircle2, ArrowLeft,
  Route as RouteIcon, Bike, Home as HomeIcon, Pause, Play, RotateCcw, MapPin, Star,
} from 'lucide-react-native';
import { mockBookings } from '@data/mockBookings';
import { mockWorkers } from '@data/mockWorkers';
import Badge from '@components/ui/Badge';
import { colors, spacing, radii, shadows, fontSizes, fontWeights, fontFamilies } from '@theme';

/**
 * LiveTrackingMapScreen — ported from web pages/customer/LiveTrackingMap.jsx.
 *
 * WHAT'S REAL vs MOCK (unchanged product decision): the worker MOVEMENT is a scripted showcase
 * (hardcoded CUSTOMER_ROUTE + timed sim), but the worker↔home DISTANCE and ETA are computed for
 * real via haversine every tick. Preserved verbatim: booking/worker resolution, the route, the
 * simulation loop, camera modes, OTP, call/message/share handlers, replay/pause.
 *
 * MAP-RENDER FIX (frontend, task-scoped): the Google tiles were blank because the project's
 * GOOGLE_MAPS_API_KEY is still the ".env" placeholder (YOUR_GOOGLE_MAPS_API_KEY) — with
 * provider=google + an invalid key, the Google SDK draws no tiles (markers/polylines still draw,
 * hence the beige void). A valid key + Maps SDK/billing is a Cloud-Console/config step, out of
 * this frontend task's scope. The frontend lever applied here: DROP the explicit Google provider
 * so react-native-maps uses the platform DEFAULT map provider, which renders on Play-Services
 * devices without an app-level key. A subtle customMapStyle + a themed backdrop under the map
 * ensure the tracking canvas reads as an intentional map surface even if a given device can't
 * fetch tiles — never a blank beige block. No location/route/tracking data or logic changed.
 *
 * UI REDESIGN: premium floating header, redesigned live-distance pill, compact icon map controls,
 * and a polished floating bottom sheet. All values remain dynamic from the existing data.
 */

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

// Subtle premium map styling (honored by the default Google renderer on Android).
const MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#f4f3f8' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#6b7280' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }] },
  { featureType: 'poi', stylers: [{ visibility: 'simplified' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#dbe7dd' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#f0eefb' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#e6e2fa' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c7d2fe' }] },
];

function haversineMeters(aLat, aLng, bLat, bLng) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

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

const SPEED_M_PER_MIN = 366;

// Format meters -> dynamic "x.x km" / "xxx m" (presentation only; value stays dynamic).
function formatDistance(meters) {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km away`;
  return `${meters} m away`;
}

export default function LiveTrackingMapScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const bookingId = route?.params?.bookingId;

  const mapRef = useRef(null);
  const [simIndex, setSimIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [cameraMode, setCameraMode] = useState('overview');

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
      edgePadding: { top: 140, right: 70, bottom: 360, left: 70 },
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
      {/* Themed backdrop so the tracking canvas never reads as a blank beige block. */}
      <View style={styles.mapBackdrop} pointerEvents="none" />

      {/* Map (default provider — see header note on the tiles/key). */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        customMapStyle={MAP_STYLE}
        onMapReady={fitOverview}
        onPanDrag={() => setCameraMode('manual')}
        showsMyLocationButton={false}
        toolbarEnabled={false}
      >
        <Polyline coordinates={fullRouteCoords} strokeColor={colors.primary200} strokeWidth={7} lineCap="round" lineJoin="round" />
        <Polyline coordinates={traveledCoords} strokeColor={colors.primary600} strokeWidth={7} lineCap="round" />

        <Marker coordinate={{ latitude: home.lat, longitude: home.lng }} title="Your Home" description={booking?.address} anchor={{ x: 0.5, y: 1 }}>
          <View style={styles.homeMarker}>
            <HomeIcon size={18} color={colors.white} strokeWidth={2.4} />
          </View>
          <View style={styles.markerSpike} />
        </Marker>

        <Marker coordinate={{ latitude: currentPoint.lat, longitude: currentPoint.lng }} title={worker.name} anchor={{ x: 0.5, y: 0.5 }} flat>
          {!isArrived && <View style={styles.workerPulse} />}
          <View style={styles.workerMarker}>
            <Bike size={18} color={colors.white} strokeWidth={2.4} />
          </View>
        </Marker>
      </MapView>

      {/* Floating header */}
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.space3 }]}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={8} accessibilityLabel="Go back">
          <ArrowLeft size={20} color={colors.gray800} strokeWidth={2.2} />
        </Pressable>
        <View style={styles.topTitleWrap}>
          <Text style={styles.topTitle} numberOfLines={1}>Track Your Professional</Text>
          <Text style={styles.topSub} numberOfLines={1}>{booking?.serviceName} • #{booking?.id}</Text>
        </View>
        <Badge variant={isArrived ? 'success' : 'primary'}>{isArrived ? 'Arrived ✓' : 'On the way'}</Badge>
      </View>

      {/* Live distance pill */}
      <View style={[styles.livePill, { top: insets.top + 72 }]}>
        <View style={styles.livePulseDot} />
        <Text style={styles.livePillText}>{isArrived ? 'REACHED' : formatDistance(remainingDistanceMeters)}</Text>
      </View>

      {/* Compact icon map controls */}
      <View style={styles.cameraControls}>
        <CamBtn icon={RouteIcon} active={cameraMode === 'overview'} onPress={fitOverview} label="Route" />
        <CamBtn icon={Bike} active={cameraMode === 'worker'} onPress={focusWorker} label="Worker" />
        <CamBtn icon={HomeIcon} active={cameraMode === 'home'} onPress={focusHome} label="Home" />
      </View>

      {/* Bottom sheet */}
      <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.space3 }]}>
        <View style={styles.grabber} />

        {/* Status line */}
        <View style={styles.statusRow}>
          <View style={[styles.statusIcon, isArrived ? styles.statusIconDone : styles.statusIconLive]}>
            {isArrived ? <CheckCircle2 size={18} color={colors.success600} /> : <Navigation size={16} color={colors.primary600} strokeWidth={2.4} />}
          </View>
          <Text style={styles.statusText} numberOfLines={2}>{currentPoint.statusMsg}</Text>
        </View>

        {/* ETA + address + play/pause */}
        <View style={styles.etaRow}>
          <View style={styles.etaLeft}>
            <Text style={styles.etaTime}>{isArrived ? 'Arrived!' : `${etaMinutes} min`}</Text>
            <View style={styles.etaAddrRow}>
              <MapPin size={12} color={colors.gray400} strokeWidth={2} />
              <Text style={styles.etaSub} numberOfLines={1}>{booking?.address || 'Green Valley Apts, Sector 14'}</Text>
            </View>
          </View>
          {isArrived ? (
            <Pressable style={styles.playBtn} onPress={replay}>
              <RotateCcw size={14} color={colors.primary700} strokeWidth={2.2} />
              <Text style={styles.playBtnText}>Replay</Text>
            </Pressable>
          ) : (
            <Pressable style={styles.playBtn} onPress={() => setIsPlaying((p) => !p)}>
              {isPlaying ? <Pause size={14} color={colors.primary700} strokeWidth={2.2} /> : <Play size={14} color={colors.primary700} strokeWidth={2.2} />}
              <Text style={styles.playBtnText}>{isPlaying ? 'Pause' : 'Play'}</Text>
            </Pressable>
          )}
        </View>

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
        </View>

        {/* OTP */}
        <View style={styles.otpCard}>
          <View style={styles.otpIcon}>
            <ShieldCheck size={18} color={colors.success700} strokeWidth={2.2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.otpLabel}>Start-Service OTP</Text>
            <Text style={styles.otpHint}>Share only when service begins</Text>
          </View>
          <Text style={styles.otpCode}>4892</Text>
        </View>

        {/* Worker profile + actions */}
        <View style={styles.workerCard}>
          <View style={styles.workerAvatar}><Text style={styles.workerAvatarText}>{worker.name[0]}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.workerName} numberOfLines={1}>{worker.name}</Text>
            <View style={styles.workerMetaRow}>
              <Star size={12} color={colors.accent400} fill={colors.accent400} />
              <Text style={styles.workerMeta} numberOfLines={1}>
                {worker.rating?.toFixed(1)} • {worker.cooperative || 'Sahakar Cooperative'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.actionRow}>
          <Pressable style={styles.actionBtn} onPress={callWorker}>
            <Phone size={16} color={colors.primary600} strokeWidth={2.2} /><Text style={styles.actionText}>Call</Text>
          </Pressable>
          <Pressable style={styles.actionBtn} onPress={() => Alert.alert('Message', `Connecting with ${worker.name.split(' ')[0]}…`)}>
            <MessageCircle size={16} color={colors.primary600} strokeWidth={2.2} /><Text style={styles.actionText}>Message</Text>
          </Pressable>
          <Pressable style={styles.actionBtn} onPress={() => Alert.alert('Share ETA', 'Live tracking link copied.')}>
            <Share2 size={16} color={colors.primary600} strokeWidth={2.2} /><Text style={styles.actionText}>Share</Text>
          </Pressable>
        </View>

        <View style={styles.safetyTip}>
          <ShieldCheck size={13} color={colors.success600} strokeWidth={2.2} />
          <Text style={styles.safetyText}>All workers are police-verified and health-screened by the cooperative.</Text>
        </View>
      </View>
    </View>
  );
}

function CamBtn({ icon: Icon, active, onPress, label }) {
  return (
    <Pressable style={[styles.camBtn, active && styles.camBtnActive]} onPress={onPress} accessibilityLabel={label}>
      <Icon size={18} color={active ? colors.white : colors.gray700} strokeWidth={2.2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f3f8' },
  mapBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: '#eceaf6' },

  // ---- Header ----
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', gap: spacing.space3,
    paddingHorizontal: spacing.space3, paddingBottom: spacing.space3,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderBottomLeftRadius: radii.radiusXl, borderBottomRightRadius: radii.radiusXl,
    ...shadows.shadowMd,
  },
  backBtn: { width: 40, height: 40, borderRadius: radii.radiusFull, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.gray100 },
  topTitleWrap: { flex: 1 },
  topTitle: { fontSize: fontSizes.fsBase, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.gray900 },
  topSub: { fontSize: fontSizes.fsXs, color: colors.gray500, fontFamily: fontFamilies.interRegular, marginTop: 1 },

  // ---- Live pill ----
  livePill: {
    position: 'absolute', alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingVertical: 8, paddingHorizontal: 16, borderRadius: radii.radiusFull,
    backgroundColor: 'rgba(17,24,39,0.92)', ...shadows.shadowLg,
  },
  livePulseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success500 },
  livePillText: { color: colors.white, fontSize: fontSizes.fsSm, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, letterSpacing: 0.3 },

  // ---- Markers ----
  homeMarker: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: colors.danger500,
    alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: colors.white, ...shadows.shadowMd,
  },
  markerSpike: { alignSelf: 'center', width: 3, height: 8, backgroundColor: colors.white, marginTop: -2, borderRadius: 2 },
  workerMarker: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary600,
    alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: colors.white, ...shadows.shadowLg,
  },
  workerPulse: {
    position: 'absolute', top: -8, left: -8, right: -8, bottom: -8,
    borderRadius: 30, backgroundColor: colors.primary400, opacity: 0.35,
  },

  // ---- Camera controls ----
  cameraControls: { position: 'absolute', right: spacing.space3, bottom: 470, gap: spacing.space2 },
  camBtn: {
    width: 46, height: 46, borderRadius: radii.radiusFull,
    backgroundColor: 'rgba(255,255,255,0.98)', alignItems: 'center', justifyContent: 'center', ...shadows.shadowMd,
  },
  camBtnActive: { backgroundColor: colors.primary600 },

  // ---- Bottom sheet ----
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: colors.white,
    borderTopLeftRadius: radii.radius2xl, borderTopRightRadius: radii.radius2xl,
    paddingHorizontal: spacing.space4, paddingTop: spacing.space2, gap: spacing.space3,
    ...shadows.shadowXl,
  },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.gray200, marginBottom: spacing.space1 },

  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.space3 },
  statusIcon: { width: 34, height: 34, borderRadius: radii.radiusFull, alignItems: 'center', justifyContent: 'center' },
  statusIconLive: { backgroundColor: colors.primary50 },
  statusIconDone: { backgroundColor: colors.success50 },
  statusText: { flex: 1, fontSize: fontSizes.fsSm, color: colors.gray700, fontFamily: fontFamilies.interMedium },

  etaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.space3 },
  etaLeft: { flex: 1 },
  etaTime: { fontSize: fontSizes.fs2xl, fontWeight: fontWeights.fwExtrabold, fontFamily: fontFamilies.interExtraBold, color: colors.gray900 },
  etaAddrRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  etaSub: { flex: 1, fontSize: fontSizes.fsXs, color: colors.gray500, fontFamily: fontFamilies.interRegular },
  playBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: spacing.space2, paddingHorizontal: spacing.space4, borderRadius: radii.radiusFull,
    backgroundColor: colors.primary50, borderWidth: 1, borderColor: colors.primary200,
  },
  playBtnText: { fontSize: fontSizes.fsSm, fontWeight: fontWeights.fwSemibold, fontFamily: fontFamilies.interSemiBold, color: colors.primary700 },

  progressTrack: { height: 6, borderRadius: 3, backgroundColor: colors.gray200, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: colors.primary600 },

  otpCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.space3,
    padding: spacing.space3, backgroundColor: colors.success50, borderRadius: radii.radiusLg,
    borderWidth: 1, borderColor: colors.success100,
  },
  otpIcon: { width: 36, height: 36, borderRadius: radii.radiusFull, backgroundColor: colors.success100, alignItems: 'center', justifyContent: 'center' },
  otpLabel: { fontSize: fontSizes.fsXs, color: colors.success700, fontFamily: fontFamilies.interSemiBold, fontWeight: fontWeights.fwSemibold, textTransform: 'uppercase', letterSpacing: 0.5 },
  otpHint: { fontSize: 11, color: colors.gray500, fontFamily: fontFamilies.interRegular, marginTop: 1 },
  otpCode: { fontSize: fontSizes.fs2xl, fontWeight: fontWeights.fwExtrabold, fontFamily: fontFamilies.interExtraBold, color: colors.success700, letterSpacing: 3 },

  workerCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.space3 },
  workerAvatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.accent500, alignItems: 'center', justifyContent: 'center' },
  workerAvatarText: { color: colors.white, fontSize: fontSizes.fsLg, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold },
  workerName: { fontSize: fontSizes.fsBase, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.gray900 },
  workerMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  workerMeta: { flex: 1, fontSize: fontSizes.fsXs, color: colors.gray500, fontFamily: fontFamilies.interRegular },

  actionRow: { flexDirection: 'row', gap: spacing.space2 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: spacing.space3, borderRadius: radii.radiusLg, borderWidth: 1, borderColor: colors.gray200, backgroundColor: colors.surfaceWhite,
  },
  actionText: { fontSize: fontSizes.fsSm, fontWeight: fontWeights.fwSemibold, fontFamily: fontFamilies.interSemiBold, color: colors.primary700 },

  safetyTip: { flexDirection: 'row', alignItems: 'center', gap: spacing.space2 },
  safetyText: { flex: 1, fontSize: fontSizes.fsXs, color: colors.gray500, fontFamily: fontFamilies.interRegular, lineHeight: 16 },
});
