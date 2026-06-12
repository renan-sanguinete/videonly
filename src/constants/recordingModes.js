export const RECORDING_MODE_OPTIONS = [
  {
    value: 'normal',
    label: 'Normal',
    indicatorLabel: '',
    icon: 'radio-button-on-outline',
  },
  {
    value: 'slowMotion',
    label: 'Slow Motion',
    indicatorLabel: 'Slow Motion',
    icon: 'play-skip-back-outline',
  },
  {
    value: 'timelapse',
    label: 'Timelapse',
    indicatorLabel: 'Timelapse',
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

export function getRecordingModeOption(value) {
  return (
    RECORDING_MODE_OPTIONS.find(option => option.value === value) ??
    RECORDING_MODE_OPTIONS[0]
  );
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
