import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, CalendarPlus, ClipboardList, User } from 'lucide-react-native';
import { useLanguage } from '@context/LanguageContext';
import CustomerDashboardScreen from '@screens/customer/CustomerDashboardScreen';
import BookingScreen from '@screens/customer/BookingScreen';
import BookingTrackerScreen from '@screens/customer/BookingTrackerScreen';
import CustomerProfileScreen from '@screens/customer/CustomerProfileScreen';
import { colors, spacing, fontSizes, fontWeights, fontFamilies } from '@theme';

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
        // Premium bar: white surface, hairline top border, soft lift, taller touch targets.
        // Height/padding are added ON TOP of the bottom safe-area inset (RN bottom-tabs adds the
        // inset automatically), so this stays correct across devices with/without a gesture bar.
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
        tabBarLabelStyle: {
          fontSize: fontSizes.fsXs,
          fontFamily: fontFamilies.interSemiBold,
          fontWeight: fontWeights.fwSemibold,
          marginTop: 2,
        },
      }}
    >
      <Tab.Screen
        name="CustomerDashboard"
        component={CustomerDashboardScreen}
        options={{
          title: t('dashboard'),
          tabBarIcon: ({ color, focused }) => <Home color={color} size={23} strokeWidth={focused ? 2.6 : 2} />,
        }}
      />
      <Tab.Screen
        name="CustomerBook"
        component={BookingScreen}
        options={{
          title: t('book_service'),
          tabBarIcon: ({ color, focused }) => <CalendarPlus color={color} size={23} strokeWidth={focused ? 2.6 : 2} />,
        }}
      />
      <Tab.Screen
        name="CustomerBookings"
        component={BookingTrackerScreen}
        options={{
          title: t('my_bookings'),
          tabBarIcon: ({ color, focused }) => <ClipboardList color={color} size={23} strokeWidth={focused ? 2.6 : 2} />,
        }}
      />
      <Tab.Screen
        name="CustomerProfile"
        component={CustomerProfileScreen}
        options={{
          title: t('profile'),
          tabBarIcon: ({ color, focused }) => <User color={color} size={23} strokeWidth={focused ? 2.6 : 2} />,
        }}
      />
    </Tab.Navigator>
  );
}
