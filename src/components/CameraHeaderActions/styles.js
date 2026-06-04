import {StyleSheet} from 'react-native';
import {cinematicTheme} from '../../theme/cinematicTheme';

const {colors, radii, typography} = cinematicTheme;

export const styles = StyleSheet.create({
  headerActions: {
    width: '100%',
    flexDirection: 'row',
    paddingHorizontal: 14,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  rightGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  headerIconButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerIconButtonDisabled: {
    opacity: 0.35,
  },
  headerOptimizationButton: {
    marginRight: 4,
  },
  headerAmbientButton: {
    marginRight: 4,
  },
  optimizationMenuExpanded: {
    width: '100%',
    borderRadius: radii.lg,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 18,
    shadowOffset: {width: 0, height: 10},
    elevation: 12,
  },
  optimizationMenuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optimizationMenuTitle: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 2.2,
  },
  optimizationCloseButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optimizationMenuOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  optimizationOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  optimizationOptionIconWrap: {
    width: 52,
    height: 52,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optimizationOptionIconWrapSelected: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(247, 162, 36, 0.14)',
  },
  optimizationOptionLabel: {
    color: colors.foreground,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 16,
  },
  optimizationOptionLabelSelected: {
    color: colors.accent,
  },
  ambientAnalysisOptionDescription: {
    color: colors.mutedForeground,
    fontSize: 11,
    lineHeight: 15,
    fontFamily: typography.body.fontFamily,
  },
  optimizationButtonNone: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
  },
  optimizationButtonVideo: {
    borderWidth: 1,
    borderColor: colors.info,
    backgroundColor: 'rgba(59, 172, 218, 0.12)',
  },
  optimizationButtonAudio: {
    borderWidth: 1,
    borderColor: colors.success,
    backgroundColor: 'rgba(53, 193, 119, 0.12)',
  },
  optimizationButtonBoth: {
    borderWidth: 1,
    borderColor: colors.rec,
    backgroundColor: 'rgba(255, 47, 58, 0.12)',
  },
  ambientAnalysisButtonNone: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
  },
  ambientAnalysisButtonActive: {
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: 'rgba(247, 162, 36, 0.14)',
  },
  ambientAnalysisButtonRunning: {
    borderWidth: 1,
    borderColor: colors.success,
    backgroundColor: 'rgba(53, 193, 119, 0.12)',
  },
});
