import { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator, Linking, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Eye,
  EyeOff,
  User,
  Wrench,
  Shield,
  ChevronRight,
  Phone,
  BadgeCheck,
  MapPin,
  Droplet,
  Paintbrush,
  Hammer,
  Zap,
  Wind,
  Wallet,
  ClipboardList,
  TrendingUp,
  Landmark,
  ArrowRight,
} from 'lucide-react-native';
import { useAuth } from '@context/AuthContext';
import { CustomerIllustration, WorkerIllustration } from '@components/illustrations/RoleIllustrations';
import { BrandLogo } from '@components/app';
import { colors, spacing, radii, shadows, fontSizes, fontWeights, fontFamilies } from '@theme';

/**
 * LoginScreen — ported from web pages/auth/LoginPage.jsx + AuthPages.css.
 *
 * Behaviour preserved exactly:
 *  - Role picker first (customer/worker cards + admin link); selecting customer/worker
 *    pre-fills the demo credentials, admin does not (real Supabase account required).
 *  - handleLogin validates non-empty, calls auth.login, shows error on failure.
 *  - On success: web navigated by role. Here navigation is STRUCTURAL — RootNavigator swaps to
 *    the correct portal tree the moment AuthContext.role updates, so there's no explicit
 *    navigate() call after login (that's the conditional-tree pattern from Phase 5). The
 *    selectedRole is still tracked for the demo pre-fill + the "Sign In as …" button label.
 *  - Password show/hide toggle, demo-hint text, and the register link (carrying role) preserved.
 *  - Register link: web used <Link state={{ role }}>; here navigation.navigate('Register',{role}).
 *
 * VISUAL REDESIGN (frontend-only — no behaviour, navigation, auth, or text meaning changed):
 *  - Premium light theme: soft lavender/cream page instead of the flat dark-indigo card-on-navy.
 *    Subtle layered background blobs replace the web's blurred "orb" divs (solid low-opacity
 *    fills, no native blur dependency added).
 *  - Role picker presented as two spacious cards with an eyebrow label, the SAME bilingual
 *    titles ("सेवा चाहिए" / "सेवा देना है") and English sublines, a circular chevron, and a row
 *    of DECORATIVE-ONLY chips (popular service names for the customer card; benefit labels for
 *    the worker card). Those chips are non-interactive design accents mirroring the reference —
 *    they wire up to NOTHING. Only the card itself is pressable and it still calls
 *    handleRoleSelect(role) exactly as before.
 *  - A "Why Sahakar Seva?" trust row (Verified workers / Local services / Trusted) is decorative.
 *  - Helpline card's "Call Now" dials via Linking.openURL('tel:…') — the same dialer pattern
 *    HelplineModal already uses; the number and 24x7 copy are unchanged.
 */

const DEMO_CREDENTIALS = {
  customer: { email: 'demo.customer@sahakar.in', password: 'demo123' },
  worker: { email: 'demo.worker@sahakar.in', password: 'demo123' },
  // admin: no demo bypass — real Supabase account required
};

// DECORATIVE-ONLY: popular service names shown as chips on the customer card, mirroring the
// reference design. These are NOT buttons and trigger NO navigation — pure visual accent.
const CUSTOMER_SERVICE_CHIPS = [
  { icon: Zap, label: 'Electrician' },
  { icon: Droplet, label: 'Plumber' },
  { icon: Wind, label: 'Cleaner' },
  { icon: Hammer, label: 'Carpenter' },
  { icon: Paintbrush, label: 'Painter' },
];

// DECORATIVE-ONLY: benefit labels shown on the worker card, mirroring the reference design.
const WORKER_BENEFIT_CHIPS = [
  { icon: Wallet, label: 'Earn daily' },
  { icon: ClipboardList, label: 'Get service requests' },
  { icon: TrendingUp, label: 'Build your reputation' },
];

