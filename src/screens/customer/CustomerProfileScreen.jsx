import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Mail, Phone, MapPin, Globe, LogOut } from 'lucide-react-native';
import { useAuth } from '@context/AuthContext';
import { useLanguage } from '@context/LanguageContext';
import { ScreenContainer } from '@components/app';
import { colors, spacing, radii, shadows, fontSizes, fontWeights, fontFamilies } from '@theme';

/**
 * CustomerProfileScreen — ported from web pages/customer/CustomerProfile.jsx.
 *
 * Modern profile layout: a hero header card (large avatar, name, role) over the app canvas,
 * an info list, saved addresses, and a logout action (the web logout lived in the layout
 * sidebar which we dropped; a profile logout is the standard mobile placement).
 *
 * Web read from `user` (name/email/phone/address/language). With the demo/Supabase split, the
 * richer fields live on `profile` (full_name/phone/city) while savedAddresses/language come
 * from the mockUsers seed shape via `user`. We read profile first, fall back to user.
 */

export default function CustomerProfileScreen() {
  const { user, profile, logout } = useAuth();
  const { language } = useLanguage();

  const name = profile?.full_name || user?.name || 'User';
  const email = user?.email || profile?.email || '—';
  const phone = profile?.phone || user?.phone || '—';
  const address = profile?.city || user?.address || '—';
  const langLabel = language === 'hi' ? 'हिन्दी' : language === 'bn' ? 'বাংলা' : 'English';
  const savedAddresses = user?.savedAddresses;

  return (
    <ScreenContainer>
      <Text style={styles.h1}>My Profile</Text>

      <View style={styles.hero}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{name[0]?.toUpperCase() || 'U'}</Text>
        </View>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.role}>Customer Account</Text>
      </View>

      <View style={styles.card}>
        <InfoItem icon={Mail} label="Email" value={email} />
        <InfoItem icon={Phone} label="Phone" value={phone} />
        <InfoItem icon={MapPin} label="Location" value={address} />
        <InfoItem icon={Globe} label="Language" value={langLabel} last />
      </View>

      {savedAddresses?.length ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Saved Addresses</Text>
          {savedAddresses.map((addr, i) => (
            <View key={i} style={styles.savedRow}>
              <MapPin size={16} color={colors.primary600} />
              <View style={{ flex: 1 }}>
                <Text style={styles.savedLabel}>{addr.label}</Text>
                <Text style={styles.savedAddr}>{addr.address}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}

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
        <Icon size={18} color={colors.primary600} />
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
  hero: { alignItems: 'center', backgroundColor: colors.surfaceWhite, borderRadius: radii.radiusXl, paddingVertical: spacing.space6, ...shadows.shadowSm },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary600, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.space3 },
  avatarText: { fontSize: fontSizes.fs2xl, fontWeight: fontWeights.fwExtrabold, fontFamily: fontFamilies.interExtraBold, color: colors.white },
  name: { fontSize: fontSizes.fsXl, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.gray900 },
  role: { fontSize: fontSizes.fsSm, color: colors.gray500, fontFamily: fontFamilies.interRegular },
  card: { backgroundColor: colors.surfaceWhite, borderRadius: radii.radiusLg, padding: spacing.space4, marginTop: spacing.space4, ...shadows.shadowSm },
  cardTitle: { fontSize: fontSizes.fsBase, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.gray900, marginBottom: spacing.space3 },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.space3, paddingVertical: spacing.space3 },
  infoItemBorder: { borderBottomWidth: 1, borderBottomColor: colors.gray100 },
  infoIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary50, alignItems: 'center', justifyContent: 'center' },
  infoLabel: { fontSize: fontSizes.fsXs, color: colors.gray400, fontFamily: fontFamilies.interMedium },
  infoValue: { fontSize: fontSizes.fsSm, color: colors.gray900, fontFamily: fontFamilies.interMedium },
  savedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.space3, paddingVertical: spacing.space2 },
  savedLabel: { fontSize: fontSizes.fsSm, fontWeight: fontWeights.fwSemibold, fontFamily: fontFamilies.interSemiBold, color: colors.gray900 },
  savedAddr: { fontSize: fontSizes.fsXs, color: colors.gray500, fontFamily: fontFamilies.interRegular },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.space2, height: 52, marginTop: spacing.space4, borderRadius: radii.radiusMd, borderWidth: 1.5, borderColor: colors.danger200, backgroundColor: colors.danger50 },
  logoutText: { fontSize: fontSizes.fsBase, fontWeight: fontWeights.fwSemibold, fontFamily: fontFamilies.interSemiBold, color: colors.danger600 },
});
