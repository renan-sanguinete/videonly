import {Platform} from 'react-native';
import {CameraRoll} from '@react-native-camera-roll/camera-roll';

import {canManageAndroidMedia, ensureCameraRollVideoPermission} from './appPermissions';
import {translate} from '../i18n/translations';
import {readVideoRecordingMetadata} from './videoRecordingMetadata';

export const VIDEONLY_ALBUM = 'Videonly';
const DEFAULT_PAGE_SIZE = 20;

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

function sortVideosByTimestamp(videos) {
  return videos.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
}

async function applyMetadataFallbacks(video) {
  if (video.duration > 0 || !video.filename) {
    return video;
  }

  try {
    const metadata = await readVideoRecordingMetadata(video.filename);
    const metadataDuration = Number(metadata?.savedDurationSeconds);

    if (Number.isFinite(metadataDuration) && metadataDuration > 0) {
      return {
        ...video,
        duration: metadataDuration,
      };
    }
  } catch (error) {
    console.warn('Não foi possível carregar metadados do vídeo.', error);
  }

  return video;
}

export async function loadVideosPageFromCameraRoll({
  after = null,
  first = DEFAULT_PAGE_SIZE,
  source = 'videonly',
} = {}) {
  const granted = await ensureCameraRollVideoPermission();
  if (!granted) {
    throw new Error(translate('errors.galleryReadPermission'));
  }

  const params = {
    first,
    assetType: 'Videos',
    include: ['filename', 'fileSize', 'playableDuration', 'imageSize'],
  };

  if (after) {
    params.after = after;
  }

  if (source === 'videonly') {
    params.groupName = VIDEONLY_ALBUM;
  }

  const result = await CameraRoll.getPhotos(params);
  let videos = await Promise.all(result.edges.map(mapEdgeToVideo).map(applyMetadataFallbacks));

  if (source === 'videonly' && videos.length === 0 && !after) {
    const fallbackResult = await CameraRoll.getPhotos({
      first,
      assetType: 'Videos',
      include: ['filename', 'fileSize', 'playableDuration', 'imageSize'],
    });

    videos = await Promise.all(
      fallbackResult.edges
        .map(mapEdgeToVideo)
        .filter(isVideonlyAsset)
        .map(applyMetadataFallbacks),
    );

    return {
      videos: sortVideosByTimestamp(videos),
      pageInfo: fallbackResult.page_info ?? {
        has_next_page: false,
        end_cursor: null,
      },
    };
  }

  return {
    videos: sortVideosByTimestamp(videos),
    pageInfo: result.page_info ?? {
      has_next_page: false,
      end_cursor: null,
    },
  };
}

export async function loadSavedVideosFromCameraRoll(options = {}) {
  const {videos} = await loadVideosPageFromCameraRoll({
    first: options.first ?? 10,
    source: 'videonly',
  });

  return videos;
}

export async function saveVideoToCameraRoll(path) {
  const granted = await ensureCameraRollVideoPermission();
  if (!granted) {
    throw new Error(translate('errors.gallerySavePermission'));
  }

  return CameraRoll.saveAsset(path, {
    type: 'video',
    album: VIDEONLY_ALBUM,
  });
}

export async function deleteVideoFromCameraRoll(uri) {
  const granted = await ensureCameraRollVideoPermission();
  if (!granted) {
    throw new Error(translate('errors.galleryDeletePermission'));
  }

  const canManageMedia = await canManageAndroidMedia();

  await CameraRoll.deletePhotos([uri]);

  return {
    bypassedSystemPrompt:
      Platform.OS === 'android' && Platform.Version >= 31 && canManageMedia,
  };
}
