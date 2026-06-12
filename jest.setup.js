/* global jest */

import 'react-native-gesture-handler/jestSetup';

jest.mock('@react-native-async-storage/async-storage', () => {
  const storage = {};

  return {
    getItem: jest.fn(key => Promise.resolve(storage[key] ?? null)),
    setItem: jest.fn((key, value) => {
      storage[key] = value;
      return Promise.resolve();
    }),
    removeItem: jest.fn(key => {
      delete storage[key];
      return Promise.resolve();
    }),
    clear: jest.fn(() => {
      Object.keys(storage).forEach(key => {
        delete storage[key];
      });
      return Promise.resolve();
    }),
  };
});

jest.mock('react-native-vision-camera', () => {
  const React = require('react');
  const {View} = require('react-native');
  const MockCamera = React.forwardRef((props, ref) =>
    React.createElement(View, {...props, ref}),
  );

  MockCamera.getCameraPermissionStatus = jest.fn(() =>
    Promise.resolve('granted'),
  );
  MockCamera.requestCameraPermission = jest.fn(() =>
    Promise.resolve('granted'),
  );
  MockCamera.getMicrophonePermissionStatus = jest.fn(() =>
    Promise.resolve('granted'),
  );
  MockCamera.requestMicrophonePermission = jest.fn(() =>
    Promise.resolve('granted'),
  );

  return {
    Camera: MockCamera,
    useCameraDevice: () => ({
      formats: [],
      minZoom: 1,
      maxZoom: 1,
      neutralZoom: 1,
      supportsLowLightBoost: false,
    }),
    useCameraPermission: () => ({
      hasPermission: true,
      requestPermission: jest.fn(() => Promise.resolve(true)),
    }),
    useMicrophonePermission: () => ({
      hasPermission: true,
      requestPermission: jest.fn(() => Promise.resolve(true)),
    }),
  };
});

jest.mock('react-native-fs', () => ({
  CachesDirectoryPath: '/tmp',
  DocumentDirectoryPath: '/tmp',
  ExternalDirectoryPath: '/tmp',
  exists: jest.fn(() => Promise.resolve(false)),
  mkdir: jest.fn(() => Promise.resolve()),
  readDir: jest.fn(() => Promise.resolve([])),
  readFile: jest.fn(() => Promise.resolve('')),
  writeFile: jest.fn(() => Promise.resolve()),
  unlink: jest.fn(() => Promise.resolve()),
  copyFile: jest.fn(() => Promise.resolve()),
  moveFile: jest.fn(() => Promise.resolve()),
  stat: jest.fn(() => Promise.resolve({size: 0})),
}));

jest.mock('@react-native-camera-roll/camera-roll', () => ({
  CameraRoll: {
    getPhotos: jest.fn(() =>
      Promise.resolve({
        edges: [],
        page_info: {has_next_page: false, end_cursor: null},
      }),
    ),
    saveAsset: jest.fn(() => Promise.resolve({node: {image: {uri: ''}}})),
    deletePhotos: jest.fn(() => Promise.resolve(true)),
  },
}));
