import React, {createContext, useContext, useEffect, useMemo, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {UNPROCESSED_AUDIO_SOURCE} from '../constants/audioSources';
import {getDerivedAudioProfile} from '../constants/audioProfiles';

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
  applyAudioCleanup: true,
  showAudioStatus: false,
  showAudioLevelMeter: false,
  compressVideoBeforeSave: false,
  recordFileType: 'mp4',
  recordVideoCodec: 'h264',
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
  if (normalized.audioSource === undefined || normalized.audioSource === null) {
    normalized.audioSource = UNPROCESSED_AUDIO_SOURCE;
  }
  if (normalized.audioProfile === undefined || normalized.audioProfile === null) {
    normalized.audioProfile = getDerivedAudioProfile(normalized);
  }
  if (
    normalized.applyAudioCleanup === undefined ||
    normalized.applyAudioCleanup === null
  ) {
    normalized.applyAudioCleanup = normalized.audioProfile === 'live-safe';
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
