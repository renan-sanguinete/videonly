import {StyleSheet} from 'react-native';

import {cinematicTheme} from '../../theme/cinematicTheme';

const {colors, radii, typography} = cinematicTheme;

export const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: colors.background},
  previewStage: {
    flex: 1,
    position: 'relative',
  },
  bottomOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 8,
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  panel: {
    backgroundColor: 'rgba(10, 7, 5, 0.9)',
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    minHeight: 168,
    maxHeight: 232,
    gap: 14,
    shadowOpacity: 0.24,
    shadowRadius: 18,
    shadowOffset: {width: 0, height: 10},
    elevation: 10,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  panelHeaderTitleWrap: {
    flex: 1,
    gap: 2,
  },
  panelHeaderTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  savedVideosRow: {
    minHeight: 84,
  },
  panelKicker: {
    color: colors.accent,
    fontFamily: typography.mono.fontFamily,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2.2,
    textTransform: 'uppercase',
  },
  panelTitle: {
    color: colors.foreground,
    fontSize: 18,
    fontWeight: '800',
    fontFamily: typography.display.fontFamily,
  },
  panelMeta: {
    color: colors.mutedForeground,
    fontSize: 11,
    fontFamily: typography.mono.fontFamily,
  },
  panelLink: {
    color: colors.accent,
    fontFamily: typography.mono.fontFamily,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  panelDivider: {
    height: 1,
    backgroundColor: 'rgba(250, 248, 245, 0.08)',
  },
  recordingMeterPanel: {
    gap: 8,
  },
  recordingMeterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  recordingMeterLabel: {
    color: colors.foreground,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.8,
    fontFamily: typography.mono.fontFamily,
  },
  recordingMeterValue: {
    color: colors.mutedForeground,
    fontSize: 12,
    fontWeight: '700',
    fontFamily: typography.mono.fontFamily,
    fontVariant: ['tabular-nums'],
  },
  recordingMeterValueClip: {
    color: colors.rec,
  },
  recordingMeterTrack: {
    position: 'relative',
    height: 12,
    borderRadius: radii.pill,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  recordingMeterFill: {
    height: '100%',
    borderRadius: radii.pill,
  },
  recordingMeterFillSafe: {
    backgroundColor: colors.success,
  },
  recordingMeterFillWarn: {
    backgroundColor: colors.warning,
  },
  recordingMeterFillClip: {
    backgroundColor: colors.rec,
  },
  recordingMeterThreshold: {
    position: 'absolute',
    right: '4%',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: 'rgba(255, 47, 58, 0.9)',
  },
  recordingMeterHint: {
    color: colors.mutedForeground,
    fontSize: 11,
    lineHeight: 15,
    fontFamily: typography.body.fontFamily,
  },
  recordingPanelSpacer: {
    flex: 1,
  },
  panelActions: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 2,
  },
  panelActionButton: {
    flex: 1,
    alignItems: 'center',
  },
  panelActionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  panelActionIconDanger: {
    borderColor: colors.destructiveSoftBorder,
    backgroundColor: colors.destructiveSoft,
  },
  panelActionLabel: {
    color: colors.foreground,
    fontSize: 10,
    fontWeight: '400',
    textAlign: 'center',
    fontFamily: typography.body.fontFamily,
  },
  savedVideosContent: {
    gap: 12,
    paddingHorizontal: 0,
    paddingRight: 18,
  },
  savedVideosViewport: {
    position: 'relative',
    overflow: 'hidden',
  },
  emptyText: {
    color: colors.mutedForeground,
    fontSize: 12,
    fontFamily: typography.body.fontFamily,
  },
  savedVideosLoading: {
    flex: 1,
    minHeight: 78,
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 10,
  },
  savedVideosLoadingText: {
    color: colors.mutedForeground,
    fontSize: 13,
    fontFamily: typography.body.fontFamily,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: colors.background,
  },
  title: {
    color: colors.foreground,
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: typography.display.fontFamily,
  },
  subtitle: {
    color: colors.mutedForeground,
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 21,
    fontFamily: typography.body.fontFamily,
  },
  primaryButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    color: colors.accentForeground,
    fontWeight: '800',
    fontFamily: typography.body.fontFamily,
  },
});
