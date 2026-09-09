import { useState, useRef } from 'react';
import { View, Text, TextInput, Pressable, Animated, StyleSheet } from 'react-native';
import {
  Calendar,
  Plus,
  Check,
  Clock,
  X,
  ChevronRight,
  ChevronDown,
  CalendarDays,
  ListFilter,
} from 'lucide-react-native';
import { useAuth } from '@context/AuthContext';
import { ScreenContainer } from '@components/app';
import Modal from '@components/ui/Modal';
import { DEMO_WORKER_ID, demoMockWorker } from './workerData';
import { colors, spacing, radii, shadows, fontSizes, fontWeights, fontFamilies } from '@theme';

/**
 * LeaveRequestsScreen — ported from web pages/worker/LeaveRequests.jsx. Demo worker sees
 * Suresh's seeded leave requests; real workers start empty (no || mockWorkers[0] fallback).
 * Request-leave modal (start/end/reason) adds to local state, exactly as web.
 *
 * VISUAL REDESIGN (frontend-only — no data source, submit logic, or navigation changed):
 *  - Premium header with subtitle + a pill "Request Leave" CTA (opens the SAME modal).
 *  - Status filter chips (All / Pending / Approved / Rejected) driven by NEW frontend-only
 *    filter state that simply filters the EXISTING `leaves` array. No backend query added.
 *  - Status-accented cards: left accent bar (green/amber/red), calendar tile, date range, a
 *    day-count derived from the existing start/end dates, a status pill, the reason, and an
 *    inline "View Details" expand. There is no existing leave-details screen, so View Details
 *    reveals ONLY existing fields inline (it invents no data and adds no backend call).
 *  - A decorative low-content section that appears only when there is spare room (few requests).
 *
 * OMITTED ON PURPOSE (data does not exist — "omit rather than invent a backend field"):
 *  leave type ("Casual Leave"), and a separate "Requested on" date — the leave objects only have
 *  { id, startDate, endDate, reason, status }.
 */

// [pill bg, pill fg, accent bar, tile bg, tile fg, icon]
const STATUS_STYLE = {
  approved: { bg: colors.success50, fg: colors.success700, accent: colors.success500, tileBg: colors.success50, tileFg: colors.success600, Icon: Check, label: 'Approved' },
  pending: { bg: colors.warning50, fg: colors.warning700, accent: colors.warning500, tileBg: colors.warning50, tileFg: colors.warning600, Icon: Clock, label: 'Pending' },
  rejected: { bg: colors.danger50, fg: colors.danger600, accent: colors.danger500, tileBg: colors.danger50, tileFg: colors.danger600, Icon: X, label: 'Rejected' },
};
function statusStyle(status) {
  return STATUS_STYLE[status] || { bg: colors.gray100, fg: colors.gray600, accent: colors.gray300, tileBg: colors.gray100, tileFg: colors.gray500, Icon: Calendar, label: status || '—' };
}

const FILTERS = [
  { key: 'all', label: 'All', Icon: ListFilter },
  { key: 'pending', label: 'Pending', Icon: Clock },
  { key: 'approved', label: 'Approved', Icon: Check },
  { key: 'rejected', label: 'Rejected', Icon: X },
];

// Inclusive day count derived from the existing YYYY-MM-DD strings. Frontend-only formatting of
// data that already exists; falls back to null if the dates aren't parseable.
function dayCount(startDate, endDate) {
  if (!startDate || !endDate) return null;
  const a = new Date(startDate);
  const b = new Date(endDate);
  if (isNaN(a) || isNaN(b)) return null;
  const diff = Math.round((b - a) / 86400000) + 1;
  return diff > 0 ? diff : 1;
}

