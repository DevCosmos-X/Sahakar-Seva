import { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Eye, EyeOff, User, Wrench, Shield, ChevronRight, Phone } from 'lucide-react-native';
import { useAuth } from '@context/AuthContext';
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
 * VISUAL COMPROMISES (flagged):
 *  - Dark gradient background (linear-gradient 0f172a→1e1b4b→312e81) flattened to a solid deep
 *    indigo (#1e1b4b). Three blurred floating "orb" divs were pure decoration (blur(80px),
 *    float animation) — dropped. The card sits on the solid dark bg, which reads the same.
 *  - auth-submit gradient button → solid primary700 (same flatten decision as Phase 4 Button).
 *  - fade-in-up card entry animation deferred to Phase 12.
 *
 * This screen replaces the Phase-5 Login placeholder. Milestone: entering the pre-filled demo
 * customer creds and tapping Sign In lands on the customer dashboard via RootNavigator.
 */

const DEMO_CREDENTIALS = {
  customer: { email: 'demo.customer@sahakar.in', password: 'demo123' },
  worker: { email: 'demo.worker@sahakar.in', password: 'demo123' },
  // admin: no demo bypass — real Supabase account required
};

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

  const roleWord =
    selectedRole === 'customer' ? 'ग्राहक' : selectedRole === 'worker' ? 'श्रमिक' : 'Admin';

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={[styles.pageContent, { paddingTop: insets.top + spacing.space6, paddingBottom: insets.bottom + spacing.space6 }]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.card}>
        {/* Brand */}
        <View style={styles.brand}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>सस</Text>
          </View>
          <View style={styles.brandTextWrap}>
            <Text style={styles.title}>सहकार सेवा</Text>
            <Text style={styles.subtitle}>Sahakar Seva • Cooperative Home Services</Text>
          </View>
        </View>

        <Text style={styles.welcome}>सुस्वागतम् — Welcome Back! নমস্কার</Text>

        {!selectedRole ? (
          <View style={styles.roleSelect}>
            <Text style={styles.roleLabel}>Who are you?</Text>
            <View style={styles.roleGrid}>
              <Pressable style={styles.roleCard} onPress={() => handleRoleSelect('customer')}>
                <View style={[styles.roleIcon, styles.customerIcon]}>
                  <User size={28} color={colors.primary600} />
                </View>
                <Text style={styles.roleCardTitle}>सेवा चाहिए</Text>
                <Text style={styles.roleCardSub}>I need a home service</Text>
                <ChevronRight size={18} color={colors.gray300} style={styles.roleArrow} />
              </Pressable>
              <Pressable style={styles.roleCard} onPress={() => handleRoleSelect('worker')}>
                <View style={[styles.roleIcon, styles.workerIcon]}>
                  <Wrench size={28} color={colors.accent700} />
                </View>
                <Text style={styles.roleCardTitle}>सेवा देना है</Text>
                <Text style={styles.roleCardSub}>I am a skilled worker</Text>
                <ChevronRight size={18} color={colors.gray300} style={styles.roleArrow} />
              </Pressable>
            </View>
            <Pressable style={styles.adminLink} onPress={() => handleRoleSelect('admin')}>
              <Shield size={14} color={colors.gray400} />
              <Text style={styles.adminLinkText}>Admin / Prashasan Access</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.form}>
            <Pressable
              onPress={() => {
                setSelectedRole(null);
                setError('');
              }}
            >
              <Text style={styles.back}>← Back</Text>
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
              style={[styles.submit, loading && styles.submitDisabled]}
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
          </View>
        )}

        <View style={styles.helpline}>
          <Phone size={12} color={colors.gray400} />
          <Text style={styles.helplineText}>
            Helpline: <Text style={styles.helplineStrong}>1800-XXX-SEVA</Text> (24x7 Toll-Free)
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#1e1b4b', // flattened from the dark auth gradient
  },
  pageContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.space4,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderRadius: radii.radius2xl,
    padding: spacing.space8,
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    ...shadows.shadowXl,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space3,
    marginBottom: spacing.space5,
  },
  logo: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.primary700,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: colors.white,
    fontSize: fontSizes.fsLg,
    fontFamily: fontFamilies.notoDevanagariBold,
  },
  brandTextWrap: {
    flex: 1,
  },
  title: {
    fontSize: fontSizes.fs2xl,
    fontWeight: fontWeights.fwBold,
    fontFamily: fontFamilies.notoDevanagariBold,
    color: colors.gray900,
  },
  subtitle: {
    fontSize: fontSizes.fsSm,
    color: colors.gray500,
    fontFamily: fontFamilies.interRegular,
  },
  welcome: {
    fontSize: fontSizes.fsSm,
    color: colors.gray600,
    fontFamily: fontFamilies.notoDevanagariRegular,
    textAlign: 'center',
    marginBottom: spacing.space5,
  },
  roleSelect: {
    gap: spacing.space4,
  },
  roleLabel: {
    fontSize: fontSizes.fsSm,
    fontWeight: fontWeights.fwSemibold,
    fontFamily: fontFamilies.interSemiBold,
    color: colors.gray600,
    textAlign: 'center',
  },
  roleGrid: {
    flexDirection: 'row',
    gap: spacing.space3,
  },
  roleCard: {
    flex: 1,
    padding: spacing.space5,
    borderWidth: 2,
    borderColor: colors.gray200,
    borderRadius: radii.radiusXl,
    backgroundColor: colors.white,
    alignItems: 'center',
  },
  roleIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.space2,
  },
  customerIcon: {
    backgroundColor: colors.primary50,
  },
  workerIcon: {
    backgroundColor: colors.accent50,
  },
  roleCardTitle: {
    fontSize: fontSizes.fsBase,
    fontFamily: fontFamilies.notoDevanagariMedium,
    color: colors.gray800,
    marginBottom: 4,
    textAlign: 'center',
  },
  roleCardSub: {
    fontSize: fontSizes.fsXs,
    color: colors.gray500,
    fontFamily: fontFamilies.interRegular,
    textAlign: 'center',
  },
  roleArrow: {
    position: 'absolute',
    bottom: spacing.space3,
    right: spacing.space3,
  },
  adminLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.space2,
    padding: spacing.space2,
  },
  adminLinkText: {
    fontSize: fontSizes.fsXs,
    color: colors.gray400,
    fontFamily: fontFamilies.interRegular,
  },
  form: {
    gap: spacing.space4,
  },
  back: {
    fontSize: fontSizes.fsSm,
    color: colors.primary600,
    fontWeight: fontWeights.fwMedium,
    fontFamily: fontFamilies.interMedium,
  },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space2,
    paddingVertical: 4,
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
  },
  submitDisabled: {
    opacity: 0.6,
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
    marginTop: spacing.space5,
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
