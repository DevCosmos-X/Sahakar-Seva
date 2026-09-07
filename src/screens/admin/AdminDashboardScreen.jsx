import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Users, Briefcase, IndianRupee, AlertTriangle, TrendingUp, ChevronRight } from 'lucide-react-native';
import { mockWorkers } from '@data/mockWorkers';
import { mockBookings } from '@data/mockBookings';
import { mockComplaints } from '@data/mockComplaints';
import { getWorkerList } from '@services/supabase';
import { useLanguage } from '@context/LanguageContext';
import { ScreenContainer, PortalHeader, SectionHeader } from '@components/app';
import StatsCard from '@components/ui/StatsCard';
import Badge from '@components/ui/Badge';
import { colors, spacing, radii, shadows, fontSizes, fontWeights, fontFamilies } from '@theme';

/**
 * AdminDashboardScreen — ported from web pages/admin/AdminDashboard.jsx (admin accent = red).
 *
 * PRESERVED: the getWorkerList() useEffect that seeds the worker count from mockWorkers and
 * tops it up with unique real Supabase workers (deduped against demoWorkerIds), keeping the mock
 * count on error. The 4 KPI StatsCards, quick-action cards, and recent bookings list are ported;
 * the web desktop <table> is dropped (mobile card list only, per the plan).
 */
