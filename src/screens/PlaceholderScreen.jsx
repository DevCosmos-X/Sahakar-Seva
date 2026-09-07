import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, fontSizes, fontWeights, fontFamilies } from '@theme';

/**
 * Temporary placeholder for screens not yet ported. Each portal's navigator points its tabs at
 * one of these until the real screen lands in its phase (customer = Phase 7, worker/admin =
 * Phase 8, LiveTrackingMap = Phase 10, DemandForecast = Phase 12). Lets the full navigation
 * shell be built and navigated NOW so routing/tabs/header/back-button behaviour is verifiable
 * before any screen content exists.
 *
 * Factory helper `placeholder(name, phase)` returns a component so screen registration reads
 * cleanly in the navigators.
 */
export default function PlaceholderScreen({ name, phase, route }) {
  const label = name || route?.name || 'Screen';
  return (
    <View style={styles.container}>
      <Text style={styles.name}>{label}</Text>
      {phase ? <Text style={styles.phase}>Coming in {phase}</Text> : null}
      {route?.params ? (
        <Text style={styles.params}>params: {JSON.stringify(route.params)}</Text>
      ) : null}
    </View>
  );
}

export function placeholder(name, phase) {
  const Comp = (props) => <PlaceholderScreen name={name} phase={phase} {...props} />;
  Comp.displayName = `Placeholder(${name})`;
  return Comp;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgPrimary,
    padding: spacing.space6,
  },
  name: {
    fontSize: fontSizes.fsXl,
    fontWeight: fontWeights.fwBold,
    fontFamily: fontFamilies.interBold,
    color: colors.primary900,
  },
  phase: {
    marginTop: spacing.space2,
    fontSize: fontSizes.fsSm,
    color: colors.gray500,
    fontFamily: fontFamilies.interRegular,
  },
  params: {
    marginTop: spacing.space4,
    fontSize: fontSizes.fsXs,
    color: colors.gray400,
    fontFamily: fontFamilies.interRegular,
  },
});
