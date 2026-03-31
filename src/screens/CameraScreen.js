import React, {useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useIsFocused} from '@react-navigation/native';
import RNFS from 'react-native-fs';
import Icon from 'react-native-vector-icons/Ionicons';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useMicrophonePermission,
} from 'react-native-vision-camera';

import {useCameraSettings} from '../context/CameraSettingsContext';
import LoadingModal from '../components/LoadingModal';
import {useCustomAlert} from '../context/CustomAlertContext';
import {
  loadSavedVideosFromCameraRoll,
  saveVideoToCameraRoll,
} from '../utils/cameraRollVideos';
import {compressVideo} from '../utils/videoCompression';
import {openVideoUri, shareVideo} from '../utils/videoActions';

function parseMaybeNumber(value) {
  if (value === '' || value === null || value === undefined) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  if (!bytes) return '—';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
}

function formatDate(dateLike) {
  if (!dateLike) return '—';
  const date = new Date(dateLike);
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

function formatVideoDuration(secondsLike) {
  const totalSeconds = Math.max(0, Math.round(secondsLike || 0));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return [hours, minutes, seconds].map(value => String(value).padStart(2, '0')).join(':');
  }

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function formatElapsedTime(milliseconds) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return [hours, minutes, seconds].map(value => String(value).padStart(2, '0')).join(':');
  }

  return [minutes, seconds].map(value => String(value).padStart(2, '0')).join(':');
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
    const normalizedLeftIndex = leftPreferredIndex === -1 ? preferredHeights.length : leftPreferredIndex;
    const normalizedRightIndex = rightPreferredIndex === -1 ? preferredHeights.length : rightPreferredIndex;

    if (normalizedLeftIndex !== normalizedRightIndex) {
      return normalizedLeftIndex - normalizedRightIndex;
    }

    if (leftHeight !== rightHeight) {
      return leftHeight - rightHeight;
    }

    return (left.videoWidth ?? 0) - (right.videoWidth ?? 0);
  });
}

function pickFormatForSettings(formats, settings) {
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

  const explicitIndex = settings.formatIndex === '' ? undefined : Number(settings.formatIndex);
  if (explicitIndex !== undefined && !Number.isNaN(explicitIndex) && formats[explicitIndex]) {
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

      return fpsMatches && videoHdrMatches && photoHdrMatches && resolutionMatches;
    }) || formats[0]
  );
}

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

