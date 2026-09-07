import { View, Text, Pressable, StyleSheet } from 'react-native';
import { MapPin, ChevronDown, Bell } from 'lucide-react-native';
import { colors, spacing, fontSizes, fontWeights, fontFamilies } from '@theme';

/**
 * LocationBar — the signature "location + greeting" strip modern Indian service/commerce apps
 * put at the very top (Zomato, Swiggy, Urban Company, Blinkit). Shows a small "deliver/serve
 * to" label, the city with a chevron (tappable, non-functional for now — there's no location
 * backend and the plan says not to invent one), and an optional bell on the right.
 *
 * This is an ORIGINAL composition using the app's own indigo brand, not a copy of any one app's
 * bar — the pattern is borrowed, the styling is ours.
 */
export default function LocationBar({ label = 'Service location', city = 'Gurugram, Haryana', onPressBell, onPressLocation }) {
  return (
    <View style={styles.row}>
      <Pressable style={styles.locWrap} onPress={onPressLocation} hitSlop={8}>
        <View style={styles.pinCircle}>
          <MapPin size={16} color={colors.primary600} />
        </View>
        <View style={styles.locText}>
          <Text style={styles.label}>{label}</Text>
          <View style={styles.cityRow}>
            <Text style={styles.city} numberOfLines={1}>
              {city}
            </Text>
            <ChevronDown size={16} color={colors.gray700} />
          </View>
        </View>
      </Pressable>
      {onPressBell && (
        <Pressable style={styles.bell} onPress={onPressBell} accessibilityLabel="Notifications" hitSlop={8}>
          <Bell size={20} color={colors.gray700} />
          <View style={styles.dot} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  locWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space2,
    flex: 1,
  },
  pinCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locText: {
    flex: 1,
  },
  label: {
    fontSize: fontSizes.fsXs,
    color: colors.gray500,
    fontFamily: fontFamilies.interRegular,
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  city: {
    fontSize: fontSizes.fsBase,
    fontWeight: fontWeights.fwBold,
    fontFamily: fontFamilies.interBold,
    color: colors.gray900,
    flexShrink: 1,
  },
  bell: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    top: 8,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent500,
    borderWidth: 1,
    borderColor: colors.bgPrimary,
  },
});
