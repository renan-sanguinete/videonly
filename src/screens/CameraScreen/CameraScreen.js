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
  Linking,
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import RNFS from 'react-native-fs';
import {
  useCameraPermission,
  useMicrophonePermission,
} from 'react-native-vision-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import CameraHeaderActions from '../../components/CameraHeaderActions/CameraHeaderActions';
import CameraPreview from '../../components/CameraPreview/CameraPreview';
import LoadingModal from '../../components/LoadingModal/LoadingModal';
import VideoCard from '../../components/VideoCard/VideoCard';
import { useCameraSettings } from '../../context/CameraSettingsContext';
import { useCustomAlert } from '../../context/CustomAlertContext';
import {
  canManageAndroidMedia,
  ensureCameraPermission,
  ensureCameraRollVideoPermission,
  ensureMicrophonePermission,
  ensureStartupPermissions,
  getCameraRollVideoPermissionStatus,
  openAndroidManageMediaSettings,
} from '../../utils/appPermissions';
import { usePermissionQueue } from '../../hooks/usePermissionQueue';
import {
  deleteVideoFromCameraRoll,
  loadSavedVideosFromCameraRoll,
  saveVideoToCameraRoll,
} from '../../utils/cameraRollVideos';
import { openVideoUri, shareVideo } from '../../utils/videoActions';
import { optimizeVideo } from '../../utils/videoCompression';
import { generateVideoFileName } from '../../utils/videoFormatters';
import {
  buildVideoRecordingMetadata,
  saveVideoRecordingMetadata,
} from '../../utils/videoRecordingMetadata';
import { applyAudioProfile } from '../../constants/audioProfiles';
import { getAudioLimiterPresetOption } from '../../constants/audioProcessing';
import {
  applyMediaOptimizationMode,
  getMediaOptimizationModeOption,
} from '../../constants/mediaOptimization';
import { useAudioLevelMonitor } from '../../hooks/useAudioLevelMonitor';
import { useAmbientAudioAnalysis } from '../../hooks/useAmbientAudioAnalysis';
import { cinematicTheme } from '../../theme/cinematicTheme';
import { styles } from './styles';

