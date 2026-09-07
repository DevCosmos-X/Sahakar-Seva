import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Clock, MapPin, X, Bell, Navigation, ChevronRight } from 'lucide-react-native';
import { useAuth } from '@context/AuthContext';
import { mockServices } from '@data/mockServices';
import { getBookingsByCustomer } from '@data/mockBookings';
import { ScreenContainer, LocationBar, SearchBar, SectionHeader, PromoBanner, ServiceGrid } from '@components/app';
import Badge from '@components/ui/Badge';
import HelplineModal from '@components/HelplineModal';
import { colors, spacing, radii, shadows, fontSizes, fontWeights, fontFamilies } from '@theme';

/**
 * CustomerDashboardScreen — ported from web pages/customer/CustomerDashboard.jsx, re-laid-out in
 * the modern app language (location bar + search + promo banner + service grid + cards) instead
 * of the website's stacked-cards layout.
 *
 * PRESERVED from web (data/logic unchanged):
 *  - bookings = getBookingsByCustomer(user.id); activeBookings filter on en-route/in-progress/assigned
 *  - displayName = first word of profile.full_name / user.name / 'there'
 *  - MOCK_REMINDERS + daysUntil() + dismiss + "Book Now" deep-link with service_id & desc
 *  - Recent bookings (first 3), status color mapping, "Track" on en-route
 *  - HelplineModal entry
 *
 * NEW (presentation only): LocationBar, SearchBar (tappable stub → Book), PromoBanner, the
 * tinted 4-col ServiceGrid (with the CORRECT per-service icons — web had the iconComponent bug),
 * SectionHeader with "See all", softer cards.
 *
 * Navigation: web used string routes (/customer/book?service=&desc=). Here we navigate to the
 * 'CustomerBook' tab / 'LiveTrackingMap' stack screen with route params.
 */

const statusVariant = {
  'en-route': 'en-route',
  'in-progress': 'in-progress',
  completed: 'completed',
  cancelled: 'cancelled',
  assigned: 'assigned',
  booked: 'default',
};

const MOCK_REMINDERS = [
  { id: 1, service_id: 'ac-repair', service_name: 'AC Filter Cleaning', next_due_date: '2026-09-05', interval_days: 90, icon: '❄️' },
  { id: 2, service_id: 'plumbing', service_name: 'RO Water Purifier Service', next_due_date: '2026-09-12', interval_days: 60, icon: '💧' },
  { id: 3, service_id: 'cleaning', service_name: 'Chimney Deep Cleaning', next_due_date: '2026-09-20', interval_days: 45, icon: '🔥' },
];

