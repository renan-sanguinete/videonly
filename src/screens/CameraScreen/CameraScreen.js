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
import {useProAccess} from '../../context/ProAccessContext';
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
import {
  applySlowMotionEffect,
  applyTimelapseEffect,
} from '../../utils/videoEffects';
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
import {buildVideoResolutionOptions} from '../../utils/videoResolutionOptions';
import {getCaptureSettingsForRecordingMode} from '../../constants/recordingModes';
import { useAudioLevelMonitor } from '../../hooks/useAudioLevelMonitor';
import { useAmbientAudioAnalysis } from '../../hooks/useAmbientAudioAnalysis';
import {useI18n} from '../../i18n/I18nContext';
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
    console.warn('Não foi possível remover o arquivo temporário.', error);
  }
}

function getOptimizationLoadingTitle(mode, t) {
  if (mode === 'slowMotion') {
    return t('camera.loading.slowMotion');
  }

  if (mode === 'timelapse') {
    return t('camera.loading.timelapse');
  }

  if (mode === 'audio') {
    return t('camera.loading.audio');
  }

  if (mode === 'both') {
    return t('camera.loading.both');
  }

  return t('camera.loading.video');
}

function getVideoExtensionFromItem(item) {
  const extensionMatch = String(item?.filename || item?.uri || '')
    .split('?')[0]
    .match(/\.([a-zA-Z0-9]+)$/);
  const extension = extensionMatch?.[1]?.toLowerCase();

  return extension === 'mov' ? 'mov' : 'mp4';
}

