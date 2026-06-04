import React, { useRef, useEffect, useMemo, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Camera, useCameraDevice } from 'react-native-vision-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  parseCameraNumber,
  pickFormatForSettings,
} from '../../utils/cameraFormatUtils';
import { getAudioSourceOption } from '../../constants/audioSources';
import {
  AUDIO_PROFILE_OPTIONS,
  getAudioRiskLevel,
} from '../../constants/audioProfiles';
import {cinematicTheme} from '../../theme/cinematicTheme';
import { formatElapsedTime } from '../../utils/videoFormatters';
import { styles } from './styles';

const {colors} = cinematicTheme;

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
  onApplyAudioProfile,
  onSetAudioEnabled,
  onOpenCustomAudioSettings,
  isOptimizationMenuOpen,
}) {
  const device = useCameraDevice(cameraPosition);
  const [isAudioMenuOpen, setIsAudioMenuOpen] = useState(false);
  const selectedFormat = useMemo(() => {
    return pickFormatForSettings(device?.formats ?? [], settings);
  }, [device, settings]);
  const insets = useSafeAreaInsets();
  const topOverlayStyle = useMemo(
    () => [
      styles.topOverlay,
      { paddingTop: insets.top ? insets.top + 50 : 60 },
    ],
    [insets.top],
  );
  const progressNative = useRef(new Animated.Value(0)).current;
  const progressJS = useRef(new Animated.Value(0)).current;

  const animatedBorderRadius = progressJS.interpolate({
    inputRange: [0, 1],
    outputRange: [999, 8],
  });
  const animatedInnerScale = progressNative.interpolate({
    inputRange: [0, 1],
    outputRange: [0.52, 1],
  });
  const animatedOuterScale = progressNative.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.03, 1],
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
  }, [isRecording, progressJS, progressNative]);

  const cameraProps = useMemo(
    () => ({
      device,
      torch,
      isActive,
      audio: settings.audio,
      audioChannels: settings.audioChannels,
      audioSampleRate: parseCameraNumber(settings.audioSampleRate),
      audioBitRateKbps: parseCameraNumber(settings.audioBitRateKbps),
      audioGain: parseCameraNumber(settings.audioGain),
      audioSource: parseCameraNumber(settings.audioSource),
      video: true,
      preview: true,
      enableZoomGesture: settings.enableZoomGesture,
      resizeMode: settings.resizeMode,
      zoom: parseCameraNumber(settings.zoom),
      exposure: parseCameraNumber(settings.exposure),
      ...(device?.supportsLowLightBoost
        ? { lowLightBoost: settings.lowLightBoost }
        : {}),
      ...(selectedFormat ? { format: selectedFormat } : {}),
      ...(selectedFormat ? { videoBitRate: settings.videoBitRate } : {}),
      ...(selectedFormat && settings.fps !== ''
        ? { fps: parseCameraNumber(settings.fps) }
        : {}),
      ...(selectedFormat?.supportsVideoHdr
        ? { videoHdr: settings.videoHdr }
        : {}),
    }),
    [device, isActive, selectedFormat, settings, torch],
  );

  const fpsLabel = `FPS\n${String(cameraProps?.fps ?? 'AUTO').toUpperCase()}`;
  const currentAudioSource = getAudioSourceOption(settings.audioSource);
  const audioRisk = getAudioRiskLevel(settings);
  const showAudioRiskWarning =
    isRecording && settings.audio && audioRisk.level === 'high';
  const quickAudioProfiles = useMemo(() => AUDIO_PROFILE_OPTIONS, []);
  const audioToggleOptions = useMemo(
    () => [
      {
        value: 'enable',
        label: 'Habilitar áudio',
        description: 'Volta a gravar com áudio usando a configuração atual.',
      },
      {
        value: 'keep-off',
        label: 'Manter desativado',
        description: 'Continua gravando sem captação de áudio.',
      },
    ],
    [],
  );
  const isAudioControlDisabled = isRecording || isProcessingVideo;
  const isLiveSafeProfile = settings.audioProfile === 'live-safe';
  const isCustomProfile = settings.audioProfile === 'custom';

  const audioProfileButtonStyle = useMemo(() => {
    if (isCustomProfile) {
      return styles.audioProfileButtonCustom;
    }

    if (isLiveSafeProfile) {
      return styles.audioProfileButtonLive;
    }

    return null;
  }, [isCustomProfile, isLiveSafeProfile]);

  useEffect(() => {
    if (isAudioControlDisabled && isAudioMenuOpen) {
      setIsAudioMenuOpen(false);
    }
  }, [isAudioMenuOpen, isAudioControlDisabled]);

  const getQuickOptionSelectedStyle = optionValue => {
    if (optionValue === 'custom') {
      return styles.audioQuickOptionSelectedCustom;
    }

    if (optionValue === 'live-safe') {
      return styles.audioQuickOptionSelectedLive;
    }

    return styles.audioQuickOptionSelectedStandard;
  };

  const getQuickOptionSelectedLabelStyle = optionValue => {
    if (optionValue === 'custom') {
      return styles.audioQuickOptionLabelSelectedCustom;
    }

    if (optionValue === 'live-safe') {
      return styles.audioQuickOptionLabelSelectedLive;
    }

    return styles.audioQuickOptionLabelSelectedStandard;
  };

  if (device == null) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>
          Buscando câmera {currentCameraLabel}...
        </Text>
        <Text style={styles.subtitle}>
          Se o aparelho não tiver câmera compatível, nada será exibido.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.cameraWrap}>
      {isAudioMenuOpen ? (
        <Pressable
          onPress={() => setIsAudioMenuOpen(false)}
          style={styles.audioQuickMenuBackdrop}
        />
      ) : null}
      <View style={styles.cameraVignetteTop} pointerEvents="none" />
      <View style={styles.cameraVignetteBottom} pointerEvents="none" />
      <Camera
        ref={camera}
        style={StyleSheet.absoluteFill}
        onError={onError}
        onInitialized={onInitialized}
        {...cameraProps}
      />
      <View
        pointerEvents="none"
        style={[
          styles.recordingFrame,
          isRecording && styles.recordingFrameActive,
        ]}
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
        {!isOptimizationMenuOpen ? (
          <Text style={styles.fpsText}>{fpsLabel}</Text>
        ) : (
          <Text>{''}</Text>
        )}
      </View>

      {isRecording && settings.showAudioStatus ? (
        <View style={styles.audioStatusWrap}>
          <View
            style={[
              styles.audioStatusPill,
              showAudioRiskWarning
                ? styles.audioStatusPillWarning
                : styles.audioStatusPillSafe,
            ]}
          >
            <Text style={styles.audioStatusPillTitle}>
              Audio: {currentAudioSource.shortLabel} · {audioRisk.title}
            </Text>
            <Text style={styles.audioStatusPillText}>
              {audioRisk.description}
            </Text>
            {settings.optimizationMode === 'audio' ||
            settings.optimizationMode === 'both' ? (
              <Text style={styles.audioStatusPillText}>
                Correção de áudio no salvamento: ativa
              </Text>
            ) : null}
          </View>
        </View>
      ) : null}

      <View style={styles.controls}>
        <View style={styles.controlsRow}>
          <View style={styles.controlsSideSlot}>
            {!isRecording && isAudioMenuOpen ? (
              <View style={styles.audioQuickMenu}>
                <Text style={styles.audioQuickMenuTitle}>
                  {settings.audio ? 'Captação' : 'Áudio'}
                </Text>
                {settings.audio
                  ? quickAudioProfiles.map(option => {
                      const isSelected = settings.audioProfile === option.value;

                      return (
                        <Pressable
                          key={option.value}
                          onPress={() => {
                            if (option.value === 'custom') {
                              onOpenCustomAudioSettings();
                              setIsAudioMenuOpen(false);
                              return;
                            }

                            onApplyAudioProfile(option.value);
                            setIsAudioMenuOpen(false);
                          }}
                          style={[
                            styles.audioQuickOption,
                            isSelected &&
                              getQuickOptionSelectedStyle(option.value),
                          ]}
                        >
                          <Text
                            style={[
                              styles.audioQuickOptionLabel,
                              isSelected &&
                                getQuickOptionSelectedLabelStyle(option.value),
                            ]}
                          >
                            {option.label}
                          </Text>
                          <Text style={styles.audioQuickOptionDescription}>
                            {option.description}
                          </Text>
                        </Pressable>
                      );
                    })
                  : audioToggleOptions.map(option => {
                      const isSelected = option.value === 'keep-off';

                      return (
                        <Pressable
                          key={option.value}
                          onPress={() => {
                            if (option.value === 'enable') {
                              onSetAudioEnabled(true);
                            }

                            setIsAudioMenuOpen(false);
                          }}
                          style={[
                            styles.audioQuickOption,
                            isSelected &&
                              styles.audioQuickOptionSelectedStandard,
                          ]}
                        >
                          <Text
                            style={[
                              styles.audioQuickOptionLabel,
                              isSelected &&
                                styles.audioQuickOptionLabelSelectedStandard,
                            ]}
                          >
                            {option.label}
                          </Text>
                          <Text style={styles.audioQuickOptionDescription}>
                            {option.description}
                          </Text>
                        </Pressable>
                      );
                    })}
              </View>
            ) : null}
            {isRecording ? (
              <View style={styles.controlsSideSlotPlaceholder} />
            ) : (
              <Pressable
                accessibilityLabel="Abrir configuracoes de captacao"
                disabled={isAudioControlDisabled}
                onPress={() =>
                  setIsAudioMenuOpen(currentValue => !currentValue)
                }
                style={[
                  styles.audioProfileButton,
                  isAudioControlDisabled &&
                    styles.cameraSwitchButtonDisabled,
                  audioProfileButtonStyle,
                ]}
              >
                <Icon
                  name={settings.audio ? 'mic' : 'mic-off-outline'}
                  size={20}
                  color={colors.foreground}
                />
              </Pressable>
            )}
          </View>
          <Pressable
            disabled={isProcessingVideo}
            onPress={isRecording ? stopRecording : startRecording}
          >
          <Animated.View
            style={[
              styles.recordButton,
              isRecording && styles.recordButtonActive,
              {
                transform: [{ scale: animatedOuterScale }],
              },
            ]}
          >
            <Animated.View
              style={[
                styles.recordButtonInner,
                isRecording && styles.recordButtonInnerRecording,
                {
                  borderRadius: animatedBorderRadius,
                  transform: [{ scale: animatedInnerScale }],
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
            ]}
          >
            <Icon
              name="camera-reverse-outline"
              size={20}
              color={colors.foreground}
            />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
