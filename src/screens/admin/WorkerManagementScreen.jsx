import { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, Pressable, Animated, StyleSheet } from 'react-native';
import {
  RefreshCw,
  AlertTriangle,
  Lock,
  SlidersHorizontal,
  ChevronDown,
  Building2,
  Briefcase,
  Coins,
  ArrowRight,
  Wrench,
  MoreVertical,
  Users as UsersIcon,
} from 'lucide-react-native';
import { mockWorkers } from '@data/mockWorkers';
import { getWorkerList } from '@services/supabase';
import { useLanguage } from '@context/LanguageContext';
import { ScreenContainer } from '@components/app';
import { SearchBar } from '@components/app';
import Badge from '@components/ui/Badge';
import StarRating from '@components/ui/StarRating';
import Modal from '@components/ui/Modal';
import { colors, spacing, radii, shadows, fontSizes, fontWeights, fontFamilies } from '@theme';

/**
 * WorkerManagementScreen — ported from web pages/admin/WorkerManagement.jsx, the app's ONLY
 * real-data CRUD surface.
 *
 * PHASE 11 REDESIGN — PRESENTATION ONLY. The entire data path is preserved VERBATIM from the
 * previous version:
 *
 *  - getWorkerList() Supabase fetch on mount, loading state, non-breaking error banner + Retry,
 *    demo workers never wiped on error.
 *  - normaliseMock / normaliseRealWorker (5 confirmed-safe columns only) / mergeWorkers dedup.
 *  - Search across name/phone/skills/cooperative (SAME predicate, SAME SearchBar + `search`).
 *  - Ban/unban/remove for source='demo' only (local state); source='registered' → disabled
 *    actions + Lock read-only notice.
 *  - statusVariant/statusLabel: Banned / Registered / Online / Offline.
 *
 * The status-tab filter (All / Online / Offline) and the Sort control are NEW but 100%
 * FRONTEND-ONLY view state layered on top of the already-fetched `workers` array — they neither
 * call the backend nor alter what's loaded. Nothing is fabricated: Online = available === true,
 * Offline = available === false (registered workers have available === null and are only counted
 * under "All", never invented into a status they don't have). The counts shown are derived live
 * from the same data.
 *
 * The reference mock shows a per-worker "(N reviews)" figure — no review-count field exists in
 * any data source, so it is NOT rendered (that would be fabricated data). Rating value/stars are
 * shown only when a real rating exists.
 */

function normaliseMock(w) {
  return {
    id: w.id, name: w.name || '—', phone: w.phone || '—', cooperative: w.cooperative || '—', joinDate: w.joinDate || '—',
    skills: Array.isArray(w.skills) ? w.skills : [], certificates: Array.isArray(w.certificates) ? w.certificates : [],
    totalJobs: w.totalJobs ?? 0, earnings: w.earnings ?? 0, rating: w.rating ?? null, fairnessPosition: w.fairnessPosition ?? null,
    available: w.available ?? false, verified: w.verified ?? false, banned: w.banned ?? false, source: 'demo',
  };
}

function normaliseRealWorker(p) {
  let joinDate = '—';
  if (p.created_at) {
    try { joinDate = new Date(p.created_at).toISOString().split('T')[0]; } catch (_) { /* keep dash */ }
  }
  return {
    id: p.id, name: p.full_name || '(Name not set)', phone: p.phone || '—',
    cooperative: null, city: null, state: null, joinDate,
    skills: [], certificates: [], totalJobs: 0, earnings: 0, rating: null, fairnessPosition: null,
    available: null, verified: false, banned: false, source: 'registered',
  };
}

function mergeWorkers(demoList, realList) {
  const merged = [...demoList];
  const existingIds = new Set(merged.map((w) => w.id));
  for (const w of realList) {
    if (!existingIds.has(w.id)) {
      merged.push(w);
      existingIds.add(w.id);
    }
  }
  return merged;
}

