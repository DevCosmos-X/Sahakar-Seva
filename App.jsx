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
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LanguageProvider } from '@context/LanguageContext';
import { AuthProvider } from '@context/AuthContext';
import RootNavigator from '@navigation/RootNavigator';
import InitialLanguageModal from '@components/ui/InitialLanguageModal';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
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
