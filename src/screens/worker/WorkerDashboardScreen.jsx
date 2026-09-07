import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Power, Star, Briefcase, IndianRupee, Clock, Shield, TrendingUp, BookOpen,
  AlertTriangle, Award, Umbrella,
} from 'lucide-react-native';
import { useAuth } from '@context/AuthContext';
import { getBookingsByWorker } from '@data/mockBookings';
import { ScreenContainer, PortalHeader, SectionHeader } from '@components/app';
import StatsCard from '@components/ui/StatsCard';
import Badge from '@components/ui/Badge';
import HelplineModal from '@components/HelplineModal';
import { buildWorkerData } from './workerData';
import { colors, spacing, radii, shadows, fontSizes, fontWeights, fontFamilies } from '@theme';

/**
 * WorkerDashboardScreen — ported from web pages/worker/WorkerDashboard.jsx, re-laid-out in the
 * modern app style (worker accent = amber). ALL business logic preserved:
 *  - buildWorkerData() demo-worker resolution (see workerData.js)
 *  - job history via getBookingsByWorker(mockWorkerId) — [] for real workers (no leak)
 *  - weekly hours overtime rules: >=36 = near (warn), >=40 = at cap (danger, 1.5x OT rule)
 *  - CIBIL score bar (green >750), insurance eligibility (after 3 months), leave + loyalty bonus
 *  - availability toggle (local state), city tier banner, active job, training CTA, recent jobs
 */
