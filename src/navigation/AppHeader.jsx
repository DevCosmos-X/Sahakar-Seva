import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell, LogOut } from 'lucide-react-native';
import { useAuth } from '@context/AuthContext';
import LanguageSwitcher from '@components/ui/LanguageSwitcher';
import { colors, spacing, fontSizes, fontWeights, fontFamilies, shadows } from '@theme';

/**
 * Shared app header — consolidates the header the three web layouts
 * (CustomerLayout/WorkerLayout/AdminLayout) each duplicated: LanguageSwitcher, a notification
 * bell with an unread dot, and a logout button.
 *
 * On web this header lived inside each layout shell alongside the sidebar+drawer+tabs (three
 * nav copies). Per the migration plan, the sidebar and drawer are dropped entirely on mobile
 * (bottom tabs only), and the header moves here so all three portals share ONE implementation.
 * It's wired as a custom `header` in each tab navigator's screenOptions (see portal navigators).
 *
 * The notification bell is non-functional on web too (the notification helpers in supabase.js
 * are defined but never called) — preserved as a visual-only affordance with the unread dot.
 *
 * `title` + `accent` are passed per portal so the brand text and role tint match the web
 * layouts (customer = primary indigo, worker = amber, admin = red).
 */

export default function AppHeader({ title, accent = colors.primary600 }) {
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();

  return (
    <View style={[styles.header, { paddingTop: insets.top + spacing.space2 }]}>
      <Text style={[styles.brand, { color: accent }]} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.right}>
        <LanguageSwitcher compact />
        <Pressable style={styles.iconBtn} accessibilityLabel="Notifications">
          <Bell size={20} color={colors.gray600} />
          <View style={styles.dot} />
        </Pressable>
        <Pressable style={styles.iconBtn} onPress={logout} accessibilityLabel="Log out">
          <LogOut size={20} color={colors.gray600} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.space4,
    paddingBottom: spacing.space3,
    backgroundColor: colors.surfaceWhite,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
    ...shadows.shadowSm,
  },
  brand: {
    fontSize: fontSizes.fsLg,
    fontWeight: fontWeights.fwBold,
    fontFamily: fontFamilies.interBold,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space1,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  dot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.danger500,
    borderWidth: 1,
    borderColor: colors.surfaceWhite,
  },
});
