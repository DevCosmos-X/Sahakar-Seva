import { useEffect, useRef } from 'react';
import {
  Modal as RNModal,
  View,
  Text,
  Pressable,
  Animated,
  Easing,
  ScrollView,
  Linking,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Phone, AlertCircle, Headphones, Shield, MessageCircle, X, Building2, Info, ChevronRight } from 'lucide-react-native';
import { colors, spacing, radii, shadows, glass, fontSizes, fontWeights, fontFamilies } from '@theme';

/**
 * HelplineModal — premium redesign (frontend-only).
 *
 * BEHAVIOUR PRESERVED EXACTLY:
 *  - Same public API: { isOpen, onClose }.
 *  - The same four helplines, their labels and phone numbers, unchanged.
 *  - call() dials via Linking.openURL('tel:' + number.replace(/-/g,'')) — the exact existing
 *    dialer convention (the web <a href="tel:"> port). No backend, no API, no data source change.
 *
 * VISUAL REDESIGN:
 *  - Self-contained bottom-sheet-style RNModal with an Animated slide-up + scrim fade (so the
 *    shared Modal primitive used elsewhere is left untouched).
 *  - Drag handle, premium header (headset icon in a pastel-green circle, title, subtitle, a
 *    "Support • Safety • Your Rights • Always" chip, circular close).
 *  - Four themed contact cards (tinted background, rounded-square icon tile, title/desc/number,
 *    a 24x7 badge, and a circular Call Now button with press-scale feedback).
 *  - An offline "Seva Kendra" info card + a community footer message.
 *
 * The per-card `theme`/`desc` values below are PRESENTATION config (colors + display copy),
 * not backend data. The `number` and `label` values are the existing ones, unchanged.
 */

const HELPLINES = [
  {
    id: 1,
    label: 'Sahakar Seva Helpline',
    number: '1800-XXX-SEVA',
    type: 'toll-free',
    icon: Headphones,
    desc: '24x7 Toll-Free • Service booking help and general assistance',
    tint: '#ecfdf5',
    border: '#a7f3d0',
    accent: colors.success600,
    accentDark: colors.success700,
  },
  {
    id: 2,
    label: 'Worker Welfare Helpline',
    number: '1800-XXX-KAAM',
    type: 'toll-free',
    icon: Shield,
    desc: '24x7 Toll-Free • Worker rights & safety support',
    tint: '#eff6ff',
    border: '#bfdbfe',
    accent: colors.info600,
    accentDark: colors.info700,
  },
  {
    id: 3,
    label: 'Emergency SOS',
    number: '112',
    type: 'emergency',
    icon: AlertCircle,
    desc: 'Police / Fire / Medical Emergency • Immediate help',
    tint: '#fef2f2',
    border: '#fecaca',
    accent: colors.danger500,
    accentDark: colors.danger600,
  },
  {
    id: 4,
    label: 'Consumer Forum',
    number: '1800-XXX-COURT',
    type: 'toll-free',
    icon: MessageCircle,
    desc: 'Dispute resolution & complaints • Get support for service issues',
    tint: '#f5f3ff',
    border: '#ddd6fe',
    accent: '#8b5cf6',
    accentDark: '#7c3aed',
  },
];

export default function HelplineModal({ isOpen, onClose }) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  // Slide-up sheet + scrim fade (RN Animated, no new dependency).
  const translateY = useRef(new Animated.Value(height)).current;
  const scrimOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isOpen) {
      Animated.parallel([
        Animated.timing(translateY, { toValue: 0, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(scrimOpacity, { toValue: 1, duration: 260, useNativeDriver: true }),
      ]).start();
    } else {
      translateY.setValue(height);
      scrimOpacity.setValue(0);
    }
  }, [isOpen, height, translateY, scrimOpacity]);

  const call = (number) => {
    // Strip dashes exactly as before (tel:${number.replace(/-/g,'')}).
    Linking.openURL(`tel:${number.replace(/-/g, '')}`);
  };

  return (
    <RNModal visible={isOpen} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[styles.scrim, { opacity: scrimOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close helpline numbers" />
      </Animated.View>

      <View style={styles.centerWrap} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.sheet,
            { maxHeight: height * 0.9, paddingBottom: insets.bottom + spacing.space4, transform: [{ translateY }] },
          ]}
        >
          {/* Drag handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Headphones size={26} color={colors.success600} strokeWidth={2.1} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Helpline Numbers</Text>
              <Text style={styles.subtitle}>We're here 24x7 to help you</Text>
            </View>
            <Pressable style={styles.close} onPress={onClose} accessibilityLabel="Close" hitSlop={8}>
              <X size={20} color={colors.gray600} strokeWidth={2.2} />
            </Pressable>
          </View>

          <View style={styles.badgeChip}>
            <Text style={styles.badgeChipText}>Support • Safety • Your Rights • Always</Text>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {HELPLINES.map((h) => {
              const Icon = h.icon;
              return (
                <View key={h.id} style={[styles.card, { backgroundColor: h.tint, borderColor: h.border }]}>
                  <View style={[styles.cardIcon, { backgroundColor: `${h.accent}1F` }]}>
                    <Icon size={24} color={h.accent} strokeWidth={2.2} />
                  </View>

                  <View style={styles.cardInfo}>
                    <View style={styles.cardTitleRow}>
                      <Text style={styles.cardLabel} numberOfLines={2}>{h.label}</Text>
                      <View style={[styles.liveBadge, { borderColor: h.border }]}>
                        <View style={[styles.liveDot, { backgroundColor: h.accent }]} />
                        <Text style={[styles.liveText, { color: h.accentDark }]}>24x7</Text>
                      </View>
                    </View>
                    <Text style={styles.cardDesc}>{h.desc}</Text>
                    <Text style={[styles.cardNumber, { color: h.accentDark }]}>{h.number}</Text>
                  </View>

                  <CallButton color={h.accent} onPress={() => call(h.number)} label={`Call ${h.label}`} />
                </View>
              );
            })}

            {/* Offline registration card */}
            <View style={styles.offlineCard}>
              <View style={styles.offlineIcon}>
                <Building2 size={22} color={colors.info600} strokeWidth={2.1} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.offlineHeadRow}>
                  <Info size={13} color={colors.info600} strokeWidth={2.4} />
                  <Text style={styles.offlineHint}>For offline registration visit your nearest</Text>
                </View>
                <Text style={styles.offlineStrong}>Seva Kendra</Text>
              </View>
              <ChevronRight size={20} color={colors.info600} strokeWidth={2.2} />
            </View>

            <Text style={styles.footer}>Together for a safer, stronger community 💙</Text>
          </ScrollView>
        </Animated.View>
      </View>
    </RNModal>
  );
}

