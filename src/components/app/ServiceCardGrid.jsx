import { View, Text, Pressable, StyleSheet } from 'react-native';
import { serviceIcon } from '@components/icons';
import { spacing, radii, shadows, fontSizes, fontWeights, fontFamilies } from '@theme';

/**
 * ServiceCardGrid — a premium 2-column service-card grid (replaces the compact 4-column icon
 * tiles on the dashboard). Presentation only: it renders each existing service's icon, name, and
 * basePrice and calls the SAME onSelect(service) handler the old grid used. No data is created
 * here — the pastel fill, icon-badge tint, and "Popular" tag are purely visual treatments keyed
 * off the service's existing `id`. Long names wrap and the grid reflows for any number of services.
 *
 * Props mirror the old ServiceGrid so this is a drop-in swap: { services, onSelect }.
 */

const TITLE_DARK = '#1e293b';

// Solid pastel fill + a lighter circular-badge tint + icon color, keyed by service id.
// Falls back gracefully for any id not listed.
const SERVICE_PASTELS = {
  plumbing: { fill: '#dbeafe', badge: '#bfd7fb', icon: '#2563eb' }, // sky blue
  electrical: { fill: '#fef3c7', badge: '#fde9a8', icon: '#c2740a' }, // cream/yellow
  cleaning: { fill: '#d1fae5', badge: '#b3f1d3', icon: '#059669' }, // mint green
  painting: { fill: '#ede9fe', badge: '#ddd4fc', icon: '#7c3aed' }, // lavender/lilac
  carpentry: { fill: '#ffedd5', badge: '#fdddb8', icon: '#c2410c' }, // peach/tan
  'ac-repair': { fill: '#cffafe', badge: '#a9f0f6', icon: '#0891b2' }, // teal/cyan
  'pest-control': { fill: '#ffe4e6', badge: '#fecdd3', icon: '#e11d48' }, // coral/pink
  'appliance-repair': { fill: '#f3e8ff', badge: '#e6d3fb', icon: '#9333ea' }, // light purple
  default: { fill: '#eef2ff', badge: '#e0e7ff', icon: '#4f46e5' },
};

// Which services carry the "Popular" tag (frontend-only visual flag; not backend data).
const POPULAR = new Set(['painting', 'carpentry', 'ac-repair', 'pest-control', 'appliance-repair']);

export default function ServiceCardGrid({ services, onSelect }) {
  return (
    <View style={styles.grid}>
      {services.map((s) => {
        const Icon = serviceIcon(s.icon);
        const pastel = SERVICE_PASTELS[s.id] || SERVICE_PASTELS.default;
        const isPopular = POPULAR.has(s.id);
        return (
          <Pressable
            key={s.id}
            style={({ pressed }) => [styles.card, { backgroundColor: pastel.fill }, pressed && styles.cardPressed]}
            onPress={() => onSelect?.(s)}
            accessibilityRole="button"
            accessibilityLabel={`${s.name}, starts at ₹${s.basePrice}${isPopular ? ', popular' : ''}`}
          >
            <View style={styles.topRow}>
              {/* Top-left circular icon badge with a lighter tint of the pastel. */}
              <View style={[styles.iconWrap, { backgroundColor: pastel.badge }]}>
                <Icon size={20} color={pastel.icon} strokeWidth={2.3} />
              </View>
              {/* Top-right "Popular" pill on relevant services. */}
              {isPopular ? (
                <View style={styles.popularPill}>
                  <Text style={styles.popularText}>Popular</Text>
                </View>
              ) : null}
            </View>

            <Text style={styles.name} numberOfLines={2}>{s.name}</Text>
            <Text style={styles.priceLabel}>Starts at</Text>
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
    borderRadius: 16,
    padding: spacing.space4,
    // Borderless, single solid pastel card with a soft lift.
    ...shadows.shadowSm,
  },
  cardPressed: { opacity: 0.88, transform: [{ scale: 0.99 }] },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.space3,
    minHeight: 42,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: radii.radiusFull, // circular badge
    alignItems: 'center',
    justifyContent: 'center',
  },
  popularPill: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: radii.radiusFull,
    paddingVertical: 3,
    paddingHorizontal: 9,
  },
  popularText: {
    fontSize: 10,
    fontFamily: fontFamilies.interSemiBold,
    fontWeight: fontWeights.fwSemibold,
    color: TITLE_DARK,
    letterSpacing: 0.2,
  },
  name: {
    fontSize: fontSizes.fsBase,
    fontWeight: fontWeights.fwBold,
    fontFamily: fontFamilies.interBold,
    color: TITLE_DARK,
    marginBottom: 6,
  },
  priceLabel: {
    fontSize: 11,
    color: 'rgba(30,41,59,0.6)',
    fontFamily: fontFamilies.interMedium,
    fontWeight: fontWeights.fwMedium,
  },
  price: {
    fontSize: fontSizes.fsLg,
    fontWeight: fontWeights.fwExtrabold,
    fontFamily: fontFamilies.interExtraBold,
    color: TITLE_DARK,
    marginTop: 1,
  },
});
