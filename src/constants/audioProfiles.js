import { UNPROCESSED_AUDIO_SOURCE } from './audioSources';

export const AUDIO_PROFILE_OPTIONS = [
  {
    value: 'standard',
    label: 'Padrão',
    description: 'Mais neutro para uso geral e ambientes normais.',
    settings: {
      audioChannels: 'stereo',
      audioSampleRate: '44100',
      audioBitRateKbps: '128',
      audioGain: 0,
      audioSource: 5,
    },
  },
  {
    value: 'live-safe',
    label: 'Show ao vivo',
    description:
      'Prioriza menos processamento para ambientes muito altos.',
    settings: {
      audioChannels: 'mono',
      audioSampleRate: '48000',
      audioBitRateKbps: '256',
      audioGain: -9,
      audioSource: UNPROCESSED_AUDIO_SOURCE,
    },
  },
  {
    value: 'custom',
    label: 'Personalizado',
    description: 'Mantém os ajustes manuais escolhidos por você.',
    settings: {},
  },
];

export function getAudioProfileOption(value) {
  return (
    AUDIO_PROFILE_OPTIONS.find(option => option.value === value) ??
    AUDIO_PROFILE_OPTIONS[1]
  );
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

export function getAudioRiskLevel(settings) {
  if (!settings.audio) {
    return {
      level: 'off',
      title: 'Audio desativado',
      description: 'A gravacao esta configurada sem captacao de audio.',
    };
  }

  const usingUnprocessed = settings.audioSource === UNPROCESSED_AUDIO_SOURCE;
  const usingMono = settings.audioChannels === 'mono';

  if (usingUnprocessed && usingMono) {
    return {
      level: 'low',
      title: 'Risco reduzido',
      description:
        'Sem processamento e em mono: melhor combinação atual do app para preservar dinâmica e segurar graves fortes.',
    };
  }

  if (usingUnprocessed) {
    return {
      level: 'medium',
      title: 'Risco moderado',
      description:
        'A fonte sem processamento ajuda bastante, mas mono ainda costuma ser mais seguro em ambientes extremos.',
    };
  }

  return {
    level: 'high',
    title: 'Risco alto',
    description:
      'A fonte atual pode aplicar AGC, compressao ou reducao de ruido. Isso aumenta o risco de clipping e graves embolados.',
  };
}
