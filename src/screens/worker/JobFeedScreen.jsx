import { useState, useEffect, useRef } from 'react';
import {
  Modal as RNModalNative,
  View,
  Text,
  Pressable,
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  MapPin,
  Clock,
  IndianRupee,
  User,
  CheckCircle,
  XCircle,
  Scale,
  ChevronDown,
  Star,
  Wrench,
  Droplet,
  Zap,
  SprayCan,
  Hammer,
  Wind,
  Settings,
  X,
  Wallet,
  Check,
  Lightbulb,
  Map as MapIcon,
} from 'lucide-react-native';
import { ScreenContainer, Confetti } from '@components/app';
import { colors, spacing, radii, shadows, fontSizes, fontWeights, fontFamilies } from '@theme';

/**
 * JobFeedScreen — ported from web pages/worker/JobFeed.jsx. Available jobs sorted by fairness
 * queue, urgency badges, accept flow (confirm modal → accepted overlay → timed removal after
 * 1.5s). Job data + handleAccept setTimeout behaviour preserved verbatim.
 *
 * VISUAL REDESIGN (frontend-only — no data, handlers, navigation, or business logic changed):
 *  - Premium page header ("Available Jobs" + dynamic "{n} jobs available near you" subtitle
 *    driven by jobs.length, NOT hardcoded).
 *  - A "Fair & Transparent" trust panel that is a PRESENTATION of the existing fairness-queue
 *    concept — it renders no data and touches no algorithm.
 *  - Pill-style controls. Only the fairness-queue pill reflects real existing behaviour (the
 *    list is fairness-ordered). Distance / Earnings sorting DO NOT EXIST in the app, so those
 *    pills are rendered DISABLED / decorative and wire to nothing — no backend/sort was added.
 *  - Restyled job cards: service icon in a pastel squircle, compact priority badge, fairness
 *    badge, location, date/time, customer (+ rating only when present), and a tinted earnings
 *    footer with Decline (unchanged no-op, as before) + Accept (opens the same confirm modal).
 *
 * The `availableJobs` data, useState seeding, handleAccept (setAccepted → close modal →
 * setTimeout 1500ms filter-out), the Accept→modal→Confirm→handleAccept flow, and the Decline
 * button's existing behaviour are all preserved EXACTLY.
 */

const availableJobs = [
  { id: 'JOB001', serviceName: 'Plumbing', description: 'Bathroom pipe burst, urgent repair needed', address: 'Sector 22, Gurugram', date: '2026-09-01', time: '11:00 AM', estimatedPay: 450, customerName: 'Amit Singh', customerRating: 4.5, fairnessPosition: 1, urgency: 'high' },
  { id: 'JOB002', serviceName: 'Plumbing', description: 'Kitchen tap replacement', address: 'DLF Phase 3, Gurugram', date: '2026-09-01', time: '2:00 PM', estimatedPay: 350, customerName: 'Neha Gupta', customerRating: 4.8, fairnessPosition: 2, urgency: 'medium' },
  { id: 'JOB003', serviceName: 'Pipe Fitting', description: 'New washing machine inlet pipe installation', address: 'Sushant Lok, Gurugram', date: '2026-09-02', time: '10:00 AM', estimatedPay: 500, customerName: 'Raj Patel', customerRating: 4.2, fairnessPosition: 3, urgency: 'low' },
  { id: 'JOB004', serviceName: 'Plumbing', description: 'Water heater connection repair', address: 'Sector 56, Gurugram', date: '2026-09-02', time: '4:00 PM', estimatedPay: 400, customerName: 'Sita Devi', customerRating: 4.9, fairnessPosition: 4, urgency: 'medium' },
];

// Priority presentation tokens (soft tinted pill + dot). Purely visual metadata, not buttons.
const PRIORITY = {
  high: { label: 'High priority', bg: colors.danger50, fg: colors.danger600, dot: colors.danger500 },
  medium: { label: 'Medium priority', bg: colors.warning50, fg: colors.warning700, dot: colors.warning500 },
  low: { label: 'Low priority', bg: colors.gray100, fg: colors.gray600, dot: colors.gray400 },
};

