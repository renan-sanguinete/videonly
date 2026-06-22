import {UNPROCESSED_AUDIO_SOURCE} from '../constants/audioSources';

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
        title: 'Áudio protegido',
        description:
          'O ambiente está alto e com picos. A sugestão automática é reduzir o ganho e usar captação sem processamento para preservar melhor o áudio.',
        confidence: 'alta',
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
        title: 'Áudio protegido',
        description:
          'O ambiente está alto, mas sem clipping constante. A sugestão automática é usar captação sem processamento e reduzir o ganho sem chegar ao ajuste mais agressivo.',
        confidence: 'alta',
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
        title: 'Ambiente moderado',
        description:
          'O ambiente tem volume moderado. A sugestão automática é só reduzir um pouco o ganho e manter a captação atual.',
        confidence: 'média',
      }),
    };
  }

  if (averageRmsDb <= -26 && maxPeakDb <= -12 && clipRatio === 0) {
    return {
      ...summary,
      ...buildSuggestion({
        audioLimiterPreset: 'gentle',
        normalizeAudioLoudness: false,
        title: 'Ambiente suave',
        description:
          'O ambiente está limpo ou com pouco ruído. A sugestão automática é preservar a captação atual e evitar ajustes agressivos.',
        confidence: 'alta',
      }),
    };
  }

  return {
    ...summary,
    ...buildSuggestion({
      captureSettingsPatch: REDUCED_GAIN_SETTINGS,
      audioLimiterPreset: 'gentle',
      normalizeAudioLoudness: false,
      title: 'Ambiente levemente variável',
      description:
        'O ambiente tem alguma variação, mas não justifica trocar canal, taxa de amostragem ou fonte. A sugestão automática é apenas reduzir levemente o ganho.',
      confidence: 'média',
    }),
  };
}
