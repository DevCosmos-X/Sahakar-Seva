import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { MapPin, Clock, IndianRupee, User, CheckCircle, XCircle } from 'lucide-react-native';
import { ScreenContainer } from '@components/app';
import Badge, { FairnessBadge } from '@components/ui/Badge';
import Modal from '@components/ui/Modal';
import { colors, spacing, radii, shadows, fontSizes, fontWeights, fontFamilies } from '@theme';

/**
 * JobFeedScreen — ported from web pages/worker/JobFeed.jsx. Available jobs sorted by fairness
 * queue, urgency badges, accept flow (confirm modal → accepted overlay → timed removal after
 * 1.5s). Job data + handleAccept setTimeout behaviour preserved verbatim.
 */

const availableJobs = [
  { id: 'JOB001', serviceName: 'Plumbing', description: 'Bathroom pipe burst, urgent repair needed', address: 'Sector 22, Gurugram', date: '2026-09-01', time: '11:00 AM', estimatedPay: 450, customerName: 'Amit Singh', customerRating: 4.5, fairnessPosition: 1, urgency: 'high' },
  { id: 'JOB002', serviceName: 'Plumbing', description: 'Kitchen tap replacement', address: 'DLF Phase 3, Gurugram', date: '2026-09-01', time: '2:00 PM', estimatedPay: 350, customerName: 'Neha Gupta', customerRating: 4.8, fairnessPosition: 2, urgency: 'medium' },
  { id: 'JOB003', serviceName: 'Pipe Fitting', description: 'New washing machine inlet pipe installation', address: 'Sushant Lok, Gurugram', date: '2026-09-02', time: '10:00 AM', estimatedPay: 500, customerName: 'Raj Patel', customerRating: 4.2, fairnessPosition: 3, urgency: 'low' },
  { id: 'JOB004', serviceName: 'Plumbing', description: 'Water heater connection repair', address: 'Sector 56, Gurugram', date: '2026-09-02', time: '4:00 PM', estimatedPay: 400, customerName: 'Sita Devi', customerRating: 4.9, fairnessPosition: 4, urgency: 'medium' },
];

const urgencyVariant = { high: 'danger', medium: 'warning', low: 'default' };

export default function JobFeedScreen() {
  const [jobs, setJobs] = useState(availableJobs);
  const [selectedJob, setSelectedJob] = useState(null);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [accepted, setAccepted] = useState(null);

  const handleAccept = (job) => {
    setAccepted(job.id);
    setShowAcceptModal(false);
    setTimeout(() => setJobs((j) => j.filter((x) => x.id !== job.id)), 1500);
  };

  return (
    <ScreenContainer>
      <Text style={styles.h1}>Available Jobs</Text>
      <Text style={styles.sub}>{jobs.length} jobs available • Sorted by fairness queue</Text>

      <View style={styles.list}>
        {jobs.map((job) => (
          <View key={job.id} style={[styles.card, accepted === job.id && styles.cardAccepted]}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.serviceName}>{job.serviceName}</Text>
                <FairnessBadge position={job.fairnessPosition} />
              </View>
              <Badge variant={urgencyVariant[job.urgency]} size="sm">{job.urgency} priority</Badge>
            </View>

            <Text style={styles.desc}>{job.description}</Text>

            <View style={styles.meta}>
              <View style={styles.metaRow}><MapPin size={14} color={colors.gray400} /><Text style={styles.metaText}>{job.address}</Text></View>
              <View style={styles.metaRow}><Clock size={14} color={colors.gray400} /><Text style={styles.metaText}>{job.date} • {job.time}</Text></View>
              <View style={styles.metaRow}><User size={14} color={colors.gray400} /><Text style={styles.metaText}>{job.customerName} (⭐ {job.customerRating})</Text></View>
            </View>

            <View style={styles.footer}>
              <View style={styles.payWrap}>
                <IndianRupee size={16} color={colors.success600} />
                <Text style={styles.pay}>{job.estimatedPay}</Text>
              </View>
              <View style={styles.actions}>
                <Pressable style={styles.declineBtn}>
                  <XCircle size={15} color={colors.gray500} />
                  <Text style={styles.declineText}>Decline</Text>
                </Pressable>
                <Pressable style={styles.acceptBtn} onPress={() => { setSelectedJob(job); setShowAcceptModal(true); }}>
                  <CheckCircle size={15} color={colors.white} />
                  <Text style={styles.acceptText}>Accept</Text>
                </Pressable>
              </View>
            </View>

            {accepted === job.id && (
              <View style={styles.acceptedOverlay}>
                <CheckCircle size={32} color={colors.white} />
                <Text style={styles.acceptedText}>Job Accepted!</Text>
              </View>
            )}
          </View>
        ))}
      </View>

      <Modal isOpen={showAcceptModal} onClose={() => setShowAcceptModal(false)} title="Accept Job?">
        {selectedJob && (
          <View>
            <Text style={styles.modalTitle}>{selectedJob.serviceName}</Text>
            <Text style={styles.modalDesc}>{selectedJob.description}</Text>
            <View style={styles.modalDetails}>
              <ModalRow label="Customer" value={selectedJob.customerName} />
              <ModalRow label="Location" value={selectedJob.address} />
              <ModalRow label="Time" value={`${selectedJob.date} at ${selectedJob.time}`} />
              <ModalRow label="Estimated Pay" value={`₹${selectedJob.estimatedPay}`} />
            </View>
            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancel} onPress={() => setShowAcceptModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalConfirm} onPress={() => handleAccept(selectedJob)}>
                <Text style={styles.modalConfirmText}>Confirm Accept</Text>
              </Pressable>
            </View>
          </View>
        )}
      </Modal>
    </ScreenContainer>
  );
}

