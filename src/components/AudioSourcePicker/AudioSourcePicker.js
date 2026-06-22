import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import {getAudioSourceOptions} from '../../constants/audioSources';
import {useI18n} from '../../i18n/I18nContext';
import {cinematicTheme} from '../../theme/cinematicTheme';

const {colors, radii, typography} = cinematicTheme;

export default function AudioSourcePicker({selectedSource, onSourceChange}) {
  const {t} = useI18n();
  const audioSourceOptions = getAudioSourceOptions(t);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('audioSourcePicker.title')}</Text>

      {audioSourceOptions.map(option => {
        const selected = selectedSource === option.value;

        return (
          <Pressable
            key={option.value}
            onPress={() => onSourceChange(option.value)}
            style={[
              styles.option,
              selected && styles.optionSelected,
            ]}>
            <View style={styles.radioOuter}>
              {selected ? <View style={styles.radioInner} /> : null}
            </View>

            <View style={styles.optionBody}>
              <View style={styles.optionHeader}>
                <Text style={[styles.optionTitle, selected && styles.optionTitleSelected]}>
                  {option.label}
                </Text>
              </View>

              <Text
                style={[
                  styles.optionDescription,
                  selected && styles.optionDescriptionSelected,
                ]}>
                {option.description}
              </Text>
              <Text style={styles.optionHelper}>{option.helper}</Text>
            </View>
          </Pressable>
        );
      })}

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>
          {t('audioSourcePicker.infoTitle')}
        </Text>
        <Text style={styles.infoText}>
          {t('audioSourcePicker.infoText')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  title: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: '700',
    fontFamily: typography.body.fontFamily,
  },
  subtitle: {
    color: colors.mutedForeground,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: typography.body.fontFamily,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    padding: 14,
  },
  optionSelected: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(247, 162, 36, 0.08)',
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: colors.accent,
  },
  optionBody: {
    flex: 1,
    gap: 4,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  optionTitle: {
    color: colors.foreground,
    fontSize: 15,
    fontWeight: '700',
    fontFamily: typography.body.fontFamily,
  },
  optionTitleSelected: {
    color: colors.accent,
  },
  optionDescription: {
    color: colors.mutedForeground,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: typography.body.fontFamily,
  },
  optionDescriptionSelected: {
    color: colors.foreground,
  },
  optionHelper: {
    color: colors.mutedForeground,
    fontSize: 12,
    lineHeight: 17,
    fontFamily: typography.mono.fontFamily,
  },
  badge: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    fontFamily: typography.mono.fontFamily,
  },
  infoBox: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(53, 193, 119, 0.35)',
    backgroundColor: 'rgba(53, 193, 119, 0.08)',
    padding: 14,
    gap: 6,
  },
  infoTitle: {
    color: colors.success,
    fontSize: 14,
    fontWeight: '700',
    fontFamily: typography.body.fontFamily,
  },
  infoText: {
    color: colors.mutedForeground,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: typography.body.fontFamily,
  },
});
