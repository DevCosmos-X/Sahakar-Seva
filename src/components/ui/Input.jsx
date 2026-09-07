import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { Mic } from 'lucide-react-native';
import { colors, spacing, radii, fontSizes, fontWeights, fontFamilies, lineHeights } from '@theme';

/**
 * Input (default export) + TextArea (named export) — ported from web
 * components/ui/Input.jsx + Input.css.
 *
 * Same API: label, placeholder, value, onChange, error, icon (left), showMic, onMicClick,
 * disabled, required, plus TextArea's rows.
 *
 * onChange bridge: web passes a DOM event and call sites read e.target.value. RN's
 * onChangeText passes the string directly. To stay 1:1 with ported call sites that expect
 * `onChange`, this synthesizes a minimal `{ target: { value } }` object so existing handlers
 * keep working unchanged. Call sites written fresh for mobile can use onChangeText instead.
 *
 * The focus ring (box-shadow) is emulated with a border-color swap on focus, since RN has no
 * box-shadow spread on TextInput. Left icon + mic button positioning ported from the
 * absolute-positioned CSS to a fl[ex row with the input flexed between the two affordances.
 */

function useSyntheticChange(onChange, onChangeText) {
  return (text) => {
    if (onChangeText) onChangeText(text);
    if (onChange) onChange({ target: { value: text } });
  };
}

export default function Input({
  label,
  placeholder,
  value,
  onChange,
  onChangeText,
  error,
  icon: Icon,
  showMic = false,
  onMicClick,
  disabled = false,
  required = false,
  style,
  ...props
}) {
  const [focused, setFocused] = useState(false);
  const handleChange = useSyntheticChange(onChange, onChangeText);

  return (
    <View style={[styles.group, style]}>
      {label != null && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}
      <View style={styles.wrapper}>
        {Icon && (
          <View style={styles.iconLeft}>
            <Icon size={18} color={colors.gray400} />
          </View>
        )}
        <TextInput
          value={value}
          onChangeText={handleChange}
          placeholder={placeholder}
          placeholderTextColor={colors.gray400}
          editable={!disabled}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[
            styles.field,
            Icon && styles.hasIconLeft,
            showMic && styles.hasIconRight,
            focused && styles.fieldFocused,
            error && styles.fieldError,
          ]}
          {...props}
        />
        {showMic && (
          <Pressable style={styles.micBtn} onPress={onMicClick} accessibilityLabel="Speak to type">
            <Mic size={18} color={colors.primary600} />
          </Pressable>
        )}
      </View>
      {error != null && error !== '' && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

export function TextArea({
  label,
  placeholder,
  value,
  onChange,
  onChangeText,
  error,
  showMic = false,
  onMicClick,
  micActive = false,
  rows = 4,
  required = false,
  style,
  ...props
}) {
  const [focused, setFocused] = useState(false);
  const handleChange = useSyntheticChange(onChange, onChangeText);

  return (
    <View style={[styles.group, style]}>
      {label != null && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}
      <View style={styles.wrapper}>
        <TextInput
          value={value}
          onChangeText={handleChange}
          placeholder={placeholder}
          placeholderTextColor={colors.gray400}
          multiline
          numberOfLines={rows}
          textAlignVertical="top"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[
            styles.field,
            styles.textarea,
            showMic && styles.hasIconRight,
            focused && styles.fieldFocused,
            error && styles.fieldError,
          ]}
          {...props}
        />
        {showMic && (
          <Pressable
            style={[styles.micBtn, styles.textareaMic, micActive && styles.micBtnActive]}
            onPress={onMicClick}
            accessibilityLabel={micActive ? 'Listening — tap to stop' : 'Speak to type'}
          >
            <Mic size={18} color={micActive ? colors.white : colors.primary600} />
          </Pressable>
        )}
      </View>
      {error != null && error !== '' && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: spacing.space2,
  },
  label: {
    fontSize: fontSizes.fsSm,
    fontWeight: fontWeights.fwMedium,
    fontFamily: fontFamilies.interMedium,
    color: colors.gray700,
  },
  required: {
    color: colors.danger500,
  },
  wrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  field: {
    width: '100%',
    paddingVertical: spacing.space3,
    paddingHorizontal: spacing.space4,
    borderWidth: 2,
    borderColor: colors.gray200,
    borderRadius: radii.radiusMd,
    fontSize: fontSizes.fsBase,
    fontFamily: fontFamilies.interRegular,
    color: colors.gray900,
    backgroundColor: colors.surfaceWhite,
  },
  hasIconLeft: {
    paddingLeft: 42,
  },
  hasIconRight: {
    paddingRight: 42,
  },
  fieldFocused: {
    borderColor: colors.primary500,
  },
  fieldError: {
    borderColor: colors.danger500,
  },
  iconLeft: {
    position: 'absolute',
    left: 12,
    zIndex: 1,
  },
  micBtn: {
    position: 'absolute',
    right: 8,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.radiusFull,
    backgroundColor: colors.primary50,
  },
  micBtnActive: {
    backgroundColor: colors.danger500,
  },
  textarea: {
    minHeight: 100,
    lineHeight: fontSizes.fsBase * lineHeights.lhRelaxed,
  },
  textareaMic: {
    top: 8,
    right: 8,
  },
  errorText: {
    fontSize: fontSizes.fsXs,
    fontWeight: fontWeights.fwMedium,
    fontFamily: fontFamilies.interMedium,
    color: colors.danger600,
  },
});
