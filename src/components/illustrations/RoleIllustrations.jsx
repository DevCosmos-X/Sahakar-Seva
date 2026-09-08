import Svg, { Path, Circle, Rect, G, Line } from 'react-native-svg';
import { colors } from '@theme';

/**
 * RoleIllustrations — small, on-brand vector art for the login role cards.
 *
 * These are DECORATIVE ONLY (drawn with react-native-svg, already a project dependency — no new
 * package). They mirror the reference design's illustrations: a homeowner scene on the customer
 * card and a skilled-worker figure on the worker card. They are not interactive and carry no
 * behaviour; they simply make the existing "सेवा चाहिए" / "सेवा देना है" cards feel premium.
 *
 * Both are authored on a 96x88 viewBox and scale to whatever width/height the caller passes.
 */

/**
 * CustomerIllustration — a friendly homeowner in a doorway with a small potted plant.
 * Indigo/lavender palette to match the customer card.
 */
export function CustomerIllustration({ width = 92, height = 84 }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 96 88" fill="none">
      {/* soft rounded backdrop */}
      <Rect x="2" y="6" width="92" height="80" rx="14" fill={colors.primary100} />
      {/* doorway arch behind the figure */}
      <Path
        d="M40 86 V44 a14 14 0 0 1 28 0 V86 Z"
        fill={colors.primary200}
      />
      <Path
        d="M45 86 V45 a9 9 0 0 1 18 0 V86 Z"
        fill={colors.primary50}
      />
      {/* potted plant, left */}
      <Path d="M18 74 q-6 -14 0 -24 q6 10 0 24" fill={colors.success500} />
      <Path d="M18 76 q6 -12 0 -22 q-6 10 0 22" fill={colors.success600} />
      <Path d="M13 74 h12 l-2 10 h-8 Z" fill={colors.accent500} />
      {/* homeowner figure */}
      <Circle cx="54" cy="34" r="8" fill={colors.accent300} />
      <Path d="M54 26 a8 8 0 0 1 8 8 h-16 a8 8 0 0 1 8 -8 Z" fill={colors.primary700} />
      <Path
        d="M45 86 V58 a9 9 0 0 1 18 0 V86 Z"
        fill={colors.primary600}
      />
      {/* welcoming raised arm */}
      <Path d="M62 58 l9 -8 a3 3 0 0 1 4 4 l-9 9 Z" fill={colors.accent300} />
    </Svg>
  );
}

/**
 * WorkerIllustration — a confident skilled worker wearing a hard hat, arms crossed, with a wrench.
 * Amber/gold palette to match the worker card.
 */
export function WorkerIllustration({ width = 92, height = 84 }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 96 88" fill="none">
      {/* soft rounded backdrop */}
      <Rect x="2" y="6" width="92" height="80" rx="14" fill={colors.accent100} />
      {/* body / uniform */}
      <Path d="M30 86 V60 a18 18 0 0 1 36 0 V86 Z" fill={colors.primary700} />
      {/* crossed-arm sleeves */}
      <Path d="M34 66 l28 10 v6 l-28 -10 Z" fill={colors.primary600} />
      <Path d="M62 66 l-28 10 v6 l28 -10 Z" fill={colors.primary600} />
      {/* head */}
      <Circle cx="48" cy="40" r="10" fill={colors.accent300} />
      {/* hard hat */}
      <Path d="M34 38 a14 14 0 0 1 28 0 Z" fill={colors.accent500} />
      <Rect x="32" y="37" width="32" height="4" rx="2" fill={colors.accent600} />
      <Rect x="46" y="26" width="4" height="8" rx="2" fill={colors.accent600} />
      {/* wrench accent, bottom-right */}
      <G>
        <Line x1="70" y1="60" x2="82" y2="72" stroke={colors.accent600} strokeWidth="5" strokeLinecap="round" />
        <Circle cx="70" cy="60" r="5" fill="none" stroke={colors.accent600} strokeWidth="4" />
      </G>
    </Svg>
  );
}
