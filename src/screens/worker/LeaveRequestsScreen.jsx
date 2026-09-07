import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { Calendar, Plus } from 'lucide-react-native';
import { useAuth } from '@context/AuthContext';
import { ScreenContainer } from '@components/app';
import Badge from '@components/ui/Badge';
import Modal from '@components/ui/Modal';
import { DEMO_WORKER_ID, demoMockWorker } from './workerData';
import { colors, spacing, radii, shadows, fontSizes, fontWeights, fontFamilies } from '@theme';

/**
 * LeaveRequestsScreen — ported from web pages/worker/LeaveRequests.jsx. Demo worker sees
 * Suresh's seeded leave requests; real workers start empty (no || mockWorkers[0] fallback).
 * Request-leave modal (start/end/reason) adds to local state, exactly as web.
 */

const statusVariant = { approved: 'approved', pending: 'pending', rejected: 'rejected' };

export default function LeaveRequestsScreen() {
  const { user } = useAuth();
  const seedLeaves = user?.id === DEMO_WORKER_ID ? demoMockWorker.leaveRequests || [] : [];

  const [showModal, setShowModal] = useState(false);
  const [leaves, setLeaves] = useState(seedLeaves);
  const [form, setForm] = useState({ startDate: '', endDate: '', reason: '' });

  const handleSubmit = () => {
    setLeaves((prev) => [...prev, { id: `lr-${Date.now()}`, ...form, status: 'pending' }]);
    setShowModal(false);
    setForm({ startDate: '', endDate: '', reason: '' });
  };

  const canSubmit = form.startDate && form.endDate && form.reason;

  return (
    <ScreenContainer>
      <View style={styles.headRow}>
        <Text style={styles.h1}>Leave Requests</Text>
        <Pressable style={styles.newBtn} onPress={() => setShowModal(true)}>
          <Plus size={16} color={colors.white} />
          <Text style={styles.newBtnText}>Request</Text>
        </Pressable>
      </View>

      <View style={styles.list}>
        {leaves.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No leave requests yet.</Text>
          </View>
        ) : (
          leaves.map((leave) => (
            <View key={leave.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.dates}>
                  <Calendar size={16} color={colors.gray500} />
                  <Text style={styles.dateText}>{leave.startDate} → {leave.endDate}</Text>
                </View>
                <Badge variant={statusVariant[leave.status] || 'default'}>{leave.status}</Badge>
              </View>
              <Text style={styles.reason}>{leave.reason}</Text>
            </View>
          ))
        )}
      </View>

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

const styles = StyleSheet.create({
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.space4 },
  h1: { fontSize: fontSizes.fs2xl, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.gray900 },
  newBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.accent600, paddingVertical: spacing.space2, paddingHorizontal: spacing.space3, borderRadius: radii.radiusMd },
  newBtnText: { fontSize: fontSizes.fsSm, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.white },
  list: { gap: spacing.space3 },
  emptyCard: { backgroundColor: colors.surfaceWhite, borderRadius: radii.radiusLg, padding: spacing.space6, alignItems: 'center', ...shadows.shadowSm },
  emptyText: { fontSize: fontSizes.fsSm, color: colors.gray500, fontFamily: fontFamilies.interRegular },
  card: { backgroundColor: colors.surfaceWhite, borderRadius: radii.radiusLg, padding: spacing.space4, ...shadows.shadowSm },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dates: { flexDirection: 'row', alignItems: 'center', gap: spacing.space2 },
  dateText: { fontSize: fontSizes.fsSm, fontWeight: fontWeights.fwSemibold, fontFamily: fontFamilies.interSemiBold, color: colors.gray900 },
  reason: { fontSize: fontSizes.fsSm, color: colors.gray600, fontFamily: fontFamilies.interRegular, marginTop: spacing.space2 },
  fieldLabel: { fontSize: fontSizes.fsSm, fontWeight: fontWeights.fwMedium, fontFamily: fontFamilies.interMedium, color: colors.gray700 },
  input: { paddingVertical: spacing.space3, paddingHorizontal: spacing.space4, borderWidth: 1.5, borderColor: colors.gray200, borderRadius: radii.radiusMd, fontSize: fontSizes.fsSm, fontFamily: fontFamilies.interRegular, color: colors.gray900, backgroundColor: colors.gray50 },
  submitBtn: { height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radii.radiusMd, backgroundColor: colors.accent600 },
  submitDisabled: { opacity: 0.5 },
  submitText: { fontSize: fontSizes.fsBase, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.white },
});
