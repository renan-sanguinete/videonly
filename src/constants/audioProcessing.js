export const AUDIO_LIMITER_PRESET_OPTIONS = [
  {
    value: 'standard',
    label: 'Padrão',
    description: 'Equilibra redução leve de ruído, suavização de clipping e limitador.',
  },
  {
    value: 'gentle',
    label: 'Suave',
    description: 'Aplica correções discretas, preservando mais dinâmica.',
  },
  {
    value: 'strong',
    label: 'Forte',
    description: 'Reforça redução de ruído baixo e suavização de picos clipados.',
  },
];

export function getAudioLimiterPresetOption(value) {
  return (
    AUDIO_LIMITER_PRESET_OPTIONS.find(option => option.value === value) ??
    AUDIO_LIMITER_PRESET_OPTIONS[0]
  );
}
