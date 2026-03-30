import RNFS from 'react-native-fs';

export const VIDEO_DIR = `${RNFS.DocumentDirectoryPath}/Videonly`;

export async function ensureVideoDir() {
  const exists = await RNFS.exists(VIDEO_DIR);
  if (!exists) {
    await RNFS.mkdir(VIDEO_DIR);
  }
  return VIDEO_DIR;
}

export async function saveRecordedVideo(tempPath) {
  const directory = await ensureVideoDir();
  const safeName = `videonly-${Date.now()}.mp4`;
  const destination = `${directory}/${safeName}`;
  await RNFS.moveFile(tempPath, destination);
  return destination;
}

export async function listSavedVideos() {
  await ensureVideoDir();
  const entries = await RNFS.readDir(VIDEO_DIR);
  return entries
    .filter(item => item.isFile())
    .map(item => ({
      path: item.path,
      name: item.name,
      size: item.size,
      mtime: item.mtime,
    }))
    .sort((a, b) => new Date(b.mtime).getTime() - new Date(a.mtime).getTime());
}

export async function deleteSavedVideo(path) {
  const exists = await RNFS.exists(path);
  if (exists) {
    await RNFS.unlink(path);
  }
}
