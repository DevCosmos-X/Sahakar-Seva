import { useState, useEffect } from 'react';
import { View, Text, Pressable, Linking, Alert, Modal, ActivityIndicator, StyleSheet } from 'react-native';
import {
  Phone, Video, Navigation, Printer, Plus, PhoneOff, ShieldCheck,
  ChevronRight, Check, X as XIcon, Clock3, CircleDot,
} from 'lucide-react-native';
import { useAuth } from '@context/AuthContext';
import { getBookingsByCustomer } from '@data/mockBookings';
import { getServiceById } from '@data/mockServices';
import { serviceIcon } from '@components/icons';
import { shareReceipt } from '@utils/receipt';
import { ScreenContainer } from '@components/app';
import StatusTimeline from '@components/ui/StatusTimeline';
import { FairnessBadge } from '@components/ui/Badge';
import StarRating from '@components/ui/StarRating';
import { colors, spacing, radii, shadows, fontSizes, fontWeights, fontFamilies } from '@theme';

/**
 * BookingTrackerScreen ("My Bookings") — ported from web pages/customer/BookingTracker.jsx.
 *
 * UI REDESIGN (frontend-only): the screen now leads with a header (dynamic counts) + status
 * filter pills + a NEXT SERVICE highlight + a list of redesigned, colour-coded booking cards.
 * Selecting a card reveals the SAME existing detail panel (StatusTimeline, worker card with
 * call/video, live-track button, receipt, rating) below it — every handler and data binding is
 * unchanged.
 *
 * Filtering is pure FRONTEND state over the already-loaded `bookings` array (no fetch/query
 * change). Per-card actions reuse existing handlers only: Track -> LiveTrackingMap nav (existing),
 * View invoice -> shareReceipt (existing), View details -> select (existing detail panel).
 * No status values are renamed — the colour map is a frontend view over the existing values.
 */

// Frontend-only colour system for the existing status values (per the redesign brief):
//   en-route/in-progress -> blue, completed -> green, cancelled -> red,
//   booked -> amber, assigned -> purple. Icon communicates the state too.
const STATUS_STYLE = {
  'en-route': { bg: '#e6efff', fg: colors.info700, dot: colors.info600, Icon: CircleDot },
  'in-progress': { bg: '#e6efff', fg: colors.info700, dot: colors.info600, Icon: CircleDot },
  completed: { bg: colors.success50, fg: colors.success700, dot: colors.success600, Icon: Check },
  cancelled: { bg: colors.danger50, fg: colors.danger700, dot: colors.danger600, Icon: XIcon },
  booked: { bg: colors.warning50, fg: colors.warning700, dot: colors.warning600, Icon: Clock3 },
  assigned: { bg: '#f2ecfe', fg: '#6d28d9', dot: '#7c3aed', Icon: Check },
};
const statusStyle = (s) => STATUS_STYLE[s] || { bg: colors.gray100, fg: colors.gray600, dot: colors.gray400, Icon: CircleDot };
const ACTIVE_STATUSES = ['en-route', 'in-progress', 'assigned'];

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

function matchesFilter(booking, filter) {
  if (filter === 'all') return true;
  if (filter === 'active') return ACTIVE_STATUSES.includes(booking.status);
  return booking.status === filter;
}

