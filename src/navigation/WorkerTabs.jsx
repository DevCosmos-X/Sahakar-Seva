import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, Briefcase, User, CalendarOff, BookOpen } from 'lucide-react-native';
import { useLanguage } from '@context/LanguageContext';
import WorkerDashboardScreen from '@screens/worker/WorkerDashboardScreen';
import JobFeedScreen from '@screens/worker/JobFeedScreen';
import WorkerProfileScreen from '@screens/worker/WorkerProfileScreen';
import LeaveRequestsScreen from '@screens/worker/LeaveRequestsScreen';
import WorkerTrainingPortalScreen from '@screens/worker/WorkerTrainingPortalScreen';
import { colors, spacing, fontWeights, fontFamilies } from '@theme';

/**
 * WorkerTabs — bottom-tab navigator for the worker portal.
 * Ports WorkerLayout.jsx's navItems (Dashboard/Jobs/Profile/Leave/Training). Worker accent is
 * amber (web used an amber gradient avatar/brand). Screens own their in-content PortalHeader,
 * so the tab-navigator chrome header is hidden (headerShown:false).
 */

const Tab = createBottomTabNavigator();

export default function WorkerTabs() {
  const { t } = useLanguage();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent600,
        tabBarInactiveTintColor: colors.gray400,
        // Premium bar (matches the customer portal): white surface, hairline top border, soft
        // upward lift, taller touch targets. Height/padding stack on top of the bottom safe-area
        // inset (RN bottom-tabs adds it automatically), so it stays correct across devices.
        tabBarStyle: {
          backgroundColor: colors.surfaceWhite,
          borderTopColor: colors.gray100,
          borderTopWidth: 1,
          height: 64,
          paddingTop: spacing.space2,
          paddingBottom: spacing.space2,
          elevation: 12,
          shadowColor: colors.gray900,
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
        },
        tabBarItemStyle: { paddingTop: 2 },
        // Allow the label a bit of room + shrink so "Leave Requests" / "Training" never truncate.
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: fontFamilies.interSemiBold,
          fontWeight: fontWeights.fwSemibold,
          marginTop: 2,
        },
      }}
    >
      <Tab.Screen
        name="WorkerDashboard"
        component={WorkerDashboardScreen}
        options={{ title: t('dashboard'), tabBarIcon: ({ color, focused }) => <Home color={color} size={23} strokeWidth={focused ? 2.6 : 2} /> }}
      />
      <Tab.Screen
        name="WorkerJobs"
        component={JobFeedScreen}
        options={{ title: t('jobs'), tabBarIcon: ({ color, focused }) => <Briefcase color={color} size={23} strokeWidth={focused ? 2.6 : 2} /> }}
      />
      <Tab.Screen
        name="WorkerProfile"
        component={WorkerProfileScreen}
        options={{ title: t('profile'), tabBarIcon: ({ color, focused }) => <User color={color} size={23} strokeWidth={focused ? 2.6 : 2} /> }}
      />
      <Tab.Screen
        name="WorkerLeave"
        component={LeaveRequestsScreen}
        options={{ title: t('leave'), tabBarIcon: ({ color, focused }) => <CalendarOff color={color} size={23} strokeWidth={focused ? 2.6 : 2} /> }}
      />
      <Tab.Screen
        name="WorkerTraining"
        component={WorkerTrainingPortalScreen}
        options={{ title: t('training'), tabBarIcon: ({ color, focused }) => <BookOpen color={color} size={23} strokeWidth={focused ? 2.6 : 2} /> }}
      />
    </Tab.Navigator>
  );
}
