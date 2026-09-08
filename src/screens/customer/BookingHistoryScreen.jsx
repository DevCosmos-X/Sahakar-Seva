import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Clock, MapPin, CloudRain, Printer, ReceiptText, ClipboardList, UserRound } from 'lucide-react-native';
import { useAuth } from '@context/AuthContext';
import { getBookingsByCustomer } from '@data/mockBookings';
import { shareReceipt } from '@utils/receipt';
import { ScreenContainer } from '@components/app';
import Badge from '@components/ui/Badge';
import StarRating from '@components/ui/StarRating';
import { colors, spacing, radii, shadows, fontSizes, fontWeights, fontFamilies } from '@theme';

/**
 * BookingHistoryScreen — ported from web pages/customer/BookingHistory.jsx.
 * Pushed stack screen (reached via dashboard "See all"; back arrow + "Booking History" title come
 * from the native stack header in CustomerStack).
 *
 * UI REDESIGN (frontend-only — data source, fields, conditionals, and the receipt action are all
 * unchanged):
 *  - Data still comes from getBookingsByCustomer(user?.id); the "{n} bookings total" count is
 *    still derived dynamically from bookings.length.
 *  - Premium in-content header + white rounded cards with a clear hierarchy (service+status →
 *    booking id → description → worker+rating → date/time/location → price → Receipt).
 *  - Same status badge variants, same StarRating for worker rating and "Your rating", same
 *    weather tag condition, same shareReceipt(b) handler.
 *  - Added ONLY a presentational empty state for the 0-bookings case (no new action/navigation).
 */

const statusVariant = {
  'en-route': 'en-route', 'in-progress': 'in-progress', completed: 'completed',
  cancelled: 'cancelled', assigned: 'assigned', booked: 'default',
};

