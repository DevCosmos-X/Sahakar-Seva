import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { Search } from 'lucide-react-native';
import { colors, spacing, radii, fontSizes, fontFamilies, shadows } from '@theme';

/**
 * SearchBar — the pill search field modern commerce/service apps place under the location bar.
 *
 * Two modes:
 *  - Interactive (onChangeText provided): a real editable field.
 *  - Tappable stub (onPress provided, no onChangeText): renders as a button that looks like a
 *    search field. There is no search backend in this app, so on the dashboard it's used as a
 *    visual affordance / entry point rather than a functional search — flagged so it isn't
 *    mistaken for a wired feature.
 */
export default function SearchBar({ placeholder = 'Search for a service…', value, onChangeText, onPress }) {
  if (onChangeText) {
    return (
      <View style={styles.wrap}>
        <Search size={18} color={colors.gray400} />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.gray400}
        />
      </View>
    );
  }

  return (
    <Pressable style={styles.wrap} onPress={onPress}>
      <Search size={18} color={colors.gray400} />
      <Text style={styles.placeholder} numberOfLines={1}>
        {placeholder}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space2,
    backgroundColor: colors.surfaceWhite,
    borderRadius: radii.radiusLg,
    paddingHorizontal: spacing.space4,
    paddingVertical: spacing.space3,
    borderWidth: 1,
    borderColor: colors.gray200,
    ...shadows.shadowSm,
  },
  input: {
    flex: 1,
    fontSize: fontSizes.fsBase,
    fontFamily: fontFamilies.interRegular,
    color: colors.gray900,
    padding: 0,
  },
  placeholder: {
    flex: 1,
    fontSize: fontSizes.fsBase,
    fontFamily: fontFamilies.interRegular,
    color: colors.gray400,
  },
});
