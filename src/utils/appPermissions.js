import {PermissionsAndroid, Platform} from 'react-native';
import {Camera} from 'react-native-vision-camera';

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getAndroidGalleryPermissions() {
  if (Platform.OS !== 'android') {
    return [];
  }

  const permissions = [];

  if (Platform.Version < 33) {
    permissions.push(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE);
  }

  return permissions;
}

async function ensureAndroidPermissions(permissions, {request = true} = {}) {
  if (Platform.OS !== 'android' || permissions.length === 0) {
    return true;
  }

  const checks = await Promise.all(
    permissions.map(async permission => [permission, await PermissionsAndroid.check(permission)]),
  );

  const missingPermissions = checks
    .filter(([, granted]) => !granted)
    .map(([permission]) => permission);

  if (missingPermissions.length === 0) {
    return true;
  }

  if (!request) {
    return false;
  }

  const statuses = await PermissionsAndroid.requestMultiple(missingPermissions);

  return missingPermissions.every(
    permission => statuses[permission] === PermissionsAndroid.RESULTS.GRANTED,
  );
}

async function getAndroidGalleryPermissionState() {
  if (Platform.OS !== 'android') {
    return {
      fullAccess: true,
      limitedAccess: false,
      granted: true,
    };
  }

  if (Platform.Version >= 33) {
    return {
      fullAccess: true,
      limitedAccess: false,
      granted: true,
    };
  }

  const granted = await ensureAndroidPermissions(getAndroidGalleryPermissions(), {
    request: false,
  });

  return {
    fullAccess: granted,
    limitedAccess: false,
    granted,
  };
}

export async function getCameraRollVideoPermissionStatus() {
  const status = await getAndroidGalleryPermissionState();

  return {
    granted: status.granted,
    isLimited: status.limitedAccess,
    isFullAccess: status.fullAccess,
  };
}

export async function ensureCameraRollVideoPermission({request = true} = {}) {
  const currentState = await getAndroidGalleryPermissionState();
  if (currentState.granted) {
    return true;
  }

  if (!request) {
    return false;
  }

  if (Platform.OS !== 'android') {
    return true;
  }

  if (Platform.Version >= 33) {
    return true;
  }

  return ensureAndroidPermissions(getAndroidGalleryPermissions(), {request: true});
}

async function ensureVisionCameraPermission({
  getStatus,
  requestPermission,
  request = true,
}) {
  let currentStatus = await getStatus();
  if (currentStatus === 'granted') {
    return true;
  }

  if (!request) {
    return false;
  }

  currentStatus = await requestPermission();
  if (currentStatus === 'granted') {
    return true;
  }

  return (await getStatus()) === 'granted';
}

export async function ensureCameraPermission({request = true} = {}) {
  return ensureVisionCameraPermission({
    getStatus: () => Camera.getCameraPermissionStatus(),
    requestPermission: () => Camera.requestCameraPermission(),
    request,
  });
}

export async function ensureMicrophonePermission({request = true} = {}) {
  return ensureVisionCameraPermission({
    getStatus: () => Camera.getMicrophonePermissionStatus(),
    requestPermission: () => Camera.requestMicrophonePermission(),
    request,
  });
}

export async function ensureStartupPermissions({
  includeMicrophone = true,
  request = true,
} = {}) {
  const cameraOk = await ensureCameraPermission({request});

  if (request && includeMicrophone) {
    await wait(250);
  }

  const microphoneOk = includeMicrophone
    ? await ensureMicrophonePermission({request})
    : true;

  if (request) {
    await wait(250);
  }

  const galleryOk = await ensureCameraRollVideoPermission({request});

  return {
    allGranted: galleryOk && cameraOk && microphoneOk,
    cameraOk,
    galleryOk,
    microphoneOk,
  };
}
