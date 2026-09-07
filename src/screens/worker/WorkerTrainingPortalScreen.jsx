import { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { BookOpen, Play, CheckCircle, Clock, MapPin, Award, FileText, WifiOff } from 'lucide-react-native';
import { ScreenContainer } from '@components/app';
import { Chip, ChipRow } from '@components/app';
import Badge from '@components/ui/Badge';
import { colors, spacing, radii, shadows, fontSizes, fontWeights, fontFamilies } from '@theme';

/**
 * WorkerTrainingPortalScreen — ported from web pages/worker/WorkerTrainingPortal.jsx. Course
 * cards (progress bars, cert-earned, enroll w/ 1.5s loading), filter chips, stats, Seva Kendra
 * list, and the offline WifiOff indicator. enroll setTimeout + filter logic preserved verbatim.
 */

const COURSES = [
  { id: 1, title: 'Plumbing Fundamentals', titleHi: 'प्लम्बिंग बुनियादी', duration: '40 hrs', level: 'Beginner', type: 'offline', center: 'Delhi Seva Kendra, Rohini', enrolled: true, progress: 65, modules: 12, completed: 8, cert: false, icon: '🔧', color: '#3b82f6' },
  { id: 2, title: 'Electrical Safety & Wiring', titleHi: 'विद्युत सुरक्षा', duration: '50 hrs', level: 'Beginner', type: 'hybrid', center: 'Gurugram ITI Campus', enrolled: false, progress: 0, modules: 15, completed: 0, cert: false, icon: '⚡', color: '#f59e0b' },
  { id: 3, title: 'AC Repair & Refrigeration', titleHi: 'एसी मरम्मत', duration: '60 hrs', level: 'Intermediate', type: 'offline', center: 'NSDC Partner Center, Noida', enrolled: false, progress: 0, modules: 18, completed: 0, cert: false, icon: '❄️', color: '#06b6d4' },
  { id: 4, title: 'Home Cleaning & Hygiene', titleHi: 'सफाई प्रशिक्षण', duration: '20 hrs', level: 'Beginner', type: 'online', center: 'Online Only', enrolled: true, progress: 100, modules: 8, completed: 8, cert: true, icon: '🧹', color: '#10b981' },
  { id: 5, title: 'Carpentry & Woodwork Basics', titleHi: 'बढ़ईगिरी', duration: '45 hrs', level: 'Beginner', type: 'offline', center: 'Jaipur Skill Hub', enrolled: false, progress: 0, modules: 14, completed: 0, cert: false, icon: '🔨', color: '#ef4444' },
];

const SEVA_KENDRAS = [
  { city: 'Delhi', address: 'Rohini Sector 15, Delhi - 110085', phone: '011-XXXX-XXXX', open: 'Mon–Sat 9AM–6PM' },
  { city: 'Gurugram', address: 'DLF Phase 2, Gurugram - 122002', phone: '0124-XXXX-XXXX', open: 'Mon–Sat 9AM–6PM' },
  { city: 'Noida', address: 'Sector 18, Noida - 201301', phone: '0120-XXXX-XXXX', open: 'Mon–Sat 9AM–6PM' },
  { city: 'Jaipur', address: 'Malviya Nagar, Jaipur - 302017', phone: '0141-XXXX-XXXX', open: 'Mon–Sat 9AM–5PM' },
];

const TYPE_LABELS = { offline: '🏢 Offline', hybrid: '🔀 Hybrid', online: '💻 Online' };
const LEVEL_VARIANTS = { Beginner: 'success', Intermediate: 'warning', Advanced: 'danger' };
const FILTERS = ['all', 'enrolled', 'offline', 'online', 'hybrid'];

export default function WorkerTrainingPortalScreen() {
  const [filter, setFilter] = useState('all');
  const [enrolling, setEnrolling] = useState(null);
  const [courses, setCourses] = useState(COURSES);

  const handleEnroll = (id) => {
    setEnrolling(id);
    setTimeout(() => {
      setCourses((prev) => prev.map((c) => (c.id === id ? { ...c, enrolled: true } : c)));
      setEnrolling(null);
    }, 1500);
  };

  const filtered =
    filter === 'all' ? courses : filter === 'enrolled' ? courses.filter((c) => c.enrolled) : courses.filter((c) => c.type === filter);

  const enrolledCount = courses.filter((c) => c.enrolled).length;
  const certCount = courses.filter((c) => c.cert).length;
  const avgProgress = Math.round(
    courses.filter((c) => c.enrolled).reduce((a, c) => a + c.progress, 0) / Math.max(enrolledCount, 1),
  );

  return (
    <ScreenContainer>
      <Text style={styles.h1}>🎓 Training Portal</Text>
      <Text style={styles.sub}>कौशल विकास प्रशिक्षण • Skill Development</Text>

      <View style={styles.internBadge}>
        <Award size={14} color={colors.warning800} />
        <Text style={styles.internText}>Internship Program • Government-Certified</Text>
      </View>

      {/* Offline indicator (preserved from web WifiOff affordance) */}
      <View style={styles.offlineRow}>
        <WifiOff size={13} color={colors.gray400} />
        <Text style={styles.offlineText}>Course content available offline at Seva Kendras</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <Stat value={enrolledCount} label="Enrolled" />
        <Stat value={certCount} label="Certificates" />
        <Stat value={`${avgProgress}%`} label="Avg. Progress" />
      </View>

      {/* Filters */}
      <ChipRow contentStyle={{ marginTop: spacing.space4, marginBottom: spacing.space4 }}>
        {FILTERS.map((f) => (
          <Chip
            key={f}
            label={f === 'all' ? 'All Courses' : f === 'enrolled' ? 'My Courses' : TYPE_LABELS[f] || f}
            selected={filter === f}
            onPress={() => setFilter(f)}
          />
        ))}
      </ChipRow>

      {/* Course cards */}
      <View style={styles.courseList}>
        {filtered.map((course) => (
          <View key={course.id} style={[styles.courseCard, course.enrolled && styles.courseEnrolled]}>
            <View style={styles.courseHeader}>
              <View style={[styles.courseIcon, { backgroundColor: course.color + '1A' }]}>
                <Text style={styles.courseEmoji}>{course.icon}</Text>
              </View>
              <View style={styles.courseBadges}>
                <Badge variant={LEVEL_VARIANTS[course.level]} size="sm">{course.level}</Badge>
                <Badge variant="default" size="sm">{TYPE_LABELS[course.type]}</Badge>
              </View>
            </View>

            <Text style={styles.courseTitle}>{course.title}</Text>
            <Text style={styles.courseHindi}>{course.titleHi}</Text>

            <View style={styles.courseMeta}>
              <View style={styles.metaItem}><Clock size={12} color={colors.gray400} /><Text style={styles.metaText}>{course.duration}</Text></View>
              <View style={styles.metaItem}><BookOpen size={12} color={colors.gray400} /><Text style={styles.metaText}>{course.modules} Modules</Text></View>
              {course.type !== 'online' && (
                <View style={styles.metaItem}><MapPin size={12} color={colors.gray400} /><Text style={styles.metaText} numberOfLines={1}>{course.center}</Text></View>
              )}
            </View>

            {course.enrolled && (
              <View style={styles.progressWrap}>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${course.progress}%`, backgroundColor: course.color }]} />
                </View>
                <Text style={styles.progressText}>{course.progress}% • {course.completed}/{course.modules} modules</Text>
              </View>
            )}

            {course.cert && (
              <View style={styles.certEarned}>
                <CheckCircle size={14} color={colors.success600} />
                <Text style={styles.certEarnedText}>Certificate Earned! Download →</Text>
              </View>
            )}

            <View style={styles.courseActions}>
              {course.enrolled ? (
                <Pressable style={[styles.enrollBtn, { backgroundColor: course.color }]}>
                  <Play size={15} color={colors.white} />
                  <Text style={styles.enrollBtnText}>{course.progress === 100 ? 'Review' : 'Continue →'}</Text>
                </Pressable>
              ) : (
                <Pressable style={styles.enrollBtn} onPress={() => handleEnroll(course.id)} disabled={enrolling === course.id}>
                  {enrolling === course.id ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <Text style={styles.enrollBtnText}>Enroll Free</Text>
                  )}
                </Pressable>
              )}
              <Pressable style={styles.syllabusBtn}>
                <FileText size={15} color={colors.gray600} />
                <Text style={styles.syllabusText}>Syllabus</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </View>

      {/* Seva Kendras */}
      <View style={styles.kendraSection}>
        <Text style={styles.kendraTitle}>🏢 Nearest Offline Seva Kendras</Text>
        <Text style={styles.sub}>Visit any center for in-person registration & training support</Text>
        <View style={styles.kendraList}>
          {SEVA_KENDRAS.map((k) => (
            <View key={k.city} style={styles.kendraCard}>
              <Text style={styles.kendraCity}>{k.city}</Text>
              <View style={styles.kendraRow}><MapPin size={12} color={colors.gray400} /><Text style={styles.kendraText}>{k.address}</Text></View>
              <Text style={styles.kendraText}>📞 {k.phone}</Text>
              <View style={styles.kendraRow}><Clock size={12} color={colors.gray400} /><Text style={styles.kendraText}>{k.open}</Text></View>
            </View>
          ))}
        </View>
      </View>
    </ScreenContainer>
  );
}

function Stat({ value, label }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statVal}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: fontSizes.fs2xl, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.gray900 },
  sub: { fontSize: fontSizes.fsSm, color: colors.gray500, fontFamily: fontFamilies.interRegular, marginTop: 2 },
  internBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: spacing.space3, backgroundColor: colors.accent100, paddingVertical: 4, paddingHorizontal: 10, borderRadius: radii.radiusFull },
  internText: { fontSize: fontSizes.fsXs, fontWeight: fontWeights.fwSemibold, fontFamily: fontFamilies.interSemiBold, color: colors.warning800 },
  offlineRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.space3 },
  offlineText: { fontSize: fontSizes.fsXs, color: colors.gray400, fontFamily: fontFamilies.interRegular },
  statsRow: { flexDirection: 'row', gap: spacing.space3, marginTop: spacing.space4 },
  stat: { flex: 1, backgroundColor: colors.surfaceWhite, borderRadius: radii.radiusLg, padding: spacing.space4, alignItems: 'center', ...shadows.shadowSm },
  statVal: { fontSize: fontSizes.fsXl, fontWeight: fontWeights.fwExtrabold, fontFamily: fontFamilies.interExtraBold, color: colors.accent600 },
  statLabel: { fontSize: fontSizes.fsXs, color: colors.gray500, fontFamily: fontFamilies.interRegular, marginTop: 2, textAlign: 'center' },
  courseList: { gap: spacing.space3 },
  courseCard: { backgroundColor: colors.surfaceWhite, borderRadius: radii.radiusLg, padding: spacing.space4, ...shadows.shadowSm },
  courseEnrolled: { borderWidth: 1, borderColor: colors.accent200 },
  courseHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.space2 },
  courseIcon: { width: 44, height: 44, borderRadius: radii.radiusMd, alignItems: 'center', justifyContent: 'center' },
  courseEmoji: { fontSize: 22 },
  courseBadges: { flexDirection: 'row', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end', flex: 1, marginLeft: spacing.space2 },
  courseTitle: { fontSize: fontSizes.fsBase, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.gray900 },
  courseHindi: { fontSize: fontSizes.fsSm, color: colors.gray500, fontFamily: fontFamilies.notoDevanagariRegular, marginBottom: spacing.space2 },
  courseMeta: { gap: 4, marginBottom: spacing.space2 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontSize: fontSizes.fsXs, color: colors.gray500, fontFamily: fontFamilies.interRegular, flexShrink: 1 },
  progressWrap: { marginTop: spacing.space2 },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: colors.gray200, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  progressText: { fontSize: fontSizes.fsXs, color: colors.gray500, fontFamily: fontFamilies.interRegular, marginTop: 4 },
  certEarned: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.space2, backgroundColor: colors.success50, borderRadius: radii.radiusMd, padding: spacing.space2 },
  certEarnedText: { fontSize: fontSizes.fsXs, fontWeight: fontWeights.fwSemibold, fontFamily: fontFamilies.interSemiBold, color: colors.success700 },
  courseActions: { flexDirection: 'row', gap: spacing.space2, marginTop: spacing.space3 },
  enrollBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 42, borderRadius: radii.radiusMd, backgroundColor: colors.accent600 },
  enrollBtnText: { fontSize: fontSizes.fsSm, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.white },
  syllabusBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.space3, height: 42, borderRadius: radii.radiusMd, borderWidth: 1.5, borderColor: colors.gray200 },
  syllabusText: { fontSize: fontSizes.fsSm, fontWeight: fontWeights.fwMedium, fontFamily: fontFamilies.interMedium, color: colors.gray600 },
  kendraSection: { marginTop: spacing.space6 },
  kendraTitle: { fontSize: fontSizes.fsLg, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.gray900 },
  kendraList: { gap: spacing.space3, marginTop: spacing.space3 },
  kendraCard: { backgroundColor: colors.surfaceWhite, borderRadius: radii.radiusLg, padding: spacing.space4, ...shadows.shadowSm },
  kendraCity: { fontSize: fontSizes.fsBase, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.gray900, marginBottom: 4 },
  kendraRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  kendraText: { fontSize: fontSizes.fsXs, color: colors.gray500, fontFamily: fontFamilies.interRegular, flexShrink: 1 },
});