export default function WorkerDashboardScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user, profile, workerProfile } = useAuth();
  const worker = buildWorkerData(user, profile, workerProfile);

  const bookings = worker.mockWorkerId ? getBookingsByWorker(worker.mockWorkerId) : [];
  const activeBooking = bookings.find((b) => ['en-route', 'in-progress', 'assigned'].includes(b.status));

  const [isAvailable, setIsAvailable] = useState(worker.available);
  const [showHelpline, setShowHelpline] = useState(false);

  const weeklyHoursPercent = Math.min(((worker.weekly_hours_worked || 0) / 40) * 100, 100);
  const isNearOvertime = (worker.weekly_hours_worked || 0) >= 36;
  const isAtOvertime = (worker.weekly_hours_worked || 0) >= 40;
  const ratingDisplay = worker.rating != null ? worker.rating.toFixed(1) : '—';

  const hoursColor = isAtOvertime ? colors.danger500 : isNearOvertime ? colors.warning500 : colors.success500;
  const cibilColor = (worker.cibil_score ?? 0) > 750 ? colors.success500 : colors.warning500;

  return (
    <ScreenContainer contentStyle={{ paddingTop: insets.top + spacing.space2 }}>
      <PortalHeader
        title={`Namaste, ${worker.name.split(' ')[0]}`}
        subtitle="Sahakar Seva • Worker"
        accent={colors.accent600}
        onPressBell={() => setShowHelpline(true)}
      />

      {/* Availability toggle */}
      <View style={[styles.availCard, isAvailable ? styles.availOn : styles.availOff]}>
        <Power size={24} color={isAvailable ? colors.success600 : colors.gray400} />
        <View style={styles.availInfo}>
          <Text style={styles.availTitle}>{isAvailable ? "You're Online" : "You're Offline"}</Text>
          <Text style={styles.availSub}>{isAvailable ? 'Accepting new jobs' : 'Not accepting jobs right now'}</Text>
        </View>
        <Pressable
          style={[styles.toggle, isAvailable ? styles.toggleOn : styles.toggleOff]}
          onPress={() => setIsAvailable(!isAvailable)}
          accessibilityLabel="Toggle availability"
        >
          <View style={[styles.knob, isAvailable ? styles.knobOn : styles.knobOff]} />
        </Pressable>
      </View>

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

      {/* Stats — 2x2 grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statCell}><StatsCard label="Jobs Done" value={worker.totalJobs} icon={Briefcase} color="primary" trend="up" trendValue="12%" /></View>
        <View style={styles.statCell}><StatsCard label="Earnings" value={worker.earnings} icon={IndianRupee} color="success" trend="up" trendValue="8%" /></View>
        <View style={styles.statCell}><StatsCard label="Rating" value={ratingDisplay} icon={Star} color="warning" /></View>
        <View style={styles.statCell}><StatsCard label="Queue" value={worker.fairnessPosition != null ? `#${worker.fairnessPosition}` : '—'} icon={Clock} color="info" /></View>
      </View>

      {/* Welfare */}
      <View style={styles.section}>
        <SectionHeader title="Worker Welfare" />
        <View style={styles.welfareList}>
          {/* CIBIL */}
          <View style={styles.welfareCard}>
            <View style={[styles.welfareIcon, { backgroundColor: colors.primary50 }]}>
              <TrendingUp size={20} color={colors.primary600} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.welfareLabel}>Civil Quality Score</Text>
              {worker.cibil_score != null ? (
                <>
                  <Text style={styles.welfareValue}>
                    {worker.cibil_score} <Text style={styles.welfareSmall}>/ 900</Text>
                  </Text>
                  <ProgressBar pct={(worker.cibil_score / 900) * 100} color={cibilColor} />
                  <Text style={styles.welfareSub}>
                    {worker.cibil_score > 750 ? '🌟 Excellent — Priority jobs eligible' : '📈 Keep improving to unlock better jobs'}
                  </Text>
                </>
              ) : (
                <Text style={styles.welfareSub}>Not yet assessed</Text>
              )}
            </View>
          </View>

          {/* Weekly hours */}
          <View style={[styles.welfareCard, isNearOvertime && styles.welfareWarn]}>
            <View style={[styles.welfareIcon, { backgroundColor: hoursColor + '1A' }]}>
              <Clock size={20} color={hoursColor} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.welfareLabel}>Weekly Hours</Text>
              <Text style={styles.welfareValue}>
                {worker.weekly_hours_worked}h <Text style={styles.welfareSmall}>/ 40h max</Text>
              </Text>
              <ProgressBar pct={weeklyHoursPercent} color={hoursColor} />
              <Text style={styles.welfareSub}>
                {isAtOvertime
                  ? '🚫 Cap reached — Overtime only if no other worker available (1.5x bonus)'
                  : isNearOvertime
                  ? '⚠️ Approaching 40h limit'
                  : '✅ Healthy work week'}
              </Text>
            </View>
          </View>

          {/* Insurance */}
          <View style={styles.welfareCard}>
            <View style={[styles.welfareIcon, { backgroundColor: (worker.insurance_eligible ? colors.success500 : colors.warning500) + '1A' }]}>
              <Umbrella size={20} color={worker.insurance_eligible ? colors.success600 : colors.warning600} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.welfareLabel}>Worker Insurance</Text>
              <Text style={[styles.welfareValue, { color: worker.insurance_eligible ? colors.success600 : colors.warning600 }]}>
                {worker.insurance_eligible ? 'Active ✅' : 'Not yet eligible'}
              </Text>
              <Text style={styles.welfareSub}>
                {worker.insurance_eligible ? 'Health + Accident coverage via Cooperative' : 'Eligible after 3 months of service'}
              </Text>
            </View>
          </View>

          {/* Leave */}
          <View style={styles.welfareCard}>
            <View style={[styles.welfareIcon, { backgroundColor: colors.primary50 }]}>
              <Award size={20} color={colors.primary600} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.welfareLabel}>Leave Balance</Text>
              <Text style={styles.welfareValue}>
                {worker.leave_balance} <Text style={styles.welfareSmall}>days left</Text>
              </Text>
              <Text style={styles.welfareSub}>
                30 annual + emergency leaves •{' '}
                <Text style={styles.welfareLink} onPress={() => navigation.navigate('WorkerLeave')}>Apply →</Text>
              </Text>
              {worker.loyalty_bonus_eligible && (
                <View style={styles.loyaltyBadge}>
                  <Text style={styles.loyaltyText}>🎁 1-Year Loyalty Bonus: ₹2,500 eligible!</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </View>

      {/* City tier */}
      <View style={styles.tierBanner}>
        <Shield size={16} color={colors.primary600} />
        <Text style={styles.tierText}>
          You are in <Text style={styles.bold}>Tier {worker.tier?.replace('tier', '') || '2'}</Text> city •
          {worker.tier === 'tier1' ? ' Premium zone' : worker.tier === 'tier2' ? ' Standard zone' : ' Rural zone — relocation incentives'}
        </Text>
        <Badge variant="primary" size="sm">Mobility</Badge>
      </View>

      {/* Active job */}
      {activeBooking && (
        <View style={styles.section}>
          <SectionHeader title="Active Job" />
          <View style={styles.activeJobCard}>
            <View style={styles.activeJobTop}>
              <Badge variant="in-progress" size="sm">In Progress</Badge>
              <Text style={styles.activeJobPrice}>₹{activeBooking.totalPrice}</Text>
            </View>
            <Text style={styles.activeJobTitle}>{activeBooking.serviceName}</Text>
            <Text style={styles.activeJobDesc} numberOfLines={2}>{activeBooking.description}</Text>
            <View style={styles.activeJobMeta}>
              <Text style={styles.activeJobMetaText}>📍 {activeBooking.address.split(',')[0]}</Text>
              <Text style={styles.activeJobMetaText}>👤 {activeBooking.customerName}</Text>
              <Text style={styles.activeJobMetaText}>📅 {activeBooking.date} • {activeBooking.time}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Training CTA */}
      <Pressable style={styles.trainingCta} onPress={() => navigation.navigate('WorkerTraining')}>
        <BookOpen size={24} color={colors.white} />
        <View style={{ flex: 1 }}>
          <Text style={styles.trainingTitle}>🎓 Free Training Available</Text>
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
            {bookings.slice(0, 5).map((b) => (
              <View key={b.id} style={styles.recentItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.recentName}>{b.serviceName}</Text>
                  <Text style={styles.recentMeta}>{b.date} • {b.customerName}</Text>
                </View>
                <View style={styles.recentRight}>
                  <Badge variant={b.status === 'completed' ? 'completed' : 'default'} size="sm">
                    {b.status.replace('-', ' ')}
                  </Badge>
                  <Text style={styles.recentPrice}>₹{b.totalPrice}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      <HelplineModal isOpen={showHelpline} onClose={() => setShowHelpline(false)} />
    </ScreenContainer>
  );
}

function ProgressBar({ pct, color }) {
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: spacing.space6 },
  bold: { fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold },

  availCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.space3,
    borderRadius: radii.radiusLg, padding: spacing.space4, borderWidth: 1.5, ...shadows.shadowSm,
  },
  availOn: { backgroundColor: colors.success50, borderColor: colors.success500 },
  availOff: { backgroundColor: colors.surfaceWhite, borderColor: colors.gray200 },
  availInfo: { flex: 1 },
  availTitle: { fontSize: fontSizes.fsBase, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.gray900 },
  availSub: { fontSize: fontSizes.fsXs, color: colors.gray500, fontFamily: fontFamilies.interRegular },
  toggle: { width: 52, height: 30, borderRadius: 15, padding: 3, justifyContent: 'center' },
  toggleOn: { backgroundColor: colors.success500 },
  toggleOff: { backgroundColor: colors.gray300 },
  knob: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.white },
  knobOn: { alignSelf: 'flex-end' },
  knobOff: { alignSelf: 'flex-start' },

  setupCard: {
    flexDirection: 'row', gap: spacing.space3, marginTop: spacing.space4, padding: spacing.space4,
    backgroundColor: colors.warning50, borderRadius: radii.radiusLg, borderLeftWidth: 4, borderLeftColor: colors.warning500,
  },
  setupTitle: { fontSize: fontSizes.fsSm, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.gray900 },
  setupText: { fontSize: fontSizes.fsXs, color: colors.gray600, fontFamily: fontFamilies.interRegular, marginTop: 2 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.space3, marginTop: spacing.space4 },
  statCell: { width: '47.5%', flexGrow: 1 },

  welfareList: { gap: spacing.space3 },
  welfareCard: {
    flexDirection: 'row', gap: spacing.space3, backgroundColor: colors.surfaceWhite,
    borderRadius: radii.radiusLg, padding: spacing.space4, ...shadows.shadowSm,
  },
  welfareWarn: { borderWidth: 1, borderColor: colors.warning300 },
  welfareIcon: { width: 40, height: 40, borderRadius: radii.radiusMd, alignItems: 'center', justifyContent: 'center' },
  welfareLabel: { fontSize: fontSizes.fsXs, color: colors.gray500, fontFamily: fontFamilies.interMedium, textTransform: 'uppercase', letterSpacing: 0.3 },
  welfareValue: { fontSize: fontSizes.fsLg, fontWeight: fontWeights.fwExtrabold, fontFamily: fontFamilies.interExtraBold, color: colors.gray900, marginVertical: 2 },
  welfareSmall: { fontSize: fontSizes.fsXs, fontWeight: fontWeights.fwNormal, fontFamily: fontFamilies.interRegular, color: colors.gray400 },
  welfareSub: { fontSize: fontSizes.fsXs, color: colors.gray500, fontFamily: fontFamilies.interRegular, marginTop: 2 },
  welfareLink: { color: colors.primary600, fontWeight: fontWeights.fwSemibold, fontFamily: fontFamilies.interSemiBold },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: colors.gray200, overflow: 'hidden', marginVertical: 4 },
  progressFill: { height: '100%', borderRadius: 3 },
  loyaltyBadge: { marginTop: spacing.space2, backgroundColor: colors.accent50, borderRadius: radii.radiusMd, paddingVertical: 4, paddingHorizontal: 8, alignSelf: 'flex-start' },
  loyaltyText: { fontSize: fontSizes.fsXs, fontWeight: fontWeights.fwSemibold, fontFamily: fontFamilies.interSemiBold, color: colors.accent700 },

  tierBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.space2, marginTop: spacing.space4,
    backgroundColor: colors.primary50, borderRadius: radii.radiusLg, padding: spacing.space3,
  },
  tierText: { flex: 1, fontSize: fontSizes.fsXs, color: colors.gray700, fontFamily: fontFamilies.interRegular },

  activeJobCard: { backgroundColor: colors.surfaceWhite, borderRadius: radii.radiusLg, padding: spacing.space4, ...shadows.shadowMd },
  activeJobTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.space2 },
  activeJobPrice: { fontSize: fontSizes.fsBase, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.gray900 },
  activeJobTitle: { fontSize: fontSizes.fsLg, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.gray900 },
  activeJobDesc: { fontSize: fontSizes.fsSm, color: colors.gray600, fontFamily: fontFamilies.interRegular, marginTop: 2 },
  activeJobMeta: { marginTop: spacing.space3, gap: 4 },
  activeJobMetaText: { fontSize: fontSizes.fsXs, color: colors.gray500, fontFamily: fontFamilies.interRegular },

  trainingCta: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.space3, marginTop: spacing.space6,
    backgroundColor: colors.primary700, borderRadius: radii.radiusXl, padding: spacing.space4, ...shadows.shadowGlass,
  },
  trainingTitle: { fontSize: fontSizes.fsBase, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.white },
  trainingSub: { fontSize: fontSizes.fsXs, color: colors.primary100, fontFamily: fontFamilies.interRegular, marginTop: 2 },
  freeBadge: { backgroundColor: colors.success500, borderRadius: radii.radiusFull, paddingVertical: 4, paddingHorizontal: 12 },
  freeBadgeText: { fontSize: fontSizes.fsXs, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.white },

  emptyCard: { backgroundColor: colors.surfaceWhite, borderRadius: radii.radiusLg, padding: spacing.space6, alignItems: 'center', ...shadows.shadowSm },
  emptyText: { fontSize: fontSizes.fsSm, color: colors.gray500, fontFamily: fontFamilies.interRegular, textAlign: 'center' },
  recentList: { gap: spacing.space2 },
  recentItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceWhite,
    borderRadius: radii.radiusLg, padding: spacing.space4, ...shadows.shadowSm,
  },
  recentName: { fontSize: fontSizes.fsBase, fontWeight: fontWeights.fwSemibold, fontFamily: fontFamilies.interSemiBold, color: colors.gray900 },
  recentMeta: { fontSize: fontSizes.fsXs, color: colors.gray500, fontFamily: fontFamilies.interRegular, marginTop: 2 },
  recentRight: { alignItems: 'flex-end', gap: 4 },
  recentPrice: { fontSize: fontSizes.fsSm, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.gray900 },
});
