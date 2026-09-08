import { useState } from 'react';
import { View, Text, Pressable, Image, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Power, Star, Briefcase, IndianRupee, Clock, BookOpen,
  AlertTriangle, Award, Umbrella, MapPin, UserRound, CalendarClock, Bell, LogOut, Bike, Check,
} from 'lucide-react-native';
import { useAuth } from '@context/AuthContext';
import { getBookingsByWorker } from '@data/mockBookings';
import { ScreenContainer, SectionHeader, GradientBand } from '@components/app';
import Badge from '@components/ui/Badge';
import ProgressRing from '@components/ui/ProgressRing';
import HelplineModal from '@components/HelplineModal';
import { buildWorkerData } from './workerData';
import { colors, spacing, radii, shadows, fontSizes, fontWeights, fontFamilies } from '@theme';

const BRAND_LOGO = require('@assets/logo.png');

/**
 * WorkerDashboardScreen — worker home.
 *
 * ALL business logic preserved unchanged (buildWorkerData resolution, getBookingsByWorker, the
 * overtime thresholds, CIBIL/insurance/leave/loyalty rules, availability toggle, navigation).
 *
 * UI REDESIGN (frontend-only): gradient header (react-native-svg via GradientBand) showing the
 * EXISTING brand logo asset (@assets/logo.png — same as the app icon) + greeting + bell + logout;
 * premium ONLINE card; earnings-forward Performance panel; Civic Quality Score and Weekly Hours
 * rendered as real svg progress RINGS derived from the existing value/max; refined Insurance and
 * Leave surfaces; a compact zone/mobility status bar; recent jobs list.
 *
 * NOTE (no invented data): the app's worker data has NO earnings-trend or monthly-history field,
 * so NO "↑x% from last month" indicator or bar chart is shown — that would fabricate data the
 * backend doesn't provide. Every value here is read from `worker`/`bookings` exactly as before.
 */
