import { View, Text, Pressable, Image, StyleSheet } from 'react-native';
import {
  Mail, Phone, MapPin, Globe, LogOut, ChevronRight,
  CalendarCheck, CheckCircle2, Clock, ShieldCheck,
} from 'lucide-react-native';
import { useAuth } from '@context/AuthContext';
import { useLanguage } from '@context/LanguageContext';
import { ScreenContainer, GradientBand } from '@components/app';
import AvatarPortrait from '@components/illustrations/AvatarPortrait';
import { getBookingsByCustomer } from '@data/mockBookings';
import brandLogo from '@assets/logo.png';
import { colors, spacing, radii, shadows, fontSizes, fontWeights, fontFamilies } from '@theme';

/**
 * CustomerProfileScreen — ported from web pages/customer/CustomerProfile.jsx.
 *
 * FRONTEND-ONLY REDESIGN (Phase: premium profile). No backend/data/nav/auth changes:
 *   - Data still comes from useAuth() (user/profile) + useLanguage(), read exactly as before
 *     (profile-first, user fallback). Logout is the SAME `logout` from AuthContext.
 *   - The "Your Activity" counts are derived live from the EXISTING getBookingsByCustomer()
 *     data source (already used by the dashboard) — no new fields, no fake/hardcoded numbers.
 *     This is a CUSTOMER account: intentionally NO rating / star metric anywhere.
 *
 * Deliberately OMITTED because the underlying data/functionality does not exist (per the rule
 * "omit rather than invent a backend field"):
 *   - Profile photo: the customer profile has no image field, so the avatar shows the initial
 *     fallback over a brand gradient. No camera/upload affordance (no upload feature exists).
 *   - "Verified Customer" badge: no customer verification/status value exists on the profile.
 *   - "Edit Profile" button: no customer profile-edit screen/route exists in the navigation.
 *
 * The bottom tab bar (CustomerTabs) and the global floating ChatWidget/Helpline live outside
 * this screen and are shared across portals; they already use the lavender/indigo language and
 * are intentionally left untouched to avoid changing shared navigation/behavior.
 */

