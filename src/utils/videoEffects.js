import {NativeModules, Platform} from 'react-native';
import {translate} from '../i18n/translations';

const {MediaProcessingModule} = NativeModules;

export async function applySlowMotionEffect(
  inputPath,
  extension = 'mp4',
  captureFps = 60,
  playbackFps = 30,
) {
  if (Platform.OS !== 'android') {
    return inputPath;
  }

  if (!MediaProcessingModule?.retimeVideo) {
    throw new Error(translate('errors.slowMotionUnavailable'));
  }

  const capture = Number(captureFps);
  const playback = Number(playbackFps);

  if (!Number.isFinite(capture) || !Number.isFinite(playback) || capture <= playback) {
    return inputPath;
  }

  return MediaProcessingModule.retimeVideo(
    inputPath,
    extension,
    playback / capture,
    true,
  );
}

export async function applyTimelapseEffect(
  inputPath,
  extension = 'mp4',
  speedFactor = 8,
) {
  if (Platform.OS !== 'android') {
    return inputPath;
  }

  if (!MediaProcessingModule?.retimeVideo) {
    throw new Error(translate('errors.timelapseUnavailable'));
  }

  const speed = Number(speedFactor);

  if (!Number.isFinite(speed) || speed <= 1) {
    return inputPath;
  }

  return MediaProcessingModule.retimeVideo(inputPath, extension, speed, true);
}
