import {StyleSheet} from 'react-native';

import {cinematicTheme} from '../../theme/cinematicTheme';

const {colors, typography} = cinematicTheme;

export const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  selectedCard: {
    borderColor: colors.accent,
    borderWidth: 1.5,
    backgroundColor: colors.surface2,
    shadowColor: colors.accent,
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: {width: 0, height: 0},
    elevation: 4,
  },
  compactCard: {
    width: 112,
    height: 76,
    borderRadius: 12,
    padding: 2,
  },
  thumbWrap: {
    width: 116,
    height: 82,
    borderRadius: 12,
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
    backgroundColor: 'rgba(21, 16, 12, 0.58)',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(250, 248, 245, 0.14)',
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
    gap: 5,
  },
  name: {
    color: colors.foreground,
    fontWeight: '800',
    fontSize: 16,
    fontFamily: typography.display.fontFamily,
  },
  meta: {
    color: colors.mutedForeground,
    fontSize: 11,
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
