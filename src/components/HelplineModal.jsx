import { View, Text, Pressable, Linking, StyleSheet } from 'react-native';
import { Phone, AlertCircle, Headphones, Shield, MessageCircle } from 'lucide-react-native';
import Modal from '@components/ui/Modal';
import { colors, spacing, radii, fontSizes, fontWeights, fontFamilies } from '@theme';

/**
 * HelplineModal — ported from web components/HelplineModal.jsx + HelplineModal.css.
 *
 * Same four helplines and their metadata, unchanged. Each row is a tel: link on web
 * (<a href="tel:...">); on mobile that becomes Linking.openURL('tel:...'), which opens the
 * dialer — one of the "<a href='tel:'> → Linking.openURL" conversions the migration plan lists.
 *
 * Wrapped in the ported Modal primitive (Phase 4) rather than the web's custom overlay.
 */

const HELPLINES = [
  { id: 1, label: 'Sahakar Seva Helpline', number: '1800-XXX-SEVA', type: 'toll-free', icon: Headphones, color: '#10b981', desc: '24x7 Toll-Free • Service booking help' },
  { id: 2, label: 'Worker Welfare Helpline', number: '1800-XXX-KAAM', type: 'toll-free', icon: Shield, color: '#3b82f6', desc: '24x7 Toll-Free • Worker rights & safety' },
  { id: 3, label: 'Emergency SOS', number: '112', type: 'emergency', icon: AlertCircle, color: '#ef4444', desc: 'Police / Fire / Medical Emergency' },
  { id: 4, label: 'Consumer Forum', number: '1800-XXX-COURT', type: 'toll-free', icon: MessageCircle, color: '#8b5cf6', desc: 'Dispute resolution & complaints' },
];

export default function HelplineModal({ isOpen, onClose }) {
  const call = (number) => {
    // Strip dashes exactly as web did (tel:${number.replace(/-/g,'')}).
    Linking.openURL(`tel:${number.replace(/-/g, '')}`);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="📞 Helpline Numbers">
      <Text style={styles.subtitle}>We're here 24x7 to help you</Text>
      <View style={styles.list}>
        {HELPLINES.map((h) => {
          const Icon = h.icon;
          return (
            <Pressable key={h.id} style={styles.card} onPress={() => call(h.number)}>
              <View style={[styles.iconWrap, { backgroundColor: h.color + '26' }]}>
                <Icon size={22} color={h.color} />
              </View>
              <View style={styles.info}>
                <Text style={styles.label}>{h.label}</Text>
                <Text style={styles.desc}>{h.desc}</Text>
                <Text style={[styles.number, h.type === 'emergency' && styles.numberEmergency]}>{h.number}</Text>
              </View>
              <Phone size={18} color={h.color} />
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.footer}>
        🏢 For offline registration visit your nearest <Text style={styles.footerStrong}>Seva Kendra</Text>
      </Text>
    </Modal>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    fontSize: fontSizes.fsSm,
    color: colors.gray500,
    fontFamily: fontFamilies.interRegular,
    marginBottom: spacing.space4,
  },
  list: {
    gap: spacing.space3,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space3,
    padding: spacing.space3,
    borderRadius: radii.radiusLg,
    borderWidth: 1,
    borderColor: colors.gray200,
    backgroundColor: colors.surfaceWhite,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radii.radiusMd,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
  },
  label: {
    fontSize: fontSizes.fsSm,
    fontWeight: fontWeights.fwSemibold,
    fontFamily: fontFamilies.interSemiBold,
    color: colors.gray900,
  },
  desc: {
    fontSize: fontSizes.fsXs,
    color: colors.gray500,
    fontFamily: fontFamilies.interRegular,
    marginVertical: 1,
  },
  number: {
    fontSize: fontSizes.fsSm,
    fontWeight: fontWeights.fwBold,
    fontFamily: fontFamilies.interBold,
    color: colors.success600,
  },
  numberEmergency: {
    color: colors.danger600,
  },
  footer: {
    fontSize: fontSizes.fsXs,
    color: colors.gray500,
    fontFamily: fontFamilies.interRegular,
    textAlign: 'center',
    marginTop: spacing.space5,
    paddingTop: spacing.space4,
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
  },
  footerStrong: {
    fontWeight: fontWeights.fwBold,
    fontFamily: fontFamilies.interBold,
    color: colors.gray700,
  },
});