// Service → icon + pastel tint. Uses existing lucide-react-native icons only (no new deps).
// Falls back to a wrench + neutral tint for any unmapped service name.
const SERVICE_STYLE = {
  Plumbing: { Icon: Droplet, tint: '#eff6ff', fg: colors.info600 },
  'Pipe Fitting': { Icon: Wrench, tint: '#eef2ff', fg: colors.primary600 },
  Electrical: { Icon: Zap, tint: '#fffbeb', fg: colors.accent600 },
  Cleaning: { Icon: SprayCan, tint: '#ecfdf5', fg: colors.success600 },
  Carpentry: { Icon: Hammer, tint: '#fef2f2', fg: colors.danger600 },
  'AC Service': { Icon: Wind, tint: '#eff6ff', fg: colors.info600 },
};
function serviceStyle(name) {
  return SERVICE_STYLE[name] || { Icon: Settings, tint: colors.gray100, fg: colors.gray600 };
}

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

  const count = jobs.length;

  return (
    <ScreenContainer>
      {/* ---- Page header (dynamic count, not hardcoded) ---- */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.h1}>Available Jobs</Text>
          <Text style={styles.sub}>
            {count} {count === 1 ? 'job' : 'jobs'} available near you
          </Text>
        </View>
        {/* Fairness trust panel — presentation of the existing fairness-queue concept. */}
        <View style={styles.trustPanel}>
          <Scale size={16} color={colors.success700} strokeWidth={2.2} />
          <View style={styles.trustTextWrap}>
            <Text style={styles.trustTitle}>Fair &amp; Transparent</Text>
            <Text style={styles.trustSub}>Assigned in a fairness queue</Text>
          </View>
        </View>
      </View>

      {/* ---- Sort / filter pills ---- */}
      <View style={styles.pillRow}>
        {/* Reflects the real, existing behaviour: the list is fairness-ordered. */}
        <View style={[styles.pill, styles.pillActive]}>
          <Text style={[styles.pillText, styles.pillTextActive]}>Fairness queue</Text>
          <ChevronDown size={14} color={colors.success700} strokeWidth={2.4} />
        </View>
        {/* Distance / Earnings sorting do NOT exist in the app — shown disabled, wire to nothing. */}
        <View style={[styles.pill, styles.pillDisabled]}>
          <Text style={styles.pillTextDisabled}>Distance</Text>
          <ChevronDown size={14} color={colors.gray300} strokeWidth={2.4} />
        </View>
        <View style={[styles.pill, styles.pillDisabled]}>
          <Text style={styles.pillTextDisabled}>Earnings</Text>
          <ChevronDown size={14} color={colors.gray300} strokeWidth={2.4} />
        </View>
      </View>

      {/* ---- Job list ---- */}
      <View style={styles.list}>
        {jobs.map((job) => {
          const pr = PRIORITY[job.urgency] || PRIORITY.low;
          const { Icon: SvcIcon, tint, fg } = serviceStyle(job.serviceName);
          const hasRating = job.customerRating != null && job.customerRating !== '';

          return (
            <View key={job.id} style={[styles.card, accepted === job.id && styles.cardAccepted]}>
              {/* Header: service icon + name, priority badge */}
              <View style={styles.cardHeader}>
                <View style={[styles.svcIcon, { backgroundColor: tint }]}>
                  <SvcIcon size={22} color={fg} strokeWidth={2.1} />
                </View>
                <View style={styles.titleWrap}>
                  <Text style={styles.serviceName} numberOfLines={1}>{job.serviceName}</Text>
                  {/* Fairness queue badge — existing position value, unchanged. */}
                  <View style={styles.fairnessBadge}>
                    <Scale size={12} color={colors.success700} strokeWidth={2.2} />
                    <Text style={styles.fairnessText}>#{job.fairnessPosition} in fair queue</Text>
                  </View>
                </View>
                <View style={[styles.priorityBadge, { backgroundColor: pr.bg }]}>
                  <View style={[styles.priorityDot, { backgroundColor: pr.dot }]} />
                  <Text style={[styles.priorityText, { color: pr.fg }]}>{pr.label}</Text>
                </View>
              </View>

              <Text style={styles.desc}>{job.description}</Text>

              {/* Meta grid */}
              <View style={styles.metaGrid}>
                <View style={styles.metaItem}>
                  <MapPin size={15} color={colors.gray400} strokeWidth={2} />
                  <Text style={styles.metaText} numberOfLines={2}>{job.address}</Text>
                </View>
                <View style={styles.metaSplit}>
                  <View style={styles.metaItemHalf}>
                    <Clock size={15} color={colors.gray400} strokeWidth={2} />
                    <Text style={styles.metaText}>{job.date} · {job.time}</Text>
                  </View>
                  <View style={styles.metaItemHalf}>
                    <User size={15} color={colors.gray400} strokeWidth={2} />
                    <Text style={styles.metaText} numberOfLines={1}>{job.customerName}</Text>
                    {hasRating && (
                      <View style={styles.ratingChip}>
                        <Star size={11} color={colors.accent500} fill={colors.accent500} strokeWidth={0} />
                        <Text style={styles.ratingText}>{job.customerRating}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              {/* Earnings + actions footer (tinted) */}
              <View style={styles.footer}>
                <View style={styles.payWrap}>
                  <View style={styles.payAmount}>
                    <IndianRupee size={18} color={colors.success700} strokeWidth={2.4} />
                    <Text style={styles.pay}>{job.estimatedPay}</Text>
                  </View>
                  <Text style={styles.payLabel}>Estimated earning</Text>
                </View>
                <View style={styles.actions}>
                  {/* Decline — preserved exactly as before (no onPress existed). */}
                  <Pressable style={styles.declineBtn}>
                    <XCircle size={16} color={colors.gray500} strokeWidth={2.2} />
                    <Text style={styles.declineText}>Decline</Text>
                  </Pressable>
                  {/* Accept — opens the same confirm modal (unchanged handler). */}
                  <Pressable
                    style={styles.acceptBtn}
                    onPress={() => { setSelectedJob(job); setShowAcceptModal(true); }}
                  >
                    <CheckCircle size={16} color={colors.white} strokeWidth={2.4} />
                    <Text style={styles.acceptText}>Accept Job</Text>
                  </Pressable>
                </View>
              </View>

              {accepted === job.id && (
                <View style={styles.acceptedOverlay}>
                  <CheckCircle size={34} color={colors.white} strokeWidth={2.2} />
                  <Text style={styles.acceptedText}>Job Accepted!</Text>
                </View>
              )}
            </View>
          );
        })}
      </View>

      <AcceptJobSheet
        job={selectedJob}
        isOpen={showAcceptModal}
        onClose={() => setShowAcceptModal(false)}
        onConfirm={handleAccept}
      />
    </ScreenContainer>
  );
}

/**
 * AcceptJobSheet — premium "Accept Job?" confirmation (frontend-only).
 *
 * Self-contained animated bottom sheet (RNModal + Animated slide-up) so the shared Modal
 * primitive used elsewhere is untouched. It renders ONLY existing job data and, on confirm,
 * plays a success animation (checkmark pop → confetti) and then calls the EXACT existing
 * onConfirm(job) handler (JobFeedScreen.handleAccept) — the acceptance flow is unchanged.
 *
 * OMITTED because the data doesn't exist (per "omit rather than invent"): distance, platform-fee
 * breakdown, relative countdown, estimated duration, service-area flag, and a live route/map
 * (there's no valid map route for an unaccepted job — a static preview stands in instead).
 */
function AcceptJobSheet({ job, isOpen, onClose, onConfirm }) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  const translateY = useRef(new Animated.Value(height)).current;
  const scrimOpacity = useRef(new Animated.Value(0)).current;
  const checkScale = useRef(new Animated.Value(0)).current;

  const [success, setSuccess] = useState(false);
  const [confetti, setConfetti] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Reset transient success state each time the sheet opens for a (new) job.
      setSuccess(false);
      setConfetti(false);
      checkScale.setValue(0);
      Animated.parallel([
        Animated.timing(translateY, { toValue: 0, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(scrimOpacity, { toValue: 1, duration: 260, useNativeDriver: true }),
      ]).start();
    } else {
      translateY.setValue(height);
      scrimOpacity.setValue(0);
    }
  }, [isOpen, height, translateY, scrimOpacity, checkScale]);

  if (!job) return null;

  const { Icon: SvcIcon, tint, fg } = serviceStyle(job.serviceName);
  const pr = PRIORITY[job.urgency] || PRIORITY.low;
  const isUrgent = job.urgency === 'high';

  const handleConfirm = () => {
    // 1) Success checkmark pops in. 2) Short delay → confetti. 3) Hand off to the EXISTING
    // acceptance flow (unchanged), which closes the sheet + removes the job after its 1.5s timer.
    setSuccess(true);
    Animated.spring(checkScale, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }).start(() => {
      setTimeout(() => setConfetti(true), 200);
      setTimeout(() => onConfirm(job), 900);
    });
  };

  return (
    <RNSheet visible={isOpen} onRequestClose={onClose} scrimOpacity={scrimOpacity} onScrimPress={success ? undefined : onClose}>
      <Animated.View
        style={[styles.sheet, { maxHeight: height * 0.92, paddingBottom: insets.bottom + spacing.space4, transform: [{ translateY }] }]}
      >
        <View style={styles.handle} />

        {success ? (
          <View style={styles.successWrap}>
            <Confetti run={confetti} originY={30} />
            <Animated.View style={[styles.successIcon, { transform: [{ scale: checkScale }] }]}>
              <Check size={44} color={colors.white} strokeWidth={3.5} />
            </Animated.View>
            <Text style={styles.successTitle}>Job Accepted!</Text>
            <Text style={styles.successSub}>You're all set. We'll add it to your schedule.</Text>
          </View>
        ) : (
          <>
            {/* Header */}
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle}>Accept Job?</Text>
                <Text style={styles.sheetSub}>Review the details and confirm to accept this job</Text>
              </View>
              <Pressable style={styles.sheetClose} onPress={onClose} accessibilityLabel="Close" hitSlop={8}>
                <X size={20} color={colors.gray600} strokeWidth={2.2} />
              </Pressable>
            </View>

            <ScrollView style={styles.sheetScroll} contentContainerStyle={styles.sheetScrollContent} showsVerticalScrollIndicator={false}>
              {/* Job header */}
              <View style={styles.jobHeader}>
                <View style={[styles.jobIcon, { backgroundColor: tint }]}>
                  <SvcIcon size={24} color={fg} strokeWidth={2.1} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.jobTitleRow}>
                    <Text style={styles.jobName} numberOfLines={1}>{job.serviceName}</Text>
                    {isUrgent && (
                      <View style={[styles.urgentBadge, { backgroundColor: pr.bg }]}>
                        <View style={[styles.urgentDot, { backgroundColor: pr.dot }]} />
                        <Text style={[styles.urgentText, { color: pr.fg }]}>Urgent</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.jobDesc}>{job.description}</Text>
                </View>
              </View>

              {/* Customer card */}
              <View style={styles.customerCard}>
                <View style={styles.custAvatar}>
                  <Text style={styles.custAvatarText}>{(job.customerName?.[0] || '?').toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.custName} numberOfLines={1}>{job.customerName}</Text>
                  <Text style={styles.custLabel}>Customer</Text>
                </View>
                {job.customerRating != null && (
                  <View style={styles.custRating}>
                    <Star size={12} color={colors.accent500} fill={colors.accent500} strokeWidth={0} />
                    <Text style={styles.custRatingText}>{job.customerRating}</Text>
                  </View>
                )}
              </View>

              {/* Earnings (prominent) */}
              <View style={styles.earnCard}>
                <View style={styles.earnIcon}>
                  <Wallet size={22} color={colors.success700} strokeWidth={2.1} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.earnAmountRow}>
                    <IndianRupee size={22} color={colors.success800} strokeWidth={2.6} />
                    <Text style={styles.earnAmount}>{job.estimatedPay}</Text>
                  </View>
                  <Text style={styles.earnLabel}>Estimated earnings</Text>
                </View>
              </View>

              {/* Location + Time */}
              <View style={styles.infoRow}>
                <View style={styles.infoCard}>
                  <View style={styles.infoHead}>
                    <MapPin size={15} color={colors.info600} strokeWidth={2.2} />
                    <Text style={styles.infoHeadText}>Location</Text>
                  </View>
                  <Text style={styles.infoValue} numberOfLines={3}>{job.address}</Text>
                </View>
                <View style={styles.infoCard}>
                  <View style={styles.infoHead}>
                    <Clock size={15} color={colors.primary600} strokeWidth={2.2} />
                    <Text style={styles.infoHeadText}>Scheduled time</Text>
                  </View>
                  <Text style={styles.infoValue}>{job.date}</Text>
                  <Text style={styles.infoValueSub}>{job.time}</Text>
                </View>
              </View>

              {/* Static map-style preview (frontend-only; no live route for an unaccepted job) */}
              <View style={styles.mapPreview}>
                <View style={styles.mapGridLine} />
                <View style={[styles.mapGridLine, styles.mapGridLine2]} />
                <View style={styles.mapPin}>
                  <MapPin size={20} color={colors.danger500} fill={colors.danger500} strokeWidth={0} />
                </View>
                <View style={styles.mapChip}>
                  <MapIcon size={13} color={colors.gray600} strokeWidth={2.2} />
                  <Text style={styles.mapChipText} numberOfLines={1}>{job.address}</Text>
                </View>
              </View>

              {/* Fairness Queue */}
              <View style={styles.fairnessCard}>
                <View style={styles.fairnessHead}>
                  <Scale size={17} color={colors.success700} strokeWidth={2.2} />
                  <Text style={styles.fairnessTitle}>Fairness Queue</Text>
                  <View style={styles.fairnessPos}>
                    <Text style={styles.fairnessPosText}>#{job.fairnessPosition} in queue</Text>
                  </View>
                </View>
                <Text style={styles.fairnessDesc}>
                  You're currently #{job.fairnessPosition} in the fairness queue. Jobs are offered in queue order.
                </Text>
              </View>

              {/* Why you received this job (only derivable reasons) */}
              <View style={styles.whyCard}>
                <View style={styles.whyHead}>
                  <Lightbulb size={16} color={colors.accent600} strokeWidth={2.2} />
                  <Text style={styles.whyTitle}>Why you received this job?</Text>
                </View>
                <WhyItem text={`You're #${job.fairnessPosition} in the fairness queue`} />
                <WhyItem text={`Matches your ${job.serviceName} skill`} last />
              </View>
            </ScrollView>

            {/* Actions */}
            <View style={styles.sheetActions}>
              <Pressable style={styles.notNowBtn} onPress={onClose} accessibilityLabel="Not now">
                <Text style={styles.notNowText}>Not Now</Text>
              </Pressable>
              <PressableScale style={styles.acceptForBtn} onPress={handleConfirm} accessibilityLabel={`Accept for ₹${job.estimatedPay}`}>
                <Check size={18} color={colors.white} strokeWidth={2.6} />
                <Text style={styles.acceptForText}>Accept for ₹{job.estimatedPay}</Text>
              </PressableScale>
            </View>
          </>
        )}
      </Animated.View>
    </RNSheet>
  );
}

