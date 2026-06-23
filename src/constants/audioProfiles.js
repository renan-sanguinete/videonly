import { UNPROCESSED_AUDIO_SOURCE } from './audioSources';
import {translate} from '../i18n/translations';

export const MAX_SAVED_AUDIO_PROFILES = 5;

export const AUDIO_PROFILE_SETTING_KEYS = [
  'audioCodec',
  'audioChannels',
  'audioSampleRate',
  'audioBitRateKbps',
  'audioGain',
  'audioSource',
  'optimizationMode',
  'applyAudioCleanup',
  'audioLimiterPreset',
  'normalizeAudioLoudness',
];

export const AUDIO_PROFILE_OPTIONS = [
  {
    value: 'standard',
    labelKey: 'audioProfile.standard.label',
    descriptionKey: 'audioProfile.standard.description',
    settings: {
      audioChannels: 'stereo',
      audioSampleRate: '44100',
      audioBitRateKbps: '128',
      audioGain: 0,
      audioSource: 5,
      audioLimiterPreset: 'standard',
      applyAudioCleanup: false,
    },
  },
  {
    value: 'live-safe',
    labelKey: 'audioProfile.liveSafe.label',
    descriptionKey: 'audioProfile.liveSafe.description',
    settings: {
      audioChannels: 'mono',
      audioSampleRate: '48000',
      audioBitRateKbps: '256',
      audioGain: -9,
      audioSource: UNPROCESSED_AUDIO_SOURCE,
      applyAudioCleanup: true,
    },
  },
  {
    value: 'custom',
    labelKey: 'audioProfile.custom.label',
    descriptionKey: 'audioProfile.custom.description',
    settings: {},
  },
];

function localizeAudioProfileOption(option, t) {
  const tx = typeof t === 'function' ? t : translate;

  return {
    ...option,
    label: tx(option.labelKey),
    description: tx(option.descriptionKey),
  };
}

export function getAudioProfileOptions(t) {
  return AUDIO_PROFILE_OPTIONS.map(option =>
    localizeAudioProfileOption(option, t),
  );
}

export function getAudioProfileOption(value, t) {
  const option =
    AUDIO_PROFILE_OPTIONS.find(item => item.value === value) ??
    AUDIO_PROFILE_OPTIONS[1];

  return localizeAudioProfileOption(option, t);
}

export function getAudioProfileSettings(value) {
  return getAudioProfileOption(value).settings;
}

export function buildAudioProfilePatch(value) {
  return {
    audioProfile: value,
    ...getAudioProfileSettings(value),
  };
}

export function applyAudioProfile(settings, value) {
  return {
    ...settings,
    ...buildAudioProfilePatch(value),
    audioCustomProfileId: null,
  };
}

export function sanitizeAudioSettingsForProAccess(settings, isPro) {
  if (isPro) {
    return settings;
  }

  return {
    ...settings,
    audioGain: settings.audioGain === -12 ? -9 : settings.audioGain,
    audioLimiterPreset:
      settings.audioLimiterPreset === 'strong'
        ? 'standard'
        : settings.audioLimiterPreset,
  };
}

export function buildSavedAudioProfileSettings(settings) {
  return AUDIO_PROFILE_SETTING_KEYS.reduce((profileSettings, key) => {
    if (settings[key] !== undefined) {
      profileSettings[key] = settings[key];
    }

    return profileSettings;
  }, {});
}

export function buildSavedAudioProfilePatch(profile) {
  return {
    ...profile.settings,
    audioProfile: 'custom',
    audioCustomProfileId: profile.id,
  };
}

export function matchesAudioProfile(settings, profileValue) {
  const profileSettings = getAudioProfileSettings(profileValue);
  const entries = Object.entries(profileSettings);

  if (entries.length === 0) {
    return false;
  }

  return entries.every(
    ([key, expectedValue]) => settings[key] === expectedValue,
  );
}

export function getDerivedAudioProfile(settings) {
  if (matchesAudioProfile(settings, 'standard')) {
    return 'standard';
  }

  if (matchesAudioProfile(settings, 'live-safe')) {
    return 'live-safe';
  }

  return 'custom';
}

export function getAudioRiskLevel(settings, t) {
  const tx = typeof t === 'function' ? t : translate;

  if (!settings.audio) {
    return {
      level: 'off',
      title: tx('audioRisk.off.title'),
      description: tx('audioRisk.off.description'),
    };
  }

  const usingUnprocessed = settings.audioSource === UNPROCESSED_AUDIO_SOURCE;
  const usingMono = settings.audioChannels === 'mono';
  const applyingCleanup = Boolean(
    settings.applyAudioCleanup &&
      (settings.optimizationMode === 'audio' ||
        settings.optimizationMode === 'both'),
  );

  if (usingUnprocessed && usingMono) {
    return {
      level: 'low',
      title: tx('audioRisk.low.title'),
      description:
        applyingCleanup
          ? tx('audioRisk.low.cleanupDescription')
          : tx('audioRisk.low.description'),
    };
  }

  if (usingUnprocessed) {
    return {
      level: 'medium',
      title: tx('audioRisk.medium.title'),
      description:
        applyingCleanup
          ? tx('audioRisk.medium.cleanupDescription')
          : tx('audioRisk.medium.description'),
    };
  }

  return {
    level: 'high',
    title: tx('audioRisk.high.title'),
    description:
      applyingCleanup
        ? tx('audioRisk.high.cleanupDescription')
        : tx('audioRisk.high.description'),
  };
}
