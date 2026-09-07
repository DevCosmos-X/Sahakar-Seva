import { View, Text, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import { colors, spacing, fontSizes, fontWeights, fontFamilies, shadows } from '@theme';

/**
 * StatusTimeline — ported from web components/ui/StatusTimeline.jsx + StatusTimeline.css.
 *
 * Same statusOrder / statusLabels and completed/current logic, unchanged.
 *
 * Layout: web used absolute-positioned connector lines between dots (`.timeline-line` with
 * left/right calc offsets). In RN that's rebuilt as a flex row where each step is a flex:1
 * column (dot + label) and the connector line is a sibling positioned between dots. The
 * pulseRing animation on the current dot is dropped for now (Phase 12 polish) and replaced
 * with a static glow via elevation/shadow so the current step still reads as emphasized.
 */

const statusOrder = ['booked', 'assigned', 'en-route', 'in-progress', 'completed'];
const statusLabels = {
  booked: 'Booked',
  assigned: 'Assigned',
  'en-route': 'En Route',
  'in-progress': 'In Progress',
  completed: 'Completed',
};

export default function StatusTimeline({ currentStatus }) {
  const currentIdx = statusOrder.indexOf(currentStatus);

  return (
    <View style={styles.timeline}>
      {statusOrder.map((status, idx) => {
        const isCompleted = idx < currentIdx;
        const isCurrent = idx === currentIdx;
        const isLast = idx === statusOrder.length - 1;

        const dotStyle = [
          styles.dot,
          isCompleted && styles.dotCompleted,
          isCurrent && styles.dotCurrent,
        ];
        const labelStyle = [
          styles.label,
          isCompleted && styles.labelCompleted,
          isCurrent && styles.labelCurrent,
        ];

        return (
          <View key={status} style={styles.step}>
            <View style={styles.dotRow}>
              {/* left half-connector (hidden on first step) */}
              <View style={[styles.connector, idx === 0 && styles.connectorHidden, isCompleted && styles.connectorCompleted]} />
              <View style={dotStyle}>
                {isCompleted ? (
                  <Check size={14} color={colors.white} />
                ) : (
                  <Text style={[styles.dotNum, (isCurrent || isCompleted) && styles.dotNumActive]}>{idx + 1}</Text>
                )}
              </View>
              {/* right half-connector (hidden on last step) */}
              <View style={[styles.connector, isLast && styles.connectorHidden, idx < currentIdx && styles.connectorCompleted]} />
            </View>
            <Text style={labelStyle} numberOfLines={2}>
              {statusLabels[status]}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const DOT = 32;

const styles = StyleSheet.create({
  timeline: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
    paddingVertical: spacing.space4,
  },
  step: {
    flex: 1,
    alignItems: 'center',
  },
  dotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'center',
    marginBottom: spacing.space3,
  },
  connector: {
    flex: 1,
    height: 2,
    backgroundColor: colors.gray200,
  },
  connectorHidden: {
    backgroundColor: 'transparent',
  },
  connectorCompleted: {
    backgroundColor: colors.success500,
  },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gray200,
  },
  dotCompleted: {
    backgroundColor: colors.success500,
  },
  dotCurrent: {
    backgroundColor: colors.primary600,
    ...shadows.shadowGlow,
  },
  dotNum: {
    fontSize: fontSizes.fsXs,
    fontWeight: fontWeights.fwBold,
    fontFamily: fontFamilies.interBold,
    color: colors.gray500,
  },
  dotNumActive: {
    color: colors.white,
  },
  label: {
    fontSize: fontSizes.fsXs,
    fontWeight: fontWeights.fwMedium,
    fontFamily: fontFamilies.interMedium,
    color: colors.gray500,
    maxWidth: 80,
    textAlign: 'center',
  },
  labelCompleted: {
    color: colors.success600,
  },
  labelCurrent: {
    color: colors.primary700,
    fontWeight: fontWeights.fwSemibold,
    fontFamily: fontFamilies.interSemiBold,
  },
});
