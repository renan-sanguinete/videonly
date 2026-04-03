import {NativeModules, PermissionsAndroid, Platform} from 'react-native';
import {Camera} from 'react-native-vision-camera';

const {MediaManagementModule} = NativeModules;

function getAndroidGalleryPermissions() {
  if (Platform.OS !== 'android') {
    return [];
  }

  const permissions = [];

  if (Platform.Version >= 33) {
    permissions.push(PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO);
  } else {
    permissions.push(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE);
  }

  if (Platform.Version <= 29) {
    permissions.push(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE);
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

export async function ensureCameraRollVideoPermission(options) {
  return ensureAndroidPermissions(getAndroidGalleryPermissions(), options);
}

export async function ensureStartupPermissions({
  includeMicrophone = true,
  request = true,
} = {}) {
  const galleryOk = await ensureCameraRollVideoPermission({request});

  let cameraStatus = await Camera.getCameraPermissionStatus();
  if (request && cameraStatus !== 'granted') {
    cameraStatus = await Camera.requestCameraPermission();
  }

  let microphoneStatus = 'granted';
  if (includeMicrophone) {
    microphoneStatus = await Camera.getMicrophonePermissionStatus();
    if (request && microphoneStatus !== 'granted') {
      microphoneStatus = await Camera.requestMicrophonePermission();
    }
  }

  const finalCameraStatus = await Camera.getCameraPermissionStatus();
  const finalMicrophoneStatus = includeMicrophone
    ? await Camera.getMicrophonePermissionStatus()
    : 'granted';

  const cameraOk = finalCameraStatus === 'granted';
  const microphoneOk = finalMicrophoneStatus === 'granted';

  return {
    allGranted: galleryOk && cameraOk && microphoneOk,
    cameraOk,
    galleryOk,
    microphoneOk,
  };
}

export async function canManageAndroidMedia() {
  if (
    Platform.OS !== 'android' ||
    Platform.Version < 31 ||
    !MediaManagementModule?.canManageMedia
  ) {
    return false;
  }

  try {
    return (await MediaManagementModule.canManageMedia()) === true;
  } catch (error) {
    console.warn('Nao foi possivel verificar acesso de gerenciamento de midia.', error);
    return false;
  }
}

export async function openAndroidManageMediaSettings() {
  if (
    Platform.OS !== 'android' ||
    Platform.Version < 31 ||
    !MediaManagementModule?.openManageMediaSettings
  ) {
    return false;
  }

  try {
    return (await MediaManagementModule.openManageMediaSettings()) === true;
  } catch (error) {
    console.warn('Nao foi possivel abrir configurações de gerenciamento de midia.', error);
    return false;
  }
}
