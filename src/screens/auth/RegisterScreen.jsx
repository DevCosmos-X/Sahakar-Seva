import { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { launchImageLibrary } from 'react-native-image-picker';
import { Eye, EyeOff, User, Wrench, Upload, CheckCircle } from 'lucide-react-native';
import { useAuth } from '@context/AuthContext';
import { colors, spacing, radii, shadows, fontSizes, fontWeights, fontFamilies } from '@theme';

/**
 * RegisterScreen — ported from web pages/auth/RegisterPage.jsx + AuthPages.css.
 *
 * Behaviour preserved exactly:
 *  - Default role from route param { role } (web read location.state.role from the <Link state>).
 *  - Role toggle (customer/worker), full name/phone/email/city/state/password/confirm fields.
 *  - Validation: passwords match, min 6 chars, and for workers: must EITHER upload a cert OR
 *    opt into free training (the exact conditional from web).
 *  - register() call passes skills (comma-separated string) + wantsTraining boolean unchanged.
 *  - Success path: if needsEmailConfirm, show the "check your email" success screen; otherwise
 *    rely on RootNavigator to switch to the correct portal tree (structural nav, like Login).
 *  - Password show/hide, "Already registered? Sign In" link back to Login.
 *
 * CERTIFICATE UPLOAD (Phase 13):
 *  Web used a hidden <input type="file"> whose file was kept in state and never sent anywhere.
 *  Here the "Upload Certificate" button opens the native image picker
 *  (react-native-image-picker, already used for the AI photo diagnosis) and records the picked
 *  file's name so the worker validation branch (must have a cert OR opt into training) behaves
 *  correctly. Like web, the file isn't uploaded to a backend — there's no cert-storage endpoint
 *  in the mock data layer — but a real file is now genuinely selected.
 *
 * VISUAL COMPROMISES: same as LoginScreen (dark bg flattened, orbs dropped, gradient submit →
 * solid, entry animations deferred). The 480px mobile media query (single-column field rows)
 * is baked in — all field rows stack vertically, matching the phone branch.
 */

export default function RegisterScreen({ navigation, route }) {
  const { register, loading } = useAuth();
  const insets = useSafeAreaInsets();
  const defaultRole = route?.params?.role || 'customer';

  const [role, setRole] = useState(defaultRole);
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '', confirmPw: '', city: '', state: '' });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Worker-specific
  const [skills, setSkills] = useState('');
  const [certName, setCertName] = useState(null);
  const [hasCert, setHasCert] = useState(false);
  const [wantsTraining, setWantsTraining] = useState(false);

  const set = (field) => (value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async () => {
    setError('');
    if (form.password !== form.confirmPw) {
      setError('Passwords do not match.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (role === 'worker' && !hasCert && !wantsTraining) {
      setError('Please upload an experience certificate OR enroll in our free offline training program.');
      return;
    }

    const result = await register({
      email: form.email,
      password: form.password,
      role,
      fullName: form.fullName,
      phone: form.phone,
      city: form.city,
      state: form.state,
      skills, // comma-separated string; trigger converts to text[]
      wantsTraining, // boolean; trigger sets worker_profiles.training_requested
    });

    if (!result.success) {
      setError(result.error);
      return;
    }
    if (result.needsEmailConfirm) {
      setSuccess(true);
    }
    // else: RootNavigator switches to the worker/customer tree on the role change.
  };

  const handlePickCert = async () => {
    try {
      const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.7 });
      if (result?.didCancel) return;
      const asset = result?.assets?.[0];
      if (asset?.uri) {
        setCertName(asset.fileName || 'certificate.jpg');
        setHasCert(true);
      }
    } catch {
      // picker unavailable — leave cert unset; the worker can still opt into training instead
    }
  };

  if (success) {
    return (
      <ScrollView
        style={styles.page}
        contentContainerStyle={[styles.pageContent, { paddingTop: insets.top + spacing.space6 }]}
      >
        <View style={[styles.card, styles.successCard]}>
          <Text style={styles.successEmoji}>📧</Text>
          <Text style={styles.successTitle}>Almost there!</Text>
          <Text style={styles.successBody}>
            We've sent a confirmation email to <Text style={styles.successStrong}>{form.email}</Text>. Click the
            link to activate your account.
          </Text>
          <Pressable style={styles.submit} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.submitText}>Back to Login</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={[styles.pageContent, { paddingTop: insets.top + spacing.space6, paddingBottom: insets.bottom + spacing.space6 }]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.card}>
        <View style={styles.brand}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>सस</Text>
          </View>
          <View style={styles.brandTextWrap}>
            <Text style={styles.title}>सहकार सेवा</Text>
            <Text style={styles.subtitle}>Create your account</Text>
          </View>
        </View>

        {/* Role toggle */}
        <View style={styles.toggleWrap}>
          <Pressable style={[styles.toggle, role === 'customer' && styles.toggleActive]} onPress={() => setRole('customer')}>
            <User size={16} color={role === 'customer' ? colors.primary700 : colors.gray500} />
            <Text style={[styles.toggleText, role === 'customer' && styles.toggleTextActive]}>Customer / ग्राहक</Text>
          </Pressable>
          <Pressable style={[styles.toggle, role === 'worker' && styles.toggleActive]} onPress={() => setRole('worker')}>
            <Wrench size={16} color={role === 'worker' ? colors.primary700 : colors.gray500} />
            <Text style={[styles.toggleText, role === 'worker' && styles.toggleTextActive]}>Worker / श्रमिक</Text>
          </Pressable>
        </View>

        <View style={styles.form}>
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Field label="Full Name" value={form.fullName} onChangeText={set('fullName')} placeholder="Your name" />
          <Field label="Phone Number" value={form.phone} onChangeText={set('phone')} placeholder="+91 98765 43210" keyboardType="phone-pad" />
          <Field label="Email Address" value={form.email} onChangeText={set('email')} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" />
          <Field label="City" value={form.city} onChangeText={set('city')} placeholder="Your city" />
          <Field label="State" value={form.state} onChangeText={set('state')} placeholder="State" />

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Password</Text>
            <View style={styles.pwWrap}>
              <TextInput
                style={[styles.input, styles.pwInput]}
                value={form.password}
                onChangeText={set('password')}
                placeholder="••••••••"
                placeholderTextColor={colors.gray400}
                secureTextEntry={!showPw}
              />
              <Pressable style={styles.pwToggle} onPress={() => setShowPw(!showPw)}>
                {showPw ? <EyeOff size={16} color={colors.gray400} /> : <Eye size={16} color={colors.gray400} />}
              </Pressable>
            </View>
          </View>

          <Field
            label="Confirm Password"
            value={form.confirmPw}
            onChangeText={set('confirmPw')}
            placeholder="••••••••"
            secureTextEntry
          />

          {role === 'worker' && (
            <View style={styles.workerSection}>
              <Text style={styles.workerTitle}>Worker Registration Details</Text>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Skills (comma-separated)</Text>
                <TextInput
                  style={styles.input}
                  value={skills}
                  onChangeText={setSkills}
                  placeholder="e.g. Plumbing, Pipe Fitting, Electrical"
                  placeholderTextColor={colors.gray400}
                />
              </View>

              <View>
                <Text style={styles.certLabel}>
                  Experience Certificate <Text style={styles.required}>*required</Text>
                </Text>
                <Pressable style={[styles.uploadBtn, certName && styles.uploadBtnDone]} onPress={handlePickCert}>
                  {certName ? (
                    <>
                      <CheckCircle size={16} color={colors.success700} />
                      <Text style={styles.uploadTextDone}>{certName}</Text>
                    </>
                  ) : (
                    <>
                      <Upload size={16} color={colors.gray600} />
                      <Text style={styles.uploadText}>Upload Certificate (PDF/JPG/PNG)</Text>
                    </>
                  )}
                </Pressable>

                <View style={styles.certOr}>
                  <View style={styles.certOrLine} />
                  <Text style={styles.certOrText}>OR</Text>
                  <View style={styles.certOrLine} />
                </View>

                <Pressable
                  style={[styles.trainingCheck, wantsTraining && styles.trainingCheckOn]}
                  onPress={() => setWantsTraining(!wantsTraining)}
                >
                  <View style={[styles.checkbox, wantsTraining && styles.checkboxOn]}>
                    {wantsTraining && <CheckCircle size={14} color={colors.white} />}
                  </View>
                  <Text style={styles.trainingText}>
                    Enroll in <Text style={styles.trainingStrong}>Free Offline Training</Text> — Internship program for
                    freshers
                  </Text>
                </Pressable>
              </View>
            </View>
          )}

          <Pressable style={[styles.submit, loading && styles.submitDisabled]} onPress={handleSubmit} disabled={loading}>
            {loading ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.submitText}>Register as {role === 'customer' ? 'ग्राहक (Customer)' : 'श्रमिक (Worker)'}</Text>
            )}
          </Pressable>

          <Text style={styles.switch}>
            Already registered?{' '}
            <Text style={styles.switchLink} onPress={() => navigation.navigate('Login')}>
              Sign In →
            </Text>
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