function normalizeFilePath(pathLike) {
  if (!pathLike) {
    return null;
  }

  return pathLike.startsWith('file://')
    ? pathLike.replace('file://', '')
    : pathLike;
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

function getOptimizationLoadingTitle(mode) {
  if (mode === 'audio') {
    return 'Otimizando áudio';
  }

  if (mode === 'both') {
    return 'Otimizando vídeo e áudio';
  }

  return 'Otimizando vídeo';
}

export default function CameraScreen({ navigation }) {
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
  const { hasPermission: hasCameraPermission } = useCameraPermission();
  const { hasPermission: hasMicrophonePermission } = useMicrophonePermission();
  const { isReady: isPermissionFlowReady, enqueuePermission } =
    usePermissionQueue();
  const { isHydrated, settings, setSettings } = useCameraSettings();
  const { showAlert } = useCustomAlert();

  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingVideo, setIsProcessingVideo] = useState(false);
  const [processingOptimizationMode, setProcessingOptimizationMode] =
    useState('none');
  const [savedVideos, setSavedVideos] = useState([]);
  const [selectedVideoUri, setSelectedVideoUri] = useState(null);
  const [isLoadingSavedVideos, setIsLoadingSavedVideos] = useState(true);
  const [isDeletingSelectedVideo, setIsDeletingSelectedVideo] = useState(false);
  const [hasGalleryPermission, setHasGalleryPermission] = useState(false);
  const [recordingElapsedMs, setRecordingElapsedMs] = useState(0);
  const [cameraPosition, setCameraPosition] = useState('back');
  const currentCameraLabel = cameraPosition === 'back' ? 'traseira' : 'frontal';
  const [appState, setAppState] = useState(AppState.currentState);
  const [cameraSessionKey, setCameraSessionKey] = useState(0);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [activeFlashMode, setActiveFlashMode] = useState('off');
  const [isRecoveringCamera, setIsRecoveringCamera] = useState(false);
  const [isOptimizationMenuOpen, setIsOptimizationMenuOpen] = useState(false);
  const [isAmbientAnalysisMenuOpen, setIsAmbientAnalysisMenuOpen] =
    useState(false);
  const [hasCompletedInitialBootstrap, setHasCompletedInitialBootstrap] =
    useState(false);
  const {
    analysisProgress: ambientAnalysisProgress,
    cancelAnalysis: cancelAmbientAnalysis,
    isAnalyzing: isAmbientAnalysisRunning,
    recordSample: recordAmbientSample,
    remainingMs: ambientAnalysisRemainingMs,
    startAnalysis: startAmbientAnalysis,
  } = useAmbientAudioAnalysis({
    durationMs: 10_000,
    onComplete: suggestion => {
      if (!suggestion) {
        showAlert(
          'Análise concluída',
          'Não foi possível gerar uma sugestão. Tente novamente com o ambiente estável.',
          [{ text: 'Ok' }],
        );
        return;
      }

      const optimizationOption = getMediaOptimizationModeOption(
        suggestion.optimizationMode,
      );
      const limiterOption = getAudioLimiterPresetOption(
        suggestion.audioLimiterPreset,
      );

      showAlert(
        'Sugestão pronta',
        [
          `${optimizationOption.label} · ${suggestion.confidence}`,
          suggestion.description,
          '',
          `Média RMS: ${suggestion.averageRmsLabel}`,
          `Pico médio: ${suggestion.averagePeakLabel}`,
          `Pico máximo: ${suggestion.maxPeakLabel}`,
          `Clipping: ${suggestion.clipRatioLabel}`,
          '',
          `Limiter: ${limiterOption.label}`,
          suggestion.normalizeAudioLoudness
            ? 'Normalização de loudness: ativa'
            : 'Normalização de loudness: desativada',
        ].join('\n'),
        [
          { text: 'Manter atual', style: 'cancel' },
          {
            text: 'Aplicar sugestão',
            onPress: () => {
              setSettings(prev => ({
                ...prev,
                ...suggestion.settingsPatch,
                audioLimiterPreset: suggestion.audioLimiterPreset,
                normalizeAudioLoudness: suggestion.normalizeAudioLoudness,
                audioProfile: 'custom',
              }));
            },
          },
        ],
      );
    },
  });
  const audioLevel = useAudioLevelMonitor({
    enabled:
      isFocused &&
      !isProcessingVideo &&
      hasMicrophonePermission &&
      settings.audio &&
      (settings.showAudioLevelMeter || isAmbientAnalysisRunning),
  });

  const loadVideosFromGallery = useCallback(
    async ({ showLoader = false } = {}) => {
      if (showLoader) {
        setIsLoadingSavedVideos(true);
      }

      try {
        const videos = await loadSavedVideosFromCameraRoll();
        setSavedVideos(videos);
        setSelectedVideoUri(currentSelectedUri =>
          videos.some(video => video.uri === currentSelectedUri)
            ? currentSelectedUri
            : null,
        );
      } catch (error) {
        console.error('Erro ao carregar videos:', error);
      } finally {
        if (!isUnmountedRef.current) {
          setIsLoadingSavedVideos(false);
        }
      }
    },
    [],
  );

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
      if (
        !isHydrated ||
        !hasCompletedInitialBootstrap ||
        !hasGalleryPermission
      ) {
        return undefined;
      }

      loadVideosFromGallery({ showLoader: true }).catch(error => {
        console.warn('Falha ao atualizar videos ao focar a camera.', error);
      });

      return undefined;
    }, [
      hasCompletedInitialBootstrap,
      hasGalleryPermission,
      isHydrated,
      loadVideosFromGallery,
    ]),
  );

  const clearPendingRecovery = useCallback(() => {
    if (recoveryTimeoutRef.current) {
      clearTimeout(recoveryTimeoutRef.current);
      recoveryTimeoutRef.current = null;
    }
  }, []);

  const scheduleCameraRecovery = useCallback(
    ({ delayMs = 350 } = {}) => {
      clearPendingRecovery();
      setIsCameraReady(false);
      setIsRecoveringCamera(true);

      recoveryTimeoutRef.current = setTimeout(() => {
        recoveryTimeoutRef.current = null;

        if (isUnmountedRef.current) {
          return;
        }

        if (
          appStateRef.current !== 'active' ||
          !isFocused ||
          isProcessingVideo
        ) {
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
        console.warn(
          'Falha ao parar gravacao durante liberacao da camera.',
          error,
        );
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
          console.warn(
            'Falha ao liberar sessao da camera ao sair do app.',
            error,
          );
        });
        return;
      }

      if (previousState !== 'active') {
        getCameraRollVideoPermissionStatus()
          .then(status => {
            if (isUnmountedRef.current) {
              return;
            }

            setHasGalleryPermission(status.granted);
          })
          .catch(error => {
            console.warn('Falha ao sincronizar permissao da galeria.', error);
          });

        scheduleCameraRecovery({ delayMs: 900 });
      }
    });

    return () => sub.remove();
  }, [forceReleaseCameraSession, scheduleCameraRecovery]);

  const isCameraActive = useMemo(
    () =>
      isPermissionFlowReady &&
      hasCompletedInitialBootstrap &&
      isFocused &&
      appState === 'active' &&
      !isProcessingVideo &&
      !isRecoveringCamera,
    [
      appState,
      hasCompletedInitialBootstrap,
      isFocused,
      isPermissionFlowReady,
      isProcessingVideo,
      isRecoveringCamera,
    ],
  );

  useEffect(() => {
    if (!isFocused) {
      forceReleaseCameraSession().catch(error => {
        console.warn(
          'Falha ao liberar sessao da camera ao perder foco.',
          error,
        );
      });
      return;
    }

    if (appState === 'active' && !isProcessingVideo) {
      scheduleCameraRecovery({ delayMs: 250 });
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

  const onOptimizationModeChange = useCallback(
    value => {
      setSettings(prev => applyMediaOptimizationMode(prev, value));
    },
    [setSettings],
  );

  const onApplyAudioProfile = useCallback(
    value => {
      setSettings(prev => applyAudioProfile(prev, value));
    },
    [setSettings],
  );

  const onSetAudioEnabled = useCallback(
    value => {
      setSettings(prev => ({
        ...prev,
        audio: value,
      }));
    },
    [setSettings],
  );

  const onOpenCustomAudioSettings = useCallback(() => {
    showAlert(
      'Ajustes personalizados',
      'As edições do modo personalizado são feitas na tela de Configurações.',
      [
        {text: 'Agora não', style: 'cancel'},
        {
          text: 'Ir para Configurações',
          onPress: () => navigation.navigate('Settings'),
        },
      ],
      {cancelable: true},
    );
  }, [navigation, showAlert]);

  const onFlashModeChange = () => {
    setActiveFlashMode(prevMode => (prevMode === 'off' ? 'on' : 'off'));
  };

  const audioMeterLevel = audioLevel?.level ?? 0;
  const audioMeterPeakDb = audioLevel?.peakDb ?? -120;
  const audioMeterIsClipping = Boolean(audioLevel?.isClipping);
  const audioMeterFillStyle = audioMeterIsClipping
    ? styles.recordingMeterFillClip
    : audioMeterLevel > 0.82
      ? styles.recordingMeterFillWarn
      : styles.recordingMeterFillSafe;
  const audioMeterWidth = `${Math.max(0, Math.min(100, audioMeterLevel * 100))}%`;
  useEffect(() => {
    recordAmbientSample(audioLevel);
  }, [audioLevel, recordAmbientSample]);

  useEffect(() => {
    if (!isFocused || appState !== 'active' || isProcessingVideo) {
      cancelAmbientAnalysis();
    }
  }, [appState, cancelAmbientAnalysis, isFocused, isProcessingVideo]);

  const onStartAmbientAnalysis = useCallback(() => {
    if (!settings.audio || isAmbientAnalysisRunning) {
      return;
    }

    const started = startAmbientAnalysis();
    if (!started) {
      showAlert(
        'Análise indisponível',
        'Não foi possível iniciar a análise agora. Tente novamente em instantes.',
        [{ text: 'Ok' }],
      );
    }
  }, [isAmbientAnalysisRunning, settings.audio, showAlert, startAmbientAnalysis]);

  const renderHeader = useCallback(
    () => (
      <CameraHeaderActions
        flashMode={activeFlashMode}
        onToggleFlash={onFlashModeChange}
        isFrontCamera={cameraPosition === 'front'}
        isRecording={isRecording}
        optimizationMode={settings.optimizationMode}
        onOptimizationModeChange={onOptimizationModeChange}
        isOptimizationMenuOpen={isOptimizationMenuOpen}
        setIsOptimizationMenuOpen={setIsOptimizationMenuOpen}
        isAmbientAnalysisMenuOpen={isAmbientAnalysisMenuOpen}
        setIsAmbientAnalysisMenuOpen={setIsAmbientAnalysisMenuOpen}
        onStartAmbientAnalysis={onStartAmbientAnalysis}
        isAmbientAnalysisRunning={isAmbientAnalysisRunning}
        isAmbientAnalysisDisabled={!settings.audio}
        onOpenLibrary={() => navigation.navigate('Library')}
        onOpenSettings={() => navigation.navigate('Settings')}
      />
    ),
      [
        navigation,
        activeFlashMode,
        cameraPosition,
        isAmbientAnalysisMenuOpen,
        isAmbientAnalysisRunning,
        isRecording,
        isOptimizationMenuOpen,
        onOptimizationModeChange,
        onStartAmbientAnalysis,
        settings.optimizationMode,
        settings.audio,
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

  const ensurePermissions = useCallback(
    async ({ showMissingAlert = true } = {}) => {
      if (isRequestingPermissionsRef.current) {
        return false;
      }

      isRequestingPermissionsRef.current = true;

      try {
        const { cameraOk, galleryOk, microphoneOk } =
          await ensureStartupPermissions({
            includeMicrophone: settings.audio,
            request: true,
          });
        console.log('Permissoes iniciais:', {
          cameraOk,
          galleryOk,
          microphoneOk,
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
    },
    [settings.audio, showAlert],
  );

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
        { text: 'Agora não', style: 'cancel' },
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
      appState !== 'active' ||
      !isPermissionFlowReady
    ) {
      return;
    }

    hasBootstrappedInitialFlowRef.current = true;
    let galleryPermissionGranted = false;

    const finalizeBootstrap = () => {
      if (!isUnmountedRef.current) {
        setHasCompletedInitialBootstrap(true);
      }
    };

    if (!hasCameraPermission) {
      enqueuePermission(
        'startup-camera',
        async () => {
          await ensureCameraPermission({ request: true });
        },
        error => {
          console.warn(
            'Falha ao solicitar permissao inicial de camera.',
            error,
          );
        },
      );
    }

    if (settings.audio && !hasMicrophonePermission) {
      enqueuePermission(
        'startup-microphone',
        async () => {
          await ensureMicrophonePermission({ request: true });
        },
        error => {
          console.warn(
            'Falha ao solicitar permissao inicial de microfone.',
            error,
          );
        },
      );
    }

    enqueuePermission(
      'startup-gallery',
      async () => {
        galleryPermissionGranted = await ensureCameraRollVideoPermission({
          request: true,
        });
        setHasGalleryPermission(galleryPermissionGranted);
      },
      error => {
        console.warn('Falha ao solicitar permissao inicial da galeria.', error);
      },
    );

    enqueuePermission(
      'startup-load-videos',
      async () => {
        if (!galleryPermissionGranted) {
          setHasGalleryPermission(false);
          setIsLoadingSavedVideos(false);
          return;
        }

        await loadVideosFromGallery({ showLoader: true });
      },
      error => {
        console.warn(
          'Nao foi possivel carregar videos na inicializacao.',
          error,
        );
      },
    );

    enqueuePermission(
      'startup-manage-media',
      async () => {
        if (!galleryPermissionGranted) {
          return;
        }

        await promptManageMediaAccess();
      },
      error => {
        console.warn(
          'Falha ao sugerir acesso especial de gerenciamento de midia.',
          error,
        );
      },
    );

    enqueuePermission('startup-complete', async () => {
      finalizeBootstrap();
    });
  }, [
    appState,
    enqueuePermission,
    hasCameraPermission,
    hasMicrophonePermission,
    isFocused,
    isHydrated,
    isPermissionFlowReady,
    loadVideosFromGallery,
    promptManageMediaAccess,
    settings.audio,
  ]);

  const handleRecordingFinished = useCallback(
    async video => {
      const originalPath = video.path;
      const extension = settings.recordFileType === 'mp4' ? 'mp4' : 'mov';
      const newFileName = generateVideoFileName(extension);
      const newPath = `${RNFS.CachesDirectoryPath}/${newFileName}`;
      let sourcePath = originalPath;
      const optimizationMode = getMediaOptimizationModeOption(
        settings.optimizationMode,
      ).value;
      const shouldOptimize = optimizationMode !== 'none';

      try {
        if (originalPath !== newPath) {
          await deleteIfExists(newPath);
          await RNFS.moveFile(originalPath, newPath);
          sourcePath = newPath;
        }
      } catch (moveError) {
        console.warn(
          'Não foi possível renomear o vídeo gravado. Usando arquivo original.',
          moveError,
        );
      }

      let pathToSave = sourcePath;
      let compressedPath = null;
      let shouldDeleteOriginal = false;
      const shouldProcessMedia =
        shouldOptimize && (optimizationMode !== 'audio' || settings.audio);
      const saveRecordingMetadata = async finalPath => {
        const metadata = buildVideoRecordingMetadata({
          videoFileName: newFileName,
          originalPath,
          sourcePath,
          savedPath: finalPath,
          compressedPath,
          requestedOptimizationMode: settings.optimizationMode,
          appliedOptimizationMode:
            shouldProcessMedia && finalPath !== sourcePath
              ? optimizationMode
              : 'none',
          usedFallbackToOriginal: shouldProcessMedia && finalPath === sourcePath,
          settings,
        });

        await saveVideoRecordingMetadata(newFileName, metadata);
      };

      try {
        setIsRecording(false);
        if (shouldProcessMedia) {
          setProcessingOptimizationMode(optimizationMode);
          setIsProcessingVideo(true);
          compressedPath = await optimizeVideo(sourcePath, extension, {
            optimizationMode,
            audioLimiterPreset: settings.audioLimiterPreset,
            normalizeAudioLoudness: settings.normalizeAudioLoudness,
          });
          pathToSave = compressedPath;
        }

        await saveVideoToCameraRoll(pathToSave);
        try {
          await saveRecordingMetadata(pathToSave);
        } catch (metadataError) {
          console.warn(
            'Nao foi possivel salvar os metadados da gravacao.',
            metadataError,
          );
        }
        shouldDeleteOriginal = true;
        await loadVideosFromGallery();
      } catch (error) {
        if (shouldProcessMedia) {
          try {
            await saveVideoToCameraRoll(sourcePath);
            try {
              await saveRecordingMetadata(sourcePath);
            } catch (metadataError) {
              console.warn(
                'Nao foi possivel salvar os metadados da gravacao.',
                metadataError,
              );
            }
            shouldDeleteOriginal = true;
            await loadVideosFromGallery();
            showAlert(
              'Otimização indisponível',
              'Nao foi possivel otimizar este video. A versao original foi salva normalmente.',
            );
          } catch (fallbackError) {
            showAlert(
              'Erro ao processar video',
              fallbackError?.message ??
                'Nao foi possivel otimizar nem salvar o video original.',
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
        setProcessingOptimizationMode('none');
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
      settings,
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

      showAlert(
        'Erro de gravacao',
        error?.message ?? 'Nao foi possivel gravar o video.',
      );
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
    try {
      await Linking.openSettings();
    } catch (error) {
      console.warn('Falha ao abrir as configuracoes do app.', error);
      showAlert(
        'Nao foi possivel abrir as configurações',
        'Abra as configurações do app manualmente e permita câmera, microfone e galeria para continuar.',
        [{ text: 'OK' }],
      );
    }
  }, [showAlert]);

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

  const clearSelectedVideo = useCallback(() => {
    setSelectedVideoUri(null);
  }, []);

  const maybeWarnAboutManageMedia = useCallback(async () => {
    if (Platform.OS !== 'android' || Platform.Version < 31) {
      return;
    }

    if (await canManageAndroidMedia()) {
      return;
    }

    showAlert(
      'Permissão extra para excluir',
      'Sem o acesso especial "Gerenciar mídia", o Android pode continuar mostrando uma confirmação adicional ao excluir vídeos.',
      [
        { text: 'Fechar', style: 'cancel' },
        {
          text: 'Abrir configurações',
          onPress: () => {
            openAndroidManageMediaSettings().catch(openError => {
              console.warn(
                'Falha ao abrir configurações de gerenciamento de mídia.',
                openError,
              );
            });
          },
        },
      ],
    );
  }, [showAlert]);

  const selectedVideo = useMemo(
    () => savedVideos.find(item => item.uri === selectedVideoUri) ?? null,
    [savedVideos, selectedVideoUri],
  );

  const deleteSelectedVideo = useCallback(
    async item => {
      setIsDeletingSelectedVideo(true);

      try {
        const result = await deleteVideoFromCameraRoll(item.uri);
        await loadVideosFromGallery({ showLoader: false });

        if (!result?.bypassedSystemPrompt) {
          await maybeWarnAboutManageMedia();
        }
      } catch (error) {
        showAlert(
          'Erro',
          error?.message ?? 'Nao foi possivel excluir este video.',
        );
      } finally {
        setIsDeletingSelectedVideo(false);
      }
    },
    [loadVideosFromGallery, maybeWarnAboutManageMedia, showAlert],
  );

  const onDeleteSelectedVideo = useCallback(() => {
    if (!selectedVideo || isDeletingSelectedVideo) {
      return;
    }

    const videoToDelete = selectedVideo;
    clearSelectedVideo();

    showAlert('Excluir vídeo', 'Excluir o vídeo selecionado?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          deleteSelectedVideo(videoToDelete).catch(error => {
            console.warn('Falha ao excluir vídeo a partir da câmera.', error);
          });
        },
      },
    ]);
  }, [
    clearSelectedVideo,
    deleteSelectedVideo,
    isDeletingSelectedVideo,
    selectedVideo,
    showAlert,
  ]);

  const onVideoCardPress = useCallback(
    item => {
      if (isDeletingSelectedVideo) {
        return;
      }

      setSelectedVideoUri(item.uri);
    },
    [isDeletingSelectedVideo],
  );

  if (!isHydrated) {
    return (
      <View style={styles.center}>
        <ActivityIndicator
          size="small"
          color={cinematicTheme.colors.mutedForeground}
        />
        <Text style={styles.subtitle}>Carregando configurações...</Text>
      </View>
    );
  }

  if (!hasCompletedInitialBootstrap) {
    return (
      <View style={styles.center}>
        <ActivityIndicator
          size="small"
          color={cinematicTheme.colors.mutedForeground}
        />
        <Text style={styles.subtitle}>
          Inicializando camera e permissoes...
        </Text>
      </View>
    );
  }

  if (!hasCameraPermission) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Videonly</Text>
        <Text style={styles.subtitle}>
          O app precisa de permissão para acessar a câmera, áudio e galeria.
        </Text>
        <Text style={styles.subtitle}>
          Vá para as configurações e habilite as permissões.
        </Text>
        <Pressable style={styles.primaryButton} onPress={onPermissionPress}>
          <Text style={styles.primaryButtonText}>
            Abrir configurações
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LoadingModal
        message="Aguarde..."
        title={getOptimizationLoadingTitle(processingOptimizationMode)}
        visible={isProcessingVideo}
      />
      <LoadingModal
        message={`${Math.round(ambientAnalysisProgress * 100)}% concluído · ${Math.max(
          1,
          Math.ceil(ambientAnalysisRemainingMs / 1000),
        )}s restantes`}
        title="Analisando ambiente"
        visible={isAmbientAnalysisRunning}
      />
      <LoadingModal
        message="Aguarde enquanto removemos o vídeo selecionado."
        title="Excluindo vídeo"
        visible={isDeletingSelectedVideo}
      />
      <View style={styles.previewStage}>
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
          onApplyAudioProfile={onApplyAudioProfile}
          onSetAudioEnabled={onSetAudioEnabled}
          onOpenCustomAudioSettings={onOpenCustomAudioSettings}
          isOptimizationMenuOpen={isOptimizationMenuOpen}
          onZoomCommit={nextZoom => {
            setSettings(prev => ({
              ...prev,
              zoom: String(nextZoom),
            }));
          }}
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

        {!isRecording ? (
          <View
            pointerEvents="box-none"
            style={[
              styles.bottomOverlay,
              {paddingBottom: Math.max(insets.bottom, 10)},
            ]}
          >
            <View style={styles.panel}>
              {!selectedVideo ? (
                <>
                  <View style={styles.panelHeader}>
                    <View style={styles.panelHeaderTitleWrap}>
                      <View style={styles.panelHeaderTitleRow}>
                        <Text style={styles.panelKicker}>Vídeos</Text>
                        <Pressable onPress={() => navigation.navigate('Library')}>
                          <Text style={styles.panelLink}>Ver todos →</Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>

                  <View style={styles.panelDivider} />
                </>
              ) : null}

              {selectedVideo ? (
            <View style={styles.panelActions}>
              <Pressable
                disabled={isDeletingSelectedVideo}
                onPress={() => {
                  clearSelectedVideo();
                  onOpenVideo(selectedVideo).catch(error => {
                    console.warn(
                      'Falha ao abrir video pela barra de ações.',
                      error,
                    );
                  });
                }}
                style={styles.panelActionButton}
              >
                <View style={styles.panelActionIconWrap}>
                  <Icon
                    name="folder-open-outline"
                    size={22}
                    color={cinematicTheme.colors.foreground}
                  />
                </View>
                <Text style={styles.panelActionLabel}>Abrir</Text>
              </Pressable>

              <Pressable
                disabled={isDeletingSelectedVideo}
                onPress={() => {
                  clearSelectedVideo();
                  onShareVideo(selectedVideo).catch(error => {
                    console.warn(
                      'Falha ao compartilhar video pela barra de ações.',
                      error,
                    );
                  });
                }}
                style={styles.panelActionButton}
              >
                <View style={styles.panelActionIconWrap}>
                  <Icon
                    name="share-social-outline"
                    size={22}
                    color={cinematicTheme.colors.foreground}
                  />
                </View>
                <Text style={styles.panelActionLabel}>Compartilhar</Text>
              </Pressable>

              <Pressable
                disabled={isDeletingSelectedVideo}
                onPress={onDeleteSelectedVideo}
                style={styles.panelActionButton}
              >
                <View
                  style={[
                    styles.panelActionIconWrap,
                    styles.panelActionIconDanger,
                  ]}
                >
                  <Icon
                    name="trash-outline"
                    size={22}
                    color={cinematicTheme.colors.rec}
                  />
                </View>
                <Text style={styles.panelActionLabel}>Excluir</Text>
              </Pressable>

              <Pressable
                disabled={isDeletingSelectedVideo}
                onPress={clearSelectedVideo}
                style={styles.panelActionButton}
              >
                <View style={styles.panelActionIconWrap}>
                  <Icon
                    name="close-outline"
                    size={22}
                    color={cinematicTheme.colors.foreground}
                  />
                </View>
                <Text style={styles.panelActionLabel}>Cancelar</Text>
              </Pressable>
            </View>
          ) : (
            <View />
          )}

              {settings.showAudioLevelMeter && settings.audio ? (
                <View style={styles.recordingMeterPanel}>
                  <View style={styles.recordingMeterHeader}>
                    <Text style={styles.recordingMeterLabel}>VU preview</Text>
                    <Text
                      style={[
                        styles.recordingMeterValue,
                        audioMeterIsClipping && styles.recordingMeterValueClip,
                      ]}
                    >
                      {audioMeterIsClipping
                        ? 'CLIP'
                        : `${Math.round(audioMeterPeakDb * 10) / 10} dBFS`}
                    </Text>
                  </View>
                  <View style={styles.recordingMeterTrack}>
                    <View
                      style={[
                        styles.recordingMeterFill,
                        audioMeterFillStyle,
                        {width: audioMeterWidth},
                      ]}
                    />
                    <View style={styles.recordingMeterThreshold} />
                  </View>
                  <Text style={styles.recordingMeterHint}>
                    {audioMeterIsClipping
                      ? 'Pico alto. Reduza ganho ou use o perfil Show ao vivo.'
                      : 'Prévia do ambiente antes de gravar. Verde indica zona segura.'}
                  </Text>
                </View>
              ) : isLoadingSavedVideos ? (
                <View style={styles.savedVideosLoading}>
                  <ActivityIndicator
                    size="small"
                    color={cinematicTheme.colors.mutedForeground}
                  />
                  <Text style={styles.savedVideosLoadingText}>
                    Carregando vídeos...
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={savedVideos}
                  keyExtractor={item => item.uri}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.savedVideosContent}
                  style={styles.savedVideosRow}
                  renderItem={({item}) => (
                    <VideoCard
                      compact
                      item={item}
                      selected={item.uri === selectedVideoUri}
                      onPress={() => onVideoCardPress(item)}
                    />
                  )}
                  ListEmptyComponent={
                    <Text style={styles.emptyText}>
                      Nenhum vídeo salvo ainda.
                    </Text>
                  }
                />
              )}

            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}
