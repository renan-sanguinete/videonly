export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function formatZoomFactor(value) {
  if (!Number.isFinite(value)) {
    return '1x';
  }

  const rounded = Math.round(value * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)}x`;
}

export function getNormalizedZoomValue(zoom, device) {
  if (!device) {
    return 0;
  }

  const minZoom = Number.isFinite(device.minZoom) ? device.minZoom : 1;
  const maxZoom = Number.isFinite(device.maxZoom) ? device.maxZoom : minZoom;
  const clampedZoom = clamp(
    Number.isFinite(zoom) ? zoom : device.neutralZoom ?? minZoom,
    minZoom,
    maxZoom,
  );

  if (maxZoom === minZoom) {
    return 0;
  }

  return Math.log(clampedZoom / minZoom) / Math.log(maxZoom / minZoom);
}

export function getZoomFromNormalizedValue(normalizedZoom, device) {
  if (!device) {
    return 1;
  }

  const minZoom = Number.isFinite(device.minZoom) ? device.minZoom : 1;
  const maxZoom = Number.isFinite(device.maxZoom) ? device.maxZoom : minZoom;
  const clampedNormalized = clamp(normalizedZoom, 0, 1);

  if (maxZoom === minZoom) {
    return minZoom;
  }

  return minZoom * Math.pow(maxZoom / minZoom, clampedNormalized);
}

export function getZoomFromTrackPosition(positionY, trackHeight, device) {
  const usableHeight = Math.max(trackHeight, 1);
  const normalizedFromTop = clamp(positionY / usableHeight, 0, 1);
  const normalizedZoom = 1 - normalizedFromTop;

  return getZoomFromNormalizedValue(normalizedZoom, device);
}

export function getInitialZoomValue(settingsZoom, device) {
  if (!device) {
    return 1;
  }

  const minZoom = Number.isFinite(device.minZoom) ? device.minZoom : 1;
  const maxZoom = Number.isFinite(device.maxZoom) ? device.maxZoom : minZoom;
  const fallbackZoom = device.neutralZoom ?? minZoom;
  const hasExplicitZoom =
    settingsZoom !== '' && settingsZoom !== null && settingsZoom !== undefined;
  const parsedZoom = Number(settingsZoom);
  const nextZoom =
    hasExplicitZoom && Number.isFinite(parsedZoom) ? parsedZoom : fallbackZoom;

  return clamp(nextZoom, minZoom, maxZoom);
}
