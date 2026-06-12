/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

jest.mock('../src/utils/appPermissions', () => ({
  ensureStartupPermissions: jest.fn(() =>
    Promise.resolve({
      allGranted: true,
      cameraOk: true,
      galleryOk: true,
      microphoneOk: true,
    }),
  ),
}));

test('renders correctly', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer | null = null;

  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<App />);
  });

  await ReactTestRenderer.act(() => {
    renderer?.unmount();
  });
});