function HeaderActions({onOpenLibrary, onOpenSettings}) {
  return (
    <View style={styles.headerActions}>
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

function CameraPreview({
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
      audioSampleRate: parseMaybeNumber(settings.audioSampleRate),
      audioBitRateKbps: parseMaybeNumber(settings.audioBitRateKbps),
      photo: settings.photo,
      video: settings.video,
      preview: settings.preview,
      enableZoomGesture: settings.enableZoomGesture,
      resizeMode: settings.resizeMode,
      photoQualityBalance: settings.photoQualityBalance,
      zoom: parseMaybeNumber(settings.zoom),
      exposure: parseMaybeNumber(settings.exposure),
      ...(device?.supportsLowLightBoost ? {lowLightBoost: settings.lowLightBoost} : {}),
      ...(device?.hasTorch ? {torch: settings.torch} : {}),
      ...(selectedFormat ? {format: selectedFormat} : {}),
      ...(selectedFormat ? {videoBitRate: settings.videoBitRate} : {}),
      ...(selectedFormat && settings.fps !== ''
        ? {fps: parseMaybeNumber(settings.fps)}
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
        <Text style={styles.subtitle}>Se o aparelho não tiver câmera compatível, nada será exibido.</Text>
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
            <Text style={styles.badgeText}>{'REC'}</Text>
          </View>
          <View style={styles.timerPill}>
            <Text style={styles.timerText}>{formatElapsedTime(recordingElapsedMs)}</Text>
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
            style={[styles.recordButton, isRecording && styles.recordButtonActive]}>
            {isRecording ? (
              <View style={styles.stopIcon} />
            ) : (
              <View style={styles.recordIcon} />
            )}
          </Pressable>
          <Pressable
            accessibilityLabel={`Alternar para câmera ${cameraPosition === 'back' ? 'frontal' : 'traseira'}`}
            disabled={isRecording || isProcessingVideo}
            onPress={onToggleCamera}
            style={[
              styles.cameraSwitchButton,
              (isRecording || isProcessingVideo) && styles.cameraSwitchButtonDisabled,
            ]}>
            <Icon name="camera-reverse-outline" size={24} color="#fff" />
          </Pressable>
        </View>
      </View>
    </View>
  );
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

  const loadVideosFromGallery = async () => {
    try {
      const videos = await loadSavedVideosFromCameraRoll();
      setSavedVideos(videos);
    } catch (error) {
      console.error("Erro ao carregar vídeos:", error);
    }
  };

  useEffect(() => {
    loadVideosFromGallery();
  }, []);

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

  const renderHeaderRight = useCallback(
    () => (
      <HeaderActions
        onOpenLibrary={() => navigation.navigate('Library')}
        onOpenSettings={() => navigation.navigate('Settings')}
      />
    ),
    [navigation],
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

  const handleRecordingFinished = useCallback(async video => {
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
  }, [settings.compressVideoBeforeSave, showAlert]);

  const finalizeRecordedVideo = useCallback(video => {
    handleRecordingFinished(video).catch(error => {
      console.error('Erro ao finalizar vídeo gravado:', error);
      setIsProcessingVideo(false);
      showAlert(
        'Erro ao processar vídeo',
        error?.message ?? 'Não foi possível finalizar o vídeo gravado.',
      );
    });
  }, [handleRecordingFinished, showAlert]);

  const handleRecordingError = useCallback(error => {
    console.error(error);
    recordingStartedAtRef.current = null;
    setRecordingElapsedMs(0);
    setIsRecording(false);
    showAlert('Erro de gravação', error?.message ?? 'Não foi possível gravar o vídeo.');
  }, [showAlert]);

  const startRecording = useCallback(async () => {
    if (!camera.current || isRecording) {
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

  const onOpenVideo = useCallback(async item => {
    try {
      await openVideoUri(item.uri);
    } catch (error) {
      showAlert(
        'Erro ao abrir vídeo',
        error?.message ?? 'Não foi possível abrir este vídeo.',
      );
    }
  }, [showAlert]);

  const onShareVideo = useCallback(async item => {
    try {
      await shareVideo(item);
    } catch (error) {
      showAlert(
        'Erro ao compartilhar',
        error?.message ?? 'Não foi possível compartilhar este vídeo.',
      );
    }
  }, [showAlert]);

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
        <Text style={styles.subtitle}>O app precisa de permissão para acessar a câmera.</Text>
        <Pressable style={styles.primaryButton} onPress={onPermissionPress}>
          <Text style={styles.primaryButtonText}>Permitir câmera e microfone</Text>
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
        camera={camera}
        cameraPosition={cameraPosition}
        currentCameraLabel={currentCameraLabel}
        isFocused={isFocused}
        isProcessingVideo={isProcessingVideo}
        isRecording={isRecording}
        onToggleCamera={onToggleCamera}
        recordingElapsedMs={recordingElapsedMs}
        settings={settings}
        startRecording={startRecording}
        stopRecording={stopRecording}
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
            <Pressable style={styles.videoCard} onPress={() => onVideoCardPress(item)}>
              <View style={styles.videoThumbWrap}>
                {item.thumbnailUri ? (
                  <Image source={{uri: item.thumbnailUri}} style={styles.videoThumb} />
                ) : (
                  <View style={[styles.videoThumb, styles.videoThumbFallback]}>
                    <Icon name="videocam-outline" size={22} color="#cbd5e1" />
                  </View>
                )}
                <View style={styles.videoThumbOverlay}>
                  <Icon name="play" size={12} color="#fff" />
                </View>
                <View style={styles.videoDurationPill}>
                  <Text style={styles.videoDurationText}>{formatVideoDuration(item.duration)}</Text>
                </View>
              </View>
              <View style={styles.videoCardBody}>
                <Text style={styles.videoMeta}>{formatSize(item.size)}</Text>
                <Text style={styles.videoMeta}>{formatDate(item.mtime || item.timestamp * 1000)}</Text>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Nenhum vídeo salvo ainda.</Text>
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#0b1020'},
  cameraWrap: {flex: 1, backgroundColor: '#000'},
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  topOverlay: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  badge: {
    backgroundColor: 'rgba(17,24,39,0.9)',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  badgeText: {color: '#dc2626', fontWeight: '700', fontSize: 12},
  recordingStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timerPill: {
    backgroundColor: 'rgba(17,24,39,0.9)',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  timerText: {
    color: '#f8fafc',
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  fpsText: {
    color: '#e5e7eb',
    backgroundColor: 'rgba(17,24,39,0.7)',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    overflow: 'hidden',
    maxWidth: '66%',
  },
  controls: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    gap: 12,
    alignItems: 'center',
    zIndex: 10,
  },
  controlsRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    gap: 18,
  },
  controlsSideSlot: {
    width: 56,
    height: 56,
  },
  recordButton: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
    borderWidth: 5,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  recordButtonActive: {
    backgroundColor: '#dc2626',
  },
  recordIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
  },
  stopIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  cameraSwitchButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(17, 24, 39, 0.1)',
    borderWidth: 1,
    borderColor: '#fff',
  },
  cameraSwitchButtonDisabled: {
    opacity: 0.45,
  },
  secondaryButton: {
    backgroundColor: 'rgba(17,24,39,0.85)',
    borderWidth: 1,
    borderColor: '#334155',
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: 999,
  },
  secondaryButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  panel: {
    backgroundColor: '#111827',
    borderTopWidth: 1,
    borderTopColor: '#1f2937',
    padding: 16,
  },
  savedVideosContent: {
    gap: 12,
  },
  panelTitle: {
    color: '#f9fafb',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  videoCard: {
    width: 200,
    backgroundColor: '#0f172a',
    borderRadius: 18,
    padding: 10,
    borderWidth: 1,
    borderColor: '#243244',
    overflow: 'hidden',
  },
  videoThumbWrap: {
    height: 92,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#172033',
    marginBottom: 10,
    position: 'relative',
  },
  videoThumb: {
    width: '100%',
    height: '100%',
  },
  videoThumbFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoThumbOverlay: {
    position: 'absolute',
    right: 8,
    top: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(15,23,42,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoDurationPill: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    backgroundColor: 'rgba(2,6,23,0.78)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  videoDurationText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  videoCardBody: {gap: 2},
  videoName: {color: '#fff', fontWeight: '700', marginBottom: 6},
  videoMeta: {color: '#9ca3af', fontSize: 12, marginBottom: 2},
  emptyText: {color: '#9ca3af'},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#0b1020'},
  title: {color: '#fff', fontSize: 28, fontWeight: '800', marginBottom: 8, textAlign: 'center'},
  subtitle: {color: '#cbd5e1', fontSize: 15, textAlign: 'center', marginBottom: 16, lineHeight: 21},
  primaryButton: {
    backgroundColor: '#2563eb',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  primaryButtonText: {color: '#fff', fontWeight: '700'},
  headerIconButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
