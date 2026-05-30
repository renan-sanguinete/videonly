import {analyzeAmbientAudioSamples} from '../src/utils/audioAmbientAnalysis';

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

test('ambient analysis only suggests audio optimization or none', () => {
  const loudSuggestion = analyzeAmbientAudioSamples(
    buildSamples({ peakDb: -2, rmsDb: -8, isClipping: true }),
  );

  expect(loudSuggestion).toMatchObject({
    optimizationMode: 'audio',
    audioLimiterPreset: 'strong',
    normalizeAudioLoudness: true,
  });
  expect(['video', 'both']).not.toContain(loudSuggestion.optimizationMode);

  const quietSuggestion = analyzeAmbientAudioSamples(
    buildSamples({ peakDb: -20, rmsDb: -34 }),
  );

  expect(quietSuggestion).toMatchObject({
    optimizationMode: 'none',
    normalizeAudioLoudness: false,
  });
  expect(['video', 'both']).not.toContain(quietSuggestion.optimizationMode);
});
