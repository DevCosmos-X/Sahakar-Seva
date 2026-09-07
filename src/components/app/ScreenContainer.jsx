import { View, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '@theme';

/**
 * ScreenContainer — the standard page wrapper for modern app screens.
 *
 * Gives every screen a consistent light-gray canvas, horizontal gutters, and bottom padding
 * that clears the tab bar + safe area. `scroll` (default true) wraps children in a ScrollView;
 * pass scroll={false} for screens that manage their own scrolling (e.g. FlatList) or need a
 * fixed sticky footer.
 *
 * This replaces the ad-hoc per-screen padding the web used and gives the app a uniform rhythm
 * (the generous-whitespace feel of Zomato/UC rather than the tighter web layout).
 */
export default function ScreenContainer({ children, scroll = true, contentStyle, style, edges = true }) {
  const insets = useSafeAreaInsets();
  // Top padding clears the status bar / notch (insets.top) so in-content headers (PortalHeader,
  // LocationBar) don't graze the status-bar clock; bottom clears the tab bar + gesture area.
  const pad = {
    paddingTop: (edges ? insets.top : 0) + spacing.space4,
    paddingBottom: (edges ? insets.bottom : 0) + spacing.space6,
  };

  if (!scroll) {
    return <View style={[styles.canvas, style, { paddingTop: pad.paddingTop }]}>{children}</View>;
  }

  return (
    <ScrollView
      style={[styles.canvas, style]}
      contentContainerStyle={[styles.content, pad, contentStyle]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  canvas: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  content: {
    paddingHorizontal: spacing.space4,
  },
});
