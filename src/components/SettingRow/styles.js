import {StyleSheet} from 'react-native';

import {cinematicTheme} from '../../theme/cinematicTheme';

const {colors, radii, typography} = cinematicTheme;

export const styles = StyleSheet.create({
  sectionTitle: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
    marginTop: 18,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    fontFamily: typography.mono.fontFamily,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 10,
  },
  rowText: {
    flex: 1,
    paddingRight: 10,
  },
  label: {
    color: colors.foreground,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
    fontFamily: typography.body.fontFamily,
  },
  description: {
    color: colors.mutedForeground,
    fontSize: 12,
    lineHeight: 17,
    fontFamily: typography.body.fontFamily,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radii.pill,
    backgroundColor: colors.surface2,
  },
  chipActive: {
    backgroundColor: 'rgba(247, 162, 36, 0.18)',
    borderColor: colors.accent,
  },
  chipDisabled: {
    opacity: 0.45,
  },
  chipText: {
    color: colors.foreground,
    fontSize: 13,
    fontWeight: '600',
    fontFamily: typography.body.fontFamily,
  },
  chipTextActive: {
    color: colors.accent,
  },
  fieldBlock: {
    marginBottom: 12,
  },
  sliderBlock: {
    marginBottom: 14,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 12,
    marginBottom: 6,
  },
  sliderValue: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '800',
    fontFamily: typography.mono.fontFamily,
    textAlign: 'right',
  },
  sliderTrackWrap: {
    marginTop: 10,
    height: 28,
    justifyContent: 'center',
  },
  sliderTrackWrapDisabled: {
    opacity: 0.45,
  },
  sliderTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 11,
    height: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sliderFill: {
    position: 'absolute',
    left: 0,
    top: 11,
    height: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
  },
  sliderThumb: {
    position: 'absolute',
    top: 4,
    width: 22,
    height: 22,
    marginLeft: -11,
    borderRadius: radii.pill,
    backgroundColor: colors.foreground,
    borderWidth: 2,
    borderColor: colors.accent,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: {width: 0, height: 3},
    elevation: 3,
  },
  sliderRangeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  sliderRangeLabel: {
    color: colors.mutedForeground,
    fontSize: 11,
    fontFamily: typography.mono.fontFamily,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.foreground,
    backgroundColor: colors.surface2,
    fontFamily: typography.body.fontFamily,
  },
});
