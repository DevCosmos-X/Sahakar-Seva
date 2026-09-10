import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LayoutDashboard, Users, AlertTriangle, TrendingUp } from 'lucide-react-native';
import { useLanguage } from '@context/LanguageContext';
import AdminDashboardScreen from '@screens/admin/AdminDashboardScreen';
import WorkerManagementScreen from '@screens/admin/WorkerManagementScreen';
import ComplaintsDashboardScreen from '@screens/admin/ComplaintsDashboardScreen';
import DemandForecastScreen from '@screens/admin/DemandForecastScreen';
import { colors, spacing, radii, shadows, fontFamilies } from '@theme';

/**
 * AdminTabs — bottom-tab navigator for the admin portal.
 *
 * PHASE 11 REDESIGN v2 — PRESENTATION ONLY. The four Tab.Screen entries keep their exact route
 * names (AdminDashboard / AdminWorkers / AdminComplaints / AdminForecast), components, order and
 * titles, so every navigation.navigate() elsewhere still resolves. Routing/logic is untouched.
 *
 * What changed is purely visual:
 *   - a floating, rounded, elevated tab bar (detached from the screen edges) with a soft pill
 *     highlight + top indicator behind the active tab, drawn via a custom tabBarIcon so route
 *     config stays intact.
 *
 * NOTE: an earlier iteration overlaid an extra circular FAB (a bot/shortcut) above this bar.
 * That was a DUPLICATE of the real, functional Sahakar AI assistant bot (ChatWidget), which is
 * mounted globally in RootNavigator and already overlays every authenticated portal — including
 * admin. Two bot FABs were showing on the admin screens as a result. The dummy FAB has been
 * removed here so only the real ChatWidget bot remains. ChatWidget's icon, position, animation
 * and Groq-backed behaviour are untouched.
 */

const Tab = createBottomTabNavigator();

function TabIcon({ Icon, color, focused }) {
  return (
    <View style={styles.iconWrap}>
      <View style={[styles.indicator, focused && styles.indicatorOn]} />
      <View style={[styles.iconPill, focused && styles.iconPillOn]}>
        <Icon color={color} size={21} strokeWidth={focused ? 2.4 : 2} />
      </View>
    </View>
  );
}

export default function AdminTabs() {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

  const barBottom = insets.bottom + spacing.space3;

  return (
    <View style={styles.root}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.danger600,
          tabBarInactiveTintColor: colors.gray400,
          tabBarShowLabel: true,
          // Floating, rounded, detached bar.
          tabBarStyle: {
            position: 'absolute',
            left: spacing.space4,
            right: spacing.space4,
            bottom: barBottom,
            height: 64,
            paddingTop: 8,
            paddingBottom: 8,
            borderRadius: radii.radiusXl,
            borderTopWidth: 0,
            backgroundColor: colors.surfaceWhite,
            ...shadows.shadowLg,
          },
          tabBarItemStyle: { paddingVertical: 0 },
          tabBarLabelStyle: {
            fontSize: 10,
            fontFamily: fontFamilies.interSemiBold,
            marginTop: 2,
          },
        }}
      >
        <Tab.Screen
          name="AdminDashboard"
          component={AdminDashboardScreen}
          options={{
            title: t('dashboard'),
            tabBarIcon: ({ color, focused }) => <TabIcon Icon={LayoutDashboard} color={color} focused={focused} />,
          }}
        />
        <Tab.Screen
          name="AdminWorkers"
          component={WorkerManagementScreen}
          options={{
            title: t('workers'),
            tabBarIcon: ({ color, focused }) => <TabIcon Icon={Users} color={color} focused={focused} />,
          }}
        />
        <Tab.Screen
          name="AdminComplaints"
          component={ComplaintsDashboardScreen}
          options={{
            title: t('complaints'),
            tabBarIcon: ({ color, focused }) => <TabIcon Icon={AlertTriangle} color={color} focused={focused} />,
          }}
        />
        <Tab.Screen
          name="AdminForecast"
          component={DemandForecastScreen}
          options={{
            title: t('forecast'),
            tabBarIcon: ({ color, focused }) => <TabIcon Icon={TrendingUp} color={color} focused={focused} />,
          }}
        />
      </Tab.Navigator>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  iconWrap: { alignItems: 'center', justifyContent: 'flex-start' },
  indicator: {
    width: 18,
    height: 3,
    borderRadius: radii.radiusFull,
    backgroundColor: 'transparent',
    marginBottom: 4,
  },
  indicatorOn: { backgroundColor: colors.danger600 },
  iconPill: {
    paddingHorizontal: spacing.space3,
    paddingVertical: 3,
    borderRadius: radii.radiusFull,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPillOn: { backgroundColor: colors.danger50 },
});
