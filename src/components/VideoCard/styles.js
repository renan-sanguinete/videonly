import {StyleSheet} from 'react-native';

import {cinematicTheme} from '../../theme/cinematicTheme';

const {colors, radii, typography} = cinematicTheme;

export const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  selectedCard: {
    borderColor: colors.accent,
    borderWidth: 2,
    backgroundColor: colors.surface2,
  },
  compactCard: {
    width: 112,
    height: 76,
    borderRadius: radii.md,
    padding: 2,
  },
  thumbWrap: {
    width: 96,
    height: 96,
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: colors.surface2,
    position: 'relative',
  },
  compactThumbWrap: {
    height: 64,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.surface2,
    marginBottom: 6,
    position: 'relative',
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  thumbFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(21, 16, 12, 0.74)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationBadge: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    backgroundColor: 'rgba(21, 16, 12, 0.84)',
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  durationText: {
    color: colors.foreground,
    fontSize: 9,
    fontWeight: '700',
    fontFamily: typography.mono.fontFamily,
    fontVariant: ['tabular-nums'],
  },
  content: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: colors.foreground,
    fontWeight: '800',
    fontSize: 15,
    marginBottom: 4,
    fontFamily: typography.display.fontFamily,
  },
  meta: {
    color: colors.mutedForeground,
    fontSize: 10,
    marginBottom: 2,
    fontFamily: typography.mono.fontFamily,
  },
  compactMeta: {
    color: colors.mutedForeground,
    fontSize: 9,
    paddingLeft: 2,
    fontFamily: typography.mono.fontFamily,
  },
  path: {
    color: colors.mutedForeground,
    fontSize: 11,
    marginTop: 8,
    lineHeight: 16,
  },
});