/** Thin RN Modal wrapper providing the dark scrim + close-on-backdrop for the bottom sheet. */
function RNSheet({ visible, onRequestClose, children, scrimOpacity, onScrimPress }) {
  return (
    <RNModalNative visible={visible} transparent animationType="none" onRequestClose={onRequestClose} statusBarTranslucent>
      <Animated.View style={[styles.scrim, { opacity: scrimOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onScrimPress} accessibilityLabel="Dismiss" />
      </Animated.View>
      <View style={styles.sheetWrap} pointerEvents="box-none">
        {children}
      </View>
    </RNModalNative>
  );
}

function WhyItem({ text, last }) {
  return (
    <View style={[styles.whyItem, !last && styles.whyItemBorder]}>
      <View style={styles.whyCheck}>
        <Check size={12} color={colors.success700} strokeWidth={3} />
      </View>
      <Text style={styles.whyText}>{text}</Text>
    </View>
  );
}

/** PressableScale — small press-in scale for premium touch feedback (frontend-only). */
function PressableScale({ children, style, onPress, accessibilityLabel }) {
  const scale = useRef(new Animated.Value(1)).current;
  const to = (v) => Animated.spring(scale, { toValue: v, friction: 6, tension: 180, useNativeDriver: true }).start();
  return (
    <Pressable onPress={onPress} onPressIn={() => to(0.97)} onPressOut={() => to(1)} accessibilityRole="button" accessibilityLabel={accessibilityLabel} style={styles.acceptForWrap}>
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // ---- Header ----
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.space3, marginBottom: spacing.space4 },
  h1: { fontSize: fontSizes.fs3xl, fontWeight: fontWeights.fwExtrabold, fontFamily: fontFamilies.interExtraBold, color: colors.gray900, letterSpacing: -0.5 },
  sub: { fontSize: fontSizes.fsSm, color: colors.gray500, fontFamily: fontFamilies.interMedium, marginTop: 3 },

  // ---- Fairness trust panel ----
  trustPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space2,
    maxWidth: 168,
    paddingVertical: spacing.space2,
    paddingHorizontal: spacing.space3,
    backgroundColor: colors.success50,
    borderRadius: radii.radiusLg,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  trustTextWrap: { flexShrink: 1 },
  trustTitle: { fontSize: 11.5, fontFamily: fontFamilies.interBold, fontWeight: fontWeights.fwBold, color: colors.success800 },
  trustSub: { fontSize: 10, fontFamily: fontFamilies.interRegular, color: colors.success700, marginTop: 1 },

  // ---- Sort / filter pills ----
  pillRow: { flexDirection: 'row', gap: spacing.space2, marginBottom: spacing.space4, flexWrap: 'wrap' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: spacing.space2,
    paddingHorizontal: spacing.space3,
    borderRadius: radii.radiusFull,
    borderWidth: 1,
    backgroundColor: colors.surfaceWhite,
    borderColor: colors.gray200,
  },
  pillActive: { backgroundColor: colors.success50, borderColor: '#6ee7b7' },
  pillDisabled: { backgroundColor: colors.gray50, borderColor: colors.gray100 },
  pillText: { fontSize: fontSizes.fsXs, fontFamily: fontFamilies.interSemiBold, fontWeight: fontWeights.fwSemibold, color: colors.gray600 },
  pillTextActive: { color: colors.success700 },
  pillTextDisabled: { fontSize: fontSizes.fsXs, fontFamily: fontFamilies.interMedium, color: colors.gray400 },

  // ---- List / card ----
  list: { gap: spacing.space4 },
  card: {
    backgroundColor: colors.surfaceWhite,
    borderRadius: radii.radiusXl,
    padding: spacing.space5,
    borderWidth: 1,
    borderColor: colors.gray100,
    ...shadows.shadowMd,
    overflow: 'hidden',
  },
  cardAccepted: { opacity: 0.6 },

  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.space3, marginBottom: spacing.space3 },
  svcIcon: { width: 46, height: 46, borderRadius: radii.radiusLg, alignItems: 'center', justifyContent: 'center' },
  titleWrap: { flex: 1, gap: 6 },
  serviceName: { fontSize: fontSizes.fsLg, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.gray900 },

  fairnessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: radii.radiusFull,
  },
  fairnessText: { fontSize: fontSizes.fsXs, fontFamily: fontFamilies.interSemiBold, fontWeight: fontWeights.fwSemibold, color: colors.success800 },

  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: radii.radiusFull,
  },
  priorityDot: { width: 6, height: 6, borderRadius: radii.radiusFull },
  priorityText: { fontSize: fontSizes.fsXs, fontFamily: fontFamilies.interSemiBold, fontWeight: fontWeights.fwSemibold },

  desc: { fontSize: fontSizes.fsBase, color: colors.gray700, fontFamily: fontFamilies.interRegular, lineHeight: 21, marginBottom: spacing.space4 },

  // ---- Meta ----
  metaGrid: { gap: spacing.space3, marginBottom: spacing.space4 },
  metaItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  metaSplit: { flexDirection: 'row', gap: spacing.space3, flexWrap: 'wrap' },
  metaItemHalf: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1, minWidth: '45%' },
  metaText: { fontSize: fontSizes.fsSm, color: colors.gray600, fontFamily: fontFamilies.interMedium, flexShrink: 1 },
  ratingChip: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingVertical: 2, paddingHorizontal: 6, backgroundColor: colors.accent50, borderRadius: radii.radiusFull },
  ratingText: { fontSize: fontSizes.fsXs, fontFamily: fontFamilies.interBold, fontWeight: fontWeights.fwBold, color: colors.accent700 },

  // ---- Footer (earnings + actions) ----
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.space3,
    flexWrap: 'wrap',
    marginHorizontal: -spacing.space5,
    marginBottom: -spacing.space5,
    marginTop: spacing.space1,
    paddingHorizontal: spacing.space5,
    paddingVertical: spacing.space4,
    backgroundColor: colors.success50,
    borderTopWidth: 1,
    borderTopColor: '#d1fae5',
  },
  payWrap: { flexShrink: 0 },
  payAmount: { flexDirection: 'row', alignItems: 'center', gap: 1 },
  pay: { fontSize: fontSizes.fs2xl, fontWeight: fontWeights.fwExtrabold, fontFamily: fontFamilies.interExtraBold, color: colors.success800 },
  payLabel: { fontSize: fontSizes.fsXs, color: colors.success700, fontFamily: fontFamilies.interMedium, marginTop: 1 },

  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.space2 },
  declineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 10,
    paddingHorizontal: spacing.space3,
    borderRadius: radii.radiusMd,
    borderWidth: 1,
    borderColor: colors.gray200,
    backgroundColor: colors.surfaceWhite,
  },
  declineText: { fontSize: fontSizes.fsSm, color: colors.gray600, fontFamily: fontFamilies.interSemiBold, fontWeight: fontWeights.fwSemibold },
  acceptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 10,
    paddingHorizontal: spacing.space4,
    borderRadius: radii.radiusMd,
    backgroundColor: colors.success600,
    ...shadows.shadowSm,
  },
  acceptText: { fontSize: fontSizes.fsSm, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.white },

  acceptedOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.success600, alignItems: 'center', justifyContent: 'center', gap: spacing.space2 },
  acceptedText: { fontSize: fontSizes.fsXl, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.white },

  // ---- Accept Job bottom sheet ----
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(17, 24, 39, 0.6)' },
  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surfaceWhite,
    borderTopLeftRadius: radii.radius2xl,
    borderTopRightRadius: radii.radius2xl,
    paddingTop: spacing.space3,
    paddingHorizontal: spacing.space5,
    ...shadows.shadowXl,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: radii.radiusFull, backgroundColor: colors.gray200, marginBottom: spacing.space3 },

  sheetHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.space3, marginBottom: spacing.space3 },
  sheetTitle: { fontSize: fontSizes.fs2xl, fontWeight: fontWeights.fwExtrabold, fontFamily: fontFamilies.interExtraBold, color: colors.gray900, letterSpacing: -0.5 },
  sheetSub: { fontSize: fontSizes.fsSm, color: colors.gray500, fontFamily: fontFamilies.interRegular, marginTop: 2 },
  sheetClose: { width: 36, height: 36, borderRadius: radii.radiusFull, backgroundColor: colors.gray100, alignItems: 'center', justifyContent: 'center' },

  sheetScroll: { flexGrow: 0 },
  sheetScrollContent: { gap: spacing.space3, paddingBottom: spacing.space2 },

  // Job header
  jobHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.space3, paddingVertical: spacing.space2 },
  jobIcon: { width: 48, height: 48, borderRadius: radii.radiusLg, alignItems: 'center', justifyContent: 'center' },
  jobTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.space2 },
  jobName: { flexShrink: 1, fontSize: fontSizes.fsXl, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.gray900 },
  urgentBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 3, paddingHorizontal: 8, borderRadius: radii.radiusFull },
  urgentDot: { width: 6, height: 6, borderRadius: radii.radiusFull },
  urgentText: { fontSize: fontSizes.fsXs, fontFamily: fontFamilies.interBold, fontWeight: fontWeights.fwBold },
  jobDesc: { fontSize: fontSizes.fsSm, color: colors.gray600, fontFamily: fontFamilies.interRegular, lineHeight: 19, marginTop: 3 },

  // Customer card
  customerCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.space3, padding: spacing.space3,
    backgroundColor: colors.gray50, borderRadius: radii.radiusLg, borderWidth: 1, borderColor: colors.gray100,
  },
  custAvatar: { width: 44, height: 44, borderRadius: radii.radiusFull, backgroundColor: colors.primary600, alignItems: 'center', justifyContent: 'center' },
  custAvatarText: { fontSize: fontSizes.fsBase, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.white },
  custName: { fontSize: fontSizes.fsBase, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.gray900 },
  custLabel: { fontSize: fontSizes.fsXs, color: colors.gray500, fontFamily: fontFamilies.interMedium, marginTop: 1 },
  custRating: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingVertical: 3, paddingHorizontal: 8, backgroundColor: colors.accent50, borderRadius: radii.radiusFull },
  custRatingText: { fontSize: fontSizes.fsXs, fontFamily: fontFamilies.interBold, fontWeight: fontWeights.fwBold, color: colors.accent700 },

  // Earnings card
  earnCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.space3, padding: spacing.space4,
    backgroundColor: colors.success50, borderRadius: radii.radiusXl, borderWidth: 1, borderColor: '#a7f3d0',
  },
  earnIcon: { width: 44, height: 44, borderRadius: radii.radiusLg, backgroundColor: colors.success100, alignItems: 'center', justifyContent: 'center' },
  earnAmountRow: { flexDirection: 'row', alignItems: 'center', gap: 1 },
  earnAmount: { fontSize: fontSizes.fs3xl, fontWeight: fontWeights.fwExtrabold, fontFamily: fontFamilies.interExtraBold, color: colors.success800 },
  earnLabel: { fontSize: fontSizes.fsSm, color: colors.success700, fontFamily: fontFamilies.interMedium, marginTop: 1 },

  // Location + time
  infoRow: { flexDirection: 'row', gap: spacing.space3 },
  infoCard: { flex: 1, padding: spacing.space3, backgroundColor: colors.surfaceWhite, borderRadius: radii.radiusLg, borderWidth: 1, borderColor: colors.gray100 },
  infoHead: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 5 },
  infoHeadText: { fontSize: fontSizes.fsXs, color: colors.gray500, fontFamily: fontFamilies.interSemiBold, fontWeight: fontWeights.fwSemibold },
  infoValue: { fontSize: fontSizes.fsSm, color: colors.gray900, fontFamily: fontFamilies.interSemiBold, fontWeight: fontWeights.fwSemibold },
  infoValueSub: { fontSize: fontSizes.fsSm, color: colors.gray600, fontFamily: fontFamilies.interMedium, marginTop: 1 },

  // Map preview (static, frontend-only)
  mapPreview: {
    height: 96, borderRadius: radii.radiusLg, backgroundColor: colors.info50, borderWidth: 1, borderColor: '#dbeafe',
    overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
  },
  mapGridLine: { position: 'absolute', width: '140%', height: 1, backgroundColor: '#bfdbfe', transform: [{ rotate: '-18deg' }], top: '38%' },
  mapGridLine2: { top: '66%', transform: [{ rotate: '-18deg' }] },
  mapPin: { marginBottom: 6 },
  mapChip: {
    position: 'absolute', bottom: 8, flexDirection: 'row', alignItems: 'center', gap: 5, maxWidth: '86%',
    paddingVertical: 5, paddingHorizontal: spacing.space3, backgroundColor: colors.surfaceWhite, borderRadius: radii.radiusFull, ...shadows.shadowSm,
  },
  mapChipText: { fontSize: fontSizes.fsXs, color: colors.gray700, fontFamily: fontFamilies.interMedium, flexShrink: 1 },

  // Fairness card
  fairnessCard: { padding: spacing.space4, backgroundColor: colors.success50, borderRadius: radii.radiusXl, borderWidth: 1, borderColor: '#a7f3d0' },
  fairnessHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.space2 },
  fairnessTitle: { flex: 1, fontSize: fontSizes.fsBase, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.success800 },
  fairnessPos: { paddingVertical: 3, paddingHorizontal: 10, backgroundColor: colors.success600, borderRadius: radii.radiusFull },
  fairnessPosText: { fontSize: fontSizes.fsXs, fontFamily: fontFamilies.interBold, fontWeight: fontWeights.fwBold, color: colors.white },
  fairnessDesc: { fontSize: fontSizes.fsXs, color: colors.success700, fontFamily: fontFamilies.interRegular, lineHeight: 17, marginTop: spacing.space2 },

  // Why card
  whyCard: { padding: spacing.space4, backgroundColor: colors.accent50, borderRadius: radii.radiusXl, borderWidth: 1, borderColor: colors.accent100 },
  whyHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.space2, marginBottom: spacing.space1 },
  whyTitle: { fontSize: fontSizes.fsBase, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.gray900 },
  whyItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.space2, paddingVertical: 9 },
  whyItemBorder: { borderBottomWidth: 1, borderBottomColor: colors.accent100 },
  whyCheck: { width: 20, height: 20, borderRadius: radii.radiusFull, backgroundColor: colors.success100, alignItems: 'center', justifyContent: 'center' },
  whyText: { flex: 1, fontSize: fontSizes.fsSm, color: colors.gray700, fontFamily: fontFamilies.interMedium },

  // Actions
  sheetActions: { flexDirection: 'row', gap: spacing.space3, marginTop: spacing.space4 },
  notNowBtn: { flex: 1, height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: radii.radiusLg, borderWidth: 1.5, borderColor: colors.gray200, backgroundColor: colors.surfaceWhite },
  notNowText: { fontSize: fontSizes.fsBase, fontWeight: fontWeights.fwSemibold, fontFamily: fontFamilies.interSemiBold, color: colors.gray700 },
  acceptForWrap: { flex: 2 },
  acceptForBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 52,
    borderRadius: radii.radiusLg, backgroundColor: colors.success600, ...shadows.shadowMd, shadowColor: colors.success600,
  },
  acceptForText: { fontSize: fontSizes.fsBase, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.white },

  // Success state
  successWrap: { alignItems: 'center', paddingVertical: spacing.space10, paddingHorizontal: spacing.space4 },
  successIcon: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.success500, alignItems: 'center', justifyContent: 'center', ...shadows.shadowGlow, shadowColor: colors.success500 },
  successTitle: { fontSize: fontSizes.fs2xl, fontWeight: fontWeights.fwExtrabold, fontFamily: fontFamilies.interExtraBold, color: colors.gray900, marginTop: spacing.space4 },
  successSub: { fontSize: fontSizes.fsSm, color: colors.gray500, fontFamily: fontFamilies.interRegular, textAlign: 'center', marginTop: spacing.space2 },
});
