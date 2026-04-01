# Project Context: Videonly

**Generated:** 2026-04-01T17:19:59.430Z  
**Total Files:** 8  
**Total Size:** 39.75 KB

## Project Structure

```
src
├── components
│   ├── CameraHeaderActions
│   │   └── CameraHeaderActions.js
│   └── CameraPreview
│       └── CameraPreview.js
├── context
│   └── CameraSettingsContext.js
├── screens
│   ├── CameraScreen
│   │   └── CameraScreen.js
│   └── SettingsScreen
│       └── SettingsScreen.js
└── utils
    ├── cameraFormatUtils.js
    └── cameraRollVideos.js
package.json
```

## Files

### package.json

**Language:** json  
**Size:** 1.64 KB  
**Last Modified:** 2026-03-30T18:27:08.671Z

```json
{
  "name": "Videonly",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "android": "react-native run-android  --active-arch-only",
    "ios": "react-native run-ios",
    "lint": "eslint .",
    "postinstall": "patch-package",
    "start": "react-native start",
    "test": "jest"
  },
  "dependencies": {
    "@react-native-async-storage/async-storage": "^3.0.2",
    "@react-native-camera-roll/camera-roll": "7.10.2",
    "@react-native/new-app-screen": "0.84.1",
    "@react-navigation/native": "^7.2.2",
    "@react-navigation/native-stack": "^7.14.10",
    "react": "19.2.3",
    "react-native": "0.84.1",
    "react-native-fs": "^2.20.0",
    "react-native-gesture-handler": "^2.30.1",
    "react-native-safe-area-context": "^5.7.0",
    "react-native-screens": "^4.24.0",
    "react-native-vector-icons": "^10.3.0",
    "react-native-vision-camera": "^4.7.3"
  },
  "devDependencies": {
    "@babel/core": "^7.25.2",
    "@babel/preset-env": "^7.25.3",
    "@babel/runtime": "^7.25.0",
    "@react-native-community/cli": "20.1.0",
    "@react-native-community/cli-platform-android": "20.1.0",
    "@react-native-community/cli-platform-ios": "20.1.0",
    "@react-native/babel-preset": "0.84.1",
    "@react-native/eslint-config": "0.84.1",
    "@react-native/metro-config": "0.84.1",
    "@react-native/typescript-config": "0.84.1",
    "@types/jest": "^29.5.13",
    "@types/react": "^19.2.0",
    "@types/react-test-renderer": "^19.1.0",
    "eslint": "^8.19.0",
    "jest": "^29.6.3",
    "patch-package": "^8.0.1",
    "prettier": "2.8.8",
    "react-test-renderer": "19.2.3",
    "typescript": "^5.8.3"
  },
  "engines": {
    "node": ">= 22.11.0"
  }
}
```
---

### src/components/CameraHeaderActions/CameraHeaderActions.js

**Language:** javascript  
**Size:** 1.19 KB  
**Last Modified:** 2026-04-01T17:13:58.311Z

```javascript
import React from 'react';
import {Pressable, View} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import {styles} from './styles';

export default function CameraHeaderActions({
  onOpenLibrary,
  onOpenSettings,
  flashMode,
  onToggleFlash,
  isFrontCamera,
}) {
  return (
    <View style={styles.headerActions}>
      {!isFrontCamera && (
        <Pressable
          accessibilityLabel="Alternar flash"
          hitSlop={10}
          onPress={onToggleFlash}
          style={styles.headerIconButton}>
          <Icon
            name={flashMode === 'off' ? 'flashlight-outline' : 'flashlight'}
            size={22}
            color="#fff"
          />
        </Pressable>
      )}
      <Pressable
        accessibilityLabel="Abrir galeria"
        hitSlop={10}
        onPress={onOpenLibrary}
        style={styles.headerIconButton}>
        <Icon name="images-outline" size={24} color="#fff" />
      </Pressable>
      <Pressable
        accessibilityLabel="Abrir configuracoes"
        hitSlop={10}
        onPress={onOpenSettings}
        style={styles.headerIconButton}>
        <Icon name="settings-outline" size={22} color="#fff" />
      </Pressable>
    </View>
  );
}
```
---

### src/components/CameraPreview/CameraPreview.js

**Language:** javascript  
**Size:** 4.19 KB  
**Last Modified:** 2026-04-01T17:17:45.243Z

