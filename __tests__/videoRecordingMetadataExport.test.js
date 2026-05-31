jest.mock('react-native', () => ({
  Platform: {OS: 'android'},
}));

jest.mock('react-native-fs', () => ({
  ExternalDirectoryPath: '/tmp/external',
  DocumentDirectoryPath: '/tmp/documents',
  CachesDirectoryPath: '/tmp/cache',
  exists: jest.fn(),
  readDir: jest.fn(),
  readFile: jest.fn(),
  writeFile: jest.fn(),
  mkdir: jest.fn(),
}));

import RNFS from 'react-native-fs';
import {
  exportVideoRecordingMetadata,
  getVideoRecordingMetadataDirectoryPath,
} from '../src/utils/videoRecordingMetadata';

test('exports all metadata files into a single json payload', async () => {
  RNFS.exists.mockResolvedValue(true);
  RNFS.readDir.mockResolvedValue([
    {isFile: () => true, name: 'videonly-a.json', path: '/tmp/external/videonly-recordings/videonly-a.json'},
    {isFile: () => true, name: 'videonly-b.json', path: '/tmp/external/videonly-recordings/videonly-b.json'},
  ]);
  RNFS.readFile
    .mockResolvedValueOnce(JSON.stringify({videoFileName: 'videonly-a.mp4'}))
    .mockResolvedValueOnce(JSON.stringify({videoFileName: 'videonly-b.mp4'}));
  RNFS.writeFile.mockResolvedValue(undefined);

  const result = await exportVideoRecordingMetadata();

  expect(getVideoRecordingMetadataDirectoryPath()).toBe(
    '/tmp/external/videonly-recordings',
  );
  expect(result.totalFiles).toBe(2);
  expect(result.exportPath).toContain('/tmp/cache/videonly-metadata-export-');
  expect(RNFS.writeFile).toHaveBeenCalledWith(
    result.exportPath,
    expect.stringContaining('"totalFiles": 2'),
    'utf8',
  );
});
