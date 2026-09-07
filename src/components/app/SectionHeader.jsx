import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, spacing, fontSizes, fontWeights, fontFamilies } from '@theme';

/**
 * SectionHeader — a bold section title with an optional "See all" action on the right, the
 * standard pattern every modern commerce/service app uses to head each home-screen section
 * (Amazon, Flipkart, Zomato). Replaces the web's plain <h2> + ad-hoc "See All" button.
 */
export default function SectionHeader({ title, actionLabel, onPressAction }) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {actionLabel && onPressAction && (
        <Pressable onPress={onPressAction} hitSlop={8}>
          <Text style={styles.action}>{actionLabel}</Text>
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
    marginBottom: spacing.space3,
  },
  title: {
    fontSize: fontSizes.fsLg,
    fontWeight: fontWeights.fwBold,
    fontFamily: fontFamilies.interBold,
    color: colors.gray900,
  },
  action: {
    fontSize: fontSizes.fsSm,
    fontWeight: fontWeights.fwSemibold,
    fontFamily: fontFamilies.interSemiBold,
    color: colors.primary600,
  },
});