```javascript
import React, {useMemo} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {Camera, useCameraDevice} from 'react-native-vision-camera';

import {
  parseCameraNumber,
  pickFormatForSettings,
} from '../../utils/cameraFormatUtils';
import {formatElapsedTime} from '../../utils/videoFormatters';
import {styles} from './styles';

export default function CameraPreview({
  camera,
  cameraPosition,
  currentCameraLabel,
  isFocused,
  isProcessingVideo,
  isRecording,
  onToggleCamera,
  recordingElapsedMs,
  settings,
  startRecording,
  stopRecording,
}) {
  const device = useCameraDevice(cameraPosition);
  const selectedFormat = useMemo(() => {
    return pickFormatForSettings(device?.formats ?? [], settings);
  }, [device, settings]);

  const cameraProps = useMemo(
    () => ({
      device,
      isActive: isFocused && !isProcessingVideo,
      audio: settings.audio,
      audioChannels: settings.audioChannels,
      audioSampleRate: parseCameraNumber(settings.audioSampleRate),
      audioBitRateKbps: parseCameraNumber(settings.audioBitRateKbps),
      photo: settings.photo,
      video: settings.video,
      preview: settings.preview,
      enableZoomGesture: settings.enableZoomGesture,
      resizeMode: settings.resizeMode,
      photoQualityBalance: settings.photoQualityBalance,
      zoom: parseCameraNumber(settings.zoom),
      exposure: parseCameraNumber(settings.exposure),
      ...(device?.supportsLowLightBoost
        ? {lowLightBoost: settings.lowLightBoost}
        : {}),
      ...(selectedFormat ? {format: selectedFormat} : {}),
      ...(selectedFormat ? {videoBitRate: settings.videoBitRate} : {}),
      ...(selectedFormat && settings.fps !== ''
        ? {fps: parseCameraNumber(settings.fps)}
        : {}),
      ...(selectedFormat?.supportsVideoHdr ? {videoHdr: settings.videoHdr} : {}),
      ...(selectedFormat?.supportsPhotoHdr ? {photoHdr: settings.photoHdr} : {}),
    }),
    [device, isFocused, isProcessingVideo, selectedFormat, settings],
  );

  const fpsLabel = `FPS: ${cameraProps?.fps ?? 'auto'}`;

  if (device == null) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Buscando câmera {currentCameraLabel}...</Text>
        <Text style={styles.subtitle}>
          Se o aparelho não tiver câmera compatível, nada será exibido.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.cameraWrap}>
      <Camera ref={camera} style={StyleSheet.absoluteFill} {...cameraProps} />
      <View style={styles.topOverlay}>
        {isRecording ? (
          <View style={styles.recordingStatus}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>REC</Text>
            </View>
            <View style={styles.timerPill}>
              <Text style={styles.timerText}>
                {formatElapsedTime(recordingElapsedMs)}
              </Text>
            </View>
          </View>
        ) : (
          <Text>{''}</Text>
        )}
        <Text style={styles.fpsText}>{fpsLabel}</Text>
      </View>

      <View style={styles.controls}>
        <View style={styles.controlsRow}>
          <View style={styles.controlsSideSlot} />
          <Pressable
            disabled={isProcessingVideo}
            onPress={isRecording ? stopRecording : startRecording}
            style={[
              styles.recordButton,
              isRecording && styles.recordButtonActive,
            ]}>
            {isRecording ? (
              <View style={styles.stopIcon} />
            ) : (
              <View style={styles.recordIcon} />
            )}
          </Pressable>
          <Pressable
            accessibilityLabel={`Alternar para câmera ${
              cameraPosition === 'back' ? 'frontal' : 'traseira'
            }`}
            disabled={isRecording || isProcessingVideo}
            onPress={onToggleCamera}
            style={[
              styles.cameraSwitchButton,
              (isRecording || isProcessingVideo) &&
                styles.cameraSwitchButtonDisabled,
            ]}>
            <Icon name="camera-reverse-outline" size={24} color="#fff" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
```
---

### src/context/CameraSettingsContext.js

**Language:** javascript  
**Size:** 2.54 KB  
**Last Modified:** 2026-04-01T13:46:18.981Z

