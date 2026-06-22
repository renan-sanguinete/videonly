import {translate} from '../i18n/translations';

export const AUDIO_SOURCE_OPTIONS = [
  {
    value: 0,
    key: 'DEFAULT',
    labelKey: 'audioSource.default.label',
    shortLabelKey: 'audioSource.default.shortLabel',
    descriptionKey: 'audioSource.default.description',
    helperKey: 'audioSource.default.helper',
    isRecommended: false,
  },
  {
    value: 1,
    key: 'MIC',
    labelKey: 'audioSource.mic.label',
    shortLabelKey: 'audioSource.mic.shortLabel',
    descriptionKey: 'audioSource.mic.description',
    helperKey: 'audioSource.mic.helper',
    isRecommended: false,
  },
  {
    value: 5,
    key: 'CAMCORDER',
    labelKey: 'audioSource.camera.label',
    shortLabelKey: 'audioSource.camera.shortLabel',
    descriptionKey: 'audioSource.camera.description',
    helperKey: 'audioSource.camera.helper',
    isRecommended: false,
  },
  {
    value: 6,
    key: 'VOICE_RECOGNITION',
    labelKey: 'audioSource.voice.label',
    shortLabelKey: 'audioSource.voice.shortLabel',
    descriptionKey: 'audioSource.voice.description',
    helperKey: 'audioSource.voice.helper',
    isRecommended: false,
  },
  {
    value: 9,
    key: 'UNPROCESSED',
    labelKey: 'audioSource.unprocessed.label',
    shortLabelKey: 'audioSource.unprocessed.shortLabel',
    descriptionKey: 'audioSource.unprocessed.description',
    helperKey: 'audioSource.unprocessed.helper',
    isRecommended: true,
  },
];

export const UNPROCESSED_AUDIO_SOURCE = 9;

function localizeAudioSourceOption(option, t) {
  const tx = typeof t === 'function' ? t : translate;

  return {
    ...option,
    label: tx(option.labelKey),
    shortLabel: tx(option.shortLabelKey),
    description: tx(option.descriptionKey),
    helper: tx(option.helperKey),
  };
}

export function getAudioSourceOptions(t) {
  return AUDIO_SOURCE_OPTIONS.map(option => localizeAudioSourceOption(option, t));
}

export function getAudioSourceOption(value, t) {
  const option =
    AUDIO_SOURCE_OPTIONS.find(item => item.value === value) ??
    AUDIO_SOURCE_OPTIONS.find(item => item.value === UNPROCESSED_AUDIO_SOURCE) ??
    AUDIO_SOURCE_OPTIONS[0];

  return localizeAudioSourceOption(option, t);
}
