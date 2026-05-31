jest.mock('react-native', () => ({
  Platform: {OS: 'android'},
}));

jest.mock('react-native-fs', () => ({
  ExternalDirectoryPath: '/tmp/external',
  DocumentDirectoryPath: '/tmp/documents',
  CachesDirectoryPath: '/tmp/cache',
  exists: jest.fn(),
  readDir: jest.fn(),
  unlink: jest.fn(),
}));

import RNFS from 'react-native-fs';
import {
  deleteVideoRecordingMetadata,
  getVideoRecordingMetadataDirectoryPath,
} from '../src/utils/videoRecordingMetadata';

test('deletes all metadata json files from the metadata directory', async () => {
  RNFS.exists.mockResolvedValue(true);
  RNFS.readDir.mockResolvedValue([
    {isFile: () => true, name: 'a.json', path: '/tmp/external/videonly-recordings/a.json'},
    {isFile: () => true, name: 'b.json', path: '/tmp/external/videonly-recordings/b.json'},
    {isFile: () => true, name: 'notes.txt', path: '/tmp/external/videonly-recordings/notes.txt'},
  ]);
  RNFS.unlink.mockResolvedValue(undefined);

  const result = await deleteVideoRecordingMetadata();

  expect(getVideoRecordingMetadataDirectoryPath()).toBe(
    '/tmp/external/videonly-recordings',
  );
  expect(result.deletedFiles).toBe(2);
  expect(RNFS.unlink).toHaveBeenNthCalledWith(
    1,
    '/tmp/external/videonly-recordings/a.json',
  );
  expect(RNFS.unlink).toHaveBeenNthCalledWith(
    2,
    '/tmp/external/videonly-recordings/b.json',
  );
});
