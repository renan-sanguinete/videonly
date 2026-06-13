import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {UNPROCESSED_AUDIO_SOURCE} from '../constants/audioSources';
import {
  MAX_SAVED_AUDIO_PROFILES,
  applyAudioProfile,
  buildSavedAudioProfilePatch,
  buildSavedAudioProfileSettings,
  getDerivedAudioProfile,
} from '../constants/audioProfiles';
import {getAudioLimiterPresetOption} from '../constants/audioProcessing';
import {
  getDerivedMediaOptimizationMode,
  getMediaOptimizationPatch,
} from '../constants/mediaOptimization';
import {getRecordingModeOption} from '../constants/recordingModes';

const CameraSettingsContext = createContext(null);
const CAMERA_SETTINGS_STORAGE_KEY = '@videonly/camera-settings';
const SAVED_AUDIO_PROFILES_STORAGE_KEY = '@videonly/saved-audio-profiles';

const DEFAULT_SETTINGS = {
  audio: true,
  audioProfile: 'live-safe',
  audioCustomProfileId: null,
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

function createSavedProfileId() {
  return `audio-profile-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function normalizeProfileName(name) {
  return String(name ?? '').trim().slice(0, 32);
}

function normalizeSavedAudioProfiles(parsedProfiles) {
  if (!Array.isArray(parsedProfiles)) {
    return [];
  }

  return parsedProfiles
    .filter(
      profile =>
        profile &&
        typeof profile === 'object' &&
        typeof profile.id === 'string' &&
        normalizeProfileName(profile.name) &&
        profile.settings &&
        typeof profile.settings === 'object',
    )
    .slice(0, MAX_SAVED_AUDIO_PROFILES)
    .map(profile => ({
      id: profile.id,
      name: normalizeProfileName(profile.name),
      settings: buildSavedAudioProfileSettings(profile.settings),
      createdAt: profile.createdAt ?? Date.now(),
      updatedAt: profile.updatedAt ?? profile.createdAt ?? Date.now(),
    }));
}

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
  if (
    normalized.audioCustomProfileId === undefined ||
    normalized.audioCustomProfileId === null ||
    normalized.audioProfile !== 'custom'
  ) {
    normalized.audioCustomProfileId = null;
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
  const [savedAudioProfiles, setSavedAudioProfiles] = useState([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadPersistedSettings() {
      try {
        const [storedValue, storedProfilesValue] = await Promise.all([
          AsyncStorage.getItem(CAMERA_SETTINGS_STORAGE_KEY),
          AsyncStorage.getItem(SAVED_AUDIO_PROFILES_STORAGE_KEY),
        ]);
        const parsedProfiles = storedProfilesValue
          ? normalizeSavedAudioProfiles(JSON.parse(storedProfilesValue))
          : [];

        if (isMounted) {
          setSavedAudioProfiles(parsedProfiles);
        }

        if (!storedValue) {
          return;
        }

        const parsedSettings = normalizePersistedSettings(JSON.parse(storedValue));
        if (!isMounted || !parsedSettings || typeof parsedSettings !== 'object') {
          return;
        }

        const profileStillExists =
          !parsedSettings.audioCustomProfileId ||
          parsedProfiles.some(profile => profile.id === parsedSettings.audioCustomProfileId);

        setSettings(prev => ({
          ...prev,
          ...parsedSettings,
          audioCustomProfileId: profileStillExists
            ? parsedSettings.audioCustomProfileId
            : null,
        }));
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

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    AsyncStorage.setItem(
      SAVED_AUDIO_PROFILES_STORAGE_KEY,
      JSON.stringify(savedAudioProfiles),
    ).catch(error => {
      console.warn('Nao foi possivel salvar os perfis de captacao.', error);
    });
  }, [isHydrated, savedAudioProfiles]);

  const resetSettings = useCallback(() => {
    setSettings(applyAudioProfile(DEFAULT_SETTINGS, 'standard'));
  }, []);

  const saveAudioProfile = useCallback(name => {
    const normalizedName = normalizeProfileName(name);

    if (!normalizedName || savedAudioProfiles.length >= MAX_SAVED_AUDIO_PROFILES) {
      return null;
    }

    const now = Date.now();
    const profile = {
      id: createSavedProfileId(),
      name: normalizedName,
      settings: buildSavedAudioProfileSettings(settings),
      createdAt: now,
      updatedAt: now,
    };

    setSavedAudioProfiles(prev => [...prev, profile]);
    setSettings(prev => ({
      ...prev,
      audioProfile: 'custom',
      audioCustomProfileId: profile.id,
    }));

    return profile;
  }, [savedAudioProfiles.length, settings]);

  const applySavedAudioProfile = useCallback(profileId => {
    const profile = savedAudioProfiles.find(item => item.id === profileId);

    if (!profile) {
      return false;
    }

    setSettings(prev => ({
      ...prev,
      ...buildSavedAudioProfilePatch(profile),
    }));

    return true;
  }, [savedAudioProfiles]);

  const replaceSavedAudioProfile = useCallback(profileId => {
    let didReplace = false;
    const now = Date.now();

    setSavedAudioProfiles(prev =>
      prev.map(profile => {
        if (profile.id !== profileId) {
          return profile;
        }

        didReplace = true;
        return {
          ...profile,
          settings: buildSavedAudioProfileSettings(settings),
          updatedAt: now,
        };
      }),
    );

    if (didReplace) {
      setSettings(prev => ({
        ...prev,
        audioProfile: 'custom',
        audioCustomProfileId: profileId,
      }));
    }

    return didReplace;
  }, [settings]);

  const renameSavedAudioProfile = useCallback((profileId, name) => {
    const normalizedName = normalizeProfileName(name);

    if (!normalizedName) {
      return false;
    }

    let didRename = false;
    const now = Date.now();
    setSavedAudioProfiles(prev =>
      prev.map(profile => {
        if (profile.id !== profileId) {
          return profile;
        }

        didRename = true;
        return {
          ...profile,
          name: normalizedName,
          updatedAt: now,
        };
      }),
    );

    return didRename;
  }, []);

  const deleteSavedAudioProfile = useCallback(profileId => {
    const profileExists = savedAudioProfiles.some(profile => profile.id === profileId);

    if (!profileExists) {
      return false;
    }

    setSavedAudioProfiles(prev => prev.filter(profile => profile.id !== profileId));
    setSettings(prev =>
      prev.audioCustomProfileId === profileId
        ? applyAudioProfile(prev, 'standard')
        : prev,
    );

    return true;
  }, [savedAudioProfiles]);

  const value = useMemo(
    () => ({
      isHydrated,
      settings,
      savedAudioProfiles,
      setSettings,
      resetSettings,
      saveAudioProfile,
      applySavedAudioProfile,
      replaceSavedAudioProfile,
      renameSavedAudioProfile,
      deleteSavedAudioProfile,
    }),
    [
      applySavedAudioProfile,
      deleteSavedAudioProfile,
      isHydrated,
      replaceSavedAudioProfile,
      renameSavedAudioProfile,
      resetSettings,
      savedAudioProfiles,
      saveAudioProfile,
      settings,
    ],
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
