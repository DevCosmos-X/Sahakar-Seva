import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, Briefcase, User, CalendarOff, BookOpen } from 'lucide-react-native';
import { useLanguage } from '@context/LanguageContext';
import WorkerDashboardScreen from '@screens/worker/WorkerDashboardScreen';
import JobFeedScreen from '@screens/worker/JobFeedScreen';
import WorkerProfileScreen from '@screens/worker/WorkerProfileScreen';
import LeaveRequestsScreen from '@screens/worker/LeaveRequestsScreen';
import WorkerTrainingPortalScreen from '@screens/worker/WorkerTrainingPortalScreen';
import { colors, fontSizes, fontFamilies } from '@theme';

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
        tabBarStyle: { backgroundColor: colors.surfaceWhite, borderTopColor: colors.gray200 },
        tabBarLabelStyle: { fontSize: fontSizes.fsXs, fontFamily: fontFamilies.interMedium },
      }}
    >
      <Tab.Screen
        name="WorkerDashboard"
        component={WorkerDashboardScreen}
        options={{ title: t('dashboard'), tabBarIcon: ({ color, size }) => <Home color={color} size={size} /> }}
      />
      <Tab.Screen
        name="WorkerJobs"
        component={JobFeedScreen}
        options={{ title: t('jobs'), tabBarIcon: ({ color, size }) => <Briefcase color={color} size={size} /> }}
      />
      <Tab.Screen
        name="WorkerProfile"
        component={WorkerProfileScreen}
        options={{ title: t('profile'), tabBarIcon: ({ color, size }) => <User color={color} size={size} /> }}
      />
      <Tab.Screen
        name="WorkerLeave"
        component={LeaveRequestsScreen}
        options={{ title: t('leave'), tabBarIcon: ({ color, size }) => <CalendarOff color={color} size={size} /> }}
      />
      <Tab.Screen
        name="WorkerTraining"
        component={WorkerTrainingPortalScreen}
        options={{ title: t('training'), tabBarIcon: ({ color, size }) => <BookOpen color={color} size={size} /> }}
      />
    </Tab.Navigator>
  );
}
