function parseMaybeNumber(value) {
  if (value === '' || value === null || value === undefined) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function getTargetHeightForPreset(preset) {
  switch (preset) {
    case '480p':
      return 480;
    case '720p':
      return 720;
    case '1080p':
      return 1080;
    case '2k':
      return 1440;
    case '4k':
      return 2160;
    default:
      return undefined;
  }
}

function getAutoPreferredHeights() {
  return [1080, 720, 480, 1440, 2160];
}

function sortFormatsByPreference(formats, preferredHeights) {
  return [...formats].sort((left, right) => {
    const leftHeight = left.videoHeight ?? 0;
    const rightHeight = right.videoHeight ?? 0;
    const leftPreferredIndex = preferredHeights.indexOf(leftHeight);
    const rightPreferredIndex = preferredHeights.indexOf(rightHeight);
    const normalizedLeftIndex =
      leftPreferredIndex === -1 ? preferredHeights.length : leftPreferredIndex;
    const normalizedRightIndex =
      rightPreferredIndex === -1 ? preferredHeights.length : rightPreferredIndex;

    if (normalizedLeftIndex !== normalizedRightIndex) {
      return normalizedLeftIndex - normalizedRightIndex;
    }

    if (leftHeight !== rightHeight) {
      return leftHeight - rightHeight;
    }

    return (left.videoWidth ?? 0) - (right.videoWidth ?? 0);
  });
}

export function pickFormatForSettings(formats, settings) {
  if (!Array.isArray(formats) || formats.length === 0) {
    return undefined;
  }

  const requestedFps = parseMaybeNumber(settings.fps);
  const targetHeight = getTargetHeightForPreset(settings.videoResolutionPreset);
  const requiresFormat =
    settings.formatIndex !== '' ||
    settings.videoResolutionPreset !== 'auto' ||
    requestedFps !== undefined ||
    settings.videoBitRate !== 'normal' ||
    settings.videoHdr ||
    settings.photoHdr;

  if (!requiresFormat) {
    return undefined;
  }

  const explicitIndex =
    settings.formatIndex === '' ? undefined : Number(settings.formatIndex);
  if (
    explicitIndex !== undefined &&
    !Number.isNaN(explicitIndex) &&
    formats[explicitIndex]
  ) {
    return formats[explicitIndex];
  }

  const preferredFormats =
    targetHeight !== undefined
      ? sortFormatsByPreference(formats, [targetHeight])
      : sortFormatsByPreference(formats, getAutoPreferredHeights());

  return (
    preferredFormats.find(format => {
      const fpsMatches =
        requestedFps === undefined ||
        (typeof format.minFps === 'number' &&
          typeof format.maxFps === 'number' &&
          requestedFps >= format.minFps &&
          requestedFps <= format.maxFps);
      const videoHdrMatches = !settings.videoHdr || format.supportsVideoHdr;
      const photoHdrMatches = !settings.photoHdr || format.supportsPhotoHdr;
      const resolutionMatches =
        targetHeight === undefined || format.videoHeight === targetHeight;

      return (
        fpsMatches &&
        videoHdrMatches &&
        photoHdrMatches &&
        resolutionMatches
      );
    }) || formats[0]
  );
}

export function parseCameraNumber(value) {
  return parseMaybeNumber(value);
}
