import {NativeModules, Platform} from 'react-native';

const {VideoCompressionModule} = NativeModules;

export async function compressVideo(path) {
  if (Platform.OS !== 'android') {
    return path;
  }

  if (!VideoCompressionModule?.compressVideo) {
    throw new Error('Compressão de vídeo não está disponível neste aparelho.');
  }

  return VideoCompressionModule.compressVideo(path);
}
