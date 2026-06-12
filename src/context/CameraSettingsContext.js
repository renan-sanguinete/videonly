import React, {createContext, useContext, useEffect, useMemo, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {UNPROCESSED_AUDIO_SOURCE} from '../constants/audioSources';
import {getDerivedAudioProfile} from '../constants/audioProfiles';
import {getAudioLimiterPresetOption} from '../constants/audioProcessing';
import {
  getDerivedMediaOptimizationMode,
  getMediaOptimizationPatch,
} from '../constants/mediaOptimization';
import {getRecordingModeOption} from '../constants/recordingModes';

const CameraSettingsContext = createContext(null);
const CAMERA_SETTINGS_STORAGE_KEY = '@videonly/camera-settings';

const DEFAULT_SETTINGS = {
  audio: true,
  audioProfile: 'live-safe',
  audioCodec: 'aac',
  audioChannels: 'mono',
  audioSampleRate: '48000',
  audioBitRateKbps: '256',
  audioGain: -9,
  audioSource: UNPROCESSED_AUDIO_SOURCE,
  optimizationMode: 'none',
  applyAudioCleanup: false,
  audioLimiterPreset: 'standard',
  normalizeAudioLoudness: false,
  showAudioStatus: false,
  showAudioLevelMeter: false,
  compressVideoBeforeSave: false,
  recordFileType: 'mp4',
  recordVideoCodec: 'h264',
  recordingMode: 'normal',
  slowMotionTargetFps: '120',
  slowMotionPlaybackFps: '30',
  slowMotionMaxDurationMs: '5000',
  timelapseIntervalMs: '1000',
  timelapseOutputFps: '24',
  timelapseSpeedFactor: '8',
  videoResolutionPreset: 'auto',
  enableZoomGesture: true,
  lowLightBoost: false,
  videoHdr: false,
  torch: 'off',
  resizeMode: 'cover',
  videoBitRate: 'normal',
  fps: '',
  zoom: '',
  exposure: '',
  formatIndex: '',
};

function normalizePersistedSettings(parsedSettings) {
  if (!parsedSettings || typeof parsedSettings !== 'object') {
    return null;
  }

  const normalized = {...parsedSettings};
  normalized.video = true;
  normalized.preview = true;
  normalized.recordingMode = getRecordingModeOption(
    normalized.recordingMode,
  ).value;
  if (
    normalized.slowMotionTargetFps === undefined ||
    normalized.slowMotionTargetFps === null
  ) {
    normalized.slowMotionTargetFps = DEFAULT_SETTINGS.slowMotionTargetFps;
  }
  if (
    normalized.slowMotionPlaybackFps === undefined ||
    normalized.slowMotionPlaybackFps === null
  ) {
    normalized.slowMotionPlaybackFps = DEFAULT_SETTINGS.slowMotionPlaybackFps;
  }
  if (
    normalized.slowMotionMaxDurationMs === undefined ||
    normalized.slowMotionMaxDurationMs === null
  ) {
    normalized.slowMotionMaxDurationMs =
      DEFAULT_SETTINGS.slowMotionMaxDurationMs;
  }
  if (
    normalized.timelapseIntervalMs === undefined ||
    normalized.timelapseIntervalMs === null
  ) {
    normalized.timelapseIntervalMs = DEFAULT_SETTINGS.timelapseIntervalMs;
  }
  if (
    normalized.timelapseOutputFps === undefined ||
    normalized.timelapseOutputFps === null
  ) {
    normalized.timelapseOutputFps = DEFAULT_SETTINGS.timelapseOutputFps;
  }
  if (
    normalized.timelapseSpeedFactor === undefined ||
    normalized.timelapseSpeedFactor === null
  ) {
    normalized.timelapseSpeedFactor = DEFAULT_SETTINGS.timelapseSpeedFactor;
  }
  if (normalized.audioSource === undefined || normalized.audioSource === null) {
    normalized.audioSource = UNPROCESSED_AUDIO_SOURCE;
  }
  if (normalized.audioProfile === undefined || normalized.audioProfile === null) {
    normalized.audioProfile = getDerivedAudioProfile(normalized);
  }
  normalized.optimizationMode = getDerivedMediaOptimizationMode(normalized);
  Object.assign(normalized, getMediaOptimizationPatch(normalized.optimizationMode));
  if (
    normalized.audioLimiterPreset === undefined ||
    normalized.audioLimiterPreset === null
  ) {
    normalized.audioLimiterPreset = getAudioLimiterPresetOption(
      normalized.audioLimiterPreset,
    ).value;
  } else {
    normalized.audioLimiterPreset = getAudioLimiterPresetOption(
      normalized.audioLimiterPreset,
    ).value;
  }
  if (
    normalized.normalizeAudioLoudness === undefined ||
    normalized.normalizeAudioLoudness === null
  ) {
    normalized.normalizeAudioLoudness = false;
  }
  if (normalized.showAudioStatus === undefined || normalized.showAudioStatus === null) {
    normalized.showAudioStatus = false;
  }
  if (
    normalized.showAudioLevelMeter === undefined ||
    normalized.showAudioLevelMeter === null
  ) {
    normalized.showAudioLevelMeter = false;
  }

  return normalized;
}

export function CameraSettingsProvider({children}) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadPersistedSettings() {
      try {
        const storedValue = await AsyncStorage.getItem(CAMERA_SETTINGS_STORAGE_KEY);
        if (!storedValue) {
          return;
        }

        const parsedSettings = normalizePersistedSettings(JSON.parse(storedValue));
        if (!isMounted || !parsedSettings || typeof parsedSettings !== 'object') {
          return;
        }

        setSettings(prev => ({...prev, ...parsedSettings}));
      } catch (error) {
        console.warn('Nao foi possivel carregar as configurações salvas.', error);
      } finally {
        if (isMounted) {
          setIsHydrated(true);
        }
      }
    }

    loadPersistedSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    AsyncStorage.setItem(CAMERA_SETTINGS_STORAGE_KEY, JSON.stringify(settings)).catch(error => {
      console.warn('Nao foi possivel salvar as configurações.', error);
    });
  }, [isHydrated, settings]);

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  const value = useMemo(
    () => ({
      isHydrated,
      settings,
      setSettings,
      resetSettings,
    }),
    [isHydrated, settings],
  );

  return (
    <CameraSettingsContext.Provider value={value}>
      {children}
    </CameraSettingsContext.Provider>
  );
}

export function useCameraSettings() {
  const context = useContext(CameraSettingsContext);
  if (!context) {
    throw new Error('useCameraSettings deve ser usado dentro de CameraSettingsProvider');
  }
  return context;
}
