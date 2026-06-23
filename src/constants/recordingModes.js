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

export const TIMELAPSE_MODE_OPTIONS = [
  {
    value: 'normal',
    labelKey: 'timelapse.mode.normal.label',
    descriptionKey: 'timelapse.mode.normal.description',
  },
  {
    value: 'night',
    labelKey: 'timelapse.mode.night.label',
    descriptionKey: 'timelapse.mode.night.description',
  },
];

export const TIMELAPSE_FRAME_INTERVAL_OPTIONS = [
  {label: '0.1s', value: '100'},
  {label: '0.5s', value: '500'},
  {label: '1s', value: '1000'},
  {label: '3s', value: '3000'},
  {label: '6s', value: '6000'},
  {label: '12s', value: '12000'},
];

export const TIMELAPSE_MAX_DURATION_OPTIONS = [
  {labelKey: 'timelapse.duration.none', value: ''},
  {labelKey: 'timelapse.duration.1m', value: '60000'},
  {labelKey: 'timelapse.duration.3m', value: '180000'},
  {labelKey: 'timelapse.duration.10m', value: '600000'},
  {labelKey: 'timelapse.duration.20m', value: '1200000'},
  {labelKey: 'timelapse.duration.30m', value: '1800000'},
  {labelKey: 'timelapse.duration.60m', value: '3600000'},
  {labelKey: 'timelapse.duration.3h', value: '10800000'},
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

export function getTimelapseModeOptions(t) {
  const tx = typeof t === 'function' ? t : translate;

  return TIMELAPSE_MODE_OPTIONS.map(option => ({
    ...option,
    label: tx(option.labelKey),
    description: tx(option.descriptionKey),
  }));
}

export function getTimelapseMaxDurationOptions(t) {
  const tx = typeof t === 'function' ? t : translate;

  return TIMELAPSE_MAX_DURATION_OPTIONS.map(option => ({
    ...option,
    label: tx(option.labelKey),
  }));
}

export function getTimelapseSpeedFactor(intervalMs, fps = 30) {
  const intervalSeconds = Number(intervalMs) / 1000;
  const outputFps = Number(fps);

  if (
    !Number.isFinite(intervalSeconds) ||
    !Number.isFinite(outputFps) ||
    intervalSeconds <= 0 ||
    outputFps <= 0
  ) {
    return '15';
  }

  return String(Math.max(2, Math.round(intervalSeconds * outputFps)));
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
    const timelapseMode =
      settings.timelapseMode === 'night' ? 'night' : 'normal';
    const fps = timelapseMode === 'night' ? '24' : '30';

    return {
      ...settings,
      ...SPECIAL_RECORDING_PRESETS.timelapse,
      fps,
      lowLightBoost: timelapseMode === 'night',
      videoBitRate: timelapseMode === 'night' ? 'high' : 'normal',
      timelapseMode,
      timelapseIntervalMs: settings.timelapseIntervalMs,
      timelapseMaxDurationMs: settings.timelapseMaxDurationMs,
      timelapseSpeedFactor: getTimelapseSpeedFactor(
        settings.timelapseIntervalMs,
        fps,
      ),
    };
  }

  return settings;
}
