import { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { RefreshCw, AlertTriangle, Lock } from 'lucide-react-native';
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
 * real-data CRUD surface. Everything about the data path is preserved VERBATIM:
 *
 *  - getWorkerList() Supabase fetch on mount, with loading spinner, non-breaking error banner
 *    + Retry, and demo workers never wiped on error.
 *  - normaliseMock / normaliseRealWorker (5 confirmed-safe columns only: id, full_name, phone,
 *    role, created_at — never invents skills/earnings/etc.) / mergeWorkers dedup.
 *  - Search across name/phone/skills/cooperative.
 *  - Ban/unban/remove work for source='demo' workers ONLY (local state, not persisted, matching
 *    web). source='registered' workers get disabled actions + a Lock read-only notice.
 *  - statusVariant/statusLabel: Banned / Registered / Online / Offline.
 *
 * Only the presentation (cards, modal) is re-styled to the modern app look.
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

  const filtered = workers.filter((w) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      (w.name || '').toLowerCase().includes(q) ||
      (w.phone || '').toLowerCase().includes(q) ||
      (Array.isArray(w.skills) && w.skills.some((s) => s.toLowerCase().includes(q))) ||
      (w.cooperative || '').toLowerCase().includes(q)
    );
  });

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

  return (
    <ScreenContainer>
      <Text style={styles.h1}>{t('workers')} Management</Text>

      <View style={styles.countRow}>
        <Text style={styles.countText}>
          {workers.length} total · {demoCount} demo
          {registeredCount > 0 ? ` · ${registeredCount} registered` : ''}
        </Text>
        {fetchLoading && (
          <View style={styles.loadingRow}>
            <RefreshCw size={13} color={colors.gray500} />
            <Text style={styles.loadingText}>Loading…</Text>
          </View>
        )}
      </View>

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

      <View style={styles.searchWrap}>
        <SearchBar placeholder="Search name, skill, phone…" value={search} onChangeText={setSearch} />
      </View>

      <View style={styles.list}>
        {filtered.map((worker) => (
          <Pressable key={worker.id} style={styles.card} onPress={() => setSelectedWorker(worker)}>
            <View style={styles.cardHeader}>
              <View style={[styles.avatar, { backgroundColor: worker.source === 'registered' ? colors.primary600 : worker.available ? colors.success600 : colors.gray300 }]}>
                <Text style={styles.avatarText}>{(worker.name || '?')[0].toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.workerName} numberOfLines={1}>
                  {worker.name}{worker.banned ? ' (Banned)' : ''}
                </Text>
                {worker.rating != null ? <StarRating rating={worker.rating} size={13} /> : <Text style={styles.notRated}>Not rated yet</Text>}
              </View>
              <Badge variant={statusVariant(worker)} size="sm">{statusLabel(worker)}</Badge>
            </View>

            <View style={styles.detailGrid}>
              <Detail label="Cooperative" value={worker.cooperative || '—'} />
              <Detail label="Jobs Done" value={String(worker.totalJobs)} />
              <Detail label="Queue" value={worker.fairnessPosition != null ? `#${worker.fairnessPosition}` : '—'} />
              <Detail label="Earnings" value={`₹${earningsDisplay(worker.earnings)}`} accent />
            </View>

            {worker.skills.length > 0 ? (
              <View style={styles.skillRow}>
                {worker.skills.map((skill) => (
                  <Badge key={skill} variant="primary" size="sm">{skill}</Badge>
                ))}
              </View>
            ) : worker.source === 'registered' ? (
              <Text style={styles.skillsPending}>Skills pending setup</Text>
            ) : null}
          </Pressable>
        ))}
      </View>

      {/* Detail modal */}
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

function Detail({ label, value, accent }) {
  return (
    <View style={styles.detailItem}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, accent && styles.detailAccent]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: fontSizes.fs2xl, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.gray900 },
  countRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2, marginBottom: spacing.space3 },
  countText: { fontSize: fontSizes.fsSm, color: colors.gray500, fontFamily: fontFamilies.interRegular },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  loadingText: { fontSize: fontSizes.fsXs, color: colors.gray500, fontFamily: fontFamilies.interRegular },
  errorBanner: { flexDirection: 'row', gap: spacing.space2, backgroundColor: colors.warning50, borderWidth: 1, borderColor: colors.warning200, borderRadius: radii.radiusMd, padding: spacing.space3, marginBottom: spacing.space3 },
  errorTitle: { fontSize: fontSizes.fsSm, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.warning800 },
  errorText: { fontSize: fontSizes.fsXs, color: colors.warning800, fontFamily: fontFamilies.interRegular, marginTop: 2 },
  retryText: { fontSize: fontSizes.fsSm, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.warning800, textDecorationLine: 'underline', marginTop: 4 },
  searchWrap: { marginBottom: spacing.space4 },
  list: { gap: spacing.space3 },
  card: { backgroundColor: colors.surfaceWhite, borderRadius: radii.radiusLg, padding: spacing.space4, ...shadows.shadowSm },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.space3 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: fontSizes.fsLg, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.white },
  workerName: { fontSize: fontSizes.fsBase, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.gray900 },
  notRated: { fontSize: fontSizes.fsXs, color: colors.gray400, fontFamily: fontFamilies.interRegular },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.space3 },
  detailItem: { width: '50%', paddingVertical: 4 },
  detailLabel: { fontSize: fontSizes.fsXs, color: colors.gray400, fontFamily: fontFamilies.interMedium },
  detailValue: { fontSize: fontSizes.fsSm, color: colors.gray800, fontFamily: fontFamilies.interMedium },
  detailAccent: { color: colors.success600, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold },
  skillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.space2, marginTop: spacing.space3 },
  skillsPending: { fontSize: fontSizes.fsXs, color: colors.gray400, fontFamily: fontFamilies.interRegular, marginTop: spacing.space3 },
  readOnlyNotice: { flexDirection: 'row', gap: spacing.space2, backgroundColor: colors.primary50, borderWidth: 1, borderColor: colors.primary200, borderRadius: radii.radiusMd, padding: spacing.space3, marginBottom: spacing.space4 },
  readOnlyTitle: { fontSize: fontSizes.fsSm, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.primary800 },
  readOnlyText: { fontSize: fontSizes.fsXs, color: colors.primary800, fontFamily: fontFamilies.interRegular, marginTop: 2 },
  modalHero: { flexDirection: 'row', alignItems: 'center', gap: spacing.space3, marginBottom: spacing.space4 },
  modalAvatar: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  modalAvatarText: { fontSize: fontSizes.fs2xl, fontWeight: fontWeights.fwExtrabold, fontFamily: fontFamilies.interExtraBold, color: colors.white },
  modalName: { fontSize: fontSizes.fsXl, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.gray900 },
  modalBadges: { flexDirection: 'row', gap: 6, marginTop: 4 },
  modalDetailGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.space4 },
  modalActions: { flexDirection: 'row', gap: spacing.space3 },
  actionBtn: { flex: 1, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radii.radiusMd },
  warnBtn: { backgroundColor: colors.warning500 },
  successBtn: { backgroundColor: colors.success600 },
  dangerBtn: { backgroundColor: colors.danger600 },
  disabledBtn: { backgroundColor: colors.gray100 },
  actionBtnText: { fontSize: fontSizes.fsSm, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.white },
  disabledText: { fontSize: fontSizes.fsSm, fontWeight: fontWeights.fwSemibold, fontFamily: fontFamilies.interSemiBold, color: colors.gray400 },
});