export default function BookingTrackerScreen({ navigation }) {
  const { user } = useAuth();
  const bookings = getBookingsByCustomer(user?.id);
  const [selectedId, setSelectedId] = useState(bookings[0]?.id || null);
  const [ratingValue, setRatingValue] = useState(0);
  const [filter, setFilter] = useState('all');
  const [videoCall, setVideoCall] = useState(null); // null | 'connecting' | 'connected'

  useEffect(() => {
    if (videoCall !== 'connecting') return undefined;
    const t = setTimeout(() => setVideoCall('connected'), 2200);
    return () => clearTimeout(t);
  }, [videoCall]);

  const selected = bookings.find((b) => b.id === selectedId) || null;
  const canTrack = selected && ACTIVE_STATUSES.includes(selected.status);

  // Dynamic counts (frontend derivation over existing data).
  const activeCount = bookings.filter((b) => ACTIVE_STATUSES.includes(b.status)).length;
  const filterCount = (key) => bookings.filter((b) => matchesFilter(b, key)).length;
  const visibleBookings = bookings.filter((b) => matchesFilter(b, filter));
  const nextService = bookings.find((b) => ACTIVE_STATUSES.includes(b.status));

  const selectBooking = (id) => { setSelectedId(id); setRatingValue(0); };

  if (bookings.length === 0) {
    return (
      <ScreenContainer>
        <View style={styles.headRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.h1}>My Bookings</Text>
            <Text style={styles.sub}>0 bookings</Text>
          </View>
          <Pressable style={styles.newBtn} onPress={() => navigation.navigate('CustomerBook')}>
            <Plus size={16} color={colors.white} />
            <Text style={styles.newBtnText}>New</Text>
          </Pressable>
        </View>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>You have no bookings yet.</Text>
          <Pressable style={styles.primaryBtn} onPress={() => navigation.navigate('CustomerBook')}>
            <Text style={styles.primaryBtnText}>Book a Service</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={styles.headRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.h1}>My Bookings</Text>
          <Text style={styles.sub}>
            {bookings.length} booking{bookings.length !== 1 ? 's' : ''} · {activeCount} active
          </Text>
        </View>
        <Pressable style={styles.newBtn} onPress={() => navigation.navigate('CustomerBook')}>
          <Plus size={16} color={colors.white} />
          <Text style={styles.newBtnText}>New</Text>
        </Pressable>
      </View>

      {/* Status filter pills (frontend filter over the loaded bookings) */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => {
          const active = filter === f.key;
          const count = filterCount(f.key);
          return (
            <Pressable key={f.key} style={[styles.filterPill, active && styles.filterPillActive]} onPress={() => setFilter(f.key)}>
              <Text style={[styles.filterText, active && styles.filterTextActive]}>{f.label}</Text>
              <View style={[styles.filterCount, active && styles.filterCountActive]}>
                <Text style={[styles.filterCountText, active && styles.filterCountTextActive]}>{count}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* NEXT SERVICE highlight (active booking) */}
      {nextService ? (
        <NextServiceCard
          booking={nextService}
          onOpen={() => selectBooking(nextService.id)}
          onTrack={() => navigation.navigate('LiveTrackingMap', { bookingId: nextService.id })}
        />
      ) : null}

      {/* All bookings list */}
      <View style={styles.listHead}>
        <Text style={styles.listTitle}>{filter === 'all' ? 'All Bookings' : `${FILTERS.find((f) => f.key === filter)?.label} Bookings`}</Text>
        <Text style={styles.sortLabel}>Sort by: Latest</Text>
      </View>

      {visibleBookings.length === 0 ? (
        <View style={styles.filterEmpty}>
          <Text style={styles.filterEmptyText}>No {filter} bookings.</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {visibleBookings.map((b) => (
            <BookingCard
              key={b.id}
              booking={b}
              selected={b.id === selectedId}
              onPress={() => selectBooking(b.id)}
              onTrack={() => navigation.navigate('LiveTrackingMap', { bookingId: b.id })}
              onInvoice={() => shareReceipt(b)}
            />
          ))}
        </View>
      )}

      {/* Existing detail panel for the selected booking (unchanged functionality) */}
      {selected && (
        <View style={styles.detailCard}>
          <Text style={styles.ref}>Booking Reference: #{selected.id}</Text>
          <Text style={styles.detailTitle}>{selected.serviceName}</Text>

          <View style={styles.timelineWrap}>
            <StatusTimeline currentStatus={selected.status} />
          </View>

          {selected.workerName && (
            <View style={styles.workerCard}>
              <View style={styles.workerAvatar}>
                <Text style={styles.workerAvatarText}>{selected.workerName[0]}</Text>
              </View>
              <View style={styles.workerInfo}>
                <Text style={styles.workerName}>{selected.workerName}</Text>
                <StarRating rating={selected.workerRating || 4.8} size={14} />
                {selected.fairnessPosition ? <FairnessBadge position={selected.fairnessPosition} /> : null}
              </View>
              <View style={styles.workerActions}>
                <Pressable
                  style={styles.contactBtn}
                  onPress={() => Linking.openURL(`tel:${(selected.workerPhone || '9876543210').replace(/\s/g, '')}`)}
                  accessibilityLabel="Call worker"
                >
                  <Phone size={18} color={colors.primary600} />
                </Pressable>
                <Pressable style={styles.contactBtn} onPress={() => setVideoCall('connecting')} accessibilityLabel="Video call">
                  <Video size={18} color={colors.primary600} />
                </Pressable>
              </View>
            </View>
          )}

          {canTrack && (
            <Pressable style={styles.trackBtn} onPress={() => navigation.navigate('LiveTrackingMap', { bookingId: selected.id })}>
              <Navigation size={18} color={colors.white} />
              <Text style={styles.trackBtnText}>Track Worker Live on Map</Text>
            </Pressable>
          )}

          <View style={styles.detailGrid}>
            <Detail label="Date & Time" value={`${selected.date} • ${selected.time}`} />
            <Detail label="Address" value={selected.address} />
            <Detail label="Description" value={selected.description} />
            <Detail label="Total (GST incl.)" value={`₹${selected.totalPrice}`} accent />
            {selected.weatherCondition && selected.weatherCondition !== 'Clear' && (
              <Detail label="Weather Adjustment" value={`${selected.weatherCondition} (×${selected.weatherMultiplier || 1.2})`} />
            )}
          </View>

          <Pressable style={styles.receiptBtn} onPress={() => shareReceipt(selected)}>
            <Printer size={16} color={colors.primary600} />
            <Text style={styles.receiptBtnText}>Share Bill Receipt</Text>
          </Pressable>

          {selected.status === 'completed' && !selected.rating && (
            <View style={styles.ratingSection}>
              <Text style={styles.ratingTitle}>Rate this service</Text>
              <StarRating rating={ratingValue} interactive onRate={setRatingValue} size={30} />
              {ratingValue > 0 && (
                <Pressable style={styles.rateSubmit} onPress={() => Alert.alert('Thank you!', 'Thank you for rating your cooperative worker!')}>
                  <Text style={styles.rateSubmitText}>Submit Rating</Text>
                </Pressable>
              )}
            </View>
          )}
          {selected.rating ? (
            <View style={styles.ratingSection}>
              <Text style={styles.ratingTitle}>Your Rating</Text>
              <StarRating rating={selected.rating} size={24} />
            </View>
          ) : null}
        </View>
      )}

      {/* Video call modal (demo — unchanged) */}
      <Modal visible={videoCall !== null} animationType="fade" transparent onRequestClose={() => setVideoCall(null)}>
        <View style={styles.vcBackdrop}>
          <View style={styles.vcCard}>
            <View style={styles.vcAvatar}>
              <Text style={styles.vcAvatarText}>{selected?.workerName?.[0] || 'W'}</Text>
            </View>
            <Text style={styles.vcName}>{selected?.workerName || 'Your Professional'}</Text>
            {videoCall === 'connecting' ? (
              <>
                <ActivityIndicator size="small" color={colors.primary600} style={{ marginVertical: spacing.space3 }} />
                <Text style={styles.vcStatus}>Connecting secure video call…</Text>
              </>
            ) : (
              <>
                <View style={styles.vcConnectedRow}>
                  <ShieldCheck size={16} color={colors.success600} />
                  <Text style={styles.vcConnectedText}>Connected • End-to-end encrypted</Text>
                </View>
                <Text style={styles.vcHint}>You're now on a live call with your cooperative worker.</Text>
              </>
            )}
            <Pressable style={styles.vcEndBtn} onPress={() => setVideoCall(null)}>
              <PhoneOff size={18} color={colors.white} />
              <Text style={styles.vcEndText}>End Call</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

/** Colour-coded status pill over the existing status value. */
function StatusPill({ status }) {
  const s = statusStyle(status);
  const Icon = s.Icon;
  return (
    <View style={[pillStyles.pill, { backgroundColor: s.bg }]}>
      <Icon size={12} color={s.fg} strokeWidth={2.6} />
      <Text style={[pillStyles.text, { color: s.fg }]} numberOfLines={1}>{status.replace('-', ' ')}</Text>
    </View>
  );
}

/** NEXT SERVICE highlight card (active booking). */
function NextServiceCard({ booking, onOpen, onTrack }) {
  const svc = getServiceById(booking.serviceId);
  const Icon = serviceIcon(svc?.icon);
  const accent = svc?.color || colors.primary600;
  return (
    <Pressable style={nsStyles.card} onPress={onOpen}>
      <View style={nsStyles.kickerRow}>
        <Text style={nsStyles.kicker}>NEXT SERVICE</Text>
        <StatusPill status={booking.status} />
      </View>
      <View style={nsStyles.body}>
        <View style={[nsStyles.icon, { backgroundColor: accent + '22' }]}>
          <Icon size={24} color={accent} strokeWidth={2.2} />
        </View>
        <View style={nsStyles.info}>
          <Text style={nsStyles.name} numberOfLines={1}>{booking.serviceName}</Text>
          {booking.workerName ? <Text style={nsStyles.worker} numberOfLines={1}>{booking.workerName}</Text> : null}
          <Text style={nsStyles.meta} numberOfLines={1}>{booking.date} · ₹{booking.totalPrice}</Text>
        </View>
      </View>
      <Pressable style={nsStyles.trackBtn} onPress={onTrack}>
        <Navigation size={15} color={colors.white} strokeWidth={2.2} />
        <Text style={nsStyles.trackText}>Track worker</Text>
        <ChevronRight size={15} color={colors.white} />
      </Pressable>
    </Pressable>
  );
}

/** Redesigned booking card with a per-card action mapped to an existing handler. */
function BookingCard({ booking, selected, onPress, onTrack, onInvoice }) {
  const svc = getServiceById(booking.serviceId);
  const Icon = serviceIcon(svc?.icon);
  const accent = svc?.color || colors.primary600;
  const isActive = ACTIVE_STATUSES.includes(booking.status);
  const isCancelled = booking.status === 'cancelled';

  let action = { label: 'View details', onPress };
  if (booking.status === 'en-route') action = { label: 'Track worker', onPress: onTrack };
  else if (booking.status === 'completed') action = { label: 'View invoice', onPress: onInvoice };

  return (
    <Pressable
      style={[
        cardStyles.card,
        selected && cardStyles.cardSelected,
        isActive && cardStyles.cardActive,
        isCancelled && cardStyles.cardCancelled,
      ]}
      onPress={onPress}
    >
      <View style={cardStyles.topRow}>
        <View style={[cardStyles.icon, { backgroundColor: accent + '18' }]}>
          <Icon size={20} color={accent} strokeWidth={2.2} />
        </View>
        <View style={cardStyles.info}>
          <Text style={cardStyles.name} numberOfLines={1}>{booking.serviceName}</Text>
          {booking.workerName ? <Text style={cardStyles.worker} numberOfLines={1}>{booking.workerName}</Text> : null}
        </View>
        <StatusPill status={booking.status} />
      </View>

      <View style={cardStyles.metaRow}>
        <Text style={cardStyles.meta} numberOfLines={1}>{booking.date} · ₹{booking.totalPrice}</Text>
      </View>
      <View style={cardStyles.footerRow}>
        <Text style={cardStyles.ref}>#{booking.id}</Text>
        <Pressable style={cardStyles.actionBtn} onPress={action.onPress} hitSlop={6}>
          <Text style={cardStyles.actionText}>{action.label}</Text>
          <ChevronRight size={14} color={colors.primary600} strokeWidth={2.4} />
        </Pressable>
      </View>
    </Pressable>
  );
}

function Detail({ label, value, accent }) {
  return (
    <View style={styles.detailItem}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, accent && styles.detailAccent]}>{value}</Text>
    </View>
  );
}

const pillStyles = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 9, borderRadius: radii.radiusFull },
  text: { fontSize: fontSizes.fsXs, fontWeight: fontWeights.fwSemibold, fontFamily: fontFamilies.interSemiBold, textTransform: 'capitalize' },
});

