import { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Globe } from 'lucide-react-native';
import { useLanguage } from '@context/LanguageContext';
import Modal from './Modal';
import Button from './Button';
import { colors, spacing, radii, fontSizes, fontWeights, fontFamilies } from '@theme';

/**
 * InitialLanguageModal — ported from web components/ui/InitialLanguageModal.jsx +
 * InitialLanguageModal.css.
 *
 * Same behaviour: shows once on first launch when LanguageContext.language is null, lets the
 * user pick EN/HI/BN, and the welcome heading is shown in the currently-highlighted language's
 * script. Confirm writes the choice to the context (which persists it to MMKV).
 *
 * The welcome strings are rendered with the matching bundled font per script (Noto Sans
 * Devanagari for Hindi, Noto Sans Bengali for Bengali, Inter for English) — this is exactly
 * the tier-1 font requirement from Phase 2 in action.
 *
 * 3-col grid (desktop) collapsed to the mobile branch (single column, row layout per button)
 * from the CSS 640px media query, per the plan.
 */

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧', welcome: 'Welcome to Sahakar Seva', font: fontFamilies.interBold },
  { code: 'hi', label: 'हिन्दी', flag: '🇮🇳', welcome: 'सहकार सेवा में आपका स्वागत है', font: fontFamilies.notoDevanagariBold },
  { code: 'bn', label: 'বাংলা', flag: '🇧🇩', welcome: 'সহকার সেবায় স্বাগতম', font: fontFamilies.notoBengaliBold },
];

export default function InitialLanguageModal() {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [tempLang, setTempLang] = useState('en');

  useEffect(() => {
    if (!language) setIsOpen(true);
  }, [language]);

  const handleConfirm = () => {
    setLanguage(tempLang);
    setIsOpen(false);
  };

  if (!isOpen) return null;

  const selected = LANGUAGES.find((l) => l.code === tempLang);

  return (
    <Modal isOpen={isOpen} onClose={() => {}} title="" hideClose>
      <View style={styles.container}>
        <Globe size={48} color={colors.primary500} style={styles.icon} />
        <Text style={[styles.welcome, { fontFamily: selected?.font }]}>{selected?.welcome}</Text>
        <Text style={styles.subtitle}>
          Please select your preferred language / कृपया अपनी पसंदीदा भाषा चुनें
        </Text>

        <View style={styles.grid}>
          {LANGUAGES.map((lang) => {
            const active = tempLang === lang.code;
            return (
              <Pressable
                key={lang.code}
                style={[styles.langBtn, active && styles.langBtnActive]}
                onPress={() => setTempLang(lang.code)}
              >
                <Text style={styles.langFlag}>{lang.flag}</Text>
                <Text style={styles.langLabel}>{lang.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Button variant="primary" size="lg" fullWidth onPress={handleConfirm} style={styles.confirm}>
          Continue / जारी रखें
        </Button>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.space4,
  },
  icon: {
    marginBottom: spacing.space6,
  },
  welcome: {
    fontSize: fontSizes.fsXl,
    fontWeight: fontWeights.fwSemibold,
    color: colors.gray900,
    textAlign: 'center',
    marginBottom: spacing.space2,
  },
  subtitle: {
    fontSize: fontSizes.fsSm,
    color: colors.gray500,
    fontFamily: fontFamilies.interRegular,
    textAlign: 'center',
    marginBottom: spacing.space6,
  },
  grid: {
    width: '100%',
    gap: spacing.space3,
    marginTop: spacing.space2,
  },
  langBtn: {
    flexDirection: 'row', // mobile branch (640px media query)
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.space3,
    paddingVertical: spacing.space4,
    paddingHorizontal: spacing.space4,
    borderWidth: 2,
    borderColor: colors.gray200,
    borderRadius: radii.radiusLg,
    backgroundColor: colors.white,
  },
  langBtnActive: {
    borderColor: colors.primary500,
    backgroundColor: colors.primary50,
  },
  langFlag: {
    fontSize: 32,
  },
  langLabel: {
    fontSize: fontSizes.fsBase,
    fontWeight: fontWeights.fwMedium,
    fontFamily: fontFamilies.interMedium,
    color: colors.gray800,
  },
  confirm: {
    marginTop: spacing.space6,
  },
});