function ModalRow({ label, value }) {
  return (
    <View style={styles.modalRow}>
      <Text style={styles.modalRowLabel}>{label}</Text>
      <Text style={styles.modalRowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: fontSizes.fs2xl, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.gray900 },
  sub: { fontSize: fontSizes.fsSm, color: colors.gray500, fontFamily: fontFamilies.interRegular, marginTop: 2, marginBottom: spacing.space4 },
  list: { gap: spacing.space3 },
  card: { backgroundColor: colors.surfaceWhite, borderRadius: radii.radiusLg, padding: spacing.space4, ...shadows.shadowSm, overflow: 'hidden' },
  cardAccepted: { opacity: 0.6 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.space2, marginBottom: spacing.space2 },
  serviceName: { fontSize: fontSizes.fsBase, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.gray900, marginBottom: 4 },
  desc: { fontSize: fontSizes.fsSm, color: colors.gray600, fontFamily: fontFamilies.interRegular, marginBottom: spacing.space3 },
  meta: { gap: 4, marginBottom: spacing.space3 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: fontSizes.fsXs, color: colors.gray500, fontFamily: fontFamilies.interRegular, flexShrink: 1 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: spacing.space3, borderTopWidth: 1, borderTopColor: colors.gray100 },
  payWrap: { flexDirection: 'row', alignItems: 'center' },
  pay: { fontSize: fontSizes.fsLg, fontWeight: fontWeights.fwExtrabold, fontFamily: fontFamilies.interExtraBold, color: colors.success600 },
  actions: { flexDirection: 'row', gap: spacing.space2 },
  declineBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: spacing.space2, paddingHorizontal: spacing.space3, borderRadius: radii.radiusMd },
  declineText: { fontSize: fontSizes.fsSm, color: colors.gray500, fontFamily: fontFamilies.interMedium },
  acceptBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: spacing.space2, paddingHorizontal: spacing.space4, borderRadius: radii.radiusMd, backgroundColor: colors.success600 },
  acceptText: { fontSize: fontSizes.fsSm, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.white },
  acceptedOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.success600, alignItems: 'center', justifyContent: 'center', gap: spacing.space2 },
  acceptedText: { fontSize: fontSizes.fsLg, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.white },

  modalTitle: { fontSize: fontSizes.fsLg, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.gray900 },
  modalDesc: { fontSize: fontSizes.fsSm, color: colors.gray600, fontFamily: fontFamilies.interRegular, marginTop: 4 },
  modalDetails: { marginTop: spacing.space4, gap: spacing.space2, backgroundColor: colors.gray50, borderRadius: radii.radiusMd, padding: spacing.space3 },
  modalRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.space3 },
  modalRowLabel: { fontSize: fontSizes.fsSm, color: colors.gray500, fontFamily: fontFamilies.interRegular },
  modalRowValue: { fontSize: fontSizes.fsSm, fontWeight: fontWeights.fwSemibold, fontFamily: fontFamilies.interSemiBold, color: colors.gray900, flexShrink: 1, textAlign: 'right' },
  modalActions: { flexDirection: 'row', gap: spacing.space3, marginTop: spacing.space5 },
  modalCancel: { flex: 1, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radii.radiusMd, borderWidth: 1.5, borderColor: colors.gray200 },
  modalCancelText: { fontSize: fontSizes.fsBase, fontWeight: fontWeights.fwMedium, fontFamily: fontFamilies.interMedium, color: colors.gray700 },
  modalConfirm: { flex: 1, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radii.radiusMd, backgroundColor: colors.success600 },
  modalConfirmText: { fontSize: fontSizes.fsBase, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.white },
});
