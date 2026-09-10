import { useState, useMemo } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Line as SvgLine, Text as SvgText, G } from 'react-native-svg';
import {
  TrendingUp, AlertTriangle, Calendar, Users, BarChart3, MapPin, Brain, RefreshCw, ChevronRight,
} from 'lucide-react-native';
import {
  generateForecast, generateCategoryForecast, generateZoneForecast, getStaffingRecommendations,
} from '@utils/forecastEngine';
import { historicalDemand } from '@data/mockHistoricalDemand';
import { mockWorkers } from '@data/mockWorkers';
import { useLanguage } from '@context/LanguageContext';
import { ScreenContainer, PortalHeader } from '@components/app';
import StatsCard from '@components/ui/StatsCard';
import { colors, spacing, radii, shadows, fontSizes, fontWeights, fontFamilies } from '@theme';

/**
 * DemandForecastScreen — ported from web pages/admin/DemandForecast.jsx (admin accent = red).
 *
 * ALL forecasting logic is preserved verbatim via @utils/forecastEngine (already ported):
 * generateForecast (aggregate), generateCategoryForecast, generateZoneForecast,
 * getStaffingRecommendations, plus the availableByCategory computation from mockWorkers skills,
 * the stats (avg/total/peak/online), the category selector, forecastDays=7, and the 1.5s
 * "regenerate" simulation.
 *
 * The one necessary re-implementation: the web drew the line chart on an HTML <canvas>. RN has no
 * canvas, so the chart is redrawn with react-native-svg — same visual: grid + y-labels, a
 * translucent confidence band (Path), the predicted-demand line (Path), per-day points (Circle,
 * amber when a festival lands that day), value labels, and x-axis day/date labels. The desktop
 * <table> daily breakdown becomes a mobile card list; staffing + zone heatmap ported as-is.
 */

const CATEGORIES = [
  { id: 'plumbing', name: 'Plumbing', emoji: '🔧' },
  { id: 'electrical', name: 'Electrical', emoji: '⚡' },
  { id: 'cleaning', name: 'Cleaning', emoji: '🧹' },
  { id: 'painting', name: 'Painting', emoji: '🎨' },
  { id: 'carpentry', name: 'Carpentry', emoji: '🔨' },
  { id: 'ac-repair', name: 'AC Repair', emoji: '❄️' },
  { id: 'pest-control', name: 'Pest Control', emoji: '🐛' },
  { id: 'appliance-repair', name: 'Appliance', emoji: '⚙️' },
];

const CHART_H = 240;
const FORECAST_DAYS = 7;

// Urgency → refined status treatment (same three urgency values the engine produces).
const STAFF_TONES = {
  understaffed: { label: 'Understaffed', bg: '#fee2e2', fg: '#dc2626', softBg: '#fef2f2', textStrong: '#b91c1c' },
  tight: { label: 'Tight', bg: '#fef3c7', fg: '#d97706', softBg: '#fffbeb', textStrong: '#b45309' },
  covered: { label: 'Covered', bg: '#d1fae5', fg: '#059669', softBg: '#ecfdf5', textStrong: '#065f46' },
};

// Soft pastel icon-container tints per trade (purely visual).
const CAT_ICON_TINTS = {
  plumbing: '#eef2ff',
  electrical: '#fffbeb',
  cleaning: '#ecfdf5',
  painting: '#fef2f2',
  carpentry: '#fff7ed',
  'ac-repair': '#ecfeff',
  'pest-control': '#f5f3ff',
  'appliance-repair': '#eff6ff',
  default: '#f3f4f6',
};