export default function LeaveRequestsScreen() {
  const { user } = useAuth();
  const seedLeaves = user?.id === DEMO_WORKER_ID ? demoMockWorker.leaveRequests || [] : [];

  const [showModal, setShowModal] = useState(false);
  const [leaves, setLeaves] = useState(seedLeaves);
  const [form, setForm] = useState({ startDate: '', endDate: '', reason: '' });
  // Frontend-only presentation state.
  const [filter, setFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);

  const handleSubmit = () => {
    setLeaves((prev) => [...prev, { id: `lr-${Date.now()}`, ...form, status: 'pending' }]);
    setShowModal(false);
    setForm({ startDate: '', endDate: '', reason: '' });
  };

  const canSubmit = form.startDate && form.endDate && form.reason;

  // Counts + filtered view are derived purely from the existing `leaves` array.
  const counts = {
    all: leaves.length,
    pending: leaves.filter((l) => l.status === 'pending').length,
    approved: leaves.filter((l) => l.status === 'approved').length,
    rejected: leaves.filter((l) => l.status === 'rejected').length,
  };
  const visibleLeaves = filter === 'all' ? leaves : leaves.filter((l) => l.status === filter);
  // Show the decorative section when the list is short enough to leave spare room.
  const showDecor = visibleLeaves.length <= 2;

  return (
    <ScreenContainer contentStyle={styles.pageContent}>
      {/* ---- Header ---- */}
      <View style={styles.headRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.h1}>Leave Requests</Text>
          <Text style={styles.h1Sub}>View and manage your leave requests</Text>
        </View>
        <PressableScale style={styles.newBtn} onPress={() => setShowModal(true)} accessibilityLabel="Request Leave">
          <Plus size={16} color={colors.white} strokeWidth={2.6} />
          <Text style={styles.newBtnText}>Request Leave</Text>
        </PressableScale>
      </View>

      {/* ---- Filter chips ---- */}
      <View style={styles.filterRow}>
        {FILTERS.map(({ key, label, Icon }) => {
          const active = filter === key;
          const n = counts[key];
          return (
            <Pressable
              key={key}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setFilter(key)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Icon size={13} color={active ? colors.accent700 : colors.gray500} strokeWidth={2.3} />
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
              {n > 0 && (
                <View style={[styles.chipCount, active && styles.chipCountActive]}>
                  <Text style={[styles.chipCountText, active && styles.chipCountTextActive]}>{n}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      {/* ---- List ---- */}
      <View style={styles.list}>
        {visibleLeaves.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <CalendarDays size={28} color={colors.accent500} strokeWidth={1.9} />
            </View>
            <Text style={styles.emptyTitle}>
              {leaves.length === 0 ? 'No leave requests yet' : `No ${filter} requests`}
            </Text>
            <Text style={styles.emptyText}>
              {leaves.length === 0
                ? 'Tap “Request Leave” to submit your first request.'
                : 'Try a different filter to see your other requests.'}
            </Text>
          </View>
        ) : (
          visibleLeaves.map((leave) => {
            const s = statusStyle(leave.status);
            const days = dayCount(leave.startDate, leave.endDate);
            const expanded = expandedId === leave.id;
            return (
              <View key={leave.id} style={styles.card}>
                <View style={[styles.accentBar, { backgroundColor: s.accent }]} />
                <View style={styles.cardBody}>
                  {/* Top: calendar tile + dates, status pill */}
                  <View style={styles.cardTop}>
                    <View style={[styles.calTile, { backgroundColor: s.tileBg }]}>
                      <Calendar size={20} color={s.tileFg} strokeWidth={2.1} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.dateText} numberOfLines={2}>
                        {leave.startDate} <Text style={styles.dateArrow}>→</Text> {leave.endDate}
                      </Text>
                      {days != null && (
                        <Text style={styles.metaText}>{days} {days === 1 ? 'day' : 'days'}</Text>
                      )}
                    </View>
                    <View style={[styles.statusPill, { backgroundColor: s.bg }]}>
                      <s.Icon size={12} color={s.fg} strokeWidth={2.6} />
                      <Text style={[styles.statusText, { color: s.fg }]}>{s.label}</Text>
                    </View>
                  </View>

                  {/* Reason */}
                  {leave.reason ? <Text style={styles.reason} numberOfLines={expanded ? undefined : 2}>{leave.reason}</Text> : null}

                  {/* Expanded details (existing fields only — no invented data) */}
                  {expanded && (
                    <View style={styles.detailBox}>
                      <DetailLine label="From" value={leave.startDate} />
                      <DetailLine label="To" value={leave.endDate} />
                      {days != null && <DetailLine label="Duration" value={`${days} ${days === 1 ? 'day' : 'days'}`} />}
                      <DetailLine label="Status" value={s.label} last />
                    </View>
                  )}

                  {/* Bottom: View Details toggle */}
                  <Pressable
                    style={styles.detailToggle}
                    onPress={() => setExpandedId(expanded ? null : leave.id)}
                    accessibilityRole="button"
                    accessibilityLabel={expanded ? 'Hide details' : 'View details'}
                  >
                    <Text style={styles.detailToggleText}>{expanded ? 'Hide Details' : 'View Details'}</Text>
                    {expanded ? (
                      <ChevronDown size={16} color={colors.accent600} strokeWidth={2.4} />
                    ) : (
                      <ChevronRight size={16} color={colors.accent600} strokeWidth={2.4} />
                    )}
                  </Pressable>
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* ---- Decorative low-content section (adapts / disappears when the list is long) ---- */}
      {showDecor && (
        <View style={styles.decor}>
          <View style={styles.decorArt}>
            <View style={[styles.decorBlob, styles.decorBlobLeft]} />
            <View style={[styles.decorBlob, styles.decorBlobRight]} />
            <View style={styles.decorIconWrap}>
              <CalendarDays size={34} color={colors.accent600} strokeWidth={1.8} />
            </View>
          </View>
          <Text style={styles.decorTitle}>Plan your time, live your best life</Text>
          <Text style={styles.decorText}>
            Submit your leave requests and keep track of your time off, all in one place.
          </Text>
        </View>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Request Leave">
        <View style={{ gap: spacing.space4 }}>
          <Field label="Start Date" value={form.startDate} onChangeText={(v) => setForm((p) => ({ ...p, startDate: v }))} placeholder="YYYY-MM-DD" />
          <Field label="End Date" value={form.endDate} onChangeText={(v) => setForm((p) => ({ ...p, endDate: v }))} placeholder="YYYY-MM-DD" />
          <Field label="Reason" value={form.reason} onChangeText={(v) => setForm((p) => ({ ...p, reason: v }))} placeholder="Why do you need leave?" />
          <Pressable style={[styles.submitBtn, !canSubmit && styles.submitDisabled]} onPress={handleSubmit} disabled={!canSubmit}>
            <Text style={styles.submitText}>Submit Request</Text>
          </Pressable>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

function Field({ label, value, onChangeText, placeholder }) {
  return (
    <View style={{ gap: spacing.space1 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput style={styles.input} value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.gray400} />
    </View>
  );
}

function DetailLine({ label, value, last }) {
  return (
    <View style={[styles.detailLine, !last && styles.detailLineBorder]}>
      <Text style={styles.detailLineLabel}>{label}</Text>
      <Text style={styles.detailLineValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

/** PressableScale — small press-in scale for premium touch feedback (frontend-only). */
function PressableScale({ children, style, onPress, accessibilityLabel }) {
  const scale = useRef(new Animated.Value(1)).current;
  const to = (v) => Animated.spring(scale, { toValue: v, friction: 6, tension: 180, useNativeDriver: true }).start();
  return (
    <Pressable onPress={onPress} onPressIn={() => to(0.95)} onPressOut={() => to(1)} accessibilityRole="button" accessibilityLabel={accessibilityLabel}>
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Clear the global Sahakar AI ChatWidget FAB (bottom: insets.bottom + 76).
  pageContent: { paddingBottom: spacing.space16 },

  // ---- Header ----
  headRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.space3, marginBottom: spacing.space4 },
  h1: { fontSize: fontSizes.fs3xl, fontWeight: fontWeights.fwExtrabold, fontFamily: fontFamilies.interExtraBold, color: colors.gray900, letterSpacing: -0.5 },
  h1Sub: { fontSize: fontSizes.fsSm, color: colors.gray500, fontFamily: fontFamilies.interMedium, marginTop: 3 },
  newBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.accent600, paddingVertical: 10, paddingHorizontal: spacing.space4,
    borderRadius: radii.radiusFull, ...shadows.shadowMd, shadowColor: colors.accent600,
  },
  newBtnText: { fontSize: fontSizes.fsSm, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.white },

  // ---- Filter chips ----
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.space2, marginBottom: spacing.space4 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingVertical: 7, paddingHorizontal: spacing.space3,
    backgroundColor: colors.surfaceWhite, borderWidth: 1, borderColor: colors.gray200, borderRadius: radii.radiusFull,
  },
  chipActive: { backgroundColor: colors.accent50, borderColor: colors.accent200 },
  chipText: { fontSize: fontSizes.fsSm, fontFamily: fontFamilies.interSemiBold, fontWeight: fontWeights.fwSemibold, color: colors.gray500 },
  chipTextActive: { color: colors.accent700 },
  chipCount: { minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.gray100 },
  chipCountActive: { backgroundColor: colors.accent200 },
  chipCountText: { fontSize: 10.5, fontFamily: fontFamilies.interBold, fontWeight: fontWeights.fwBold, color: colors.gray600 },
  chipCountTextActive: { color: colors.accent700 },

  // ---- List / card ----
  list: { gap: spacing.space3 },
  card: {
    flexDirection: 'row', backgroundColor: colors.surfaceWhite, borderRadius: radii.radiusXl,
    borderWidth: 1, borderColor: colors.gray100, overflow: 'hidden', ...shadows.shadowSm,
  },
  accentBar: { width: 5 },
  cardBody: { flex: 1, padding: spacing.space4 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.space3 },
  calTile: { width: 44, height: 44, borderRadius: radii.radiusLg, alignItems: 'center', justifyContent: 'center' },
  dateText: { fontSize: fontSizes.fsBase, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.gray900 },
  dateArrow: { color: colors.gray400 },
  metaText: { fontSize: fontSizes.fsXs, color: colors.gray500, fontFamily: fontFamilies.interMedium, marginTop: 2 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 9, borderRadius: radii.radiusFull },
  statusText: { fontSize: fontSizes.fsXs, fontFamily: fontFamilies.interSemiBold, fontWeight: fontWeights.fwSemibold },

  reason: { fontSize: fontSizes.fsSm, color: colors.gray700, fontFamily: fontFamilies.interRegular, lineHeight: 20, marginTop: spacing.space3 },

  detailBox: { marginTop: spacing.space3, backgroundColor: colors.gray50, borderRadius: radii.radiusMd, paddingHorizontal: spacing.space3 },
  detailLine: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.space3, paddingVertical: 9 },
  detailLineBorder: { borderBottomWidth: 1, borderBottomColor: colors.gray100 },
  detailLineLabel: { fontSize: fontSizes.fsXs, color: colors.gray500, fontFamily: fontFamilies.interMedium },
  detailLineValue: { fontSize: fontSizes.fsSm, color: colors.gray900, fontFamily: fontFamilies.interSemiBold, fontWeight: fontWeights.fwSemibold, flexShrink: 1, textAlign: 'right' },

  detailToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 3, marginTop: spacing.space3 },
  detailToggleText: { fontSize: fontSizes.fsSm, fontFamily: fontFamilies.interSemiBold, fontWeight: fontWeights.fwSemibold, color: colors.accent600 },

  // ---- Empty (per-filter) ----
  emptyCard: { backgroundColor: colors.surfaceWhite, borderRadius: radii.radiusXl, borderWidth: 1, borderColor: colors.gray100, padding: spacing.space6, alignItems: 'center', ...shadows.shadowSm },
  emptyIcon: { width: 56, height: 56, borderRadius: radii.radiusFull, backgroundColor: colors.accent50, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.space3 },
  emptyTitle: { fontSize: fontSizes.fsBase, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.gray900 },
  emptyText: { fontSize: fontSizes.fsSm, color: colors.gray500, fontFamily: fontFamilies.interRegular, textAlign: 'center', marginTop: 4, lineHeight: 20 },

  // ---- Decorative section ----
  decor: { alignItems: 'center', marginTop: spacing.space8, paddingHorizontal: spacing.space4 },
  decorArt: { width: 120, height: 96, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.space4 },
  decorBlob: { position: 'absolute', width: 54, height: 54, borderRadius: 27, opacity: 0.5 },
  decorBlobLeft: { left: 6, top: 10, backgroundColor: colors.accent100 },
  decorBlobRight: { right: 6, bottom: 8, backgroundColor: colors.primary100 },
  decorIconWrap: { width: 72, height: 72, borderRadius: radii.radiusXl, backgroundColor: colors.surfaceWhite, borderWidth: 1, borderColor: colors.accent100, alignItems: 'center', justifyContent: 'center', ...shadows.shadowSm },
  decorTitle: { fontSize: fontSizes.fsLg, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.gray900, textAlign: 'center' },
  decorText: { fontSize: fontSizes.fsSm, color: colors.gray500, fontFamily: fontFamilies.interRegular, textAlign: 'center', marginTop: spacing.space2, lineHeight: 20, maxWidth: 300 },

  // ---- Modal form (unchanged behaviour) ----
  fieldLabel: { fontSize: fontSizes.fsSm, fontWeight: fontWeights.fwMedium, fontFamily: fontFamilies.interMedium, color: colors.gray700 },
  input: { paddingVertical: spacing.space3, paddingHorizontal: spacing.space4, borderWidth: 1.5, borderColor: colors.gray200, borderRadius: radii.radiusMd, fontSize: fontSizes.fsSm, fontFamily: fontFamilies.interRegular, color: colors.gray900, backgroundColor: colors.gray50 },
  submitBtn: { height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radii.radiusMd, backgroundColor: colors.accent600 },
  submitDisabled: { opacity: 0.5 },
  submitText: { fontSize: fontSizes.fsBase, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.white },
});
