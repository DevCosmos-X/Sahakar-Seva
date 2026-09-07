import { createNativeStackNavigator } from '@react-navigation/native-stack';
import CustomerTabs from './CustomerTabs';
import BookingHistoryScreen from '@screens/customer/BookingHistoryScreen';
import LiveTrackingMapScreen from '@screens/customer/LiveTrackingMapScreen';

/**
 * CustomerStack — wraps CustomerTabs and adds the screens that the web app pushed ABOVE the
 * layout rather than showing as tabs:
 *
 *   - LiveTrackingMap  (web route /customer/track/:bookingId — the app's only route param)
 *     Full-screen map (react-native-maps) with its own in-content top bar, so the stack header
 *     is hidden. Receives { bookingId } as a route param (web read it via useParams).
 *   - BookingHistory   (web route /customer/history — reached from the dashboard "See all").
 *     Real screen as of Phase 7.
 */

const Stack = createNativeStackNavigator();

export default function CustomerStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="CustomerTabs" component={CustomerTabs} options={{ headerShown: false }} />
      <Stack.Screen
        name="LiveTrackingMap"
        component={LiveTrackingMapScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="BookingHistory"
        component={BookingHistoryScreen}
        options={{ title: 'Booking History' }}
      />
    </Stack.Navigator>
  );
}