export default function LoginScreen({ navigation }) {
  const { login, loading } = useAuth();
  const insets = useSafeAreaInsets();

  const [selectedRole, setSelectedRole] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    const demo = DEMO_CREDENTIALS[role];
    if (demo) {
      setEmail(demo.email);
      setPassword(demo.password);
    } else {
      setEmail('');
      setPassword('');
    }
    setError('');
  };

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please enter email and password.');
      return;
    }
    setError('');
    const result = await login(email, password);
    if (!result.success) {
      setError(result.error || 'Login failed. Please check your credentials.');
    }
    // On success: no navigate() — RootNavigator switches trees on the role change.
  };

  const callHelpline = () => {
    // Same dialer convention as HelplineModal: strip dashes, open tel: URL.
    Linking.openURL(`tel:${'1800-XXX-SEVA'.replace(/-/g, '')}`);
  };

  const roleWord =
    selectedRole === 'customer' ? 'Customer' : selectedRole === 'worker' ? 'Worker' : 'Admin';

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={[
        styles.pageContent,
        { paddingTop: insets.top + spacing.space5, paddingBottom: insets.bottom + spacing.space6 },
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Subtle background decoration (solid low-opacity blobs; no native blur dependency). */}
      <View pointerEvents="none" style={[styles.blob, styles.blobTop]} />
      <View pointerEvents="none" style={[styles.blob, styles.blobBottom]} />

      {/* Brand header */}
      <View style={styles.header}>
        <View style={styles.brandRow}>
          {/* Solid white backing surface guarantees the app-icon logo always renders on a
              defined, clipped surface. BrandLogo references the EXACT existing app icon (native
              ic_launcher) with the bundled @assets/logo.png as fallback, so it stays visible
              even if the JS asset cache is stale. */}
          <View style={styles.logoBox}>
            <BrandLogo style={styles.logo} accessibilityLabel="Sahakar Seva logo" />
          </View>
          <View style={styles.brandTextWrap}>
            <Text style={styles.title}>सहकार सेवा</Text>
            <Text style={styles.subtitle}>Sahakar Seva · Cooperative Home Services</Text>
          </View>
        </View>
        <Text style={styles.tagline}>घर की हर ज़रूरत, भरोसे के साथ।</Text>
        <Text style={styles.taglineEn}>Trusted help for your home.</Text>
      </View>

      {!selectedRole ? (
        <View style={styles.roleSelect}>
          <View style={styles.promptWrap}>
            <Text style={styles.promptHi}>आप यहाँ क्या करना चाहते हैं?</Text>
            <Text style={styles.promptEn}>How can we help you today?</Text>
          </View>

          {/* Customer role card */}
          <Pressable
            style={({ pressed }) => [styles.roleCard, styles.customerCard, pressed && styles.rolePressed]}
            onPress={() => handleRoleSelect('customer')}
            accessibilityRole="button"
            accessibilityLabel="सेवा चाहिए — I need a home service"
          >
            <Text style={[styles.eyebrow, styles.eyebrowCustomer]}>For Homeowners</Text>
            <View style={styles.roleTopRow}>
              <View style={[styles.roleIcon, styles.customerIcon]}>
                <User size={26} color={colors.primary700} strokeWidth={2.2} />
              </View>
              <View style={styles.roleTextWrap}>
                <Text style={styles.roleTitle}>सेवा चाहिए</Text>
                <Text style={styles.roleSub}>I need a home service</Text>
                <Text style={styles.roleTag}>Find trusted professionals</Text>
              </View>
              {/* DECORATIVE illustration (react-native-svg) */}
              <View style={styles.illustrationWrap} pointerEvents="none">
                <CustomerIllustration width={78} height={72} />
              </View>
              <View style={[styles.chevronCircle, styles.customerChevron]}>
                <ChevronRight size={20} color={colors.white} strokeWidth={2.5} />
              </View>
            </View>
            {/* DECORATIVE-ONLY service chips — not interactive */}
            <View style={styles.chipRow} pointerEvents="none">
              {CUSTOMER_SERVICE_CHIPS.map(({ icon: Icon, label }) => (
                <View key={label} style={styles.serviceChip}>
                  <Icon size={15} color={colors.primary600} strokeWidth={2} />
                  <Text style={styles.serviceChipText}>{label}</Text>
                </View>
              ))}
              <View style={styles.moreChip}>
                <Text style={styles.moreChipText}>+ more</Text>
              </View>
            </View>
          </Pressable>

          {/* Worker role card */}
          <Pressable
            style={({ pressed }) => [styles.roleCard, styles.workerCard, pressed && styles.rolePressed]}
            onPress={() => handleRoleSelect('worker')}
            accessibilityRole="button"
            accessibilityLabel="सेवा देना है — I am a skilled worker"
          >
            <Text style={[styles.eyebrow, styles.eyebrowWorker]}>For Skilled Workers</Text>
            <View style={styles.roleTopRow}>
              <View style={[styles.roleIcon, styles.workerIcon]}>
                <Wrench size={26} color={colors.accent700} strokeWidth={2.2} />
              </View>
              <View style={styles.roleTextWrap}>
                <Text style={styles.roleTitle}>सेवा देना है</Text>
                <Text style={styles.roleSub}>I am a skilled worker</Text>
                <Text style={styles.roleTag}>Offer your services, earn &amp; grow</Text>
              </View>
              {/* DECORATIVE illustration (react-native-svg) */}
              <View style={styles.illustrationWrap} pointerEvents="none">
                <WorkerIllustration width={78} height={72} />
              </View>
              <View style={[styles.chevronCircle, styles.workerChevron]}>
                <ChevronRight size={20} color={colors.white} strokeWidth={2.5} />
              </View>
            </View>
            {/* DECORATIVE-ONLY benefit chips — not interactive */}
            <View style={styles.benefitRow} pointerEvents="none">
              {WORKER_BENEFIT_CHIPS.map(({ icon: Icon, label }) => (
                <View key={label} style={styles.benefitItem}>
                  <View style={styles.benefitIcon}>
                    <Icon size={15} color={colors.accent700} strokeWidth={2} />
                  </View>
                  <Text style={styles.benefitText}>{label}</Text>
                </View>
              ))}
            </View>
          </Pressable>

          {/* Why Sahakar Seva? — decorative trust row */}
          <View style={styles.trustBlock}>
            <Text style={styles.trustHeading}>Why Sahakar Seva?</Text>
            <View style={styles.trustRow} pointerEvents="none">
              <View style={styles.trustItem}>
                <BadgeCheck size={16} color={colors.success600} strokeWidth={2.1} />
                <Text style={styles.trustText}>Verified workers</Text>
              </View>
              <View style={styles.trustItem}>
                <MapPin size={16} color={colors.primary600} strokeWidth={2.1} />
                <Text style={styles.trustText}>Local services</Text>
              </View>
              <View style={styles.trustItem}>
                <Shield size={16} color={colors.accent600} strokeWidth={2.1} />
                <Text style={styles.trustText}>Trusted</Text>
              </View>
            </View>
          </View>

          {/* Official administrative portal — visually distinct full-width purple card.
              Same handler (handleRoleSelect('admin')) and navigation as before, unchanged. */}
          <Pressable
            style={({ pressed }) => [styles.adminCard, pressed && styles.adminCardPressed]}
            onPress={() => handleRoleSelect('admin')}
            accessibilityRole="button"
            accessibilityLabel="Admin / Prashasan Access — official administrative portal"
          >
            <View style={styles.adminIconWrap}>
              <Landmark size={24} color={colors.white} strokeWidth={2.1} />
            </View>
            <View style={styles.adminTextWrap}>
              <Text style={styles.adminEyebrow}>FOR OFFICIAL USE</Text>
              <Text style={styles.adminTitle}>Admin / Prashasan Access</Text>
              <Text style={styles.adminDesc}>Manage users, services &amp; platform</Text>
            </View>
            <View style={styles.adminArrow}>
              <ArrowRight size={20} color={colors.primary700} strokeWidth={2.4} />
            </View>
          </Pressable>

          {/* Helpline call card */}
          <Pressable
            style={({ pressed }) => [styles.helplineCard, pressed && styles.helplinePressed]}
            onPress={callHelpline}
          >
            <View style={styles.helplineLeft}>
              <View style={styles.helplineIcon}>
                <Phone size={16} color={colors.primary700} strokeWidth={2.2} />
              </View>
              <View style={styles.helplineTextWrap}>
                <Text style={styles.helplineCardLabel}>Need help? हमें कॉल करें (24x7)</Text>
                <Text style={styles.helplineCardNumber}>1800-XXX-SEVA</Text>
              </View>
            </View>
            <View style={styles.callBtn}>
              <Phone size={14} color={colors.white} strokeWidth={2.4} />
              <Text style={styles.callBtnText}>Call Now</Text>
            </View>
          </Pressable>

          <Text style={styles.footerNote}>सुरक्षित · सहकारी · भरोसेमंद</Text>
        </View>
      ) : (
        <View style={styles.formCard}>
          <Pressable
            onPress={() => {
              setSelectedRole(null);
              setError('');
            }}
            style={styles.backBtn}
          >
            <ChevronRight size={16} color={colors.primary600} style={styles.backChevron} strokeWidth={2.4} />
            <Text style={styles.back}>Back</Text>
          </Pressable>

          <View style={[styles.rolePill, styles[`rolePill_${selectedRole}`]]}>
            {selectedRole === 'customer' ? (
              <User size={14} color={colors.primary700} />
            ) : selectedRole === 'worker' ? (
              <Wrench size={14} color={colors.accent700} />
            ) : (
              <Shield size={14} color={colors.danger700} />
            )}
            <Text style={[styles.rolePillText, styles[`rolePillText_${selectedRole}`]]}>
              {selectedRole === 'customer'
                ? 'Customer / ग्राहक'
                : selectedRole === 'worker'
                ? 'Worker / श्रमिक'
                : 'Admin / प्रशासन'}
            </Text>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Email Address</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.gray400}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Password</Text>
            <View style={styles.pwWrap}>
              <TextInput
                style={[styles.input, styles.pwInput]}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={colors.gray400}
                secureTextEntry={!showPw}
                autoComplete="password"
              />
              <Pressable style={styles.pwToggle} onPress={() => setShowPw(!showPw)}>
                {showPw ? <EyeOff size={16} color={colors.gray400} /> : <Eye size={16} color={colors.gray400} />}
              </Pressable>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [styles.submit, loading && styles.submitDisabled, pressed && !loading && styles.submitPressed]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.submitText}>Sign In as {roleWord}</Text>
            )}
          </Pressable>

          <Text style={styles.hint}>
            {selectedRole === 'admin'
              ? '🔐 Enter your Supabase admin credentials to sign in.'
              : '🚀 Demo credentials pre-filled — just tap Sign In!'}
          </Text>

          {selectedRole !== 'admin' && (
            <Text style={styles.switch}>
              New to Sahakar Seva?{' '}
              <Text
                style={styles.switchLink}
                onPress={() => navigation.navigate('Register', { role: selectedRole })}
              >
                Create Account →
              </Text>
            </Text>
          )}

          <View style={styles.helpline}>
            <Phone size={12} color={colors.gray400} />
            <Text style={styles.helplineText}>
              Helpline: <Text style={styles.helplineStrong}>1800-XXX-SEVA</Text> (24x7 Toll-Free)
            </Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#f3f1fb', // soft lavender-cream
  },
  pageContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.space5,
  },
  blob: {
    position: 'absolute',
    borderRadius: radii.radiusFull,
  },
  blobTop: {
    width: 320,
    height: 320,
    top: -140,
    right: -120,
    backgroundColor: 'rgba(129,140,248,0.18)', // primary400 wash
  },
  blobBottom: {
    width: 300,
    height: 300,
    bottom: -160,
    left: -120,
    backgroundColor: 'rgba(251,191,36,0.12)', // accent400 wash
  },

  // ---- Brand header ----
  header: {
    marginBottom: spacing.space5,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space3,
  },
  logoBox: {
    width: 56,
    height: 56,
    borderRadius: radii.radiusLg,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...shadows.shadowLg,
    shadowColor: colors.primary700,
  },
  logo: {
    width: 56,
    height: 56,
    borderRadius: radii.radiusLg,
  },
  brandTextWrap: {
    flex: 1,
  },
  title: {
    fontSize: fontSizes.fs2xl,
    fontWeight: fontWeights.fwBold,
    fontFamily: fontFamilies.notoDevanagariBold,
    color: colors.primary900,
  },
  subtitle: {
    fontSize: fontSizes.fsXs,
    color: colors.gray500,
    fontFamily: fontFamilies.interMedium,
    marginTop: 1,
  },
  tagline: {
    fontSize: fontSizes.fsSm,
    color: colors.primary700,
    fontFamily: fontFamilies.notoDevanagariMedium,
    marginTop: spacing.space4,
  },
  taglineEn: {
    fontSize: fontSizes.fsXs,
    color: colors.gray500,
    fontFamily: fontFamilies.interRegular,
    marginTop: 2,
  },

  // ---- Role select ----
  roleSelect: {
    gap: spacing.space4,
  },
  promptWrap: {
    gap: 2,
    marginBottom: spacing.space1,
  },
  promptHi: {
    fontSize: fontSizes.fsXl,
    fontWeight: fontWeights.fwBold,
    fontFamily: fontFamilies.notoDevanagariBold,
    color: colors.gray900,
  },
  promptEn: {
    fontSize: fontSizes.fsSm,
    color: colors.gray500,
    fontFamily: fontFamilies.interRegular,
  },

  roleCard: {
    borderRadius: radii.radiusXl,
    padding: spacing.space5,
    borderWidth: 1,
    backgroundColor: colors.white,
    ...shadows.shadowMd,
  },
  customerCard: {
    borderColor: colors.primary100,
    backgroundColor: '#faf9ff',
  },
  workerCard: {
    borderColor: colors.accent100,
    backgroundColor: '#fffdf6',
  },
  rolePressed: {
    opacity: 0.92,
    transform: [{ scale: 0.994 }],
  },
  eyebrow: {
    fontSize: 10,
    fontFamily: fontFamilies.interSemiBold,
    fontWeight: fontWeights.fwSemibold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: spacing.space3,
  },
  eyebrowCustomer: {
    color: colors.primary600,
  },
  eyebrowWorker: {
    color: colors.accent600,
  },
  roleTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space3,
  },
  roleIcon: {
    width: 52,
    height: 52,
    borderRadius: radii.radiusLg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerIcon: {
    backgroundColor: colors.primary100,
  },
  workerIcon: {
    backgroundColor: colors.accent100,
  },
  roleTextWrap: {
    flex: 1,
  },
  illustrationWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleTitle: {
    fontSize: fontSizes.fsLg,
    fontFamily: fontFamilies.notoDevanagariBold,
    color: colors.gray900,
  },
  roleSub: {
    fontSize: fontSizes.fsSm,
    color: colors.gray700,
    fontFamily: fontFamilies.interMedium,
    marginTop: 1,
  },
  roleTag: {
    fontSize: fontSizes.fsXs,
    color: colors.gray500,
    fontFamily: fontFamilies.interRegular,
    marginTop: 2,
  },
  chevronCircle: {
    width: 38,
    height: 38,
    borderRadius: radii.radiusFull,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerChevron: {
    backgroundColor: colors.primary600,
  },
  workerChevron: {
    backgroundColor: colors.accent500,
  },

  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.space2,
    marginTop: spacing.space4,
  },
  serviceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: spacing.space2,
    borderRadius: radii.radiusFull,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.primary100,
  },
  serviceChipText: {
    fontSize: fontSizes.fsXs,
    color: colors.gray700,
    fontFamily: fontFamilies.interMedium,
  },
  moreChip: {
    justifyContent: 'center',
    paddingVertical: 5,
    paddingHorizontal: spacing.space2,
  },
  moreChipText: {
    fontSize: fontSizes.fsXs,
    color: colors.primary600,
    fontFamily: fontFamilies.interSemiBold,
    fontWeight: fontWeights.fwSemibold,
  },

  benefitRow: {
    flexDirection: 'row',
    gap: spacing.space2,
    marginTop: spacing.space4,
  },
  benefitItem: {
    flex: 1,
    alignItems: 'center',
    gap: 5,
    paddingVertical: spacing.space3,
    paddingHorizontal: spacing.space1,
    borderRadius: radii.radiusMd,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.accent100,
  },
  benefitIcon: {
    width: 30,
    height: 30,
    borderRadius: radii.radiusFull,
    backgroundColor: colors.accent50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitText: {
    fontSize: 10.5,
    color: colors.gray600,
    fontFamily: fontFamilies.interMedium,
    textAlign: 'center',
  },

  // ---- Trust block ----
  trustBlock: {
    gap: spacing.space2,
    marginTop: spacing.space1,
  },
  trustHeading: {
    fontSize: fontSizes.fsSm,
    fontFamily: fontFamilies.interSemiBold,
    fontWeight: fontWeights.fwSemibold,
    color: colors.gray700,
    textAlign: 'center',
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.space2,
  },
  trustItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: spacing.space2,
    paddingHorizontal: spacing.space1,
    borderRadius: radii.radiusMd,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  trustText: {
    fontSize: 11,
    color: colors.gray700,
    fontFamily: fontFamilies.interMedium,
  },

  // ---- Admin link ----
  // ---- Official administrative portal card ----
  adminCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space3,
    marginTop: spacing.space4,
    padding: spacing.space4,
    borderRadius: radii.radiusXl,
    backgroundColor: colors.primary700,
    borderWidth: 1,
    borderColor: colors.primary500,
    ...shadows.shadowLg,
    shadowColor: colors.primary700,
  },
  adminCardPressed: {
    backgroundColor: colors.primary800,
  },
  adminIconWrap: {
    width: 48,
    height: 48,
    borderRadius: radii.radiusFull,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminTextWrap: {
    flex: 1,
  },
  adminEyebrow: {
    fontSize: 10,
    letterSpacing: 1.2,
    color: colors.primary200,
    fontFamily: fontFamilies.interSemiBold,
    fontWeight: fontWeights.fwSemibold,
    marginBottom: 2,
  },
  adminTitle: {
    fontSize: fontSizes.fsBase,
    color: colors.white,
    fontFamily: fontFamilies.interBold,
    fontWeight: fontWeights.fwBold,
  },
  adminDesc: {
    fontSize: fontSizes.fsXs,
    color: colors.primary100,
    fontFamily: fontFamilies.interRegular,
    marginTop: 2,
  },
  adminArrow: {
    width: 36,
    height: 36,
    borderRadius: radii.radiusFull,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.shadowSm,
  },

  // ---- Helpline card ----
  helplineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.space3,
    padding: spacing.space3,
    borderRadius: radii.radiusLg,
    borderWidth: 1,
    borderColor: colors.primary100,
    backgroundColor: colors.white,
    ...shadows.shadowSm,
  },
  helplinePressed: {
    backgroundColor: '#faf9ff',
  },
  helplineLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space3,
    flex: 1,
  },
  helplineIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.radiusFull,
    backgroundColor: colors.primary100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helplineTextWrap: {
    flex: 1,
  },
  helplineCardLabel: {
    fontSize: fontSizes.fsXs,
    color: colors.gray600,
    fontFamily: fontFamilies.notoDevanagariRegular,
  },
  helplineCardNumber: {
    fontSize: fontSizes.fsBase,
    color: colors.gray900,
    fontFamily: fontFamilies.interBold,
    fontWeight: fontWeights.fwBold,
    marginTop: 1,
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.space2,
    paddingHorizontal: spacing.space4,
    borderRadius: radii.radiusFull,
    backgroundColor: colors.primary700,
  },
  callBtnText: {
    fontSize: fontSizes.fsSm,
    color: colors.white,
    fontFamily: fontFamilies.interSemiBold,
    fontWeight: fontWeights.fwSemibold,
  },
  footerNote: {
    fontSize: fontSizes.fsXs,
    color: colors.gray400,
    fontFamily: fontFamilies.notoDevanagariRegular,
    textAlign: 'center',
    marginTop: spacing.space1,
  },

  // ---- Login form ----
  formCard: {
    backgroundColor: colors.white,
    borderRadius: radii.radius2xl,
    padding: spacing.space6,
    borderWidth: 1,
    borderColor: colors.gray100,
    ...shadows.shadowXl,
    gap: spacing.space4,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  backChevron: {
    transform: [{ rotate: '180deg' }],
  },
  back: {
    fontSize: fontSizes.fsSm,
    color: colors.primary600,
    fontWeight: fontWeights.fwSemibold,
    fontFamily: fontFamilies.interSemiBold,
  },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space2,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: radii.radiusFull,
    alignSelf: 'flex-start',
  },
  rolePill_customer: { backgroundColor: colors.primary50 },
  rolePill_worker: { backgroundColor: colors.accent50 },
  rolePill_admin: { backgroundColor: colors.danger50 },
  rolePillText: {
    fontSize: fontSizes.fsXs,
    fontWeight: fontWeights.fwSemibold,
    fontFamily: fontFamilies.interSemiBold,
  },
  rolePillText_customer: { color: colors.primary700 },
  rolePillText_worker: { color: colors.accent700 },
  rolePillText_admin: { color: colors.danger700 },
  errorBox: {
    backgroundColor: colors.danger50,
    borderWidth: 1,
    borderColor: colors.danger200,
    borderRadius: radii.radiusMd,
    padding: spacing.space3,
  },
  errorText: {
    color: colors.danger700,
    fontSize: fontSizes.fsSm,
    fontFamily: fontFamilies.interRegular,
  },
  field: {
    gap: spacing.space1,
  },
  fieldLabel: {
    fontSize: fontSizes.fsSm,
    fontWeight: fontWeights.fwMedium,
    fontFamily: fontFamilies.interMedium,
    color: colors.gray700,
  },
  input: {
    paddingVertical: spacing.space3,
    paddingHorizontal: spacing.space4,
    borderWidth: 1.5,
    borderColor: colors.gray200,
    borderRadius: radii.radiusMd,
    fontSize: fontSizes.fsSm,
    fontFamily: fontFamilies.interRegular,
    color: colors.gray900,
    backgroundColor: colors.gray50,
  },
  pwWrap: {
    position: 'relative',
    justifyContent: 'center',
  },
  pwInput: {
    paddingRight: 44,
  },
  pwToggle: {
    position: 'absolute',
    right: spacing.space3,
    height: '100%',
    justifyContent: 'center',
  },
  submit: {
    width: '100%',
    paddingVertical: spacing.space4,
    backgroundColor: colors.primary700,
    borderRadius: radii.radiusMd,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.shadowMd,
    shadowColor: colors.primary700,
  },
  submitDisabled: {
    opacity: 0.6,
  },
  submitPressed: {
    backgroundColor: colors.primary800,
  },
  submitText: {
    color: colors.white,
    fontSize: fontSizes.fsBase,
    fontWeight: fontWeights.fwSemibold,
    fontFamily: fontFamilies.interSemiBold,
  },
  hint: {
    fontSize: fontSizes.fsXs,
    color: colors.success600,
    fontWeight: fontWeights.fwMedium,
    fontFamily: fontFamilies.interMedium,
    textAlign: 'center',
  },
  switch: {
    fontSize: fontSizes.fsSm,
    color: colors.gray500,
    fontFamily: fontFamilies.interRegular,
    textAlign: 'center',
  },
  switchLink: {
    color: colors.primary600,
    fontWeight: fontWeights.fwSemibold,
    fontFamily: fontFamilies.interSemiBold,
  },
  helpline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.space2,
    marginTop: spacing.space1,
    paddingTop: spacing.space4,
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
  },
  helplineText: {
    fontSize: fontSizes.fsXs,
    color: colors.gray400,
    fontFamily: fontFamilies.interRegular,
  },
  helplineStrong: {
    fontWeight: fontWeights.fwBold,
    fontFamily: fontFamilies.interBold,
    color: colors.gray500,
  },
});
