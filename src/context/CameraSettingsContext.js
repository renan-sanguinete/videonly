import React, {createContext, useContext, useEffect, useMemo, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {UNPROCESSED_AUDIO_SOURCE} from '../constants/audioSources';

const CameraSettingsContext = createContext(null);
const CAMERA_SETTINGS_STORAGE_KEY = '@videonly/camera-settings';

const DEFAULT_SETTINGS = {
  audio: true,
  audioCodec: 'aac',
  audioChannels: 'stereo',
  audioSampleRate: '48000',
  audioBitRateKbps: '128',
  audioSource: UNPROCESSED_AUDIO_SOURCE,
  compressVideoBeforeSave: false,
  recordFileType: 'mp4',
  recordVideoCodec: 'h264',
  videoResolutionPreset: 'auto',
  photo: false,
  video: true,
  enableZoomGesture: true,
  preview: true,
  lowLightBoost: false,
  videoHdr: false,
  photoHdr: false,
  torch: 'off',
  resizeMode: 'cover',
  videoBitRate: 'normal',
  photoQualityBalance: 'balanced',
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
  if (normalized.audioSource === undefined || normalized.audioSource === null) {
    normalized.audioSource = UNPROCESSED_AUDIO_SOURCE;
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
        console.warn('Nao foi possivel carregar as configuracoes salvas.', error);
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
      console.warn('Nao foi possivel salvar as configuracoes.', error);
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
