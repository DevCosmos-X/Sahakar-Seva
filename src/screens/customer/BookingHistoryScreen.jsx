import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Clock, MapPin, CloudRain, Printer } from 'lucide-react-native';
import { useAuth } from '@context/AuthContext';
import { getBookingsByCustomer } from '@data/mockBookings';
import { shareReceipt } from '@utils/receipt';
import { ScreenContainer } from '@components/app';
import Badge from '@components/ui/Badge';
import StarRating from '@components/ui/StarRating';
import { colors, spacing, radii, shadows, fontSizes, fontWeights, fontFamilies } from '@theme';

/**
 * BookingHistoryScreen — ported from web pages/customer/BookingHistory.jsx.
 * Pushed stack screen (reached via dashboard "See all"). Modern card list; preserves status
 * badges, worker rating, weather tag, and the receipt button (shares a formatted bill via the
 * native share sheet — see utils/receipt.js).
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
      <Text style={styles.h1}>Booking & Invoice History</Text>
      <Text style={styles.sub}>{bookings.length} bookings total • All backed by Sahakar Seva Cooperative</Text>

      <View style={styles.list}>
        {bookings.map((b) => (
          <View key={b.id} style={styles.card}>
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{b.serviceName}</Text>
                <Text style={styles.ref}>Booking #{b.id}</Text>
              </View>
              <Badge variant={statusVariant[b.status] || 'default'}>{b.status.replace('-', ' ')}</Badge>
            </View>

            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Clock size={13} color={colors.gray400} />
                <Text style={styles.metaText}>{b.date} • {b.time}</Text>
              </View>
              <View style={styles.metaItem}>
                <MapPin size={13} color={colors.gray400} />
                <Text style={styles.metaText} numberOfLines={1}>{b.address?.split(',')[0]}</Text>
              </View>
            </View>

            <Text style={styles.desc} numberOfLines={2}>{b.description}</Text>

            {b.workerName ? (
              <View style={styles.workerRow}>
                <Text style={styles.workerText}>Worker: <Text style={styles.bold}>{b.workerName}</Text></Text>
                {b.workerRating ? <StarRating rating={b.workerRating} size={13} /> : null}
              </View>
            ) : null}

            <View style={styles.footer}>
              <View style={styles.priceWrap}>
                <Text style={styles.price}>₹{b.totalPrice}</Text>
                {b.weatherCondition && b.weatherCondition !== 'Clear' ? (
                  <View style={styles.weatherTag}>
                    <CloudRain size={11} color={colors.info600} />
                    <Text style={styles.weatherTagText}>{b.weatherCondition}</Text>
                  </View>
                ) : null}
              </View>
              <Pressable style={styles.receiptBtn} onPress={() => shareReceipt(b)}>
                <Printer size={13} color={colors.primary600} />
                <Text style={styles.receiptText}>Receipt</Text>
              </Pressable>
            </View>

            {b.status === 'completed' && b.rating ? (
              <View style={styles.ratingRow}>
                <Text style={styles.ratingLabel}>Your rating:</Text>
                <StarRating rating={b.rating} size={15} />
              </View>
            ) : null}
          </View>
        ))}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: fontSizes.fs2xl, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.gray900 },
  sub: { fontSize: fontSizes.fsSm, color: colors.gray500, fontFamily: fontFamilies.interRegular, marginTop: 2, marginBottom: spacing.space4 },
  list: { gap: spacing.space3 },
  card: { backgroundColor: colors.surfaceWhite, borderRadius: radii.radiusLg, padding: spacing.space4, ...shadows.shadowSm },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.space2 },
  name: { fontSize: fontSizes.fsBase, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.gray900 },
  ref: { fontSize: fontSizes.fsXs, color: colors.gray400, fontFamily: fontFamilies.interRegular },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.space4, marginTop: spacing.space2 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: fontSizes.fsXs, color: colors.gray500, fontFamily: fontFamilies.interRegular },
  desc: { fontSize: fontSizes.fsSm, color: colors.gray600, fontFamily: fontFamilies.interRegular, marginTop: spacing.space2 },
  workerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.space3 },
  workerText: { fontSize: fontSizes.fsSm, color: colors.gray600, fontFamily: fontFamilies.interRegular },
  bold: { fontWeight: fontWeights.fwSemibold, fontFamily: fontFamilies.interSemiBold, color: colors.gray900 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.space3, paddingTop: spacing.space3, borderTopWidth: 1, borderTopColor: colors.gray100 },
  priceWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.space2 },
  price: { fontSize: fontSizes.fsLg, fontWeight: fontWeights.fwExtrabold, fontFamily: fontFamilies.interExtraBold, color: colors.gray900 },
  weatherTag: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.info50, paddingVertical: 2, paddingHorizontal: 8, borderRadius: radii.radiusFull },
  weatherTagText: { fontSize: 10, color: colors.info700, fontFamily: fontFamilies.interMedium },
  receiptBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary50, borderWidth: 1, borderColor: colors.primary200, paddingVertical: 6, paddingHorizontal: 10, borderRadius: radii.radiusMd },
  receiptText: { fontSize: fontSizes.fsXs, fontWeight: fontWeights.fwSemibold, fontFamily: fontFamilies.interSemiBold, color: colors.primary600 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.space2, marginTop: spacing.space3 },
  ratingLabel: { fontSize: fontSizes.fsXs, color: colors.gray500, fontFamily: fontFamilies.interRegular },
});
