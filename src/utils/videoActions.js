import {Linking, NativeModules, Platform, Share} from 'react-native';
import {translate} from '../i18n/translations';

const {VideoIntentModule} = NativeModules;

export async function openVideoUri(uri) {
  if (Platform.OS === 'android' && VideoIntentModule?.openVideo) {
    await VideoIntentModule.openVideo(uri);
    return;
  }

  const supported = await Linking.canOpenURL(uri);
  if (!supported) {
    throw new Error(translate('errors.openVideoDevice'));
  }

  await Linking.openURL(uri);
}

export async function shareVideo(video) {
  if (Platform.OS === 'android' && VideoIntentModule?.shareVideo) {
    await VideoIntentModule.shareVideo(
      video.uri,
      video.filename || translate('common.video'),
    );
    return;
  }

  await Share.share({
    title: video.filename || translate('common.video'),
    message: video.uri,
    url: video.uri,
  });
}

export async function shareFile(path, title, mimeType = 'application/octet-stream') {
  if (Platform.OS === 'android' && VideoIntentModule?.shareFile) {
    await VideoIntentModule.shareFile(
      path,
      title || translate('common.file'),
      mimeType,
    );
    return;
  }

  await Share.share({
    title: title || translate('common.file'),
    message: path,
    url: path,
  });
}