```javascript
import React, {createContext, useContext, useEffect, useMemo, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CameraSettingsContext = createContext(null);
const CAMERA_SETTINGS_STORAGE_KEY = '@videonly/camera-settings';

const DEFAULT_SETTINGS = {
  audio: true,
  audioCodec: 'aac',
  audioChannels: 'stereo',
  audioSampleRate: '44100',
  audioBitRateKbps: '128',
  compressVideoBeforeSave: false,
  recordFileType: 'mp4',
  recordVideoCodec: 'h264',
  videoResolutionPreset: 'auto',
  photo: false,
  video: true,
  enableZoomGesture: true,
  preview: true,
  lowLightBoost: false,
  videoHdr: false,
  photoHdr: false,
  torch: 'off',
  resizeMode: 'cover',
  videoBitRate: 'normal',
  photoQualityBalance: 'balanced',
  fps: '',
  zoom: '',
  exposure: '',
  formatIndex: '',
};

export function CameraSettingsProvider({children}) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadPersistedSettings() {
      try {
        const storedValue = await AsyncStorage.getItem(CAMERA_SETTINGS_STORAGE_KEY);
        if (!storedValue) {
          return;
        }

        const parsedSettings = JSON.parse(storedValue);
        if (!isMounted || !parsedSettings || typeof parsedSettings !== 'object') {
          return;
        }

        setSettings(prev => ({...prev, ...parsedSettings}));
      } catch (error) {
        console.warn('Nao foi possivel carregar as configuracoes salvas.', error);
      } finally {
        if (isMounted) {
          setIsHydrated(true);
        }
      }
    }

    loadPersistedSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    AsyncStorage.setItem(CAMERA_SETTINGS_STORAGE_KEY, JSON.stringify(settings)).catch(error => {
      console.warn('Nao foi possivel salvar as configuracoes.', error);
    });
  }, [isHydrated, settings]);

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  const value = useMemo(
    () => ({
      settings,
      setSettings,
      resetSettings,
    }),
    [settings],
  );

  return (
    <CameraSettingsContext.Provider value={value}>
      {children}
    </CameraSettingsContext.Provider>
  );
}

export function useCameraSettings() {
  const context = useContext(CameraSettingsContext);
  if (!context) {
    throw new Error('useCameraSettings deve ser usado dentro de CameraSettingsProvider');
  }
  return context;
}
```
---

### src/screens/CameraScreen/CameraScreen.js

**Language:** javascript  
**Size:** 13.28 KB  
**Last Modified:** 2026-04-01T17:14:56.349Z

