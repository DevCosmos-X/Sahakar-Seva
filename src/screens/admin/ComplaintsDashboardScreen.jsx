import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { AlertTriangle, CheckCircle, Clock } from 'lucide-react-native';
import { mockComplaints } from '@data/mockComplaints';
import { ScreenContainer } from '@components/app';
import Badge from '@components/ui/Badge';
import Modal from '@components/ui/Modal';
import { colors, spacing, radii, shadows, fontSizes, fontWeights, fontFamilies } from '@theme';

/**
 * ComplaintsDashboardScreen — ported from web pages/admin/ComplaintsDashboard.jsx. Complaint
 * cards with status icon/badge, detail modal, and mark-as-resolved (local state). Preserved.
 */

const statusVariant = { open: 'open', 'in-review': 'pending', 'in-progress': 'assigned', resolved: 'resolved' };
const statusIcons = { open: AlertTriangle, 'in-review': Clock, 'in-progress': Clock, resolved: CheckCircle };
const statusColor = (s) => (s === 'open' ? colors.danger500 : s === 'resolved' ? colors.success500 : colors.warning500);

export default function ComplaintsDashboardScreen() {
  const [complaints, setComplaints] = useState(mockComplaints);
  const [selected, setSelected] = useState(null);

  const handleResolve = (id) => {
    setComplaints((prev) => prev.map((c) => (c.id === id ? { ...c, status: 'resolved' } : c)));
    setSelected(null);
  };

  const openCount = complaints.filter((c) => c.status === 'open').length;

  return (
    <ScreenContainer>
      <Text style={styles.h1}>Complaints Dashboard</Text>
      <Text style={styles.sub}>{openCount} open complaints</Text>

      <View style={styles.list}>
        {complaints.map((c) => {
          const StatusIcon = statusIcons[c.status] || AlertTriangle;
          return (
            <Pressable key={c.id} style={styles.card} onPress={() => setSelected(c)}>
              <View style={styles.cardHeader}>
                <View style={styles.headerLeft}>
                  <StatusIcon size={18} color={statusColor(c.status)} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.subject} numberOfLines={1}>{c.subject}</Text>
                    <Text style={styles.byLine}>By {c.customerName} • {c.createdAt?.split('T')[0]}</Text>
                  </View>
                </View>
                <Badge variant={statusVariant[c.status] || 'default'} size="sm">{c.status}</Badge>
              </View>
              <Text style={styles.preview} numberOfLines={2}>{c.description}</Text>
              <View style={styles.meta}>
                <Text style={styles.metaText}>Booking: {c.bookingId}</Text>
                <Text style={styles.metaText}>Worker: {c.workerName}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

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

function DetailRow({ label, value }) {
  return (
    <View style={styles.dRow}>
      <Text style={styles.dLabel}>{label}</Text>
      <Text style={styles.dValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: fontSizes.fs2xl, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.gray900 },
  sub: { fontSize: fontSizes.fsSm, color: colors.gray500, fontFamily: fontFamilies.interRegular, marginTop: 2, marginBottom: spacing.space4 },
  list: { gap: spacing.space3 },
  card: { backgroundColor: colors.surfaceWhite, borderRadius: radii.radiusLg, padding: spacing.space4, ...shadows.shadowSm },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.space2 },
  headerLeft: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: spacing.space2 },
  subject: { fontSize: fontSizes.fsBase, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.gray900 },
  byLine: { fontSize: fontSizes.fsXs, color: colors.gray500, fontFamily: fontFamilies.interRegular, marginTop: 2 },
  preview: { fontSize: fontSizes.fsSm, color: colors.gray600, fontFamily: fontFamilies.interRegular, marginTop: spacing.space2 },
  meta: { flexDirection: 'row', gap: spacing.space4, marginTop: spacing.space3, paddingTop: spacing.space3, borderTopWidth: 1, borderTopColor: colors.gray100 },
  metaText: { fontSize: fontSizes.fsXs, color: colors.gray500, fontFamily: fontFamilies.interMedium },
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
