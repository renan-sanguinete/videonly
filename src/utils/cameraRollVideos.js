import {Platform} from 'react-native';
import {CameraRoll} from '@react-native-camera-roll/camera-roll';

import {canManageAndroidMedia, ensureCameraRollVideoPermission} from './appPermissions';

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

export async function loadSavedVideosFromCameraRoll() {
  const granted = await ensureCameraRollVideoPermission();
  if (!granted) {
    throw new Error('Permissao para ler videos da galeria nao foi concedida.');
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
    throw new Error('Permissao para salvar videos na galeria nao foi concedida.');
  }

  return CameraRoll.saveAsset(path, {
    type: 'video',
    album: VIDEONLY_ALBUM,
  });
}

export async function deleteVideoFromCameraRoll(uri) {
  const granted = await ensureCameraRollVideoPermission();
  if (!granted) {
    throw new Error('Permissao para excluir videos da galeria nao foi concedida.');
  }

  const canManageMedia = await canManageAndroidMedia();

  await CameraRoll.deletePhotos([uri]);

  return {
    bypassedSystemPrompt:
      Platform.OS === 'android' && Platform.Version >= 31 && canManageMedia,
  };
}