```javascript
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import {AppState, FlatList, Pressable, Text, View} from 'react-native';
import {useIsFocused} from '@react-navigation/native';
import RNFS from 'react-native-fs';
import {
  useCameraPermission,
  useMicrophonePermission,
} from 'react-native-vision-camera';

import {useCameraSettings} from '../../context/CameraSettingsContext';
import CameraHeaderActions from '../../components/CameraHeaderActions/CameraHeaderActions';
import CameraPreview from '../../components/CameraPreview/CameraPreview';
import LoadingModal from '../../components/LoadingModal/LoadingModal';
import VideoCard from '../../components/VideoCard/VideoCard';
import {useCustomAlert} from '../../context/CustomAlertContext';
import {
  loadSavedVideosFromCameraRoll,
  saveVideoToCameraRoll,
} from '../../utils/cameraRollVideos';
import {compressVideo} from '../../utils/videoCompression';
import {openVideoUri, shareVideo} from '../../utils/videoActions';
import {styles} from './styles';

function normalizeFilePath(pathLike) {
  if (!pathLike) {
    return null;
  }

  return pathLike.startsWith('file://') ? pathLike.replace('file://', '') : pathLike;
}

async function deleteIfExists(pathLike) {
  const normalizedPath = normalizeFilePath(pathLike);
  if (!normalizedPath) {
    return;
  }

  try {
    const exists = await RNFS.exists(normalizedPath);
    if (exists) {
      await RNFS.unlink(normalizedPath);
    }
  } catch (error) {
    console.warn('Não foi possível remover arquivo temporário.', error);
  }
}

export default function CameraScreen({navigation}) {
  const camera = useRef(null);
  const recordingStartedAtRef = useRef(null);
  const isFocused = useIsFocused();
  const {hasPermission: hasCameraPermission, requestPermission: requestCameraPermission} =
    useCameraPermission();
  const {
    hasPermission: hasMicrophonePermission,
    requestPermission: requestMicrophonePermission,
  } = useMicrophonePermission();
  const {settings, resetSettings} = useCameraSettings();
  const {showAlert} = useCustomAlert();

  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingVideo, setIsProcessingVideo] = useState(false);
  const [savedVideos, setSavedVideos] = useState([]);
  const [recordingElapsedMs, setRecordingElapsedMs] = useState(0);
  const [cameraPosition, setCameraPosition] = useState('back');
  const currentCameraLabel = cameraPosition === 'back' ? 'traseira' : 'frontal';
  const [appState, setAppState] = useState(AppState.currentState);
  const [cameraSessionKey, setCameraSessionKey] = useState(0);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [activeFlashMode, setActiveFlashMode] = useState('off');

  const loadVideosFromGallery = async () => {
    try {
      const videos = await loadSavedVideosFromCameraRoll();
      setSavedVideos(videos);
    } catch (error) {
      console.error('Erro ao carregar vídeos:', error);
    }
  };

  useEffect(() => {
    loadVideosFromGallery();
  }, []);

  useEffect(() => {
    console.log('AppState changed:', appState);
    const sub = AppState.addEventListener('change', nextState => {
      setAppState(nextState);
      console.log('AppState changed:', nextState);
      if (nextState !== 'active' && isRecording) {
        console.log('Parando gravação devido a mudança de estado do app');
        stopRecording().catch(() => {});
      }
    });

    return () => sub.remove();
  }, [isRecording, stopRecording]);

  const isCameraActive = isFocused && appState === 'active' && !isProcessingVideo;

  useEffect(() => {
    if (!isRecording || !recordingStartedAtRef.current) {
      return undefined;
    }

    const syncElapsed = () => {
      setRecordingElapsedMs(Date.now() - recordingStartedAtRef.current);
    };

    syncElapsed();
    const intervalId = setInterval(syncElapsed, 250);

    return () => clearInterval(intervalId);
  }, [isRecording]);

  const onFlashModeChange = () => {
    setActiveFlashMode(prevMode => (prevMode === 'off' ? 'on' : 'off'));
  };

  const renderHeaderRight = useCallback(
    () => (
      <CameraHeaderActions
        flashMode={activeFlashMode}
      onToggleFlash={onFlashModeChange}
      isFrontCamera={cameraPosition === 'front'}
        onOpenLibrary={() => navigation.navigate('Library')}
        onOpenSettings={() => navigation.navigate('Settings')}
      />
    ),
    [navigation, activeFlashMode, cameraPosition],
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: renderHeaderRight,
    });
  }, [navigation, renderHeaderRight]);

  const ensurePermissions = useCallback(async () => {
    let cameraOk = hasCameraPermission;
    let microphoneOk = hasMicrophonePermission || !settings.audio;

    if (!cameraOk) {
      cameraOk = (await requestCameraPermission()) === 'granted';
    }

    if (settings.audio && !microphoneOk) {
      microphoneOk = (await requestMicrophonePermission()) === 'granted';
    }

    if (!cameraOk || !microphoneOk) {
      showAlert(
        'Permissões necessárias',
        settings.audio
          ? 'Você precisa permitir câmera e microfone para gravar vídeos com áudio.'
          : 'Você precisa permitir câmera para gravar vídeos.',
      );
    }

    return cameraOk && microphoneOk;
  }, [
    hasCameraPermission,
    hasMicrophonePermission,
    requestCameraPermission,
    requestMicrophonePermission,
    settings.audio,
    showAlert,
  ]);

  const handleRecordingFinished = useCallback(
    async video => {
      const originalPath = video.path;
      let pathToSave = originalPath;
      let compressedPath = null;
      let shouldDeleteOriginal = false;

      try {
        setIsRecording(false);
        if (settings.compressVideoBeforeSave) {
          setIsProcessingVideo(true);
          compressedPath = await compressVideo(originalPath);
          pathToSave = compressedPath;
        }

        await saveVideoToCameraRoll(pathToSave);
        shouldDeleteOriginal = true;
        await loadVideosFromGallery();
      } catch (error) {
        console.error(error);
        if (settings.compressVideoBeforeSave) {
          try {
            await saveVideoToCameraRoll(originalPath);
            shouldDeleteOriginal = true;
            await loadVideosFromGallery();
            showAlert(
              'Compressão indisponível',
              'Não foi possível comprimir este vídeo. A versão original foi salva normalmente.',
            );
          } catch (fallbackError) {
            console.error(fallbackError);
            showAlert(
              'Erro ao processar vídeo',
              fallbackError?.message ??
                'Não foi possível comprimir nem salvar o vídeo original.',
            );
          }
        } else {
          showAlert(
            'Erro ao salvar vídeo',
            error?.message ?? 'Não foi possível salvar o vídeo na galeria.',
          );
        }
      } finally {
        setIsProcessingVideo(false);
        if (shouldDeleteOriginal) {
          await deleteIfExists(compressedPath);
          await deleteIfExists(originalPath);
        } else if (compressedPath && compressedPath !== originalPath) {
          await deleteIfExists(compressedPath);
        }
        recordingStartedAtRef.current = null;
        setRecordingElapsedMs(0);
        setIsRecording(false);
      }
    },
    [settings.compressVideoBeforeSave, showAlert],
  );

  const finalizeRecordedVideo = useCallback(
    video => {
      handleRecordingFinished(video).catch(error => {
        console.error('Erro ao finalizar vídeo gravado:', error);
        setIsProcessingVideo(false);
        showAlert(
          'Erro ao processar vídeo',
          error?.message ?? 'Não foi possível finalizar o vídeo gravado.',
        );
      });
    },
    [handleRecordingFinished, showAlert],
  );

  const handleRecordingError = useCallback(
    error => {
      console.error(error);
      recordingStartedAtRef.current = null;
      setRecordingElapsedMs(0);
      setIsRecording(false);
      showAlert(
        'Erro de gravação',
        error?.message ?? 'Não foi possível gravar o vídeo.',
      );
    },
    [showAlert],
  );

  const startRecording = useCallback(async () => {
    if (!camera.current || isRecording && (!isCameraReady || !isCameraActive)) {
      return;
    }

    const ok = await ensurePermissions();
    if (!ok) {
      return;
    }

    try {
      recordingStartedAtRef.current = Date.now();
      setRecordingElapsedMs(0);
      setIsRecording(true);
      camera.current.startRecording({
        fileType: settings.recordFileType,
        videoCodec: settings.recordVideoCodec,
        onRecordingFinished: video => {
          recordingStartedAtRef.current = null;
          setRecordingElapsedMs(0);
          setIsRecording(false);
          finalizeRecordedVideo(video);
        },
        onRecordingError: handleRecordingError,
      });
    } catch (error) {
      recordingStartedAtRef.current = null;
      setRecordingElapsedMs(0);
      setIsRecording(false);
      showAlert('Erro', error?.message ?? 'Falha ao iniciar a gravação.');
    }
  }, [
    ensurePermissions,
    finalizeRecordedVideo,
    handleRecordingError,
    isRecording,
    settings.recordFileType,
    settings.recordVideoCodec,
    showAlert,
  ]);

  const stopRecording = useCallback(async () => {
    if (!camera.current || !isRecording) {
      return;
    }
    try {
      await camera.current.stopRecording();
    } catch (error) {
      recordingStartedAtRef.current = null;
      setRecordingElapsedMs(0);
      setIsRecording(false);
      showAlert('Erro', error?.message ?? 'Falha ao parar a gravação.');
    }
  }, [isRecording, showAlert]);

  const onPermissionPress = useCallback(async () => {
    await ensurePermissions();
  }, [ensurePermissions]);

  const onToggleCamera = useCallback(() => {
    if (isRecording) {
      return;
    }

    resetSettings();
    setCameraPosition(currentPosition =>
      currentPosition === 'back' ? 'front' : 'back',
    );
  }, [isRecording, resetSettings]);

  const onOpenVideo = useCallback(
    async item => {
      try {
        await openVideoUri(item.uri);
      } catch (error) {
        showAlert(
          'Erro ao abrir vídeo',
          error?.message ?? 'Não foi possível abrir este vídeo.',
        );
      }
    },
    [showAlert],
  );

  const onShareVideo = useCallback(
    async item => {
      try {
        await shareVideo(item);
      } catch (error) {
        showAlert(
          'Erro ao compartilhar',
          error?.message ?? 'Não foi possível compartilhar este vídeo.',
        );
      }
    },
    [showAlert],
  );

  const onVideoCardPress = useCallback(
    item => {
      showAlert(
        item.filename || 'Vídeo',
        'Escolha o que deseja fazer com este vídeo.',
        [
          {text: 'Visualizar', onPress: () => onOpenVideo(item)},
          {text: 'Compartilhar', onPress: () => onShareVideo(item)},
          {text: 'Biblioteca', onPress: () => navigation.navigate('Library')},
          {text: 'Cancelar', style: 'cancel'},
        ],
      );
    },
    [navigation, onOpenVideo, onShareVideo, showAlert],
  );

  if (!hasCameraPermission) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Videonly</Text>
        <Text style={styles.subtitle}>
          O app precisa de permissão para acessar a câmera.
        </Text>
        <Pressable style={styles.primaryButton} onPress={onPermissionPress}>
          <Text style={styles.primaryButtonText}>
            Permitir câmera e microfone
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LoadingModal
        message="Estamos comprimindo seu vídeo para gerar um arquivo mais leve antes de salvar."
        title="Comprimindo vídeo"
        visible={isProcessingVideo}
      />
      <CameraPreview
        key={cameraSessionKey}
        camera={camera}
        cameraPosition={cameraPosition}
        currentCameraLabel={currentCameraLabel}
        isFocused={isFocused}
        isProcessingVideo={isProcessingVideo}
        isRecording={isRecording}
        isActive={isCameraActive}
        torch={activeFlashMode}
        onInitialized={() => setIsCameraReady(true)}
        onToggleCamera={onToggleCamera}
        recordingElapsedMs={recordingElapsedMs}
        settings={settings}
        startRecording={startRecording}
        stopRecording={stopRecording}
        onError={error => {
          console.error('Camera runtime error:', error);
          setIsCameraReady(false);
          setIsRecording(false);
          recordingStartedAtRef.current = null;
          setRecordingElapsedMs(0);

          // força recriação da sessão se ela entrou em estado ruim
          setCameraSessionKey(v => v + 1);
        }}
      />

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Vídeos salvos</Text>
        <FlatList
          data={savedVideos}
          keyExtractor={item => item.uri}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.savedVideosContent}
          renderItem={({item}) => (
            <VideoCard compact item={item} onPress={() => onVideoCardPress(item)} />
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Nenhum vídeo salvo ainda.</Text>
          }
        />
      </View>
    </View>
  );
}
```
---

