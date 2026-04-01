import React, {useMemo} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {Camera, useCameraDevice} from 'react-native-vision-camera';

import {
  parseCameraNumber,
  pickFormatForSettings,
} from '../utils/cameraFormatUtils';
import {formatElapsedTime} from '../utils/videoFormatters';

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

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#0b1020'},
  cameraWrap: {flex: 1, backgroundColor: '#000'},
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#0b1020',
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: '#cbd5e1',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 21,
  },
});
