import React, {useRef, useEffect, useMemo} from 'react';
import {Animated, Easing, Pressable, StyleSheet, Text, View} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {Camera, useCameraDevice} from 'react-native-vision-camera';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

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
  isProcessingVideo,
  isRecording,
  onError,
  onInitialized,
  onToggleCamera,
  recordingElapsedMs,
  settings,
  startRecording,
  stopRecording,
  torch,
  isActive,
}) {
  const device = useCameraDevice(cameraPosition);
  const selectedFormat = useMemo(() => {
    return pickFormatForSettings(device?.formats ?? [], settings);
  }, [device, settings]);
  const insets = useSafeAreaInsets();
  const topOverlayStyle = useMemo(
    () => [styles.topOverlay, {paddingTop: insets.top ? insets.top + 50 : 60}],
    [insets.top],
  );
  const progressNative = useRef(new Animated.Value(0)).current;
  const progressJS = useRef(new Animated.Value(0)).current;  

  const animatedBorderRadius = progressJS.interpolate({
    inputRange: [0, 1],
    outputRange: [15, 6],
  });
  const animatedInnerScale = progressNative.interpolate({
    inputRange: [0, 1],
    outputRange: [0.53, 1],
  });
  const animatedOuterScale = progressNative.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0.85, 1],
  });

  useEffect(() => {
    Animated.timing(progressNative, {
      toValue: isRecording ? 1 : 0,
      duration: 220,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start();

    Animated.timing(progressJS, {
      toValue: isRecording ? 1 : 0,
      duration: 220,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [isRecording]);

  const cameraProps = useMemo(
    () => ({
      device,
      torch,
      isActive,
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
    [device, isActive, selectedFormat, settings, torch],
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
      <Camera
        ref={camera}
        style={StyleSheet.absoluteFill}
        onError={onError}
        onInitialized={onInitialized}
        {...cameraProps}
      />
      <View style={topOverlayStyle}>
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
            onPress={isRecording ? stopRecording : startRecording}>
            <Animated.View
              style={[
                styles.recordButton,
                {
                  
                  transform: [{scale: animatedOuterScale}],
                },
              ]}>
              <Animated.View
                style={[
                  styles.recordButtonInner,
                  {
                    backgroundColor: '#fff',
                    width: 30,
                    height: 30,
                    borderRadius: animatedBorderRadius,
                    transform: [{scale: animatedInnerScale}],
                  },
                ]}
              />
            </Animated.View>
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
            <Icon name="camera-reverse-outline" size={20} color="#fff" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