### src/screens/SettingsScreen/SettingsScreen.js

**Language:** javascript  
**Size:** 10.89 KB  
**Last Modified:** 2026-04-01T17:18:19.851Z

```javascript
import React, {useMemo} from 'react';
import {FlatList, Pressable, ScrollView, Text, View} from 'react-native';
import {useCameraDevice} from 'react-native-vision-camera';

import {
  Card,
  NumberField,
  OptionChips,
  SectionTitle,
  ToggleRow,
} from '../../components/SettingRow/SettingRow';
import {useCameraSettings} from '../../context/CameraSettingsContext';
import {styles} from './styles';

const VIDEO_BIT_RATE_OPTIONS = [
  {label: 'extra-low', value: 'extra-low'},
  {label: 'low', value: 'low'},
  {label: 'normal', value: 'normal'},
  {label: 'high', value: 'high'},
  {label: 'extra-high', value: 'extra-high'},
];

const PHOTO_BALANCE_OPTIONS = [
  {label: 'speed', value: 'speed'},
  {label: 'balanced', value: 'balanced'},
  {label: 'quality', value: 'quality'},
];

const RESIZE_MODE_OPTIONS = [
  {label: 'cover', value: 'cover'},
  {label: 'contain', value: 'contain'},
];

const AUDIO_CHANNEL_OPTIONS = [
  {label: 'Stereo (2 canais)', value: 'stereo'},
  {label: 'Mono (1 canal)', value: 'mono'},
];

const AUDIO_CODEC_OPTIONS = [
  {label: 'AAC', value: 'aac'},
  {label: 'MP3 (fallback AAC no Android)', value: 'mp3'},
];

const AUDIO_SAMPLE_RATE_OPTIONS = [
  {label: '32000 Hz', value: '32000'},
  {label: '44100 Hz', value: '44100'},
  {label: '48000 Hz', value: '48000'},
];

const RECORD_FILE_TYPE_OPTIONS = [
  {label: 'mp4', value: 'mp4'},
  {label: 'mov', value: 'mov'},
];

const RECORD_VIDEO_CODEC_OPTIONS = [
  {label: 'h264', value: 'h264'},
  {label: 'h265', value: 'h265'},
];

function getVideoResolutionPresetLabel(preset) {
  switch (preset) {
    case '480p':
      return '480p';
    case '720p':
      return '720p';
    case '1080p':
      return '1080p';
    case '2k':
      return '2K';
    case '4k':
      return '4K';
    default:
      return 'Auto';
  }
}

function buildResolutionOptions(formats) {
  const heights = new Set((formats || []).map(format => format.videoHeight).filter(Boolean));
  const options = [{label: 'Auto', value: 'auto'}];

  if (heights.has(480)) {
    options.push({label: '480p', value: '480p'});
  }
  if (heights.has(720)) {
    options.push({label: '720p', value: '720p'});
  }
  if (heights.has(1080)) {
    options.push({label: '1080p', value: '1080p'});
  }
  if (heights.has(1440)) {
    options.push({label: '2K', value: '2k'});
  }
  if (heights.has(2160)) {
    options.push({label: '4K', value: '4k'});
  }

  return options;
}

export default function SettingsScreen() {
  const device = useCameraDevice('back');
  const {settings, setSettings, resetSettings} = useCameraSettings();
  const formats = useMemo(() => device?.formats ?? [], [device]);
  const resolutionOptions = useMemo(() => buildResolutionOptions(formats), [formats]);

  const selectedFormatIndex = useMemo(() => {
    const index = settings.formatIndex === '' ? undefined : Number(settings.formatIndex);
    if (index === undefined || Number.isNaN(index)) {
      return '';
    }
    return index;
  }, [settings.formatIndex]);

  const update = patch => setSettings(prev => ({...prev, ...patch}));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Configurações da câmera</Text>
      <Text style={styles.subtitle}>
        Os ajustes abaixo influenciam a captura de vídeo e foto.
      </Text>

      <SectionTitle>Captura</SectionTitle>
      <Card>
        <ToggleRow
          label="Vídeo"
          description="Habilita gravação com startRecording()."
          value={settings.video}
          onValueChange={value => update({video: value})}
        />
        <ToggleRow
          label="Áudio"
          description="Habilita gravação com áudio. Exige permissão de microfone."
          value={settings.audio}
          onValueChange={value => update({audio: value})}
        />
        <ToggleRow
          label="Foto"
          description="Deixa o modo de foto disponível."
          value={settings.photo}
          onValueChange={value => update({photo: value})}
        />
        <ToggleRow
          label="Preview"
          description="Mostra o preview da câmera."
          value={settings.preview}
          onValueChange={value => update({preview: value})}
        />
        <ToggleRow
          label="Compressão para upload"
          description="Após gravar, comprime o vídeo antes de salvar para gerar arquivos mais leves."
          value={settings.compressVideoBeforeSave}
          onValueChange={value => update({compressVideoBeforeSave: value})}
        />
      </Card>

      <SectionTitle>Interação e comportamento</SectionTitle>
      <Card>
        <ToggleRow
          label="Zoom por gesto"
          description="Ativa o pinch-to-zoom nativo."
          value={settings.enableZoomGesture}
          onValueChange={value => update({enableZoomGesture: value})}
        />
        <ToggleRow
          label="Low light boost"
          description="Pode ajudar em ambientes escuros, dependendo do aparelho."
          value={settings.lowLightBoost}
          onValueChange={value => update({lowLightBoost: value})}
        />
      </Card>

      <SectionTitle>Formato e imagem</SectionTitle>
      <Card>
        <Text style={styles.label}>Resize mode</Text>
        <OptionChips
          value={settings.resizeMode}
          options={RESIZE_MODE_OPTIONS}
          onChange={value => update({resizeMode: value})}
        />

        <View style={styles.sectionSpacer} />

        <Text style={styles.label}>Video bit rate</Text>
        <OptionChips
          value={settings.videoBitRate}
          options={VIDEO_BIT_RATE_OPTIONS}
          onChange={value => update({videoBitRate: value})}
        />

        <View style={styles.sectionSpacer} />

        <Text style={styles.label}>Photo quality balance</Text>
        <OptionChips
          value={settings.photoQualityBalance}
          options={PHOTO_BALANCE_OPTIONS}
          onChange={value => update({photoQualityBalance: value})}
        />
      </Card>

      <SectionTitle>Valores numéricos</SectionTitle>
      <Card>
        <NumberField
          label="FPS"
          value={settings.fps}
          onChangeText={text => update({fps: text})}
          placeholder="ex.: 30"
        />
        <NumberField
          label="Zoom"
          value={settings.zoom}
          onChangeText={text => update({zoom: text})}
          placeholder="ex.: 1"
        />
        <NumberField
          label="Exposure"
          value={settings.exposure}
          onChangeText={text => update({exposure: text})}
          placeholder="ex.: 0"
        />
      </Card>

      <SectionTitle>Audio da gravacao</SectionTitle>
      <Card>
        <Text style={styles.helper}>
          No Android nativo, canais, sample rate e bitrate sao aplicados na gravacao. `mp3` nao e suportado pelo pipeline de video e usa fallback para `aac`.
        </Text>
        <View style={styles.sectionSpacer} />

        <Text style={styles.label}>Codec de audio</Text>
        <OptionChips
          value={settings.audioCodec}
          options={AUDIO_CODEC_OPTIONS}
          onChange={value => update({audioCodec: value})}
        />

        <View style={styles.sectionSpacer} />

        <Text style={styles.label}>Canais</Text>
        <OptionChips
          value={settings.audioChannels}
          options={AUDIO_CHANNEL_OPTIONS}
          onChange={value => update({audioChannels: value})}
        />

        <View style={styles.sectionSpacer} />

        <Text style={styles.label}>Sample rate</Text>
        <OptionChips
          value={settings.audioSampleRate}
          options={AUDIO_SAMPLE_RATE_OPTIONS}
          onChange={value => update({audioSampleRate: value})}
        />

        <View style={styles.sectionSpacer} />

        <NumberField
          label="Bitrate de audio (kbps)"
          value={settings.audioBitRateKbps}
          onChangeText={text => update({audioBitRateKbps: text})}
          placeholder="ex.: 128"
        />
      </Card>

      <SectionTitle>Gravação</SectionTitle>
      <Card>
        <Text style={styles.helper}>
          No Android atual, a VisionCamera permite controlar audio ligado/desligado, formato do arquivo e codec de video.
        </Text>
        <View style={styles.sectionSpacer} />

        <Text style={styles.label}>Resolução de vídeo</Text>
        <OptionChips
          value={settings.videoResolutionPreset}
          options={resolutionOptions}
          onChange={value => update({videoResolutionPreset: value, formatIndex: ''})}
        />

        <View style={styles.sectionSpacer} />

        <Text style={styles.label}>Formato do arquivo</Text>
        <OptionChips
          value={settings.recordFileType}
          options={RECORD_FILE_TYPE_OPTIONS}
          onChange={value => update({recordFileType: value})}
        />

        <View style={styles.sectionSpacer} />

        <Text style={styles.label}>Codec de vídeo</Text>
        <OptionChips
          value={settings.recordVideoCodec}
          options={RECORD_VIDEO_CODEC_OPTIONS}
          onChange={value => update({recordVideoCodec: value})}
        />
      </Card>

      <SectionTitle>Formato do dispositivo</SectionTitle>
      <Card>
        <Text style={styles.helper}>
          {device
            ? `Dispositivo encontrado: ${device.position} · ${formats.length} formatos disponíveis · resolução atual: ${getVideoResolutionPresetLabel(settings.videoResolutionPreset)}`
            : 'Buscando dispositivo traseiro...'}
        </Text>

        {formats.length > 0 ? (
          <FlatList
            data={formats}
            keyExtractor={(_, index) => String(index)}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.formatsContent}
            renderItem={({item, index}) => {
              const active = selectedFormatIndex === index;
              const label = `${item.videoHeight ?? '?'}p · ${item.videoWidth ?? '?'}w · ${item.maxFps ?? item.minFps ?? '?'} FPS`;
              return (
                <Pressable
                  onPress={() =>
                    update({
                      formatIndex: String(index),
                      videoResolutionPreset: 'auto',
                    })
                  }
                  style={[styles.formatChip, active && styles.formatChipActive]}>
                  <Text style={[styles.formatTitle, active && styles.formatTitleActive]}>
                    {label}
                  </Text>
                  <Text style={styles.formatMeta}>
                    {item.supportsVideoHdr ? 'HDR vídeo' : 'SDR'} · {item.supportsPhotoHdr ? 'HDR foto' : 'foto SDR'}
                  </Text>
                </Pressable>
              );
            }}
          />
        ) : (
          <Text style={styles.helper}>Sem formatos detectados.</Text>
        )}

        <Pressable style={styles.resetButton} onPress={resetSettings}>
          <Text style={styles.resetText}>Restaurar padrões</Text>
        </Pressable>
      </Card>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}
```
---

