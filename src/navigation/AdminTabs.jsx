import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { LayoutDashboard, Users, AlertTriangle, TrendingUp } from 'lucide-react-native';
import { useLanguage } from '@context/LanguageContext';
import AdminDashboardScreen from '@screens/admin/AdminDashboardScreen';
import WorkerManagementScreen from '@screens/admin/WorkerManagementScreen';
import ComplaintsDashboardScreen from '@screens/admin/ComplaintsDashboardScreen';
import DemandForecastScreen from '@screens/admin/DemandForecastScreen';
import { colors, fontSizes, fontFamilies } from '@theme';

/**
 * AdminTabs — bottom-tab navigator for the admin portal.
 * Ports AdminLayout.jsx's navItems (Dashboard/Workers/Complaints/Forecast). Admin accent is
 * red (web used a red gradient brand). Screens own their in-content PortalHeader
 * (headerShown:false).
 */

const Tab = createBottomTabNavigator();

export default function AdminTabs() {
  const { t } = useLanguage();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.danger600,
        tabBarInactiveTintColor: colors.gray400,
        tabBarStyle: { backgroundColor: colors.surfaceWhite, borderTopColor: colors.gray200 },
        tabBarLabelStyle: { fontSize: fontSizes.fsXs, fontFamily: fontFamilies.interMedium },
      }}
    >
      <Tab.Screen
        name="AdminDashboard"
        component={AdminDashboardScreen}
        options={{ title: t('dashboard'), tabBarIcon: ({ color, size }) => <LayoutDashboard color={color} size={size} /> }}
      />
      <Tab.Screen
        name="AdminWorkers"
        component={WorkerManagementScreen}
        options={{ title: t('workers'), tabBarIcon: ({ color, size }) => <Users color={color} size={size} /> }}
      />
      <Tab.Screen
        name="AdminComplaints"
        component={ComplaintsDashboardScreen}
        options={{ title: t('complaints'), tabBarIcon: ({ color, size }) => <AlertTriangle color={color} size={size} /> }}
      />
      <Tab.Screen
        name="AdminForecast"
        component={DemandForecastScreen}
        options={{ title: t('forecast'), tabBarIcon: ({ color, size }) => <TrendingUp color={color} size={size} /> }}
      />
    </Tab.Navigator>
  );
}
