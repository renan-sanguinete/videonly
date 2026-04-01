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
      ...(device?.hasTorch ? {torch: settings.torch} : {}),
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