export default function BookingHistoryScreen() {
  const { user } = useAuth();
  const bookings = getBookingsByCustomer(user?.id);

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={styles.headerBlock}>
        <View style={styles.titleRow}>
          <View style={styles.titleIcon}>
            <ReceiptText size={20} color={colors.primary700} strokeWidth={2.2} />
          </View>
          <Text style={styles.h1}>Booking & Invoice History</Text>
        </View>
        <Text style={styles.sub}>
          {bookings.length} booking{bookings.length !== 1 ? 's' : ''} total · All backed by Sahakar Seva Cooperative
        </Text>
      </View>

      {bookings.length === 0 ? (
        // Presentational empty state (no new functionality) for the 0-bookings case.
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIcon}>
            <ClipboardList size={30} color={colors.primary400} strokeWidth={1.8} />
          </View>
          <Text style={styles.emptyTitle}>No bookings yet</Text>
          <Text style={styles.emptyText}>Your booking and invoice history will appear here once you book a service.</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {bookings.map((b) => (
            <View key={b.id} style={styles.card}>
              {/* 1. Service name + status */}
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <Text style={styles.name}>{b.serviceName}</Text>
                  {/* 2. Booking id */}
                  <Text style={styles.ref}>Booking #{b.id}</Text>
                </View>
                <Badge variant={statusVariant[b.status] || 'default'}>{b.status.replace('-', ' ')}</Badge>
              </View>

              {/* 3. Description */}
              {b.description ? <Text style={styles.desc} numberOfLines={3}>{b.description}</Text> : null}

              {/* 4 + 5. Worker + worker rating */}
              {b.workerName ? (
                <View style={styles.workerRow}>
                  <View style={styles.workerLeft}>
                    <View style={styles.workerAvatar}>
                      <UserRound size={15} color={colors.primary700} strokeWidth={2.2} />
                    </View>
                    <Text style={styles.workerText} numberOfLines={1}>
                      <Text style={styles.workerLabel}>Worker  </Text>
                      <Text style={styles.bold}>{b.workerName}</Text>
                    </Text>
                  </View>
                  {b.workerRating ? <StarRating rating={b.workerRating} size={13} /> : null}
                </View>
              ) : null}

              {/* 6. Date/time + location */}
              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Clock size={13} color={colors.gray400} strokeWidth={2} />
                  <Text style={styles.metaText}>{b.date} • {b.time}</Text>
                </View>
                <View style={styles.metaItem}>
                  <MapPin size={13} color={colors.gray400} strokeWidth={2} />
                  <Text style={styles.metaText} numberOfLines={1}>{b.address?.split(',')[0]}</Text>
                </View>
              </View>

              {/* 7 + 8. Price + Receipt */}
              <View style={styles.footer}>
                <View style={styles.priceWrap}>
                  <Text style={styles.priceLabel}>Total paid</Text>
                  <View style={styles.priceLine}>
                    <Text style={styles.price}>₹{b.totalPrice}</Text>
                    {b.weatherCondition && b.weatherCondition !== 'Clear' ? (
                      <View style={styles.weatherTag}>
                        <CloudRain size={11} color={colors.info600} strokeWidth={2} />
                        <Text style={styles.weatherTagText}>{b.weatherCondition}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
                <Pressable
                  style={({ pressed }) => [styles.receiptBtn, pressed && styles.receiptBtnPressed]}
                  onPress={() => shareReceipt(b)}
                  accessibilityRole="button"
                  accessibilityLabel="Share receipt"
                >
                  <Printer size={14} color={colors.primary600} strokeWidth={2.2} />
                  <Text style={styles.receiptText}>Receipt</Text>
                </Pressable>
              </View>

              {/* Your rating (completed + rated only) */}
              {b.status === 'completed' && b.rating ? (
                <View style={styles.ratingRow}>
                  <Text style={styles.ratingLabel}>Your rating</Text>
                  <StarRating rating={b.rating} size={15} />
                </View>
              ) : null}
            </View>
          ))}
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  // ---- Header ----
  headerBlock: {
    marginBottom: spacing.space4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space3,
  },
  titleIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.radiusMd,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  h1: {
    flex: 1,
    fontSize: fontSizes.fsXl,
    fontWeight: fontWeights.fwExtrabold,
    fontFamily: fontFamilies.interExtraBold,
    color: colors.gray900,
  },
  sub: {
    fontSize: fontSizes.fsSm,
    color: colors.gray500,
    fontFamily: fontFamilies.interRegular,
    marginTop: spacing.space2,
  },

  // ---- List / cards ----
  list: { gap: spacing.space3 },
  card: {
    backgroundColor: colors.surfaceWhite,
    borderRadius: radii.radiusXl,
    padding: spacing.space5,
    borderWidth: 1,
    borderColor: colors.gray100,
    ...shadows.shadowSm,
    gap: spacing.space3,
  },

  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.space2 },
  headerLeft: { flex: 1, gap: 2 },
  name: {
    fontSize: fontSizes.fsLg,
    fontWeight: fontWeights.fwBold,
    fontFamily: fontFamilies.interBold,
    color: colors.gray900,
  },
  ref: {
    fontSize: fontSizes.fsXs,
    color: colors.gray400,
    fontFamily: fontFamilies.interMedium,
  },

  desc: {
    fontSize: fontSizes.fsSm,
    color: colors.gray600,
    fontFamily: fontFamilies.interRegular,
    lineHeight: fontSizes.fsSm * 1.45,
  },

  workerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.space2,
    backgroundColor: colors.gray50,
    borderRadius: radii.radiusMd,
    paddingVertical: spacing.space2,
    paddingHorizontal: spacing.space3,
  },
  workerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space2,
    flex: 1,
  },
  workerAvatar: {
    width: 28,
    height: 28,
    borderRadius: radii.radiusFull,
    backgroundColor: colors.primary100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workerText: { flex: 1, fontSize: fontSizes.fsSm, color: colors.gray600, fontFamily: fontFamilies.interRegular },
  workerLabel: { fontSize: fontSizes.fsXs, color: colors.gray400, fontFamily: fontFamilies.interMedium },
  bold: { fontWeight: fontWeights.fwSemibold, fontFamily: fontFamilies.interSemiBold, color: colors.gray900 },

  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.space4 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontSize: fontSizes.fsXs, color: colors.gray500, fontFamily: fontFamilies.interRegular, flexShrink: 1 },

  footer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.space3,
    marginTop: spacing.space1,
    paddingTop: spacing.space3,
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
  },
  priceWrap: { flex: 1, gap: 2 },
  priceLabel: { fontSize: 11, color: colors.gray400, fontFamily: fontFamilies.interMedium },
  priceLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.space2, flexWrap: 'wrap' },
  price: {
    fontSize: fontSizes.fsXl,
    fontWeight: fontWeights.fwExtrabold,
    fontFamily: fontFamilies.interExtraBold,
    color: colors.gray900,
  },
  weatherTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.info50,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: radii.radiusFull,
  },
  weatherTagText: { fontSize: 10, color: colors.info700, fontFamily: fontFamilies.interMedium },

  receiptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceWhite,
    borderWidth: 1.5,
    borderColor: colors.primary200,
    paddingVertical: spacing.space2,
    paddingHorizontal: spacing.space4,
    borderRadius: radii.radiusMd,
  },
  receiptBtnPressed: { backgroundColor: colors.primary50 },
  receiptText: {
    fontSize: fontSizes.fsSm,
    fontWeight: fontWeights.fwSemibold,
    fontFamily: fontFamilies.interSemiBold,
    color: colors.primary600,
  },

  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space2,
    backgroundColor: colors.success50,
    alignSelf: 'flex-start',
    paddingVertical: spacing.space1,
    paddingHorizontal: spacing.space3,
    borderRadius: radii.radiusFull,
  },
  ratingLabel: { fontSize: fontSizes.fsXs, color: colors.success700, fontFamily: fontFamilies.interSemiBold, fontWeight: fontWeights.fwSemibold },

  // ---- Empty state ----
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.space16,
    paddingHorizontal: spacing.space6,
    gap: spacing.space2,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: radii.radiusFull,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.space2,
  },
  emptyTitle: {
    fontSize: fontSizes.fsLg,
    fontWeight: fontWeights.fwBold,
    fontFamily: fontFamilies.interBold,
    color: colors.gray800,
  },
  emptyText: {
    fontSize: fontSizes.fsSm,
    color: colors.gray500,
    fontFamily: fontFamilies.interRegular,
    textAlign: 'center',
    lineHeight: fontSizes.fsSm * 1.5,
  },
});
