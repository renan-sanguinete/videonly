import {NativeModules, Platform} from 'react-native';

const {VideoCompressionModule} = NativeModules;

export async function optimizeVideo(path, extension = 'mp4', options = {}) {
  if (Platform.OS !== 'android') {
    return path;
  }

  if (!VideoCompressionModule?.optimizeVideo) {
    throw new Error('Compressão de vídeo não está disponível neste aparelho.');
  }

  return VideoCompressionModule.optimizeVideo(path, extension, options);
}

export async function compressVideo(path, extension = 'mp4', options = {}) {
  return optimizeVideo(path, extension, options);
}
