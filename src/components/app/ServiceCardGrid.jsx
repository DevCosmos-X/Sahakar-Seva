import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ArrowUpRight } from 'lucide-react-native';
import { serviceIcon } from '@components/icons';
import { colors, spacing, radii, shadows, fontSizes, fontWeights, fontFamilies } from '@theme';

/**
 * ServiceCardGrid — a premium 2-column service-card grid (replaces the compact 4-column icon
 * tiles on the dashboard). Presentation only: it renders each existing service's icon, name, and
 * basePrice, tinted with that service's own `color` from mockServices (subtle wash, not a loud
 * fill), and calls the SAME onSelect(service) handler the old grid used. No data is created here;
 * long names wrap and the grid reflows for any number of services.
 *
 * Props mirror the old ServiceGrid so this is a drop-in swap: { services, onSelect }.
 */
export default function ServiceCardGrid({ services, onSelect }) {
  return (
    <View style={styles.grid}>
      {services.map((s) => {
        const Icon = serviceIcon(s.icon);
        return (
          <Pressable
            key={s.id}
            style={({ pressed }) => [styles.card, { backgroundColor: s.color + '12' }, pressed && styles.cardPressed]}
            onPress={() => onSelect?.(s)}
            accessibilityRole="button"
            accessibilityLabel={`${s.name}, starting from ₹${s.basePrice}`}
          >
            <View style={styles.topRow}>
              <View style={[styles.iconWrap, { backgroundColor: s.color + '22' }]}>
                <Icon size={22} color={s.color} strokeWidth={2.2} />
              </View>
              <ArrowUpRight size={16} color={colors.gray400} strokeWidth={2.2} />
            </View>
            <Text style={styles.name} numberOfLines={2}>{s.name}</Text>
            <Text style={styles.priceLabel}>Starting from</Text>
            <Text style={styles.price}>₹{s.basePrice}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.space3,
  },
  card: {
    // Two per row, reflowing for any count; grows to fill the row remainder.
    width: '47.5%',
    flexGrow: 1,
    minWidth: 150,
    borderRadius: radii.radiusXl,
    padding: spacing.space4,
    ...shadows.shadowSm,
  },
  cardPressed: { opacity: 0.85 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.space3,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radii.radiusMd,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontSize: fontSizes.fsBase,
    fontWeight: fontWeights.fwBold,
    fontFamily: fontFamilies.interBold,
    color: colors.gray900,
    marginBottom: 4,
  },
  priceLabel: {
    fontSize: 11,
    color: colors.gray500,
    fontFamily: fontFamilies.interRegular,
  },
  price: {
    fontSize: fontSizes.fsBase,
    fontWeight: fontWeights.fwExtrabold,
    fontFamily: fontFamilies.interExtraBold,
    color: colors.gray900,
    marginTop: 1,
  },
});