export default function AdminDashboardScreen({ navigation }) {
  const { t } = useLanguage();

  const demoWorkerIds = new Set(mockWorkers.map((w) => w.id));
  const [totalWorkers, setTotalWorkers] = useState(mockWorkers.length);
  const activeWorkers = mockWorkers.filter((w) => w.available).length;

  useEffect(() => {
    getWorkerList().then(({ data, error }) => {
      if (error || !Array.isArray(data)) return; // keep mock count on failure
      const uniqueRegistered = data.filter((p) => !demoWorkerIds.has(p.id)).length;
      setTotalWorkers(mockWorkers.length + uniqueRegistered);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalBookings = mockBookings.length;
  const totalRevenue = mockBookings.reduce((sum, b) => sum + b.totalPrice, 0);
  const openComplaints = mockComplaints.filter((c) => c.status === 'open').length;

  const bookingStatusVariant = (s) => (s === 'completed' ? 'completed' : s === 'cancelled' ? 'cancelled' : 'in-progress');

  return (
    <ScreenContainer>
      <PortalHeader title={t('dashboard')} subtitle={t('overview_desc')} accent={colors.danger600} />

      {/* KPI stats — 2x2 */}
      <View style={styles.statsGrid}>
        <View style={styles.statCell}><StatsCard label={t('total_workers')} value={totalWorkers} icon={Users} color="primary" /></View>
        <View style={styles.statCell}><StatsCard label={t('total_bookings')} value={totalBookings} icon={Briefcase} color="info" /></View>
        <View style={styles.statCell}><StatsCard label={t('revenue')} value={totalRevenue} icon={IndianRupee} color="success" trend="up" trendValue="15%" /></View>
        <View style={styles.statCell}><StatsCard label={t('open_complaints')} value={openComplaints} icon={AlertTriangle} color="danger" /></View>
      </View>

      {/* Quick actions */}
      <View style={styles.section}>
        <SectionHeader title={t('quick_actions')} />
        <View style={styles.actionsList}>
          <ActionCard
            icon={TrendingUp} iconBg={colors.primary50} iconColor={colors.primary600}
            title={t('demand_forecast_ai')} sub="Predict demand spikes with AI"
            onPress={() => navigation.navigate('AdminForecast')}
          />
          <ActionCard
            icon={Users} iconBg={colors.info50} iconColor={colors.info600}
            title={t('manage_workers')} sub={`${totalWorkers} registered • ${activeWorkers} online`}
            onPress={() => navigation.navigate('AdminWorkers')}
          />
          <ActionCard
            icon={AlertTriangle} iconBg={colors.danger50} iconColor={colors.danger600}
            title={t('view_complaints')} sub={`${openComplaints} issues pending review`}
            badge={openComplaints > 0 ? openComplaints : null}
            onPress={() => navigation.navigate('AdminComplaints')}
          />
        </View>
      </View>

      {/* Recent bookings */}
      <View style={styles.section}>
        <SectionHeader title={t('recent_bookings')} />
        <View style={styles.bookingsList}>
          {mockBookings.slice(0, 6).map((b) => (
            <View key={b.id} style={styles.bookingCard}>
              <View style={styles.bookingTop}>
                <View>
                  <Text style={styles.bookingId}>{b.id}</Text>
                  <Text style={styles.bookingService}>{b.serviceName}</Text>
                </View>
                <Badge variant={bookingStatusVariant(b.status)} size="sm">{b.status.replace('-', ' ')}</Badge>
              </View>
              <View style={styles.bookingDetails}>
                <DetailRow label="👤 Customer" value={b.customerName} />
                <DetailRow label="🛠️ Worker" value={b.workerName || 'Unassigned'} />
                {b.date ? <DetailRow label="📅 Date" value={b.date} /> : null}
              </View>
              <View style={styles.bookingBottom}>
                <Text style={styles.bookingPriceLabel}>Total Amount</Text>
                <Text style={styles.bookingPrice}>₹{b.totalPrice}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </ScreenContainer>
  );
}

function ActionCard({ icon: Icon, iconBg, iconColor, title, sub, badge, onPress }) {
  return (
    <Pressable style={styles.actionCard} onPress={onPress}>
      <View style={[styles.actionIcon, { backgroundColor: iconBg }]}>
        <Icon size={20} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionSub}>{sub}</Text>
      </View>
      {badge != null && <Badge variant="danger" size="sm">{String(badge)}</Badge>}
      <ChevronRight size={18} color={colors.gray300} />
    </Pressable>
  );
}

function DetailRow({ label, value }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: spacing.space6 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.space3 },
  statCell: { width: '47.5%', flexGrow: 1 },
  actionsList: { gap: spacing.space3 },
  actionCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.space3, backgroundColor: colors.surfaceWhite, borderRadius: radii.radiusLg, padding: spacing.space4, ...shadows.shadowSm },
  actionIcon: { width: 44, height: 44, borderRadius: radii.radiusMd, alignItems: 'center', justifyContent: 'center' },
  actionTitle: { fontSize: fontSizes.fsBase, fontWeight: fontWeights.fwSemibold, fontFamily: fontFamilies.interSemiBold, color: colors.gray900 },
  actionSub: { fontSize: fontSizes.fsXs, color: colors.gray500, fontFamily: fontFamilies.interRegular, marginTop: 2 },
  bookingsList: { gap: spacing.space3 },
  bookingCard: { backgroundColor: colors.surfaceWhite, borderRadius: radii.radiusLg, padding: spacing.space4, ...shadows.shadowSm },
  bookingTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  bookingId: { fontSize: fontSizes.fsXs, color: colors.gray400, fontFamily: 'monospace' },
  bookingService: { fontSize: fontSizes.fsBase, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.gray900 },
  bookingDetails: { marginTop: spacing.space3, gap: 4 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between' },
  detailLabel: { fontSize: fontSizes.fsXs, color: colors.gray500, fontFamily: fontFamilies.interRegular },
  detailValue: { fontSize: fontSizes.fsXs, color: colors.gray800, fontFamily: fontFamilies.interMedium },
  bookingBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.space3, paddingTop: spacing.space3, borderTopWidth: 1, borderTopColor: colors.gray100 },
  bookingPriceLabel: { fontSize: fontSizes.fsXs, color: colors.gray400, fontFamily: fontFamilies.interRegular },
  bookingPrice: { fontSize: fontSizes.fsLg, fontWeight: fontWeights.fwExtrabold, fontFamily: fontFamilies.interExtraBold, color: colors.gray900 },
});
