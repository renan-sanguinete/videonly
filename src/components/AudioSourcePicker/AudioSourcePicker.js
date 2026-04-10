import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import {
  AUDIO_SOURCE_OPTIONS,
  UNPROCESSED_AUDIO_SOURCE,
} from '../../constants/audioSources';

export default function AudioSourcePicker({selectedSource, onSourceChange}) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Fonte de audio</Text>
      <Text style={styles.subtitle}>
        Para shows, baladas e ambientes muito altos, prefira Sem processamento.
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
        <Text style={styles.infoTitle}>Protecao contra clipping</Text>
        <Text style={styles.infoText}>
          Nesta fase, a melhor prevencao e evitar o processamento automatico do Android.
          Isso reduz risco de audio abafado, graves cortados e distorcao em ambientes de alto volume.
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
    color: '#f9fafb',
    fontSize: 16,
    fontWeight: '700',
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: 19,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#1f2937',
    backgroundColor: '#0f172a',
    padding: 14,
  },
  optionSelected: {
    borderColor: '#2563eb',
    backgroundColor: '#12203c',
  },
  optionRecommended: {
    borderColor: '#c0841a',
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: '#60a5fa',
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
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '700',
  },
  optionTitleSelected: {
    color: '#ffffff',
  },
  optionDescription: {
    color: '#cbd5e1',
    fontSize: 13,
    lineHeight: 18,
  },
  optionDescriptionSelected: {
    color: '#e2e8f0',
  },
  optionHelper: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 17,
  },
  badge: {
    color: '#facc15',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  infoBox: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#4338ca',
    backgroundColor: '#172554',
    padding: 14,
    gap: 6,
  },
  infoTitle: {
    color: '#dbeafe',
    fontSize: 14,
    fontWeight: '700',
  },
  infoText: {
    color: '#c7d2fe',
    fontSize: 12,
    lineHeight: 18,
  },
});
