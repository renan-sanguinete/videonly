import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  AppState,
  FlatList,
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native';
import {useFocusEffect, useIsFocused} from '@react-navigation/native';
import RNFS from 'react-native-fs';
import {useCameraPermission} from 'react-native-vision-camera';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import CameraHeaderActions from '../../components/CameraHeaderActions/CameraHeaderActions';
import CameraPreview from '../../components/CameraPreview/CameraPreview';
import LoadingModal from '../../components/LoadingModal/LoadingModal';
import VideoCard from '../../components/VideoCard/VideoCard';
import {useCameraSettings} from '../../context/CameraSettingsContext';
import {useCustomAlert} from '../../context/CustomAlertContext';
import {
  canManageAndroidMedia,
  ensureStartupPermissions,
  openAndroidManageMediaSettings,
} from '../../utils/appPermissions';
import {
  loadSavedVideosFromCameraRoll,
  saveVideoToCameraRoll,
} from '../../utils/cameraRollVideos';
import {openVideoUri, shareVideo} from '../../utils/videoActions';
import {compressVideo} from '../../utils/videoCompression';
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
    console.warn('Nao foi possivel remover arquivo temporario.', error);
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
  const hasPromptedManageMediaRef = useRef(false);
  const isRequestingPermissionsRef = useRef(false);
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const {hasPermission: hasCameraPermission} = useCameraPermission();
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
      console.error('Erro ao carregar videos:', error);
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
        console.warn('Falha ao atualizar videos ao focar a camera.', error);
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
        console.warn('Falha ao parar gravacao durante liberacao da camera.', error);
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
          console.warn('Falha ao liberar sessao da camera ao sair do app.', error);
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
        console.warn('Falha ao liberar sessao da camera ao perder foco.', error);
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

    try {
      const {cameraOk, galleryOk, microphoneOk} = await ensureStartupPermissions({
        includeMicrophone: settings.audio,
        request: true,
      });

      if ((!cameraOk || !microphoneOk || !galleryOk) && showMissingAlert) {
        showAlert(
          'Permissoes necessarias',
          settings.audio
            ? 'Voce precisa permitir camera, microfone e acesso a galeria para gravar e salvar videos com audio.'
            : 'Voce precisa permitir camera e acesso a galeria para gravar e salvar videos.',
        );
      }

      return cameraOk && microphoneOk && galleryOk;
    } finally {
      isRequestingPermissionsRef.current = false;
    }
  }, [settings.audio, showAlert]);

  const promptManageMediaAccess = useCallback(async () => {
    if (
      hasPromptedManageMediaRef.current ||
      Platform.OS !== 'android' ||
      Platform.Version < 31
    ) {
      return;
    }

    const canManageMedia = await canManageAndroidMedia();
    if (canManageMedia) {
      return;
    }

    hasPromptedManageMediaRef.current = true;

    showAlert(
      'Permissão de gerenciamento de mídia',
      'Para obter acesso de exclusão de mídia, habilite o acesso em "Gerenciar mídia".',
      [
        {text: 'Agora não', style: 'cancel'},
        {
          text: 'Abrir configurações',
          onPress: () => {
            openAndroidManageMediaSettings().catch(error => {
              console.warn(
                'Falha ao abrir configurações de gerenciamento de mídia.',
                error,
              );
            });
          },
        },
      ],
    );
  }, [showAlert]);

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
        await ensurePermissions({showMissingAlert: false});
      } catch (error) {
        console.warn('Falha ao solicitar permissoes iniciais.', error);
      }

      try {
        await loadVideosFromGallery({showLoader: true});
      } catch (error) {
        console.warn('Nao foi possivel carregar videos na inicializacao.', error);
      }

      try {
        await promptManageMediaAccess();
      } catch (error) {
        console.warn('Falha ao sugerir acesso especial de gerenciamento de midia.', error);
      }
    };

    bootstrapPermissions();
  }, [
    appState,
    ensurePermissions,
    isFocused,
    isHydrated,
    loadVideosFromGallery,
    promptManageMediaAccess,
  ]);

  const handleRecordingFinished = useCallback(
    async video => {
      const originalPath = video.path;
      const extension = settings.recordFileType === 'mp4' ? 'mp4' : 'mov';
      const newFileName = generateVideoFileName(extension);
      const newPath = `${RNFS.CachesDirectoryPath}/${newFileName}`;
      await RNFS.moveFile(originalPath, newPath);

      let pathToSave = newPath;
      let compressedPath = null;
      let shouldDeleteOriginal = false;

      try {
        setIsRecording(false);
        if (settings.compressVideoBeforeSave) {
          setIsProcessingVideo(true);
          compressedPath = await compressVideo(newPath, extension);
          pathToSave = compressedPath;
        }

        await saveVideoToCameraRoll(pathToSave);
        shouldDeleteOriginal = true;
        await loadVideosFromGallery();
      } catch (error) {
        if (settings.compressVideoBeforeSave) {
          try {
            await saveVideoToCameraRoll(originalPath);
            shouldDeleteOriginal = true;
            await loadVideosFromGallery();
            showAlert(
              'Compressao indisponivel',
              'Nao foi possivel comprimir este video. A versao original foi salva normalmente.',
            );
          } catch (fallbackError) {
            showAlert(
              'Erro ao processar video',
              fallbackError?.message ??
                'Nao foi possivel comprimir nem salvar o video original.',
            );
          }
        } else {
          showAlert(
            'Erro ao salvar video',
            error?.message ?? 'Nao foi possivel salvar o video na galeria.',
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
          'Erro ao processar video',
          error?.message ?? 'Nao foi possivel finalizar o video gravado.',
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

      showAlert('Erro de gravacao', error?.message ?? 'Nao foi possivel gravar o video.');
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
      showAlert('Erro', error?.message ?? 'Falha ao iniciar a gravacao.');
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
      showAlert('Erro', error?.message ?? 'Falha ao parar a gravacao.');
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
          'Erro ao abrir video',
          error?.message ?? 'Nao foi possivel abrir este video.',
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
          error?.message ?? 'Nao foi possivel compartilhar este video.',
        );
      }
    },
    [showAlert],
  );

  const onVideoCardPress = useCallback(
    item => {
      showAlert(
        item.filename || 'Video',
        'Escolha o que deseja fazer com este video.',
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
          O app precisa de permissao para acessar a camera.
        </Text>
        <Pressable style={styles.primaryButton} onPress={onPermissionPress}>
          <Text style={styles.primaryButtonText}>
            Permitir camera, audio e galeria
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LoadingModal
        message="Estamos comprimindo seu video para gerar um arquivo mais leve antes de salvar."
        title="Comprimindo video"
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

      <View style={[styles.panel, {marginBottom: Math.max(insets.bottom, 12)}]}>
        <Text style={styles.panelTitle}>Videos salvos</Text>
        {isLoadingSavedVideos ? (
          <View style={styles.savedVideosLoading}>
            <ActivityIndicator size="small" color="#cbd5e1" />
            <Text style={styles.savedVideosLoadingText}>Carregando videos...</Text>
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
              <Text style={styles.emptyText}>Nenhum video salvo ainda.</Text>
            }
          />
        )}
      </View>
    </View>
  );
}