const nsStyles = StyleSheet.create({
  card: {
    backgroundColor: '#eef2ff', borderRadius: radii.radiusXl, padding: spacing.space4,
    borderWidth: 1, borderColor: colors.primary100, marginBottom: spacing.space4, ...shadows.shadowSm,
  },
  kickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.space3 },
  kicker: { fontSize: fontSizes.fsXs, fontWeight: fontWeights.fwExtrabold, fontFamily: fontFamilies.interExtraBold, color: colors.primary700, letterSpacing: 1 },
  body: { flexDirection: 'row', alignItems: 'center', gap: spacing.space3 },
  icon: { width: 48, height: 48, borderRadius: radii.radiusLg, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  name: { fontSize: fontSizes.fsLg, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.gray900 },
  worker: { fontSize: fontSizes.fsSm, color: colors.gray600, fontFamily: fontFamilies.interMedium, marginTop: 1 },
  meta: { fontSize: fontSizes.fsXs, color: colors.gray500, fontFamily: fontFamilies.interRegular, marginTop: 2 },
  trackBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: colors.primary700, borderRadius: radii.radiusMd, paddingVertical: spacing.space3, marginTop: spacing.space4,
  },
  trackText: { fontSize: fontSizes.fsSm, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.white },
});

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceWhite, borderRadius: radii.radiusXl, padding: spacing.space4,
    borderWidth: 1, borderColor: colors.gray100, ...shadows.shadowSm, gap: spacing.space2,
  },
  cardSelected: { borderColor: colors.primary300 },
  cardActive: { backgroundColor: '#f7f9ff', borderColor: colors.info100 },
  cardCancelled: { backgroundColor: '#fefbfb' },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.space3 },
  icon: { width: 42, height: 42, borderRadius: radii.radiusMd, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  name: { fontSize: fontSizes.fsBase, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.gray900 },
  worker: { fontSize: fontSizes.fsXs, color: colors.gray500, fontFamily: fontFamilies.interRegular, marginTop: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  meta: { fontSize: fontSizes.fsSm, color: colors.gray700, fontFamily: fontFamilies.interMedium },
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2, paddingTop: spacing.space2, borderTopWidth: 1, borderTopColor: colors.gray100 },
  ref: { fontSize: fontSizes.fsXs, color: colors.gray400, fontFamily: 'monospace' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  actionText: { fontSize: fontSizes.fsSm, fontWeight: fontWeights.fwSemibold, fontFamily: fontFamilies.interSemiBold, color: colors.primary600 },
});

