import {Linking, NativeModules, Platform, Share} from 'react-native';

const {VideoIntentModule} = NativeModules;

export async function openVideoUri(uri) {
  if (Platform.OS === 'android' && VideoIntentModule?.openVideo) {
    await VideoIntentModule.openVideo(uri);
    return;
  }

  const supported = await Linking.canOpenURL(uri);
  if (!supported) {
    throw new Error('Não foi possível abrir este vídeo no aparelho.');
  }

  await Linking.openURL(uri);
}

export async function shareVideo(video) {
  if (Platform.OS === 'android' && VideoIntentModule?.shareVideo) {
    await VideoIntentModule.shareVideo(video.uri, video.filename || 'Vídeo');
    return;
  }

  await Share.share({
    title: video.filename || 'Vídeo',
    message: video.uri,
    url: video.uri,
  });
}

export async function shareFile(path, title, mimeType = 'application/octet-stream') {
  if (Platform.OS === 'android' && VideoIntentModule?.shareFile) {
    await VideoIntentModule.shareFile(path, title || 'Arquivo', mimeType);
    return;
  }

  await Share.share({
    title: title || 'Arquivo',
    message: path,
    url: path,
  });
}
