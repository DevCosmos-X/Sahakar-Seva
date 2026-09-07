import { Modal as RNModal, View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { X } from 'lucide-react-native';
import { colors, spacing, radii, shadows, glass, fontSizes, fontWeights, fontFamilies, zIndex } from '@theme';

/**
 * Modal — ported from web components/ui/Modal.jsx + Modal.css.
 *
 * Same API: isOpen, onClose, title, size ('sm'|'md'|'lg'), children. Adds `hideClose`
 * (used by InitialLanguageModal) which the web Modal supported implicitly via a prop that
 * InitialLanguageModal passed.
 *
 * Key differences from web, all deliberate:
 *  - Uses RN's native <Modal>, which handles the scroll-lock the web version faked with
 *    `document.body.style.overflow = 'hidden'`. That effect is DELETED (not ported) per the
 *    migration plan — RN's Modal already prevents background interaction.
 *  - Backdrop dismiss: web used onClick on the overlay + stopPropagation on the panel. RN
 *    equivalent is a full-screen Pressable backdrop with the panel as a non-press child.
 *  - backdrop-filter blur on the overlay → flattened dark scrim (glass.overlayBackground).
 *  - scaleIn entry animation → RN Modal's built-in 'fade' animationType (close enough; a
 *    spring scale-in can be re-added with Reanimated in Phase 12 if desired).
 */

const MAX_WIDTHS = {
  sm: 400,
  md: 560,
  lg: 720,
};

export default function Modal({ isOpen, onClose, title, children, size = 'md', hideClose = false }) {
  const maxWidth = MAX_WIDTHS[size] || MAX_WIDTHS.md;

  return (
    <RNModal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        {/* Panel: stop the press from bubbling to the backdrop by giving it its own
            onPress that does nothing. */}
        <Pressable style={[styles.modal, { maxWidth }]} onPress={() => {}}>
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            {!hideClose && (
              <Pressable style={styles.close} onPress={onClose} accessibilityLabel="Close modal">
                <X size={20} color={colors.gray500} />
              </Pressable>
            )}
          </View>
          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            {children}
          </ScrollView>
        </Pressable>
      </Pressable>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: glass.overlayBackground,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.space4,
    zIndex: zIndex.zModalBackdrop,
  },
  modal: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: colors.surfaceWhite,
    borderRadius: radii.radiusXl,
    ...shadows.shadowXl,
    zIndex: zIndex.zModal,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.space6,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  title: {
    flex: 1,
    fontSize: fontSizes.fsLg,
    fontWeight: fontWeights.fwSemibold,
    fontFamily: fontFamilies.interSemiBold,
    color: colors.gray900,
  },
  close: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.radiusMd,
  },
  body: {
    flexGrow: 0,
  },
  bodyContent: {
    padding: spacing.space6,
  },
});
