import { useState, useMemo } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator, useWindowDimensions } from 'react-native';
import Svg, { Path, Circle, Line as SvgLine, Text as SvgText, G } from 'react-native-svg';
import {
  TrendingUp, AlertTriangle, CloudRain, Sun, Thermometer, Calendar, Users, BarChart3, MapPin, Brain, RefreshCw,
} from 'lucide-react-native';
import {
  generateForecast, generateCategoryForecast, generateZoneForecast, getStaffingRecommendations,
} from '@utils/forecastEngine';
import { historicalDemand } from '@data/mockHistoricalDemand';
import { mockWorkers } from '@data/mockWorkers';
import { useLanguage } from '@context/LanguageContext';
import { ScreenContainer, PortalHeader } from '@components/app';
import StatsCard from '@components/ui/StatsCard';
import Badge from '@components/ui/Badge';
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

const WEATHER_ICON = { Rainy: CloudRain, Hot: Thermometer, Clear: Sun };
const CHART_H = 240;
const FORECAST_DAYS = 7;

export default function DemandForecastScreen() {
  const { t } = useLanguage();
  const { width } = useWindowDimensions();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isGenerating, setIsGenerating] = useState(false);

  const aggregateForecast = useMemo(() => generateForecast(historicalDemand, FORECAST_DAYS), []);
  const categoryForecast = useMemo(
    () => (selectedCategory === 'all' ? null : generateCategoryForecast(historicalDemand, selectedCategory, FORECAST_DAYS)),
    [selectedCategory]
  );
  const zoneForecast = useMemo(() => generateZoneForecast(historicalDemand), []);

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

  const handleRegenerate = () => {
    setIsGenerating(true);
    setTimeout(() => setIsGenerating(false), 1500);
  };

  return (
    <ScreenContainer>
      <PortalHeader title={t('demand_forecast_ai') || 'AI Demand Forecast'} subtitle="Weighted MA + seasonality + weather" accent={colors.danger600} />

      {/* Regenerate */}
      <Pressable style={[styles.regenBtn, isGenerating && styles.regenBtnBusy]} onPress={handleRegenerate} disabled={isGenerating}>
        {isGenerating ? <ActivityIndicator size="small" color={colors.primary600} /> : <RefreshCw size={16} color={colors.primary600} />}
        <Text style={styles.regenText}>{isGenerating ? 'Analyzing demand patterns…' : 'Regenerate Forecast'}</Text>
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
          <View style={styles.card}>
            <Text style={styles.chartTitle}>Predicted Demand (Workers Needed)</Text>
            <ForecastChart data={activeForecast} width={width - spacing.space4 * 2 - spacing.space4 * 2} />
            <View style={styles.legendRow}>
              <Legend color={colors.primary600} label="Predicted" />
              <Legend band label="Confidence" />
              <Legend color={colors.accent500} label="Festival" />
            </View>
          </View>

          {/* Daily breakdown */}
          <View style={styles.card}>
            <View style={styles.sectionTitleRow}><Calendar size={16} color={colors.gray700} /><Text style={styles.sectionTitle}>Daily Breakdown</Text></View>
            {activeForecast?.map((day, i) => {
              const WeatherIcon = WEATHER_ICON[day.weather] || Sun;
              return (
                <View key={day.date} style={[styles.dayRow, i > 0 && styles.dayRowBorder]}>
                  <View style={styles.dayLeft}>
                    <Text style={styles.dayName}>{day.dayName}</Text>
                    <Text style={styles.dayDate}>{day.date.slice(5)}</Text>
                  </View>
                  <View style={styles.dayMid}>
                    {day.weather && (
                      <View style={styles.weatherTag}>
                        <WeatherIcon size={12} color={colors.gray600} />
                        <Text style={styles.weatherText}>{day.weather}</Text>
                      </View>
                    )}
                    {day.festival ? <Badge variant="warning" size="sm">🎉 {day.festival}</Badge> : null}
                  </View>
                  <View style={styles.dayRight}>
                    <Text style={styles.dayPredicted}>{day.predicted}</Text>
                    <Text style={styles.dayConfidence}>{day.confidence[0]}–{day.confidence[1]}</Text>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Staffing recommendations */}
          <View style={styles.card}>
            <View style={styles.sectionTitleRow}><Brain size={16} color={colors.gray700} /><Text style={styles.sectionTitle}>AI Staffing Recommendations</Text></View>
            {staffingRecs.map((rec) => {
              const cat = CATEGORIES.find((c) => c.id === rec.category);
              const ratio = Math.min((rec.available / Math.max(rec.peakDemand, 1)) * 100, 100);
              const barColor = rec.urgency === 'understaffed' ? colors.danger500 : rec.urgency === 'tight' ? colors.warning500 : colors.success500;
              const badgeVariant = rec.urgency === 'understaffed' ? 'danger' : rec.urgency === 'tight' ? 'warning' : 'success';
              const badgeLabel = rec.urgency === 'understaffed' ? '⚠️ Understaffed' : rec.urgency === 'tight' ? '⏳ Tight' : '✅ Covered';
              return (
                <View key={rec.category} style={styles.staffCard}>
                  <View style={styles.staffHead}>
                    <Text style={styles.staffEmoji}>{cat?.emoji || '📋'}</Text>
                    <Text style={styles.staffName}>{rec.categoryName}</Text>
                    <Badge variant={badgeVariant} size="sm">{badgeLabel}</Badge>
                  </View>
                  <View style={styles.staffBarRow}>
                    <View style={styles.staffBarTrack}>
                      <View style={[styles.staffBarFill, { width: `${ratio}%`, backgroundColor: barColor }]} />
                    </View>
                    <Text style={styles.staffRatio}>{rec.available}/{rec.peakDemand}</Text>
                  </View>
                  <Text style={styles.staffMsg}>{rec.message}</Text>
                  {rec.gap > 0 && (
                    <View style={styles.staffGap}>
                      <AlertTriangle size={13} color={colors.danger600} />
                      <Text style={styles.staffGapText}>Need <Text style={styles.bold}>{rec.gap}</Text> more workers</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          {/* Zone heatmap */}
          <View style={styles.card}>
            <View style={styles.sectionTitleRow}><MapPin size={16} color={colors.gray700} /><Text style={styles.sectionTitle}>Zone-wise Demand</Text></View>
            <View style={styles.zoneGrid}>
              {Object.entries(zoneForecast).sort((a, b) => b[1] - a[1]).map(([zone, demand]) => {
                const maxDemand = Math.max(...Object.values(zoneForecast), 1);
                const intensity = demand / maxDemand;
                return (
                  <View key={zone} style={[styles.zoneCard, { backgroundColor: `rgba(79,70,229,${0.05 + intensity * 0.2})`, borderColor: `rgba(79,70,229,${0.15 + intensity * 0.35})` }]}>
                    <Text style={styles.zoneName}>{zone}</Text>
                    <Text style={styles.zoneDemand}>{demand}</Text>
                    <View style={styles.zoneBarTrack}><View style={[styles.zoneBarFill, { width: `${intensity * 100}%` }]} /></View>
                  </View>
                );
              })}
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
      <Path d={band} fill="rgba(79,70,229,0.10)" />

      {/* Predicted line */}
      <Path d={line} fill="none" stroke={colors.primary600} strokeWidth={2.5} strokeLinejoin="round" />

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

const styles = StyleSheet.create({
  regenBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.space2,
    paddingVertical: spacing.space3, borderRadius: radii.radiusLg,
    backgroundColor: colors.primary50, borderWidth: 1, borderColor: colors.primary200,
    marginBottom: spacing.space4,
  },
  regenBtnBusy: { opacity: 0.75 },
  regenText: { fontSize: fontSizes.fsSm, fontWeight: fontWeights.fwSemibold, fontFamily: fontFamilies.interSemiBold, color: colors.primary700 },

  catRow: { gap: spacing.space2, paddingBottom: spacing.space4 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 8, paddingHorizontal: 14, borderRadius: radii.radiusFull,
    backgroundColor: colors.gray50, borderWidth: 1, borderColor: colors.gray200,
  },
  catChipActive: { backgroundColor: colors.primary50, borderColor: colors.primary400 },
  catEmoji: { fontSize: 14 },
  catLabel: { fontSize: fontSizes.fsSm, fontWeight: fontWeights.fwMedium, fontFamily: fontFamilies.interMedium, color: colors.gray600 },
  catLabelActive: { color: colors.primary700, fontFamily: fontFamilies.interSemiBold },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.space3, marginBottom: spacing.space4 },
  statCell: { width: '47%', flexGrow: 1 },

  card: {
    backgroundColor: colors.white, borderRadius: radii.radiusLg, padding: spacing.space4,
    borderWidth: 1, borderColor: colors.gray100, marginBottom: spacing.space4, ...shadows.shadowSm,
  },
  chartTitle: { fontSize: fontSizes.fsSm, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.gray900, marginBottom: spacing.space2 },
  legendRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.space4, marginTop: spacing.space2 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendBand: { width: 14, height: 10, borderRadius: 2, backgroundColor: 'rgba(79,70,229,0.18)' },
  legendText: { fontSize: fontSizes.fsXs, color: colors.gray500, fontFamily: fontFamilies.interRegular },

  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.space2, marginBottom: spacing.space3 },
  sectionTitle: { fontSize: fontSizes.fsBase, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.gray900 },

  dayRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.space3 },
  dayRowBorder: { borderTopWidth: 1, borderTopColor: colors.gray100 },
  dayLeft: { width: 56 },
  dayName: { fontSize: fontSizes.fsSm, fontWeight: fontWeights.fwSemibold, fontFamily: fontFamilies.interSemiBold, color: colors.gray900 },
  dayDate: { fontSize: fontSizes.fsXs, color: colors.gray400, fontFamily: fontFamilies.interRegular },
  dayMid: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.space2, flexWrap: 'wrap' },
  weatherTag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 3, paddingHorizontal: 8, borderRadius: radii.radiusFull, backgroundColor: colors.gray100 },
  weatherText: { fontSize: fontSizes.fsXs, color: colors.gray600, fontFamily: fontFamilies.interMedium },
  dayRight: { alignItems: 'flex-end', minWidth: 54 },
  dayPredicted: { fontSize: fontSizes.fsLg, fontWeight: fontWeights.fwExtrabold, fontFamily: fontFamilies.interExtraBold, color: colors.primary600 },
  dayConfidence: { fontSize: fontSizes.fsXs, color: colors.gray400, fontFamily: fontFamilies.interRegular },

  staffCard: { paddingVertical: spacing.space3, borderTopWidth: 1, borderTopColor: colors.gray100 },
  staffHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.space2, marginBottom: spacing.space2 },
  staffEmoji: { fontSize: 16 },
  staffName: { flex: 1, fontSize: fontSizes.fsSm, fontWeight: fontWeights.fwSemibold, fontFamily: fontFamilies.interSemiBold, color: colors.gray900 },
  staffBarRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.space2, marginBottom: spacing.space2 },
  staffBarTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.gray200, overflow: 'hidden' },
  staffBarFill: { height: 8, borderRadius: 4 },
  staffRatio: { fontSize: fontSizes.fsXs, fontWeight: fontWeights.fwSemibold, fontFamily: fontFamilies.interSemiBold, color: colors.gray600, minWidth: 34, textAlign: 'right' },
  staffMsg: { fontSize: fontSizes.fsXs, color: colors.gray600, fontFamily: fontFamilies.interRegular, lineHeight: 16 },
  staffGap: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: spacing.space2 },
  staffGapText: { fontSize: fontSizes.fsXs, color: colors.danger600, fontFamily: fontFamilies.interRegular },
  bold: { fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold },

  zoneGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.space3 },
  zoneCard: { width: '47%', flexGrow: 1, padding: spacing.space3, borderRadius: radii.radiusLg, borderWidth: 1 },
  zoneName: { fontSize: fontSizes.fsSm, fontWeight: fontWeights.fwSemibold, fontFamily: fontFamilies.interSemiBold, color: colors.gray700 },
  zoneDemand: { fontSize: fontSizes.fs2xl, fontWeight: fontWeights.fwExtrabold, fontFamily: fontFamilies.interExtraBold, color: colors.primary700, marginVertical: 2 },
  zoneBarTrack: { height: 5, borderRadius: 3, backgroundColor: 'rgba(79,70,229,0.15)', overflow: 'hidden' },
  zoneBarFill: { height: 5, borderRadius: 3, backgroundColor: colors.primary600 },

  generatingBox: { alignItems: 'center', gap: spacing.space2, paddingVertical: spacing.space8 },
  generatingTitle: { fontSize: fontSizes.fsBase, fontWeight: fontWeights.fwBold, fontFamily: fontFamilies.interBold, color: colors.gray900, marginTop: spacing.space2 },
  generatingSub: { fontSize: fontSizes.fsXs, color: colors.gray500, fontFamily: fontFamilies.interRegular, textAlign: 'center', paddingHorizontal: spacing.space6 },
});
