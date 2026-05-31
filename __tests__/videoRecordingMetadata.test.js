jest.mock('react-native-fs', () => ({
  ExternalDirectoryPath: '/tmp',
  DocumentDirectoryPath: '/tmp',
  mkdir: jest.fn(),
  writeFile: jest.fn(),
}));

import {
  buildVideoRecordingMetadata,
  getVideoMetadataFileName,
} from '../src/utils/videoRecordingMetadata';

test('builds a metadata sidecar with the same video stem', () => {
  expect(getVideoMetadataFileName('video-20260101-120000.mp4')).toBe(
    'video-20260101-120000.json',
  );
});

test('captures the applied recording settings', () => {
  const metadata = buildVideoRecordingMetadata({
    videoFileName: 'video-20260101-120000.mp4',
    originalPath: '/tmp/original.mp4',
    sourcePath: '/tmp/source.mp4',
    savedPath: '/tmp/final.mp4',
    compressedPath: '/tmp/compressed.mp4',
    requestedOptimizationMode: 'audio',
    appliedOptimizationMode: 'audio',
    usedFallbackToOriginal: false,
    settings: {
      audio: true,
      audioProfile: 'custom',
      audioSource: 5,
      audioChannels: 'mono',
      audioSampleRate: '48000',
      audioBitRateKbps: '256',
      audioGain: -9,
      optimizationMode: 'audio',
      applyAudioCleanup: true,
      audioLimiterPreset: 'strong',
      normalizeAudioLoudness: true,
      recordFileType: 'mp4',
      recordVideoCodec: 'h264',
      videoResolutionPreset: 'auto',
      videoBitRate: 'normal',
      fps: '',
      zoom: '',
      exposure: '',
      lowLightBoost: false,
      videoHdr: false,
      torch: 'off',
      resizeMode: 'cover',
    },
  });

  expect(metadata).toMatchObject({
    schemaVersion: 1,
    videoFileName: 'video-20260101-120000.mp4',
    requestedOptimizationMode: 'audio',
    appliedOptimizationMode: 'audio',
    settings: {
      audio: true,
      audioProfile: 'custom',
      optimizationMode: 'audio',
      audioLimiterPreset: 'strong',
      normalizeAudioLoudness: true,
    },
  });
});
