import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {ActivityIndicator, AppState, FlatList, Pressable, Text, View} from 'react-native';
import {useFocusEffect, useIsFocused} from '@react-navigation/native';
import RNFS from 'react-native-fs';
import {
  Camera,
  useCameraPermission,
  useMicrophonePermission,
} from 'react-native-vision-camera';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

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
import {generateVideoFileName} from '../../utils/videoFormatters';
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
  const appStateRef = useRef(AppState.currentState);
  const isRecordingRef = useRef(false);
  const recoveryTimeoutRef = useRef(null);
  const isUnmountedRef = useRef(false);
  const hasBootstrappedInitialFlowRef = useRef(false);
  const isRequestingPermissionsRef = useRef(false);
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const {hasPermission: hasCameraPermission, requestPermission: requestCameraPermission} =
    useCameraPermission();
  const {
    hasPermission: hasMicrophonePermission,
    requestPermission: requestMicrophonePermission,
  } = useMicrophonePermission();
  const {isHydrated, settings, setSettings} = useCameraSettings();
  const {showAlert} = useCustomAlert();

  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingVideo, setIsProcessingVideo] = useState(false);
  const [savedVideos, setSavedVideos] = useState([]);
  const [isLoadingSavedVideos, setIsLoadingSavedVideos] = useState(true);
  const [recordingElapsedMs, setRecordingElapsedMs] = useState(0);
  const [cameraPosition, setCameraPosition] = useState('back');
  const currentCameraLabel = cameraPosition === 'back' ? 'traseira' : 'frontal';
  const [appState, setAppState] = useState(AppState.currentState);
  const [cameraSessionKey, setCameraSessionKey] = useState(0);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [activeFlashMode, setActiveFlashMode] = useState('off');
  const [isRecoveringCamera, setIsRecoveringCamera] = useState(false);

  const loadVideosFromGallery = useCallback(async ({showLoader = false} = {}) => {
    if (showLoader) {
      setIsLoadingSavedVideos(true);
    }

    try {
      const videos = await loadSavedVideosFromCameraRoll();
      setSavedVideos(videos);
    } catch (error) {
      console.error('Erro ao carregar vídeos:', error);
    } finally {
      if (!isUnmountedRef.current) {
        setIsLoadingSavedVideos(false);
      }
    }
  }, []);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  useEffect(() => {
    isUnmountedRef.current = false;

    return () => {
      isUnmountedRef.current = true;
      if (recoveryTimeoutRef.current) {
        clearTimeout(recoveryTimeoutRef.current);
        recoveryTimeoutRef.current = null;
      }
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!isHydrated) {
        return undefined;
      }

      loadVideosFromGallery({showLoader: true}).catch(error => {
        console.warn('Falha ao atualizar vídeos ao focar a câmera.', error);
      });
      return undefined;
    }, [isHydrated, loadVideosFromGallery]),
  );

  const clearPendingRecovery = useCallback(() => {
    if (recoveryTimeoutRef.current) {
      clearTimeout(recoveryTimeoutRef.current);
      recoveryTimeoutRef.current = null;
    }
  }, []);

  const scheduleCameraRecovery = useCallback(
    ({delayMs = 350} = {}) => {
      clearPendingRecovery();
      setIsCameraReady(false);
      setIsRecoveringCamera(true);

      recoveryTimeoutRef.current = setTimeout(() => {
        recoveryTimeoutRef.current = null;

        if (isUnmountedRef.current) {
          return;
        }

        if (appStateRef.current !== 'active' || !isFocused || isProcessingVideo) {
          setIsRecoveringCamera(false);
          return;
        }

        setCameraSessionKey(currentKey => currentKey + 1);
        setIsRecoveringCamera(false);
      }, delayMs);
    },
    [clearPendingRecovery, isFocused, isProcessingVideo],
  );

  const forceReleaseCameraSession = useCallback(async () => {
    clearPendingRecovery();
    setIsCameraReady(false);

    if (camera.current && isRecordingRef.current) {
      try {
        await camera.current.stopRecording();
      } catch (error) {
        console.warn('Falha ao parar gravação durante liberação da câmera.', error);
      }

      setIsRecording(false);
    }

    camera.current = null;
    recordingStartedAtRef.current = null;
    setRecordingElapsedMs(0);
    setCameraSessionKey(currentKey => currentKey + 1);
  }, [clearPendingRecovery]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', nextState => {
      const previousState = appStateRef.current;
      appStateRef.current = nextState;
      setAppState(nextState);

      if (nextState !== 'active') {
        forceReleaseCameraSession().catch(error => {
          console.warn('Falha ao liberar sessão da câmera ao sair do app.', error);
        });
        return;
      }

      if (previousState !== 'active') {
        scheduleCameraRecovery({delayMs: 900});
      }
    });

    return () => sub.remove();
  }, [forceReleaseCameraSession, scheduleCameraRecovery]);

  const isCameraActive = useMemo(
    () =>
      isFocused &&
      appState === 'active' &&
      !isProcessingVideo &&
      !isRecoveringCamera,
    [appState, isFocused, isProcessingVideo, isRecoveringCamera],
  );

  useEffect(() => {
    if (!isFocused) {
      forceReleaseCameraSession().catch(error => {
        console.warn('Falha ao liberar sessão da câmera ao perder foco.', error);
      });
      return;
    }

    if (appState === 'active' && !isProcessingVideo) {
      scheduleCameraRecovery({delayMs: 250});
    }
  }, [
    appState,
    forceReleaseCameraSession,
    isFocused,
    isProcessingVideo,
    scheduleCameraRecovery,
  ]);

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

  const onToggleCompressVideo = useCallback(() => {
    setSettings(prev => ({
      ...prev,
      compressVideoBeforeSave: !prev.compressVideoBeforeSave,
    }));
  }, [setSettings]);

  const onFlashModeChange = () => {
    setActiveFlashMode(prevMode => (prevMode === 'off' ? 'on' : 'off'));
  };

  const renderHeader = useCallback(
    () => (
      <CameraHeaderActions
        flashMode={activeFlashMode}
        onToggleFlash={onFlashModeChange}
        isFrontCamera={cameraPosition === 'front'}
        compressVideoEnabled={settings.compressVideoBeforeSave}
        onToggleCompressVideo={onToggleCompressVideo}
        isRecording={isRecording}
        onOpenLibrary={() => navigation.navigate('Library')}
        onOpenSettings={() => navigation.navigate('Settings')}
      />
    ),
    [
      navigation,
      activeFlashMode,
      cameraPosition,
      settings.compressVideoBeforeSave,
      onToggleCompressVideo,
      isRecording,
    ],
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => renderHeader(),
      headerLeft: () => null,
      headerRight: () => null,
      title: '',
      headerTitleAlign: 'center',

      headerTransparent: true,

      headerStyle: {
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        elevation: 0,
        shadowOpacity: 0,
        borderBottomWidth: 0,
      },
    });
  }, [navigation, renderHeader]);

  const ensurePermissions = useCallback(async ({showMissingAlert = true} = {}) => {
    if (isRequestingPermissionsRef.current) {
      return false;
    }

    isRequestingPermissionsRef.current = true;

    let cameraOk = hasCameraPermission;
    let microphoneOk = hasMicrophonePermission || !settings.audio;

    try {
      if (!cameraOk) {
        cameraOk = (await requestCameraPermission()) === 'granted';
      }

      if (settings.audio && !microphoneOk) {
        microphoneOk = (await requestMicrophonePermission()) === 'granted';
      }

      const cameraStatus = await Camera.getCameraPermissionStatus();
      const microphoneStatus = settings.audio
        ? await Camera.getMicrophonePermissionStatus()
        : 'granted';

      cameraOk = cameraStatus === 'granted';
      microphoneOk = microphoneStatus === 'granted';

      if ((!cameraOk || !microphoneOk) && showMissingAlert) {
        showAlert(
          'Permissões necessárias',
          settings.audio
            ? 'Você precisa permitir câmera e microfone para gravar vídeos com áudio.'
            : 'Você precisa permitir câmera para gravar vídeos.',
        );
      }

      return cameraOk && microphoneOk;
    } finally {
      isRequestingPermissionsRef.current = false;
    }
  }, [
    hasCameraPermission,
    hasMicrophonePermission,
    requestCameraPermission,
    requestMicrophonePermission,
    settings.audio,
    showAlert,
  ]);

  useEffect(() => {
    if (
      !isHydrated ||
      hasBootstrappedInitialFlowRef.current ||
      !isFocused ||
      appState !== 'active'
    ) {
      return;
    }

    hasBootstrappedInitialFlowRef.current = true;

    const bootstrapPermissions = async () => {
      try {
        await loadVideosFromGallery({showLoader: true});
      } catch (error) {
        console.warn('Não foi possível carregar vídeos na inicialização.', error);
      }

      try {
        await ensurePermissions({showMissingAlert: false});
      } catch (error) {
        console.warn('Falha ao solicitar permissões iniciais de câmera.', error);
      }
    };

    bootstrapPermissions();
  }, [appState, ensurePermissions, isFocused, isHydrated, loadVideosFromGallery]);

  const handleRecordingFinished = useCallback(
    async video => {
      const originalPath = video.path;
      const extension = settings.recordFileType === 'mp4' ? 'mp4' : 'mov';
      const newFileName = generateVideoFileName(extension);
      const newPath = `${RNFS.CachesDirectoryPath}/${newFileName}`;
      let sourcePath = originalPath;

      try {
        if (originalPath !== newPath) {
          await deleteIfExists(newPath);
          await RNFS.moveFile(originalPath, newPath);
          sourcePath = newPath;
        }
      } catch (moveError) {
        console.warn('Não foi possível renomear o vídeo gravado. Usando arquivo original.', moveError);
      }

      let pathToSave = sourcePath;
      let compressedPath = null;
      let shouldDeleteOriginal = false;

      try {
        setIsRecording(false);
        if (settings.compressVideoBeforeSave) {
          setIsProcessingVideo(true);
          compressedPath = await compressVideo(sourcePath, extension);
          pathToSave = compressedPath;
        }

        await saveVideoToCameraRoll(pathToSave);
        shouldDeleteOriginal = true;
        await loadVideosFromGallery();
      } catch (error) {
        if (settings.compressVideoBeforeSave) {
          try {
            await saveVideoToCameraRoll(sourcePath);
            shouldDeleteOriginal = true;
            await loadVideosFromGallery();
            showAlert(
              'Compressão indisponível',
              'Não foi possível comprimir este vídeo. A versão original foi salva normalmente.',
            );
          } catch (fallbackError) {
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
          await deleteIfExists(sourcePath);
        } else if (compressedPath && compressedPath !== sourcePath) {
          await deleteIfExists(compressedPath);
        }
        recordingStartedAtRef.current = null;
        setRecordingElapsedMs(0);
        setIsRecording(false);
      }
    },
    [
      loadVideosFromGallery,
      settings.compressVideoBeforeSave,
      settings.recordFileType,
      showAlert,
    ],
  );

  const finalizeRecordedVideo = useCallback(
    video => {
      handleRecordingFinished(video).catch(error => {
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
      const errorCode = error?.code ?? null;

      recordingStartedAtRef.current = null;
      setRecordingElapsedMs(0);
      setIsRecording(false);

      if (
        errorCode === 'capture/no-data' ||
        errorCode === 'device/camera-already-in-use' ||
        errorCode === 'system/camera-is-restricted'
      ) {
        scheduleCameraRecovery({
          delayMs: errorCode === 'system/camera-is-restricted' ? 1500 : 900,
        });
      }

      showAlert('Erro de gravação', error?.message ?? 'Não foi possível gravar o vídeo.');
    },
    [scheduleCameraRecovery, showAlert],
  );

  const startRecording = useCallback(async () => {
    if (
      !camera.current ||
      isRecording ||
      !isCameraReady ||
      !isCameraActive ||
      isRecoveringCamera
    ) {
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
    isCameraActive,
    isCameraReady,
    isRecording,
    isRecoveringCamera,
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

    setIsCameraReady(false);
    setCameraPosition(currentPosition =>
      currentPosition === 'back' ? 'front' : 'back',
    );
  }, [isRecording]);

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

  if (!isHydrated) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="small" color="#cbd5e1" />
        <Text style={styles.subtitle}>Carregando configurações...</Text>
      </View>
    );
  }

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
        isProcessingVideo={isProcessingVideo}
        isRecording={isRecording}
        isActive={isCameraActive}
        torch={activeFlashMode}
        onInitialized={() => {
          setIsCameraReady(true);
        }}
        onToggleCamera={onToggleCamera}
        recordingElapsedMs={recordingElapsedMs}
        settings={settings}
        startRecording={startRecording}
        stopRecording={stopRecording}
        onError={error => {
          const errorCode = error?.code ?? null;

          setIsCameraReady(false);
          setIsRecording(false);
          recordingStartedAtRef.current = null;
          setRecordingElapsedMs(0);

          scheduleCameraRecovery({
            delayMs:
              errorCode === 'system/camera-is-restricted'
                ? 1500
                : errorCode === 'device/camera-already-in-use'
                  ? 1200
                  : 700,
          });
        }}
      />

      <View style={[styles.panel, {paddingBottom: Math.max(insets.bottom + 6, 12)}]}>
        <Text style={styles.panelTitle}>Vídeos salvos</Text>
        {isLoadingSavedVideos ? (
          <View style={styles.savedVideosLoading}>
            <ActivityIndicator size="small" color="#cbd5e1" />
            <Text style={styles.savedVideosLoadingText}>Carregando vídeos...</Text>
          </View>
        ) : (
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
        )}
      </View>
    </View>
  );
}
