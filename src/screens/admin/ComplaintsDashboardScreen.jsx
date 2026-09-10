import { useState, useMemo, useRef } from 'react';
import { View, Text, Pressable, Animated, StyleSheet } from 'react-native';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Calendar,
  User,
  Briefcase,
  Hash,
  ChevronRight,
} from 'lucide-react-native';
import { mockComplaints } from '@data/mockComplaints';
import { ScreenContainer } from '@components/app';
import { SearchBar } from '@components/app';
import Badge from '@components/ui/Badge';
import Modal from '@components/ui/Modal';
import { colors, spacing, radii, shadows, fontSizes, fontWeights, fontFamilies } from '@theme';

/**
 * ComplaintsDashboardScreen — ported from web pages/admin/ComplaintsDashboard.jsx.
 *
 * PHASE 11 REDESIGN — PRESENTATION ONLY. All data and behaviour are preserved verbatim:
 *  - complaints state seeded from mockComplaints; handleResolve flips a complaint to 'resolved'
 *    in local state (same as before, not persisted).
 *  - openCount derived from the live list; the detail Modal + "Mark as Resolved" action work
 *    exactly as before.
 *  - status values (open / in-progress / in-review / resolved) and their Badge variants are
 *    unchanged.
 *
 * The search field and status filter chips are NEW but 100% FRONTEND-ONLY view state layered on
 * the already-in-memory `complaints` array — no backend call, nothing fetched or mutated. They
 * filter what's rendered; they do not touch data or logic. Nothing is fabricated: every field
 * shown (subject, customerName, workerName, bookingId, serviceName, description, createdAt,
 * status, resolution) already exists on the complaint records.
 */

const statusVariant = { open: 'open', 'in-review': 'pending', 'in-progress': 'assigned', resolved: 'resolved' };
const statusIcons = { open: AlertTriangle, 'in-review': Clock, 'in-progress': Clock, resolved: CheckCircle };

// Refined per-status treatment (soft tint + accent). Keys match the real status values.
const STATUS_TONE = {
  open: { accent: colors.danger500, chipBg: '#fef2f2', chipFg: colors.danger600, iconBg: '#fef2f2', label: 'Open' },
  'in-progress': { accent: colors.info500, chipBg: colors.info50, chipFg: colors.info700, iconBg: colors.info50, label: 'In progress' },
  'in-review': { accent: colors.warning500, chipBg: colors.warning50, chipFg: colors.warning700, iconBg: colors.warning50, label: 'In review' },
  resolved: { accent: colors.success500, chipBg: '#ecfdf5', chipFg: colors.success700, iconBg: '#ecfdf5', label: 'Resolved' },
};
const toneFor = (s) => STATUS_TONE[s] || STATUS_TONE.open;

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'open', label: 'Open' },
  { id: 'in-progress', label: 'In Progress' },
  { id: 'resolved', label: 'Resolved' },
];

