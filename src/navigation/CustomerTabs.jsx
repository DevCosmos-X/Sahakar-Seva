import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, CalendarPlus, ClipboardList, User } from 'lucide-react-native';
import { useLanguage } from '@context/LanguageContext';
import CustomerDashboardScreen from '@screens/customer/CustomerDashboardScreen';
import BookingScreen from '@screens/customer/BookingScreen';
import BookingTrackerScreen from '@screens/customer/BookingTrackerScreen';
import CustomerProfileScreen from '@screens/customer/CustomerProfileScreen';
import { colors, fontSizes, fontFamilies } from '@theme';

/**
 * CustomerTabs — bottom-tab navigator for the customer portal.
 *
 * Ports CustomerLayout.jsx's navItems (Dashboard/Book Service/My Bookings/Profile). The web
 * layout also had /customer/history and /customer/track/:bookingId which were NOT in the tab
 * bar — history and LiveTrackingMap are pushed stack screens (see CustomerStack), so neither is
 * a tab here, matching web.
 *
 * headerShown is off: the modern screens own their in-content headers (LocationBar etc.) rather
 * than a chrome header bar, which is the app-native pattern (Zomato/UC don't show a title bar
 * over the home screen). Tab labels use LanguageContext.t() with the web navItems' keys.
 */

const Tab = createBottomTabNavigator();

export default function CustomerTabs() {
  const { t } = useLanguage();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary600,
        tabBarInactiveTintColor: colors.gray400,
        tabBarStyle: { backgroundColor: colors.surfaceWhite, borderTopColor: colors.gray200 },
        tabBarLabelStyle: { fontSize: fontSizes.fsXs, fontFamily: fontFamilies.interMedium },
      }}
    >
      <Tab.Screen
        name="CustomerDashboard"
        component={CustomerDashboardScreen}
        options={{ title: t('dashboard'), tabBarIcon: ({ color, size }) => <Home color={color} size={size} /> }}
      />
      <Tab.Screen
        name="CustomerBook"
        component={BookingScreen}
        options={{ title: t('book_service'), tabBarIcon: ({ color, size }) => <CalendarPlus color={color} size={size} /> }}
      />
      <Tab.Screen
        name="CustomerBookings"
        component={BookingTrackerScreen}
        options={{ title: t('my_bookings'), tabBarIcon: ({ color, size }) => <ClipboardList color={color} size={size} /> }}
      />
      <Tab.Screen
        name="CustomerProfile"
        component={CustomerProfileScreen}
        options={{ title: t('profile'), tabBarIcon: ({ color, size }) => <User color={color} size={size} /> }}
      />
    </Tab.Navigator>
  );
}
