import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, Animated, StyleSheet, Easing, Platform, Modal, ScrollView } from 'react-native';
import Svg, {
  Path, Circle, Line as SvgLine, Defs, LinearGradient, RadialGradient, Stop, G,
} from 'react-native-svg';
import {
  Users,
  Briefcase,
  IndianRupee,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  LogOut,
  CalendarDays,
  MoreVertical,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react-native';
import { mockWorkers } from '@data/mockWorkers';
import { mockBookings } from '@data/mockBookings';
import { mockComplaints } from '@data/mockComplaints';
import { mockServices } from '@data/mockServices';
import { serviceIcon } from '@components/icons';
import { getWorkerList } from '@services/supabase';
import { useLanguage } from '@context/LanguageContext';
import { useAuth } from '@context/AuthContext';
import { ScreenContainer } from '@components/app';
import { colors, spacing, radii, shadows, fontSizes, fontWeights, fontFamilies } from '@theme';

/**
 * AdminDashboardScreen — ported from web pages/admin/AdminDashboard.jsx (admin accent = red).
 *
 * PHASE 11 REDESIGN v3 — PRESENTATION ONLY. Data layer, queries, handlers, and routes are
 * untouched from every prior version:
 *
 *   PRESERVED LOGIC (byte-for-byte):
 *     - getWorkerList() useEffect seeds totalWorkers from mockWorkers and tops it up with unique
 *       real Supabase workers (deduped vs demoWorkerIds), keeping the mock count on error /
 *       when Supabase is unconfigured.
 *     - totalBookings/totalRevenue/openComplaints/activeWorkers derived from the same sources.
 *     - the 3 quick actions still navigate to AdminForecast / AdminWorkers / AdminComplaints.
 *     - recent bookings = mockBookings.slice(0, 6) with each record's real fields.
 *   Per the request, the Quick Actions and Recent Bookings sections are kept AS-IS from v2 —
 *   only the header, KPI cards, revenue chart, background and typography changed.
 *
 *   HONESTY CONSTRAINTS (no fabricated data):
 *     - The reference mock shows "+12% / +20% / +28% / +0% vs last week" trend chips on the KPIs
 *       and "+25% vs previous week" on the chart. NO period-over-period comparison exists in any
 *       data source, so those chips are NOT rendered — displaying them would be inventing data.
 *       Only the real values are shown.
 *     - The revenue chart series is derived purely in the view layer from bookings that already
 *       exist (their own date + totalPrice), bucketed by real booking date, rendered only when
 *       >= 2 dates carry revenue. No new query, no synthetic series.
 *     - The per-booking 3-dot control is a visual affordance only (no admin bookings-detail
 *       route exists to open).
 */

function firstNameOf(profile) {
  const full = (profile?.full_name || '').trim();
  if (!full) return null;
  return full.split(/\s+/)[0];
}

function greetingKey(hour) {
  if (hour < 12) return 'good_morning';
  if (hour < 17) return 'good_afternoon';
  return 'good_evening';
}

const SERVICE_BY_ID = new Map(mockServices.map((s) => [s.id, s]));

/* ------------------------------------------------------------------ */
/* Luxury design tokens — SCOPED to the Recent Bookings section only.  */
/* Purely presentational; no data/logic/route touched.                 */
/* ------------------------------------------------------------------ */

// High-contrast modern serif for service titles. No serif font is bundled, so we fall back to
// each platform's built-in serif family (Android → Noto/Droid Serif via 'serif'; iOS → Georgia).
const SERIF = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });

// "Carved pearl on obsidian" palette for the dark luxury cards.
const LUX = {
  cardTop: '#232936', // lighter top of the chamfer (light source above)
  cardBottom: '#161a23', // deeper bottom of the card body
  rimLight: 'rgba(255,255,255,0.16)', // top chamfer highlight
  rimDark: 'rgba(0,0,0,0.55)', // bottom carved shadow
  hairline: 'rgba(202,168,101,0.22)', // faint gold hairline border
  gold: '#e8c976',
  goldDeep: '#c9a24b',
  copper: '#d98f5a',
  bronze: '#b3874f',
  silver: '#d9dee7',
  title: '#f4f1ea', // warm off-white (pearl) for serif titles
  sub: '#aeb4c0', // light-weight secondary text
  faint: '#7d8494', // IDs / dates
  badgeText: '#8fb4ff', // blue status text
};

// Per-service metallic material. `metal` drives the medallion sheen; `rim` is the outline;
// `wood` (carpentry) swaps the disc for wood-grain tones. Keyed by the real service id.
const SERVICE_MATERIAL = {
  plumbing: { metal: '#dfe6ef', metalDark: '#aab4c2', rim: LUX.silver, tint: '#cfd8e6' }, // brushed steel wrench
  electrical: { metal: '#f4d786', metalDark: '#caa245', rim: LUX.gold, tint: LUX.gold }, // polished gold bolt
  cleaning: { metal: '#e6cea6', metalDark: '#c19a5e', rim: LUX.bronze, tint: '#dcc08a' }, // brushed bronze
  painting: { metal: '#e7c98f', metalDark: '#bd8f4e', rim: LUX.gold, tint: LUX.gold },
  carpentry: { metal: '#c9925c', metalDark: '#7c4a22', rim: LUX.copper, tint: '#b9793f', wood: true }, // wood + copper
  'ac-repair': { metal: '#dfe6ef', metalDark: '#a7b2c1', rim: LUX.silver, tint: '#cdd6e4' }, // brushed steel fan
  'pest-control': { metal: '#e6b98a', metalDark: '#b87441', rim: LUX.copper, tint: LUX.copper }, // burnished copper beetle
  'appliance-repair': { metal: '#e9cf94', metalDark: '#c19a52', rim: LUX.goldDeep, tint: LUX.gold }, // gilded gear
};

function materialFor(serviceId) {
  return SERVICE_MATERIAL[serviceId] || SERVICE_MATERIAL['appliance-repair'];
}

function shortDate(iso, withYear = false) {
  if (typeof iso !== 'string') return '';
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(
    undefined,
    withYear ? { day: 'numeric', month: 'short', year: 'numeric' } : { day: 'numeric', month: 'short' }
  );
}

/**
 * Revenue per booking date (most recent `limit` dates with revenue), derived only from the
 * existing mockBookings records. Keyed off dates present in the data so the chart never renders
 * an all-zero/misleading window.
 */