export default function CustomerProfileScreen() {
  const { user, profile, logout } = useAuth();
  const { language } = useLanguage();

  const name = profile?.full_name || user?.name || 'User';
  const email = user?.email || profile?.email || '—';
  const phone = profile?.phone || user?.phone || '—';
  const address = profile?.city || user?.address || '—';
  const langLabel = language === 'hi' ? 'हिन्दी' : language === 'bn' ? 'বাংলা' : 'English';
  // Use the EXISTING avatar field if the app provides one (mockUsers.avatar / profile.avatar_url);
  // otherwise gracefully fall back to the initial. No new field, no fake photo.
  const avatarUrl = profile?.avatar_url || user?.avatar || null;
  const savedAddresses = user?.savedAddresses;

  // Live activity counts from the existing bookings data source (same helper the dashboard uses).
  // Derived only — no new state, no backend, no fake values. Guarded so an empty list is fine.
  const bookings = getBookingsByCustomer(user?.id) || [];
  const totalBookings = bookings.length;
  const completedBookings = bookings.filter((b) => b.status === 'completed').length;
  const activeBookings = bookings.filter((b) =>
    ['en-route', 'in-progress', 'assigned'].includes(b.status)
  ).length;
  const hasActivity = totalBookings > 0;

  return (
    <ScreenContainer>
      <Text style={styles.h1}>My Profile</Text>
      <Text style={styles.h1Sub}>Manage your account information</Text>

      {/* ---- Hero: brand-gradient profile header ---- */}
      <GradientBand
        colors={['#4f46e5', '#6d28d9', '#7c3aed']}
        angle="diagonal"
        decor
        style={styles.hero}
      >
        <View style={styles.heroRow}>
          <View style={styles.avatarRing}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
            ) : (
              <View style={styles.avatarImg}>
                <AvatarPortrait size={64} seed={user?.id || name} />
              </View>
            )}
          </View>
          <View style={styles.heroTextWrap}>
            <Text style={styles.name} numberOfLines={1}>{name}</Text>
            <Text style={styles.role}>Customer Account</Text>
            <View style={styles.memberPill}>
              <ShieldCheck size={12} color={colors.white} strokeWidth={2.4} />
              <Text style={styles.memberPillText}>Sahakar Seva Member</Text>
            </View>
          </View>
        </View>
      </GradientBand>

      {/* ---- Your Activity (only when real bookings exist; NO rating) ---- */}
      {hasActivity ? (
        <View style={styles.statsCard}>
          <StatCell icon={CalendarCheck} tint={colors.primary600} bg={colors.primary50} value={totalBookings} label="Total" />
          <View style={styles.statDivider} />
          <StatCell icon={CheckCircle2} tint={colors.success600} bg={colors.success50} value={completedBookings} label="Completed" />
          <View style={styles.statDivider} />
          <StatCell icon={Clock} tint={colors.accent600} bg={colors.accent50} value={activeBookings} label="Active" />
        </View>
      ) : null}

      {/* ---- Personal Information ---- */}
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>Personal Information</Text>
        <Text style={styles.sectionSub}>Your account details</Text>
      </View>
      <View style={styles.card}>
        <InfoItem icon={Mail} tint={colors.primary600} bg={colors.primary50} label="Email" value={email} />
        <InfoItem icon={Phone} tint={colors.success600} bg={colors.success50} label="Phone" value={phone} />
        <InfoItem icon={MapPin} tint={colors.danger500} bg={colors.danger50} label="Location" value={address} />
        <InfoItem icon={Globe} tint={colors.accent600} bg={colors.accent50} label="Language" value={langLabel} last />
      </View>

      {/* ---- Saved Addresses (existing data; only when present) ---- */}
      {savedAddresses?.length ? (
        <>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Saved Addresses</Text>
            <Text style={styles.sectionSub}>Where we deliver your services</Text>
          </View>
          <View style={styles.card}>
            {savedAddresses.map((addr, i) => (
              <View
                key={`${addr.label}-${i}`}
                style={[styles.savedRow, i !== savedAddresses.length - 1 && styles.infoItemBorder]}
              >
                <View style={[styles.infoIcon, { backgroundColor: colors.primary50 }]}>
                  <MapPin size={18} color={colors.primary600} strokeWidth={2.2} />
                </View>
                <View style={styles.infoTextWrap}>
                  <Text style={styles.savedLabel}>{addr.label}</Text>
                  <Text style={styles.savedAddr} numberOfLines={2}>{addr.address}</Text>
                </View>
              </View>
            ))}
          </View>
        </>
      ) : null}

      {/* ---- Account Actions ---- */}
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>Account Actions</Text>
        <Text style={styles.sectionSub}>Manage your session</Text>
      </View>
      <View style={styles.card}>
        <Pressable
          style={({ pressed }) => [styles.logoutRow, pressed && styles.logoutRowPressed]}
          onPress={logout}
          accessibilityRole="button"
          accessibilityLabel="Log out"
        >
          <View style={styles.logoutIcon}>
            <LogOut size={18} color={colors.danger600} strokeWidth={2.2} />
          </View>
          <Text style={styles.logoutText}>Log Out</Text>
          <ChevronRight size={18} color={colors.danger300} strokeWidth={2.2} />
        </Pressable>
      </View>

      {/* ---- Branding banner (reuses the existing brand logo asset) ---- */}
      <View style={styles.brandBanner}>
        <Image source={brandLogo} style={styles.brandLogo} resizeMode="contain" />
        <View style={styles.brandTextWrap}>
          <Text style={styles.brandThanks}>Thank you for being part of</Text>
          <Text style={styles.brandName}>Sahakar Seva</Text>
          <Text style={styles.brandTagline}>Cleaner homes. Stronger communities.</Text>
        </View>
      </View>
    </ScreenContainer>
  );
}

function StatCell({ icon: Icon, tint, bg, value, label }) {
  return (
    <View style={styles.statCell}>
      <View style={[styles.statIcon, { backgroundColor: bg }]}>
        <Icon size={17} color={tint} strokeWidth={2.2} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel} numberOfLines={1}>{label}</Text>
    </View>
  );
}