export default function WorkerManagementScreen() {
  const { t } = useLanguage();
  const [workers, setWorkers] = useState(() => mockWorkers.map(normaliseMock));
  const [fetchError, setFetchError] = useState(null);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedWorker, setSelectedWorker] = useState(null);
  // Frontend-only view state (does not touch the backend or the loaded data).
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortDesc, setSortDesc] = useState(true);

  const loadRealWorkers = async () => {
    setFetchLoading(true);
    setFetchError(null);
    const { data, error } = await getWorkerList();
    setFetchLoading(false);
    if (error) {
      setFetchError('Could not load registered workers: ' + (error.message || 'Unknown error'));
      return;
    }
    const real = (data || []).map(normaliseRealWorker);
    setWorkers((prev) => mergeWorkers(prev, real));
  };

  useEffect(() => {
    loadRealWorkers();
  }, []);

  // SAME search predicate as before.
  const searched = workers.filter((w) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      (w.name || '').toLowerCase().includes(q) ||
      (w.phone || '').toLowerCase().includes(q) ||
      (Array.isArray(w.skills) && w.skills.some((s) => s.toLowerCase().includes(q))) ||
      (w.cooperative || '').toLowerCase().includes(q)
    );
  });

  // Live status counts derived from loaded data (no fabrication).
  const onlineCount = workers.filter((w) => w.available === true).length;
  const offlineCount = workers.filter((w) => w.available === false).length;

  const filtered = useMemo(() => {
    let list = searched;
    if (statusFilter === 'online') list = list.filter((w) => w.available === true);
    else if (statusFilter === 'offline') list = list.filter((w) => w.available === false);
    // Client-side sort by rating (nulls last), then name — pure view ordering.
    const sorted = [...list].sort((a, b) => {
      const ra = a.rating ?? -1;
      const rb = b.rating ?? -1;
      if (ra !== rb) return sortDesc ? rb - ra : ra - rb;
      return (a.name || '').localeCompare(b.name || '');
    });
    return sorted;
  }, [searched, statusFilter, sortDesc]);

  const toggleBanStatus = (id) => {
    setWorkers((prev) => prev.map((w) => (w.id === id ? { ...w, banned: !w.banned, available: w.banned ? w.available : false } : w)));
    if (selectedWorker?.id === id) setSelectedWorker((s) => ({ ...s, banned: !s.banned }));
  };
  const removeWorker = (id) => {
    setWorkers((prev) => prev.filter((w) => w.id !== id));
    setSelectedWorker(null);
  };

  const demoCount = workers.filter((w) => w.source === 'demo').length;
  const registeredCount = workers.filter((w) => w.source === 'registered').length;

  const statusVariant = (w) => (w.banned ? 'cancelled' : w.source === 'registered' ? 'assigned' : w.available ? 'completed' : 'default');
  const statusLabel = (w) => (w.banned ? 'Banned' : w.source === 'registered' ? 'Registered' : w.available ? 'Online' : 'Offline');
  const earningsDisplay = (e) => (e ?? 0).toLocaleString();

  const enter = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(enter, { toValue: 1, duration: 380, useNativeDriver: true }).start();
  }, [enter]);

  return (
    <ScreenContainer contentStyle={styles.pageContent}>
      {/* ---------------- Header ---------------- */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.h1}>
            {t('workers')} <Text style={styles.h1Accent}>Management</Text>
          </Text>
          <Text style={styles.countText} numberOfLines={1}>
            {workers.length} total · {demoCount} demo
            {registeredCount > 0 ? ` · ${registeredCount} registered` : ''}
          </Text>
          <Text style={styles.tagline}>Skilled hands. Stronger communities.</Text>
        </View>
        <View style={styles.headerBadge}>
          <UsersIcon size={26} color={colors.primary600} strokeWidth={2.2} />
        </View>
      </View>

      {fetchLoading && (
        <View style={styles.loadingRow}>
          <RefreshCw size={13} color={colors.gray500} />
          <Text style={styles.loadingText}>Loading…</Text>
        </View>
      )}

      {fetchError && (
        <View style={styles.errorBanner}>
          <AlertTriangle size={16} color={colors.warning800} />
          <View style={{ flex: 1 }}>
            <Text style={styles.errorTitle}>Could not fetch registered workers.</Text>
            <Text style={styles.errorText}>Demo workers are still shown. {fetchError}</Text>
            <Pressable onPress={loadRealWorkers}><Text style={styles.retryText}>Retry</Text></Pressable>
          </View>
        </View>
      )}

      {/* ---------------- Search + filter button ---------------- */}
      <View style={styles.searchRow}>
        <View style={{ flex: 1 }}>
          <SearchBar placeholder="Search name, skill, phone…" value={search} onChangeText={setSearch} />
        </View>
        <Pressable
          style={({ pressed }) => [styles.filterBtn, pressed && styles.filterBtnPressed]}
          onPress={() => setSortDesc((s) => !s)}
          accessibilityRole="button"
          accessibilityLabel="Sort workers by rating"
        >
          <SlidersHorizontal size={18} color={colors.primary600} strokeWidth={2.2} />
        </Pressable>
      </View>

      {/* ---------------- Status tabs + Sort ---------------- */}
      <View style={styles.tabsRow}>
        <FilterTab
          label={`All Workers (${workers.length})`}
          active={statusFilter === 'all'}
          onPress={() => setStatusFilter('all')}
        />
        <FilterTab
          label={`Online (${onlineCount})`}
          active={statusFilter === 'online'}
          onPress={() => setStatusFilter('online')}
          dotColor={colors.success500}
        />
        <FilterTab
          label={`Offline (${offlineCount})`}
          active={statusFilter === 'offline'}
          onPress={() => setStatusFilter('offline')}
          dotColor={colors.gray400}
        />
        <Pressable
          style={styles.sortTab}
          onPress={() => setSortDesc((s) => !s)}
          accessibilityRole="button"
          accessibilityLabel="Toggle sort order"
        >
          <Text style={styles.sortText}>Sort</Text>
          <ChevronDown
            size={14}
            color={colors.gray600}
            style={{ transform: [{ rotate: sortDesc ? '0deg' : '180deg' }] }}
          />
        </Pressable>
      </View>

      {/* ---------------- Worker cards ---------------- */}
      <Animated.View style={[styles.list, { opacity: enter }]}>
        {filtered.map((worker) => (
          <WorkerCard
            key={worker.id}
            worker={worker}
            statusVariant={statusVariant}
            statusLabel={statusLabel}
            earningsDisplay={earningsDisplay}
            onOpen={() => setSelectedWorker(worker)}
          />
        ))}
        {filtered.length === 0 && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No workers match your search or filter.</Text>
          </View>
        )}
      </Animated.View>

      {/* Detail modal — unchanged behaviour */}
      <Modal isOpen={!!selectedWorker} onClose={() => setSelectedWorker(null)} title="Worker Details">
        {selectedWorker && (
          <View>
            {selectedWorker.source === 'registered' && (
              <View style={styles.readOnlyNotice}>
                <Lock size={15} color={colors.primary700} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.readOnlyTitle}>Registered worker — read only</Text>
                  <Text style={styles.readOnlyText}>
                    Ban / Remove will be available after admin persistence is implemented. Skills and earnings populate once the worker completes onboarding.
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.modalHero}>
              <View style={[styles.modalAvatar, { backgroundColor: selectedWorker.source === 'registered' ? colors.primary600 : selectedWorker.banned ? colors.danger500 : colors.primary500 }]}>
                <Text style={styles.modalAvatarText}>{(selectedWorker.name || '?')[0].toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalName}>{selectedWorker.name}</Text>
                <View style={styles.modalBadges}>
                  <Badge variant={statusVariant(selectedWorker)}>{statusLabel(selectedWorker)}</Badge>
                  {selectedWorker.source === 'registered' && <Badge variant="default" size="sm">Supabase</Badge>}
                </View>
              </View>
            </View>

            <View style={styles.modalDetailGrid}>
              <Detail label="Phone" value={selectedWorker.phone || '—'} />
              <Detail label="Cooperative" value={selectedWorker.cooperative || '—'} />
              <Detail label="Joined" value={selectedWorker.joinDate} />
              <Detail label="Jobs Done" value={String(selectedWorker.totalJobs)} />
              <Detail label="Earnings" value={`₹${earningsDisplay(selectedWorker.earnings)}`} />
              <Detail label="Rating" value={selectedWorker.rating != null ? `${selectedWorker.rating.toFixed(1)} ⭐` : '—'} />
            </View>

            <View style={styles.modalActions}>
              {selectedWorker.source === 'demo' ? (
                <>
                  <Pressable
                    style={[styles.actionBtn, selectedWorker.banned ? styles.successBtn : styles.warnBtn]}
                    onPress={() => toggleBanStatus(selectedWorker.id)}
                  >
                    <Text style={styles.actionBtnText}>{selectedWorker.banned ? t('unban_worker') : t('ban_worker')}</Text>
                  </Pressable>
                  <Pressable style={[styles.actionBtn, styles.dangerBtn]} onPress={() => removeWorker(selectedWorker.id)}>
                    <Text style={styles.actionBtnText}>{t('remove_worker')}</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <View style={[styles.actionBtn, styles.disabledBtn]}><Text style={styles.disabledText}>{t('ban_worker')}</Text></View>
                  <View style={[styles.actionBtn, styles.disabledBtn]}><Text style={styles.disabledText}>{t('remove_worker')}</Text></View>
                </>
              )}
            </View>
          </View>
        )}
      </Modal>
    </ScreenContainer>
  );
}

