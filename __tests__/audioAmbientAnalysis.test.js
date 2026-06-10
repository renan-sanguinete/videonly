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

test('ambient analysis keeps optimization disabled', () => {
  const loudSuggestion = analyzeAmbientAudioSamples(
    buildSamples({ peakDb: -2, rmsDb: -8, isClipping: true }),
  );

  expect(loudSuggestion).toMatchObject({
    optimizationMode: 'none',
    audioLimiterPreset: 'strong',
    normalizeAudioLoudness: true,
  });
  expect(['audio', 'video', 'both']).not.toContain(
    loudSuggestion.optimizationMode,
  );
  expect(loudSuggestion.settingsPatch).toMatchObject({
    audioLimiterPreset: 'strong',
    normalizeAudioLoudness: true,
    audioProfile: 'custom',
  });

  const quietSuggestion = analyzeAmbientAudioSamples(
    buildSamples({ peakDb: -20, rmsDb: -34 }),
  );

  expect(quietSuggestion).toMatchObject({
    optimizationMode: 'none',
    normalizeAudioLoudness: false,
  });
  expect(['audio', 'video', 'both']).not.toContain(
    quietSuggestion.optimizationMode,
  );
});