const styles = StyleSheet.create({
  headRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.space4 },
  h1: { fontSize: fontSizes.fs2xl, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.gray900 },
  sub: { fontSize: fontSizes.fsSm, color: colors.gray500, fontFamily: fontFamilies.interRegular, marginTop: 1 },
  newBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary700, paddingVertical: spacing.space2, paddingHorizontal: spacing.space4, borderRadius: radii.radiusFull },
  newBtnText: { fontSize: fontSizes.fsSm, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.white },

  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.space2, marginBottom: spacing.space4 },
  filterPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: spacing.space2, paddingHorizontal: spacing.space3, borderRadius: radii.radiusFull,
    backgroundColor: colors.surfaceWhite, borderWidth: 1, borderColor: colors.gray200,
  },
  filterPillActive: { backgroundColor: colors.primary700, borderColor: colors.primary700 },
  filterText: { fontSize: fontSizes.fsSm, fontWeight: fontWeights.fwSemibold, fontFamily: fontFamilies.interSemiBold, color: colors.gray700 },
  filterTextActive: { color: colors.white },
  filterCount: { minWidth: 20, paddingHorizontal: 5, paddingVertical: 1, borderRadius: radii.radiusFull, backgroundColor: colors.gray100, alignItems: 'center' },
  filterCountActive: { backgroundColor: 'rgba(255,255,255,0.24)' },
  filterCountText: { fontSize: 11, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.gray600 },
  filterCountTextActive: { color: colors.white },

  listHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.space3 },
  listTitle: { fontSize: fontSizes.fsLg, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.gray900 },
  sortLabel: { fontSize: fontSizes.fsXs, color: colors.gray500, fontFamily: fontFamilies.interMedium },
  list: { gap: spacing.space3 },
  filterEmpty: { paddingVertical: spacing.space10, alignItems: 'center' },
  filterEmptyText: { fontSize: fontSizes.fsSm, color: colors.gray500, fontFamily: fontFamilies.interRegular },

  vcBackdrop: { flex: 1, backgroundColor: 'rgba(15,12,41,0.75)', alignItems: 'center', justifyContent: 'center', padding: spacing.space6 },
  vcCard: { width: '100%', maxWidth: 340, backgroundColor: colors.white, borderRadius: radii.radius2xl, padding: spacing.space6, alignItems: 'center', ...shadows.shadowXl },
  vcAvatar: { width: 84, height: 84, borderRadius: 42, backgroundColor: colors.primary600, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.space3 },
  vcAvatarText: { color: colors.white, fontSize: fontSizes.fs3xl, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold },
  vcName: { fontSize: fontSizes.fsLg, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.gray900 },
  vcStatus: { fontSize: fontSizes.fsSm, color: colors.gray600, fontFamily: fontFamilies.interRegular },
  vcConnectedRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.space3 },
  vcConnectedText: { fontSize: fontSizes.fsSm, fontWeight: fontWeights.fwSemibold, fontFamily: fontFamilies.interSemiBold, color: colors.success700 },
  vcHint: { fontSize: fontSizes.fsXs, color: colors.gray500, fontFamily: fontFamilies.interRegular, textAlign: 'center', marginTop: spacing.space2 },
  vcEndBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.space2, backgroundColor: colors.danger600, paddingVertical: spacing.space3, paddingHorizontal: spacing.space6, borderRadius: radii.radiusFull, marginTop: spacing.space5 },
  vcEndText: { color: colors.white, fontSize: fontSizes.fsSm, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold },

  detailCard: { backgroundColor: colors.surfaceWhite, borderRadius: radii.radiusXl, padding: spacing.space5, marginTop: spacing.space4, borderWidth: 1, borderColor: colors.gray100, ...shadows.shadowMd },
  ref: { fontSize: fontSizes.fsXs, color: colors.gray400, fontFamily: 'monospace' },
  detailTitle: { fontSize: fontSizes.fsXl, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.gray900, marginTop: 2 },
  timelineWrap: { marginVertical: spacing.space3 },

  workerCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.space3, backgroundColor: colors.gray50, borderRadius: radii.radiusLg, padding: spacing.space3, marginTop: spacing.space2 },
  workerAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary600, alignItems: 'center', justifyContent: 'center' },
  workerAvatarText: { fontSize: fontSizes.fsLg, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.white },
  workerInfo: { flex: 1, gap: 2 },
  workerName: { fontSize: fontSizes.fsBase, fontWeight: fontWeights.fwSemibold, fontFamily: fontFamilies.interSemiBold, color: colors.gray900 },
  workerActions: { flexDirection: 'row', gap: spacing.space2 },
  contactBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary50, alignItems: 'center', justifyContent: 'center' },

  trackBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.space2, height: 52, backgroundColor: colors.primary700, borderRadius: radii.radiusMd, marginTop: spacing.space4 },
  trackBtnText: { fontSize: fontSizes.fsBase, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.white },

  detailGrid: { marginTop: spacing.space4, gap: spacing.space3 },
  detailItem: { gap: 2 },
  detailLabel: { fontSize: fontSizes.fsXs, color: colors.gray400, fontFamily: fontFamilies.interMedium, textTransform: 'uppercase', letterSpacing: 0.3 },
  detailValue: { fontSize: fontSizes.fsSm, color: colors.gray800, fontFamily: fontFamilies.interRegular },
  detailAccent: { fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.primary700, fontSize: fontSizes.fsBase },

  receiptBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.space2, height: 44, marginTop: spacing.space4, borderRadius: radii.radiusMd, borderWidth: 1.5, borderColor: colors.primary200, backgroundColor: colors.primary50 },
  receiptBtnText: { fontSize: fontSizes.fsSm, fontWeight: fontWeights.fwSemibold, fontFamily: fontFamilies.interSemiBold, color: colors.primary600 },

  ratingSection: { alignItems: 'center', gap: spacing.space3, marginTop: spacing.space5, paddingTop: spacing.space4, borderTopWidth: 1, borderTopColor: colors.gray100 },
  ratingTitle: { fontSize: fontSizes.fsBase, fontWeight: fontWeights.fwSemibold, fontFamily: fontFamilies.interSemiBold, color: colors.gray900 },
  rateSubmit: { backgroundColor: colors.primary700, paddingVertical: spacing.space2, paddingHorizontal: spacing.space5, borderRadius: radii.radiusMd },
  rateSubmitText: { fontSize: fontSizes.fsSm, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.white },

  empty: { alignItems: 'center', paddingTop: spacing.space16, gap: spacing.space4 },
  emptyText: { fontSize: fontSizes.fsBase, color: colors.gray500, fontFamily: fontFamilies.interRegular },
  primaryBtn: { backgroundColor: colors.primary700, paddingVertical: spacing.space3, paddingHorizontal: spacing.space6, borderRadius: radii.radiusMd },
  primaryBtnText: { fontSize: fontSizes.fsBase, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.white },
});
