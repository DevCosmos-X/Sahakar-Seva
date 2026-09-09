import { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator, Image, Alert, Animated, Easing, TextInput, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import {
  Calendar, Clock, Check, ArrowLeft, ArrowRight,
  Sparkles, Receipt, Navigation, ShieldCheck, Printer, ClipboardList,
  Camera, ImagePlus, X, Copy, Home, Heart,
  Search, SlidersHorizontal, Users, Leaf, IndianRupee, ChevronRight, Bot,
  Umbrella, Zap, Sunrise, Sun, Sunset, MapPin,
} from 'lucide-react-native';
import { mockServices, currentWeather } from '@data/mockServices';
import { addBooking, resolveCustomerId } from '@data/mockBookings';
import { getServiceDiagnosis } from '@services/aiService';
import { shareReceipt } from '@utils/receipt';
import { useAuth } from '@context/AuthContext';
import { useLanguage } from '@context/LanguageContext';
import useSpeechToText from '@hooks/useSpeechToText';
import { ScreenContainer, Confetti } from '@components/app';
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

// PRESENTATION-ONLY metadata for the Step-3 quick-slot cards, keyed by the EXISTING slot `val`.
// Adds an icon, a title/subtitle split, and a "recommended" flag — no new booking logic. The
// selection still runs setTime(slot.val) with the same value. 10:00 AM is flagged recommended
// because it is already the app's default selected time (useState('10:00 AM')).
const SLOT_META = {
  ASAP: { Icon: Zap, title: 'ASAP', note: '45 mins', sub: 'Get it done soon' },
  '10:00 AM': { Icon: Sunrise, title: '10:00 AM', sub: 'Morning slot', recommended: true },
  '02:00 PM': { Icon: Sun, title: '02:00 PM', sub: 'Afternoon slot' },
  '05:00 PM': { Icon: Sunset, title: '05:00 PM', sub: 'Evening slot' },
};

// Frontend-only pretty date for display (e.g. "Today, 09 Sep 2026" + "Wednesday"). Formats the
// EXISTING `date` string; falls back to the raw value if it can't be parsed. No data change.
function formatServiceDate(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d)) return { primary: dateStr, weekday: '' };
  const dd = String(d.getDate()).padStart(2, '0');
  const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()];
  const weekday = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.getDay()];
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  return { primary: `${isToday ? 'Today, ' : ''}${dd} ${mon} ${d.getFullYear()}`, weekday };
}

/**
 * toggleTag — frontend-only Set-style toggle over the comma-separated description string.
 * The quick-select tags are stored inline in the existing `description` state (unchanged data
 * format). This adds the tag if it isn't already present as a segment, or removes it if it is —
 * so re-tapping deselects (never duplicates), and multiple tags can coexist. Result is clamped
 * to the 300-char limit.
 */
