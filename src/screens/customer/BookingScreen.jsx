import { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator, Image, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import {
  Calendar, Clock, CloudRain, Check, ArrowLeft, ArrowRight,
  Sparkles, Receipt, Navigation, CheckCircle2, ShieldCheck, Printer, ClipboardList,
  Camera, ImagePlus, X,
} from 'lucide-react-native';
import { mockServices, currentWeather } from '@data/mockServices';
import { addBooking, resolveCustomerId } from '@data/mockBookings';
import { getServiceDiagnosis } from '@services/aiService';
import { shareReceipt } from '@utils/receipt';
import { useAuth } from '@context/AuthContext';
import { useLanguage } from '@context/LanguageContext';
import useSpeechToText from '@hooks/useSpeechToText';
import { ScreenContainer, ServiceGrid, Chip, ChipRow } from '@components/app';
import { serviceIcon } from '@components/icons';
import { TextArea } from '@components/ui/Input';
import { FairnessBadge } from '@components/ui/Badge';
import { colors, spacing, radii, shadows, fontSizes, fontWeights, fontFamilies } from '@theme';

/**
 * BookingScreen — ported from web pages/customer/BookingPage.jsx, re-laid-out in the modern app
 * style with a sticky bottom CTA bar (Zomato/UC checkout pattern) instead of inline nav buttons.
 *
 * BUSINESS LOGIC PRESERVED EXACTLY:
 *  - calcBilling(basePrice, weatherMultiplier, isRuralOrDistant): adjusted = base*weatherMult,
 *    GST 18%, welfare cess 2%, distance surcharge 15% (when distant), total = sum. Ported verbatim.
 *  - weatherMultiplier = currentWeather.multiplier * service.weatherMultiplier.
 *  - The 4 wizard steps (choose → describe → schedule → review), quick problem tags per service,
 *    quick time-slot chips, addBooking() with resolveCustomerId(user.id), the OTP 4892 on the
 *    confirmation screen, and all the invoice line items (base / weather / distance / GST /
 *    welfare cess / total).
 *  - Route params: { service, desc } (web read ?service= & ?desc= query params). Preselecting a
 *    service jumps to step 2, and a maintenance-reminder desc is suffixed "(Scheduled Maintenance)".
 *
 * AI DIAGNOSIS (Phase 9): getServiceDiagnosis via Groq aiService — "AI Smart Diagnosis" button.
 * PHOTO (Phase 10a): react-native-image-picker (camera/gallery) → base64 → Groq vision model.
 *
 * STILL DEFERRED, with graceful stubs so the flow is fully usable:
 *  - SpeechToText (@react-native-voice/voice) — the mic on the describe step (Phase 10b).
 *  - VideoCallModal / BillReceiptModal PDF — receipt button on confirmation (Phase 13).
 *  Each is present as a clearly-labeled placeholder rather than removed, so nothing silently
 *  disappears.
 *
 * NOTE: web referenced currentWeather.isActive / .label / .isActive — those fields don't exist
 * in mockServices.currentWeather ({ condition, multiplier, icon }). We use the real fields:
 * a weather surcharge applies whenever multiplier > 1 (which it is: Rainy ×1.3), and the label
 * is currentWeather.condition. This fixes a latent web bug where the weather UI never showed.
 */

const QUICK_TAGS = {
  plumbing: ['💧 Pipe Leakage', '🚿 Tap / Faucet Repair', '🚽 Drain Blockage', '🔧 General Plumbing Check'],
  electrical: ['⚡ Switch / Socket Issue', '💡 Light / Fan Installation', '🔌 MCB Tripping', '🔧 Full Home Inspection'],
  'ac-repair': ['❄️ No / Low Cooling', '🔊 Strange Noise / Vibration', '💧 Water Leaking from AC', '🧹 Filter Cleaning & Gas'],
  cleaning: ['🧹 Full Home Deep Cleaning', '🍳 Kitchen Deep Cleaning', '🚿 Bathroom Cleaning', '🛋️ Sofa / Carpet Shampoo'],
  carpentry: ['🚪 Door Lock / Hinge Repair', '🪑 Furniture Assembly', '🪵 Custom Woodwork', '🔧 General Carpentry'],
  painting: ['🎨 Single Room Painting', '🏠 Full House Repaint', '🖌️ Wall Texture / Touch-up', '💧 Waterproofing Treatment'],
  'pest-control': ['🪳 Cockroach Control', '🐜 Termite Treatment', '🦟 Mosquito Fogging', '🐀 Rodent Control'],
  'appliance-repair': ['🧺 Washing Machine Repair', '🧊 Refrigerator Servicing', '🍲 Microwave Repair', '💧 RO Purifier Service'],
};

const TIME_SLOTS = [
  { label: '⏰ ASAP (45 mins)', val: 'ASAP' },
  { label: '🌅 10:00 AM', val: '10:00 AM' },
  { label: '☀️ 02:00 PM', val: '02:00 PM' },
  { label: '🌇 05:00 PM', val: '05:00 PM' },
];

// Ported verbatim from web.
function calcBilling(basePrice, weatherMultiplier, isRuralOrDistant = false) {
  const adjusted = Math.round(basePrice * weatherMultiplier);
  const gst = Math.round(adjusted * 0.18);
  const welfareCess = Math.round(adjusted * 0.02);
  const distanceSurcharge = isRuralOrDistant ? Math.round(adjusted * 0.15) : 0;
  const total = adjusted + gst + welfareCess + distanceSurcharge;
  return { base: adjusted, gst, welfareCess, distanceSurcharge, total };
}

const STEP_LABELS = ['Service', 'Describe', 'Schedule', 'Review'];

// LanguageContext stores a code ('en'|'hi'|'bn'|null); getServiceDiagnosis wants the English
// language NAME ('English'|'Hindi'|'Bengali'). This mapping is the fix for the web app's
// hardcoded-'English' diagnosis bug (BookingPage.jsx:107) — the RN app passes the user's
// actually-selected language through instead of a literal 'English'.
const LANG_NAME = { en: 'English', hi: 'Hindi', bn: 'Bengali' };

export default function BookingScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const { language } = useLanguage();
  const preselected = route?.params?.service;
  const preselectedDesc = route?.params?.desc;

  const [step, setStep] = useState(preselected ? 2 : 1);
  const [selectedService, setSelectedService] = useState(preselected || 'plumbing');
  const [description, setDescription] = useState(preselectedDesc ? `${preselectedDesc} (Scheduled Maintenance)` : '');
  // date is display-only for now; a native date picker replaces this readonly field in a later
  // polish pass. Kept as state so the picker can wire straight in.
  const [date] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('10:00 AM');
  const [address, setAddress] = useState(profile?.address || '12, Sector 45, Gurugram, Haryana');
  const [confirmedBooking, setConfirmedBooking] = useState(null);
  // AI diagnosis (Phase 9, Groq-backed). Photo/vision input wired in Phase 10a via
  // react-native-image-picker — a selected photo feeds getServiceDiagnosis's vision path.
  const [aiDiagnosis, setAiDiagnosis] = useState(null);
  const [aiError, setAiError] = useState(null);
  const [diagnosing, setDiagnosing] = useState(false);
  // photo = { uri, base64 } | null. base64 (no data-URI prefix) is what the Groq vision model wants.
  const [photo, setPhoto] = useState(null);

  // Speech-to-text for the describe field (Phase 10b). Recognized text is appended to whatever
  // is already typed. Degrades gracefully: if unavailable/denied, the mic shows a hint via `stt.error`.
  const stt = useSpeechToText({
    language,
    onFinalResult: (text) => setDescription((prev) => (prev ? `${prev} ${text}` : text)),
  });

  // React to a new route param (e.g. tapping a different service on the dashboard while the
  // Book tab is already mounted).
  useEffect(() => {
    if (preselected) {
      setSelectedService(preselected);
      setStep(2);
      if (preselectedDesc) setDescription(`${preselectedDesc} (Scheduled Maintenance)`);
    }
  }, [preselected, preselectedDesc]);

  const service = mockServices.find((s) => s.id === selectedService) || mockServices[0];
  const weatherMultiplier = currentWeather.multiplier * (service.weatherMultiplier || 1);
  const weatherActive = currentWeather.multiplier > 1;
  const weatherPct = Math.round((currentWeather.multiplier - 1) * 100);
  const billing = calcBilling(service.basePrice, weatherMultiplier);
  const Icon = serviceIcon(service.icon);
  const currentTags = QUICK_TAGS[selectedService] || QUICK_TAGS.plumbing;

  // Shared handler for the picker result (camera or gallery). We request base64 directly from
  // the picker (includeBase64) so we can hand it straight to the Groq vision model without a
  // separate file-read step.
  const onPicked = (result) => {
    if (result?.didCancel) return;
    if (result?.errorCode) {
      Alert.alert('Photo unavailable', result.errorMessage || 'Could not access the camera/gallery.');
      return;
    }
    const asset = result?.assets?.[0];
    if (asset?.base64) {
      setPhoto({ uri: asset.uri, base64: asset.base64 });
    }
  };

  const pickFromCamera = () =>
    launchCamera({ mediaType: 'photo', includeBase64: true, quality: 0.6, maxWidth: 1280, maxHeight: 1280 }).then(onPicked);

  const pickFromGallery = () =>
    launchImageLibrary({ mediaType: 'photo', includeBase64: true, quality: 0.6, maxWidth: 1280, maxHeight: 1280 }).then(onPicked);

  const runAiDiagnosis = async () => {
    const desc = description.trim() || `${service.name} issue`;
    setDiagnosing(true);
    setAiError(null);
    setAiDiagnosis(null);
    // Fix for the web hardcoded-'English' bug: pass the user's selected language name.
    // When a photo is attached, getServiceDiagnosis routes to the Groq vision model
    // (qwen3.6-27b) and falls back to text-only automatically if that preview model errors.
    const { text, error } = await getServiceDiagnosis(desc, LANG_NAME[language] || 'English', photo?.base64 || null);
    if (error && !text) {
      setAiError(error);
    } else {
      setAiDiagnosis(text);
    }
    setDiagnosing(false);
  };

  const handleConfirm = () => {
    const newBooking = addBooking({
      customerId: resolveCustomerId(user.id),
      customerName: profile?.full_name || user?.email || 'Customer',
      workerId: 'w1',
      workerName: 'Suresh Kumar',
      workerRating: 4.8,
      workerPhone: '+91 76543 21098',
      serviceId: service.id,
      serviceName: service.name,
      description: description.trim() || `${service.name} Standard Inspection & Service`,
      address,
      date,
      time,
      status: 'en-route',
      basePrice: service.basePrice,
      weatherMultiplier,
      weatherCondition: weatherActive ? currentWeather.condition : 'Clear',
      totalPrice: billing.total,
      gst: billing.gst,
      welfareCess: billing.welfareCess,
      // Persist the attached photo (uri only — base64 is heavy and only needed for the live AI
      // call, not for the stored booking record). Matches the web `photos` array shape.
      photos: photo ? [{ url: photo.uri }] : [],
    });
    setConfirmedBooking(newBooking);
  };

  // ---- Confirmation screen ------------------------------------------------
  if (confirmedBooking) {
    return (
      <ScreenContainer contentStyle={{ paddingTop: insets.top + spacing.space4 }}>
        <View style={styles.confirmedCard}>
          <View style={styles.confirmedIcon}>
            <CheckCircle2 size={48} color={colors.white} />
          </View>
          <Text style={styles.confirmedTitle}>Booking Confirmed! 🎉</Text>
          <Text style={styles.confirmedSub}>
            Your <Text style={styles.bold}>{confirmedBooking.serviceName}</Text> service has been scheduled.
          </Text>

          <View style={styles.metaBox}>
            <MetaRow label="Booking ID" value={`#${confirmedBooking.id}`} mono />
            <MetaRow label="Professional" value={`${confirmedBooking.workerName} (⭐ ${confirmedBooking.workerRating})`} />
            <MetaRow label="Service Slot" value={`${confirmedBooking.date} at ${confirmedBooking.time}`} />
            <MetaRow label="Total Paid" value={`₹${confirmedBooking.totalPrice} (GST incl.)`} accent />
          </View>

          <View style={styles.otpCard}>
            <ShieldCheck size={22} color={colors.success600} />
            <Text style={styles.otpText}>
              Start-Service OTP: <Text style={styles.otpCode}>4892</Text>
            </Text>
          </View>

          <Pressable
            style={styles.primaryBtn}
            onPress={() => navigation.navigate('LiveTrackingMap', { bookingId: confirmedBooking.id })}
          >
            <Navigation size={18} color={colors.white} />
            <Text style={styles.primaryBtnText}>Track Worker Live</Text>
          </Pressable>
          <Pressable style={styles.outlineBtn} onPress={() => shareReceipt(confirmedBooking)}>
            <Printer size={18} color={colors.primary600} />
            <Text style={styles.outlineBtnText}>Share Bill Receipt</Text>
          </Pressable>
          <Pressable style={styles.ghostBtn} onPress={() => navigation.navigate('CustomerBookings')}>
            <ClipboardList size={16} color={colors.gray600} />
            <Text style={styles.ghostBtnText}>View My Bookings</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  // ---- Wizard -------------------------------------------------------------
  return (
    <View style={styles.root}>
      {/* Step indicator */}
      <View style={[styles.stepBar, { paddingTop: insets.top + spacing.space3 }]}>
        {STEP_LABELS.map((label, i) => {
          const n = i + 1;
          const active = step === n;
          const done = step > n;
          return (
            <View key={label} style={styles.stepItem}>
              <View style={[styles.stepCircle, active && styles.stepCircleActive, done && styles.stepCircleDone]}>
                {done ? <Check size={13} color={colors.white} /> : <Text style={[styles.stepNum, (active || done) && styles.stepNumActive]}>{n}</Text>}
              </View>
              <Text style={[styles.stepLabel, active && styles.stepLabelActive]}>{label}</Text>
            </View>
          );
        })}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* STEP 1 — choose service */}
        {step === 1 && (
          <View>
            <Text style={styles.h2}>What service do you need?</Text>
            <Text style={styles.sub}>Select a verified cooperative service category</Text>
            <View style={{ marginTop: spacing.space4 }}>
              <ServiceGrid
                services={mockServices}
                columns={4}
                showPrice
                onSelect={(s) => {
                  setSelectedService(s.id);
                  setStep(2);
                }}
              />
            </View>
          </View>
        )}

        {/* STEP 2 — describe */}
        {step === 2 && (
          <View>
            <View style={styles.serviceHead}>
              <View style={[styles.serviceHeadIcon, { backgroundColor: service.color + '1A' }]}>
                <Icon size={26} color={service.color} />
              </View>
              <View style={styles.serviceHeadText}>
                <Text style={styles.h2}>{service.name}</Text>
                <Text style={styles.sub}>Tell us about the issue or pick a quick tag</Text>
              </View>
            </View>

            <Text style={styles.label}>Quick select</Text>
            <ChipRow wrap contentStyle={{ marginBottom: spacing.space4 }}>
              {currentTags.map((tag) => (
                <Chip key={tag} label={tag} onPress={() => setDescription((prev) => (prev ? `${prev}, ${tag}` : tag))} />
              ))}
            </ChipRow>

            <TextArea
              label="Describe your issue (optional)"
              value={stt.listening && stt.partial ? `${description}${description ? ' ' : ''}${stt.partial}` : description}
              onChangeText={setDescription}
              placeholder="e.g. Kitchen sink is leaking, water dripping below the pipe…"
              rows={3}
              showMic
              micActive={stt.listening}
              onMicClick={() => (stt.listening ? stt.stop() : stt.start())}
            />
            {stt.listening && (
              <Text style={styles.micHint}>Listening… speak now, tap the mic again to stop.</Text>
            )}
            {!stt.listening && stt.error && (
              <Text style={styles.micHintError}>
                Voice input isn't available right now — please type your issue. ({stt.error})
              </Text>
            )}

            {/* Photo attach (Phase 10a, react-native-image-picker) — feeds the Groq vision model */}
            <Text style={[styles.label, { marginTop: spacing.space4 }]}>Add a photo (optional)</Text>
            {photo ? (
              <View style={styles.photoPreviewWrap}>
                <Image source={{ uri: photo.uri }} style={styles.photoPreview} />
                <Pressable style={styles.photoRemove} onPress={() => setPhoto(null)} hitSlop={8} accessibilityLabel="Remove photo">
                  <X size={16} color={colors.white} />
                </Pressable>
              </View>
            ) : (
              <View style={styles.photoBtnRow}>
                <Pressable style={styles.photoBtn} onPress={pickFromCamera}>
                  <Camera size={18} color={colors.primary600} />
                  <Text style={styles.photoBtnText}>Camera</Text>
                </Pressable>
                <Pressable style={styles.photoBtn} onPress={pickFromGallery}>
                  <ImagePlus size={18} color={colors.primary600} />
                  <Text style={styles.photoBtnText}>Gallery</Text>
                </Pressable>
              </View>
            )}

            {/* AI Smart Diagnosis — Groq-backed. Text (gpt-oss-20b) or vision (qwen3.6-27b) when a
                photo is attached. */}
            <Pressable
              style={[styles.aiBtn, diagnosing && styles.aiBtnBusy]}
              onPress={runAiDiagnosis}
              disabled={diagnosing}
            >
              {diagnosing ? (
                <ActivityIndicator size="small" color={colors.primary600} />
              ) : (
                <Sparkles size={18} color={colors.primary600} />
              )}
              <Text style={styles.aiBtnText}>
                {diagnosing ? 'Analyzing your issue…' : photo ? 'AI Diagnosis with Photo' : 'AI Smart Diagnosis'}
              </Text>
            </Pressable>
            <Text style={styles.aiHint}>
              Get an instant expert read on the likely cause, urgency, and repair time.
              {photo ? ' Your photo will be analyzed too.' : ' Attach a photo for a sharper diagnosis.'}
            </Text>

            {aiDiagnosis && (
              <View style={styles.aiResultCard}>
                <View style={styles.aiResultHead}>
                  <Sparkles size={16} color={colors.primary600} />
                  <Text style={styles.aiResultTitle}>Sahakar AI Diagnosis</Text>
                </View>
                <Text style={styles.aiResultText}>{aiDiagnosis}</Text>
              </View>
            )}

            {aiError && (
              <View style={styles.aiErrorCard}>
                <Text style={styles.aiErrorText}>
                  Couldn't run AI diagnosis right now. {aiError}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* STEP 3 — schedule */}
        {step === 3 && (
          <View>
            <Text style={styles.h2}>Schedule your service</Text>
            <Text style={styles.sub}>Pick a convenient date and time slot</Text>

            {weatherActive && (
              <View style={styles.weatherCard}>
                <CloudRain size={18} color={colors.info600} />
                <View style={styles.weatherInfo}>
                  <Text style={styles.weatherTitle}>{currentWeather.condition} Surge & Delay Protection</Text>
                  <Text style={styles.weatherText}>
                    Transparent weather adjustment: {weatherPct}% goes directly to the technician as bad-weather compensation.
                  </Text>
                </View>
              </View>
            )}

            <Text style={[styles.label, { marginTop: spacing.space4 }]}>Quick slot</Text>
            <ChipRow wrap contentStyle={{ marginBottom: spacing.space4 }}>
              {TIME_SLOTS.map((slot) => (
                <Chip key={slot.val} label={slot.label} selected={time === slot.val} onPress={() => setTime(slot.val)} />
              ))}
            </ChipRow>

            <View style={styles.field}>
              <View style={styles.fieldLabelRow}>
                <Calendar size={14} color={colors.gray600} />
                <Text style={styles.label}>Service date</Text>
              </View>
              <View style={styles.readonlyInput}>
                <Text style={styles.readonlyText}>{date}</Text>
              </View>
            </View>

            <View style={styles.field}>
              <View style={styles.fieldLabelRow}>
                <Clock size={14} color={colors.gray600} />
                <Text style={styles.label}>Selected time</Text>
              </View>
              <View style={styles.readonlyInput}>
                <Text style={styles.readonlyText}>{time}</Text>
              </View>
            </View>

            <TextArea
              label="Service address"
              value={address}
              onChangeText={setAddress}
              rows={2}
            />
          </View>
        )}

        {/* STEP 4 — review */}
        {step === 4 && (
          <View>
            <Text style={styles.h2}>Review & confirm</Text>
            <Text style={styles.sub}>Fair-price guarantee with cooperative backing</Text>

            <View style={styles.billCard}>
              <View style={styles.billHead}>
                <Receipt size={20} color={colors.primary600} />
                <Text style={styles.billHeadText}>GST-Compliant Invoice Preview</Text>
              </View>
              <View style={styles.billService}>
                <View style={[styles.serviceHeadIcon, { backgroundColor: service.color + '1A' }]}>
                  <Icon size={22} color={service.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.bold}>{service.name}</Text>
                  <Text style={styles.billMeta}>{date} • {time} • {address.split(',')[0]}</Text>
                </View>
              </View>
              <View style={styles.billBreakdown}>
                <BillRow label="Base Service Charge" value={`₹${billing.base}`} />
                {weatherActive && <BillRow label={`Weather Allowance (${weatherPct}%)`} value="Included" muted />}
                {billing.distanceSurcharge > 0 && <BillRow label="Distance Surcharge" value={`₹${billing.distanceSurcharge}`} />}
                <BillRow label="GST @ 18% (CGST 9% + SGST 9%)" value={`₹${billing.gst}`} />
                <BillRow label="Cooperative Welfare Cess @ 2%" value={`₹${billing.welfareCess}`} />
                <View style={styles.billDivider} />
                <BillRow label="Total Payable" value={`₹${billing.total}`} total />
              </View>
              <Text style={styles.billNote}>💡 Official Tax Invoice generated immediately on confirmation.</Text>
            </View>

            <View style={{ marginTop: spacing.space4 }}>
              <FairnessBadge position={1} />
            </View>
          </View>
        )}
      </ScrollView>

      {/* Sticky bottom CTA bar */}
      <View style={[styles.ctaBar, { paddingBottom: insets.bottom + spacing.space3 }]}>
        {step > 1 && (
          <Pressable style={styles.backBtn} onPress={() => setStep(step - 1)}>
            <ArrowLeft size={18} color={colors.gray700} />
          </Pressable>
        )}
        {step < 4 ? (
          <Pressable style={styles.ctaMain} onPress={() => setStep(step + 1)}>
            <Text style={styles.ctaMainText}>
              {step === 1 ? 'Next: Describe' : step === 2 ? 'Next: Schedule' : 'Review & Pay'}
            </Text>
            <ArrowRight size={18} color={colors.white} />
          </Pressable>
        ) : (
          <Pressable style={styles.ctaMain} onPress={handleConfirm}>
            <Check size={18} color={colors.white} />
            <Text style={styles.ctaMainText}>Confirm Booking — ₹{billing.total}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function MetaRow({ label, value, mono, accent }) {
  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={[styles.metaValue, mono && styles.mono, accent && styles.metaAccent]}>{value}</Text>
    </View>
  );
}

function BillRow({ label, value, muted, total }) {
  return (
    <View style={styles.billRow}>
      <Text style={[styles.billRowLabel, total && styles.billRowTotalLabel]}>{label}</Text>
      <Text style={[styles.billRowValue, muted && styles.billRowMuted, total && styles.billRowTotalValue]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgPrimary },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.space4, paddingBottom: spacing.space8 },
  stepBar: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceWhite,
    paddingHorizontal: spacing.space4,
    paddingBottom: spacing.space3,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  stepItem: { flex: 1, alignItems: 'center', gap: 4 },
  stepCircle: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.gray200,
    alignItems: 'center', justifyContent: 'center',
  },
  stepCircleActive: { backgroundColor: colors.primary600 },
  stepCircleDone: { backgroundColor: colors.success500 },
  stepNum: { fontSize: fontSizes.fsXs, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.gray500 },
  stepNumActive: { color: colors.white },
  stepLabel: { fontSize: 10, color: colors.gray400, fontFamily: fontFamilies.interMedium },
  stepLabelActive: { color: colors.primary700, fontFamily: fontFamilies.interSemiBold },

  h2: { fontSize: fontSizes.fsXl, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.gray900 },
  sub: { fontSize: fontSizes.fsSm, color: colors.gray500, fontFamily: fontFamilies.interRegular, marginTop: 2 },
  label: { fontSize: fontSizes.fsSm, fontWeight: fontWeights.fwMedium, fontFamily: fontFamilies.interMedium, color: colors.gray700, marginBottom: spacing.space2 },
  bold: { fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.gray900, fontSize: fontSizes.fsBase },

  serviceHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.space3, marginBottom: spacing.space4 },
  serviceHeadIcon: { width: 52, height: 52, borderRadius: radii.radiusLg, alignItems: 'center', justifyContent: 'center' },
  serviceHeadText: { flex: 1 },

  micHint: { fontSize: fontSizes.fsXs, color: colors.primary600, fontFamily: fontFamilies.interMedium, marginTop: spacing.space1 },
  micHintError: { fontSize: fontSizes.fsXs, color: colors.gray500, fontFamily: fontFamilies.interRegular, marginTop: spacing.space1, lineHeight: 16 },

  photoBtnRow: { flexDirection: 'row', gap: spacing.space3, marginTop: spacing.space2 },
  photoBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.space2,
    paddingVertical: spacing.space3, borderRadius: radii.radiusLg,
    borderWidth: 1, borderColor: colors.gray200, backgroundColor: colors.gray50,
  },
  photoBtnText: { fontSize: fontSizes.fsSm, fontWeight: fontWeights.fwSemibold, fontFamily: fontFamilies.interSemiBold, color: colors.primary700 },
  photoPreviewWrap: { marginTop: spacing.space2, alignSelf: 'flex-start', position: 'relative' },
  photoPreview: { width: 120, height: 120, borderRadius: radii.radiusLg, backgroundColor: colors.gray100 },
  photoRemove: {
    position: 'absolute', top: -8, right: -8,
    width: 28, height: 28, borderRadius: 14, backgroundColor: colors.danger500,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.white,
  },

  aiBtn: {
    marginTop: spacing.space5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.space2, paddingVertical: spacing.space3,
    backgroundColor: colors.primary50, borderRadius: radii.radiusLg,
    borderWidth: 1, borderColor: colors.primary200,
  },
  aiBtnBusy: { opacity: 0.75 },
  aiBtnText: { fontSize: fontSizes.fsSm, fontWeight: fontWeights.fwSemibold, fontFamily: fontFamilies.interSemiBold, color: colors.primary700 },
  aiHint: { fontSize: fontSizes.fsXs, color: colors.gray500, fontFamily: fontFamilies.interRegular, marginTop: spacing.space2, lineHeight: 17 },
  aiResultCard: {
    marginTop: spacing.space3, padding: spacing.space4,
    backgroundColor: colors.primary50, borderRadius: radii.radiusLg,
    borderWidth: 1, borderColor: colors.primary200,
  },
  aiResultHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.space2, marginBottom: spacing.space2 },
  aiResultTitle: { fontSize: fontSizes.fsSm, fontWeight: fontWeights.fwSemibold, fontFamily: fontFamilies.interSemiBold, color: colors.primary700 },
  aiResultText: { fontSize: fontSizes.fsSm, color: colors.gray700, fontFamily: fontFamilies.interRegular, lineHeight: 21 },
  aiErrorCard: {
    marginTop: spacing.space3, padding: spacing.space3,
    backgroundColor: colors.danger50, borderRadius: radii.radiusLg,
    borderWidth: 1, borderColor: colors.danger200,
  },
  aiErrorText: { fontSize: fontSizes.fsXs, color: colors.danger700, fontFamily: fontFamilies.interRegular, lineHeight: 17 },

  weatherCard: {
    flexDirection: 'row', gap: spacing.space3, marginTop: spacing.space4,
    backgroundColor: colors.info50, borderRadius: radii.radiusLg, padding: spacing.space4,
    borderWidth: 1, borderColor: colors.info100,
  },
  weatherInfo: { flex: 1 },
  weatherTitle: { fontSize: fontSizes.fsSm, fontWeight: fontWeights.fwSemibold, fontFamily: fontFamilies.interSemiBold, color: colors.info700 },
  weatherText: { fontSize: fontSizes.fsXs, color: colors.gray600, fontFamily: fontFamilies.interRegular, marginTop: 2 },

  field: { marginBottom: spacing.space4 },
  fieldLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.space2 },
  readonlyInput: {
    paddingVertical: spacing.space3, paddingHorizontal: spacing.space4,
    borderWidth: 1.5, borderColor: colors.gray200, borderRadius: radii.radiusMd,
    backgroundColor: colors.gray50,
  },
  readonlyText: { fontSize: fontSizes.fsSm, color: colors.gray900, fontFamily: fontFamilies.interRegular },

  billCard: {
    marginTop: spacing.space4, backgroundColor: colors.surfaceWhite,
    borderRadius: radii.radiusLg, padding: spacing.space4, ...shadows.shadowMd,
  },
  billHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.space2, marginBottom: spacing.space3 },
  billHeadText: { fontSize: fontSizes.fsBase, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.gray900 },
  billService: { flexDirection: 'row', alignItems: 'center', gap: spacing.space3, marginBottom: spacing.space3, paddingBottom: spacing.space3, borderBottomWidth: 1, borderBottomColor: colors.gray100 },
  billMeta: { fontSize: fontSizes.fsXs, color: colors.gray500, fontFamily: fontFamilies.interRegular },
  billBreakdown: { gap: spacing.space2 },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  billRowLabel: { fontSize: fontSizes.fsSm, color: colors.gray600, fontFamily: fontFamilies.interRegular, flex: 1 },
  billRowValue: { fontSize: fontSizes.fsSm, color: colors.gray800, fontFamily: fontFamilies.interMedium },
  billRowMuted: { color: colors.success600 },
  billRowTotalLabel: { fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.gray900, fontSize: fontSizes.fsBase },
  billRowTotalValue: { fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.primary700, fontSize: fontSizes.fsBase },
  billDivider: { height: 1, backgroundColor: colors.gray200, marginVertical: spacing.space1 },
  billNote: { fontSize: fontSizes.fsXs, color: colors.gray500, fontFamily: fontFamilies.interRegular, marginTop: spacing.space3 },

  ctaBar: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.space3,
    paddingHorizontal: spacing.space4, paddingTop: spacing.space3,
    backgroundColor: colors.surfaceWhite,
    borderTopWidth: 1, borderTopColor: colors.gray200,
  },
  backBtn: {
    width: 48, height: 48, borderRadius: radii.radiusMd,
    borderWidth: 1.5, borderColor: colors.gray200,
    alignItems: 'center', justifyContent: 'center',
  },
  ctaMain: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.space2, height: 48, backgroundColor: colors.primary700, borderRadius: radii.radiusMd,
  },
  ctaMainText: { fontSize: fontSizes.fsBase, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.white },

  // Confirmation
  confirmedCard: { alignItems: 'center', paddingTop: spacing.space4 },
  confirmedIcon: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: colors.success500,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.space4, ...shadows.shadowGlow,
  },
  confirmedTitle: { fontSize: fontSizes.fs2xl, fontWeight: fontWeights.fwExtrabold, fontFamily: fontFamilies.interExtraBold, color: colors.gray900 },
  confirmedSub: { fontSize: fontSizes.fsBase, color: colors.gray600, fontFamily: fontFamilies.interRegular, textAlign: 'center', marginTop: spacing.space2 },
  metaBox: {
    width: '100%', marginTop: spacing.space6, backgroundColor: colors.surfaceWhite,
    borderRadius: radii.radiusLg, padding: spacing.space4, gap: spacing.space3, ...shadows.shadowSm,
  },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaLabel: { fontSize: fontSizes.fsSm, color: colors.gray500, fontFamily: fontFamilies.interRegular },
  metaValue: { fontSize: fontSizes.fsSm, fontWeight: fontWeights.fwSemibold, fontFamily: fontFamilies.interSemiBold, color: colors.gray900, flexShrink: 1, textAlign: 'right' },
  metaAccent: { color: colors.primary700 },
  mono: { fontFamily: 'monospace' },
  otpCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.space2, width: '100%',
    marginTop: spacing.space4, backgroundColor: colors.success50, borderRadius: radii.radiusLg,
    padding: spacing.space4, borderWidth: 1, borderColor: colors.success100,
  },
  otpText: { fontSize: fontSizes.fsSm, color: colors.gray700, fontFamily: fontFamilies.interRegular },
  otpCode: { fontSize: fontSizes.fsLg, fontWeight: fontWeights.fwExtrabold, fontFamily: fontFamilies.interExtraBold, color: colors.success700, letterSpacing: 2 },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.space2,
    width: '100%', height: 52, marginTop: spacing.space5, backgroundColor: colors.primary700, borderRadius: radii.radiusMd,
  },
  primaryBtnText: { fontSize: fontSizes.fsBase, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.white },
  outlineBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.space2,
    width: '100%', height: 52, marginTop: spacing.space3, borderRadius: radii.radiusMd,
    borderWidth: 2, borderColor: colors.primary300,
  },
  outlineBtnText: { fontSize: fontSizes.fsBase, fontWeight: fontWeights.fwSemibold, fontFamily: fontFamilies.interSemiBold, color: colors.primary600 },
  ghostBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.space2, marginTop: spacing.space4 },
  ghostBtnText: { fontSize: fontSizes.fsSm, color: colors.gray600, fontFamily: fontFamilies.interMedium },
});
