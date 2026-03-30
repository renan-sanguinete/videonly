import {Linking, NativeModules, Platform, Share} from 'react-native';

const {VideoIntentModule} = NativeModules;

export async function openVideoUri(uri) {
  if (Platform.OS === 'android' && VideoIntentModule?.openVideo) {
    await VideoIntentModule.openVideo(uri);
    return;
  }

  const supported = await Linking.canOpenURL(uri);
  if (!supported) {
    throw new Error('Nao foi possivel abrir este video no aparelho.');
  }

  await Linking.openURL(uri);
}

export async function shareVideo(video) {
  if (Platform.OS === 'android' && VideoIntentModule?.shareVideo) {
    await VideoIntentModule.shareVideo(video.uri, video.filename || 'Video');
    return;
  }

  await Share.share({
    title: video.filename || 'Video',
    message: video.uri,
    url: video.uri,
  });
}
