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
    maxWidth: 320,
    borderRadius: radii.xl,
    paddingVertical: 24,
    paddingHorizontal: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  title: {
    marginTop: 16,
    color: colors.foreground,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    fontFamily: typography.display.fontFamily,
  },
  message: {
    marginTop: 10,
    color: colors.mutedForeground,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    fontFamily: typography.body.fontFamily,
  },
});
