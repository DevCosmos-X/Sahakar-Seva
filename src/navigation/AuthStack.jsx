import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '@screens/auth/LoginScreen';
import RegisterScreen from '@screens/auth/RegisterScreen';

/**
 * AuthStack — the unauthenticated navigator tree.
 *
 * Ports web routes /auth (LoginPage) and /auth/register (RegisterPage). On web, RegisterPage
 * read its role from `location.state.role` passed by a <Link state>; here Register receives
 * { role } as a route param (Login calls navigation.navigate('Register', { role })).
 *
 * Both screens own their full-bleed dark backgrounds and brand headers, so headerShown is off
 * for both (the web pages had no chrome either).
 */

const Stack = createNativeStackNavigator();

export default function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}