function shortDate(iso) {
  if (typeof iso !== 'string') return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.split('T')[0];
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ComplaintsDashboardScreen() {
  const [complaints, setComplaints] = useState(mockComplaints);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const handleResolve = (id) => {
    setComplaints((prev) => prev.map((c) => (c.id === id ? { ...c, status: 'resolved' } : c)));
    setSelected(null);
  };

  const openCount = complaints.filter((c) => c.status === 'open').length;

  // Frontend-only view filtering over the loaded complaints (no backend touched).
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return complaints.filter((c) => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (!q) return true;
      return (
        (c.subject || '').toLowerCase().includes(q) ||
        (c.description || '').toLowerCase().includes(q) ||
        (c.customerName || '').toLowerCase().includes(q) ||
        (c.workerName || '').toLowerCase().includes(q) ||
        (c.bookingId || '').toLowerCase().includes(q) ||
        (c.serviceName || '').toLowerCase().includes(q)
      );
    });
  }, [complaints, search, statusFilter]);

  return (
    <ScreenContainer contentStyle={styles.pageContent}>
      {/* ---------------- Header ---------------- */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.h1}>Complaints Dashboard</Text>
          <Text style={styles.sub}>
            <Text style={styles.subStrong}>{openCount}</Text> open {openCount === 1 ? 'complaint' : 'complaints'}
          </Text>
        </View>
        <View style={styles.headerBadge}>
          <AlertTriangle size={24} color={colors.danger600} strokeWidth={2.2} />
          {openCount > 0 && <View style={styles.headerBadgeDot} />}
        </View>
      </View>

      {/* ---------------- Search ---------------- */}
      <View style={styles.searchWrap}>
        <SearchBar placeholder="Search complaints…" value={search} onChangeText={setSearch} />
      </View>

      {/* ---------------- Filter chips ---------------- */}
      <View style={styles.chipsRow}>
        {FILTERS.map((f) => {
          const active = statusFilter === f.id;
          return (
            <Pressable
              key={f.id}
              style={[styles.chip, active ? styles.chipActive : styles.chipInactive]}
              onPress={() => setStatusFilter(f.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.chipText, active ? styles.chipTextActive : styles.chipTextInactive]}>{f.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* ---------------- Cards ---------------- */}
      <View style={styles.list}>
        {visible.map((c) => (
          <ComplaintCard key={c.id} complaint={c} onPress={() => setSelected(c)} />
        ))}
        {visible.length === 0 && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No complaints match your search or filter.</Text>
          </View>
        )}
      </View>

      {/* ---------------- Detail modal (unchanged behaviour) ---------------- */}
      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title="Complaint Details" size="lg">
        {selected && (
          <View>
            <Badge variant={statusVariant[selected.status] || 'default'}>{selected.status}</Badge>
            <Text style={styles.detailSubject}>{selected.subject}</Text>
            <View style={styles.detailGrid}>
              <DetailRow label="Customer" value={selected.customerName} />
              <DetailRow label="Worker" value={selected.workerName} />
              <DetailRow label="Booking" value={selected.bookingId} />
              <DetailRow label="Date" value={selected.createdAt?.split('T')[0]} />
            </View>
            <Text style={styles.sectionLabel}>Description</Text>
            <Text style={styles.detailBody}>{selected.description}</Text>
            {selected.resolution && (
              <>
                <Text style={styles.sectionLabel}>Resolution</Text>
                <Text style={styles.detailBody}>{selected.resolution}</Text>
              </>
            )}
            {selected.status !== 'resolved' && (
              <Pressable style={styles.resolveBtn} onPress={() => handleResolve(selected.id)}>
                <CheckCircle size={18} color={colors.white} />
                <Text style={styles.resolveText}>Mark as Resolved</Text>
              </Pressable>
            )}
          </View>
        )}
      </Modal>
    </ScreenContainer>
  );
}

/* ------------------------------------------------------------------ */
/* Complaint card                                                      */
/* ------------------------------------------------------------------ */

function ComplaintCard({ complaint: c, onPress }) {
  const scale = useRef(new Animated.Value(1)).current;
  const to = (v) => Animated.spring(scale, { toValue: v, useNativeDriver: true, friction: 7, tension: 180 }).start();
  const tone = toneFor(c.status);
  const StatusIcon = statusIcons[c.status] || AlertTriangle;

  return (
    <Pressable onPress={onPress} onPressIn={() => to(0.98)} onPressOut={() => to(1)} accessibilityLabel={c.subject}>
      <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
        <View style={[styles.cardAccent, { backgroundColor: tone.accent }]} />

        {/* Top: icon + title + status */}
        <View style={styles.cardTop}>
          <View style={[styles.cardIcon, { backgroundColor: tone.iconBg }]}>
            <StatusIcon size={18} color={tone.accent} strokeWidth={2.3} />
          </View>
          <View style={styles.cardTitleWrap}>
            <Text style={styles.subject} numberOfLines={1}>{c.subject}</Text>
            <View style={styles.byLineRow}>
              <User size={11} color={colors.gray400} strokeWidth={2.2} />
              <Text style={styles.byLine} numberOfLines={1}>{c.customerName}</Text>
              <Text style={styles.byDot}>•</Text>
              <Calendar size={11} color={colors.gray400} strokeWidth={2.2} />
              <Text style={styles.byLine} numberOfLines={1}>{shortDate(c.createdAt)}</Text>
            </View>
          </View>
          <View style={[styles.statusChip, { backgroundColor: tone.chipBg }]}>
            <View style={[styles.statusChipDot, { backgroundColor: tone.accent }]} />
            <Text style={[styles.statusChipText, { color: tone.chipFg }]} numberOfLines={1}>{tone.label}</Text>
          </View>
        </View>

        {/* Description */}
        <Text style={styles.preview} numberOfLines={2}>{c.description}</Text>

        {/* Metadata footer */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <View style={styles.metaIcon}><Hash size={12} color={colors.primary600} strokeWidth={2.4} /></View>
            <View style={{ minWidth: 0 }}>
              <Text style={styles.metaLabel}>Booking</Text>
              <Text style={styles.metaValue} numberOfLines={1}>{c.bookingId}</Text>
            </View>
          </View>
          <View style={styles.metaItem}>
            <View style={styles.metaIcon}><Briefcase size={12} color={colors.primary600} strokeWidth={2.4} /></View>
            <View style={{ minWidth: 0 }}>
              <Text style={styles.metaLabel}>Worker</Text>
              <Text style={styles.metaValue} numberOfLines={1}>{c.workerName}</Text>
            </View>
          </View>
          <View style={[styles.chevronBtn, { backgroundColor: tone.chipBg }]}>
            <ChevronRight size={16} color={tone.accent} strokeWidth={2.4} />
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

function DetailRow({ label, value }) {
  return (
    <View style={styles.dRow}>
      <Text style={styles.dLabel}>{label}</Text>
      <Text style={styles.dValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pageContent: { paddingBottom: spacing.space20 },

  /* Header */
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.space3 },
  h1: { fontSize: fontSizes.fs2xl, fontWeight: fontWeights.fwExtrabold, fontFamily: fontFamilies.interExtraBold, color: colors.gray900, letterSpacing: -0.4 },
  sub: { fontSize: fontSizes.fsSm, color: colors.gray500, fontFamily: fontFamilies.interRegular, marginTop: 3 },
  subStrong: { color: colors.danger600, fontFamily: fontFamilies.interBold, fontWeight: fontWeights.fwBold },
  headerBadge: {
    width: 48, height: 48, borderRadius: radii.radiusLg, backgroundColor: '#fef2f2',
    borderWidth: 1, borderColor: colors.danger100, alignItems: 'center', justifyContent: 'center',
  },
  headerBadgeDot: {
    position: 'absolute', top: 9, right: 9, width: 9, height: 9, borderRadius: 5,
    backgroundColor: colors.danger500, borderWidth: 1.5, borderColor: '#fef2f2',
  },

  /* Search */
  searchWrap: { marginTop: spacing.space4 },

  /* Chips */
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.space2, marginTop: spacing.space3 },
  chip: { borderRadius: radii.radiusFull, paddingVertical: 7, paddingHorizontal: spacing.space3 },
  chipActive: { backgroundColor: colors.primary600 },
  chipInactive: { backgroundColor: colors.surfaceWhite, borderWidth: 1, borderColor: colors.gray200 },
  chipText: { fontSize: fontSizes.fsXs, fontFamily: fontFamilies.interSemiBold, fontWeight: fontWeights.fwSemibold },
  chipTextActive: { color: colors.white },
  chipTextInactive: { color: colors.gray600 },

  /* Cards */
  list: { gap: spacing.space3, marginTop: spacing.space4 },
  card: {
    backgroundColor: colors.surfaceWhite, borderRadius: radii.radiusXl, padding: spacing.space4,
    borderWidth: 1, borderColor: colors.gray100, overflow: 'hidden', ...shadows.shadowSm,
  },
  cardAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.space3 },
  cardIcon: { width: 40, height: 40, borderRadius: radii.radiusMd, alignItems: 'center', justifyContent: 'center' },
  cardTitleWrap: { flex: 1, minWidth: 0 },
  subject: { fontSize: fontSizes.fsBase, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.gray900 },
  byLineRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  byLine: { fontSize: fontSizes.fsXs, color: colors.gray500, fontFamily: fontFamilies.interRegular, flexShrink: 1 },
  byDot: { fontSize: fontSizes.fsXs, color: colors.gray300, marginHorizontal: 1 },
  statusChip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: radii.radiusFull, paddingVertical: 4, paddingHorizontal: 9 },
  statusChipDot: { width: 6, height: 6, borderRadius: 3 },
  statusChipText: { fontSize: 11, fontFamily: fontFamilies.interSemiBold, fontWeight: fontWeights.fwSemibold },

  preview: { fontSize: fontSizes.fsSm, color: colors.gray600, fontFamily: fontFamilies.interRegular, lineHeight: fontSizes.fsSm * 1.5, marginTop: spacing.space3 },

  metaRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.space3,
    marginTop: spacing.space3, paddingTop: spacing.space3, borderTopWidth: 1, borderTopColor: colors.gray100,
  },
  metaItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 7, minWidth: 0 },
  metaIcon: { width: 26, height: 26, borderRadius: radii.radiusFull, backgroundColor: colors.primary50, alignItems: 'center', justifyContent: 'center' },
  metaLabel: { fontSize: 10, color: colors.gray400, fontFamily: fontFamilies.interMedium },
  metaValue: { fontSize: fontSizes.fsXs, color: colors.gray800, fontFamily: fontFamilies.interSemiBold, fontWeight: fontWeights.fwSemibold },
  chevronBtn: { width: 30, height: 30, borderRadius: radii.radiusFull, alignItems: 'center', justifyContent: 'center' },

  emptyCard: { backgroundColor: colors.surfaceWhite, borderRadius: radii.radiusLg, borderWidth: 1, borderColor: colors.gray100, padding: spacing.space6, alignItems: 'center' },
  emptyText: { fontSize: fontSizes.fsSm, color: colors.gray500, fontFamily: fontFamilies.interRegular },

  /* Modal — unchanged */
  detailSubject: { fontSize: fontSizes.fsLg, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.gray900, marginTop: spacing.space3 },
  detailGrid: { marginTop: spacing.space3, gap: spacing.space2, backgroundColor: colors.gray50, borderRadius: radii.radiusMd, padding: spacing.space3 },
  dRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.space3 },
  dLabel: { fontSize: fontSizes.fsSm, color: colors.gray500, fontFamily: fontFamilies.interRegular },
  dValue: { fontSize: fontSizes.fsSm, fontWeight: fontWeights.fwSemibold, fontFamily: fontFamilies.interSemiBold, color: colors.gray900, flexShrink: 1, textAlign: 'right' },
  sectionLabel: { fontSize: fontSizes.fsSm, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.gray900, marginTop: spacing.space4, marginBottom: spacing.space1 },
  detailBody: { fontSize: fontSizes.fsSm, color: colors.gray600, fontFamily: fontFamilies.interRegular, lineHeight: fontSizes.fsSm * 1.5 },
  resolveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.space2, height: 48, marginTop: spacing.space5, borderRadius: radii.radiusMd, backgroundColor: colors.success600 },
  resolveText: { fontSize: fontSizes.fsBase, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.white },
});