export default function DemandForecastScreen() {
  const { t } = useLanguage();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isGenerating, setIsGenerating] = useState(false);

  const aggregateForecast = useMemo(() => generateForecast(historicalDemand, FORECAST_DAYS), []);
  const categoryForecast = useMemo(
    () => (selectedCategory === 'all' ? null : generateCategoryForecast(historicalDemand, selectedCategory, FORECAST_DAYS)),
    [selectedCategory]
  );
  const zoneForecast = useMemo(() => generateZoneForecast(historicalDemand), []);

  // Zone rows for the prioritized list — all values below are DERIVED from the same real
  // `zoneForecast` demand counts (no new data source, no fabricated figures):
  //   • zoneTotal  = sum of demand counts (the "Total: N Requests").
  //   • share      = demand / total, rounded (shown once per row, e.g. "South (29%)").
  //   • pct        = demand / maxDemand (bar width, so the top zone fills the track).
  //   • tone/label = a status treatment picked from the zone's share of the total.
  const zoneEntries = useMemo(
    () => Object.entries(zoneForecast).sort((a, b) => b[1] - a[1]),
    [zoneForecast]
  );
  const zoneTotal = useMemo(() => zoneEntries.reduce((sum, [, d]) => sum + d, 0), [zoneEntries]);
  const zoneRows = useMemo(() => {
    const maxDemand = Math.max(...zoneEntries.map(([, d]) => d), 1);
    const total = zoneTotal || 1;
    return zoneEntries.map(([zone, demand]) => {
      const shareRatio = demand / total;
      const level = zoneLevel(shareRatio);
      return {
        zone,
        demand,
        share: Math.round(shareRatio * 100),
        pct: Math.round((demand / maxDemand) * 100),
        tone: level.tone,
        label: level.label,
        critical: level.critical,
      };
    });
  }, [zoneEntries, zoneTotal]);

  const availableByCategory = useMemo(() => {
    const counts = {};
    mockWorkers.forEach((w) => {
      if (w.available) {
        w.skills.forEach((skill) => {
          const cat = skill.toLowerCase().replace(' repair', '-repair').replace(' control', '-control');
          counts[cat] = (counts[cat] || 0) + 1;
        });
      }
    });
    return counts;
  }, []);

  const staffingRecs = useMemo(
    () => getStaffingRecommendations(aggregateForecast, availableByCategory),
    [aggregateForecast, availableByCategory]
  );

  const activeForecast = selectedCategory === 'all' ? aggregateForecast : categoryForecast;
  const totalPredicted = activeForecast?.reduce((sum, d) => sum + d.predicted, 0) || 0;
  const avgPredicted = activeForecast?.length ? Math.round(totalPredicted / activeForecast.length) : 0;
  const peakDay = activeForecast?.reduce((max, d) => (d.predicted > max.predicted ? d : max), activeForecast[0]);
  const workersOnline = mockWorkers.filter((w) => w.available).length;

  // Frontend-only visualization bounds derived from the existing predicted values
  // (used to scale the per-day demand bars and pick a relative status label). No new data.
  const dayMax = activeForecast?.length ? Math.max(...activeForecast.map((d) => d.predicted)) : 0;
  const dayMin = activeForecast?.length ? Math.min(...activeForecast.map((d) => d.predicted)) : 0;

  const handleRegenerate = () => {
    setIsGenerating(true);
    setTimeout(() => setIsGenerating(false), 1500);
  };

  // Bottom padding that clears the floating (absolutely-positioned) admin tab bar so the final
  // card is fully scrollable into view. Mirrors AdminTabs' own geometry: safe-area inset +
  // its space3 bottom offset + 64 bar height, plus a comfortable gap. Scoped to this screen;
  // presentation-only, no logic/route/data changes.
  const scrollPadBottom = insets.bottom + spacing.space3 + 64 + spacing.space6;

  return (
    <ScreenContainer contentStyle={{ paddingBottom: scrollPadBottom }}>
      {/* Premium in-content header (PortalHeader kept for its logout action + accent bell slot) */}
      <PortalHeader
        title={t('demand_forecast_ai') || 'AI Demand Forecast'}
        subtitle="Weighted MA + seasonality + weather"
        accent={colors.primary600}
      />

      {/* Regenerate — premium full-width indigo button (same handler, same 1.5s behaviour) */}
      <Pressable
        style={({ pressed }) => [styles.regenBtn, pressed && styles.regenBtnPressed, isGenerating && styles.regenBtnBusy]}
        onPress={handleRegenerate}
        disabled={isGenerating}
        accessibilityRole="button"
        accessibilityLabel="Regenerate forecast"
      >
        {isGenerating ? <ActivityIndicator size="small" color={colors.white} /> : <RefreshCw size={17} color={colors.white} strokeWidth={2.4} />}
        <View>
          <Text style={styles.regenText}>{isGenerating ? 'Analyzing demand patterns…' : 'Regenerate Forecast'}</Text>
          {!isGenerating && <Text style={styles.regenSub}>Get the latest AI peak forecast</Text>}
        </View>
      </Pressable>

      {/* Category selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
        <CatChip label="All" emoji={null} icon={BarChart3} active={selectedCategory === 'all'} onPress={() => setSelectedCategory('all')} />
        {CATEGORIES.map((c) => (
          <CatChip key={c.id} label={c.name} emoji={c.emoji} active={selectedCategory === c.id} onPress={() => setSelectedCategory(c.id)} />
        ))}
      </ScrollView>

      {isGenerating ? (
        <View style={styles.generatingBox}>
          <Brain size={30} color={colors.primary600} />
          <Text style={styles.generatingTitle}>Analyzing demand patterns…</Text>
          <Text style={styles.generatingSub}>Running the forecasting model with weather, seasonality, and festival data</Text>
        </View>
      ) : (
        <>
          {/* Stats — 2x2 */}
          <View style={styles.statsGrid}>
            <View style={styles.statCell}><StatsCard label="Avg. Daily Demand" value={avgPredicted} icon={TrendingUp} color="primary" /></View>
            <View style={styles.statCell}><StatsCard label="Total (7 Days)" value={totalPredicted} icon={BarChart3} color="info" /></View>
            <View style={styles.statCell}><StatsCard label="Peak Day" value={peakDay ? `${peakDay.dayName} (${peakDay.predicted})` : '—'} icon={Calendar} color="warning" /></View>
            <View style={styles.statCell}><StatsCard label="Workers Online" value={workersOnline} icon={Users} color="success" /></View>
          </View>

          {/* Chart */}
          <View style={styles.chartCard}>
            <View style={styles.chartHeadRow}>
              <Text style={styles.chartTitle}>Predicted Demand (Workers Needed)</Text>
              {/* Passive descriptor of the real forecast window (FORECAST_DAYS), not a control. */}
              <View style={styles.rangePill}>
                <Text style={styles.rangePillText}>{FORECAST_DAYS} Days</Text>
              </View>
            </View>
            <ForecastChart data={activeForecast} width={width - spacing.space4 * 2 - spacing.space4 * 2} />
            <View style={styles.legendRow}>
              <Legend color={colors.primary600} label="Predicted" />
              <Legend band label="Confidence" />
              <Legend color={colors.accent500} label="Festival" />
            </View>
          </View>

          {/* ── AI insight card — premium soft-lavender demand alert.
                Composed entirely from the already-derived peakDay (no new data/logic). ── */}
          {peakDay && (
            <View style={styles.insightCard}>
              <View style={styles.insightIconLg}>
                <BarChart3 size={20} color={colors.primary600} strokeWidth={2.4} />
              </View>
              <View style={styles.insightBody}>
                <Text style={styles.insightHeadline}>
                  Demand is expected to peak on <Text style={styles.insightHeadlineHi}>{peakDay.dayName} ({peakDay.predicted})</Text>.
                </Text>
                <Text style={styles.insightSupport}>Consider allocating more workers.</Text>
              </View>
              {/* Minimal upward-trend bars — a purely decorative rising motif. */}
              <View style={styles.trendBars} accessible={false} importantForAccessibility="no-hide-descendants">
                {[10, 16, 13, 22, 28].map((h, idx) => (
                  <View key={idx} style={[styles.trendBar, { height: h, opacity: 0.35 + idx * 0.16 }]} />
                ))}
              </View>
            </View>
          )}

          {/* Daily breakdown — premium redesigned rows (same dates/values/ranges). */}
          <View style={styles.card}>
            <View style={styles.breakdownHead}>
              <View style={styles.breakdownHeadLeft}>
                <View style={styles.breakdownTitleRow}>
                  <Calendar size={16} color={colors.gray700} />
                  <Text style={styles.sectionTitle}>Daily Breakdown</Text>
                </View>
                <Text style={styles.breakdownSub}>Predicted demand with expected range</Text>
              </View>
              {/* Passive descriptor of the real forecast window (FORECAST_DAYS) — not a control. */}
              <View style={styles.weekPill}>
                <Text style={styles.weekPillText}>This Week</Text>
              </View>
            </View>

            {activeForecast?.map((day, i) => {
              const isPeak = peakDay && day.date === peakDay.date;
              const level = demandLevel(day.predicted, dayMax, dayMin);
              const barPct = dayMax > 0 ? Math.max((day.predicted / dayMax) * 100, 6) : 6;
              return (
                <View key={day.date} style={[styles.dayRowV2, isPeak && styles.dayRowPeak, i > 0 && !isPeak && styles.dayRowGap]}>
                  {/* Left — date chip */}
                  <View style={[styles.dayChip, isPeak && styles.dayChipPeak]}>
                    <Text style={[styles.dayChipName, isPeak && styles.dayChipNamePeak]}>{day.dayName}</Text>
                    <Text style={[styles.dayChipDate, isPeak && styles.dayChipDatePeak]}>{day.date.slice(5)}</Text>
                  </View>

                  {/* Center — status + demand bar */}
                  <View style={styles.dayCenter}>
                    <View style={styles.dayStatusRow}>
                      <Text style={[styles.dayStatusText, { color: level.fg }]} numberOfLines={1}>
                        {isPeak ? 'Highest demand' : level.label}
                      </Text>
                      {isPeak ? <Text style={styles.dayCrown}> 👑</Text> : null}
                      {day.festival ? (
                        <View style={styles.dayFestTag}>
                          <Text style={styles.dayFestText} numberOfLines={1}>🎉 {day.festival}</Text>
                        </View>
                      ) : null}
                    </View>
                    <View style={styles.dayBarTrack}>
                      <View style={[styles.dayBarFill, { width: `${barPct}%`, backgroundColor: level.fg }]} />
                    </View>
                  </View>

                  {/* Right — predicted value + range */}
                  <View style={styles.dayRightV2}>
                    <Text style={[styles.dayPredictedV2, isPeak && styles.dayPredictedPeak]}>{day.predicted}</Text>
                    <Text style={styles.dayConfidenceV2}>{day.confidence[0]}–{day.confidence[1]}</Text>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Staffing recommendations — premium card redesign (data/logic unchanged) */}
          <View style={styles.staffSection}>
            <View style={styles.staffHeaderCard}>
              {/* Subtle decorative background waves — purely visual, non-interactive. */}
              <View style={styles.staffWaveWrap} pointerEvents="none" importantForAccessibility="no-hide-descendants">
                <Svg width={160} height={96} viewBox="0 0 160 96">
                  <Path d="M0 62 C40 40 70 84 110 58 C138 40 152 60 160 52" stroke="rgba(79,70,229,0.10)" strokeWidth={2} fill="none" />
                  <Path d="M0 78 C46 56 74 96 118 70 C144 54 154 72 160 66" stroke="rgba(99,102,241,0.08)" strokeWidth={2} fill="none" />
                </Svg>
              </View>
              <View style={styles.staffHeaderIcon}>
                <Brain size={18} color={colors.primary600} strokeWidth={2.3} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.staffHeaderTitle}>AI Staffing Recommendations</Text>
                <Text style={styles.staffHeaderSub}>Based on current workload and demand</Text>
              </View>
              <View style={styles.realtimePill}>
                <View style={styles.realtimeDot} />
                <Text style={styles.realtimeText}>Real-time</Text>
              </View>
            </View>

            {staffingRecs.map((rec) => {
              const cat = CATEGORIES.find((c) => c.id === rec.category);
              const ratio = Math.min((rec.available / Math.max(rec.peakDemand, 1)) * 100, 100);
              const tone = STAFF_TONES[rec.urgency] || STAFF_TONES.covered;
              const iconTint = CAT_ICON_TINTS[rec.category] || CAT_ICON_TINTS.default;
              return (
                <View key={rec.category} style={styles.staffCardV2}>
                  <View style={styles.staffTopRow}>
                    <View style={[styles.staffIconBox, { backgroundColor: iconTint }]}>
                      <Text style={styles.staffEmoji}>{cat?.emoji || '📋'}</Text>
                    </View>
                    <Text style={styles.staffNameV2} numberOfLines={1}>{rec.categoryName}</Text>
                    <View style={[styles.staffPill, { backgroundColor: tone.bg }]}>
                      {rec.urgency === 'understaffed' ? (
                        <AlertTriangle size={11} color={tone.fg} strokeWidth={2.4} />
                      ) : null}
                      <Text style={[styles.staffPillText, { color: tone.fg }]}>{tone.label}</Text>
                    </View>
                  </View>

                  <View style={styles.staffBarRowV2}>
                    <View style={styles.staffBarTrackV2}>
                      <View style={[styles.staffBarFillV2, { width: `${ratio}%`, backgroundColor: tone.fg }]} />
                    </View>
                    <Text style={styles.staffRatioV2}>{rec.available}/{rec.peakDemand}</Text>
                  </View>

                  {/* Recommendation area — real rec.message + real rec.gap; non-functional chevron */}
                  <View style={[styles.recArea, { backgroundColor: tone.softBg }]}>
                    <View style={[styles.recIcon, { backgroundColor: tone.bg }]}>
                      <Users size={14} color={tone.fg} strokeWidth={2.3} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[styles.recText, { color: tone.textStrong }]} numberOfLines={2}>{rec.message}</Text>
                      {rec.gap > 0 ? (
                        <Text style={styles.recSub}>Need {rec.gap} more workers</Text>
                      ) : null}
                    </View>
                    <ChevronRight size={16} color={tone.fg} />
                  </View>
                </View>
              );
            })}
          </View>

          {/* Zone heatmap */}
          <View style={styles.card}>
            {/* Header — title + pin, with a lighter "Total: N Requests" for context. */}
            <View style={styles.zoneHeadRow}>
              <View style={styles.sectionTitleRow}>
                <MapPin size={16} color={colors.gray700} />
                <Text style={styles.sectionTitle}>Zone-wise Demand</Text>
              </View>
              <Text style={styles.zoneTotal}>Total: {zoneTotal} Requests</Text>
            </View>

            {/* Prioritized, table-like rows (sorted descending). Share %, status label and the
                progress bar are all derived from the SAME real demand counts — nothing new is
                fetched or invented. */}
            <View style={styles.zoneList}>
              {zoneRows.map((z, i) => (
                <View key={z.zone} style={[styles.zoneRow, i > 0 && styles.zoneRowBorder]}>
                  {/* Column 1 — color-coded vertical status bar */}
                  <View style={[styles.zoneStatusBar, { backgroundColor: z.tone.fg }]} />

                  {/* Column 2 — zone (with share) over request count */}
                  <View style={styles.zoneNameCol}>
                    <Text style={styles.zoneNameV2} numberOfLines={1}>
                      {z.zone} <Text style={styles.zoneShare}>({z.share}%)</Text>
                    </Text>
                    <Text style={styles.zoneCount} numberOfLines={1}>{z.demand} requests</Text>
                  </View>

                  {/* Column 3 — demand label (priority badge) over a colored progress bar */}
                  <View style={styles.zoneMetricCol}>
                    <View style={[styles.zoneBadge, { backgroundColor: z.tone.bg }]}>
                      {z.critical ? <AlertTriangle size={10} color={z.tone.fg} strokeWidth={2.6} /> : null}
                      <Text style={[styles.zoneBadgeText, { color: z.tone.fg }]} numberOfLines={1}>{z.label}</Text>
                    </View>
                    <View style={styles.zoneBarTrackV2}>
                      <View style={[styles.zoneBarFillV2, { width: `${z.pct}%`, backgroundColor: z.tone.fg }]} />
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </>
      )}
    </ScreenContainer>
  );
}

/**
 * ForecastChart — SVG re-implementation of the web canvas line chart. Draws a grid, the
 * confidence band (filled path between confidence[1] and confidence[0]), the predicted line,
 * per-point circles (amber if that day has a festival), value labels, and x-axis day/date labels.
 */
function ForecastChart({ data, width }) {
  if (!data?.length) return null;
  const W = Math.max(width, 260);
  const H = CHART_H;
  const pad = { top: 24, right: 16, bottom: 40, left: 34 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;

  const highs = data.map((d) => d.confidence[1]);
  const lows = data.map((d) => d.confidence[0]);
  const maxVal = Math.max(...highs) * 1.1;
  const minVal = Math.max(0, Math.min(...lows) * 0.8);
  const range = maxVal - minVal || 1;

  const xStep = chartW / Math.max(data.length - 1, 1);
  const toX = (i) => pad.left + i * xStep;
  const toY = (v) => pad.top + chartH - ((v - minVal) / range) * chartH;

  // Confidence band path (top edge along highs, back along lows).
  let band = '';
  data.forEach((d, i) => { band += `${i === 0 ? 'M' : 'L'}${toX(i)},${toY(d.confidence[1])} `; });
  for (let i = data.length - 1; i >= 0; i--) band += `L${toX(i)},${toY(data[i].confidence[0])} `;
  band += 'Z';

  // Predicted line path.
  let line = '';
  data.forEach((d, i) => { line += `${i === 0 ? 'M' : 'L'}${toX(i)},${toY(d.predicted)} `; });

  // Translucent area under the predicted line (purely visual; same predicted values).
  let area = '';
  data.forEach((d, i) => { area += `${i === 0 ? 'M' : 'L'}${toX(i)},${toY(d.predicted)} `; });
  area += `L${toX(data.length - 1)},${pad.top + chartH} L${toX(0)},${pad.top + chartH} Z`;

  const gridLines = [0, 1, 2, 3, 4];

  return (
    <Svg width={W} height={H}>
      {/* Grid + y labels */}
      {gridLines.map((g) => {
        const y = pad.top + (chartH / 4) * g;
        const val = Math.round(maxVal - (range / 4) * g);
        return (
          <G key={g}>
            <SvgLine x1={pad.left} y1={y} x2={W - pad.right} y2={y} stroke={colors.gray200} strokeWidth={1} />
            <SvgText x={pad.left - 6} y={y + 4} fontSize={10} fill={colors.gray400} textAnchor="end">{val}</SvgText>
          </G>
        );
      })}

      {/* Confidence band */}
      <Path d={band} fill="rgba(79,70,229,0.08)" />

      {/* Translucent area fill under the predicted line */}
      <Path d={area} fill="rgba(99,102,241,0.12)" />

      {/* Predicted line */}
      <Path d={line} fill="none" stroke={colors.primary600} strokeWidth={2.75} strokeLinejoin="round" strokeLinecap="round" />

      {/* Points + labels */}
      {data.map((d, i) => (
        <G key={d.date}>
          <Circle cx={toX(i)} cy={toY(d.predicted)} r={4.5} fill={d.festival ? colors.accent500 : colors.primary600} stroke={colors.white} strokeWidth={2} />
          <SvgText x={toX(i)} y={toY(d.predicted) - 10} fontSize={10} fontWeight="bold" fill={colors.gray700} textAnchor="middle">{d.predicted}</SvgText>
          <SvgText x={toX(i)} y={H - pad.bottom + 16} fontSize={10} fill={colors.gray500} textAnchor="middle">{d.dayName}</SvgText>
          <SvgText x={toX(i)} y={H - pad.bottom + 28} fontSize={9} fill={colors.gray400} textAnchor="middle">{d.date.slice(5)}</SvgText>
        </G>
      ))}
    </Svg>
  );
}

function CatChip({ label, emoji, icon: Icon, active, onPress }) {
  return (
    <Pressable style={[styles.catChip, active && styles.catChipActive]} onPress={onPress}>
      {emoji ? <Text style={styles.catEmoji}>{emoji}</Text> : Icon ? <Icon size={14} color={active ? colors.primary700 : colors.gray600} /> : null}
      <Text style={[styles.catLabel, active && styles.catLabelActive]}>{label}</Text>
    </Pressable>
  );
}

function Legend({ color, band, label }) {
  return (
    <View style={styles.legendItem}>
      {band ? <View style={styles.legendBand} /> : <View style={[styles.legendDot, { backgroundColor: color }]} />}
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

/**
 * demandLevel — maps a day's predicted value to a relative status label + semantic color,
 * scaled between the min and max of the current forecast window. Purely presentational:
 * it reads the already-computed predicted values and derives no new demand data.
 */
function demandLevel(value, max, min) {
  const range = Math.max(max - min, 1);
  const t = (value - min) / range; // 0 (lowest) → 1 (highest)
  if (t >= 0.78) return { label: 'High demand', fg: colors.danger500 };
  if (t >= 0.4) return { label: 'Moderate demand', fg: colors.primary600 };
  return { label: 'Lower demand', fg: colors.success600 };
}

/**
 * zoneLevel — maps a zone's share of total demand to an intuitive priority treatment:
 *   red = critical/shortage, amber = moderate, yellow = normal, green = low.
 * Thresholds are on the share-of-total ratio, so the busiest zones escalate naturally.
 * Presentation only — reads the already-derived share and returns colors/labels.
 */
const ZONE_TONES = {
  critical: { fg: '#e11d48', bg: '#ffe4e6' }, // coral / red
  moderate: { fg: '#ea580c', bg: '#ffedd5' }, // amber / orange
  normal: { fg: '#ca8a04', bg: '#fef9c3' }, // yellow
  low: { fg: '#16a34a', bg: '#dcfce7' }, // green
};

function zoneLevel(shareRatio) {
  if (shareRatio >= 0.27) return { tone: ZONE_TONES.critical, label: 'Shortage Alert', critical: true };
  if (shareRatio >= 0.2) return { tone: ZONE_TONES.moderate, label: 'Moderate Demand', critical: false };
  if (shareRatio >= 0.15) return { tone: ZONE_TONES.normal, label: 'Normal Demand', critical: false };
  return { tone: ZONE_TONES.low, label: 'Low Demand', critical: false };
}

const styles = StyleSheet.create({
  regenBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.space3,
    paddingVertical: spacing.space4, paddingHorizontal: spacing.space4, borderRadius: radii.radiusLg,
    backgroundColor: colors.primary600,
    marginBottom: spacing.space4,
    ...shadows.shadowLg, shadowColor: colors.primary600,
  },
  regenBtnPressed: { backgroundColor: colors.primary700, transform: [{ scale: 0.99 }] },
  regenBtnBusy: { opacity: 0.85 },
  regenText: { fontSize: fontSizes.fsBase, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.white },
  regenSub: { fontSize: fontSizes.fsXs, fontFamily: fontFamilies.interRegular, color: 'rgba(255,255,255,0.82)', marginTop: 1 },

  catRow: { gap: spacing.space2, paddingBottom: spacing.space4 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 9, paddingHorizontal: 15, borderRadius: radii.radiusFull,
    backgroundColor: colors.surfaceWhite, borderWidth: 1, borderColor: colors.gray200,
    ...shadows.shadowSm,
  },
  catChipActive: { backgroundColor: colors.primary600, borderColor: colors.primary600 },
  catEmoji: { fontSize: 14 },
  catLabel: { fontSize: fontSizes.fsSm, fontWeight: fontWeights.fwSemibold, fontFamily: fontFamilies.interSemiBold, color: colors.gray600 },
  catLabelActive: { color: colors.white, fontFamily: fontFamilies.interSemiBold },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.space3, marginBottom: spacing.space4 },
  statCell: { width: '47%', flexGrow: 1 },

  card: {
    backgroundColor: colors.white, borderRadius: radii.radiusLg, padding: spacing.space4,
    borderWidth: 1, borderColor: colors.gray100, marginBottom: spacing.space4, ...shadows.shadowSm,
  },
  chartCard: {
    backgroundColor: colors.white, borderRadius: radii.radiusXl, padding: spacing.space4,
    borderWidth: 1, borderColor: colors.gray100, marginBottom: spacing.space4, ...shadows.shadowMd,
  },
  chartHeadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.space2 },
  chartTitle: { flex: 1, fontSize: fontSizes.fsBase, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.gray900 },
  rangePill: { backgroundColor: colors.primary50, borderRadius: radii.radiusFull, paddingVertical: 4, paddingHorizontal: 10 },
  rangePillText: { fontSize: fontSizes.fsXs, fontFamily: fontFamilies.interSemiBold, fontWeight: fontWeights.fwSemibold, color: colors.primary600 },
  /* AI insight card — premium soft-lavender demand alert */
  insightCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.space3,
    backgroundColor: colors.primary50, borderRadius: radii.radiusXl,
    borderWidth: 1, borderColor: colors.primary100,
    padding: spacing.space4, marginBottom: spacing.space4,
    overflow: 'hidden',
  },
  insightIconLg: {
    width: 44, height: 44, borderRadius: radii.radiusLg, backgroundColor: colors.surfaceWhite,
    borderWidth: 1, borderColor: colors.primary100,
    alignItems: 'center', justifyContent: 'center',
    ...shadows.shadowSm, shadowColor: colors.primary600,
  },
  insightBody: { flex: 1, minWidth: 0 },
  insightHeadline: { fontSize: fontSizes.fsSm, color: colors.primary800, fontFamily: fontFamilies.interSemiBold, fontWeight: fontWeights.fwSemibold, lineHeight: 19 },
  insightHeadlineHi: { fontFamily: fontFamilies.interExtraBold, fontWeight: fontWeights.fwExtrabold, color: colors.primary900 },
  insightSupport: { fontSize: fontSizes.fsXs, color: colors.primary700, fontFamily: fontFamilies.interRegular, marginTop: 3 },
  trendBars: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 30 },
  trendBar: { width: 5, borderRadius: 2, backgroundColor: colors.primary500 },
  legendRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.space4, marginTop: spacing.space2 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendBand: { width: 14, height: 10, borderRadius: 2, backgroundColor: 'rgba(79,70,229,0.18)' },
  legendText: { fontSize: fontSizes.fsXs, color: colors.gray500, fontFamily: fontFamilies.interRegular },

  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.space2, marginBottom: spacing.space3 },
  sectionTitle: { fontSize: fontSizes.fsBase, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.gray900 },

  /* Daily Breakdown — header */
  breakdownHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: spacing.space3 },
  breakdownHeadLeft: { flex: 1, minWidth: 0 },
  breakdownTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.space2 },
  breakdownSub: { fontSize: fontSizes.fsXs, color: colors.gray500, fontFamily: fontFamilies.interRegular, marginTop: 2 },
  weekPill: { backgroundColor: colors.primary50, borderRadius: radii.radiusFull, borderWidth: 1, borderColor: colors.primary100, paddingVertical: 5, paddingHorizontal: 12, marginLeft: spacing.space2 },
  weekPillText: { fontSize: fontSizes.fsXs, fontFamily: fontFamilies.interSemiBold, fontWeight: fontWeights.fwSemibold, color: colors.primary600 },

  /* Daily Breakdown — rows */
  dayRowV2: { flexDirection: 'row', alignItems: 'center', gap: spacing.space3, paddingVertical: spacing.space2, paddingHorizontal: spacing.space2, borderRadius: radii.radiusLg },
  dayRowGap: { marginTop: 2 },
  dayRowPeak: { backgroundColor: colors.primary50, borderWidth: 1, borderColor: colors.primary150, marginTop: 2 },
  dayChip: {
    width: 52, paddingVertical: 6, borderRadius: radii.radiusMd, backgroundColor: colors.gray50,
    borderWidth: 1, borderColor: colors.gray100, alignItems: 'center',
  },
  dayChipPeak: { backgroundColor: colors.surfaceWhite, borderColor: colors.primary200 },
  dayChipName: { fontSize: fontSizes.fsSm, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.gray900 },
  dayChipNamePeak: { color: colors.primary700 },
  dayChipDate: { fontSize: 10, color: colors.gray400, fontFamily: fontFamilies.interRegular, marginTop: 1 },
  dayChipDatePeak: { color: colors.primary500 },
  dayCenter: { flex: 1, minWidth: 0, gap: 6 },
  dayStatusRow: { flexDirection: 'row', alignItems: 'center' },
  dayStatusText: { fontSize: fontSizes.fsSm, fontFamily: fontFamilies.interSemiBold, fontWeight: fontWeights.fwSemibold },
  dayCrown: { fontSize: fontSizes.fsSm },
  dayFestTag: { marginLeft: 6, backgroundColor: colors.accent50, borderRadius: radii.radiusFull, paddingVertical: 2, paddingHorizontal: 8, maxWidth: 120 },
  dayFestText: { fontSize: 10, color: colors.accent700, fontFamily: fontFamilies.interSemiBold, fontWeight: fontWeights.fwSemibold },
  dayBarTrack: { height: 7, borderRadius: 4, backgroundColor: colors.gray100, overflow: 'hidden' },
  dayBarFill: { height: 7, borderRadius: 4 },
  dayRightV2: { alignItems: 'flex-end', minWidth: 56 },
  dayPredictedV2: { fontSize: fontSizes.fsXl, fontWeight: fontWeights.fwExtrabold, fontFamily: fontFamilies.interExtraBold, color: colors.gray900 },
  dayPredictedPeak: { color: colors.primary600 },
  dayConfidenceV2: { fontSize: fontSizes.fsXs, color: colors.gray400, fontFamily: fontFamilies.interRegular, marginTop: 1 },

  /* Staffing recommendations v2 */
  staffSection: { marginBottom: spacing.space4 },
  staffHeaderCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.space3,
    backgroundColor: colors.white, borderRadius: radii.radiusXl, padding: spacing.space4,
    borderWidth: 1, borderColor: colors.gray100, marginBottom: spacing.space3, ...shadows.shadowSm,
    position: 'relative', overflow: 'hidden',
  },
  staffWaveWrap: { position: 'absolute', right: 0, top: 0, bottom: 0, justifyContent: 'center' },
  staffHeaderIcon: {
    width: 40, height: 40, borderRadius: radii.radiusMd, backgroundColor: colors.primary50,
    borderWidth: 1, borderColor: colors.primary100, alignItems: 'center', justifyContent: 'center',
  },
  staffHeaderTitle: { fontSize: fontSizes.fsBase, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.gray900 },
  staffHeaderSub: { fontSize: fontSizes.fsXs, color: colors.gray500, fontFamily: fontFamilies.interRegular, marginTop: 1 },
  realtimePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.primary50, borderRadius: radii.radiusFull, paddingVertical: 5, paddingHorizontal: 10,
  },
  realtimeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary600 },
  realtimeText: { fontSize: 10, fontFamily: fontFamilies.interSemiBold, fontWeight: fontWeights.fwSemibold, color: colors.primary600 },

  staffCardV2: {
    backgroundColor: colors.white, borderRadius: radii.radiusXl, padding: spacing.space4,
    borderWidth: 1, borderColor: colors.gray100, marginBottom: spacing.space3, ...shadows.shadowSm,
  },
  staffTopRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.space3 },
  staffIconBox: { width: 46, height: 46, borderRadius: radii.radiusMd, alignItems: 'center', justifyContent: 'center' },
  staffEmoji: { fontSize: 20 },
  staffNameV2: { flex: 1, fontSize: fontSizes.fsBase, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.gray900 },
  staffPill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: radii.radiusFull, paddingVertical: 4, paddingHorizontal: 9 },
  staffPillText: { fontSize: 11, fontFamily: fontFamilies.interSemiBold, fontWeight: fontWeights.fwSemibold },
  staffBarRowV2: { flexDirection: 'row', alignItems: 'center', gap: spacing.space3, marginTop: spacing.space3 },
  staffBarTrackV2: { flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.gray100, overflow: 'hidden' },
  staffBarFillV2: { height: 8, borderRadius: 4 },
  staffRatioV2: { fontSize: fontSizes.fsSm, fontWeight: fontWeights.fwExtrabold, fontFamily: fontFamilies.interExtraBold, color: colors.gray800, minWidth: 40, textAlign: 'right' },
  recArea: { flexDirection: 'row', alignItems: 'center', gap: spacing.space2, borderRadius: radii.radiusMd, padding: spacing.space3, marginTop: spacing.space3 },
  recIcon: { width: 28, height: 28, borderRadius: radii.radiusFull, alignItems: 'center', justifyContent: 'center' },
  recText: { fontSize: fontSizes.fsSm, fontFamily: fontFamilies.interBold, fontWeight: fontWeights.fwBold, lineHeight: 17 },
  recSub: { fontSize: fontSizes.fsXs, color: colors.gray500, fontFamily: fontFamilies.interRegular, marginTop: 1 },

  /* Zone-wise Demand — prioritized table-like list */
  zoneHeadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.space2, gap: spacing.space2 },
  zoneTotal: { fontSize: fontSizes.fsXs, color: colors.gray400, fontFamily: fontFamilies.interMedium, fontWeight: fontWeights.fwMedium },
  zoneList: { marginTop: spacing.space1 },
  zoneRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.space3, paddingVertical: spacing.space3 },
  zoneRowBorder: { borderTopWidth: 1, borderTopColor: colors.gray100 },
  // Column 1 — color-coded vertical status bar.
  zoneStatusBar: { width: 4, alignSelf: 'stretch', minHeight: 38, borderRadius: radii.radiusFull },
  // Column 2 — zone name (with share) over request count.
  zoneNameCol: { width: 108, minWidth: 0 },
  zoneNameV2: { fontSize: fontSizes.fsSm, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.gray900 },
  zoneShare: { fontFamily: fontFamilies.interRegular, fontWeight: fontWeights.fwNormal, color: colors.gray400 },
  zoneCount: { fontSize: fontSizes.fsXs, color: colors.gray500, fontFamily: fontFamilies.interRegular, marginTop: 2 },
  // Column 3 — badge over colored progress bar.
  zoneMetricCol: { flex: 1, minWidth: 0, gap: 6 },
  zoneBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', borderRadius: radii.radiusFull, paddingVertical: 3, paddingHorizontal: 8 },
  zoneBadgeText: { fontSize: 10, fontFamily: fontFamilies.interSemiBold, fontWeight: fontWeights.fwSemibold },
  zoneBarTrackV2: { height: 6, borderRadius: 3, backgroundColor: colors.gray100, overflow: 'hidden' },
  zoneBarFillV2: { height: 6, borderRadius: 3 },

  generatingBox: { alignItems: 'center', gap: spacing.space2, paddingVertical: spacing.space8 },
  generatingTitle: { fontSize: fontSizes.fsBase, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.gray900, marginTop: spacing.space2 },
  generatingSub: { fontSize: fontSizes.fsXs, color: colors.gray500, fontFamily: fontFamilies.interRegular, textAlign: 'center', paddingHorizontal: spacing.space6 },
});
