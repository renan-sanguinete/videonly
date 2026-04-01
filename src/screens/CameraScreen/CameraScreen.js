import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import {FlatList, Pressable, Text, View} from 'react-native';
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
      <CameraHeaderActions
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
