import {translate} from '../i18n/translations';

export const MEDIA_OPTIMIZATION_MODES = [
  {
    value: 'none',
    labelKey: 'media.none.label',
    shortLabelKey: 'media.none.shortLabel',
    descriptionKey: 'media.none.description',
    helperKey: 'media.none.helper',
    iconColor: '#ffffff',
    icon: 'power-outline',
  },
  {
    value: 'video',
    labelKey: 'media.video.label',
    shortLabelKey: 'media.video.shortLabel',
    descriptionKey: 'media.video.description',
    helperKey: 'media.video.helper',
    iconColor: '#60a5fa',
    icon: 'videocam-outline',
  },
  {
    value: 'audio',
    labelKey: 'media.audio.label',
    shortLabelKey: 'media.audio.shortLabel',
    descriptionKey: 'media.audio.description',
    helperKey: 'media.audio.helper',
    iconColor: '#4ade80',
    icon: 'mic-outline',
  },
  {
    value: 'both',
    labelKey: 'media.both.label',
    shortLabelKey: 'media.both.shortLabel',
    descriptionKey: 'media.both.description',
    helperKey: 'media.both.helper',
    iconColor: '#f87171',
    icon: 'layers-outline',
  },
];

function localizeMediaOptimizationMode(option, t) {
  const tx = typeof t === 'function' ? t : translate;

  return {
    ...option,
    label: tx(option.labelKey),
    shortLabel: tx(option.shortLabelKey),
    description: tx(option.descriptionKey),
    helper: tx(option.helperKey),
  };
}

export function getMediaOptimizationModes(t) {
  return MEDIA_OPTIMIZATION_MODES.map(option =>
    localizeMediaOptimizationMode(option, t),
  );
}

export function getMediaOptimizationModeOption(value, t) {
  const option =
    MEDIA_OPTIMIZATION_MODES.find(item => item.value === value) ??
    MEDIA_OPTIMIZATION_MODES[0];

  return localizeMediaOptimizationMode(option, t);
}

export function getMediaOptimizationPatch(value) {
  const mode = getMediaOptimizationModeOption(value).value;

  return {
    optimizationMode: mode,
    compressVideoBeforeSave: mode === 'video' || mode === 'both',
    applyAudioCleanup: mode === 'audio' || mode === 'both',
  };
}

export function applyMediaOptimizationMode(settings, value) {
  return {
    ...settings,
    ...getMediaOptimizationPatch(value),
  };
}

export function getDerivedMediaOptimizationMode(settings) {
  if (settings.optimizationMode) {
    return getMediaOptimizationModeOption(settings.optimizationMode).value;
  }

  if (settings.applyAudioCleanup && !settings.compressVideoBeforeSave) {
    return 'audio';
  }

  if (settings.compressVideoBeforeSave) {
    return settings.applyAudioCleanup ? 'both' : 'video';
  }

  return 'none';
}
