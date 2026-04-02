import {PermissionsAndroid, Platform} from 'react-native';
import {CameraRoll} from '@react-native-camera-roll/camera-roll';

export const VIDEONLY_ALBUM = 'Videonly';

function mapEdgeToVideo(edge) {
  const node = edge.node;
  const filename = node.image.filename || `video-${node.timestamp}`;

  return {
    uri: node.image.uri,
    thumbnailUri: node.image.uri,
    filename,
    duration: node.image.playableDuration || 0,
    timestamp: node.timestamp,
    size: node.image.fileSize || 0,
    width: node.image.width || 0,
    height: node.image.height || 0,
    name: filename,
    path: node.image.uri,
    mtime: (node.modificationTimestamp || node.timestamp || 0) * 1000,
  };
}

function isVideonlyAsset(video) {
  return typeof video.filename === 'string' && video.filename.startsWith('videonly-');
}

export async function ensureCameraRollVideoPermission() {
  if (Platform.OS !== 'android') {
    return true;
  }

  if (Platform.Version >= 33) {
    const permission = PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO;
    const alreadyGranted = await PermissionsAndroid.check(permission);
    if (alreadyGranted) {
      return true;
    }

    const result = await PermissionsAndroid.request(permission);
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }

  const readPermission = PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
  const readGranted = await PermissionsAndroid.check(readPermission);

  if (readGranted) {
    return true;
  }

  const result = await PermissionsAndroid.request(readPermission);
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

export async function loadSavedVideosFromCameraRoll() {
  const granted = await ensureCameraRollVideoPermission();
  if (!granted) {
    throw new Error('Permissão para ler vídeos da galeria não foi concedida.');
  }

  const baseParams = {
    first: 10,
    assetType: 'Videos',
    include: ['filename', 'fileSize', 'playableDuration', 'imageSize'],
  };

  const albumResult = await CameraRoll.getPhotos({
    ...baseParams,
    groupName: VIDEONLY_ALBUM,
  });

  let videos = albumResult.edges.map(mapEdgeToVideo);

  if (videos.length === 0) {
    const allVideosResult = await CameraRoll.getPhotos(baseParams);
    videos = allVideosResult.edges.map(mapEdgeToVideo).filter(isVideonlyAsset);
  }

  return videos.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
}

export async function saveVideoToCameraRoll(path) {
  const granted = await ensureCameraRollVideoPermission();
  if (!granted) {
    throw new Error('Permissão para salvar vídeos na galeria não foi concedida.');
  }

  return CameraRoll.saveAsset(path, {
    type: 'video',
    album: VIDEONLY_ALBUM,
  });
}

export async function deleteVideoFromCameraRoll(uri) {
  const granted = await ensureCameraRollVideoPermission();
  if (!granted) {
    throw new Error('Permissão para excluir vídeos da galeria não foi concedida.');
  }

  await CameraRoll.deletePhotos([uri]);
}
