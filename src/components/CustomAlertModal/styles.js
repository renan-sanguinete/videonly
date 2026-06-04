import {StyleSheet} from 'react-native';

import {cinematicTheme} from '../../theme/cinematicTheme';

const {colors, radii, typography} = cinematicTheme;

export const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlayHeavy,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: radii.xl,
    padding: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#020617',
    shadowOpacity: 0.38,
    shadowRadius: 28,
    shadowOffset: {width: 0, height: 18},
    elevation: 18,
  },
  header: {
    gap: 10,
  },
  title: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    fontFamily: typography.mono.fontFamily,
  },
  message: {
    color: colors.mutedForeground,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: typography.body.fontFamily,
  },
  actions: {
    marginTop: 24,
    gap: 10,
  },
  actionsRow: {
    flexDirection: 'row',
  },
  actionsColumn: {
    flexDirection: 'column',
  },
  buttonBase: {
    minHeight: 50,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  buttonInline: {
    flex: 1,
  },
  buttonStacked: {
    width: '100%',
    flexShrink: 1,
  },
  primaryButton: {
    backgroundColor: colors.accent,
  },
  secondaryButton: {
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  destructiveButton: {
    backgroundColor: 'rgba(255, 47, 58, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255, 47, 58, 0.42)',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '800',
    fontFamily: typography.body.fontFamily,
  },
  primaryButtonText: {
    color: colors.accentForeground,
  },
  secondaryButtonText: {
    color: colors.foreground,
  },
  destructiveButtonText: {
    color: colors.rec,
  },
});