function InfoItem({ icon: Icon, tint, bg, label, value, last }) {
  return (
    <View style={[styles.infoItem, !last && styles.infoItemBorder]}>
      <View style={[styles.infoIcon, { backgroundColor: bg }]}>
        <Icon size={18} color={tint} strokeWidth={2.2} />
      </View>
      <View style={styles.infoTextWrap}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: fontSizes.fs2xl, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.gray900 },
  h1Sub: { fontSize: fontSizes.fsSm, color: colors.gray500, fontFamily: fontFamilies.interRegular, marginTop: 2, marginBottom: spacing.space4 },

  // ---- Hero ----
  hero: { borderRadius: radii.radiusXl, padding: spacing.space5, overflow: 'hidden', ...shadows.shadowLg },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.space4 },
  avatarRing: {
    width: 76, height: 76, borderRadius: 38,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  avatar: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.95)', alignItems: 'center', justifyContent: 'center',
  },
  avatarImg: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.95)' },
  avatarText: { fontSize: fontSizes.fs2xl, fontWeight: fontWeights.fwExtrabold, fontFamily: fontFamilies.interExtraBold, color: colors.primary700 },
  heroTextWrap: { flex: 1 },
  name: { fontSize: fontSizes.fsXl, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.white },
  role: { fontSize: fontSizes.fsSm, color: 'rgba(255,255,255,0.85)', fontFamily: fontFamilies.interMedium, marginTop: 1 },
  memberPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start',
    marginTop: spacing.space2, paddingVertical: 4, paddingHorizontal: 10,
    borderRadius: radii.radiusFull, backgroundColor: 'rgba(255,255,255,0.18)',
  },
  memberPillText: { fontSize: fontSizes.fsXs, color: colors.white, fontFamily: fontFamilies.interSemiBold, fontWeight: fontWeights.fwSemibold },

  // ---- Stats ----
  statsCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surfaceWhite, borderRadius: radii.radiusLg,
    paddingVertical: spacing.space4, marginTop: spacing.space4, ...shadows.shadowSm,
  },
  statCell: { flex: 1, alignItems: 'center', gap: 4, paddingHorizontal: spacing.space1 },
  statIcon: { width: 34, height: 34, borderRadius: radii.radiusFull, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  statValue: { fontSize: fontSizes.fsXl, fontWeight: fontWeights.fwExtrabold, fontFamily: fontFamilies.interExtraBold, color: colors.gray900 },
  statLabel: { fontSize: fontSizes.fsXs, color: colors.gray500, fontFamily: fontFamilies.interMedium },
  statDivider: { width: 1, alignSelf: 'stretch', marginVertical: spacing.space2, backgroundColor: colors.gray100 },

  // ---- Sections ----
  sectionHead: { marginTop: spacing.space5, marginBottom: spacing.space2, paddingHorizontal: spacing.space1 },
  sectionTitle: { fontSize: fontSizes.fsBase, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.gray900 },
  sectionSub: { fontSize: fontSizes.fsXs, color: colors.gray400, fontFamily: fontFamilies.interRegular, marginTop: 1 },

  card: { backgroundColor: colors.surfaceWhite, borderRadius: radii.radiusLg, paddingHorizontal: spacing.space4, ...shadows.shadowSm },

  // ---- Info rows ----
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.space3, paddingVertical: spacing.space3 },
  infoItemBorder: { borderBottomWidth: 1, borderBottomColor: colors.gray100 },
  infoIcon: { width: 40, height: 40, borderRadius: radii.radiusFull, alignItems: 'center', justifyContent: 'center' },
  infoTextWrap: { flex: 1 },
  infoLabel: { fontSize: fontSizes.fsXs, color: colors.gray400, fontFamily: fontFamilies.interMedium },
  infoValue: { fontSize: fontSizes.fsSm, color: colors.gray900, fontFamily: fontFamilies.interSemiBold, fontWeight: fontWeights.fwSemibold, marginTop: 1 },

  // ---- Saved addresses ----
  savedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.space3, paddingVertical: spacing.space3 },
  savedLabel: { fontSize: fontSizes.fsSm, fontWeight: fontWeights.fwSemibold, fontFamily: fontFamilies.interSemiBold, color: colors.gray900 },
  savedAddr: { fontSize: fontSizes.fsXs, color: colors.gray500, fontFamily: fontFamilies.interRegular, marginTop: 1 },

  // ---- Logout ----
  logoutRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.space3, paddingVertical: spacing.space3 },
  logoutRowPressed: { opacity: 0.6 },
  logoutIcon: { width: 40, height: 40, borderRadius: radii.radiusFull, backgroundColor: colors.danger50, alignItems: 'center', justifyContent: 'center' },
  logoutText: { flex: 1, fontSize: fontSizes.fsBase, fontWeight: fontWeights.fwSemibold, fontFamily: fontFamilies.interSemiBold, color: colors.danger600 },

  // ---- Branding banner ----
  brandBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.space3,
    marginTop: spacing.space5, padding: spacing.space4,
    borderRadius: radii.radiusLg, backgroundColor: colors.primary50,
    borderWidth: 1, borderColor: colors.primary100,
  },
  brandLogo: { width: 44, height: 44, borderRadius: radii.radiusMd },
  brandTextWrap: { flex: 1 },
  brandThanks: { fontSize: fontSizes.fsXs, color: colors.gray500, fontFamily: fontFamilies.interRegular },
  brandName: { fontSize: fontSizes.fsBase, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.primary700, marginTop: 1 },
  brandTagline: { fontSize: fontSizes.fsXs, color: colors.gray500, fontFamily: fontFamilies.interRegular, marginTop: 2 },
});