### src/utils/cameraFormatUtils.js

**Language:** javascript  
**Size:** 3.13 KB  
**Last Modified:** 2026-04-01T13:46:18.983Z

```javascript
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
```
---

### src/utils/cameraRollVideos.js

**Language:** javascript  
**Size:** 2.9 KB  
**Last Modified:** 2026-03-31T11:43:08.121Z

```javascript
import {PermissionsAndroid, Platform} from 'react-native';
import {CameraRoll} from '@react-native-camera-roll/camera-roll';

export const VIDEONLY_ALBUM = 'Videonly';

function mapEdgeToVideo(edge) {
  const node = edge.node;
  const filename = node.image.filename || `video-${node.timestamp}`;

  return {
    uri: node.image.uri,
    thumbnailUri: node.image.uri,
    filename,
    duration: node.image.playableDuration || 0,
    timestamp: node.timestamp,
    size: node.image.fileSize || 0,
    width: node.image.width || 0,
    height: node.image.height || 0,
    name: filename,
    path: node.image.uri,
    mtime: (node.modificationTimestamp || node.timestamp || 0) * 1000,
  };
}

function isVideonlyAsset(video) {
  return typeof video.filename === 'string' && video.filename.startsWith('videonly-');
}

export async function ensureCameraRollVideoPermission() {
  if (Platform.OS !== 'android') {
    return true;
  }

  if (Platform.Version >= 33) {
    const permission = PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO;
    const alreadyGranted = await PermissionsAndroid.check(permission);
    if (alreadyGranted) {
      return true;
    }

    const result = await PermissionsAndroid.request(permission);
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }

  const readPermission = PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
  const readGranted = await PermissionsAndroid.check(readPermission);

  if (readGranted) {
    return true;
  }

  const result = await PermissionsAndroid.request(readPermission);
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

export async function loadSavedVideosFromCameraRoll() {
  const granted = await ensureCameraRollVideoPermission();
  if (!granted) {
    throw new Error('Permissão para ler vídeos da galeria não foi concedida.');
  }

  const baseParams = {
    first: 100,
    assetType: 'Videos',
    include: ['filename', 'fileSize', 'playableDuration', 'imageSize'],
  };

  const albumResult = await CameraRoll.getPhotos({
    ...baseParams,
    groupName: VIDEONLY_ALBUM,
  });

  let videos = albumResult.edges.map(mapEdgeToVideo);

  if (videos.length === 0) {
    const allVideosResult = await CameraRoll.getPhotos(baseParams);
    videos = allVideosResult.edges.map(mapEdgeToVideo).filter(isVideonlyAsset);
  }

  return videos.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
}

export async function saveVideoToCameraRoll(path) {
  const granted = await ensureCameraRollVideoPermission();
  if (!granted) {
    throw new Error('Permissão para salvar vídeos na galeria não foi concedida.');
  }

  return CameraRoll.saveAsset(path, {
    type: 'video',
    album: VIDEONLY_ALBUM,
  });
}

export async function deleteVideoFromCameraRoll(uri) {
  const granted = await ensureCameraRollVideoPermission();
  if (!granted) {
    throw new Error('Permissão para excluir vídeos da galeria não foi concedida.');
  }

  await CameraRoll.deletePhotos([uri]);
}
```
---

