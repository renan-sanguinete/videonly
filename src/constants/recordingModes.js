import {translate} from '../i18n/translations';

export const RECORDING_MODE_OPTIONS = [
  {
    value: 'normal',
    labelKey: 'recording.normal.label',
    indicatorLabelKey: '',
    icon: 'radio-button-on-outline',
  },
  {
    value: 'slowMotion',
    labelKey: 'recording.slowMotion.label',
    indicatorLabelKey: 'recording.slowMotion.label',
    icon: 'play-skip-back-outline',
  },
  {
    value: 'timelapse',
    labelKey: 'recording.timelapse.label',
    indicatorLabelKey: 'recording.timelapse.label',
    icon: 'timer-outline',
  },
];

export const SLOW_MOTION_DURATION_OPTIONS = [
  {label: '3s', value: '3000'},
  {label: '5s', value: '5000'},
  {label: '10s', value: '10000'},
];

export const SPECIAL_RECORDING_PRESETS = {
  slowMotion: {
    audio: false,
    recordFileType: 'mp4',
    recordVideoCodec: 'h264',
    videoResolutionPreset: '720p',
    videoBitRate: 'normal',
    fps: '60',
    slowMotionTargetFps: '60',
    slowMotionPlaybackFps: '30',
    lowLightBoost: false,
    videoHdr: false,
  },
  timelapse: {
    audio: false,
    recordFileType: 'mp4',
    recordVideoCodec: 'h264',
    videoResolutionPreset: '1080p',
    videoBitRate: 'normal',
    fps: '30',
    timelapseSpeedFactor: '8',
    lowLightBoost: false,
    videoHdr: false,
  },
};

function localizeRecordingModeOption(option, t) {
  const tx = typeof t === 'function' ? t : translate;

  return {
    ...option,
    label: tx(option.labelKey),
    indicatorLabel: option.indicatorLabelKey
      ? tx(option.indicatorLabelKey)
      : '',
  };
}

export function getRecordingModeOptions(t) {
  return RECORDING_MODE_OPTIONS.map(option =>
    localizeRecordingModeOption(option, t),
  );
}

export function getRecordingModeOption(value, t) {
  const option =
    RECORDING_MODE_OPTIONS.find(item => item.value === value) ??
    RECORDING_MODE_OPTIONS[0];

  return localizeRecordingModeOption(option, t);
}

export function getCaptureSettingsForRecordingMode(settings) {
  if (settings.recordingMode === 'slowMotion') {
    return {
      ...settings,
      ...SPECIAL_RECORDING_PRESETS.slowMotion,
      slowMotionMaxDurationMs: settings.slowMotionMaxDurationMs,
    };
  }

  if (settings.recordingMode === 'timelapse') {
    return {
      ...settings,
      ...SPECIAL_RECORDING_PRESETS.timelapse,
    };
  }

  return settings;
}
