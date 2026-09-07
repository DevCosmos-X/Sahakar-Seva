import { useState, useEffect } from 'react';
import { View, Text, Pressable, Linking, Alert, Modal, ActivityIndicator, StyleSheet } from 'react-native';
import { Phone, Video, Navigation, Printer, Plus, PhoneOff, ShieldCheck } from 'lucide-react-native';
import { useAuth } from '@context/AuthContext';
import { getBookingsByCustomer } from '@data/mockBookings';
import { shareReceipt } from '@utils/receipt';
import { ScreenContainer } from '@components/app';
import StatusTimeline from '@components/ui/StatusTimeline';
import Badge, { FairnessBadge } from '@components/ui/Badge';
import StarRating from '@components/ui/StarRating';
import { colors, spacing, radii, shadows, fontSizes, fontWeights, fontFamilies } from '@theme';

/**
 * BookingTrackerScreen — ported from web pages/customer/BookingTracker.jsx.
 *
 * Web used a two-panel desktop layout (list + detail side by side). On mobile that becomes a
 * single scrolling column: a horizontal booking selector row on top, the selected booking's
 * detail below. Preserves: StatusTimeline, worker card, call (tel: → Linking.openURL), video
 * call (a connecting modal — real WebRTC is out of scope for this demo), track-live
 * (→ LiveTrackingMap stack screen), detail grid, and the rating section. The receipt button
 * shares a formatted bill via the native share sheet (utils/receipt.js).
 */

const statusVariant = {
  'en-route': 'en-route', 'in-progress': 'in-progress', completed: 'completed',
  cancelled: 'cancelled', assigned: 'assigned', booked: 'default',
};

export default function BookingTrackerScreen({ navigation }) {
  const { user } = useAuth();
  const bookings = getBookingsByCustomer(user?.id);
  const [selectedId, setSelectedId] = useState(bookings[0]?.id || null);
  const [ratingValue, setRatingValue] = useState(0);
  // Video call: a connecting modal (demo — no real WebRTC backend). connecting → connected.
  const [videoCall, setVideoCall] = useState(null); // null | 'connecting' | 'connected'

  useEffect(() => {
    if (videoCall !== 'connecting') return undefined;
    const t = setTimeout(() => setVideoCall('connected'), 2200);
    return () => clearTimeout(t);
  }, [videoCall]);

  const selected = bookings.find((b) => b.id === selectedId) || null;
  const canTrack = selected && ['en-route', 'in-progress', 'assigned'].includes(selected.status);

  if (bookings.length === 0) {
    return (
      <ScreenContainer>
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
      <View style={styles.headRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.h1}>My Bookings</Text>
          <Text style={styles.sub}>Track worker progress & invoices</Text>
        </View>
        <Pressable style={styles.newBtn} onPress={() => navigation.navigate('CustomerBook')}>
          <Plus size={16} color={colors.white} />
          <Text style={styles.newBtnText}>New</Text>
        </Pressable>
      </View>

      {/* Booking selector chips */}
      <View style={styles.selectorList}>
        {bookings.map((b) => {
          const active = b.id === selectedId;
          return (
            <Pressable
              key={b.id}
              style={[styles.selectorCard, active && styles.selectorCardActive]}
              onPress={() => { setSelectedId(b.id); setRatingValue(0); }}
            >
              <View style={styles.selectorTop}>
                <Text style={styles.selectorName} numberOfLines={1}>{b.serviceName}</Text>
                <Badge variant={statusVariant[b.status] || 'default'} size="sm">{b.status.replace('-', ' ')}</Badge>
              </View>
              <Text style={styles.selectorMeta}>{b.date} • ₹{b.totalPrice}{b.workerName ? ` • ${b.workerName}` : ''}</Text>
            </Pressable>
          );
        })}
      </View>

      {selected && (
        <View style={styles.detailCard}>
          <Text style={styles.ref}>Booking Reference: #{selected.id}</Text>
          <Text style={styles.detailTitle}>{selected.serviceName}</Text>

          <View style={styles.timelineWrap}>
            <StatusTimeline currentStatus={selected.status} />
          </View>

          {/* Worker */}
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
                <Pressable
                  style={styles.contactBtn}
                  onPress={() => setVideoCall('connecting')}
                  accessibilityLabel="Video call"
                >
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

          {/* Details */}
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

          {/* Rating */}
          {selected.status === 'completed' && !selected.rating && (
            <View style={styles.ratingSection}>
              <Text style={styles.ratingTitle}>Rate this service</Text>
              <StarRating rating={ratingValue} interactive onRate={setRatingValue} size={30} />
              {ratingValue > 0 && (
                <Pressable
                  style={styles.rateSubmit}
                  onPress={() => Alert.alert('Thank you!', 'Thank you for rating your cooperative worker!')}
                >
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

      {/* Video call modal (demo — simulated connecting → connected; no real WebRTC backend) */}
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

function Detail({ label, value, accent }) {
  return (
    <View style={styles.detailItem}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, accent && styles.detailAccent]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.space4 },
  h1: { fontSize: fontSizes.fs2xl, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.gray900 },
  sub: { fontSize: fontSizes.fsSm, color: colors.gray500, fontFamily: fontFamilies.interRegular },
  newBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary700, paddingVertical: spacing.space2, paddingHorizontal: spacing.space3, borderRadius: radii.radiusMd },
  newBtnText: { fontSize: fontSizes.fsSm, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.white },

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

  selectorList: { gap: spacing.space2, marginBottom: spacing.space4 },
  selectorCard: { backgroundColor: colors.surfaceWhite, borderRadius: radii.radiusLg, padding: spacing.space3, borderWidth: 1.5, borderColor: colors.gray200 },
  selectorCardActive: { borderColor: colors.primary500, backgroundColor: colors.primary50 },
  selectorTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.space2 },
  selectorName: { flex: 1, fontSize: fontSizes.fsBase, fontWeight: fontWeights.fwSemibold, fontFamily: fontFamilies.interSemiBold, color: colors.gray900 },
  selectorMeta: { fontSize: fontSizes.fsXs, color: colors.gray500, fontFamily: fontFamilies.interRegular, marginTop: 2 },

  detailCard: { backgroundColor: colors.surfaceWhite, borderRadius: radii.radiusXl, padding: spacing.space5, ...shadows.shadowMd },
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
