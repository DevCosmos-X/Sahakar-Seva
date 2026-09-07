import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Mail, Phone, Award, Calendar, Users, AlertCircle, LogOut } from 'lucide-react-native';
import { useAuth } from '@context/AuthContext';
import { ScreenContainer } from '@components/app';
import Badge from '@components/ui/Badge';
import StarRating from '@components/ui/StarRating';
import { DEMO_WORKER_ID, demoMockWorker } from './workerData';
import { colors, spacing, radii, shadows, fontSizes, fontWeights, fontFamilies } from '@theme';

/**
 * WorkerProfileScreen — ported from web pages/worker/WorkerProfile.jsx. Demo-worker vs
 * real-worker data resolution preserved exactly (only 'demo-worker' maps to Suresh Kumar;
 * real workers use auth context only). Setup-pending notice for real workers with no
 * workerProfile. Amber avatar (worker accent).
 */
export default function WorkerProfileScreen() {
  const { user, profile, workerProfile, logout } = useAuth();
  const isDemo = user?.id === DEMO_WORKER_ID;

  const displayName = isDemo ? demoMockWorker.name : profile?.full_name || user?.email || 'Worker';
  const displayEmail = isDemo ? demoMockWorker.email : user?.email || '—';
  const displayPhone = isDemo ? demoMockWorker.phone : profile?.phone || workerProfile?.phone || '—';
  const cooperative = isDemo ? demoMockWorker.cooperative : workerProfile?.cooperative || 'Sahakar Seva Cooperative';
  const joinDate = isDemo
    ? demoMockWorker.joinDate
    : profile?.created_at
    ? new Date(profile.created_at).toISOString().split('T')[0]
    : '—';
  const skills = isDemo ? demoMockWorker.skills : workerProfile?.skills || [];
  const certificates = isDemo ? demoMockWorker.certificates : workerProfile?.certificates || [];
  const rating = isDemo ? demoMockWorker.rating : workerProfile?.rating ?? null;
  const totalJobs = isDemo ? demoMockWorker.totalJobs : workerProfile?.total_jobs ?? 0;
  const avatarInitial = (displayName[0] || '?').toUpperCase();

  return (
    <ScreenContainer>
      <Text style={styles.h1}>My Profile</Text>

      {!isDemo && !workerProfile && (
        <View style={styles.setupCard}>
          <AlertCircle size={18} color={colors.warning500} />
          <View style={{ flex: 1 }}>
            <Text style={styles.setupTitle}>Profile setup pending</Text>
            <Text style={styles.setupText}>
              Your skills, certificates, and stats will appear here once your cooperative account is activated by an admin.
            </Text>
          </View>
        </View>
      )}

      <View style={styles.hero}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{avatarInitial}</Text>
        </View>
        <Text style={styles.name}>{displayName}</Text>
        {rating != null ? <StarRating rating={rating} size={18} /> : <Text style={styles.notRated}>Not rated yet</Text>}
        <Text style={styles.jobsDone}>{totalJobs} jobs completed</Text>
      </View>

      <View style={styles.card}>
        <InfoItem icon={Mail} label="Email" value={displayEmail} />
        <InfoItem icon={Phone} label="Phone" value={displayPhone} />
        <InfoItem icon={Users} label="Cooperative" value={cooperative} />
        <InfoItem icon={Calendar} label="Joined" value={joinDate} last />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Skills</Text>
        {skills.length > 0 ? (
          <View style={styles.badgeRow}>
            {skills.map((skill) => (
              <Badge key={skill} variant="primary" size="md">{skill}</Badge>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>No skills listed yet. Skills will be added by your cooperative admin.</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Certificates</Text>
        {certificates.length > 0 ? (
          certificates.map((cert, i) => (
            <View key={i} style={[styles.certRow, i < certificates.length - 1 && styles.certRowBorder]}>
              <Award size={18} color={colors.accent500} />
              <View style={{ flex: 1 }}>
                <Text style={styles.certName}>{cert.name}</Text>
                <Text style={styles.certMeta}>{cert.issuer} • {cert.date}</Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No certificates yet. Complete training modules to earn certificates.</Text>
        )}
      </View>

      <Pressable style={styles.logoutBtn} onPress={logout}>
        <LogOut size={18} color={colors.danger600} />
        <Text style={styles.logoutText}>Log Out</Text>
      </Pressable>
    </ScreenContainer>
  );
}

function InfoItem({ icon: Icon, label, value, last }) {
  return (
    <View style={[styles.infoItem, !last && styles.infoItemBorder]}>
      <View style={styles.infoIcon}>
        <Icon size={18} color={colors.accent600} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: fontSizes.fs2xl, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.gray900, marginBottom: spacing.space4 },
  setupCard: { flexDirection: 'row', gap: spacing.space3, marginBottom: spacing.space4, padding: spacing.space4, backgroundColor: colors.warning50, borderRadius: radii.radiusLg, borderLeftWidth: 4, borderLeftColor: colors.warning500 },
  setupTitle: { fontSize: fontSizes.fsSm, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.gray900 },
  setupText: { fontSize: fontSizes.fsXs, color: colors.gray600, fontFamily: fontFamilies.interRegular, marginTop: 2 },
  hero: { alignItems: 'center', backgroundColor: colors.surfaceWhite, borderRadius: radii.radiusXl, paddingVertical: spacing.space6, ...shadows.shadowSm },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.accent600, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.space3 },
  avatarText: { fontSize: fontSizes.fs2xl, fontWeight: fontWeights.fwExtrabold, fontFamily: fontFamilies.interExtraBold, color: colors.white },
  name: { fontSize: fontSizes.fsXl, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.gray900, marginBottom: 4 },
  notRated: { fontSize: fontSizes.fsSm, color: colors.gray500, fontFamily: fontFamilies.interRegular },
  jobsDone: { fontSize: fontSizes.fsSm, color: colors.gray500, fontFamily: fontFamilies.interRegular, marginTop: 4 },
  card: { backgroundColor: colors.surfaceWhite, borderRadius: radii.radiusLg, padding: spacing.space4, marginTop: spacing.space4, ...shadows.shadowSm },
  cardTitle: { fontSize: fontSizes.fsBase, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.gray900, marginBottom: spacing.space3 },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.space3, paddingVertical: spacing.space3 },
  infoItemBorder: { borderBottomWidth: 1, borderBottomColor: colors.gray100 },
  infoIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accent50, alignItems: 'center', justifyContent: 'center' },
  infoLabel: { fontSize: fontSizes.fsXs, color: colors.gray400, fontFamily: fontFamilies.interMedium },
  infoValue: { fontSize: fontSizes.fsSm, color: colors.gray900, fontFamily: fontFamilies.interMedium },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.space2 },
  emptyText: { fontSize: fontSizes.fsSm, color: colors.gray500, fontFamily: fontFamilies.interRegular },
  certRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.space3, paddingVertical: spacing.space3 },
  certRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.gray100 },
  certName: { fontSize: fontSizes.fsSm, fontWeight: fontWeights.fwSemibold, fontFamily: fontFamilies.interSemiBold, color: colors.gray900 },
  certMeta: { fontSize: fontSizes.fsXs, color: colors.gray500, fontFamily: fontFamilies.interRegular },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.space2, height: 52, marginTop: spacing.space4, borderRadius: radii.radiusMd, borderWidth: 1.5, borderColor: colors.danger200, backgroundColor: colors.danger50 },
  logoutText: { fontSize: fontSizes.fsBase, fontWeight: fontWeights.fwSemibold, fontFamily: fontFamilies.interSemiBold, color: colors.danger600 },
});
