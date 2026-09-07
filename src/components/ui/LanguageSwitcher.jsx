import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Globe } from 'lucide-react-native';
import { useLanguage } from '@context/LanguageContext';
import { colors, spacing, radii, shadows, fontSizes, fontWeights, fontFamilies, zIndex } from '@theme';

/**
 * LanguageSwitcher — ported from web components/ui/LanguageSwitcher.jsx + LanguageSwitcher.css.
 *
 * Same three languages and the EN/HI/BN unification with LanguageContext (this is one of the
 * three parallel language systems the plan calls out; it reads/writes the same context).
 * Same `compact` prop (flag only, no label).
 *
 * The dropdown was an absolutely-positioned CSS panel opened on click. Kept as an absolute
 * panel here, rendered inline below the toggle. In the real header (Phase 5) this will live in
 * the navigator header; the absolute panel works there too. fadeIn animation dropped.
 */

const languages = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
  { code: 'bn', label: 'বাংলা', flag: '🇧🇩' },
];

export default function LanguageSwitcher({ compact = false }) {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const currentLang = languages.find((l) => l.code === (language || 'en'));

  return (
    <View style={styles.switcher}>
      <Pressable style={styles.toggle} onPress={() => setIsOpen(!isOpen)} accessibilityLabel="Switch language">
        <Globe size={16} color={colors.gray600} />
        <Text style={styles.toggleText}>
          {compact ? currentLang?.flag : `${currentLang?.flag} ${currentLang?.label}`}
        </Text>
      </Pressable>
      {isOpen && (
        <View style={styles.dropdown}>
          {languages.map((lang) => {
            const active = lang.code === (language || 'en');
            return (
              <Pressable
                key={lang.code}
                style={[styles.option, active && styles.optionActive]}
                onPress={() => {
                  setLanguage(lang.code);
                  setIsOpen(false);
                }}
              >
                <Text style={styles.optionFlag}>{lang.flag}</Text>
                <Text style={[styles.optionLabel, active && styles.optionLabelActive]}>{lang.label}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  switcher: {
    position: 'relative',
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space2,
    paddingVertical: spacing.space2,
    paddingHorizontal: spacing.space3,
    borderRadius: radii.radiusMd,
  },
  toggleText: {
    fontSize: fontSizes.fsSm,
    fontWeight: fontWeights.fwMedium,
    fontFamily: fontFamilies.interMedium,
    color: colors.gray600,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: 4,
    backgroundColor: colors.surfaceWhite,
    borderRadius: radii.radiusMd,
    borderWidth: 1,
    borderColor: colors.gray200,
    minWidth: 150,
    zIndex: zIndex.zDropdown,
    overflow: 'hidden',
    ...shadows.shadowLg,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space2,
    width: '100%',
    paddingVertical: spacing.space3,
    paddingHorizontal: spacing.space4,
  },
  optionActive: {
    backgroundColor: colors.primary50,
  },
  optionFlag: {
    fontSize: fontSizes.fsBase,
  },
  optionLabel: {
    fontSize: fontSizes.fsSm,
    fontFamily: fontFamilies.interRegular,
    color: colors.gray700,
  },
  optionLabelActive: {
    color: colors.primary700,
    fontWeight: fontWeights.fwSemibold,
    fontFamily: fontFamilies.interSemiBold,
  },
});
