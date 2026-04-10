import {NativeModules, Platform} from 'react-native';

const {VideoCompressionModule} = NativeModules;

export async function compressVideo(path, extension = 'mp4') {
  if (Platform.OS !== 'android') {
    return path;
  }

  if (!VideoCompressionModule?.compressVideo) {
    throw new Error('Compressão de vídeo não está disponível neste aparelho.');
  }

  return VideoCompressionModule.compressVideo(path, extension);
}
