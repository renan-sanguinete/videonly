import {applyMediaOptimizationMode} from '../constants/mediaOptimization';

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
  optimizationMode,
  audioLimiterPreset,
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
    optimizationMode,
    settingsPatch: {
      ...applyMediaOptimizationMode({}, optimizationMode),
      audioLimiterPreset,
      normalizeAudioLoudness,
      audioProfile: 'custom',
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
        optimizationMode: 'audio',
        audioLimiterPreset: 'strong',
        normalizeAudioLoudness: true,
        title: 'Áudio',
        description:
          'O ambiente está alto e com picos. Corrigir apenas o áudio evita sugerir compressão de vídeo sem necessidade.',
        confidence: 'alta',
      }),
    };
  }

  if (averageRmsDb >= -18 || maxPeakDb >= -9) {
    return {
      ...summary,
      ...buildSuggestion({
        optimizationMode: 'audio',
        audioLimiterPreset:
          averageRmsDb >= -14 || maxPeakDb >= -6 ? 'strong' : 'standard',
        normalizeAudioLoudness: true,
        title: 'Áudio',
        description:
          'O áudio está em nível médio/alto. Corrigir só o áudio evita a demora da compressão do vídeo.',
        confidence: 'alta',
      }),
    };
  }

  if (averageRmsDb <= -30 && maxPeakDb <= -18 && clipRatio === 0) {
    return {
      ...summary,
      ...buildSuggestion({
        optimizationMode: 'none',
        audioLimiterPreset: 'gentle',
        normalizeAudioLoudness: false,
        title: 'Nenhum',
        description:
          'O ambiente está limpo e sem picos relevantes. Você pode gravar sem correção.',
        confidence: 'alta',
      }),
    };
  }

  return {
    ...summary,
    ...buildSuggestion({
      optimizationMode: 'audio',
      audioLimiterPreset: 'gentle',
      normalizeAudioLoudness: true,
      title: 'Áudio',
      description:
        'O ambiente tem variação moderada. Corrigir apenas o áudio é o melhor equilíbrio entre velocidade e segurança.',
      confidence: 'média',
    }),
  };
}
