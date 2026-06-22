import {translate} from '../i18n/translations';

export const AUDIO_LIMITER_PRESET_OPTIONS = [
  {
    value: 'standard',
    labelKey: 'limiter.standard.label',
    descriptionKey: 'limiter.standard.description',
  },
  {
    value: 'gentle',
    labelKey: 'limiter.gentle.label',
    descriptionKey: 'limiter.gentle.description',
  },
  {
    value: 'strong',
    labelKey: 'limiter.strong.label',
    descriptionKey: 'limiter.strong.description',
  },
];

function localizeLimiterOption(option, t) {
  const tx = typeof t === 'function' ? t : translate;

  return {
    ...option,
    label: tx(option.labelKey),
    description: tx(option.descriptionKey),
  };
}

export function getAudioLimiterPresetOptions(t) {
  return AUDIO_LIMITER_PRESET_OPTIONS.map(option =>
    localizeLimiterOption(option, t),
  );
}

export function getAudioLimiterPresetOption(value, t) {
  const option =
    AUDIO_LIMITER_PRESET_OPTIONS.find(item => item.value === value) ??
    AUDIO_LIMITER_PRESET_OPTIONS[0];

  return localizeLimiterOption(option, t);
}
