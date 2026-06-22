import {UNPROCESSED_AUDIO_SOURCE} from '../constants/audioSources';
import {translate} from '../i18n/translations';

const SAFE_CAPTURE_SETTINGS = {
  audioChannels: 'mono',
  audioSampleRate: '48000',
  audioBitRateKbps: '256',
  audioSource: UNPROCESSED_AUDIO_SOURCE,
};

const REDUCED_GAIN_SETTINGS = {
  audioGain: -6,
};

function average(values) {
  if (!values.length) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function formatDb(value) {
  return `${Math.round(value * 10) / 10} dBFS`;
}

function formatRatio(value) {
  return `${Math.round(value * 100)}%`;
}

function buildSuggestion({
  audioLimiterPreset,
  captureSettingsPatch = {},
  normalizeAudioLoudness,
  title,
  description,
  confidence,
}) {
  return {
    title,
    description,
    confidence,
    audioLimiterPreset,
    normalizeAudioLoudness,
    settingsPatch: {
      ...captureSettingsPatch,
      audioLimiterPreset,
      normalizeAudioLoudness,
      audioProfile: 'custom',
      audioCustomProfileId: null,
    },
  };
}

export function analyzeAmbientAudioSamples(samples) {
  if (!Array.isArray(samples) || samples.length < 8) {
    return null;
  }

  const peakValues = samples.map(sample => sample.peakDb);
  const rmsValues = samples.map(sample => sample.rmsDb);
  const clippingCount = samples.filter(sample => sample.isClipping).length;

  const averagePeakDb = average(peakValues);
  const averageRmsDb = average(rmsValues);
  const maxPeakDb = Math.max(...peakValues);
  const clipRatio = clippingCount / samples.length;

  const summary = {
    sampleCount: samples.length,
    averagePeakDb,
    averageRmsDb,
    maxPeakDb,
    clipRatio,
    averagePeakLabel: formatDb(averagePeakDb),
    averageRmsLabel: formatDb(averageRmsDb),
    maxPeakLabel: formatDb(maxPeakDb),
    clipRatioLabel: formatRatio(clipRatio),
  };

  if (clipRatio >= 0.1 || maxPeakDb >= -3 || averagePeakDb >= -6 || averageRmsDb >= -10) {
    return {
      ...summary,
      ...buildSuggestion({
        captureSettingsPatch: {
          ...SAFE_CAPTURE_SETTINGS,
          audioGain: -12,
        },
        audioLimiterPreset: 'strong',
        normalizeAudioLoudness: true,
        title: translate('ambient.protected.title'),
        description:
          translate('ambient.protectedHigh.description'),
        confidence: translate('ambient.confidenceHigh'),
      }),
    };
  }

  if (clipRatio >= 0.03 || maxPeakDb >= -6 || averagePeakDb >= -9 || averageRmsDb >= -14) {
    return {
      ...summary,
      ...buildSuggestion({
        captureSettingsPatch: {
          ...SAFE_CAPTURE_SETTINGS,
          audioGain: -9,
        },
        audioLimiterPreset: 'standard',
        normalizeAudioLoudness: true,
        title: translate('ambient.protected.title'),
        description:
          translate('ambient.protected.description'),
        confidence: translate('ambient.confidenceHigh'),
      }),
    };
  }

  if (averageRmsDb >= -18 || maxPeakDb >= -9 || averagePeakDb >= -12) {
    return {
      ...summary,
      ...buildSuggestion({
        captureSettingsPatch: REDUCED_GAIN_SETTINGS,
        audioLimiterPreset: 'standard',
        normalizeAudioLoudness: true,
        title: translate('ambient.moderate.title'),
        description:
          translate('ambient.moderate.description'),
        confidence: translate('ambient.confidenceMedium'),
      }),
    };
  }

  if (averageRmsDb <= -26 && maxPeakDb <= -12 && clipRatio === 0) {
    return {
      ...summary,
      ...buildSuggestion({
        audioLimiterPreset: 'gentle',
        normalizeAudioLoudness: false,
        title: translate('ambient.soft.title'),
        description:
          translate('ambient.soft.description'),
        confidence: translate('ambient.confidenceHigh'),
      }),
    };
  }

  return {
    ...summary,
    ...buildSuggestion({
      captureSettingsPatch: REDUCED_GAIN_SETTINGS,
      audioLimiterPreset: 'gentle',
      normalizeAudioLoudness: false,
      title: translate('ambient.variable.title'),
      description:
        translate('ambient.variable.description'),
      confidence: translate('ambient.confidenceMedium'),
    }),
  };
}