function toggleTag(desc, tag) {
  const segments = (desc || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const idx = segments.indexOf(tag);
  if (idx >= 0) {
    segments.splice(idx, 1); // already selected → remove (deselect)
  } else {
    segments.push(tag); // not selected → add
  }
  return segments.join(', ').slice(0, DESC_MAX);
}

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

// Frontend-only description limit (matches the "/300" counter shown in the UI). Enforced at the
// input level via TextInput maxLength and clamped for programmatic writes (quick-select + mic).
const DESC_MAX = 300;

// PRESENTATION-ONLY short descriptions for quick-select cards, keyed by the label text (the part
// after the leading emoji). Falls back to no description if a tag isn't listed. This adds no data
// to the tag values sent into the description — it's purely a display subtitle.
const QS_DESC = {
  'Pipe Leakage': 'Water leaking from pipes',
  'Tap / Faucet Repair': 'Fix or replace taps and faucets',
  'Drain Blockage': 'Clogged sinks, drains or toilets',
  'General Plumbing Check': 'Inspection and maintenance',
};

// PRESENTATION-ONLY short descriptions for the Step-1 service cards, keyed by service id.
// These do NOT modify the backend service data (mockServices keeps its own `description`).
const FRONT_DESC = {
  plumbing: 'Fix leaks, pipes & more',
  electrical: 'Wiring, repairs & installations',
  cleaning: 'Home & office cleaning',
  painting: 'Interior & exterior painting',
  carpentry: 'Furniture, doors & woodwork',
  'ac-repair': 'Service, repair & installation',
  'pest-control': 'Get rid of pests safely',
  'appliance-repair': 'TV, fridge, washer & more',
};

// PRESENTATION-ONLY trust/value indicators (no backend data).
const TRUST_ITEMS = [
  { icon: ShieldCheck, label: 'Verified\nProfessionals', bg: '#ecfdf5', fg: '#059669' },
  { icon: IndianRupee, label: 'Transparent\nPricing', bg: '#fff7ed', fg: '#ea580c' },
  { icon: Users, label: 'Community\nTrusted', bg: '#f5f3ff', fg: '#7c3aed' },
  { icon: Leaf, label: 'Quality\nAssured', bg: '#eff6ff', fg: '#2563eb' },
];

// PRESENTATION-ONLY pastel tint per service id for the card icon area.
const SERVICE_TINT = {
  plumbing: '#eff6ff',
  electrical: '#fffbeb',
  cleaning: '#ecfdf5',
  painting: '#f5f3ff',
  carpentry: '#fff7ed',
  'ac-repair': '#ecfeff',
  'pest-control': '#fef2f2',
  'appliance-repair': '#eef2ff',
};

// LanguageContext stores a code ('en'|'hi'|'bn'|null); getServiceDiagnosis wants the English
// language NAME ('English'|'Hindi'|'Bengali'). This mapping is the fix for the web app's
// hardcoded-'English' diagnosis bug (BookingPage.jsx:107) — the RN app passes the user's
// actually-selected language through instead of a literal 'English'.
const LANG_NAME = { en: 'English', hi: 'Hindi', bn: 'Bengali' };

export default function BookingScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { user, profile } = useAuth();
  const { language } = useLanguage();

  // Square service tile size, computed dynamically so exactly 2 cards fit per row and stay a
  // true 1:1 square on any phone width: (screen - side padding*2 - gap) / 2.
  // Side padding is scrollContent's spacing.space4 (16) each side; gap is spacing.space3 (12).
  const svcCardSize = Math.floor((screenWidth - spacing.space4 * 2 - spacing.space3) / 2);
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
  // Frontend-only client-side search over the existing mockServices list (no backend query).
  const [serviceQuery, setServiceQuery] = useState('');
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
    // Append transcription, but clamp the combined result to the 300-char limit so voice input
    // can never push the description past the maximum.
    onFinalResult: (text) => setDescription((prev) => (prev ? `${prev} ${text}` : text).slice(0, DESC_MAX)),
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
  // Frontend-only presentation: the EXISTING success state (confirmedBooking) drives an animated
  // premium confirmation. All data, the OTP value, and the three action handlers are unchanged.
  if (confirmedBooking) {
    return (
      <BookingConfirmation
        booking={confirmedBooking}
        insetsTop={insets.top}
        onTrack={() => navigation.navigate('LiveTrackingMap', { bookingId: confirmedBooking.id })}
        onShare={() => shareReceipt(confirmedBooking)}
        onViewBookings={() => navigation.navigate('CustomerBookings')}
      />
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
              <View style={styles.stepRow}>
                {/* left connector (hidden on the first step) */}
                <View style={[styles.stepLine, i === 0 && styles.stepLineHidden, done && styles.stepLineDone]} />
                <View style={[styles.stepCircle, active && styles.stepCircleActive, done && styles.stepCircleDone]}>
                  {done ? <Check size={13} color={colors.white} strokeWidth={3} /> : <Text style={[styles.stepNum, (active || done) && styles.stepNumActive]}>{n}</Text>}
                </View>
                {/* right connector (hidden on the last step) */}
                <View style={[styles.stepLine, i === STEP_LABELS.length - 1 && styles.stepLineHidden, step > n && styles.stepLineDone]} />
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
        {/* STEP 1 — choose service (premium redesign, frontend-only) */}
        {step === 1 && (
          <View>
            {/* Header with a very soft purple glow behind it */}
            <View style={styles.s1HeaderWrap}>
              <View pointerEvents="none" style={styles.s1Glow} />
              <Text style={styles.s1Title}>What service do you need?</Text>
              <Text style={styles.s1Sub}>Select a verified cooperative service category</Text>
            </View>

            {/* Trust / value indicators (presentation-only) */}
            <View style={styles.trustRow}>
              {TRUST_ITEMS.map(({ icon: TIcon, label, bg, fg }) => (
                <View key={label} style={styles.trustItem}>
                  <View style={[styles.trustIcon, { backgroundColor: bg }]}>
                    <TIcon size={17} color={fg} strokeWidth={2.2} />
                  </View>
                  <Text style={styles.trustLabel}>{label}</Text>
                </View>
              ))}
            </View>

            {/* Search + filter (client-side filter over the existing list) */}
            <View style={styles.searchRow}>
              <View style={styles.searchBox}>
                <Search size={18} color={colors.gray400} strokeWidth={2.2} />
                <TextInput
                  style={styles.searchInput}
                  value={serviceQuery}
                  onChangeText={setServiceQuery}
                  placeholder="Search for a service..."
                  placeholderTextColor={colors.gray400}
                  returnKeyType="search"
                />
                {serviceQuery.length > 0 && (
                  <Pressable onPress={() => setServiceQuery('')} hitSlop={8} accessibilityLabel="Clear search">
                    <X size={16} color={colors.gray400} />
                  </Pressable>
                )}
              </View>
              <View style={styles.filterBtn}>
                <SlidersHorizontal size={18} color={colors.primary600} strokeWidth={2.2} />
              </View>
            </View>

            {/* Premium 2-column service grid — same data + same selection behaviour */}
            <View style={styles.svcGrid}>
              {mockServices
                .filter((s) => s.name.toLowerCase().includes(serviceQuery.trim().toLowerCase()))
                .map((s) => {
                  const SIcon = serviceIcon(s.icon);
                  const selected = selectedService === s.id;
                  const tint = SERVICE_TINT[s.id] || colors.gray50;
                  return (
                    <PressableScale
                      key={s.id}
                      style={[styles.svcCard, { width: svcCardSize, height: svcCardSize }, selected && styles.svcCardSelected]}
                      onPress={() => { setSelectedService(s.id); setStep(2); }}
                      accessibilityLabel={`${s.name}, starting from ₹${s.basePrice}`}
                    >
                      {selected && (
                        <View style={styles.svcCheck}>
                          <Check size={11} color={colors.white} strokeWidth={3} />
                        </View>
                      )}
                      {/* TOP: icon + name + description */}
                      <View style={styles.svcTop}>
                        <View style={[styles.svcIconTile, { backgroundColor: tint }]}>
                          <SIcon size={24} color={s.color} strokeWidth={2} />
                        </View>
                        <Text style={styles.svcCardName} numberOfLines={2}>{s.name}</Text>
                        <Text style={styles.svcDesc} numberOfLines={2}>{FRONT_DESC[s.id] || ''}</Text>
                      </View>
                      {/* BOTTOM: price + arrow */}
                      <View style={styles.svcFooter}>
                        <View style={styles.svcPriceWrap}>
                          <Text style={styles.svcFrom}>Starting from</Text>
                          <Text style={styles.svcPrice}>₹{s.basePrice}</Text>
                        </View>
                        <View style={[styles.svcArrow, selected && styles.svcArrowSelected]}>
                          <ArrowRight size={15} color={selected ? colors.white : colors.primary600} strokeWidth={2.4} />
                        </View>
                      </View>
                    </PressableScale>
                  );
                })}
            </View>

            {/* Supporting Cooperatives banner (presentation-only) */}
            <View style={styles.coopBanner}>
              <View style={styles.coopIcon}>
                <Leaf size={18} color={colors.success600} strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.coopTitle}>Supporting Cooperatives</Text>
                <Text style={styles.coopSub}>Your booking helps local communities grow</Text>
              </View>
              <ChevronRight size={20} color={colors.primary400} strokeWidth={2.2} />
            </View>
          </View>
        )}

        {/* STEP 2 — describe (premium redesign, frontend-only) */}
        {step === 2 && (
          <View>
            {/* Premium service header */}
            <View style={styles.s2Head}>
              <View style={[styles.s2HeadIcon, { backgroundColor: `${service.color}1F` }]}>
                <Icon size={26} color={service.color} strokeWidth={2.1} />
              </View>
              <View style={styles.serviceHeadText}>
                <Text style={styles.s2Title}>{service.name}</Text>
                <Text style={styles.s2Sub}>Tell us about the issue so we can find the right expert for you.</Text>
              </View>
            </View>

            {/* Quick select — 2-column cards (same append onPress + same tag values) */}
            <Text style={styles.s2Section}>Quick select</Text>
            <Text style={styles.s2SectionSub}>Choose the option that best matches your issue</Text>
            <View style={styles.qsGrid}>
              {currentTags.map((tag) => {
                // Split the leading emoji (icon) from the label text for display only —
                // the FULL `tag` string is still what gets appended to the description.
                const firstSpace = tag.indexOf(' ');
                const emoji = firstSpace > 0 ? tag.slice(0, firstSpace) : '';
                const labelText = firstSpace > 0 ? tag.slice(firstSpace + 1) : tag;
                // Selected only when the tag exists as a whole comma-separated segment (matches
                // toggleTag), so it flips off correctly on deselect and never false-matches.
                const picked = description.split(',').map((sgmt) => sgmt.trim()).includes(tag);
                return (
                  <PressableScale
                    key={tag}
                    style={[styles.qsCard, picked && styles.qsCardSelected]}
                    onPress={() => setDescription((prev) => toggleTag(prev, tag))}
                    accessibilityLabel={labelText}
                  >
                    {picked && (
                      <View style={styles.qsCheck}>
                        <Check size={11} color={colors.white} strokeWidth={3} />
                      </View>
                    )}
                    <View style={styles.qsIconTile}>
                      <Text style={styles.qsEmoji}>{emoji}</Text>
                    </View>
                    <Text style={styles.qsLabel} numberOfLines={2}>{labelText}</Text>
                    {QS_DESC[labelText] ? (
                      <Text style={styles.qsCardDesc} numberOfLines={2}>{QS_DESC[labelText]}</Text>
                    ) : null}
                  </PressableScale>
                );
              })}
            </View>

            {/* Describe your issue */}
            <View style={styles.descHeadRow}>
              <Text style={styles.s2Section}>
                Describe your issue <Text style={styles.optional}>(optional)</Text>
              </Text>
              <Text style={[styles.charCount, description.length >= DESC_MAX && styles.charCountMax]}>
                {Math.min(description.length, DESC_MAX)}/{DESC_MAX}
              </Text>
            </View>
            <TextArea
              value={stt.listening && stt.partial ? `${description}${description ? ' ' : ''}${stt.partial}` : description}
              onChangeText={setDescription}
              placeholder="e.g. Kitchen sink is leaking, water dripping below the pipe…"
              rows={3}
              maxLength={DESC_MAX}
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
            <View style={[styles.descHeadRow, { marginTop: spacing.space5 }]}>
              <Text style={styles.s2Section}>
                Add a photo <Text style={styles.optional}>(optional)</Text>
              </Text>
            </View>
            <Text style={styles.s2SectionSub}>A photo helps us understand the issue better</Text>
            {photo ? (
              <View style={styles.photoPreviewWrap}>
                <Image source={{ uri: photo.uri }} style={styles.photoPreview} />
                <Pressable style={styles.photoRemove} onPress={() => setPhoto(null)} hitSlop={8} accessibilityLabel="Remove photo">
                  <X size={16} color={colors.white} />
                </Pressable>
              </View>
            ) : (
              <View style={styles.photoBtnRow}>
                <PressableScale style={styles.photoBtn2} onPress={pickFromCamera} accessibilityLabel="Camera">
                  <View style={styles.photoBtn2Icon}>
                    <Camera size={24} color={colors.primary600} strokeWidth={2} />
                  </View>
                  <Text style={styles.photoBtn2Text}>Camera</Text>
                </PressableScale>
                <PressableScale style={styles.photoBtn2} onPress={pickFromGallery} accessibilityLabel="Gallery">
                  <View style={styles.photoBtn2Icon}>
                    <ImagePlus size={24} color={colors.primary600} strokeWidth={2} />
                  </View>
                  <Text style={styles.photoBtn2Text}>Gallery</Text>
                </PressableScale>
              </View>
            )}

            {/* AI Smart Diagnosis — premium card. Groq-backed (text or vision when a photo is
                attached). Same runAiDiagnosis handler + disabled/loading behaviour. */}
            <PressableScale
              style={[styles.aiCard, diagnosing && styles.aiCardBusy]}
              onPress={runAiDiagnosis}
              disabled={diagnosing}
              accessibilityLabel="AI Smart Diagnosis"
            >
              <View style={styles.aiCardIcon}>
                {diagnosing ? (
                  <ActivityIndicator size="small" color={colors.primary600} />
                ) : (
                  <Bot size={24} color={colors.primary600} strokeWidth={2.1} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.aiCardTitleRow}>
                  <Text style={styles.aiCardTitle}>
                    {diagnosing ? 'Analyzing your issue…' : photo ? 'AI Diagnosis with Photo' : 'AI Smart Diagnosis'}
                  </Text>
                  <View style={styles.aiBadge}>
                    <Sparkles size={10} color={colors.primary700} strokeWidth={2.4} />
                    <Text style={styles.aiBadgeText}>Powered by AI</Text>
                  </View>
                </View>
                <Text style={styles.aiCardText}>
                  Get an instant expert read on the likely cause, urgency, and repair time.
                  {photo ? ' Your photo will be analyzed too.' : ' Attach a photo for a sharper diagnosis.'}
                </Text>
              </View>
              <ArrowRight size={18} color={colors.primary600} strokeWidth={2.4} />
            </PressableScale>

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
            {/* Header */}
            <View style={styles.s3HeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.s2Title}>Schedule your service</Text>
                <Text style={styles.s2Sub}>Pick a convenient date and time slot</Text>
              </View>
              <View style={styles.s3HeaderIcon}>
                <Calendar size={26} color={colors.primary600} strokeWidth={2} />
              </View>
            </View>

            {/* Rain / weather protection card (only when a weather adjustment is active) */}
            {weatherActive && (
              <View style={styles.rainCard}>
                <View style={styles.rainIcon}>
                  <Umbrella size={22} color={colors.primary600} strokeWidth={2.1} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.rainTitleRow}>
                    <Text style={styles.rainTitle}>Rain Protection Included</Text>
                    <View style={styles.rainBadge}>
                      <Text style={styles.rainBadgeText}>For your peace of mind</Text>
                    </View>
                  </View>
                  <Text style={styles.rainText}>
                    If bad weather delays your service, {weatherPct}% of the adjustment goes directly to the technician.
                  </Text>
                </View>
              </View>
            )}

            {/* Quick slots — premium selectable cards (same setTime handler + slot vals) */}
            <View style={styles.descHeadRow}>
              <Text style={styles.s2Section}>Quick slots</Text>
              <Text style={styles.s3SectionHint}>Choose a time that works for you</Text>
            </View>
            <View style={styles.slotGrid}>
              {TIME_SLOTS.map((slot) => {
                const meta = SLOT_META[slot.val] || { Icon: Clock, title: slot.val, sub: '' };
                const SlotIcon = meta.Icon;
                const picked = time === slot.val;
                return (
                  <PressableScale
                    key={slot.val}
                    style={[styles.slotCard, picked && styles.slotCardSelected]}
                    onPress={() => setTime(slot.val)}
                    accessibilityLabel={`${meta.title} ${meta.sub}`}
                  >
                    {meta.recommended && (
                      <View style={styles.slotRecommended}>
                        <Text style={styles.slotRecommendedText}>Recommended</Text>
                      </View>
                    )}
                    <View style={styles.slotTopRow}>
                      <View style={[styles.slotIconTile, picked && styles.slotIconTileSelected]}>
                        <SlotIcon size={20} color={picked ? colors.primary600 : colors.gray500} strokeWidth={2.1} />
                      </View>
                      <View style={[styles.slotRadio, picked && styles.slotRadioSelected]}>
                        {picked && <View style={styles.slotRadioDot} />}
                      </View>
                    </View>
                    <Text style={styles.slotTitle}>
                      {meta.title}
                      {meta.note ? <Text style={styles.slotNote}> ({meta.note})</Text> : null}
                    </Text>
                    <Text style={styles.slotSub}>{meta.sub}</Text>
                  </PressableScale>
                );
              })}
            </View>

            {/* Date + Preferred time cards (display the real state; date is display-only as before,
                time reflects the quick-slot selection). */}
            <View style={styles.dtRow}>
              <View style={styles.dtCard}>
                <View style={styles.dtIcon}>
                  <Calendar size={18} color={colors.primary600} strokeWidth={2.1} />
                </View>
                <Text style={styles.dtLabel}>Service date</Text>
                <Text style={styles.dtValue} numberOfLines={1}>{formatServiceDate(date).primary}</Text>
                {formatServiceDate(date).weekday ? <Text style={styles.dtSub}>{formatServiceDate(date).weekday}</Text> : null}
              </View>
              <View style={styles.dtCard}>
                <View style={styles.dtIcon}>
                  <Clock size={18} color={colors.primary600} strokeWidth={2.1} />
                </View>
                <Text style={styles.dtLabel}>Preferred time</Text>
                <Text style={styles.dtValue} numberOfLines={1}>{time}</Text>
                <Text style={styles.dtSub}>{SLOT_META[time]?.sub || 'Selected slot'}</Text>
              </View>
            </View>

            {/* Service location — premium card wrapping the existing editable address input */}
            <View style={styles.locCard}>
              <View style={styles.locIcon}>
                <MapPin size={20} color={colors.primary600} strokeWidth={2.1} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.locLabel}>Service location</Text>
                <TextArea
                  value={address}
                  onChangeText={setAddress}
                  rows={2}
                  style={styles.locInput}
                />
              </View>
            </View>
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

/**
 * BookingConfirmation — the premium, animated confirmation view (frontend-only).
 *
 * Animation sequence (exactly the requested order):
 *   1. Success icon springs up + fades in (starts small/transparent).
 *   2. The white checkmark draws/scales in on top of the green circle.
 *   3. Short delay.
 *   4. Confetti bursts from around the icon.
 *   5. The rest of the content fades/slides in and settles.
 *
 * All booking values come from the EXISTING `booking` object; the OTP keeps the existing frontend
 * value (4892); the three actions call the handlers passed down unchanged.
 */
const CONFIRM_OTP = '4892'; // Existing frontend OTP value (unchanged; see file header).

function BookingConfirmation({ booking, insetsTop, onTrack, onShare, onViewBookings }) {
  // Resolve the service's icon from EXISTING data: booking.serviceId -> mockServices.icon name
  // -> lucide component (via the existing serviceIcon registry). No new fields, no fake data.
  const svc = mockServices.find((s) => s.id === booking.serviceId);
  const ServiceIcon = serviceIcon(svc?.icon);
  const serviceColor = svc?.color || colors.primary600;

  const [copied, setCopied] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  // Animated values.
  const iconScale = useRef(new Animated.Value(0.4)).current;
  const iconOpacity = useRef(new Animated.Value(0)).current;
  const checkScale = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0.6)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentShift = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    // 1) Icon springs in + fades in; the soft ring pulses out behind it.
    Animated.parallel([
      Animated.spring(iconScale, { toValue: 1, friction: 5, tension: 90, useNativeDriver: true }),
      Animated.timing(iconOpacity, { toValue: 1, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.sequence([
        Animated.timing(ringOpacity, { toValue: 0.5, duration: 200, useNativeDriver: true }),
        Animated.parallel([
          Animated.timing(ringScale, { toValue: 1.35, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.timing(ringOpacity, { toValue: 0, duration: 520, useNativeDriver: true }),
        ]),
      ]),
    ]).start(() => {
      // 2) Checkmark draws in AFTER the circle has settled.
      Animated.spring(checkScale, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }).start(() => {
        // 3) Short delay, THEN 4) confetti, then 5) content settles.
        setTimeout(() => {
          setShowConfetti(true);
          Animated.parallel([
            Animated.timing(contentOpacity, { toValue: 1, duration: 380, easing: Easing.out(Easing.quad), useNativeDriver: true }),
            Animated.timing(contentShift, { toValue: 0, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          ]).start();
        }, 260);
      });
    });
    // Run once on mount (a fresh confirmation always remounts with a new booking).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCopy = () => {
    // Visual-only copy feedback (no clipboard dependency is present in the project; adding one
    // is out of scope for a frontend styling task). The OTP value itself is unchanged.
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <ScreenContainer contentStyle={[styles.confirmContent, { paddingTop: insetsTop + spacing.space4 }]}>
      {/* ---- Success header ---- */}
      <View style={styles.successHeader}>
        <Confetti run={showConfetti} originY={40} />

        <View style={styles.iconStage}>
          <Animated.View
            style={[styles.successRing, { opacity: ringOpacity, transform: [{ scale: ringScale }] }]}
            pointerEvents="none"
          />
          <Animated.View style={[styles.successIcon, { opacity: iconOpacity, transform: [{ scale: iconScale }] }]}>
            <Animated.View style={{ transform: [{ scale: checkScale }] }}>
              <Check size={44} color={colors.white} strokeWidth={3.5} />
            </Animated.View>
          </Animated.View>
        </View>

        <Animated.View style={{ opacity: contentOpacity, transform: [{ translateY: contentShift }], alignItems: 'center' }}>
          <Text style={styles.confirmedTitle}>Booking Confirmed! 🎉</Text>
          <Text style={styles.confirmedSub}>
            Your <Text style={styles.bold}>{booking.serviceName}</Text> service has been scheduled.
          </Text>
        </Animated.View>
      </View>

      <Animated.View style={{ opacity: contentOpacity, transform: [{ translateY: contentShift }] }}>
        {/* ---- Booking details card ---- */}
        <View style={styles.detailsCard}>
          {/* Service summary + status badge */}
          <View style={styles.detailsHead}>
            <View style={[styles.svcIconBox, { backgroundColor: `${serviceColor}1A` }]}>
              <ServiceIcon size={24} color={serviceColor} strokeWidth={2.2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.svcName} numberOfLines={1}>{booking.serviceName}</Text>
              <Text style={styles.svcSub}>Home Service</Text>
            </View>
            <View style={styles.statusBadge}>
              <Check size={12} color={colors.success700} strokeWidth={3} />
              <Text style={styles.statusText}>Scheduled</Text>
            </View>
          </View>

          <View style={styles.detailsDivider} />

          <DetailRow label="Booking ID" value={`#${booking.id}`} mono />
          <DetailRow label="Professional" value={`${booking.workerName}  ★ ${booking.workerRating}`} />
          <DetailRow label="Service Slot" value={`${booking.date} at ${booking.time}`} />
          <DetailRow label="Total Paid" value={`₹${booking.totalPrice}`} hint="GST incl." accent last />
        </View>

        {/* ---- OTP card ---- */}
        <View style={styles.otpCard}>
          <View style={styles.otpHeadRow}>
            <View style={styles.otpShield}>
              <ShieldCheck size={18} color={colors.success700} strokeWidth={2.2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.otpTitle}>Start-Service OTP</Text>
              <Text style={styles.otpHint}>Share this OTP with the worker when they arrive.</Text>
            </View>
          </View>
          <View style={styles.otpValueRow}>
            <Text style={styles.otpCode}>{CONFIRM_OTP}</Text>
            <PressableScale style={styles.otpCopyBtn} onPress={handleCopy} accessibilityLabel="Copy OTP">
              {copied ? (
                <>
                  <Check size={15} color={colors.success700} strokeWidth={3} />
                  <Text style={styles.otpCopyText}>Copied</Text>
                </>
              ) : (
                <>
                  <Copy size={15} color={colors.success700} strokeWidth={2.2} />
                  <Text style={styles.otpCopyText}>Copy</Text>
                </>
              )}
            </PressableScale>
          </View>
        </View>

        {/* ---- Primary CTA ---- */}
        <PressableScale style={styles.primaryBtn} onPress={onTrack} accessibilityLabel="Track Worker Live">
          <Navigation size={18} color={colors.white} strokeWidth={2.4} />
          <Text style={styles.primaryBtnText}>Track Worker Live</Text>
          <ArrowRight size={18} color={colors.white} strokeWidth={2.4} style={styles.primaryBtnArrow} />
        </PressableScale>

        {/* ---- Secondary actions (two-column) ---- */}
        <View style={styles.secondaryRow}>
          <PressableScale style={[styles.secondaryBtn, styles.secondaryPrimary]} onPress={onShare} accessibilityLabel="Share Bill Receipt">
            <Printer size={17} color={colors.primary600} strokeWidth={2.2} />
            <Text style={styles.secondaryPrimaryText}>Share Bill Receipt</Text>
          </PressableScale>
          <PressableScale style={[styles.secondaryBtn, styles.secondaryNeutral]} onPress={onViewBookings} accessibilityLabel="View My Bookings">
            <ClipboardList size={17} color={colors.gray700} strokeWidth={2.2} />
            <Text style={styles.secondaryNeutralText}>View My Bookings</Text>
          </PressableScale>
        </View>

        {/* ---- Thank-you / community card ---- */}
        <View style={styles.thanksCard}>
          <View style={styles.thanksIcon}>
            <Home size={20} color={colors.primary600} strokeWidth={2.2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.thanksTitle}>Thanks for choosing Sahakar Seva</Text>
            <View style={styles.thanksSubRow}>
              <Text style={styles.thanksSub}>Together we build stronger communities</Text>
              <Heart size={13} color={colors.danger500} fill={colors.danger500} strokeWidth={0} />
            </View>
          </View>
        </View>
      </Animated.View>
    </ScreenContainer>
  );
}

/** PressableScale — small press-in scale for premium touch feedback (frontend-only). */
function PressableScale({ children, style, onPress, accessibilityLabel }) {
  const scale = useRef(new Animated.Value(1)).current;
  const to = (v) => Animated.spring(scale, { toValue: v, friction: 6, tension: 180, useNativeDriver: true }).start();
  // The SIZING props (width / flex / margins) must sit on the OUTER Pressable so the element
  // participates in the parent flex/grid layout — otherwise the Pressable is width-less and the
  // 2-column cards collapse into a vertical stack. Everything else (padding, background, border,
  // alignment, gap) stays on the inner Animated.View so the card's content lays out exactly as
  // authored. We derive the outer box style by picking only the sizing keys from `style`.
  const flat = StyleSheet.flatten(style) || {};
  const outerBox = {};
  ['width', 'height', 'minWidth', 'maxWidth', 'flex', 'flexBasis', 'flexGrow', 'flexShrink', 'alignSelf', 'margin', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight', 'marginHorizontal', 'marginVertical'].forEach((k) => {
    if (flat[k] !== undefined) outerBox[k] = flat[k];
  });
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => to(0.96)}
      onPressOut={() => to(1)}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={outerBox}
    >
      <Animated.View style={[style, styles.pressableScaleInner, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

/** DetailRow — a label/value row for the booking details card. */
function DetailRow({ label, value, hint, mono, accent, last }) {
  return (
    <View style={[styles.detailRow, !last && styles.detailRowBorder]}>
      <Text style={styles.detailLabel}>{label}</Text>
      <View style={styles.detailValueWrap}>
        <Text style={[styles.detailValue, mono && styles.mono, accent && styles.detailValueAccent]} numberOfLines={2}>
          {value}
        </Text>
        {hint && <Text style={styles.detailHint}>{hint}</Text>}
      </View>
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
  stepItem: { flex: 1, alignItems: 'center', gap: 5 },
  stepRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch' },
  stepLine: { flex: 1, height: 2, backgroundColor: colors.gray200 },
  stepLineHidden: { backgroundColor: 'transparent' },
  stepLineDone: { backgroundColor: colors.primary400 },
  stepCircle: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.gray100,
    alignItems: 'center', justifyContent: 'center',
    marginHorizontal: 2,
  },
  stepCircleActive: { backgroundColor: colors.primary600 },
  stepCircleDone: { backgroundColor: colors.primary400 },
  stepNum: { fontSize: fontSizes.fsXs, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.gray400 },
  stepNumActive: { color: colors.white },
  stepLabel: { fontSize: 10.5, color: colors.gray400, fontFamily: fontFamilies.interMedium },
  stepLabelActive: { color: colors.primary700, fontFamily: fontFamilies.interSemiBold, fontWeight: fontWeights.fwSemibold },

  // ---- Step 1 (premium) ----
  s1HeaderWrap: { position: 'relative', paddingTop: spacing.space2, marginBottom: spacing.space4 },
  s1Glow: { position: 'absolute', top: -20, left: -30, width: 180, height: 180, borderRadius: 90, backgroundColor: colors.primary50, opacity: 0.7 },
  s1Title: { fontSize: fontSizes.fs2xl, fontWeight: fontWeights.fwExtrabold, fontFamily: fontFamilies.interExtraBold, color: colors.gray900, letterSpacing: -0.5 },
  s1Sub: { fontSize: fontSizes.fsSm, color: colors.gray500, fontFamily: fontFamilies.interMedium, marginTop: 4 },

  trustRow: { flexDirection: 'row', gap: spacing.space2, marginBottom: spacing.space4 },
  trustItem: { flex: 1, alignItems: 'center', gap: 5 },
  trustIcon: { width: 40, height: 40, borderRadius: radii.radiusLg, alignItems: 'center', justifyContent: 'center' },
  trustLabel: { fontSize: 9.5, lineHeight: 12, color: colors.gray600, fontFamily: fontFamilies.interSemiBold, fontWeight: fontWeights.fwSemibold, textAlign: 'center' },

  searchRow: { flexDirection: 'row', gap: spacing.space2, marginBottom: spacing.space4 },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.space2,
    paddingHorizontal: spacing.space3, height: 46, backgroundColor: colors.surfaceWhite,
    borderRadius: radii.radiusLg, borderWidth: 1, borderColor: colors.gray200, ...shadows.shadowSm,
  },
  searchInput: { flex: 1, fontSize: fontSizes.fsSm, fontFamily: fontFamilies.interRegular, color: colors.gray900, padding: 0 },
  filterBtn: {
    width: 46, height: 46, borderRadius: radii.radiusLg, backgroundColor: colors.primary50,
    borderWidth: 1, borderColor: colors.primary100, alignItems: 'center', justifyContent: 'center',
  },

  svcGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing.space3 },
  svcCard: {
    // width/height are set inline to the dynamically-computed square size (svcCardSize) so the
    // tile is a TRUE 1:1 square on any phone width and content is reflowed to fit within it.
    backgroundColor: colors.surfaceWhite, borderRadius: radii.radiusXl,
    padding: spacing.space3, borderWidth: 1, borderColor: colors.gray100, ...shadows.shadowSm,
    justifyContent: 'space-between',
  },
  svcCardSelected: { borderColor: colors.primary400, borderWidth: 2, backgroundColor: '#faf5ff', ...shadows.shadowMd, shadowColor: colors.primary500 },
  svcCheck: {
    position: 'absolute', top: 8, right: 8, width: 18, height: 18, borderRadius: 9,
    backgroundColor: colors.primary600, alignItems: 'center', justifyContent: 'center', zIndex: 2,
  },
  svcTop: {},
  svcIconTile: { width: 40, height: 40, borderRadius: radii.radiusLg, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.space2 },
  svcCardName: { fontSize: fontSizes.fsBase, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.gray900, lineHeight: 19 },
  svcDesc: { fontSize: fontSizes.fsXs, color: colors.gray500, fontFamily: fontFamilies.interRegular, marginTop: 2, lineHeight: 15 },
  svcFooter: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.space2 },
  svcPriceWrap: { flexShrink: 1 },
  svcFrom: { fontSize: 9.5, color: colors.gray400, fontFamily: fontFamilies.interMedium },
  svcPrice: { fontSize: fontSizes.fsLg, fontWeight: fontWeights.fwExtrabold, fontFamily: fontFamilies.interExtraBold, color: colors.gray900, marginTop: 1 },
  svcArrow: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.primary50, alignItems: 'center', justifyContent: 'center' },
  svcArrowSelected: { backgroundColor: colors.primary600 },

  coopBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.space3, marginTop: spacing.space4,
    padding: spacing.space4, borderRadius: radii.radiusXl, backgroundColor: colors.primary50,
    borderWidth: 1, borderColor: colors.primary100,
  },
  coopIcon: { width: 40, height: 40, borderRadius: radii.radiusFull, backgroundColor: colors.success50, alignItems: 'center', justifyContent: 'center' },
  coopTitle: { fontSize: fontSizes.fsSm, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.primary800 },
  coopSub: { fontSize: fontSizes.fsXs, color: colors.gray600, fontFamily: fontFamilies.interRegular, marginTop: 1 },

  h2: { fontSize: fontSizes.fsXl, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.gray900 },
  sub: { fontSize: fontSizes.fsSm, color: colors.gray500, fontFamily: fontFamilies.interRegular, marginTop: 2 },
  label: { fontSize: fontSizes.fsSm, fontWeight: fontWeights.fwMedium, fontFamily: fontFamilies.interMedium, color: colors.gray700, marginBottom: spacing.space2 },
  bold: { fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.gray900, fontSize: fontSizes.fsBase },

  serviceHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.space3, marginBottom: spacing.space4 },
  serviceHeadIcon: { width: 52, height: 52, borderRadius: radii.radiusLg, alignItems: 'center', justifyContent: 'center' },
  serviceHeadText: { flex: 1 },

  // ---- Step 2 (premium) ----
  s2Head: { flexDirection: 'row', alignItems: 'center', gap: spacing.space3, marginBottom: spacing.space5 },
  s2HeadIcon: { width: 56, height: 56, borderRadius: radii.radiusXl, alignItems: 'center', justifyContent: 'center', ...shadows.shadowSm },
  s2Title: { fontSize: fontSizes.fs2xl, fontWeight: fontWeights.fwExtrabold, fontFamily: fontFamilies.interExtraBold, color: colors.gray900, letterSpacing: -0.5 },
  s2Sub: { fontSize: fontSizes.fsSm, color: colors.gray500, fontFamily: fontFamilies.interRegular, marginTop: 3, lineHeight: 18 },
  s2Section: { fontSize: fontSizes.fsBase, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.gray900 },
  s2SectionSub: { fontSize: fontSizes.fsXs, color: colors.gray500, fontFamily: fontFamilies.interRegular, marginTop: 2, marginBottom: spacing.space3 },
  optional: { fontSize: fontSizes.fsSm, fontFamily: fontFamilies.interRegular, color: colors.gray400 },

  descHeadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.space2 },
  charCount: { fontSize: fontSizes.fsXs, color: colors.gray400, fontFamily: fontFamilies.interMedium },
  charCountMax: { color: colors.primary600, fontFamily: fontFamilies.interSemiBold, fontWeight: fontWeights.fwSemibold },

  // Inner view fills the outer Pressable's width so the card's own padding/border/background
  // (carried in `style`) render across the full tile.
  pressableScaleInner: { width: '100%' },

  qsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing.space3, marginBottom: spacing.space5 },
  qsCard: {
    width: '48.5%', alignItems: 'flex-start', gap: spacing.space2,
    padding: spacing.space4, backgroundColor: colors.surfaceWhite, borderRadius: radii.radiusXl,
    borderWidth: 1, borderColor: colors.gray200, ...shadows.shadowSm,
  },
  qsCardSelected: { borderColor: colors.primary400, borderWidth: 2, backgroundColor: '#faf5ff' },
  qsCheck: {
    position: 'absolute', top: 8, right: 8, width: 20, height: 20, borderRadius: 10,
    backgroundColor: colors.primary600, alignItems: 'center', justifyContent: 'center', zIndex: 2,
  },
  // Square icon container (icon on top; label + description sit underneath, per the reference).
  qsIconTile: { width: 48, height: 48, borderRadius: radii.radiusLg, backgroundColor: colors.primary50, alignItems: 'center', justifyContent: 'center' },
  qsEmoji: { fontSize: 24 },
  qsLabel: { fontSize: fontSizes.fsSm, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.gray900, lineHeight: 18 },
  qsCardDesc: { fontSize: fontSizes.fsXs, color: colors.gray500, fontFamily: fontFamilies.interRegular, lineHeight: 15, marginTop: -2 },

  photoBtn2: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.space2, paddingVertical: spacing.space5,
    backgroundColor: colors.surfaceWhite, borderRadius: radii.radiusXl, borderWidth: 1, borderColor: colors.primary100, ...shadows.shadowSm,
  },
  photoBtn2Icon: { width: 44, height: 44, borderRadius: radii.radiusLg, backgroundColor: colors.primary50, alignItems: 'center', justifyContent: 'center' },
  photoBtn2Text: { fontSize: fontSizes.fsSm, fontWeight: fontWeights.fwSemibold, fontFamily: fontFamilies.interSemiBold, color: colors.primary600 },

  aiCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.space3, marginTop: spacing.space5,
    padding: spacing.space4, backgroundColor: '#f5f3ff', borderRadius: radii.radiusXl,
    borderWidth: 1, borderColor: colors.primary100,
  },
  aiCardBusy: { opacity: 0.75 },
  aiCardIcon: { width: 46, height: 46, borderRadius: radii.radiusLg, backgroundColor: colors.surfaceWhite, alignItems: 'center', justifyContent: 'center', ...shadows.shadowSm },
  aiCardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.space2, flexWrap: 'wrap' },
  aiCardTitle: { fontSize: fontSizes.fsBase, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.primary900 },
  aiBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingVertical: 2, paddingHorizontal: 7, backgroundColor: colors.primary100, borderRadius: radii.radiusFull },
  aiBadgeText: { fontSize: 9.5, fontFamily: fontFamilies.interBold, fontWeight: fontWeights.fwBold, color: colors.primary700 },
  aiCardText: { fontSize: fontSizes.fsXs, color: colors.gray600, fontFamily: fontFamilies.interRegular, marginTop: 3, lineHeight: 16 },

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

  // ---- Step 3 (premium schedule) ----
  s3HeaderRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.space3, marginBottom: spacing.space4 },
  s3HeaderIcon: { width: 52, height: 52, borderRadius: radii.radiusXl, backgroundColor: colors.primary50, alignItems: 'center', justifyContent: 'center', ...shadows.shadowSm },
  s3SectionHint: { fontSize: fontSizes.fsXs, color: colors.gray500, fontFamily: fontFamilies.interRegular, flexShrink: 1, textAlign: 'right' },

  rainCard: {
    flexDirection: 'row', gap: spacing.space3, marginBottom: spacing.space5,
    padding: spacing.space4, borderRadius: radii.radiusXl, backgroundColor: '#f5f3ff',
    borderWidth: 1, borderColor: colors.primary100,
  },
  rainIcon: { width: 44, height: 44, borderRadius: radii.radiusLg, backgroundColor: colors.surfaceWhite, alignItems: 'center', justifyContent: 'center', ...shadows.shadowSm },
  rainTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.space2, flexWrap: 'wrap' },
  rainTitle: { fontSize: fontSizes.fsBase, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.primary800 },
  rainBadge: { paddingVertical: 2, paddingHorizontal: 8, backgroundColor: colors.success50, borderRadius: radii.radiusFull, borderWidth: 1, borderColor: '#a7f3d0' },
  rainBadgeText: { fontSize: 9.5, fontFamily: fontFamilies.interSemiBold, fontWeight: fontWeights.fwSemibold, color: colors.success700 },
  rainText: { fontSize: fontSizes.fsXs, color: colors.gray600, fontFamily: fontFamilies.interRegular, marginTop: 4, lineHeight: 16 },

  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing.space3, marginBottom: spacing.space5 },
  slotCard: {
    width: '48.5%', padding: spacing.space4, backgroundColor: colors.surfaceWhite,
    borderRadius: radii.radiusXl, borderWidth: 1, borderColor: colors.gray200, ...shadows.shadowSm,
  },
  slotCardSelected: { borderColor: colors.primary400, borderWidth: 2, backgroundColor: '#faf5ff' },
  slotRecommended: { position: 'absolute', top: -1, right: -1, paddingVertical: 3, paddingHorizontal: 9, backgroundColor: colors.primary600, borderTopRightRadius: radii.radiusXl, borderBottomLeftRadius: radii.radiusLg },
  slotRecommendedText: { fontSize: 9, fontFamily: fontFamilies.interBold, fontWeight: fontWeights.fwBold, color: colors.white },
  slotTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.space3 },
  slotIconTile: { width: 40, height: 40, borderRadius: radii.radiusLg, backgroundColor: colors.gray100, alignItems: 'center', justifyContent: 'center' },
  slotIconTileSelected: { backgroundColor: colors.primary50 },
  slotRadio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.gray300, alignItems: 'center', justifyContent: 'center' },
  slotRadioSelected: { borderColor: colors.primary600 },
  slotRadioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary600 },
  slotTitle: { fontSize: fontSizes.fsBase, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.gray900 },
  slotNote: { fontSize: fontSizes.fsXs, fontFamily: fontFamilies.interRegular, color: colors.gray500 },
  slotSub: { fontSize: fontSizes.fsXs, color: colors.gray500, fontFamily: fontFamilies.interRegular, marginTop: 2 },

  dtRow: { flexDirection: 'row', gap: spacing.space3, marginBottom: spacing.space4 },
  dtCard: { flex: 1, padding: spacing.space4, backgroundColor: colors.surfaceWhite, borderRadius: radii.radiusXl, borderWidth: 1, borderColor: colors.gray100, ...shadows.shadowSm },
  dtIcon: { width: 36, height: 36, borderRadius: radii.radiusLg, backgroundColor: colors.primary50, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.space2 },
  dtLabel: { fontSize: fontSizes.fsXs, color: colors.gray500, fontFamily: fontFamilies.interMedium },
  dtValue: { fontSize: fontSizes.fsBase, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.gray900, marginTop: 2 },
  dtSub: { fontSize: fontSizes.fsXs, color: colors.gray500, fontFamily: fontFamilies.interRegular, marginTop: 1 },

  locCard: {
    flexDirection: 'row', gap: spacing.space3, padding: spacing.space4,
    backgroundColor: colors.surfaceWhite, borderRadius: radii.radiusXl, borderWidth: 1, borderColor: colors.gray100, ...shadows.shadowSm,
  },
  locIcon: { width: 40, height: 40, borderRadius: radii.radiusLg, backgroundColor: colors.primary50, alignItems: 'center', justifyContent: 'center' },
  locLabel: { fontSize: fontSizes.fsXs, color: colors.gray500, fontFamily: fontFamilies.interMedium, marginBottom: spacing.space1 },
  locInput: { gap: 0 },

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

  // ---- Confirmation (premium redesign) ----
  confirmContent: { paddingBottom: spacing.space16 },

  // Success header
  successHeader: { alignItems: 'center', marginBottom: spacing.space6 },
  iconStage: { width: 104, height: 104, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.space4 },
  successRing: {
    position: 'absolute', width: 104, height: 104, borderRadius: 52,
    borderWidth: 2, borderColor: colors.success300 || '#6ee7b7', backgroundColor: colors.success50,
  },
  successIcon: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: colors.success500,
    alignItems: 'center', justifyContent: 'center', ...shadows.shadowGlow, shadowColor: colors.success500,
  },
  confirmedTitle: { fontSize: fontSizes.fs2xl, fontWeight: fontWeights.fwExtrabold, fontFamily: fontFamilies.interExtraBold, color: colors.gray900, textAlign: 'center' },
  confirmedSub: { fontSize: fontSizes.fsBase, color: colors.gray600, fontFamily: fontFamilies.interRegular, textAlign: 'center', marginTop: spacing.space2, lineHeight: 22 },

  // Booking details card
  detailsCard: {
    backgroundColor: colors.surfaceWhite, borderRadius: radii.radiusXl, padding: spacing.space5,
    borderWidth: 1, borderColor: colors.gray100, ...shadows.shadowMd,
  },
  detailsHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.space3 },
  svcIconBox: { width: 48, height: 48, borderRadius: radii.radiusLg, alignItems: 'center', justifyContent: 'center' },
  svcName: { fontSize: fontSizes.fsBase, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.gray900 },
  svcSub: { fontSize: fontSizes.fsXs, color: colors.gray500, fontFamily: fontFamilies.interMedium, marginTop: 1 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 10,
    backgroundColor: colors.success50, borderWidth: 1, borderColor: '#a7f3d0', borderRadius: radii.radiusFull,
  },
  statusText: { fontSize: fontSizes.fsXs, fontFamily: fontFamilies.interSemiBold, fontWeight: fontWeights.fwSemibold, color: colors.success700 },
  detailsDivider: { height: 1, backgroundColor: colors.gray100, marginVertical: spacing.space4 },

  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.space3, paddingVertical: spacing.space3 },
  detailRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.gray100 },
  detailLabel: { fontSize: fontSizes.fsSm, color: colors.gray500, fontFamily: fontFamilies.interMedium },
  detailValueWrap: { flexShrink: 1, alignItems: 'flex-end' },
  detailValue: { fontSize: fontSizes.fsSm, fontWeight: fontWeights.fwSemibold, fontFamily: fontFamilies.interSemiBold, color: colors.gray900, textAlign: 'right' },
  detailValueAccent: { fontSize: fontSizes.fsLg, fontWeight: fontWeights.fwExtrabold, fontFamily: fontFamilies.interExtraBold, color: colors.primary700 },
  detailHint: { fontSize: fontSizes.fsXs, color: colors.gray400, fontFamily: fontFamilies.interRegular, marginTop: 1 },

  mono: { fontFamily: 'monospace' },

  // OTP card
  otpCard: {
    width: '100%', marginTop: spacing.space4, backgroundColor: colors.success50,
    borderRadius: radii.radiusXl, padding: spacing.space4, borderWidth: 1, borderColor: '#a7f3d0',
  },
  otpHeadRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.space3 },
  otpShield: { width: 34, height: 34, borderRadius: radii.radiusMd, backgroundColor: colors.success100, alignItems: 'center', justifyContent: 'center' },
  otpTitle: { fontSize: fontSizes.fsSm, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.success800 },
  otpHint: { fontSize: fontSizes.fsXs, color: colors.success700, fontFamily: fontFamilies.interRegular, marginTop: 2, lineHeight: 16 },
  otpValueRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: spacing.space3, paddingTop: spacing.space3, borderTopWidth: 1, borderTopColor: '#a7f3d0',
  },
  otpCode: { fontSize: fontSizes.fs3xl, fontWeight: fontWeights.fwExtrabold, fontFamily: fontFamilies.interExtraBold, color: colors.success700, letterSpacing: 8 },
  otpCopyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 8, paddingHorizontal: spacing.space3,
    backgroundColor: colors.white, borderRadius: radii.radiusMd, borderWidth: 1, borderColor: '#a7f3d0',
  },
  otpCopyText: { fontSize: fontSizes.fsSm, fontFamily: fontFamilies.interSemiBold, fontWeight: fontWeights.fwSemibold, color: colors.success700 },

  // Primary CTA
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.space2,
    width: '100%', height: 54, marginTop: spacing.space5, backgroundColor: colors.primary700,
    borderRadius: radii.radiusLg, ...shadows.shadowMd, shadowColor: colors.primary700,
  },
  primaryBtnText: { fontSize: fontSizes.fsBase, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.white },
  primaryBtnArrow: { marginLeft: 2 },

  // Secondary actions (two-column)
  secondaryRow: { flexDirection: 'row', gap: spacing.space3, marginTop: spacing.space3 },
  secondaryBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    minHeight: 50, paddingVertical: spacing.space3, paddingHorizontal: spacing.space2, borderRadius: radii.radiusLg, borderWidth: 1.5,
  },
  secondaryPrimary: { backgroundColor: colors.primary50, borderColor: colors.primary200 },
  secondaryPrimaryText: { fontSize: fontSizes.fsSm, fontWeight: fontWeights.fwSemibold, fontFamily: fontFamilies.interSemiBold, color: colors.primary700, flexShrink: 1 },
  secondaryNeutral: { backgroundColor: colors.surfaceWhite, borderColor: colors.gray200 },
  secondaryNeutralText: { fontSize: fontSizes.fsSm, fontWeight: fontWeights.fwSemibold, fontFamily: fontFamilies.interSemiBold, color: colors.gray700, flexShrink: 1 },

  // Thank-you / community card
  thanksCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.space3, marginTop: spacing.space5,
    padding: spacing.space4, borderRadius: radii.radiusXl, backgroundColor: colors.primary50,
    borderWidth: 1, borderColor: colors.primary100,
  },
  thanksIcon: { width: 40, height: 40, borderRadius: radii.radiusFull, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  thanksTitle: { fontSize: fontSizes.fsSm, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.primary900 },
  thanksSubRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2, flexWrap: 'wrap' },
  thanksSub: { fontSize: fontSizes.fsXs, color: colors.primary700, fontFamily: fontFamilies.interRegular },
});