export default function CameraScreen({ navigation }) {
  const {t} = useI18n();
  const {billingError, isPro, purchasePro} = useProAccess();
  const camera = useRef(null);
  const recordingStartedAtRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);
  const isRecordingRef = useRef(false);
  const recordingLimitTimeoutRef = useRef(null);
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
  const {
    isHydrated,
    settings,
    savedAudioProfiles,
    setSettings,
    saveAudioProfile,
    applySavedAudioProfile,
    replaceSavedAudioProfile,
    renameSavedAudioProfile,
    deleteSavedAudioProfile,
  } = useCameraSettings();
  const { showAlert } = useCustomAlert();
  const resolutionOptions = useMemo(
    () => buildVideoResolutionOptions(t),
    [t],
  );

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
  const currentCameraLabel =
    cameraPosition === 'back' ? t('common.backCamera') : t('common.front');
  const [appState, setAppState] = useState(AppState.currentState);
  const [cameraSessionKey, setCameraSessionKey] = useState(0);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [activeFlashMode, setActiveFlashMode] = useState('off');
  const [isRecoveringCamera, setIsRecoveringCamera] = useState(false);
  const [isOptimizationMenuOpen, setIsOptimizationMenuOpen] = useState(false);
  const [isAmbientAnalysisMenuOpen, setIsAmbientAnalysisMenuOpen] =
    useState(false);
  const [
    isSelectedVideoOptimizationOpen,
    setIsSelectedVideoOptimizationOpen,
  ] = useState(false);
  const [hasCompletedInitialBootstrap, setHasCompletedInitialBootstrap] =
    useState(false);
  const [canMountCameraPreview, setCanMountCameraPreview] = useState(false);
  const [canActivateCameraPreview, setCanActivateCameraPreview] =
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
          t('camera.analysisComplete.title'),
          t('camera.analysisComplete.message'),
          [{ text: t('common.ok') }],
        );
        return;
      }

      const limiterOption = getAudioLimiterPresetOption(
        suggestion.audioLimiterPreset,
        t,
      );

      showAlert(
        t('camera.suggestion.title'),
        [
          `${suggestion.title} · ${suggestion.confidence}`,
          suggestion.description,
          '',
          t('camera.suggestion.rms', {value: suggestion.averageRmsLabel}),
          t('camera.suggestion.averagePeak', {
            value: suggestion.averagePeakLabel,
          }),
          t('camera.suggestion.maxPeak', {value: suggestion.maxPeakLabel}),
          t('camera.suggestion.clipping', {value: suggestion.clipRatioLabel}),
          '',
          t('camera.suggestion.limiter', {value: limiterOption.label}),
          suggestion.normalizeAudioLoudness
            ? t('camera.suggestion.volumeOn')
            : t('camera.suggestion.volumeOff'),
        ].join('\n'),
        [
          { text: t('camera.suggestion.keep'), style: 'cancel' },
          {
            text: t('camera.suggestion.apply'),
            onPress: () => {
              setSettings(prev => ({
                ...prev,
                ...suggestion.settingsPatch,
                audioLimiterPreset: suggestion.audioLimiterPreset,
                normalizeAudioLoudness: suggestion.normalizeAudioLoudness,
                audioProfile: 'custom',
                audioCustomProfileId: null,
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
        console.error('Erro ao carregar vídeos:', error);
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
      if (recordingLimitTimeoutRef.current) {
        clearTimeout(recordingLimitTimeoutRef.current);
        recordingLimitTimeoutRef.current = null;
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
        console.warn('Falha ao atualizar vídeos ao focar a câmera.', error);
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
    if (recordingLimitTimeoutRef.current) {
      clearTimeout(recordingLimitTimeoutRef.current);
      recordingLimitTimeoutRef.current = null;
    }

    if (camera.current && isRecordingRef.current) {
      try {
        await camera.current.stopRecording();
      } catch (error) {
        console.warn(
          'Falha ao parar gravação durante liberação da câmera.',
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
            'Falha ao liberar sessão da câmera ao sair do app.',
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
            console.warn('Falha ao sincronizar permissão da galeria.', error);
          });

        scheduleCameraRecovery({ delayMs: 900 });
      }
    });

    return () => sub.remove();
  }, [forceReleaseCameraSession, scheduleCameraRecovery]);

  const canPrepareCameraPreview = useMemo(
    () =>
      isPermissionFlowReady &&
      hasCompletedInitialBootstrap &&
      hasCameraPermission &&
      isFocused &&
      appState === 'active' &&
      !isProcessingVideo,
    [
      appState,
      hasCompletedInitialBootstrap,
      hasCameraPermission,
      isFocused,
      isPermissionFlowReady,
      isProcessingVideo,
    ],
  );

  useEffect(() => {
    let mountTimeout;
    let activateTimeout;

    if (!canPrepareCameraPreview) {
      setCanActivateCameraPreview(false);
      setCanMountCameraPreview(false);
      return undefined;
    }

    mountTimeout = setTimeout(() => {
      setCanMountCameraPreview(true);

      activateTimeout = setTimeout(() => {
        setCanActivateCameraPreview(true);
      }, 120);
    }, 300);

    return () => {
      clearTimeout(mountTimeout);
      clearTimeout(activateTimeout);
      setCanActivateCameraPreview(false);
    };
  }, [canPrepareCameraPreview]);

  const isCameraActive = useMemo(
    () => canActivateCameraPreview && !isRecoveringCamera,
    [canActivateCameraPreview, isRecoveringCamera],
  );

  useEffect(() => {
    if (!isFocused) {
      forceReleaseCameraSession().catch(error => {
        console.warn(
          'Falha ao liberar sessão da câmera ao perder foco.',
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

  const showProLockedAlert = useCallback(
    featureKey => {
      showAlert(
        t('camera.proLocked.title'),
        t('camera.proLocked.message', {feature: t(featureKey)}),
        [
          {text: t('common.cancel'), style: 'cancel'},
          {
            text: t('camera.proLocked.unlock'),
            onPress: () => {
              purchasePro().then(purchased => {
                showAlert(
                  purchased
                    ? t('camera.pro.purchaseSuccessTitle')
                    : t('camera.pro.purchasePendingTitle'),
                  purchased
                    ? t('camera.pro.purchaseSuccessMessage')
                    : billingError ??
                        t('camera.pro.purchasePendingMessage'),
                  [{text: t('common.ok')}],
                );
              });
            },
          },
        ],
      );
    },
    [billingError, purchasePro, showAlert, t],
  );

  const ensurePro = useCallback(
    featureKey => {
      if (isPro) {
        return true;
      }

      showProLockedAlert(featureKey);
      return false;
    },
    [isPro, showProLockedAlert],
  );

  const onOptimizationModeChange = useCallback(
    value => {
      if (value !== 'none' && !ensurePro('camera.proLocked.optimization')) {
        return;
      }

      setSettings(prev => applyMediaOptimizationMode(prev, value));
    },
    [ensurePro, setSettings],
  );

  const onRecordingModeChange = useCallback(
    value => {
      if (value !== 'normal' && !ensurePro('camera.proLocked.advancedPreset')) {
        return;
      }

      setSettings(prev => ({
        ...prev,
        recordingMode: value,
      }));
    },
    [ensurePro, setSettings],
  );

  const onResolutionChange = useCallback(
    value => {
      if (
        (value === '2k' || value === '4k') &&
        !ensurePro('camera.proLocked.highResolution')
      ) {
        return;
      }

      setSettings(prev => ({
        ...prev,
        videoResolutionPreset: value,
        formatIndex: '',
      }));
    },
    [ensurePro, setSettings],
  );

  const onSlowMotionDurationChange = useCallback(
    value => {
      if (!ensurePro('camera.proLocked.advancedPreset')) {
        return;
      }

      setSettings(prev => ({
        ...prev,
        slowMotionMaxDurationMs: value,
      }));
    },
    [ensurePro, setSettings],
  );

  const onApplyAudioProfile = useCallback(
    value => {
      if (value !== 'standard' && !ensurePro('camera.proLocked.audioProfiles')) {
        return;
      }

      setSettings(prev => applyAudioProfile(prev, value));
    },
    [ensurePro, setSettings],
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
    if (!ensurePro('camera.proLocked.ambient')) {
      return;
    }

    if (!settings.audio || isAmbientAnalysisRunning) {
      return;
    }

    const started = startAmbientAnalysis();
    if (!started) {
      showAlert(
        t('camera.analysisUnavailable.title'),
        t('camera.analysisUnavailable.message'),
        [{ text: t('common.ok') }],
      );
    }
  }, [
    ensurePro,
    isAmbientAnalysisRunning,
    settings.audio,
    showAlert,
    startAmbientAnalysis,
    t,
  ]);

  const renderHeader = useCallback(
    () => (
      <CameraHeaderActions
        flashMode={activeFlashMode}
        onToggleFlash={onFlashModeChange}
        isFrontCamera={cameraPosition === 'front'}
        isRecording={isRecording}
        optimizationMode={settings.optimizationMode}
        onOptimizationModeChange={onOptimizationModeChange}
        recordingMode={settings.recordingMode}
        onRecordingModeChange={onRecordingModeChange}
        resolutionOptions={resolutionOptions}
        resolutionPreset={settings.videoResolutionPreset}
        onResolutionChange={onResolutionChange}
        isOptimizationMenuOpen={isOptimizationMenuOpen}
        setIsOptimizationMenuOpen={setIsOptimizationMenuOpen}
        isAmbientAnalysisMenuOpen={isAmbientAnalysisMenuOpen}
        setIsAmbientAnalysisMenuOpen={setIsAmbientAnalysisMenuOpen}
        onStartAmbientAnalysis={onStartAmbientAnalysis}
        isAmbientAnalysisRunning={isAmbientAnalysisRunning}
        isAmbientAnalysisDisabled={!settings.audio}
        isPro={isPro}
        onRequestProFeature={showProLockedAlert}
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
        isPro,
        onOptimizationModeChange,
        onRecordingModeChange,
        onResolutionChange,
        onStartAmbientAnalysis,
        resolutionOptions,
        settings.videoResolutionPreset,
        settings.recordingMode,
        settings.optimizationMode,
        settings.audio,
        showProLockedAlert,
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
        backgroundColor: 'transparent',
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
        console.log('Permissões iniciais:', {
          cameraOk,
          galleryOk,
          microphoneOk,
        });
        if ((!cameraOk || !microphoneOk || !galleryOk) && showMissingAlert) {
          showAlert(
            t('camera.permissions.title'),
            settings.audio
              ? t('camera.permissions.withAudio')
              : t('camera.permissions.withoutAudio'),
          );
        }

        return cameraOk && microphoneOk && galleryOk;
      } finally {
        isRequestingPermissionsRef.current = false;
      }
    },
    [settings.audio, showAlert, t],
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
      t('camera.manageMedia.title'),
      t('camera.manageMedia.message'),
      [
        { text: t('camera.notNow'), style: 'cancel' },
        {
          text: t('camera.openSettings'),
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
  }, [showAlert, t]);

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
            'Falha ao solicitar permissão inicial de câmera.',
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
            'Falha ao solicitar permissão inicial de microfone.',
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
        console.warn('Falha ao solicitar permissão inicial da galeria.', error);
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
          'Não foi possível carregar vídeos na inicialização.',
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
          'Falha ao sugerir acesso especial de gerenciamento de mídia.',
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
      const effectiveSettings = isPro
        ? settings
        : {
            ...settings,
            optimizationMode: 'none',
            recordingMode: 'normal',
          };
      const captureSettings = getCaptureSettingsForRecordingMode(effectiveSettings);
      const extension = captureSettings.recordFileType === 'mp4' ? 'mp4' : 'mov';
      const newFileName = generateVideoFileName(extension);
      const newPath = `${RNFS.CachesDirectoryPath}/${newFileName}`;
      let sourcePath = originalPath;
      const optimizationMode = getMediaOptimizationModeOption(
        effectiveSettings.optimizationMode,
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
      let effectPath = null;
      let shouldDeleteOriginal = false;
      const shouldApplyEffect =
        effectiveSettings.recordingMode === 'slowMotion' ||
        effectiveSettings.recordingMode === 'timelapse';
      const shouldProcessMedia =
        shouldOptimize && (optimizationMode !== 'audio' || settings.audio);
      const saveRecordingMetadata = async finalPath => {
        const metadata = buildVideoRecordingMetadata({
          videoFileName: newFileName,
          originalPath,
          sourcePath,
          savedPath: finalPath,
          compressedPath,
          requestedOptimizationMode: effectiveSettings.optimizationMode,
          appliedOptimizationMode:
            shouldProcessMedia && finalPath !== sourcePath
              ? optimizationMode
              : 'none',
          usedFallbackToOriginal: shouldProcessMedia && finalPath === sourcePath,
          settings: effectiveSettings,
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

        if (effectiveSettings.recordingMode === 'slowMotion') {
          setProcessingOptimizationMode('slowMotion');
          setIsProcessingVideo(true);
          effectPath = await applySlowMotionEffect(
            pathToSave,
            extension,
            captureSettings.slowMotionTargetFps,
            captureSettings.slowMotionPlaybackFps,
          );
          pathToSave = effectPath;
        } else if (effectiveSettings.recordingMode === 'timelapse') {
          setProcessingOptimizationMode('timelapse');
          setIsProcessingVideo(true);
          effectPath = await applyTimelapseEffect(
            pathToSave,
            extension,
            captureSettings.timelapseSpeedFactor,
          );
          pathToSave = effectPath;
        }

        await saveVideoToCameraRoll(pathToSave);
        try {
          await saveRecordingMetadata(pathToSave);
        } catch (metadataError) {
          console.warn(
            'Não foi possível salvar os metadados da gravação.',
            metadataError,
          );
        }
        shouldDeleteOriginal = true;
        await loadVideosFromGallery();
      } catch (error) {
        if (shouldProcessMedia || shouldApplyEffect) {
          try {
            await saveVideoToCameraRoll(sourcePath);
            try {
              await saveRecordingMetadata(sourcePath);
            } catch (metadataError) {
              console.warn(
                'Não foi possível salvar os metadados da gravação.',
                metadataError,
              );
            }
            shouldDeleteOriginal = true;
            await loadVideosFromGallery();
            showAlert(
              shouldApplyEffect
                ? t('camera.effectUnavailable')
                : t('camera.optimizationUnavailable'),
              shouldApplyEffect
                ? t('camera.effectFallback')
                : t('camera.optimizationFallback'),
            );
          } catch (fallbackError) {
            showAlert(
              t('camera.processErrorTitle'),
              fallbackError?.message ??
                t('camera.processErrorMessage'),
            );
          }
        } else {
          showAlert(
            t('camera.saveErrorTitle'),
            error?.message ?? t('camera.saveErrorMessage'),
          );
        }
      } finally {
        setIsProcessingVideo(false);
        setProcessingOptimizationMode('none');
        if (shouldDeleteOriginal) {
          await deleteIfExists(effectPath);
          await deleteIfExists(compressedPath);
          await deleteIfExists(sourcePath);
        } else if (compressedPath && compressedPath !== sourcePath) {
          await deleteIfExists(compressedPath);
        } else if (effectPath && effectPath !== sourcePath) {
          await deleteIfExists(effectPath);
        }
        recordingStartedAtRef.current = null;
        setRecordingElapsedMs(0);
        setIsRecording(false);
      }
    },
    [
      loadVideosFromGallery,
      isPro,
      settings,
      showAlert,
      t,
    ],
  );

  const finalizeRecordedVideo = useCallback(
    video => {
      handleRecordingFinished(video).catch(error => {
        setIsProcessingVideo(false);
        showAlert(
          t('camera.processErrorTitle'),
          error?.message ?? t('camera.finishErrorMessage'),
        );
      });
    },
    [handleRecordingFinished, showAlert, t],
  );

  const handleRecordingError = useCallback(
    error => {
      const errorCode = error?.code ?? null;

      if (recordingLimitTimeoutRef.current) {
        clearTimeout(recordingLimitTimeoutRef.current);
        recordingLimitTimeoutRef.current = null;
      }
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
        t('camera.recordingErrorTitle'),
        error?.message ?? t('camera.recordingErrorMessage'),
      );
    },
    [scheduleCameraRecovery, showAlert, t],
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
      const captureSettings = getCaptureSettingsForRecordingMode(settings);
      camera.current.startRecording({
        fileType: captureSettings.recordFileType,
        videoCodec: captureSettings.recordVideoCodec,
        onRecordingFinished: video => {
          if (recordingLimitTimeoutRef.current) {
            clearTimeout(recordingLimitTimeoutRef.current);
            recordingLimitTimeoutRef.current = null;
          }
          recordingStartedAtRef.current = null;
          setRecordingElapsedMs(0);
          setIsRecording(false);
          finalizeRecordedVideo(video);
        },
        onRecordingError: handleRecordingError,
      });
      if (settings.recordingMode === 'slowMotion') {
        const maxDurationMs = Number(settings.slowMotionMaxDurationMs);

        recordingLimitTimeoutRef.current = setTimeout(() => {
          if (!isRecordingRef.current || !camera.current) {
            return;
          }

          camera.current.stopRecording().catch(error => {
            console.warn('Falha ao parar câmera lenta automaticamente.', error);
          });
        }, Number.isFinite(maxDurationMs) ? maxDurationMs : 5000);
      }
    } catch (error) {
      if (recordingLimitTimeoutRef.current) {
        clearTimeout(recordingLimitTimeoutRef.current);
        recordingLimitTimeoutRef.current = null;
      }
      recordingStartedAtRef.current = null;
      setRecordingElapsedMs(0);
      setIsRecording(false);
      showAlert(t('common.error'), error?.message ?? t('camera.startRecordingError'));
    }
  }, [
    ensurePermissions,
    finalizeRecordedVideo,
    handleRecordingError,
    isCameraActive,
    isCameraReady,
    isRecording,
    isRecoveringCamera,
    settings,
    showAlert,
    t,
  ]);

  const stopRecording = useCallback(async () => {
    if (!camera.current || !isRecording) {
      return;
    }

    try {
      if (recordingLimitTimeoutRef.current) {
        clearTimeout(recordingLimitTimeoutRef.current);
        recordingLimitTimeoutRef.current = null;
      }
      await camera.current.stopRecording();
    } catch (error) {
      recordingStartedAtRef.current = null;
      setRecordingElapsedMs(0);
      setIsRecording(false);
      showAlert(t('common.error'), error?.message ?? t('camera.stopRecordingError'));
    }
  }, [isRecording, showAlert, t]);

  const onPermissionPress = useCallback(async () => {
    try {
      await Linking.openSettings();
    } catch (error) {
      console.warn('Falha ao abrir as configurações do app.', error);
      showAlert(
        t('camera.openSettingsErrorTitle'),
        t('camera.openSettingsErrorMessage'),
        [{ text: t('common.ok') }],
      );
    }
  }, [showAlert, t]);

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
          t('camera.openVideoErrorTitle'),
          error?.message ?? t('camera.openVideoErrorMessage'),
        );
      }
    },
    [showAlert, t],
  );

  const onShareVideo = useCallback(
    async item => {
      try {
        await shareVideo(item);
      } catch (error) {
        showAlert(
          t('camera.shareVideoErrorTitle'),
          error?.message ?? t('camera.shareVideoErrorMessage'),
        );
      }
    },
    [showAlert, t],
  );

  const clearSelectedVideo = useCallback(() => {
    setIsSelectedVideoOptimizationOpen(false);
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
      t('camera.manageMedia.extraTitle'),
      t('camera.manageMedia.extraMessage'),
      [
        { text: t('common.close'), style: 'cancel' },
        {
          text: t('camera.openSettings'),
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
  }, [showAlert, t]);

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
          t('common.error'),
          error?.message ?? t('camera.deleteVideoErrorMessage'),
        );
      } finally {
        setIsDeletingSelectedVideo(false);
      }
    },
    [loadVideosFromGallery, maybeWarnAboutManageMedia, showAlert, t],
  );

  const optimizeSelectedVideo = useCallback(
    async (item, optimizationMode) => {
      if (!ensurePro('camera.proLocked.optimization')) {
        return;
      }

      const mode = getMediaOptimizationModeOption(optimizationMode).value;

      if (!item || mode === 'none') {
        return;
      }

      const sourcePath = item.path || item.uri;
      const extension = getVideoExtensionFromItem(item);
      let optimizedPath = null;

      setIsSelectedVideoOptimizationOpen(false);
      setProcessingOptimizationMode(mode);
      setIsProcessingVideo(true);

      try {
        optimizedPath = await optimizeVideo(sourcePath, extension, {
          optimizationMode: mode,
          audioLimiterPreset: settings.audioLimiterPreset,
          normalizeAudioLoudness: settings.normalizeAudioLoudness,
        });

        await saveVideoToCameraRoll(optimizedPath);
        await loadVideosFromGallery({ showLoader: false });

        showAlert(
          t('camera.optimizationDoneTitle'),
          t('camera.optimizationDoneMessage'),
          [{ text: t('common.ok') }],
        );
      } catch (error) {
        showAlert(
          t('camera.optimizationUnavailable'),
          error?.message ??
            t('camera.optimizationFallback'),
          [{ text: t('common.ok') }],
        );
      } finally {
        setIsProcessingVideo(false);
        setProcessingOptimizationMode('none');
        if (
          optimizedPath &&
          optimizedPath !== sourcePath &&
          optimizedPath !== item.path &&
          optimizedPath !== item.uri
        ) {
          await deleteIfExists(optimizedPath);
        }
      }
    },
    [
      loadVideosFromGallery,
      ensurePro,
      settings.audioLimiterPreset,
      settings.normalizeAudioLoudness,
      showAlert,
      t,
    ],
  );

  const onDeleteSelectedVideo = useCallback(() => {
    if (!selectedVideo || isDeletingSelectedVideo) {
      return;
    }

    const videoToDelete = selectedVideo;
    clearSelectedVideo();

    showAlert(t('camera.deleteVideoTitle'), t('camera.deleteVideoMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
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
    t,
  ]);

  const onVideoCardPress = useCallback(
    item => {
      if (isDeletingSelectedVideo) {
        return;
      }

      setIsSelectedVideoOptimizationOpen(false);
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
        <Text style={styles.subtitle}>{t('camera.loadingSettings')}</Text>
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
          {t('camera.initializing')}
        </Text>
      </View>
    );
  }

  if (!hasCameraPermission) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>{t('camera.permissionTitle')}</Text>
        <Text style={styles.subtitle}>
          {t('camera.permissionMessage')}
        </Text>
        <Text style={styles.subtitle}>
          {t('camera.permissionHint')}
        </Text>
        <Pressable style={styles.primaryButton} onPress={onPermissionPress}>
          <Text style={styles.primaryButtonText}>
            {t('camera.openSettings')}
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LoadingModal
        message={t('camera.processingWait')}
        title={getOptimizationLoadingTitle(processingOptimizationMode, t)}
        visible={isProcessingVideo}
      />
      <LoadingModal
        message={t('camera.analysisProgress', {
          percent: Math.round(ambientAnalysisProgress * 100),
          seconds: Math.max(1, Math.ceil(ambientAnalysisRemainingMs / 1000)),
        })}
        title={t('camera.analyzingAmbient')}
        visible={isAmbientAnalysisRunning}
      />
      <LoadingModal
        message={t('camera.deletingSelectedMessage')}
        title={t('camera.deletingSelectedTitle')}
        visible={isDeletingSelectedVideo}
      />
      <View style={styles.previewStage}>
        {canMountCameraPreview ? (
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
            savedAudioProfiles={savedAudioProfiles}
            onSaveAudioProfile={saveAudioProfile}
            onApplySavedAudioProfile={applySavedAudioProfile}
            onReplaceSavedAudioProfile={replaceSavedAudioProfile}
            onRenameSavedAudioProfile={renameSavedAudioProfile}
            onDeleteSavedAudioProfile={deleteSavedAudioProfile}
            onSetAudioEnabled={onSetAudioEnabled}
            isPro={isPro}
            onRequestProFeature={showProLockedAlert}
            isOptimizationMenuOpen={isOptimizationMenuOpen}
            onSlowMotionDurationChange={onSlowMotionDurationChange}
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
        ) : (
          <View style={styles.center}>
            <ActivityIndicator
              size="small"
              color={cinematicTheme.colors.mutedForeground}
            />
            <Text style={styles.subtitle}>{t('camera.preparingCamera')}</Text>
          </View>
        )}

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
                        <Text style={styles.panelKicker}>
                          {t('camera.videos')}
                        </Text>
                        <Pressable onPress={() => navigation.navigate('Library')}>
                          <Text style={styles.panelLink}>
                            {t('camera.viewAll')}
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>

                  <View style={styles.panelDivider} />
                </>
              ) : null}

              {selectedVideo ? (
                isSelectedVideoOptimizationOpen ? (
                  <View style={styles.panelActions}>
                    <Pressable
                      disabled={isDeletingSelectedVideo || isProcessingVideo}
                      onPress={() => {
                        optimizeSelectedVideo(selectedVideo, 'audio').catch(
                          error => {
                            console.warn(
                              'Falha ao otimizar áudio pela barra de ações.',
                              error,
                            );
                          },
                        );
                      }}
                      style={styles.panelActionButton}
                    >
                      <View style={styles.panelActionIconWrap}>
                        <Icon
                          name="musical-notes-outline"
                          size={22}
                          color={cinematicTheme.colors.foreground}
                        />
                      </View>
                      <Text style={styles.panelActionLabel}>{t('common.audio')}</Text>
                    </Pressable>

                    <Pressable
                      disabled={isDeletingSelectedVideo || isProcessingVideo}
                      onPress={() => {
                        optimizeSelectedVideo(selectedVideo, 'video').catch(
                          error => {
                            console.warn(
                              'Falha ao otimizar vídeo pela barra de ações.',
                              error,
                            );
                          },
                        );
                      }}
                      style={styles.panelActionButton}
                    >
                      <View style={styles.panelActionIconWrap}>
                        <Icon
                          name="videocam-outline"
                          size={22}
                          color={cinematicTheme.colors.foreground}
                        />
                      </View>
                      <Text style={styles.panelActionLabel}>{t('common.video')}</Text>
                    </Pressable>

                    <Pressable
                      disabled={isDeletingSelectedVideo || isProcessingVideo}
                      onPress={() => {
                        optimizeSelectedVideo(selectedVideo, 'both').catch(
                          error => {
                            console.warn(
                              'Falha ao otimizar mídia pela barra de ações.',
                              error,
                            );
                          },
                        );
                      }}
                      style={styles.panelActionButton}
                    >
                      <View style={styles.panelActionIconWrap}>
                        <Icon
                          name="layers-outline"
                          size={22}
                          color={cinematicTheme.colors.foreground}
                        />
                      </View>
                      <Text style={styles.panelActionLabel}>
                        {t('common.videoAudioShort')}
                      </Text>
                    </Pressable>

                    <Pressable
                      disabled={isDeletingSelectedVideo || isProcessingVideo}
                      onPress={() => setIsSelectedVideoOptimizationOpen(false)}
                      style={styles.panelActionButton}
                    >
                      <View style={styles.panelActionIconWrap}>
                        <Icon
                          name="close-outline"
                          size={22}
                          color={cinematicTheme.colors.foreground}
                        />
                      </View>
                      <Text style={styles.panelActionLabel}>{t('common.close')}</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={styles.panelActions}>
                    <Pressable
                      disabled={isDeletingSelectedVideo || isProcessingVideo}
                      onPress={() => {
                        clearSelectedVideo();
                        onOpenVideo(selectedVideo).catch(error => {
                          console.warn(
                            'Falha ao abrir vídeo pela barra de ações.',
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
                      <Text style={styles.panelActionLabel}>{t('common.open')}</Text>
                    </Pressable>

                    <Pressable
                      disabled={isDeletingSelectedVideo || isProcessingVideo}
                      onPress={() => setIsSelectedVideoOptimizationOpen(true)}
                      style={styles.panelActionButton}
                    >
                      <View style={styles.panelActionIconWrap}>
                        <Icon
                          name="color-wand-outline"
                          size={22}
                          color={cinematicTheme.colors.foreground}
                        />
                      </View>
                      <Text style={styles.panelActionLabel}>
                        {t('common.optimize')}
                      </Text>
                    </Pressable>

                    <Pressable
                      disabled={isDeletingSelectedVideo || isProcessingVideo}
                      onPress={() => {
                        clearSelectedVideo();
                        onShareVideo(selectedVideo).catch(error => {
                          console.warn(
                            'Falha ao compartilhar vídeo pela barra de ações.',
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
                      <Text style={styles.panelActionLabel}>
                        {t('common.shareShort')}
                      </Text>
                    </Pressable>

                    <Pressable
                      disabled={isDeletingSelectedVideo || isProcessingVideo}
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
                          color={cinematicTheme.colors.destructiveSoftForeground}
                        />
                      </View>
                      <Text style={styles.panelActionLabel}>{t('common.delete')}</Text>
                    </Pressable>

                    <Pressable
                      disabled={isDeletingSelectedVideo || isProcessingVideo}
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
                      <Text style={styles.panelActionLabel}>{t('common.cancel')}</Text>
                    </Pressable>
                  </View>
                )
              ) : (
                <View />
              )}

              {settings.showAudioLevelMeter && settings.audio ? (
                <View style={styles.recordingMeterPanel}>
                  <View style={styles.recordingMeterHeader}>
                    <Text style={styles.recordingMeterLabel}>
                      {t('camera.vuPreview')}
                    </Text>
                    <Text
                      style={[
                        styles.recordingMeterValue,
                        audioMeterIsClipping && styles.recordingMeterValueClip,
                      ]}
                    >
                      {audioMeterIsClipping
                        ? t('camera.clip')
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
                      ? t('camera.vuHighPeak')
                      : t('camera.vuSafe')}
                  </Text>
                </View>
              ) : isLoadingSavedVideos ? (
                <View style={styles.savedVideosLoading}>
                  <ActivityIndicator
                    size="small"
                    color={cinematicTheme.colors.mutedForeground}
                  />
                  <Text style={styles.savedVideosLoadingText}>
                    {t('camera.loadingVideos')}
                  </Text>
                </View>
              ) : (
                <View style={styles.savedVideosViewport}>
                  <FlatList
                    data={savedVideos}
                    keyExtractor={item => item.uri}
                    horizontal
                    snapToInterval={120}
                    decelerationRate="fast"
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
                        {t('camera.noSavedVideos')}
                      </Text>
                    }
                  />
                </View>
              )}

            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}
