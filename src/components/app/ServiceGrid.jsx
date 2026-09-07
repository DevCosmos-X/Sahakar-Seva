import { View, Text, Pressable, StyleSheet } from 'react-native';
import { serviceIcon } from '@components/icons';
import { colors, spacing, radii, fontSizes, fontWeights, fontFamilies } from '@theme';

/**
 * ServiceGrid — the tinted rounded-square icon-tile grid that is the defining home-screen
 * element of Urban Company (and category rows in Amazon/Flipkart). Each tile is a service
 * category: a soft color-tinted square holding the service's lucide icon, the name below, and
 * an optional "From ₹x" price line.
 *
 * Uses each service's own `color` from mockServices for the tint (color + '15' alpha wash, the
 * same 8%-ish tint the web used inline), so the grid is colorful and scannable rather than the
 * flat white cards of the website. 4 columns by default — the standard UC layout.
 *
 * Original styling on the app's own palette; the grid PATTERN is the borrowed idea.
 */
export default function ServiceGrid({ services, columns = 4, showPrice = false, onSelect }) {
  return (
    <View style={styles.grid}>
      {services.map((s) => {
        const Icon = serviceIcon(s.icon);
        return (
          <Pressable
            key={s.id}
            style={[styles.tile, { width: `${100 / columns}%` }]}
            onPress={() => onSelect?.(s)}
          >
            <View style={[styles.iconSquare, { backgroundColor: s.color + '1A' }]}>
              <Icon size={26} color={s.color} />
            </View>
            <Text style={styles.name} numberOfLines={2}>
              {s.name}
            </Text>
            {showPrice && <Text style={styles.price}>₹{s.basePrice}</Text>}
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
  },
  tile: {
    alignItems: 'center',
    paddingVertical: spacing.space3,
    paddingHorizontal: 2,
  },
  iconSquare: {
    width: 60,
    height: 60,
    borderRadius: radii.radiusLg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.space2,
  },
  name: {
    fontSize: fontSizes.fsXs,
    fontWeight: fontWeights.fwMedium,
    fontFamily: fontFamilies.interMedium,
    color: colors.gray700,
    textAlign: 'center',
  },
  price: {
    fontSize: 10,
    color: colors.gray400,
    fontFamily: fontFamilies.interRegular,
    marginTop: 1,
  },
});