/* ------------------------------------------------------------------ */
/* Filter tab                                                          */
/* ------------------------------------------------------------------ */

function FilterTab({ label, active, onPress, dotColor }) {
  return (
    <Pressable
      style={[styles.tab, active ? styles.tabActive : styles.tabInactive]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
    >
      {dotColor ? <View style={[styles.tabDot, { backgroundColor: dotColor }]} /> : null}
      <Text style={[styles.tabText, active ? styles.tabTextActive : styles.tabTextInactive]}>{label}</Text>
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/* Worker card                                                         */
/* ------------------------------------------------------------------ */

function WorkerCard({ worker, statusVariant, statusLabel, earningsDisplay, onOpen }) {
  const scale = useRef(new Animated.Value(1)).current;
  const to = (v) => Animated.spring(scale, { toValue: v, useNativeDriver: true, friction: 7, tension: 180 }).start();

  const online = worker.available === true;
  const isRegistered = worker.source === 'registered';
  const accentColor = worker.banned
    ? colors.danger500
    : isRegistered
      ? colors.primary500
      : online
        ? colors.success500
        : colors.gray300;
  const avatarBg = isRegistered ? colors.primary600 : online ? colors.success600 : colors.gray400;

  return (
    <Pressable onPress={onOpen} onPressIn={() => to(0.98)} onPressOut={() => to(1)} accessibilityLabel={`View ${worker.name}`}>
      <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
        <View style={[styles.cardAccent, { backgroundColor: accentColor }]} />

        {/* Identity + status */}
        <View style={styles.cardHeader}>
          <View style={styles.avatarWrap}>
            <View style={[styles.avatar, { backgroundColor: avatarBg }]}>
              <Text style={styles.avatarText}>{(worker.name || '?')[0].toUpperCase()}</Text>
            </View>
            {!isRegistered && (
              <View style={[styles.avatarDot, { backgroundColor: online ? colors.success500 : colors.gray400 }]} />
            )}
          </View>

          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.workerName} numberOfLines={1}>
              {worker.name}{worker.banned ? ' (Banned)' : ''}
            </Text>
            {worker.rating != null ? (
              <StarRating rating={worker.rating} size={13} />
            ) : (
              <Text style={styles.notRated}>Not rated yet</Text>
            )}
          </View>

          <View style={styles.headerRight}>
            <StatusPill variant={statusVariant(worker)} label={statusLabel(worker)} />
            <MoreVertical size={16} color={colors.gray300} />
          </View>
        </View>

        {/* Info row */}
        <View style={styles.infoRow}>
          <InfoCol icon={Building2} label="Cooperative" value={worker.cooperative || '—'} />
          <View style={styles.infoSep} />
          <InfoCol icon={Briefcase} label="Jobs Done" value={String(worker.totalJobs)} />
          <View style={styles.infoSep} />
          <InfoCol icon={Coins} label="Earnings" value={`₹${earningsDisplay(worker.earnings)}`} accent />
        </View>

        {/* Skills */}
        {worker.skills.length > 0 ? (
          <View style={styles.skillRow}>
            {worker.skills.map((skill) => (
              <View key={skill} style={styles.skillPill}>
                <Wrench size={11} color={colors.primary600} strokeWidth={2.4} />
                <Text style={styles.skillText}>{skill}</Text>
              </View>
            ))}
          </View>
        ) : isRegistered ? (
          <Text style={styles.skillsPending}>Skills pending setup</Text>
        ) : null}

        {/* Profile action — same behaviour as tapping the card (opens the detail modal) */}
        <View style={styles.cardFooter}>
          <Pressable style={styles.viewProfileBtn} onPress={onOpen} accessibilityLabel={`View profile of ${worker.name}`}>
            <Text style={styles.viewProfileText}>View Profile</Text>
            <ArrowRight size={13} color={colors.success700} strokeWidth={2.6} />
          </Pressable>
        </View>
      </Animated.View>
    </Pressable>
  );
}

function StatusPill({ variant, label }) {
  const map = {
    completed: { bg: colors.success50, fg: colors.success700, dot: colors.success500 }, // Online
    default: { bg: colors.gray100, fg: colors.gray600, dot: colors.gray400 }, // Offline
    assigned: { bg: colors.primary50, fg: colors.primary700, dot: colors.primary500 }, // Registered
    cancelled: { bg: colors.danger50, fg: colors.danger700, dot: colors.danger500 }, // Banned
  };
  const c = map[variant] || map.default;
  return (
    <View style={[styles.statusPill, { backgroundColor: c.bg }]}>
      <View style={[styles.statusPillDot, { backgroundColor: c.dot }]} />
      <Text style={[styles.statusPillText, { color: c.fg }]}>{label}</Text>
    </View>
  );
}

function InfoCol({ icon: Icon, label, value, accent }) {
  return (
    <View style={styles.infoCol}>
      <View style={styles.infoIcon}>
        <Icon size={14} color={colors.primary600} strokeWidth={2.2} />
      </View>
      <Text style={styles.infoLabel} numberOfLines={1}>{label}</Text>
      <Text style={[styles.infoValue, accent && styles.infoValueAccent]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function Detail({ label, value, accent }) {
  return (
    <View style={styles.detailItem}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, accent && styles.detailAccent]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pageContent: { paddingBottom: spacing.space20 },

  /* Header */
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.space3 },
  h1: { fontSize: fontSizes.fs2xl, fontWeight: fontWeights.fwExtrabold, fontFamily: fontFamilies.interExtraBold, color: colors.gray900, letterSpacing: -0.4 },
  h1Accent: { color: colors.primary600 },
  countText: { fontSize: fontSizes.fsSm, color: colors.gray500, fontFamily: fontFamilies.interMedium, marginTop: 3 },
  tagline: { fontSize: fontSizes.fsXs, color: colors.gray400, fontFamily: fontFamilies.interRegular, marginTop: 2 },
  headerBadge: {
    width: 52, height: 52, borderRadius: radii.radiusLg, backgroundColor: colors.primary50,
    borderWidth: 1, borderColor: colors.primary100, alignItems: 'center', justifyContent: 'center',
  },

  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: spacing.space2 },
  loadingText: { fontSize: fontSizes.fsXs, color: colors.gray500, fontFamily: fontFamilies.interRegular },
  errorBanner: { flexDirection: 'row', gap: spacing.space2, backgroundColor: colors.warning50, borderWidth: 1, borderColor: colors.warning200, borderRadius: radii.radiusMd, padding: spacing.space3, marginTop: spacing.space3 },
  errorTitle: { fontSize: fontSizes.fsSm, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.warning800 },
  errorText: { fontSize: fontSizes.fsXs, color: colors.warning800, fontFamily: fontFamilies.interRegular, marginTop: 2 },
  retryText: { fontSize: fontSizes.fsSm, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.warning800, textDecorationLine: 'underline', marginTop: 4 },

  /* Search + filter */
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.space2, marginTop: spacing.space4 },
  filterBtn: {
    width: 48, height: 48, borderRadius: radii.radiusLg, backgroundColor: colors.surfaceWhite,
    borderWidth: 1, borderColor: colors.gray200, alignItems: 'center', justifyContent: 'center', ...shadows.shadowSm,
  },
  filterBtnPressed: { backgroundColor: colors.primary50 },

  /* Tabs */
  tabsRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.space2, marginTop: spacing.space3 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: radii.radiusFull, paddingVertical: 7, paddingHorizontal: spacing.space3 },
  tabActive: { backgroundColor: colors.primary600 },
  tabInactive: { backgroundColor: colors.surfaceWhite, borderWidth: 1, borderColor: colors.gray200 },
  tabDot: { width: 7, height: 7, borderRadius: 4 },
  tabText: { fontSize: fontSizes.fsXs, fontFamily: fontFamilies.interSemiBold, fontWeight: fontWeights.fwSemibold },
  tabTextActive: { color: colors.white },
  tabTextInactive: { color: colors.gray600 },
  sortTab: {
    flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: 'auto',
    backgroundColor: colors.surfaceWhite, borderWidth: 1, borderColor: colors.gray200,
    borderRadius: radii.radiusFull, paddingVertical: 7, paddingHorizontal: spacing.space3,
  },
  sortText: { fontSize: fontSizes.fsXs, fontFamily: fontFamilies.interSemiBold, fontWeight: fontWeights.fwSemibold, color: colors.gray600 },

  /* Cards */
  list: { gap: spacing.space4, marginTop: spacing.space4 },
  card: {
    backgroundColor: colors.surfaceWhite, borderRadius: radii.radiusXl, padding: spacing.space4,
    borderWidth: 1, borderColor: colors.gray100, overflow: 'hidden', ...shadows.shadowSm,
  },
  cardAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.space3 },
  avatarWrap: { width: 52, height: 52 },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: fontSizes.fsLg, fontWeight: fontWeights.fwExtrabold, fontFamily: fontFamilies.interExtraBold, color: colors.white },
  avatarDot: {
    position: 'absolute', right: -1, bottom: -1, width: 15, height: 15, borderRadius: 8,
    borderWidth: 2.5, borderColor: colors.surfaceWhite,
  },
  workerName: { fontSize: fontSizes.fsBase, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.gray900 },
  notRated: { fontSize: fontSizes.fsXs, color: colors.gray400, fontFamily: fontFamilies.interRegular, marginTop: 2 },
  headerRight: { alignItems: 'flex-end', gap: 6 },

  /* Status pill */
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: radii.radiusFull, paddingVertical: 4, paddingHorizontal: 9 },
  statusPillDot: { width: 6, height: 6, borderRadius: 3 },
  statusPillText: { fontSize: 11, fontFamily: fontFamilies.interSemiBold, fontWeight: fontWeights.fwSemibold },

  /* Info row */
  infoRow: {
    flexDirection: 'row', alignItems: 'flex-start', marginTop: spacing.space4,
    backgroundColor: colors.gray50, borderRadius: radii.radiusLg, paddingVertical: spacing.space3, paddingHorizontal: spacing.space2,
  },
  infoCol: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  infoSep: { width: 1, alignSelf: 'stretch', backgroundColor: colors.gray200, marginVertical: 2 },
  infoIcon: { width: 28, height: 28, borderRadius: radii.radiusFull, backgroundColor: colors.primary50, alignItems: 'center', justifyContent: 'center', marginBottom: 5 },
  infoLabel: { fontSize: 10, color: colors.gray400, fontFamily: fontFamilies.interMedium, textAlign: 'center' },
  infoValue: { fontSize: fontSizes.fsSm, color: colors.gray900, fontFamily: fontFamilies.interBold, fontWeight: fontWeights.fwBold, marginTop: 1, textAlign: 'center' },
  infoValueAccent: { color: colors.success600 },

  /* Skills */
  skillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.space2, marginTop: spacing.space3 },
  skillPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary50, borderRadius: radii.radiusFull, paddingVertical: 4, paddingHorizontal: 10 },
  skillText: { fontSize: 11, color: colors.primary700, fontFamily: fontFamilies.interSemiBold, fontWeight: fontWeights.fwSemibold },
  skillsPending: { fontSize: fontSizes.fsXs, color: colors.gray400, fontFamily: fontFamilies.interRegular, marginTop: spacing.space3 },

  /* Footer / view profile */
  cardFooter: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: spacing.space4 },
  viewProfileBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.success50, borderRadius: radii.radiusFull, paddingVertical: 8, paddingHorizontal: spacing.space4 },
  viewProfileText: { fontSize: fontSizes.fsSm, color: colors.success700, fontFamily: fontFamilies.interBold, fontWeight: fontWeights.fwBold },

  emptyCard: { backgroundColor: colors.surfaceWhite, borderRadius: radii.radiusLg, borderWidth: 1, borderColor: colors.gray100, padding: spacing.space6, alignItems: 'center' },
  emptyText: { fontSize: fontSizes.fsSm, color: colors.gray500, fontFamily: fontFamilies.interRegular },

  /* Modal — unchanged */
  readOnlyNotice: { flexDirection: 'row', gap: spacing.space2, backgroundColor: colors.primary50, borderWidth: 1, borderColor: colors.primary200, borderRadius: radii.radiusMd, padding: spacing.space3, marginBottom: spacing.space4 },
  readOnlyTitle: { fontSize: fontSizes.fsSm, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.primary800 },
  readOnlyText: { fontSize: fontSizes.fsXs, color: colors.primary800, fontFamily: fontFamilies.interRegular, marginTop: 2 },
  modalHero: { flexDirection: 'row', alignItems: 'center', gap: spacing.space3, marginBottom: spacing.space4 },
  modalAvatar: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  modalAvatarText: { fontSize: fontSizes.fs2xl, fontWeight: fontWeights.fwExtrabold, fontFamily: fontFamilies.interExtraBold, color: colors.white },
  modalName: { fontSize: fontSizes.fsXl, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.gray900 },
  modalBadges: { flexDirection: 'row', gap: 6, marginTop: 4 },
  modalDetailGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.space4 },
  detailItem: { width: '50%', paddingVertical: 4 },
  detailLabel: { fontSize: fontSizes.fsXs, color: colors.gray400, fontFamily: fontFamilies.interMedium },
  detailValue: { fontSize: fontSizes.fsSm, color: colors.gray800, fontFamily: fontFamilies.interMedium },
  detailAccent: { color: colors.success600, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold },
  modalActions: { flexDirection: 'row', gap: spacing.space3 },
  actionBtn: { flex: 1, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radii.radiusMd },
  warnBtn: { backgroundColor: colors.warning500 },
  successBtn: { backgroundColor: colors.success600 },
  dangerBtn: { backgroundColor: colors.danger600 },
  disabledBtn: { backgroundColor: colors.gray100 },
  actionBtnText: { fontSize: fontSizes.fsSm, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.white },
  disabledText: { fontSize: fontSizes.fsSm, fontWeight: fontWeights.fwSemibold, fontFamily: fontFamilies.interSemiBold, color: colors.gray400 },
});
