import {analyzeAmbientAudioSamples} from '../src/utils/audioAmbientAnalysis';
import {UNPROCESSED_AUDIO_SOURCE} from '../src/constants/audioSources';

function buildSamples({
  count = 8,
  peakDb = -7,
  rmsDb = -12,
  isClipping = false,
} = {}) {
  return Array.from({ length: count }, () => ({
    level: 1,
    peakDb,
    rmsDb,
    isClipping,
  }));
}

function expectNoOptimizationPatch(suggestion) {
  expect(suggestion).not.toHaveProperty('optimizationMode');
  expect(suggestion.settingsPatch).not.toHaveProperty('optimizationMode');
  expect(suggestion.settingsPatch).not.toHaveProperty('applyAudioCleanup');
  expect(suggestion.settingsPatch).not.toHaveProperty(
    'compressVideoBeforeSave',
  );
}

function expectNoAggressiveCapturePatch(suggestion) {
  expect(suggestion.settingsPatch).not.toHaveProperty('audioChannels');
  expect(suggestion.settingsPatch).not.toHaveProperty('audioSampleRate');
  expect(suggestion.settingsPatch).not.toHaveProperty('audioBitRateKbps');
  expect(suggestion.settingsPatch).not.toHaveProperty('audioSource');
}

test('ambient analysis applies protected audio settings for noisy environments', () => {
  const loudSuggestion = analyzeAmbientAudioSamples(
    buildSamples({ peakDb: -2, rmsDb: -8, isClipping: true }),
  );

  expect(loudSuggestion).toMatchObject({
    audioLimiterPreset: 'strong',
    normalizeAudioLoudness: true,
  });
  expectNoOptimizationPatch(loudSuggestion);
  expect(loudSuggestion.settingsPatch).toMatchObject({
    audioChannels: 'mono',
    audioSampleRate: '48000',
    audioBitRateKbps: '256',
    audioGain: -12,
    audioSource: UNPROCESSED_AUDIO_SOURCE,
    audioLimiterPreset: 'strong',
    normalizeAudioLoudness: true,
    audioProfile: 'custom',
    audioCustomProfileId: null,
  });
});

test('ambient analysis keeps gentle environments non aggressive', () => {
  const softSuggestion = analyzeAmbientAudioSamples(
    buildSamples({ peakDb: -15, rmsDb: -28 }),
  );

  expect(softSuggestion).toMatchObject({
    title: 'Ambiente suave',
    audioLimiterPreset: 'gentle',
    normalizeAudioLoudness: false,
  });
  expectNoOptimizationPatch(softSuggestion);
  expectNoAggressiveCapturePatch(softSuggestion);
  expect(softSuggestion.settingsPatch).not.toHaveProperty('audioGain');
});

test('ambient analysis uses small gain reduction for moderate environments', () => {
  const borderlineSuggestion = analyzeAmbientAudioSamples(
    buildSamples({ peakDb: -10, rmsDb: -20 }),
  );

  expect(borderlineSuggestion).toMatchObject({
    title: 'Ambiente moderado',
    audioLimiterPreset: 'standard',
    normalizeAudioLoudness: true,
  });
  expectNoOptimizationPatch(borderlineSuggestion);
  expectNoAggressiveCapturePatch(borderlineSuggestion);
  expect(borderlineSuggestion.settingsPatch).toMatchObject({
    audioGain: -6,
  });
});

test('ambient analysis keeps quiet environments without capture changes', () => {
  const quietSuggestion = analyzeAmbientAudioSamples(
    buildSamples({ peakDb: -20, rmsDb: -34 }),
  );

  expect(quietSuggestion).toMatchObject({
    normalizeAudioLoudness: false,
  });
  expectNoOptimizationPatch(quietSuggestion);
  expectNoAggressiveCapturePatch(quietSuggestion);
});
