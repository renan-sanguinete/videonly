import React, { useCallback, useRef, useEffect, useMemo, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Camera, useCameraDevice } from 'react-native-vision-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PinchGestureHandler, State } from 'react-native-gesture-handler';

import {
  parseCameraNumber,
  pickFormatForSettings,
  pickHighFpsFormat,
} from '../../utils/cameraFormatUtils';
import { getAudioSourceOption } from '../../constants/audioSources';
import {
  AUDIO_PROFILE_OPTIONS,
  MAX_SAVED_AUDIO_PROFILES,
  getAudioRiskLevel,
} from '../../constants/audioProfiles';
import {
  SLOW_MOTION_DURATION_OPTIONS,
  getCaptureSettingsForRecordingMode,
  getRecordingModeOption,
} from '../../constants/recordingModes';
import {cinematicTheme} from '../../theme/cinematicTheme';
import ZoomRail from './ZoomRail';
import { formatElapsedTime } from '../../utils/videoFormatters';
import { clamp, getInitialZoomValue } from '../../utils/cameraZoom';
import { useCustomAlert } from '../../context/CustomAlertContext';
import { styles } from './styles';

const {colors} = cinematicTheme;
const PINCH_SENSITIVITY = 0.1;

function clampFpsToFormat(format, requestedFps) {
  if (!format || requestedFps === undefined) {
    return undefined;
  }

  const minFps = typeof format.minFps === 'number' ? format.minFps : requestedFps;
  const maxFps = typeof format.maxFps === 'number' ? format.maxFps : requestedFps;

  return Math.max(minFps, Math.min(requestedFps, maxFps));
}

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
  savedAudioProfiles = [],
  onSaveAudioProfile,
  onApplySavedAudioProfile,
  onReplaceSavedAudioProfile,
  onRenameSavedAudioProfile,
  onDeleteSavedAudioProfile,
  onSetAudioEnabled,
  isOptimizationMenuOpen,
  onSlowMotionDurationChange,
  onZoomCommit,
}) {
  const {showAlert} = useCustomAlert();
  const device = useCameraDevice(cameraPosition);
  const captureSettings = useMemo(
    () => getCaptureSettingsForRecordingMode(settings),
    [settings],
  );
  const [isAudioMenuOpen, setIsAudioMenuOpen] = useState(false);
  const [isCustomProfileMenuOpen, setIsCustomProfileMenuOpen] = useState(false);
  const [profileNameInput, setProfileNameInput] = useState('');
  const [profileNameError, setProfileNameError] = useState('');
  const [profileNameMode, setProfileNameMode] = useState('save');
  const [profileNameTargetId, setProfileNameTargetId] = useState(null);
  const [isProfileNameModalVisible, setIsProfileNameModalVisible] =
    useState(false);
  const [currentZoom, setCurrentZoom] = useState(() =>
    getInitialZoomValue(settings.zoom, null),
  );
  const currentZoomRef = useRef(currentZoom);
  const pinchStartZoomRef = useRef(currentZoom);
  const selectedFormat = useMemo(() => {
    if (captureSettings.recordingMode === 'slowMotion') {
      return pickHighFpsFormat(
        device?.formats ?? [],
        captureSettings.slowMotionTargetFps,
      );
    }

    return pickFormatForSettings(device?.formats ?? [], captureSettings);
  }, [captureSettings, device]);
  const effectiveFps = useMemo(() => {
    if (captureSettings.recordingMode === 'slowMotion') {
      return clampFpsToFormat(
        selectedFormat,
        parseCameraNumber(captureSettings.slowMotionTargetFps),
      );
    }

    return captureSettings.fps !== ''
      ? parseCameraNumber(captureSettings.fps)
      : undefined;
  }, [captureSettings, selectedFormat]);
  const currentRecordingMode = useMemo(
    () => getRecordingModeOption(settings.recordingMode),
    [settings.recordingMode],
  );
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 0);
  const topOverlayStyle = useMemo(
    () => [
      styles.topOverlay,
      { paddingTop: insets.top ? insets.top + 50 : 60 },
    ],
    [insets.top],
  );
  const controlsStyle = useMemo(
    () => [
      styles.controls,
      {bottom: 168 + bottomInset},
    ],
    [bottomInset],
  );
  const audioStatusStyle = useMemo(
    () => [
      styles.audioStatusWrap,
      {bottom: 238 + bottomInset},
    ],
    [bottomInset],
  );
  const audioQuickMenuStyle = useMemo(
    () => [
      styles.audioQuickMenu,
      {bottom: 48 + bottomInset},
    ],
    [bottomInset],
  );
  const progressNative = useRef(new Animated.Value(0)).current;
  const progressJS = useRef(new Animated.Value(0)).current;
  const recPulse = useRef(new Animated.Value(0)).current;

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

  useEffect(() => {
    let pulseAnimation;

    if (isRecording) {
      pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(recPulse, {
            toValue: 1,
            duration: 860,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(recPulse, {
            toValue: 0,
            duration: 860,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      );
      pulseAnimation.start();
    } else {
      recPulse.setValue(0);
    }

    return () => {
      pulseAnimation?.stop();
    };
  }, [isRecording, recPulse]);

  const recPulseStyle = {
    opacity: recPulse.interpolate({
      inputRange: [0, 1],
      outputRange: [0.65, 1],
    }),
    transform: [
      {
        scale: recPulse.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.55],
        }),
      },
    ],
  };

  useEffect(() => {
    setCurrentZoom(getInitialZoomValue(settings.zoom, device));
  }, [device, settings.zoom]);

  useEffect(() => {
    currentZoomRef.current = currentZoom;
    pinchStartZoomRef.current = currentZoom;
  }, [currentZoom]);

  const minZoom = device?.minZoom ?? 1;
  const maxZoom = device?.maxZoom ?? 1;

  const commitZoom = useCallback(
    nextZoom => {
      const clampedZoom = clamp(nextZoom, minZoom, maxZoom);
      currentZoomRef.current = clampedZoom;
      setCurrentZoom(clampedZoom);
      onZoomCommit?.(clampedZoom);
    },
    [maxZoom, minZoom, onZoomCommit],
  );

  const handlePinchGesture = useCallback(
    event => {
      if (!device || !settings.enableZoomGesture) {
        return;
      }

      const nextZoom = clamp(
        pinchStartZoomRef.current *
          Math.pow(event.nativeEvent.scale, PINCH_SENSITIVITY),
        minZoom,
        maxZoom,
      );
      currentZoomRef.current = nextZoom;
      setCurrentZoom(nextZoom);
    },
    [device, maxZoom, minZoom, settings.enableZoomGesture],
  );

  const handlePinchStateChange = useCallback(
    event => {
      if (!device || !settings.enableZoomGesture) {
        return;
      }

      const {state} = event.nativeEvent;
      if (state === State.BEGAN) {
        pinchStartZoomRef.current = currentZoomRef.current;
        return;
      }

      if (
        state === State.END ||
        state === State.CANCELLED ||
        state === State.FAILED
      ) {
        commitZoom(currentZoomRef.current);
      }
    },
    [commitZoom, device, settings.enableZoomGesture],
  );

  const cameraProps = useMemo(
    () => ({
      device,
      torch,
      isActive,
      audio: captureSettings.audio,
      audioChannels: captureSettings.audioChannels,
      audioSampleRate: parseCameraNumber(captureSettings.audioSampleRate),
      audioBitRateKbps: parseCameraNumber(captureSettings.audioBitRateKbps),
      audioGain: parseCameraNumber(captureSettings.audioGain),
      audioSource: parseCameraNumber(captureSettings.audioSource),
      video: true,
      preview: true,
      enableZoomGesture: false,
      resizeMode: captureSettings.resizeMode,
      zoom: currentZoom,
      exposure: parseCameraNumber(captureSettings.exposure),
      ...(device?.supportsLowLightBoost
        ? { lowLightBoost: captureSettings.lowLightBoost }
        : {}),
      ...(selectedFormat ? { format: selectedFormat } : {}),
      ...(selectedFormat ? { videoBitRate: captureSettings.videoBitRate } : {}),
      ...(selectedFormat && effectiveFps !== undefined ? {fps: effectiveFps} : {}),
      ...(selectedFormat?.supportsVideoHdr
        ? { videoHdr: captureSettings.videoHdr }
        : {}),
    }),
    [
      captureSettings,
      currentZoom,
      device,
      effectiveFps,
      isActive,
      selectedFormat,
      torch,
    ],
  );

  const fpsLabel = `FPS ${String(cameraProps?.fps ?? 'AUTO').toUpperCase()}`;
  const currentAudioSource = getAudioSourceOption(settings.audioSource);
  const audioRisk = getAudioRiskLevel(settings);
  const showAudioRiskWarning =
    isRecording && settings.audio && audioRisk.level === 'high';
  const quickAudioProfiles = useMemo(() => AUDIO_PROFILE_OPTIONS, []);
  const activeSavedAudioProfile = useMemo(
    () =>
      savedAudioProfiles.find(
        profile => profile.id === settings.audioCustomProfileId,
      ) ?? null,
    [savedAudioProfiles, settings.audioCustomProfileId],
  );
  const quickAudioProfileOptions = useMemo(
    () =>
      quickAudioProfiles.map(option =>
        option.value === 'custom' && activeSavedAudioProfile
          ? {
              ...option,
              label: activeSavedAudioProfile.name,
              description: 'Perfil personalizado salvo em uso.',
            }
          : option,
      ),
    [activeSavedAudioProfile, quickAudioProfiles],
  );
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
  const isSavedCustomProfile = Boolean(settings.audioCustomProfileId);
  const isUnsavedCustomProfile = isCustomProfile && !isSavedCustomProfile;
  const shouldShowSaveAudioProfileAction = isUnsavedCustomProfile;
  const shouldShowReplaceAudioProfileAction = isUnsavedCustomProfile;
  const canSaveMoreAudioProfiles =
    savedAudioProfiles.length < MAX_SAVED_AUDIO_PROFILES;

  const audioProfileButtonStyle = useMemo(() => {
    if (isCustomProfile) {
      return isSavedCustomProfile
        ? styles.audioProfileButtonSavedCustom
        : styles.audioProfileButtonCustom;
    }

    if (isLiveSafeProfile) {
      return styles.audioProfileButtonLive;
    }

    return null;
  }, [isCustomProfile, isLiveSafeProfile, isSavedCustomProfile]);

  const audioProfileIconColor = isSavedCustomProfile
    ? '#C4B5FD'
    : colors.foreground;

  useEffect(() => {
    if (isAudioControlDisabled && isAudioMenuOpen) {
      setIsAudioMenuOpen(false);
    }
  }, [isAudioMenuOpen, isAudioControlDisabled]);

  useEffect(() => {
    if (!isAudioMenuOpen) {
      setIsCustomProfileMenuOpen(false);
    }
  }, [isAudioMenuOpen]);

  const closeProfileNameModal = () => {
    setIsProfileNameModalVisible(false);
    setProfileNameInput('');
    setProfileNameError('');
    setProfileNameTargetId(null);
  };

  const openSaveProfileModal = () => {
    setProfileNameMode('save');
    setProfileNameInput('');
    setProfileNameError('');
    setProfileNameTargetId(null);
    setIsProfileNameModalVisible(true);
  };

  const openRenameProfileModal = profile => {
    setProfileNameMode('rename');
    setProfileNameInput(profile.name);
    setProfileNameError('');
    setProfileNameTargetId(profile.id);
    setIsProfileNameModalVisible(true);
  };

  const submitProfileName = () => {
    const nextName = profileNameInput.trim();

    if (!nextName) {
      setProfileNameError('Informe um nome para salvar o perfil.');
      return;
    }

    if (profileNameMode === 'rename') {
      onRenameSavedAudioProfile?.(profileNameTargetId, nextName);
    } else {
      onSaveAudioProfile?.(nextName);
    }

    closeProfileNameModal();
    setIsAudioMenuOpen(false);
  };

  const confirmReplaceSavedAudioProfile = profile => {
    showAlert(
      'Substituir perfil',
      `Deseja substituir "${profile.name}" pela configuração personalizada atual?`,
      [
        {text: 'Cancelar', style: 'cancel'},
        {
          text: 'Substituir',
          onPress: () => {
            onReplaceSavedAudioProfile?.(profile.id);
            setIsAudioMenuOpen(false);
          },
        },
      ],
      {cancelable: true},
    );
  };

  const confirmDeleteSavedAudioProfile = profile => {
    showAlert(
      'Apagar perfil',
      `Deseja apagar "${profile.name}"?`,
      [
        {text: 'Cancelar', style: 'cancel'},
        {
          text: 'Apagar',
          style: 'destructive',
          onPress: () => {
            onDeleteSavedAudioProfile?.(profile.id);
            setIsAudioMenuOpen(false);
          },
        },
      ],
      {cancelable: true},
    );
  };

  const renderCustomProfileMenu = () => (
    <>
      <Pressable
        onPress={() => setIsCustomProfileMenuOpen(false)}
        style={styles.audioQuickBackButton}
      >
        <Icon name="chevron-back" size={14} color={colors.mutedForeground} />
        <Text style={styles.audioQuickBackButtonText}>Perfis</Text>
      </Pressable>

      {shouldShowSaveAudioProfileAction ? (
        canSaveMoreAudioProfiles ? (
          <Pressable
            onPress={openSaveProfileModal}
            style={styles.audioQuickOption}
          >
            <Text style={styles.audioQuickOptionLabel}>Salvar configuração</Text>
            <Text style={styles.audioQuickOptionDescription}>
              Guarda os ajustes atuais como um novo perfil.
            </Text>
          </Pressable>
        ) : (
          <View style={styles.audioQuickOptionDisabled}>
            <Text style={styles.audioQuickOptionLabel}>Limite atingido</Text>
            <Text style={styles.audioQuickOptionDescription}>
              Substitua ou apague um perfil para salvar outro.
            </Text>
          </View>
        )
      ) : null}

      {savedAudioProfiles.length > 0 ? (
        savedAudioProfiles.map(profile => {
          const isSelected = profile.id === settings.audioCustomProfileId;

          return (
            <View
              key={profile.id}
              style={[
                styles.savedAudioProfileCard,
                isSelected && styles.savedAudioProfileCardSelected,
              ]}
            >
              <Pressable
                onPress={() => {
                  onApplySavedAudioProfile?.(profile.id);
                  setIsAudioMenuOpen(false);
                }}
                style={styles.savedAudioProfileMainAction}
              >
                <Text
                  style={[
                    styles.audioQuickOptionLabel,
                    isSelected && styles.audioQuickOptionLabelSelectedSaved,
                  ]}
                >
                  {profile.name}
                </Text>
                <Text style={styles.audioQuickOptionDescription}>
                  {isSelected ? 'Perfil ativo.' : 'Toque para usar este perfil.'}
                </Text>
              </Pressable>
              <View style={styles.savedAudioProfileActions}>
                {shouldShowReplaceAudioProfileAction ? (
                  <Pressable
                    onPress={() => confirmReplaceSavedAudioProfile(profile)}
                    style={styles.savedAudioProfileActionButton}
                  >
                    <Text style={styles.savedAudioProfileActionText}>
                      Substituir
                    </Text>
                  </Pressable>
                ) : null}
                <Pressable
                  onPress={() => openRenameProfileModal(profile)}
                  style={styles.savedAudioProfileActionButton}
                >
                  <Text style={styles.savedAudioProfileActionText}>Editar</Text>
                </Pressable>
                <Pressable
                  onPress={() => confirmDeleteSavedAudioProfile(profile)}
                  style={styles.savedAudioProfileActionButton}
                >
                  <Text style={styles.savedAudioProfileActionTextDanger}>
                    Apagar
                  </Text>
                </Pressable>
              </View>
            </View>
          );
        })
      ) : (
        <View style={styles.audioQuickEmptyState}>
          <Text style={styles.audioQuickOptionDescription}>
            Nenhum perfil salvo ainda.
          </Text>
        </View>
      )}
    </>
  );

  const renderAudioQuickMenuContent = () => {
    if (!settings.audio) {
      return audioToggleOptions.map(option => {
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
              isSelected && styles.audioQuickOptionSelectedStandard,
            ]}
          >
            <Text
              style={[
                styles.audioQuickOptionLabel,
                isSelected && styles.audioQuickOptionLabelSelectedStandard,
              ]}
            >
              {option.label}
            </Text>
            <Text style={styles.audioQuickOptionDescription}>
              {option.description}
            </Text>
          </Pressable>
        );
      });
    }

    if (isCustomProfileMenuOpen) {
      return renderCustomProfileMenu();
    }

    return quickAudioProfileOptions.map(option => {
      const isSelected = settings.audioProfile === option.value;

      return (
        <Pressable
          key={option.value}
          onPress={() => {
            if (option.value === 'custom') {
              setIsCustomProfileMenuOpen(true);
              return;
            }

            onApplyAudioProfile(option.value);
            setIsAudioMenuOpen(false);
          }}
          style={[
            styles.audioQuickOption,
            isSelected && getQuickOptionSelectedStyle(option.value),
          ]}
        >
          <Text
            style={[
              styles.audioQuickOptionLabel,
              isSelected && getQuickOptionSelectedLabelStyle(option.value),
            ]}
          >
            {option.label}
          </Text>
          <Text style={styles.audioQuickOptionDescription}>
            {option.description}
          </Text>
        </Pressable>
      );
    });
  };

  const getQuickOptionSelectedStyle = optionValue => {
    if (optionValue === 'custom') {
      if (isSavedCustomProfile) {
        return styles.audioQuickOptionSelectedSaved;
      }

      return styles.audioQuickOptionSelectedCustom;
    }

    if (optionValue === 'live-safe') {
      return styles.audioQuickOptionSelectedLive;
    }

    return styles.audioQuickOptionSelectedStandard;
  };

  const getQuickOptionSelectedLabelStyle = optionValue => {
    if (optionValue === 'custom') {
      if (isSavedCustomProfile) {
        return styles.audioQuickOptionLabelSelectedSaved;
      }

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
      <PinchGestureHandler
        enabled={Boolean(device && settings.enableZoomGesture)}
        onGestureEvent={handlePinchGesture}
        onHandlerStateChange={handlePinchStateChange}
      >
        <View style={StyleSheet.absoluteFill}>
          <Camera
            ref={camera}
            style={StyleSheet.absoluteFill}
            onError={onError}
            onInitialized={onInitialized}
            {...cameraProps}
          />
        </View>
      </PinchGestureHandler>
      <View style={topOverlayStyle}>
        {isRecording ? (
          <View style={styles.recordingStatus}>
            <View style={styles.badge}>
              <Animated.View style={[styles.recPulseDot, recPulseStyle]} />
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

      <ZoomRail
        device={device}
        visible={isRecording}
        zoom={currentZoom}
        onZoomChange={setCurrentZoom}
        onZoomCommit={onZoomCommit}
      />

      {isRecording && settings.showAudioStatus ? (
        <View style={audioStatusStyle}>
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

      <View style={controlsStyle}>
        {currentRecordingMode.indicatorLabel ? (
          <View style={styles.recordingModeIndicatorRow}>
            <View style={styles.recordingModeIndicator}>
              <Text style={styles.recordingModeIndicatorText}>
                {currentRecordingMode.indicatorLabel}
              </Text>
            </View>
            {settings.recordingMode === 'slowMotion' ? (
              <View style={styles.slowMotionDurationOptions}>
                {SLOW_MOTION_DURATION_OPTIONS.map(option => {
                  const isSelected =
                    settings.slowMotionMaxDurationMs === option.value;

                  return (
                    <Pressable
                      key={option.value}
                      onPress={() =>
                        onSlowMotionDurationChange?.(option.value)
                      }
                      style={[
                        styles.slowMotionDurationOption,
                        isSelected && styles.slowMotionDurationOptionSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.slowMotionDurationOptionText,
                          isSelected &&
                            styles.slowMotionDurationOptionTextSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
          </View>
        ) : null}
        <View style={styles.controlsRow}>
          <View style={styles.controlsSideSlot}>
            {!isRecording && isAudioMenuOpen ? (
              <View style={audioQuickMenuStyle}>
                <Text style={styles.audioQuickMenuTitle}>
                  {settings.audio ? 'Captação' : 'Áudio'}
                </Text>
                {renderAudioQuickMenuContent()}
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
                  color={audioProfileIconColor}
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
      <Modal
        animationType="fade"
        transparent
        visible={isProfileNameModalVisible}
        onRequestClose={closeProfileNameModal}
      >
        <View style={styles.profileNameModalBackdrop}>
          <View style={styles.profileNameModalCard}>
            <Text style={styles.profileNameModalTitle}>
              {profileNameMode === 'rename' ? 'Renomear perfil' : 'Salvar perfil'}
            </Text>
            <TextInput
              autoFocus
              maxLength={32}
              onChangeText={value => {
                setProfileNameInput(value);
                setProfileNameError('');
              }}
              placeholder="Nome do perfil"
              placeholderTextColor={colors.mutedForeground}
              style={styles.profileNameInput}
              value={profileNameInput}
            />
            {profileNameError ? (
              <Text style={styles.profileNameError}>{profileNameError}</Text>
            ) : null}
            <View style={styles.profileNameModalActions}>
              <Pressable
                onPress={closeProfileNameModal}
                style={styles.profileNameModalButton}
              >
                <Text style={styles.profileNameModalButtonText}>Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={submitProfileName}
                style={styles.profileNameModalButtonPrimary}
              >
                <Text style={styles.profileNameModalButtonPrimaryText}>
                  Salvar
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