export default function WorkerDashboardScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user, profile, workerProfile, logout } = useAuth();
  const worker = buildWorkerData(user, profile, workerProfile);

  const bookings = worker.mockWorkerId ? getBookingsByWorker(worker.mockWorkerId) : [];
  const activeBooking = bookings.find((b) => ['en-route', 'in-progress', 'assigned'].includes(b.status));

  const [isAvailable, setIsAvailable] = useState(worker.available);
  const [showHelpline, setShowHelpline] = useState(false);

  const isNearOvertime = (worker.weekly_hours_worked || 0) >= 36;
  const isAtOvertime = (worker.weekly_hours_worked || 0) >= 40;
  const ratingDisplay = worker.rating != null ? worker.rating.toFixed(1) : '—';

  const hoursColor = isAtOvertime ? colors.danger500 : isNearOvertime ? colors.warning500 : colors.success500;
  const cibilColor = (worker.cibil_score ?? 0) > 750 ? colors.success500 : colors.warning500;

  const formatValue = (val) => {
    if (typeof val === 'string') return val;
    if (typeof val !== 'number') return '—';
    if (val >= 10000) return `${(val / 1000).toFixed(1)}k`;
    return val.toLocaleString();
  };
  const queueDisplay = worker.fairnessPosition != null ? `#${worker.fairnessPosition}` : '—';
  const firstName = worker.name.split(' ')[0];

  // Visual job-lifecycle stepper — maps the EXISTING booking status onto the standard worker
  // path (invents no state). Statuses off this linear path (e.g. cancelled) return -1 and the
  // stepper is simply not shown for that job.
  const JOB_LIFECYCLE = ['Accepted', 'En Route', 'At Location', 'Completed'];
  const JOB_STATUS_STEP = { assigned: 0, booked: 0, 'en-route': 1, 'in-progress': 2, completed: 3 };
  const activeStep = activeBooking ? (JOB_STATUS_STEP[activeBooking.status] ?? -1) : -1;

  return (
    <ScreenContainer scroll style={styles.canvas} contentStyle={styles.content} edges={false}>
      {/* Gradient header with EXISTING brand logo */}
      <GradientBand
        colors={['#b45309', '#d97706', '#f59e0b']}
        angle="diagonal"
        decor
        style={[styles.headerBand, { paddingTop: insets.top + spacing.space4 }]}
      >
        <View style={styles.headerTopRow}>
          <View style={styles.brandRow}>
            <View style={styles.logoWrap}>
              <Image source={BRAND_LOGO} style={styles.logo} resizeMode="contain" accessibilityLabel="Sahakar Seva logo" />
            </View>
            <View style={styles.brandText}>
              <Text style={styles.brandName}>Sahakar Seva</Text>
              <Text style={styles.brandRole}>Worker</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <Pressable style={styles.headerIconBtn} onPress={() => setShowHelpline(true)} accessibilityLabel="Notifications" hitSlop={6}>
              <Bell size={19} color={colors.white} />
              <View style={styles.bellDot} />
            </Pressable>
            <Pressable style={styles.headerIconBtn} onPress={logout} accessibilityLabel="Log out" hitSlop={6}>
              <LogOut size={19} color={colors.white} />
            </Pressable>
          </View>
        </View>
        <Text style={styles.greetName} numberOfLines={1}>Namaste, {firstName} 👋</Text>
        <Text style={styles.greetSub}>Ready to make a difference today?</Text>
      </GradientBand>

      <View style={styles.body}>
        {/* Setup prompt for real workers w/ incomplete profile */}
        {!worker.isDemo && !workerProfile && (
          <View style={styles.setupCard}>
            <AlertTriangle size={20} color={colors.warning500} />
            <View style={{ flex: 1 }}>
              <Text style={styles.setupTitle}>Complete your worker profile</Text>
              <Text style={styles.setupText}>
                Your profile is pending setup by a cooperative admin. Stats will appear once your account is activated.
              </Text>
            </View>
          </View>
        )}

        {/* Availability */}
        <View style={[styles.availCard, isAvailable ? styles.availOn : styles.availOff]}>
          <View style={[styles.availIcon, isAvailable ? styles.availIconOn : styles.availIconOff]}>
            <Power size={20} color={isAvailable ? colors.success600 : colors.gray400} strokeWidth={2.2} />
          </View>
          <View style={styles.availInfo}>
            <View style={styles.availTitleRow}>
              <View style={[styles.statusDot, { backgroundColor: isAvailable ? colors.success500 : colors.gray400 }]} />
              <Text style={styles.availTitle}>{isAvailable ? 'ONLINE' : 'OFFLINE'}</Text>
            </View>
            <Text style={styles.availSub}>{isAvailable ? "You're accepting new jobs" : 'Not accepting jobs right now'}</Text>
          </View>
          <Pressable
            style={[styles.toggle, isAvailable ? styles.toggleOn : styles.toggleOff]}
            onPress={() => setIsAvailable(!isAvailable)}
            accessibilityLabel="Toggle availability"
          >
            <View style={[styles.knob, isAvailable ? styles.knobOn : styles.knobOff]} />
          </Pressable>
        </View>

        {/* Your Performance — earnings forward */}
        <View style={styles.section}>
          <SectionHeader title="Your Performance" />
          <View style={styles.perfCard}>
            <View style={styles.earnRow}>
              <View style={styles.earnIcon}>
                <IndianRupee size={20} color={colors.success700} strokeWidth={2.4} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.earnLabel}>Total Earnings</Text>
                <Text style={styles.earnValue} numberOfLines={1} adjustsFontSizeToFit>₹{formatValue(worker.earnings)}</Text>
              </View>
            </View>

            <View style={styles.perfDivider} />

            <View style={styles.perfMetrics}>
              <View style={styles.perfMetric}>
                <View style={styles.perfMetricHead}>
                  <Briefcase size={14} color={colors.primary600} strokeWidth={2.2} />
                  <Text style={styles.perfMetricLabel}>Jobs</Text>
                </View>
                <Text style={styles.perfMetricValue} numberOfLines={1} adjustsFontSizeToFit>{formatValue(worker.totalJobs)}</Text>
              </View>
              <View style={styles.perfMetricDivider} />
              <View style={styles.perfMetric}>
                <View style={styles.perfMetricHead}>
                  <Star size={14} color={colors.warning600} strokeWidth={2.2} />
                  <Text style={styles.perfMetricLabel}>Rating</Text>
                </View>
                <View style={styles.perfMetricValueRow}>
                  <Text style={styles.perfMetricValue} numberOfLines={1}>{ratingDisplay}</Text>
                  {worker.rating != null ? <Star size={14} color={colors.accent400} fill={colors.accent400} /> : null}
                </View>
              </View>
              <View style={styles.perfMetricDivider} />
              <View style={styles.perfMetric}>
                <View style={styles.perfMetricHead}>
                  <Clock size={14} color={colors.info600} strokeWidth={2.2} />
                  <Text style={styles.perfMetricLabel}>Queue</Text>
                </View>
                <Text style={styles.perfMetricValue} numberOfLines={1} adjustsFontSizeToFit>{queueDisplay}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Worker Benefits */}
        <View style={styles.section}>
          <SectionHeader title="Worker Benefits" />

          {/* Two ring cards side by side */}
          <View style={styles.ringRow}>
            {/* Civic Quality Score */}
            <View style={styles.ringCard}>
              <Text style={styles.ringTitle}>Civic Quality Score</Text>
              {worker.cibil_score != null ? (
                <>
                  <ProgressRing value={worker.cibil_score} max={900} size={110} stroke={11} color={cibilColor} trackColor={colors.gray200}>
                    <Text style={styles.ringValue}>{worker.cibil_score}</Text>
                    <Text style={styles.ringMax}>/ 900</Text>
                  </ProgressRing>
                  <Text style={[styles.ringCaption, { color: worker.cibil_score > 750 ? colors.success700 : colors.warning700 }]}>
                    {worker.cibil_score > 750 ? 'Excellent' : 'Improving'}
                  </Text>
                  <Text style={styles.ringSub}>
                    {worker.cibil_score > 750 ? 'Priority jobs eligible' : 'Keep improving'}
                  </Text>
                </>
              ) : (
                <View style={styles.ringEmpty}><Text style={styles.ringSub}>Not yet assessed</Text></View>
              )}
            </View>

            {/* Weekly Hours */}
            <View style={styles.ringCard}>
              <Text style={styles.ringTitle}>Weekly Hours</Text>
              <ProgressRing value={worker.weekly_hours_worked || 0} max={40} size={110} stroke={11} color={hoursColor} trackColor={colors.gray200}>
                <Text style={styles.ringValue}>{worker.weekly_hours_worked}h</Text>
                <Text style={styles.ringMax}>/ 40h</Text>
              </ProgressRing>
              <Text
                style={[
                  styles.ringCaption,
                  { color: isAtOvertime ? colors.danger600 : isNearOvertime ? colors.warning700 : colors.success700 },
                ]}
                numberOfLines={2}
              >
                {isAtOvertime ? 'Cap reached' : isNearOvertime ? 'Approaching 40h limit' : 'Healthy work week'}
              </Text>
              <Text style={styles.ringSub} numberOfLines={2}>
                {isAtOvertime ? 'OT only if no other worker (1.5x)' : isNearOvertime ? 'Overtime rules apply soon' : 'Great balance'}
              </Text>
            </View>
          </View>

          {/* Insurance */}
          <View style={[styles.benefitCard, worker.insurance_eligible && styles.benefitCardActive]}>
            <View style={[styles.benefitIcon, { backgroundColor: (worker.insurance_eligible ? colors.success500 : colors.warning500) + '1A' }]}>
              <Umbrella size={20} color={worker.insurance_eligible ? colors.success600 : colors.warning600} strokeWidth={2.2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.benefitLabel}>Worker Insurance</Text>
              <Text style={[styles.benefitValue, { color: worker.insurance_eligible ? colors.success700 : colors.warning700 }]}>
                {worker.insurance_eligible ? 'Active ✓' : 'Not yet eligible'}
              </Text>
              <Text style={styles.benefitSub}>
                {worker.insurance_eligible ? 'Health + Accident coverage via Cooperative' : 'Eligible after 3 months of service'}
              </Text>
            </View>
          </View>

          {/* Leave */}
          <View style={styles.benefitCard}>
            <View style={[styles.benefitIcon, { backgroundColor: colors.primary50 }]}>
              <Award size={20} color={colors.primary600} strokeWidth={2.2} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.leaveHead}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.benefitLabel}>Leave Balance</Text>
                  <Text style={styles.benefitValue}>
                    {worker.leave_balance} <Text style={styles.benefitValueSmall}>days left</Text>
                  </Text>
                </View>
                <Pressable onPress={() => navigation.navigate('WorkerLeave')} hitSlop={8}>
                  <Text style={styles.leaveApply}>Apply →</Text>
                </Pressable>
              </View>
              <Text style={styles.benefitSub}>30 annual + emergency leaves</Text>
              {worker.loyalty_bonus_eligible && (
                <View style={styles.loyaltyStrip}>
                  <Text style={styles.loyaltyText}>🎁 1-Year Loyalty Bonus: ₹2,500 eligible!</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Service zone / mobility status bar */}
        <View style={styles.zoneBar}>
          <View style={styles.zoneItem}>
            <MapPin size={15} color={colors.primary600} strokeWidth={2.2} />
            <View style={{ flex: 1 }}>
              <Text style={styles.zoneLabel}>Your service zone</Text>
              <Text style={styles.zoneValue} numberOfLines={1}>
                Tier {worker.tier?.replace('tier', '') || '2'} city •
                {worker.tier === 'tier1' ? ' Premium zone' : worker.tier === 'tier2' ? ' Standard zone' : ' Rural zone'}
              </Text>
            </View>
          </View>
          <View style={styles.zoneDivider} />
          <View style={styles.zoneItem}>
            <Bike size={15} color={colors.accent600} strokeWidth={2.2} />
            <View style={{ flex: 1 }}>
              <Text style={styles.zoneLabel}>Mobility</Text>
              <Text style={styles.zoneValue}>Cooperative support</Text>
            </View>
            <Badge variant="primary" size="sm">Active</Badge>
          </View>
        </View>

        {/* Active job */}
        {activeBooking && (
          <View style={styles.section}>
            <SectionHeader title="Active Job" />
            <View style={styles.activeJobCard}>
              <View style={styles.activeJobAccent} />
              <View style={styles.activeJobBody}>
                <View style={styles.activeJobTop}>
                  <View style={styles.activeJobTitleWrap}>
                    <Text style={styles.activeJobTitle} numberOfLines={1}>{activeBooking.serviceName}</Text>
                    <Badge variant={activeBooking.status === 'completed' ? 'completed' : 'in-progress'} size="sm">
                      {activeBooking.status.replace('-', ' ')}
                    </Badge>
                  </View>
                  <Text style={styles.activeJobPrice}>₹{activeBooking.totalPrice}</Text>
                </View>
                <Text style={styles.activeJobDesc} numberOfLines={3}>{activeBooking.description}</Text>

                {/* Customer / Location / Scheduled grid */}
                <View style={styles.activeJobGrid}>
                  <View style={styles.activeJobGridItem}>
                    <View style={styles.activeJobGridHead}>
                      <UserRound size={12} color={colors.gray400} strokeWidth={2} />
                      <Text style={styles.activeJobGridLabel}>Customer</Text>
                    </View>
                    <Text style={styles.activeJobGridValue} numberOfLines={1}>{activeBooking.customerName}</Text>
                  </View>
                  <View style={styles.activeJobGridDivider} />
                  <View style={styles.activeJobGridItem}>
                    <View style={styles.activeJobGridHead}>
                      <MapPin size={12} color={colors.gray400} strokeWidth={2} />
                      <Text style={styles.activeJobGridLabel}>Location</Text>
                    </View>
                    <Text style={styles.activeJobGridValue} numberOfLines={1}>{activeBooking.address.split(',')[0]}</Text>
                  </View>
                  <View style={styles.activeJobGridDivider} />
                  <View style={styles.activeJobGridItem}>
                    <View style={styles.activeJobGridHead}>
                      <CalendarClock size={12} color={colors.gray400} strokeWidth={2} />
                      <Text style={styles.activeJobGridLabel}>Scheduled</Text>
                    </View>
                    <Text style={styles.activeJobGridValue} numberOfLines={1}>{activeBooking.time}</Text>
                  </View>
                </View>

                {/* Job progress stepper (from existing status only) */}
                {activeStep >= 0 ? (
                  <View style={styles.jobStepper}>
                    {JOB_LIFECYCLE.map((label, i) => {
                      const done = i <= activeStep;
                      return (
                        <View key={label} style={styles.jobStepSeg}>
                          <View style={styles.jobStepLine}>
                            {i > 0 ? <View style={[styles.jobConnector, i <= activeStep && styles.jobConnectorDone]} /> : <View style={styles.jobConnectorSpacer} />}
                            <View style={[styles.jobStepDot, done && styles.jobStepDotDone]}>
                              {done ? <Check size={9} color={colors.white} strokeWidth={3} /> : null}
                            </View>
                            {i < JOB_LIFECYCLE.length - 1 ? <View style={[styles.jobConnector, i < activeStep && styles.jobConnectorDone]} /> : <View style={styles.jobConnectorSpacer} />}
                          </View>
                          <Text style={[styles.jobStepLabel, done && styles.jobStepLabelDone]} numberOfLines={1}>{label}</Text>
                        </View>
                      );
                    })}
                  </View>
                ) : null}
              </View>
            </View>
          </View>
        )}

        {/* Training CTA */}
        <Pressable
          style={({ pressed }) => [styles.trainingCta, pressed && styles.trainingPressed]}
          onPress={() => navigation.navigate('WorkerTraining')}
        >
          <View style={styles.trainingIcon}>
            <BookOpen size={22} color={colors.white} strokeWidth={2.1} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.trainingTitle}>Free Training Available</Text>
            <Text style={styles.trainingSub}>Upgrade skills, earn certificates, unlock better jobs</Text>
          </View>
          <View style={styles.freeBadge}>
            <Text style={styles.freeBadgeText}>Free</Text>
          </View>
        </Pressable>

        {/* Recent jobs */}
        <View style={styles.section}>
          <SectionHeader title="Recent Jobs" />
          {bookings.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No job history yet. Jobs you complete will appear here.</Text>
            </View>
          ) : (
            <View style={styles.recentList}>
              {bookings.slice(0, 5).map((b, i) => (
                <View key={b.id} style={[styles.recentItem, i > 0 && styles.recentItemBordered]}>
                  <View style={styles.recentDot} />
                  <View style={styles.recentInfo}>
                    <Text style={styles.recentName} numberOfLines={1}>{b.serviceName}</Text>
                    <Text style={styles.recentMeta} numberOfLines={1}>{b.date} • {b.customerName}</Text>
                  </View>
                  <View style={styles.recentRight}>
                    <Text style={styles.recentPrice}>₹{b.totalPrice}</Text>
                    <Badge variant={b.status === 'completed' ? 'completed' : 'default'} size="sm">
                      {b.status.replace('-', ' ')}
                    </Badge>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Community brand message (presentation only) */}
        <View style={styles.communityStrip}>
          <Text style={styles.communityText}>Stronger Homes, Happier Communities.</Text>
          <Text style={styles.communitySub}>Seva · Sahyog · Samriddhi</Text>
        </View>
      </View>

      <HelplineModal isOpen={showHelpline} onClose={() => setShowHelpline(false)} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  canvas: { backgroundColor: colors.bgPrimary },
  content: { paddingHorizontal: 0, paddingTop: 0 },

  // ---- Header ----
  headerBand: {
    borderBottomLeftRadius: radii.radius2xl,
    borderBottomRightRadius: radii.radius2xl,
    paddingHorizontal: spacing.space5,
    paddingBottom: spacing.space5,
    overflow: 'hidden',
  },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.space2, flex: 1 },
  logoWrap: { width: 40, height: 40, borderRadius: radii.radiusMd, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  logo: { width: 40, height: 40 },
  brandText: { flex: 1 },
  brandName: { fontSize: fontSizes.fsBase, color: colors.white, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold },
  brandRole: { fontSize: fontSizes.fsXs, color: 'rgba(255,255,255,0.85)', fontFamily: fontFamilies.interMedium },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.space2 },
  headerIconBtn: { width: 38, height: 38, borderRadius: radii.radiusFull, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  bellDot: { position: 'absolute', top: 9, right: 10, width: 7, height: 7, borderRadius: 4, backgroundColor: colors.white },
  greetName: { fontSize: fontSizes.fs2xl, color: colors.white, fontWeight: fontWeights.fwExtrabold, fontFamily: fontFamilies.interExtraBold, marginTop: spacing.space4 },
  greetSub: { fontSize: fontSizes.fsSm, color: 'rgba(255,255,255,0.9)', fontFamily: fontFamilies.interRegular, marginTop: 2 },

  // ---- Body ----
  body: { paddingHorizontal: spacing.space4, paddingTop: spacing.space5 },
  section: { marginTop: spacing.space6 },

  setupCard: {
    flexDirection: 'row', gap: spacing.space3, marginBottom: spacing.space4, padding: spacing.space4,
    backgroundColor: colors.warning50, borderRadius: radii.radiusLg, borderLeftWidth: 4, borderLeftColor: colors.warning500,
  },
  setupTitle: { fontSize: fontSizes.fsSm, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.gray900 },
  setupText: { fontSize: fontSizes.fsXs, color: colors.gray600, fontFamily: fontFamilies.interRegular, marginTop: 2 },

  // ---- Availability ----
  availCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.space3, borderRadius: radii.radiusXl, padding: spacing.space4, borderWidth: 1.5, ...shadows.shadowSm },
  availOn: { backgroundColor: colors.success50, borderColor: colors.success100 },
  availOff: { backgroundColor: colors.surfaceWhite, borderColor: colors.gray200 },
  availIcon: { width: 40, height: 40, borderRadius: radii.radiusFull, alignItems: 'center', justifyContent: 'center' },
  availIconOn: { backgroundColor: colors.success100 },
  availIconOff: { backgroundColor: colors.gray100 },
  availInfo: { flex: 1 },
  availTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  availTitle: { fontSize: fontSizes.fsSm, fontWeight: fontWeights.fwExtrabold, fontFamily: fontFamilies.interExtraBold, color: colors.gray900, letterSpacing: 0.5 },
  availSub: { fontSize: fontSizes.fsXs, color: colors.gray500, fontFamily: fontFamilies.interRegular, marginTop: 1 },
  toggle: { width: 52, height: 30, borderRadius: 15, padding: 3, justifyContent: 'center' },
  toggleOn: { backgroundColor: colors.success500 },
  toggleOff: { backgroundColor: colors.gray300 },
  knob: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.white, ...shadows.shadowSm },
  knobOn: { alignSelf: 'flex-end' },
  knobOff: { alignSelf: 'flex-start' },

  // ---- Performance ----
  perfCard: { backgroundColor: colors.surfaceWhite, borderRadius: radii.radiusXl, padding: spacing.space5, borderWidth: 1, borderColor: colors.gray100, ...shadows.shadowSm },
  earnRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.space3 },
  earnIcon: { width: 44, height: 44, borderRadius: radii.radiusMd, backgroundColor: colors.success50, alignItems: 'center', justifyContent: 'center' },
  earnLabel: { fontSize: fontSizes.fsXs, color: colors.gray500, fontFamily: fontFamilies.interMedium, textTransform: 'uppercase', letterSpacing: 0.3 },
  earnValue: { fontSize: fontSizes.fs3xl, fontWeight: fontWeights.fwExtrabold, fontFamily: fontFamilies.interExtraBold, color: colors.gray900 },
  perfDivider: { height: 1, backgroundColor: colors.gray100, marginVertical: spacing.space4 },
  perfMetrics: { flexDirection: 'row', alignItems: 'stretch' },
  perfMetric: { flex: 1, alignItems: 'center', gap: spacing.space1 },
  perfMetricHead: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  perfMetricLabel: { fontSize: fontSizes.fsXs, color: colors.gray500, fontFamily: fontFamilies.interMedium },
  perfMetricValue: { fontSize: fontSizes.fsXl, fontWeight: fontWeights.fwExtrabold, fontFamily: fontFamilies.interExtraBold, color: colors.gray900 },
  perfMetricValueRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  perfMetricDivider: { width: 1, backgroundColor: colors.gray100, marginHorizontal: spacing.space2 },

  // ---- Benefits rings ----
  ringRow: { flexDirection: 'row', gap: spacing.space3 },
  ringCard: { flex: 1, backgroundColor: colors.surfaceWhite, borderRadius: radii.radiusXl, padding: spacing.space4, borderWidth: 1, borderColor: colors.gray100, ...shadows.shadowSm, alignItems: 'center' },
  ringTitle: { fontSize: fontSizes.fsXs, color: colors.gray500, fontFamily: fontFamilies.interSemiBold, fontWeight: fontWeights.fwSemibold, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: spacing.space3, textAlign: 'center' },
  ringValue: { fontSize: fontSizes.fsXl, fontWeight: fontWeights.fwExtrabold, fontFamily: fontFamilies.interExtraBold, color: colors.gray900 },
  ringMax: { fontSize: fontSizes.fsXs, color: colors.gray400, fontFamily: fontFamilies.interRegular, marginTop: -2 },
  ringCaption: { fontSize: fontSizes.fsSm, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, marginTop: spacing.space3, textAlign: 'center' },
  ringSub: { fontSize: 11, color: colors.gray500, fontFamily: fontFamilies.interRegular, marginTop: 2, textAlign: 'center' },
  ringEmpty: { height: 110, alignItems: 'center', justifyContent: 'center' },

  // ---- Benefit cards ----
  benefitCard: { flexDirection: 'row', gap: spacing.space3, backgroundColor: colors.surfaceWhite, borderRadius: radii.radiusLg, padding: spacing.space4, borderWidth: 1, borderColor: colors.gray100, ...shadows.shadowSm, marginTop: spacing.space3 },
  benefitCardActive: { borderColor: colors.success100, backgroundColor: colors.success50 },
  benefitIcon: { width: 40, height: 40, borderRadius: radii.radiusMd, alignItems: 'center', justifyContent: 'center' },
  benefitLabel: { fontSize: fontSizes.fsXs, color: colors.gray500, fontFamily: fontFamilies.interMedium, textTransform: 'uppercase', letterSpacing: 0.3 },
  benefitValue: { fontSize: fontSizes.fsLg, fontWeight: fontWeights.fwExtrabold, fontFamily: fontFamilies.interExtraBold, color: colors.gray900, marginVertical: 2 },
  benefitValueSmall: { fontSize: fontSizes.fsXs, fontWeight: fontWeights.fwNormal, fontFamily: fontFamilies.interRegular, color: colors.gray400 },
  benefitSub: { fontSize: fontSizes.fsXs, color: colors.gray500, fontFamily: fontFamilies.interRegular, marginTop: 2 },
  leaveHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  leaveApply: { fontSize: fontSizes.fsSm, color: colors.primary600, fontWeight: fontWeights.fwSemibold, fontFamily: fontFamilies.interSemiBold },
  loyaltyStrip: { marginTop: spacing.space2, backgroundColor: colors.accent50, borderRadius: radii.radiusMd, paddingVertical: 5, paddingHorizontal: 10, alignSelf: 'flex-start' },
  loyaltyText: { fontSize: fontSizes.fsXs, fontWeight: fontWeights.fwSemibold, fontFamily: fontFamilies.interSemiBold, color: colors.accent700 },

  // ---- Zone bar ----
  zoneBar: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.space4, backgroundColor: colors.surfaceWhite, borderRadius: radii.radiusLg, padding: spacing.space4, borderWidth: 1, borderColor: colors.gray100, ...shadows.shadowSm },
  zoneItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.space2 },
  zoneDivider: { width: 1, alignSelf: 'stretch', backgroundColor: colors.gray100, marginHorizontal: spacing.space3 },
  zoneLabel: { fontSize: 10, color: colors.gray400, fontFamily: fontFamilies.interMedium, textTransform: 'uppercase', letterSpacing: 0.3 },
  zoneValue: { fontSize: fontSizes.fsXs, color: colors.gray800, fontFamily: fontFamilies.interSemiBold, fontWeight: fontWeights.fwSemibold, marginTop: 1 },

  // ---- Active job ----
  activeJobCard: { flexDirection: 'row', backgroundColor: colors.surfaceWhite, borderRadius: radii.radiusXl, overflow: 'hidden', borderWidth: 1, borderColor: colors.gray100, ...shadows.shadowMd },
  activeJobAccent: { width: 4, backgroundColor: colors.accent500 },
  activeJobBody: { flex: 1, padding: spacing.space4 },
  activeJobTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.space3, marginBottom: spacing.space2 },
  activeJobTitleWrap: { flex: 1, gap: 4, alignItems: 'flex-start' },
  activeJobPrice: { fontSize: fontSizes.fsXl, fontWeight: fontWeights.fwExtrabold, fontFamily: fontFamilies.interExtraBold, color: colors.gray900 },
  activeJobTitle: { fontSize: fontSizes.fsLg, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.gray900 },
  activeJobDesc: { fontSize: fontSizes.fsSm, color: colors.gray600, fontFamily: fontFamilies.interRegular, marginTop: 2, lineHeight: fontSizes.fsSm * 1.4 },
  activeJobGrid: { flexDirection: 'row', alignItems: 'flex-start', marginTop: spacing.space4, backgroundColor: colors.gray50, borderRadius: radii.radiusMd, paddingVertical: spacing.space3, paddingHorizontal: spacing.space3 },
  activeJobGridItem: { flex: 1, gap: 3 },
  activeJobGridDivider: { width: 1, alignSelf: 'stretch', backgroundColor: colors.gray200, marginHorizontal: spacing.space2 },
  activeJobGridHead: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  activeJobGridLabel: { fontSize: 10, color: colors.gray400, fontFamily: fontFamilies.interMedium, textTransform: 'uppercase', letterSpacing: 0.3 },
  activeJobGridValue: { fontSize: fontSizes.fsSm, color: colors.gray900, fontFamily: fontFamilies.interSemiBold, fontWeight: fontWeights.fwSemibold },
  jobStepper: { flexDirection: 'row', marginTop: spacing.space4 },
  jobStepSeg: { flex: 1, alignItems: 'center' },
  jobStepLine: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch' },
  jobConnector: { flex: 1, height: 2, backgroundColor: colors.gray200 },
  jobConnectorDone: { backgroundColor: colors.accent500 },
  jobConnectorSpacer: { flex: 1 },
  jobStepDot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: colors.gray300, backgroundColor: colors.surfaceWhite, alignItems: 'center', justifyContent: 'center' },
  jobStepDotDone: { backgroundColor: colors.accent500, borderColor: colors.accent500 },
  jobStepLabel: { fontSize: 9.5, color: colors.gray400, fontFamily: fontFamilies.interMedium, marginTop: 4 },
  jobStepLabelDone: { color: colors.accent700, fontFamily: fontFamilies.interSemiBold, fontWeight: fontWeights.fwSemibold },

  // ---- Training ----
  trainingCta: { flexDirection: 'row', alignItems: 'center', gap: spacing.space3, marginTop: spacing.space6, backgroundColor: colors.primary700, borderRadius: radii.radiusXl, padding: spacing.space4, ...shadows.shadowLg, shadowColor: colors.primary900 },
  trainingPressed: { opacity: 0.94 },
  trainingIcon: { width: 44, height: 44, borderRadius: radii.radiusMd, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  trainingTitle: { fontSize: fontSizes.fsBase, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.white },
  trainingSub: { fontSize: fontSizes.fsXs, color: colors.primary200, fontFamily: fontFamilies.interRegular, marginTop: 2 },
  freeBadge: { backgroundColor: colors.success500, borderRadius: radii.radiusFull, paddingVertical: 5, paddingHorizontal: 14 },
  freeBadgeText: { fontSize: fontSizes.fsXs, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.white },

  // ---- Recent jobs ----
  emptyCard: { backgroundColor: colors.surfaceWhite, borderRadius: radii.radiusLg, padding: spacing.space6, alignItems: 'center', borderWidth: 1, borderColor: colors.gray100, ...shadows.shadowSm },
  emptyText: { fontSize: fontSizes.fsSm, color: colors.gray500, fontFamily: fontFamilies.interRegular, textAlign: 'center' },
  recentList: { backgroundColor: colors.surfaceWhite, borderRadius: radii.radiusLg, paddingHorizontal: spacing.space4, borderWidth: 1, borderColor: colors.gray100, ...shadows.shadowSm },
  recentItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.space3, paddingVertical: spacing.space3 },
  recentItemBordered: { borderTopWidth: 1, borderTopColor: colors.gray100 },
  recentDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent400 },
  recentInfo: { flex: 1 },
  recentName: { fontSize: fontSizes.fsBase, fontWeight: fontWeights.fwSemibold, fontFamily: fontFamilies.interSemiBold, color: colors.gray900 },
  recentMeta: { fontSize: fontSizes.fsXs, color: colors.gray500, fontFamily: fontFamilies.interRegular, marginTop: 2 },
  recentRight: { alignItems: 'flex-end', gap: 4 },
  recentPrice: { fontSize: fontSizes.fsSm, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.gray900 },

  // ---- Community ----
  communityStrip: { marginTop: spacing.space6, alignItems: 'center', paddingVertical: spacing.space4 },
  communityText: { fontSize: fontSizes.fsSm, color: colors.gray600, fontFamily: fontFamilies.interSemiBold, fontWeight: fontWeights.fwSemibold, textAlign: 'center' },
  communitySub: { fontSize: fontSizes.fsXs, color: colors.gray400, fontFamily: fontFamilies.interRegular, marginTop: 2 },
});