/** Circular Call Now button with press-scale feedback. */
function CallButton({ color, onPress, label }) {
  const scale = useRef(new Animated.Value(1)).current;
  const to = (v) => Animated.spring(scale, { toValue: v, friction: 6, tension: 200, useNativeDriver: true }).start();
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => to(0.9)}
      onPressOut={() => to(1)}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
    >
      <Animated.View style={[styles.callBtn, { backgroundColor: color, transform: [{ scale }] }]}>
        <Phone size={20} color={colors.white} strokeWidth={2.4} fill={colors.white} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: glass.overlayBackground },
  centerWrap: { flex: 1, justifyContent: 'flex-end' },

  sheet: {
    backgroundColor: colors.surfaceWhite,
    borderTopLeftRadius: radii.radius2xl,
    borderTopRightRadius: radii.radius2xl,
    paddingTop: spacing.space3,
    paddingHorizontal: spacing.space5,
    ...shadows.shadowXl,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: radii.radiusFull, backgroundColor: colors.gray200, marginBottom: spacing.space4 },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.space3 },
  headerIcon: { width: 52, height: 52, borderRadius: radii.radiusFull, backgroundColor: '#ecfdf5', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: fontSizes.fsXl, fontWeight: fontWeights.fwExtrabold, fontFamily: fontFamilies.interExtraBold, color: colors.gray900 },
  subtitle: { fontSize: fontSizes.fsSm, color: colors.gray500, fontFamily: fontFamilies.interRegular, marginTop: 2 },
  close: { width: 36, height: 36, borderRadius: radii.radiusFull, backgroundColor: colors.gray100, alignItems: 'center', justifyContent: 'center' },

  badgeChip: {
    alignSelf: 'flex-start', marginTop: spacing.space3,
    paddingVertical: 5, paddingHorizontal: spacing.space3,
    backgroundColor: colors.success50, borderRadius: radii.radiusFull, borderWidth: 1, borderColor: '#a7f3d0',
  },
  badgeChipText: { fontSize: fontSizes.fsXs, fontFamily: fontFamilies.interSemiBold, fontWeight: fontWeights.fwSemibold, color: colors.success700 },

  scroll: { marginTop: spacing.space4 },
  scrollContent: { gap: spacing.space3, paddingBottom: spacing.space2 },

  // Contact card
  card: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.space3,
    padding: spacing.space4, borderRadius: radii.radiusXl, borderWidth: 1, ...shadows.shadowSm,
  },
  cardIcon: { width: 48, height: 48, borderRadius: radii.radiusLg, alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.space2 },
  cardLabel: { flex: 1, fontSize: fontSizes.fsBase, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.gray900 },
  liveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 2, paddingHorizontal: 7,
    backgroundColor: colors.surfaceWhite, borderRadius: radii.radiusFull, borderWidth: 1,
  },
  liveDot: { width: 5, height: 5, borderRadius: radii.radiusFull },
  liveText: { fontSize: 10, fontFamily: fontFamilies.interBold, fontWeight: fontWeights.fwBold },
  cardDesc: { fontSize: fontSizes.fsXs, color: colors.gray600, fontFamily: fontFamilies.interRegular, marginTop: 3, lineHeight: 16 },
  cardNumber: { fontSize: fontSizes.fsLg, fontWeight: fontWeights.fwExtrabold, fontFamily: fontFamilies.interExtraBold, letterSpacing: 0.5, marginTop: 5 },

  callBtn: { width: 48, height: 48, borderRadius: radii.radiusFull, alignItems: 'center', justifyContent: 'center', ...shadows.shadowMd },

  // Offline card
  offlineCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.space3, marginTop: spacing.space2,
    padding: spacing.space4, borderRadius: radii.radiusXl, backgroundColor: colors.info50, borderWidth: 1, borderColor: '#bfdbfe',
  },
  offlineIcon: { width: 44, height: 44, borderRadius: radii.radiusLg, backgroundColor: colors.surfaceWhite, alignItems: 'center', justifyContent: 'center' },
  offlineHeadRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  offlineHint: { fontSize: fontSizes.fsXs, color: colors.info700, fontFamily: fontFamilies.interMedium, flexShrink: 1 },
  offlineStrong: { fontSize: fontSizes.fsBase, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.info800, marginTop: 1 },

  footer: { fontSize: fontSizes.fsSm, color: colors.gray500, fontFamily: fontFamilies.interMedium, textAlign: 'center', marginTop: spacing.space4 },
});
