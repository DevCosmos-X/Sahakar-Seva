import { Fragment } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '@context/AuthContext';
import SplashScreen from '@screens/SplashScreen';
import AccessDeniedScreen from '@screens/AccessDeniedScreen';
import { ChatWidget } from '@components/app';
import AuthStack from './AuthStack';
import CustomerStack from './CustomerStack';
import WorkerTabs from './WorkerTabs';
import AdminTabs from './AdminTabs';

/**
 * RootNavigator — replaces the web ProtectedRoute render-gate pattern with CONDITIONAL
 * NAVIGATOR TREES keyed on auth state, exactly as the migration plan requires:
 *
 *   loading                          -> SplashStack   (session restore in flight)
 *   not authenticated                -> AuthStack     (Login, Register)
 *   authenticated + role customer    -> CustomerStack (tabs + LiveTrackingMap/History pushed)
 *   authenticated + role worker      -> WorkerTabs
 *   authenticated + role admin       -> AdminTabs
 *   authenticated + unknown/mismatch -> AccessDeniedScreen (the "Admin access required" UX,
 *                                       kept as a dedicated screen, not an inline redirect)
 *
 * Why trees instead of guards: on web, ProtectedRoute mounted the layout then redirected on
 * mismatch. Here a user is only ever shown the navigator for their own role, so the
 * "wrong portal" case can't be reached by navigation at all — it's handled structurally. The
 * only residual mismatch is an authenticated user whose profile has no recognized role (e.g. a
 * real Supabase login whose profile row failed to load), which lands on AccessDeniedScreen
 * rather than a blank/broken tab bar.
 *
 * Note: demo accounts set role via the synthesized profile in AuthContext, so a demo customer
 * lands in CustomerStack and a demo worker in WorkerTabs with zero Supabase config.
 */

function RootRoutes() {
  const { loading, isAuthenticated, role } = useAuth();

  if (loading) return <SplashScreen />;
  if (!isAuthenticated) return <AuthStack />;

  // Authenticated portals get the global Sahakar AI ChatWidget overlaid (matching the web app's
  // always-present assistant). AccessDenied does not — it's a dead-end auth-error screen.
  switch (role) {
    case 'customer':
      return (
        <Fragment>
          <CustomerStack />
          <ChatWidget />
        </Fragment>
      );
    case 'worker':
      return (
        <Fragment>
          <WorkerTabs />
          <ChatWidget />
        </Fragment>
      );
    case 'admin':
      return (
        <Fragment>
          <AdminTabs />
          <ChatWidget />
        </Fragment>
      );
    default:
      return <AccessDeniedScreen />;
  }
}

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <RootRoutes />
    </NavigationContainer>
  );
}
