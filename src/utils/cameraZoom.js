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

/**
 * Converte um valor de zoom para uma posição normalizada [0, 1] na barra.
 * Usa escala logarítmica para que a barra pareça uniforme ao usuário
 * (cada "vez" percorre o mesmo espaço visual).
 *
 * 0 = fundo (minZoom), 1 = topo (maxZoom)
 */
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

export function getZoomSliderProgress(zoom, device) {
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

  return (clampedZoom - minZoom) / (maxZoom - minZoom);
}

/**
 * Inverso exato de getNormalizedZoomValue (escala logarítmica → exponencial).
 * normalizedZoom = 0 → minZoom, normalizedZoom = 1 → maxZoom
 */
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

export function getZoomFromSliderProgress(progress, device) {
  if (!device) {
    return 1;
  }

  const minZoom = Number.isFinite(device.minZoom) ? device.minZoom : 1;
  const maxZoom = Number.isFinite(device.maxZoom) ? device.maxZoom : minZoom;
  const clampedProgress = clamp(progress, 0, 1);

  return minZoom + (maxZoom - minZoom) * clampedProgress;
}

/**
 * Converte a posição Y do dedo na barra para um valor de zoom.
 *
 * IMPORTANTE: usa getZoomFromNormalizedValue (exponencial) para ser o
 * inverso exato de getNormalizedZoomValue (logarítmica). Antes usava
 * getZoomFromSliderProgress (linear), causando divergência entre a
 * posição visual do fill/thumb e o valor real — visível como a barra
 * excedendo o thumb nos valores altos (7x–10x).
 *
 * positionY = 0       → topo → maxZoom
 * positionY = height  → fundo → minZoom
 */
export function getZoomFromTrackPosition(
  positionY,
  trackHeight,
  device,
  thumbSize = 0,
) {
  const usableHeight = Math.max(trackHeight - thumbSize, 1);
  const normalizedFromTop = clamp(
    (positionY - thumbSize / 2) / usableHeight,
    0,
    1,
  );
  // progress: 0 = fundo (minZoom), 1 = topo (maxZoom)
  const progress = 1 - normalizedFromTop;

  // Usa escala logarítmica — mesmo sistema de getNormalizedZoomValue
  return getZoomFromNormalizedValue(progress, device);
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