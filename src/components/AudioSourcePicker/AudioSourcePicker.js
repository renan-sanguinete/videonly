import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import {
  AUDIO_SOURCE_OPTIONS,
  UNPROCESSED_AUDIO_SOURCE,
} from '../../constants/audioSources';
import {cinematicTheme} from '../../theme/cinematicTheme';

const {colors, radii, typography} = cinematicTheme;

export default function AudioSourcePicker({selectedSource, onSourceChange}) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Fonte de áudio</Text>
      <Text style={styles.subtitle}>
        Para shows, baladas e ambientes muito altos, prefira a opção Sem processamento.
      </Text>

      {AUDIO_SOURCE_OPTIONS.map(option => {
        const selected = selectedSource === option.value;
        const highlighted = option.value === UNPROCESSED_AUDIO_SOURCE;

        return (
          <Pressable
            key={option.value}
            onPress={() => onSourceChange(option.value)}
            style={[
              styles.option,
              selected && styles.optionSelected,
              highlighted && styles.optionRecommended,
            ]}>
            <View style={styles.radioOuter}>
              {selected ? <View style={styles.radioInner} /> : null}
            </View>

            <View style={styles.optionBody}>
              <View style={styles.optionHeader}>
                <Text style={[styles.optionTitle, selected && styles.optionTitleSelected]}>
                  {option.label}
                </Text>
                {highlighted ? <Text style={styles.badge}>Recomendado</Text> : null}
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
        <Text style={styles.infoTitle}>Proteção contra clipping</Text>
        <Text style={styles.infoText}>
          Nesta fase, a melhor prevenção é combinar Sem processamento com captação em mono.
          Isso reduz o risco de áudio abafado, graves cortados e distorção em ambientes de alto volume.
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
  optionRecommended: {
    borderColor: colors.accent,
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
