export const AUDIO_LIMITER_PRESET_OPTIONS = [
  {
    value: 'standard',
    label: 'Padrão',
    description: 'Mantém o comportamento atual do limiter.',
  },
  {
    value: 'gentle',
    label: 'Suave',
    description: 'Protege menos, preservando mais dinâmica.',
  },
  {
    value: 'strong',
    label: 'Forte',
    description: 'Protege mais, reduzindo picos com mais agressividade.',
  },
];

export function getAudioLimiterPresetOption(value) {
  return (
    AUDIO_LIMITER_PRESET_OPTIONS.find(option => option.value === value) ??
    AUDIO_LIMITER_PRESET_OPTIONS[0]
  );
}