export default function CustomerDashboardScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const bookings = getBookingsByCustomer(user?.id);
  const activeBookings = bookings.filter((b) => ['en-route', 'in-progress', 'assigned'].includes(b.status));
  const [reminders, setReminders] = useState(MOCK_REMINDERS);
  const [showHelpline, setShowHelpline] = useState(false);

  const displayName = profile?.full_name?.split(' ')[0] || user?.name?.split(' ')[0] || 'there';

  const dismissReminder = (id) => setReminders((prev) => prev.filter((r) => r.id !== id));
  const daysUntil = (dateStr) => Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));

  const goBook = (params) => navigation.navigate('CustomerBook', params);
  const goTrack = (bookingId) => navigation.navigate('LiveTrackingMap', { bookingId });

  return (
    <ScreenContainer contentStyle={{ paddingTop: insets.top + spacing.space2 }}>
      {/* Location + greeting */}
      <LocationBar
        label={`नमस्ते, ${displayName}! 👋`}
        city="Gurugram, Haryana"
        onPressBell={() => setShowHelpline(true)}
      />

      {/* Search (tappable stub — no search backend; entry point to booking) */}
      <View style={styles.searchWrap}>
        <SearchBar placeholder="Search plumbing, AC, cleaning…" onPress={() => goBook(undefined)} />
      </View>

      {/* Promo hero */}
      <PromoBanner onPress={() => goBook(undefined)} />

      {/* Active booking */}
      {activeBookings.length > 0 && (
        <View style={styles.activeCard}>
          <View style={styles.activeDot} />
          <View style={styles.activeInfo}>
            <Text style={styles.activeTitle}>Active Booking</Text>
            <Text style={styles.activeSub} numberOfLines={1}>
              {activeBookings[0].serviceName} — {activeBookings[0].workerName} is{' '}
              {activeBookings[0].status.replace('-', ' ')}
            </Text>
          </View>
          <Pressable style={styles.trackBtn} onPress={() => goTrack(activeBookings[0].id)}>
            <Navigation size={14} color={colors.white} />
            <Text style={styles.trackBtnText}>Track</Text>
          </Pressable>
        </View>
      )}

      {/* Service reminders */}
      {reminders.length > 0 && (
        <View style={styles.section}>
          <View style={styles.remindersHead}>
            <Bell size={18} color={colors.warning600} />
            <Text style={styles.remindersTitle}>Service Reminders</Text>
            <Badge variant="warning" size="sm">
              {String(reminders.length)}
            </Badge>
          </View>
          <View style={styles.remindersList}>
            {reminders.map((r) => {
              const days = daysUntil(r.next_due_date);
              const isUrgent = days <= 3;
              return (
                <View key={r.id} style={[styles.reminderItem, isUrgent && styles.reminderUrgent]}>
                  <Text style={styles.reminderIcon}>{r.icon}</Text>
                  <View style={styles.reminderInfo}>
                    <Text style={styles.reminderName}>{r.service_name}</Text>
                    <Text style={styles.reminderMeta}>
                      {days <= 0 ? '⚠️ Overdue!' : `Due in ${days} day${days !== 1 ? 's' : ''}`} • Every {r.interval_days} days
                    </Text>
                  </View>
                  <Pressable
                    style={styles.reminderBook}
                    onPress={() => goBook({ service: r.service_id, desc: r.service_name })}
                  >
                    <Text style={styles.reminderBookText}>Book</Text>
                  </Pressable>
                  <Pressable style={styles.reminderDismiss} onPress={() => dismissReminder(r.id)} hitSlop={8}>
                    <X size={14} color={colors.gray400} />
                  </Pressable>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Services grid */}
      <View style={styles.section}>
        <SectionHeader title="Available Services" />
        <ServiceGrid services={mockServices} columns={4} showPrice onSelect={(s) => goBook({ service: s.id })} />
      </View>

      {/* Recent bookings */}
      <View style={styles.section}>
        <SectionHeader title="Recent Bookings" actionLabel="See all →" onPressAction={() => navigation.navigate('BookingHistory')} />
        <View style={styles.bookingsList}>
          {bookings.slice(0, 3).map((b) => (
            <Pressable key={b.id} style={styles.bookingCard} onPress={() => navigation.navigate('CustomerBookings')}>
              <View style={styles.bookingLeft}>
                <Text style={styles.bookingName}>{b.serviceName}</Text>
                <View style={styles.bookingMetaRow}>
                  <Clock size={11} color={colors.gray400} />
                  <Text style={styles.bookingMeta}>
                    {b.date} • {b.time}
                  </Text>
                </View>
                <View style={styles.bookingMetaRow}>
                  <MapPin size={11} color={colors.gray400} />
                  <Text style={styles.bookingMeta} numberOfLines={1}>
                    {b.address?.split(',')[0]}
                  </Text>
                </View>
              </View>
              <View style={styles.bookingRight}>
                <Badge variant={statusVariant[b.status] || 'default'} size="sm">
                  {b.status.replace('-', ' ')}
                </Badge>
                <Text style={styles.bookingPrice}>₹{b.totalPrice}</Text>
                {b.status === 'en-route' ? (
                  <Pressable style={styles.miniTrack} onPress={() => goTrack(b.id)}>
                    <Navigation size={11} color={colors.primary600} />
                    <Text style={styles.miniTrackText}>Track</Text>
                  </Pressable>
                ) : (
                  <ChevronRight size={16} color={colors.gray300} />
                )}
              </View>
            </Pressable>
          ))}
        </View>
      </View>

      <HelplineModal isOpen={showHelpline} onClose={() => setShowHelpline(false)} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  searchWrap: {
    marginTop: spacing.space4,
    marginBottom: spacing.space4,
  },
  section: {
    marginTop: spacing.space6,
  },
  activeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space3,
    marginTop: spacing.space4,
    backgroundColor: colors.surfaceWhite,
    borderRadius: radii.radiusLg,
    padding: spacing.space4,
    borderWidth: 1,
    borderColor: colors.primary100,
    ...shadows.shadowSm,
  },
  activeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.success500,
  },
  activeInfo: {
    flex: 1,
  },
  activeTitle: {
    fontSize: fontSizes.fsSm,
    fontWeight: fontWeights.fwBold,
    fontFamily: fontFamilies.interBold,
    color: colors.gray900,
  },
  activeSub: {
    fontSize: fontSizes.fsXs,
    color: colors.gray500,
    fontFamily: fontFamilies.interRegular,
  },
  trackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary600,
    paddingVertical: spacing.space2,
    paddingHorizontal: spacing.space3,
    borderRadius: radii.radiusMd,
  },
  trackBtnText: {
    fontSize: fontSizes.fsXs,
    fontWeight: fontWeights.fwBold,
    fontFamily: fontFamilies.interBold,
    color: colors.white,
  },
  remindersHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space2,
    marginBottom: spacing.space3,
  },
  remindersTitle: {
    flex: 1,
    fontSize: fontSizes.fsLg,
    fontWeight: fontWeights.fwBold,
    fontFamily: fontFamilies.interBold,
    color: colors.gray900,
  },
  remindersList: {
    gap: spacing.space2,
  },
  reminderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space3,
    backgroundColor: colors.surfaceWhite,
    borderRadius: radii.radiusLg,
    padding: spacing.space3,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  reminderUrgent: {
    borderColor: colors.warning300,
    backgroundColor: colors.warning50,
  },
  reminderIcon: {
    fontSize: 24,
  },
  reminderInfo: {
    flex: 1,
  },
  reminderName: {
    fontSize: fontSizes.fsSm,
    fontWeight: fontWeights.fwSemibold,
    fontFamily: fontFamilies.interSemiBold,
    color: colors.gray900,
  },
  reminderMeta: {
    fontSize: fontSizes.fsXs,
    color: colors.gray500,
    fontFamily: fontFamilies.interRegular,
  },
  reminderBook: {
    backgroundColor: colors.primary600,
    paddingVertical: spacing.space2,
    paddingHorizontal: spacing.space3,
    borderRadius: radii.radiusMd,
  },
  reminderBookText: {
    fontSize: fontSizes.fsXs,
    fontWeight: fontWeights.fwBold,
    fontFamily: fontFamilies.interBold,
    color: colors.white,
  },
  reminderDismiss: {
    padding: 2,
  },
  bookingsList: {
    gap: spacing.space3,
  },
  bookingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceWhite,
    borderRadius: radii.radiusLg,
    padding: spacing.space4,
    borderWidth: 1,
    borderColor: colors.gray200,
    ...shadows.shadowSm,
  },
  bookingLeft: {
    flex: 1,
    gap: 2,
  },
  bookingName: {
    fontSize: fontSizes.fsBase,
    fontWeight: fontWeights.fwSemibold,
    fontFamily: fontFamilies.interSemiBold,
    color: colors.gray900,
    marginBottom: 2,
  },
  bookingMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bookingMeta: {
    fontSize: fontSizes.fsXs,
    color: colors.gray500,
    fontFamily: fontFamilies.interRegular,
    flexShrink: 1,
  },
  bookingRight: {
    alignItems: 'flex-end',
    gap: spacing.space1,
  },
  bookingPrice: {
    fontSize: fontSizes.fsSm,
    fontWeight: fontWeights.fwBold,
    fontFamily: fontFamilies.interBold,
    color: colors.gray900,
  },
  miniTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  miniTrackText: {
    fontSize: fontSizes.fsXs,
    fontWeight: fontWeights.fwSemibold,
    fontFamily: fontFamilies.interSemiBold,
    color: colors.primary600,
  },
});
