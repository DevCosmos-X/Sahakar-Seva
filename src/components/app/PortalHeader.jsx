import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Bell, LogOut } from 'lucide-react-native';
import { useAuth } from '@context/AuthContext';
import { colors, spacing, fontSizes, fontWeights, fontFamilies } from '@theme';

/**
 * PortalHeader — the in-content header for the worker and admin portals (the customer portal
 * uses the richer LocationBar). Shows a title + subtitle on the left and bell + logout on the
 * right, tinted with the portal accent (worker = amber, admin = red). Consistent with the
 * modern app look established in Phase 7 (in-content header rather than a chrome title bar).
 */
export default function PortalHeader({ title, subtitle, accent = colors.primary600, onPressBell }) {
  const { logout } = useAuth();
  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <Text style={[styles.title, { color: accent }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={styles.actions}>
        {onPressBell && (
          <Pressable style={styles.iconBtn} onPress={onPressBell} hitSlop={8} accessibilityLabel="Helpline">
            <Bell size={20} color={colors.gray600} />
            <View style={[styles.dot, { backgroundColor: accent }]} />
          </Pressable>
        )}
        <Pressable style={styles.iconBtn} onPress={logout} hitSlop={8} accessibilityLabel="Log out">
          <LogOut size={20} color={colors.gray600} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.space4,
  },
  left: {
    flex: 1,
  },
  title: {
    fontSize: fontSizes.fs2xl,
    fontWeight: fontWeights.fwExtrabold,
    fontFamily: fontFamilies.interExtraBold,
  },
  subtitle: {
    fontSize: fontSizes.fsSm,
    color: colors.gray500,
    fontFamily: fontFamilies.interRegular,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space1,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.bgPrimary,
  },
});