function Field({ label, ...props }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput style={styles.input} placeholderTextColor={colors.gray400} {...props} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#1e1b4b',
  },
  pageContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.space4,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderRadius: radii.radius2xl,
    padding: spacing.space6,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    ...shadows.shadowXl,
  },
  successCard: {
    alignItems: 'center',
    padding: spacing.space10,
  },
  successEmoji: {
    fontSize: 48,
    marginBottom: spacing.space4,
  },
  successTitle: {
    fontSize: fontSizes.fs2xl,
    fontWeight: fontWeights.fwBold,
    fontFamily: fontFamilies.interBold,
    color: colors.primary700,
  },
  successBody: {
    fontSize: fontSizes.fsBase,
    color: colors.gray600,
    fontFamily: fontFamilies.interRegular,
    textAlign: 'center',
    marginTop: spacing.space2,
    lineHeight: fontSizes.fsBase * 1.5,
  },
  successStrong: {
    fontWeight: fontWeights.fwBold,
    fontFamily: fontFamilies.interBold,
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
  toggleWrap: {
    flexDirection: 'row',
    backgroundColor: colors.gray100,
    borderRadius: radii.radiusLg,
    padding: 4,
    marginBottom: spacing.space4,
  },
  toggle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.space2,
    paddingVertical: spacing.space2,
    paddingHorizontal: spacing.space3,
    borderRadius: radii.radiusMd,
  },
  toggleActive: {
    backgroundColor: colors.white,
    ...shadows.shadowSm,
  },
  toggleText: {
    fontSize: fontSizes.fsSm,
    fontWeight: fontWeights.fwMedium,
    fontFamily: fontFamilies.interMedium,
    color: colors.gray500,
  },
  toggleTextActive: {
    color: colors.primary700,
  },
  form: {
    gap: spacing.space4,
  },
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
  workerSection: {
    backgroundColor: colors.accent50,
    borderWidth: 1,
    borderColor: colors.accent200,
    borderRadius: radii.radiusLg,
    padding: spacing.space4,
    gap: spacing.space3,
  },
  workerTitle: {
    fontSize: fontSizes.fsSm,
    fontWeight: fontWeights.fwSemibold,
    fontFamily: fontFamilies.interSemiBold,
    color: colors.warning800,
  },
  certLabel: {
    fontSize: fontSizes.fsSm,
    fontWeight: fontWeights.fwMedium,
    fontFamily: fontFamilies.interMedium,
    color: colors.gray700,
    marginBottom: spacing.space2,
  },
  required: {
    fontSize: 10,
    color: colors.danger500,
    fontFamily: fontFamilies.interRegular,
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space2,
    paddingVertical: spacing.space3,
    paddingHorizontal: spacing.space4,
    borderWidth: 2,
    borderColor: colors.gray300,
    borderStyle: 'dashed',
    borderRadius: radii.radiusMd,
  },
  uploadBtnDone: {
    borderColor: colors.success500,
    borderStyle: 'solid',
    backgroundColor: colors.success50,
  },
  uploadText: {
    fontSize: fontSizes.fsSm,
    color: colors.gray600,
    fontFamily: fontFamilies.interRegular,
  },
  uploadTextDone: {
    fontSize: fontSizes.fsSm,
    color: colors.success700,
    fontFamily: fontFamilies.interMedium,
  },
  certOr: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space3,
    marginVertical: spacing.space3,
  },
  certOrLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.gray200,
  },
  certOrText: {
    fontSize: fontSizes.fsXs,
    color: colors.gray400,
    fontFamily: fontFamilies.interRegular,
  },
  trainingCheck: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.space2,
    padding: spacing.space3,
    borderWidth: 1.5,
    borderColor: colors.gray200,
    borderRadius: radii.radiusMd,
    backgroundColor: colors.white,
  },
  trainingCheckOn: {
    borderColor: colors.primary400,
    backgroundColor: colors.primary50,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.gray300,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxOn: {
    backgroundColor: colors.primary600,
    borderColor: colors.primary600,
  },
  trainingText: {
    flex: 1,
    fontSize: fontSizes.fsSm,
    color: colors.gray700,
    fontFamily: fontFamilies.interRegular,
  },
  trainingStrong: {
    fontWeight: fontWeights.fwBold,
    fontFamily: fontFamilies.interBold,
  },
  submit: {
    width: '100%',
    paddingVertical: spacing.space4,
    backgroundColor: colors.primary700,
    borderRadius: radii.radiusMd,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.space2,
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
});
