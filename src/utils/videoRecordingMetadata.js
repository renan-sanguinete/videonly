import {Platform} from 'react-native';
import RNFS from 'react-native-fs';

export const VIDEO_RECORDING_METADATA_DIRECTORY_NAME = 'videonly-recordings';
const VIDEO_RECORDING_METADATA_EXPORT_PREFIX = 'videonly-metadata-export';

function getMetadataBaseDirectory() {
  if (Platform.OS === 'android' && RNFS.ExternalDirectoryPath) {
    return RNFS.ExternalDirectoryPath;
  }

  return RNFS.DocumentDirectoryPath;
}

function getMetadataDirectoryPath() {
  return `${getMetadataBaseDirectory()}/${VIDEO_RECORDING_METADATA_DIRECTORY_NAME}`;
}

export function getVideoMetadataFileName(videoFileName) {
  return `${videoFileName.replace(/\.[^.]+$/, '')}.json`;
}

export function buildVideoRecordingMetadata({
  videoFileName,
  originalPath,
  sourcePath,
  savedPath,
  compressedPath = null,
  requestedOptimizationMode,
  appliedOptimizationMode,
  usedFallbackToOriginal,
  settings,
}) {
  return {
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    videoFileName,
    originalPath,
    sourcePath,
    savedPath,
    compressedPath,
    requestedOptimizationMode,
    appliedOptimizationMode,
    usedFallbackToOriginal,
    settings: {
      audio: settings.audio,
      audioProfile: settings.audioProfile,
      audioSource: settings.audioSource,
      audioChannels: settings.audioChannels,
      audioSampleRate: settings.audioSampleRate,
      audioBitRateKbps: settings.audioBitRateKbps,
      audioGain: settings.audioGain,
      optimizationMode: settings.optimizationMode,
      applyAudioCleanup: settings.applyAudioCleanup,
      audioLimiterPreset: settings.audioLimiterPreset,
      normalizeAudioLoudness: settings.normalizeAudioLoudness,
      recordFileType: settings.recordFileType,
      recordVideoCodec: settings.recordVideoCodec,
      videoResolutionPreset: settings.videoResolutionPreset,
      videoBitRate: settings.videoBitRate,
      fps: settings.fps,
      zoom: settings.zoom,
      exposure: settings.exposure,
      lowLightBoost: settings.lowLightBoost,
      videoHdr: settings.videoHdr,
      torch: settings.torch,
      resizeMode: settings.resizeMode,
    },
  };
}

export async function saveVideoRecordingMetadata(videoFileName, metadata) {
  const directoryPath = getMetadataDirectoryPath();
  const fileName = getVideoMetadataFileName(videoFileName);
  const filePath = `${directoryPath}/${fileName}`;

  await RNFS.mkdir(directoryPath);
  await RNFS.writeFile(filePath, JSON.stringify(metadata, null, 2), 'utf8');

  return filePath;
}

export function getVideoRecordingMetadataDirectoryPath() {
  return getMetadataDirectoryPath();
}

function generateExportFileName() {
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z')
    .replace('T', '-')
    .replace('Z', '');

  return `${VIDEO_RECORDING_METADATA_EXPORT_PREFIX}-${timestamp}.json`;
}

export async function exportVideoRecordingMetadata() {
  const directoryPath = getMetadataDirectoryPath();
  const exportDirectoryPath = RNFS.CachesDirectoryPath;
  const directoryExists = await RNFS.exists(directoryPath);
  const files = directoryExists ? await RNFS.readDir(directoryPath) : [];
  const metadataFiles = files
    .filter(item => item.isFile() && item.name.endsWith('.json'))
    .sort((left, right) => left.name.localeCompare(right.name));

  const records = [];

  for (const file of metadataFiles) {
    const contents = await RNFS.readFile(file.path, 'utf8');
    records.push({
      fileName: file.name,
      metadata: JSON.parse(contents),
    });
  }

  const exportPath = `${exportDirectoryPath}/${generateExportFileName()}`;
  const exportPayload = {
    exportedAt: new Date().toISOString(),
    sourceDirectory: directoryPath,
    totalFiles: records.length,
    records,
  };

  if (records.length === 0) {
    return {
      exportPath: null,
      totalFiles: 0,
    };
  }

  await RNFS.writeFile(exportPath, JSON.stringify(exportPayload, null, 2), 'utf8');

  return {
    exportPath,
    totalFiles: records.length,
  };
}