function buildRevenueSeries(bookings, limit = 7) {
  const byDate = new Map();
  for (const b of bookings) {
    const key = typeof b?.date === 'string' ? b.date.slice(0, 10) : null;
    if (!key) continue;
    const amount = Number(b?.totalPrice);
    if (!Number.isFinite(amount)) continue;
    byDate.set(key, (byDate.get(key) || 0) + amount);
  }
  return [...byDate.entries()]
    .filter(([, total]) => total > 0)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .slice(-limit)
    .map(([date, total]) => ({ date, total }));
}

export default function AdminDashboardScreen({ navigation }) {
  const { t } = useLanguage();
  const { profile, logout } = useAuth();

  const demoWorkerIds = new Set(mockWorkers.map((w) => w.id));
  const [totalWorkers, setTotalWorkers] = useState(mockWorkers.length);
  const activeWorkers = mockWorkers.filter((w) => w.available).length;

  useEffect(() => {
    getWorkerList().then(({ data, error }) => {
      if (error || !Array.isArray(data)) return; // keep mock count on failure
      const uniqueRegistered = data.filter((p) => !demoWorkerIds.has(p.id)).length;
      setTotalWorkers(mockWorkers.length + uniqueRegistered);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalBookings = mockBookings.length;
  const totalRevenue = mockBookings.reduce((sum, b) => sum + b.totalPrice, 0);
  const openComplaints = mockComplaints.filter((c) => c.status === 'open').length;

  const revenueSeries = useMemo(() => buildRevenueSeries(mockBookings), []);

  // ---- Interactive calendar (frontend-only view state over existing mockBookings) ----
  // Groups the already-loaded bookings by their YYYY-MM-DD date so tapping a day can show that
  // day's data. No new data source, no backend call — purely reads mockBookings.
  const bookingsByDay = useMemo(() => {
    const map = new Map();
    for (const b of mockBookings) {
      const key = typeof b?.date === 'string' ? b.date.slice(0, 10) : null;
      if (!key) continue;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(b);
    }
    return map;
  }, []);

  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null); // 'YYYY-MM-DD' | null
  const [viewMonth, setViewMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() }; // month: 0-11
  });

  const now = new Date();
  const greeting = t(greetingKey(now.getHours()));
  const firstName = firstNameOf(profile);

  // Staggered fade/rise on mount — native-driven, non-blocking.
  const enter = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(enter, {
      toValue: 1,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [enter]);
  const rise = (distance) => ({
    opacity: enter,
    transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }],
  });

  return (
    <ScreenContainer contentStyle={styles.pageContent}>
      {/* ---------------- Header ---------------- */}
      <Animated.View style={rise(8)}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting} numberOfLines={1}>
              {firstName ? `${greeting}, ${firstName}! 👋` : `${greeting}, ${t('admin')}! 👋`}
            </Text>
            <Text style={styles.pageTitle} numberOfLines={1}>
              {t('dashboard')}
            </Text>
            <Text style={styles.pageSubtitle} numberOfLines={2}>
              {t('overview_desc')}
            </Text>
          </View>
          <View style={styles.headerActions}>
            {/* Round profile avatar (presentation only — derived from existing profile name). */}
            <View style={styles.profileAvatar} accessible accessibilityLabel={firstName || t('admin')}>
              <Text style={styles.profileAvatarText}>
                {(firstName || t('admin') || 'A').trim().charAt(0).toUpperCase()}
              </Text>
              <View style={styles.profileAvatarDot} />
            </View>
            <Pressable
              style={styles.logoutBtn}
              onPress={logout}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('logout')}
            >
              <LogOut size={18} color={colors.gray600} strokeWidth={2.2} />
            </Pressable>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [styles.datePill, pressed && styles.datePillPressed]}
          onPress={() => setCalendarOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={`Open calendar. Today is ${now.toDateString()}`}
        >
          <View style={styles.datePillIcon}>
            <CalendarDays size={15} color={colors.primary600} strokeWidth={2.2} />
          </View>
          <View>
            <Text style={styles.datePillDay}>
              {now.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
            </Text>
            <Text style={styles.datePillWeekday}>
              {now.toLocaleDateString(undefined, { weekday: 'short' })}
            </Text>
          </View>
          {/* Dropdown chevron — tapping the pill opens the interactive calendar. */}
          <ChevronDown size={15} color={colors.gray400} strokeWidth={2.4} style={styles.datePillChevron} />
        </Pressable>
      </Animated.View>

      {/* ---------------- Interactive calendar (bottom sheet) ---------------- */}
      <CalendarSheet
        visible={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        viewMonth={viewMonth}
        setViewMonth={setViewMonth}
        selectedDay={selectedDay}
        setSelectedDay={setSelectedDay}
        bookingsByDay={bookingsByDay}
      />

      {/* ---------------- KPI grid (2 columns) ---------------- */}
      <Animated.View style={[styles.statsGrid, rise(14)]}>
        <View style={styles.statCell}>
          <KpiCard
            label={t('total_workers')}
            value={totalWorkers}
            icon={Users}
            tone="slate"
            trend={`${activeWorkers} active now`}
          />
        </View>
        <View style={styles.statCell}>
          <KpiCard
            label={t('total_bookings')}
            value={totalBookings}
            icon={Briefcase}
            tone="amber"
            trend="Across all services"
          />
        </View>
        <View style={styles.statCell}>
          <KpiCard
            label={t('revenue')}
            value={totalRevenue}
            icon={IndianRupee}
            tone="emerald"
            prefix="₹"
            grouped
            trend="Booking revenue"
          />
        </View>
        <View style={styles.statCell}>
          <KpiCard
            label={t('open_complaints')}
            value={openComplaints}
            icon={AlertTriangle}
            tone="pink"
            trend={openComplaints > 0 ? 'Active issues' : 'All clear'}
          />
        </View>
      </Animated.View>

      {/* ---------------- Revenue chart (dark centerpiece; real data only) ---------------- */}
      {revenueSeries.length >= 2 && (
        <Animated.View style={[styles.section, rise(18)]}>
          <RevenueChart series={revenueSeries} label={t('revenue')} />
        </Animated.View>
      )}

      {/* ================================================================= */}
      {/* Quick Actions — redesigned: 3-column pastel action cards           */}
      {/* ================================================================= */}
      <Animated.View style={[styles.section, rise(18)]}>
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>{t('quick_actions')}</Text>
          <View style={styles.seeAllBtn}>
            <Text style={styles.seeAllText}>{t('see_all')}</Text>
            <ArrowRight size={13} color={colors.primary600} strokeWidth={2.4} />
          </View>
        </View>

        <View style={styles.actionsGrid}>
          <QuickActionCard
            icon={TrendingUp}
            tone="lavender"
            title={t('demand_forecast_ai')}
            sub="Predict demand spikes with AI"
            onPress={() => navigation.navigate('AdminForecast')}
          />
          <QuickActionCard
            icon={Users}
            tone="mint"
            title={t('manage_workers')}
            sub={`${totalWorkers} registered • ${activeWorkers} online`}
            onPress={() => navigation.navigate('AdminWorkers')}
          />
          <QuickActionCard
            icon={AlertTriangle}
            tone="rose"
            title={t('view_complaints')}
            sub={`${openComplaints} issues pending review`}
            badge={openComplaints > 0 ? openComplaints : null}
            onPress={() => navigation.navigate('AdminComplaints')}
          />
        </View>
      </Animated.View>

      {/* ================================================================= */}
      {/* Recent Bookings — redesigned: premium horizontal cards             */}
      {/* ================================================================= */}
      <Animated.View style={[styles.section, rise(18)]}>
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>{t('recent_bookings')}</Text>
          <View style={styles.seeAllBtn}>
            <Text style={styles.seeAllText}>{t('see_all')}</Text>
            <ArrowRight size={13} color={colors.primary600} strokeWidth={2.4} />
          </View>
        </View>
        <View style={styles.bookingsList}>
          {mockBookings.slice(0, 6).map((b) => (
            <BookingCard key={b.id} booking={b} />
          ))}
        </View>
      </Animated.View>
    </ScreenContainer>
  );
}

/* ------------------------------------------------------------------ */
/* Press feedback                                                      */
/* ------------------------------------------------------------------ */

function PressableScale({ children, style, onPress, accessibilityLabel, ...rest }) {
  const scale = useRef(new Animated.Value(1)).current;
  const to = (value) =>
    Animated.spring(scale, { toValue: value, useNativeDriver: true, friction: 7, tension: 180 }).start();
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => to(0.97)}
      onPressOut={() => to(1)}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      {...rest}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/* Interactive calendar — bottom sheet. Presentation/view-state only:  */
/* it reads the pre-grouped bookingsByDay (from existing mockBookings) */
/* and shows the selected day's bookings. No backend/data/route change.*/
/* ------------------------------------------------------------------ */

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function pad2(n) {
  return n < 10 ? `0${n}` : String(n);
}
function dayKey(year, month, day) {
  return `${year}-${pad2(month + 1)}-${pad2(day)}`;
}

function CalendarSheet({ visible, onClose, viewMonth, setViewMonth, selectedDay, setSelectedDay, bookingsByDay }) {
  const { year, month } = viewMonth;
  const todayKey = dayKey(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

  const firstWeekday = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Build the grid cells (leading blanks + each day of the month).
  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const goPrev = () => setViewMonth(month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 });
  const goNext = () => setViewMonth(month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 });

  const selectedList = selectedDay ? (bookingsByDay.get(selectedDay) || []) : [];
  const selectedRevenue = selectedList.reduce((sum, b) => sum + (Number(b.totalPrice) || 0), 0);

  const prettyDay = (key) => {
    const d = new Date(`${key}T00:00:00`);
    return Number.isNaN(d.getTime())
      ? key
      : d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.calBackdrop}>
        <Pressable style={styles.calBackdropTap} onPress={onClose} accessibilityLabel="Close calendar" />
        <View style={styles.calSheet}>
          {/* Sheet header */}
          <View style={styles.calSheetHead}>
            <Text style={styles.calSheetTitle}>Calendar</Text>
            <Pressable onPress={onClose} hitSlop={8} style={styles.calCloseBtn} accessibilityLabel="Close">
              <X size={20} color={colors.gray600} />
            </Pressable>
          </View>

          {/* Month navigation */}
          <View style={styles.calMonthRow}>
            <Pressable onPress={goPrev} hitSlop={8} style={styles.calNavBtn} accessibilityLabel="Previous month">
              <ChevronLeft size={20} color={colors.primary600} />
            </Pressable>
            <Text style={styles.calMonthLabel}>{MONTH_NAMES[month]} {year}</Text>
            <Pressable onPress={goNext} hitSlop={8} style={styles.calNavBtn} accessibilityLabel="Next month">
              <ChevronRight size={20} color={colors.primary600} />
            </Pressable>
          </View>

          {/* Weekday header */}
          <View style={styles.calWeekRow}>
            {WEEKDAYS.map((w, i) => (
              <View key={i} style={styles.calWeekCell}>
                <Text style={styles.calWeekText}>{w}</Text>
              </View>
            ))}
          </View>

          {/* Day grid */}
          <View style={styles.calGrid}>
            {cells.map((d, idx) => {
              if (d == null) return <View key={`b-${idx}`} style={styles.calCell} />;
              const key = dayKey(year, month, d);
              const hasData = bookingsByDay.has(key);
              const isSelected = selectedDay === key;
              const isToday = key === todayKey;
              return (
                <Pressable
                  key={key}
                  style={styles.calCell}
                  onPress={() => setSelectedDay(key)}
                  accessibilityRole="button"
                  accessibilityLabel={`${d}${hasData ? `, ${bookingsByDay.get(key).length} bookings` : ', no bookings'}`}
                >
                  <View style={[styles.calDay, isToday && styles.calDayToday, isSelected && styles.calDaySelected]}>
                    <Text style={[styles.calDayText, isSelected && styles.calDayTextSelected]}>{d}</Text>
                  </View>
                  {hasData ? <View style={[styles.calDot, isSelected && styles.calDotSelected]} /> : <View style={styles.calDotSpacer} />}
                </Pressable>
              );
            })}
          </View>

          {/* Selected-day detail */}
          <View style={styles.calDetail}>
            {selectedDay ? (
              <>
                <Text style={styles.calDetailDate}>{prettyDay(selectedDay)}</Text>
                <View style={styles.calSummaryRow}>
                  <View style={styles.calSummaryPill}>
                    <Text style={styles.calSummaryValue}>{selectedList.length}</Text>
                    <Text style={styles.calSummaryLabel}>Bookings</Text>
                  </View>
                  <View style={styles.calSummaryPill}>
                    <Text style={styles.calSummaryValue}>₹{selectedRevenue.toLocaleString()}</Text>
                    <Text style={styles.calSummaryLabel}>Revenue</Text>
                  </View>
                </View>

                {selectedList.length > 0 ? (
                  <ScrollView style={styles.calList} contentContainerStyle={styles.calListContent} showsVerticalScrollIndicator={false}>
                    {selectedList.map((b) => (
                      <View key={b.id} style={styles.calItem}>
                        <View style={styles.calItemMain}>
                          <Text style={styles.calItemService} numberOfLines={1}>{b.serviceName}</Text>
                          <Text style={styles.calItemMeta} numberOfLines={1}>
                            {(b.workerName || 'Unassigned')} • {b.customerName}
                          </Text>
                        </View>
                        <View style={styles.calItemRight}>
                          <Text style={styles.calItemPrice}>₹{Number(b.totalPrice).toLocaleString()}</Text>
                          <Text style={styles.calItemStatus} numberOfLines={1}>{String(b.status).replace('-', ' ')}</Text>
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                ) : (
                  <Text style={styles.calEmpty}>No bookings on this day.</Text>
                )}
              </>
            ) : (
              <Text style={styles.calHint}>Tap a date to see that day&apos;s bookings and revenue.</Text>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* KPI card — tinted category surface + premium icon chip              */
/* ------------------------------------------------------------------ */

// Rich, high-contrast card surfaces. `dark` tones use white text; `pink` is a soft light surface
// with dark text (matching the reference's Soft Pink complaints card).
const KPI_TONES = {
  slate: { bg: '#3b4a6b', border: '#4c5d80', chip: 'rgba(255,255,255,0.18)', icon: '#ffffff', text: '#ffffff', sub: 'rgba(255,255,255,0.72)', dark: true },
  amber: { bg: '#c2740a', border: '#d98916', chip: 'rgba(255,255,255,0.20)', icon: '#ffffff', text: '#ffffff', sub: 'rgba(255,255,255,0.80)', dark: true },
  emerald: { bg: '#0f8a5f', border: '#12a06e', chip: 'rgba(255,255,255,0.20)', icon: '#ffffff', text: '#ffffff', sub: 'rgba(255,255,255,0.82)', dark: true },
  pink: { bg: '#fce7ef', border: '#f8cddc', chip: '#fbd0e0', icon: colors.danger600, text: '#9d1a4d', sub: '#b05a7a', dark: false },
};

function KpiCard({ label, value, icon: Icon, tone = 'slate', prefix = '', grouped = false, trend }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const numValue = typeof value === 'number' ? value : parseInt(value, 10) || 0;
    if (numValue === 0) {
      setDisplayValue(numValue);
      return undefined;
    }
    const duration = 1000;
    const steps = 30;
    const increment = numValue / steps;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      setDisplayValue(Math.min(Math.round(increment * step), numValue));
      if (step >= steps) clearInterval(timer);
    }, duration / steps);
    return () => clearInterval(timer);
  }, [value]);

  const tint = KPI_TONES[tone] || KPI_TONES.slate;
  const shown = grouped ? displayValue.toLocaleString() : String(displayValue);

  return (
    <View style={[styles.kpiCard, { backgroundColor: tint.bg, borderColor: tint.border }]}>
      {/* Icon badge — consistently aligned to the top-right corner. */}
      <View style={styles.kpiTop}>
        <Text style={[styles.kpiLabel, { color: tint.dark ? tint.sub : '#7a2447' }]} numberOfLines={2}>
          {label}
        </Text>
        <View style={[styles.kpiIcon, { backgroundColor: tint.chip }]}>
          <Icon size={17} color={tint.icon} strokeWidth={2.3} />
        </View>
      </View>
      <Text
        style={[styles.kpiValue, { color: tint.text }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {prefix}
        {shown}
      </Text>
      {trend ? (
        <Text style={[styles.kpiTrend, { color: tint.sub }]} numberOfLines={1}>
          {trend}
        </Text>
      ) : null}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Revenue chart — dark navy card, emerald line + gradient fill        */
/* ------------------------------------------------------------------ */

const CHART_NAVY = '#1e222b'; // sleek dark slate
const CHART_LINE = '#34d399';
const CHART_GRID = 'rgba(148, 163, 184, 0.18)';
const CHART_LABEL = '#94a3b8';

// Formats a node's date + amount for the callout tag, e.g. "Sep 9 • ₹5,482".
function calloutLabel(point) {
  return `${shortDate(point.date)} • ₹${Number(point.total).toLocaleString()}`;
}

function smoothPath(points) {
  if (points.length < 2) return '';
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const p0 = points[i - 1];
    const p1 = points[i];
    const cx = (p1.x - p0.x) / 3;
    d += ` C ${p0.x + cx} ${p0.y} ${p1.x - cx} ${p1.y} ${p1.x} ${p1.y}`;
  }
  return d;
}

function RevenueChart({ series, label }) {
  const [width, setWidth] = useState(0);
  // View-local active node for the tap-to-reveal callout (presentation only; touches no data).
  // Defaults to the peak so a callout is visible on load, matching the "active node" reference.
  const [activeDate, setActiveDate] = useState(null);
  const height = 150;
  const padTop = 20;
  const padBottom = 26;
  const padX = 10;
  const axisLeft = 22; // room for the vertical Y-axis label

  const windowTotal = series.reduce((sum, p) => sum + p.total, 0);
  const max = Math.max(...series.map((p) => p.total));
  const min = Math.min(...series.map((p) => p.total));
  const span = max - min || max || 1;
  const peak = series.reduce((a, b) => (b.total > a.total ? b : a), series[0]);

  const plotLeft = axisLeft + padX;
  const points = series.map((p, i) => {
    const usable = Math.max(width - plotLeft - padX, 1);
    const x = plotLeft + (series.length === 1 ? usable / 2 : (usable * i) / (series.length - 1));
    const norm = (p.total - min) / span;
    const y = padTop + (1 - norm) * (height - padTop - padBottom);
    return { x, y, ...p };
  });

  const line = smoothPath(points);
  const area = line
    ? `${line} L ${points[points.length - 1].x} ${height - padBottom} L ${points[0].x} ${height - padBottom} Z`
    : '';

  // The node whose callout is shown — the tapped one, else the peak by default.
  const shownPoint = points.find((p) => p.date === activeDate) || points.find((p) => p.date === peak.date);

  return (
    <View style={styles.chartCard}>
      <View style={styles.chartHead}>
        <View style={{ flex: 1 }}>
          <Text style={styles.chartTitle}>{label}</Text>
          {/* States exactly what the series is — no implied period comparison. */}
          <Text style={styles.chartSub} numberOfLines={1}>
            By booking date • last {series.length} active days
          </Text>
        </View>
        <View style={styles.chartTotalPill}>
          <Text style={styles.chartTotal}>₹{windowTotal.toLocaleString()}</Text>
        </View>
      </View>

      {/* Plot area with a vertical Y-axis label to its left. */}
      <View style={styles.chartPlotRow}>
        <View style={styles.yAxisWrap} pointerEvents="none">
          <Text style={styles.axisLabelY} numberOfLines={1}>Revenue (₹)</Text>
        </View>

        <View style={styles.chartBody} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
          {width > 0 && (
            <Svg width={width} height={height}>
              <Defs>
                {/* Smooth green gradient fill under the curve. */}
                <LinearGradient id="rev-fill" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={CHART_LINE} stopOpacity="0.42" />
                  <Stop offset="0.55" stopColor={CHART_LINE} stopOpacity="0.14" />
                  <Stop offset="1" stopColor={CHART_LINE} stopOpacity="0" />
                </LinearGradient>
              </Defs>

              {[0, 0.5, 1].map((r) => (
                <SvgLine
                  key={r}
                  x1={plotLeft}
                  x2={width - padX}
                  y1={padTop + r * (height - padTop - padBottom)}
                  y2={padTop + r * (height - padTop - padBottom)}
                  stroke={CHART_GRID}
                  strokeWidth={1}
                />
              ))}
              {area ? <Path d={area} fill="url(#rev-fill)" /> : null}
              {line ? (
                <Path
                  d={line}
                  stroke={CHART_LINE}
                  strokeWidth={2.75}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : null}
              {points.map((p) => {
                const isActive = shownPoint && p.date === shownPoint.date;
                return (
                  <Circle
                    key={p.date}
                    cx={p.x}
                    cy={p.y}
                    r={isActive ? 5 : 3.5}
                    fill={isActive ? CHART_LINE : CHART_NAVY}
                    stroke={CHART_LINE}
                    strokeWidth={2}
                  />
                );
              })}
            </Svg>
          )}

          {/* Invisible tap targets over each node to toggle its callout (no data change). */}
          {width > 0 &&
            points.map((p) => (
              <Pressable
                key={`hit-${p.date}`}
                style={[styles.nodeHit, { left: p.x - 16, top: p.y - 16 }]}
                onPress={() => setActiveDate((cur) => (cur === p.date ? null : p.date))}
                accessibilityRole="button"
                accessibilityLabel={calloutLabel(p)}
                hitSlop={4}
              />
            ))}

          {/* Active/hover callout tag — date • amount. */}
          {width > 0 && shownPoint ? (
            <View
              style={[
                styles.calloutTag,
                {
                  left: Math.min(Math.max(shownPoint.x - 52, plotLeft - 8), Math.max(width - 112, 0)),
                  top: Math.max(shownPoint.y - 34, 0),
                },
              ]}
              pointerEvents="none"
            >
              <Text style={styles.calloutText}>{calloutLabel(shownPoint)}</Text>
            </View>
          ) : null}

          <View style={[styles.chartLabels, { paddingLeft: plotLeft - padX, paddingRight: 0 }]}>
            {series.map((p) => (
              <Text key={p.date} style={styles.chartLabel} numberOfLines={1}>
                {shortDate(p.date)}
              </Text>
            ))}
          </View>
        </View>
      </View>

      {/* X-axis label. */}
      <Text style={styles.axisLabelX}>Last 7 Days</Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Quick action card — redesigned: compact vertical pastel card        */
/* ------------------------------------------------------------------ */

const ACTION_TONES = {
  lavender: { bg: '#eef2ff', border: '#e0e7ff', icon: '#ffffff', fg: colors.primary600, arrow: colors.primary600 },
  mint: { bg: '#ecfdf5', border: '#d1fae5', icon: '#ffffff', fg: colors.success600, arrow: colors.success600 },
  rose: { bg: '#fef2f2', border: '#fee2e2', icon: '#ffffff', fg: colors.danger600, arrow: colors.danger600 },
};

function QuickActionCard({ icon: Icon, tone, title, sub, badge, onPress }) {
  const tint = ACTION_TONES[tone] || ACTION_TONES.lavender;
  return (
    <PressableScale
      style={[styles.qaCard, { backgroundColor: tint.bg, borderColor: tint.border }]}
      onPress={onPress}
      accessibilityLabel={title}
    >
      <View style={styles.qaTop}>
        <View style={[styles.qaIcon, { backgroundColor: tint.icon }]}>
          <Icon size={18} color={tint.fg} strokeWidth={2.3} />
        </View>
        {badge != null && (
          <View style={styles.qaBadge}>
            <Text style={styles.qaBadgeText}>{String(badge)}</Text>
          </View>
        )}
      </View>

      <Text style={styles.qaTitle} numberOfLines={2}>
        {title}
      </Text>
      <Text style={styles.qaSub} numberOfLines={3}>
        {sub}
      </Text>

      <View style={styles.qaArrowRow}>
        <View style={[styles.qaArrow, { backgroundColor: tint.icon }]}>
          <ArrowRight size={14} color={tint.arrow} strokeWidth={2.6} />
        </View>
      </View>
    </PressableScale>
  );
}

/* ------------------------------------------------------------------ */
/* LuxuryServiceMedallion — skeuomorphic metallic disc holding the      */
/* service icon. SVG gradients give a polished-metal sheen + rim; the   */
/* carpentry variant swaps to wood-grain tones. Presentation only.      */
/* ------------------------------------------------------------------ */

const MEDALLION = 52;

function LuxuryServiceMedallion({ serviceId, Icon }) {
  const m = materialFor(serviceId);
  const S = MEDALLION;
  const c = S / 2;
  const gid = `med-${serviceId}`;
  return (
    <View style={styles.medallionWrap}>
      <Svg width={S} height={S}>
        <Defs>
          {/* Rim: bright gold/metal at top-left → deep at bottom-right (bevel light). */}
          <LinearGradient id={`${gid}-rim`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={m.rim} stopOpacity="1" />
            <Stop offset="0.5" stopColor={m.metalDark} stopOpacity="1" />
            <Stop offset="1" stopColor="#0d0f14" stopOpacity="1" />
          </LinearGradient>
          {/* Face: radial sheen — light hotspot upper-left, darker toward edge. */}
          <RadialGradient id={`${gid}-face`} cx="0.36" cy="0.30" r="0.85">
            <Stop offset="0" stopColor={m.metal} stopOpacity="1" />
            <Stop offset="0.55" stopColor={m.metal} stopOpacity="0.9" />
            <Stop offset="1" stopColor={m.metalDark} stopOpacity="1" />
          </RadialGradient>
          {/* Specular streak across the top of the disc. */}
          <LinearGradient id={`${gid}-spec`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#ffffff" stopOpacity="0.55" />
            <Stop offset="0.4" stopColor="#ffffff" stopOpacity="0.06" />
            <Stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </LinearGradient>
        </Defs>

        {/* Outer beveled rim */}
        <Circle cx={c} cy={c} r={c - 1} fill={`url(#${gid}-rim)`} />
        {/* Inset metal face */}
        <Circle cx={c} cy={c} r={c - 4.5} fill={`url(#${gid}-face)`} />

        {/* Wood grain for carpentry — a few concentric arced strokes in copper-wood tones. */}
        {m.wood ? (
          <G opacity="0.5">
            {[10, 15, 20].map((r, i) => (
              <Path
                key={r}
                d={`M ${c - r} ${c} A ${r} ${r * 0.72} 0 0 1 ${c + r} ${c}`}
                stroke={i % 2 ? '#8a5a30' : '#5f3a1c'}
                strokeWidth={1.1}
                fill="none"
              />
            ))}
          </G>
        ) : null}

        {/* Top specular highlight (glossy metal) */}
        <Circle cx={c} cy={c} r={c - 4.5} fill={`url(#${gid}-spec)`} />
      </Svg>

      {/* Icon sits above the SVG face, tinted to the material. */}
      <View style={styles.medallionIcon} pointerEvents="none">
        <Icon size={22} color={m.wood ? '#f0dcc2' : '#2b2f38'} strokeWidth={2.1} />
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* LuxuryStatusBadge — thin gold outline, blue text, no heavy fill.    */
/* Local to this section (does NOT touch the shared Badge component).  */
/* ------------------------------------------------------------------ */

function LuxuryStatusBadge({ status }) {
  return (
    <View style={styles.luxBadge}>
      <View style={styles.luxBadgeDot} />
      <Text style={styles.luxBadgeText} numberOfLines={1}>
        {String(status).replace('-', ' ')}
      </Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Recent booking card — "carved pearl" luxury redesign.               */
/* Data/fields are IDENTICAL to before (serviceName, id, worker,       */
/* customer, date, status, totalPrice); only presentation changed.     */
/* ------------------------------------------------------------------ */

function BookingCard({ booking: b }) {
  const service = SERVICE_BY_ID.get(b.serviceId);
  const Icon = serviceIcon(service?.icon);

  return (
    <View style={styles.bookingCard}>
      {/* Top chamfer highlight — a hairline of light along the upper edge. */}
      <View style={styles.cardChamfer} pointerEvents="none" />

      <LuxuryServiceMedallion serviceId={b.serviceId} Icon={Icon} />

      <View style={styles.bookingMain}>
        <Text style={styles.bookingName} numberOfLines={1}>
          {b.serviceName}
        </Text>
        <Text style={styles.bookingId} numberOfLines={1}>
          {b.id}
        </Text>
        <Text style={styles.bookingMeta} numberOfLines={1}>
          {b.workerName || 'Unassigned'} • {b.customerName}
        </Text>
        {b.date ? (
          <Text style={styles.bookingDate} numberOfLines={1}>
            {shortDate(b.date, true)}
          </Text>
        ) : null}
      </View>

      <View style={styles.bookingSide}>
        <View style={styles.bookingSideTop}>
          <LuxuryStatusBadge status={b.status} />
          <Pressable hitSlop={8} accessibilityLabel="More options" style={styles.moreBtn}>
            <MoreVertical size={16} color={LUX.faint} />
          </Pressable>
        </View>
        <Text style={styles.bookingPrice} numberOfLines={1}>
          <Text style={styles.bookingCurrency}>₹</Text>
          {Number(b.totalPrice).toLocaleString()}
        </Text>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  pageContent: { paddingBottom: spacing.space20 },
  section: { marginTop: spacing.space6 },

  /* Header */
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.space3,
  },
  headerLeft: { flex: 1, minWidth: 0 },
  greeting: {
    fontSize: fontSizes.fsSm,
    fontFamily: fontFamilies.interMedium,
    fontWeight: fontWeights.fwMedium,
    color: colors.gray500,
    marginBottom: 2,
  },
  pageTitle: {
    fontSize: fontSizes.fs3xl,
    fontFamily: fontFamilies.interExtraBold,
    fontWeight: fontWeights.fwExtrabold,
    color: colors.gray900,
    letterSpacing: -0.6,
  },
  pageSubtitle: {
    fontSize: fontSizes.fsSm,
    fontFamily: fontFamilies.interRegular,
    color: colors.gray500,
    marginTop: 3,
  },
  logoutBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.radiusFull,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceWhite,
    borderWidth: 1,
    borderColor: colors.gray200,
    ...shadows.shadowSm,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.space2 },
  profileAvatar: {
    width: 40,
    height: 40,
    borderRadius: radii.radiusFull,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary600,
    borderWidth: 2,
    borderColor: colors.surfaceWhite,
    ...shadows.shadowSm,
    shadowColor: colors.primary700,
  },
  profileAvatarText: {
    fontSize: fontSizes.fsBase,
    fontFamily: fontFamilies.interExtraBold,
    fontWeight: fontWeights.fwExtrabold,
    color: colors.white,
  },
  profileAvatarDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 11,
    height: 11,
    borderRadius: radii.radiusFull,
    backgroundColor: colors.success500,
    borderWidth: 2,
    borderColor: colors.surfaceWhite,
  },
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.space2,
    marginTop: spacing.space4,
    backgroundColor: colors.surfaceWhite,
    borderRadius: radii.radiusMd,
    borderWidth: 1,
    borderColor: colors.gray200,
    paddingVertical: 7,
    paddingHorizontal: spacing.space3,
    ...shadows.shadowSm,
  },
  datePillChevron: { marginLeft: 2 },
  datePillPressed: { backgroundColor: colors.gray50, transform: [{ scale: 0.98 }] },
  datePillIcon: {
    width: 26,
    height: 26,
    borderRadius: radii.radiusSm,
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  datePillDay: {
    fontSize: 12,
    fontFamily: fontFamilies.interSemiBold,
    fontWeight: fontWeights.fwSemibold,
    color: colors.gray900,
  },
  datePillWeekday: {
    fontSize: 10,
    fontFamily: fontFamilies.interRegular,
    color: colors.gray400,
  },

  /* KPI grid */
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.space3, marginTop: spacing.space5 },
  statCell: { width: '47.5%', flexGrow: 1 },
  kpiCard: {
    borderRadius: radii.radiusLg,
    padding: spacing.space4,
    borderWidth: 1,
    minHeight: 124,
    justifyContent: 'flex-start',
    ...shadows.shadowMd,
  },
  // Label on the left, icon badge pinned to the top-right corner.
  kpiTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.space2 },
  kpiIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.radiusMd,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiLabel: {
    flex: 1,
    fontSize: 12,
    fontFamily: fontFamilies.interSemiBold,
    fontWeight: fontWeights.fwSemibold,
    lineHeight: 16,
  },
  kpiValue: {
    fontSize: fontSizes.fs2xl,
    fontFamily: fontFamilies.interExtraBold,
    fontWeight: fontWeights.fwExtrabold,
    marginTop: spacing.space3,
    letterSpacing: -0.5,
  },
  kpiTrend: {
    fontSize: 11,
    fontFamily: fontFamilies.interMedium,
    fontWeight: fontWeights.fwMedium,
    marginTop: 4,
  },

  /* Revenue chart */
  chartCard: {
    backgroundColor: CHART_NAVY,
    borderRadius: radii.radiusXl,
    padding: spacing.space4,
    ...shadows.shadowLg,
  },
  chartHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.space3,
    marginBottom: spacing.space2,
  },
  chartTitle: {
    fontSize: fontSizes.fsLg,
    fontFamily: fontFamilies.interBold,
    fontWeight: fontWeights.fwBold,
    color: colors.white,
  },
  chartSub: {
    fontSize: 11,
    fontFamily: fontFamilies.interRegular,
    color: CHART_LABEL,
    marginTop: 3,
  },
  chartTotalPill: {
    backgroundColor: 'rgba(52, 211, 153, 0.16)',
    borderRadius: radii.radiusFull,
    paddingVertical: 6,
    paddingHorizontal: spacing.space3,
  },
  chartTotal: {
    fontSize: fontSizes.fsBase,
    fontFamily: fontFamilies.interExtraBold,
    fontWeight: fontWeights.fwExtrabold,
    color: CHART_LINE,
  },
  chartPlotRow: { flexDirection: 'row', alignItems: 'stretch', marginTop: spacing.space2 },
  // Vertical Y-axis label column.
  yAxisWrap: { width: 16, alignItems: 'center', justifyContent: 'center' },
  axisLabelY: {
    // Rotated so it reads bottom-to-top alongside the plot.
    transform: [{ rotate: '-90deg' }],
    width: 120,
    textAlign: 'center',
    fontSize: 10,
    fontFamily: fontFamilies.interSemiBold,
    fontWeight: fontWeights.fwSemibold,
    color: CHART_LABEL,
  },
  axisLabelX: {
    textAlign: 'center',
    fontSize: 10,
    fontFamily: fontFamilies.interSemiBold,
    fontWeight: fontWeights.fwSemibold,
    color: CHART_LABEL,
    marginTop: 6,
  },
  chartBody: { flex: 1, position: 'relative' },
  // Transparent tap target sitting over each data node.
  nodeHit: { position: 'absolute', width: 32, height: 32 },
  // Active/hover callout tag: "Sep 9 • ₹5,482".
  calloutTag: {
    position: 'absolute',
    minWidth: 104,
    alignItems: 'center',
    backgroundColor: 'rgba(15,18,24,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.55)',
    borderRadius: radii.radiusMd,
    paddingVertical: 4,
    paddingHorizontal: 8,
    ...shadows.shadowMd,
  },
  calloutText: {
    fontSize: 11,
    fontFamily: fontFamilies.interBold,
    fontWeight: fontWeights.fwBold,
    color: colors.white,
  },
  chartLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  chartLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 10,
    fontFamily: fontFamilies.interRegular,
    color: CHART_LABEL,
  },

  /* Section header (Quick Actions / Recent Bookings) */
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.space3,
  },
  sectionTitle: {
    fontSize: fontSizes.fsLg,
    fontFamily: fontFamilies.interBold,
    fontWeight: fontWeights.fwBold,
    color: colors.gray900,
    letterSpacing: -0.2,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.primary50,
    borderRadius: radii.radiusFull,
    paddingVertical: 5,
    paddingHorizontal: spacing.space3,
  },
  seeAllText: {
    fontSize: fontSizes.fsXs,
    fontFamily: fontFamilies.interSemiBold,
    fontWeight: fontWeights.fwSemibold,
    color: colors.primary600,
  },

  /* Quick actions — 3-column pastel cards */
  actionsGrid: { flexDirection: 'row', gap: spacing.space3 },
  qaCard: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
    borderRadius: radii.radiusLg,
    borderWidth: 1,
    padding: spacing.space3,
    minHeight: 158,
    ...shadows.shadowSm,
  },
  qaTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  qaIcon: {
    width: 38,
    height: 38,
    borderRadius: radii.radiusMd,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.shadowSm,
  },
  qaBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: radii.radiusFull,
    backgroundColor: colors.danger600,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  qaBadgeText: {
    fontSize: 11,
    fontFamily: fontFamilies.interBold,
    fontWeight: fontWeights.fwBold,
    color: colors.white,
  },
  qaTitle: {
    fontSize: fontSizes.fsSm,
    fontFamily: fontFamilies.interBold,
    fontWeight: fontWeights.fwBold,
    color: colors.gray900,
    marginTop: spacing.space3,
    lineHeight: 17,
  },
  qaSub: {
    fontSize: 11,
    fontFamily: fontFamilies.interRegular,
    color: colors.gray500,
    marginTop: 3,
    lineHeight: 14,
    flex: 1,
  },
  qaArrowRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: spacing.space2 },
  qaArrow: {
    width: 26,
    height: 26,
    borderRadius: radii.radiusFull,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.shadowSm,
  },

  /* ---------------- Recent bookings — "carved pearl" luxury ---------------- */
  bookingsList: { gap: spacing.space4 },
  bookingCard: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space3,
    // Deep obsidian body with a top→bottom carve (lighter top edge, darker base).
    backgroundColor: LUX.cardBottom,
    borderRadius: radii.radiusXl,
    borderWidth: 1,
    borderColor: LUX.hairline, // faint gold hairline
    borderTopColor: LUX.rimLight, // chamfer highlight up top
    borderBottomColor: LUX.rimDark, // carved shadow at the base
    paddingVertical: spacing.space4,
    paddingHorizontal: spacing.space4,
    overflow: 'hidden',
    // Physical depth.
    ...shadows.shadowLg,
    shadowColor: '#000000',
    shadowOpacity: 0.45,
  },
  // Hairline of light tracing the upper edge — reads as a chamfered/carved bevel.
  cardChamfer: {
    position: 'absolute',
    top: 0,
    left: spacing.space5,
    right: spacing.space5,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },

  /* Metallic medallion */
  medallionWrap: {
    position: 'relative',
    width: MEDALLION,
    height: MEDALLION,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medallionIcon: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: MEDALLION,
    height: MEDALLION,
    alignItems: 'center',
    justifyContent: 'center',
  },

  bookingMain: { flex: 1, minWidth: 0 },
  bookingName: {
    // High-contrast modern serif for the service title.
    fontSize: fontSizes.fsLg,
    fontFamily: SERIF,
    fontWeight: '700',
    color: LUX.title,
    letterSpacing: 0.2,
  },
  bookingId: {
    fontSize: 10,
    color: LUX.faint,
    fontFamily: 'monospace',
    letterSpacing: 0.4,
    marginTop: 2,
  },
  bookingMeta: {
    // Crisp, light-weight sans-serif for secondary details.
    fontSize: 11,
    color: LUX.sub,
    fontFamily: fontFamilies.interRegular,
    fontWeight: fontWeights.fwNormal,
    marginTop: 3,
  },
  bookingDate: {
    fontSize: 10,
    color: LUX.faint,
    fontFamily: fontFamilies.interRegular,
    marginTop: 2,
  },
  bookingSide: { alignItems: 'flex-end', justifyContent: 'space-between', alignSelf: 'stretch', maxWidth: '38%' },
  bookingSideTop: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  moreBtn: { padding: 2 },
  bookingPrice: {
    // Gold price tag.
    fontSize: fontSizes.fsLg,
    fontFamily: fontFamilies.interExtraBold,
    fontWeight: fontWeights.fwExtrabold,
    color: LUX.gold,
    letterSpacing: 0.2,
    marginTop: spacing.space2,
  },
  bookingCurrency: {
    fontSize: fontSizes.fsBase,
    color: LUX.goldDeep,
    fontFamily: fontFamilies.interBold,
    fontWeight: fontWeights.fwBold,
  },

  /* Luxury status badge — thin gold outline, blue text, no fill */
  luxBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(201,162,75,0.7)', // thin gold outline
    borderRadius: radii.radiusFull,
    paddingVertical: 3,
    paddingHorizontal: 9,
  },
  luxBadgeDot: {
    width: 5,
    height: 5,
    borderRadius: radii.radiusFull,
    backgroundColor: LUX.badgeText,
  },
  luxBadgeText: {
    fontSize: fontSizes.fsXs,
    color: LUX.badgeText, // blue text
    fontFamily: fontFamilies.interSemiBold,
    fontWeight: fontWeights.fwSemibold,
    letterSpacing: 0.3,
    textTransform: 'capitalize',
  },

  /* ---------------- Interactive calendar sheet ---------------- */
  calBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  calBackdropTap: { flex: 1 },
  calSheet: {
    backgroundColor: colors.surfaceWhite,
    borderTopLeftRadius: radii.radius2xl,
    borderTopRightRadius: radii.radius2xl,
    paddingHorizontal: spacing.space4,
    paddingTop: spacing.space3,
    paddingBottom: spacing.space6,
    maxHeight: '88%',
  },
  calSheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.space2 },
  calSheetTitle: { fontSize: fontSizes.fsLg, fontFamily: fontFamilies.interExtraBold, fontWeight: fontWeights.fwExtrabold, color: colors.gray900 },
  calCloseBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: radii.radiusFull, backgroundColor: colors.gray100 },

  calMonthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.space2, marginBottom: spacing.space2 },
  calNavBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: radii.radiusMd, backgroundColor: colors.primary50 },
  calMonthLabel: { fontSize: fontSizes.fsBase, fontFamily: fontFamilies.interBold, fontWeight: fontWeights.fwBold, color: colors.gray900 },

  calWeekRow: { flexDirection: 'row', marginTop: spacing.space1 },
  calWeekCell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 4 },
  calWeekText: { fontSize: 11, fontFamily: fontFamilies.interSemiBold, fontWeight: fontWeights.fwSemibold, color: colors.gray400 },

  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calCell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 4 },
  calDay: { width: 34, height: 34, borderRadius: radii.radiusFull, alignItems: 'center', justifyContent: 'center' },
  calDayToday: { borderWidth: 1.5, borderColor: colors.primary300 },
  calDaySelected: { backgroundColor: colors.primary600 },
  calDayText: { fontSize: fontSizes.fsSm, fontFamily: fontFamilies.interSemiBold, fontWeight: fontWeights.fwSemibold, color: colors.gray800 },
  calDayTextSelected: { color: colors.white, fontFamily: fontFamilies.interExtraBold, fontWeight: fontWeights.fwExtrabold },
  calDot: { width: 5, height: 5, borderRadius: radii.radiusFull, backgroundColor: colors.primary500, marginTop: 3 },
  calDotSelected: { backgroundColor: colors.primary600 },
  calDotSpacer: { width: 5, height: 5, marginTop: 3 },

  calDetail: { marginTop: spacing.space4, borderTopWidth: 1, borderTopColor: colors.gray100, paddingTop: spacing.space4 },
  calDetailDate: { fontSize: fontSizes.fsBase, fontFamily: fontFamilies.interBold, fontWeight: fontWeights.fwBold, color: colors.gray900 },
  calSummaryRow: { flexDirection: 'row', gap: spacing.space3, marginTop: spacing.space3 },
  calSummaryPill: {
    flex: 1, borderRadius: radii.radiusLg, backgroundColor: colors.primary50,
    borderWidth: 1, borderColor: colors.primary100, paddingVertical: spacing.space3, paddingHorizontal: spacing.space3,
  },
  calSummaryValue: { fontSize: fontSizes.fsLg, fontFamily: fontFamilies.interExtraBold, fontWeight: fontWeights.fwExtrabold, color: colors.primary700 },
  calSummaryLabel: { fontSize: fontSizes.fsXs, fontFamily: fontFamilies.interMedium, fontWeight: fontWeights.fwMedium, color: colors.gray500, marginTop: 1 },

  calList: { marginTop: spacing.space3, maxHeight: 200 },
  calListContent: { gap: spacing.space2 },
  calItem: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.space3,
    backgroundColor: colors.gray50, borderRadius: radii.radiusMd,
    borderWidth: 1, borderColor: colors.gray100, padding: spacing.space3,
  },
  calItemMain: { flex: 1, minWidth: 0 },
  calItemService: { fontSize: fontSizes.fsSm, fontFamily: fontFamilies.interBold, fontWeight: fontWeights.fwBold, color: colors.gray900 },
  calItemMeta: { fontSize: 11, fontFamily: fontFamilies.interRegular, color: colors.gray500, marginTop: 2 },
  calItemRight: { alignItems: 'flex-end' },
  calItemPrice: { fontSize: fontSizes.fsSm, fontFamily: fontFamilies.interExtraBold, fontWeight: fontWeights.fwExtrabold, color: colors.gray900 },
  calItemStatus: { fontSize: 10, fontFamily: fontFamilies.interMedium, color: colors.primary600, marginTop: 1, textTransform: 'capitalize' },

  calEmpty: { fontSize: fontSizes.fsSm, fontFamily: fontFamilies.interRegular, color: colors.gray500, marginTop: spacing.space3 },
  calHint: { fontSize: fontSizes.fsSm, fontFamily: fontFamilies.interRegular, color: colors.gray500, textAlign: 'center', paddingVertical: spacing.space4 },
});
