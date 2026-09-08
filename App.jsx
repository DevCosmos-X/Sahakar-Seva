/**
 * Sahakar Seva Mobile
 * Root application component.
 *
 * Mirrors the web App.jsx provider order and globals:
 *   web:    BrowserRouter > LanguageProvider > AuthProvider > Routes
 *           + <AuthenticatedAIWidget /> and <InitialLanguageModal /> rendered OUTSIDE Routes.
 *   mobile: SafeAreaProvider > LanguageProvider > AuthProvider > RootNavigator (NavigationContainer)
 *           + <InitialLanguageModal /> rendered OUTSIDE the navigator.
 *
 * (BrowserRouter has no mobile analogue — NavigationContainer lives inside RootNavigator.
 *  AuthenticatedAIWidget is deferred to Phase 9 when AiChatWidget is ported; its mount point
 *  is marked below so it drops in at the same layer as web.)
 *
 * @format
 */

import { StatusBar, StyleSheet, useColorScheme, View } from 'react-native';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { LanguageProvider } from '@context/LanguageContext';
import { AuthProvider } from '@context/AuthContext';
import RootNavigator from '@navigation/RootNavigator';
import InitialLanguageModal from '@components/ui/InitialLanguageModal';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    // initialWindowMetrics seeds the safe-area insets synchronously on the first frame. Without
    // it, insets.top is 0 until the provider measures, so on edge-to-edge Android (this app sets
    // edgeToEdgeEnabled=true) the first paint slips content under the status bar before snapping
    // down — the overlap seen on the dashboard. Seeding it fixes that flash deterministically.
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      {/* translucent + transparent so behaviour is deterministic under edge-to-edge: the app draws
          behind the bar and each screen's safe-area padding (insets.top) reserves the space. */}
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />
      <LanguageProvider>
        <AuthProvider>
          <View style={styles.root}>
            <RootNavigator />
            {/* Phase 9: <AuthenticatedAIWidget /> mounts here (outside the navigator, like web). */}
            <InitialLanguageModal />
          </View>
        </AuthProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

export default App;
