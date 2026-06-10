import {
  formatZoomFactor,
  getInitialZoomValue,
  getNormalizedZoomValue,
  getZoomFromNormalizedValue,
  getZoomFromTrackPosition,
} from '../src/utils/cameraZoom';

const device = {
  minZoom: 0.5,
  maxZoom: 8,
  neutralZoom: 1,
};

test('camera zoom helpers map values and labels consistently', () => {
  expect(formatZoomFactor(1)).toBe('1x');
  expect(formatZoomFactor(1.24)).toBe('1.2x');
  expect(formatZoomFactor(1.25)).toBe('1.3x');

  expect(getInitialZoomValue('', device)).toBe(1);
  expect(getInitialZoomValue('999', device)).toBe(8);

  expect(getZoomFromNormalizedValue(0, device)).toBeCloseTo(0.5, 6);
  expect(getZoomFromNormalizedValue(1, device)).toBeCloseTo(8, 6);

  const middleZoom = getZoomFromNormalizedValue(0.5, device);
  expect(getNormalizedZoomValue(middleZoom, device)).toBeCloseTo(0.5, 6);

  expect(getZoomFromTrackPosition(0, 240, device)).toBeCloseTo(8, 6);
  expect(getZoomFromTrackPosition(240, 240, device)).toBeCloseTo(0.5, 6);
});
