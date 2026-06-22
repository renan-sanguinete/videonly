import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Pressable, ScrollView, Text, View} from 'react-native';
import {useCameraDevice} from 'react-native-vision-camera';
import Icon from 'react-native-vector-icons/Ionicons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {
  Card,
  NumberField,
  OptionChips,
  SliderField,
  SectionTitle,
  ToggleRow,
} from '../../components/SettingRow/SettingRow';
import AudioSourcePicker from '../../components/AudioSourcePicker/AudioSourcePicker';
import {
  applyAudioProfile,
  getAudioProfileOptions,
  getAudioRiskLevel,
} from '../../constants/audioProfiles';
import {
  getAudioLimiterPresetOption,
  getAudioLimiterPresetOptions,
} from '../../constants/audioProcessing';
import {
  getMediaOptimizationModes,
  getMediaOptimizationPatch,
  getMediaOptimizationModeOption,
} from '../../constants/mediaOptimization';
import { useCameraSettings } from '../../context/CameraSettingsContext';
import { useCustomAlert } from '../../context/CustomAlertContext';
import {useProAccess} from '../../context/ProAccessContext';
import {useI18n} from '../../i18n/I18nContext';
import {SUPPORTED_LANGUAGES} from '../../i18n/translations';
import {
  getAudioSourceOption,
  UNPROCESSED_AUDIO_SOURCE,
} from '../../constants/audioSources';
import { pickFormatForSettings } from '../../utils/cameraFormatUtils';
import {
  clamp,
  formatZoomFactor,
  getZoomFromSliderProgress,
  getZoomSliderProgress,
} from '../../utils/cameraZoom';
import {buildVideoResolutionOptions} from '../../utils/videoResolutionOptions';
import {
  deleteVideoRecordingMetadata,
  exportVideoRecordingMetadata,
} from '../../utils/videoRecordingMetadata';
import {shareFile} from '../../utils/videoActions';
import {styles} from './styles';

const VIDEO_BIT_RATE_OPTIONS = [
  { labelKey: 'settings.bitRate.extraLow', value: 'extra-low' },
  { labelKey: 'settings.bitRate.low', value: 'low' },
  { labelKey: 'settings.bitRate.normal', value: 'normal' },
  { labelKey: 'settings.bitRate.high', value: 'high' },
  { labelKey: 'settings.bitRate.extraHigh', value: 'extra-high' },
];

const RESIZE_MODE_OPTIONS = [
  { labelKey: 'settings.resize.cover', value: 'cover' },
  { labelKey: 'settings.resize.contain', value: 'contain' },
];

const AUDIO_CHANNEL_OPTIONS = [
  { labelKey: 'settings.channel.stereo', value: 'stereo' },
  { labelKey: 'settings.channel.mono', value: 'mono' },
];

const AUDIO_CODEC_OPTIONS = [
  { label: 'AAC', value: 'aac' },
  { labelKey: 'settings.codec.mp3', value: 'mp3' },
];

const AUDIO_SAMPLE_RATE_OPTIONS = [
  { label: '32000 Hz', value: '32000' },
  { label: '44100 Hz', value: '44100' },
  { label: '48000 Hz', value: '48000' },
];

const AUDIO_GAIN_OPTIONS = [
  { labelKey: 'settings.gain.default', value: 0 },
  { labelKey: 'settings.gain.reduced', value: -6 },
  { labelKey: 'settings.gain.live', value: -9 },
  { labelKey: 'settings.gain.maxReduced', value: -12 },
];

const RECORD_FILE_TYPE_OPTIONS = [
  { label: 'mp4', value: 'mp4' },
  { label: 'mov', value: 'mov' },
];

const RECORD_VIDEO_CODEC_OPTIONS = [
  { label: 'h264', value: 'h264' },
  { label: 'h265', value: 'h265' },
];

function formatSignedExposure(value) {
  if (!Number.isFinite(value)) {
    return '0 EV';
  }

  const rounded = Math.round(value);
  return `${rounded > 0 ? '+' : ''}${rounded} EV`;
}

function getFpsRange(formats, settings) {
  const selectedFormat = pickFormatForSettings(formats, {
    ...settings,
    fps: '',
  });

  if (selectedFormat) {
    return {
      min: Math.round(selectedFormat.minFps ?? 1),
      max: Math.round(selectedFormat.maxFps ?? selectedFormat.minFps ?? 120),
    };
  }

  if (!Array.isArray(formats) || formats.length === 0) {
    return {min: 1, max: 120};
  }

  const min = Math.min(
    ...formats.map(format =>
      Number.isFinite(format.minFps) ? format.minFps : 1,
    ),
  );
  const max = Math.max(
    ...formats.map(format =>
      Number.isFinite(format.maxFps) ? format.maxFps : 120,
    ),
  );

  return {
    min: Math.max(1, Math.round(min)),
    max: Math.max(1, Math.round(max)),
  };
}

function getZoomRange(device) {
  return {
    min: Number.isFinite(device?.minZoom) ? device.minZoom : 1,
    max: Number.isFinite(device?.maxZoom) ? device.maxZoom : 1,
  };
}

function getExposureRange(device) {
  return {
    min: Number.isFinite(device?.minExposure) ? device.minExposure : -3,
    max: Number.isFinite(device?.maxExposure) ? device.maxExposure : 3,
  };
}

function localizeOptionLabels(options, t) {
  return options.map(option => ({
    ...option,
    label: option.labelKey ? t(option.labelKey) : option.label,
  }));
}

export default function SettingsScreen({navigation}) {
  const device = useCameraDevice('back');
  const { settings, setSettings, resetSettings } = useCameraSettings();
  const {showAlert} = useCustomAlert();
  const {
    billingError,
    buildChannel,
    canUseDebugOverride,
    debugProOverride,
    isBillingAvailable,
    isBillingLoading,
    isPro,
    productDetails,
    purchasePro,
    restorePurchase,
    setDebugProOverride,
  } = useProAccess();
  const {language, t} = useI18n();
  const [isExportingMetadata, setIsExportingMetadata] = useState(false);
  const insets = useSafeAreaInsets();
  const formats = useMemo(() => device?.formats ?? [], [device]);
  const resolutionOptions = useMemo(
    () => buildVideoResolutionOptions(t),
    [t],
  );
  const fpsRange = useMemo(
    () => getFpsRange(formats, settings),
    [formats, settings],
  );
  const zoomRange = useMemo(() => getZoomRange(device), [device]);
  const exposureRange = useMemo(() => getExposureRange(device), [device]);
  const fpsMode = settings.fps === '' ? 'auto' : 'manual';

  const update = useCallback(
    patch => setSettings(prev => ({ ...prev, ...patch })),
    [setSettings],
  );
  const languageOptions = useMemo(
    () =>
      SUPPORTED_LANGUAGES.map(optionLanguage => ({
        value: optionLanguage,
        label: t(`language.${optionLanguage === 'pt-BR' ? 'ptBR' : 'en'}`),
      })),
    [t],
  );
  const videoBitRateOptions = useMemo(
    () => localizeOptionLabels(VIDEO_BIT_RATE_OPTIONS, t),
    [t],
  );
  const resizeModeOptions = useMemo(
    () => localizeOptionLabels(RESIZE_MODE_OPTIONS, t),
    [t],
  );
  const audioChannelOptions = useMemo(
    () => localizeOptionLabels(AUDIO_CHANNEL_OPTIONS, t),
    [t],
  );
  const audioCodecOptions = useMemo(
    () => localizeOptionLabels(AUDIO_CODEC_OPTIONS, t),
    [t],
  );
  const audioGainOptions = useMemo(
    () => localizeOptionLabels(AUDIO_GAIN_OPTIONS, t),
    [t],
  );
  const audioProfileOptions = useMemo(() => getAudioProfileOptions(t), [t]);
  const audioLimiterPresetOptions = useMemo(
    () => getAudioLimiterPresetOptions(t),
    [t],
  );
  const mediaOptimizationModes = useMemo(
    () => getMediaOptimizationModes(t),
    [t],
  );
  const currentAudioSource = getAudioSourceOption(settings.audioSource, t);
  const audioRisk = getAudioRiskLevel(settings, t);
  const optimizationMode = getMediaOptimizationModeOption(
    settings.optimizationMode,
    t,
  );
  const limiterPreset = getAudioLimiterPresetOption(settings.audioLimiterPreset, t);
  const fpsSliderValue = settings.fps === '' ? '' : settings.fps;
  const zoomSliderValue =
    settings.zoom === ''
      ? String(device?.neutralZoom ?? zoomRange.min)
      : settings.zoom;
  const exposureSliderValue = settings.exposure === '' ? '0' : settings.exposure;

  const updateAudioSetting = patch =>
    setSettings(prev => ({
      ...prev,
      ...patch,
      audioProfile: 'custom',
      audioCustomProfileId: null,
    }));

  const onPurchasePro = useCallback(() => {
    purchasePro().then(purchased => {
      showAlert(
        purchased
          ? t('camera.pro.purchaseSuccessTitle')
          : t('camera.pro.purchasePendingTitle'),
        purchased
          ? t('camera.pro.purchaseSuccessMessage')
          : billingError ?? t('camera.pro.purchasePendingMessage'),
        [{text: t('common.ok')}],
      );
    });
  }, [billingError, purchasePro, showAlert, t]);

  const onRestorePurchase = useCallback(() => {
    restorePurchase().then(restored => {
      showAlert(
        restored
          ? t('camera.pro.restoreSuccessTitle')
          : t('camera.pro.restoreEmptyTitle'),
        restored
          ? t('camera.pro.restoreSuccessMessage')
          : billingError ?? t('camera.pro.restoreEmptyMessage'),
        [{text: t('common.ok')}],
      );
    });
  }, [billingError, restorePurchase, showAlert, t]);

  const showProLockedAlert = useCallback(
    featureKey => {
      showAlert(
        t('camera.proLocked.title'),
        t('camera.proLocked.message', {
          feature: t(featureKey),
        }),
        [
          {text: t('common.cancel'), style: 'cancel'},
          {
            text: t('camera.proLocked.unlock'),
            onPress: onPurchasePro,
          },
        ],
      );
    },
    [onPurchasePro, showAlert, t],
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

  const updateProAudioSetting = patch => {
    if (!ensurePro('camera.proLocked.advancedSettings')) {
      return;
    }

    updateAudioSetting(patch);
  };

  const onAudioProfileChange = value => {
    if (value !== 'standard' && !ensurePro('camera.proLocked.audioProfiles')) {
      return;
    }

    setSettings(prev => applyAudioProfile(prev, value));
  };

  const onOptimizationModeChange = value => {
    if (value !== 'none' && !ensurePro('camera.proLocked.optimization')) {
      return;
    }

    updateAudioSetting(getMediaOptimizationPatch(value));
  };

  const onAudioLimiterPresetChange = value => {
    updateAudioSetting({ audioLimiterPreset: value });
  };

  const onFpsModeChange = value => {
    if (value === 'auto') {
      update({fps: ''});
      return;
    }

    if (settings.fps === '') {
      const defaultFps = clamp(30, fpsRange.min, fpsRange.max);
      update({fps: String(defaultFps)});
    }
  };

  const onResetVisualControls = () => {
    update({
      fps: '',
      zoom: String(clamp(1, zoomRange.min, zoomRange.max)),
      exposure: String(clamp(0, exposureRange.min, exposureRange.max)),
    });
  };

  useEffect(() => {
    if (settings.fps === '') {
      return;
    }

    const currentValue = Number(settings.fps);
    if (!Number.isFinite(currentValue)) {
      return;
    }

    const nextValue = clamp(currentValue, fpsRange.min, fpsRange.max);
    if (nextValue !== currentValue) {
      update({fps: String(nextValue)});
    }
  }, [fpsRange.max, fpsRange.min, settings.fps, update]);

  useEffect(() => {
    const currentValue = Number(settings.zoom);
    if (!Number.isFinite(currentValue)) {
      return;
    }

    const nextValue = clamp(currentValue, zoomRange.min, zoomRange.max);
    if (nextValue !== currentValue) {
      update({zoom: String(nextValue)});
    }
  }, [settings.zoom, update, zoomRange.max, zoomRange.min]);

  useEffect(() => {
    const currentValue = Number(settings.exposure);
    if (!Number.isFinite(currentValue)) {
      return;
    }

    const nextValue = clamp(
      currentValue,
      exposureRange.min,
      exposureRange.max,
    );
    if (nextValue !== currentValue) {
      update({exposure: String(nextValue)});
    }
  }, [exposureRange.max, exposureRange.min, settings.exposure, update]);

  const onExportMetadata = useCallback(async () => {
    if (isExportingMetadata) {
      return;
    }

    setIsExportingMetadata(true);

    try {
      const result = await exportVideoRecordingMetadata();

      if (result.totalFiles === 0) {
        showAlert(
          t('settings.noMetadata.title'),
          t('settings.noMetadata.message'),
        );
        return;
      }

      await shareFile(
        result.exportPath,
        t('settings.exportMetadata'),
        'application/json',
      );
    } catch (error) {
      showAlert(
        t('settings.exportMetadata.errorTitle'),
        error?.message ?? t('settings.exportMetadata.errorMessage'),
      );
    } finally {
      setIsExportingMetadata(false);
    }
  }, [isExportingMetadata, showAlert, t]);

  const onDeleteMetadata = useCallback(() => {
    showAlert(
      t('settings.deleteMetadata.title'),
      t('settings.deleteMetadata.message'),
      [
        {text: t('common.cancel'), style: 'cancel'},
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            deleteVideoRecordingMetadata()
              .then(result => {
                showAlert(
                  t('settings.deleteMetadata.successTitle'),
                  result.deletedFiles > 0
                    ? t('settings.deleteMetadata.deleted', {
                        count: result.deletedFiles,
                        plural: result.deletedFiles > 1 ? 's' : '',
                        verb:
                          language === 'en'
                            ? result.deletedFiles > 1
                              ? 'were'
                              : 'was'
                            : result.deletedFiles > 1
                              ? 'foram'
                              : 'foi',
                      })
                    : t('settings.deleteMetadata.empty'),
                );
              })
              .catch(error => {
                showAlert(
                  t('settings.deleteMetadata.errorTitle'),
                  error?.message ?? t('settings.deleteMetadata.errorMessage'),
                );
              });
          },
        },
      ],
    );
  }, [language, showAlert, t]);

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.header,
          {paddingTop: Math.max(insets.top, 10)},
        ]}
      >
        <View style={styles.headerTopRow}>
          <Pressable
            accessibilityLabel={t('common.back')}
            hitSlop={10}
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Icon name="chevron-back" size={20} color="#FAF8F5" />
          </Pressable>
          <Text style={styles.headerEyebrow}>{t('settings.title')}</Text>
          <View style={styles.headerRightPlaceholder} />
        </View>
        <Text style={styles.subtitle}>
          {t('settings.subtitle')}
        </Text>
      </View>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.screenDivider} />
      <SectionTitle>{t('settings.section.capture')}</SectionTitle>
      <Card>
        <Text style={styles.label}>{t('settings.language.label')}</Text>
        <OptionChips
          value={settings.language}
          options={languageOptions}
          onChange={value => update({language: value})}
        />

        <View style={styles.sectionSpacer} />

        <ToggleRow
          label={t('settings.audio.enabled.label')}
          description={t('settings.audio.enabled.description')}
          value={settings.audio}
          onValueChange={value => update({ audio: value })}
        />
      </Card>

      <SectionTitle>{t('settings.pro.section')}</SectionTitle>
      <Card>
        <View style={styles.proHeaderRow}>
          <View style={styles.proTitleGroup}>
            <Text style={styles.proTitle}>{t('settings.pro.section')}</Text>
            <Text style={styles.helper}>
              {t('settings.pro.buildInfo', {channel: buildChannel})}
            </Text>
          </View>
          <View
            style={[
              styles.proStatusPill,
              isPro ? styles.proStatusPillActive : null,
            ]}
          >
            <Text
              style={[
                styles.proStatusText,
                isPro ? styles.proStatusTextActive : null,
              ]}
            >
              {isPro
                ? debugProOverride
                  ? t('settings.pro.statusDebug')
                  : t('settings.pro.statusPro')
                : t('settings.pro.statusFree')}
            </Text>
          </View>
        </View>
        <Text style={styles.proDescription}>{t('settings.pro.description')}</Text>
        <Text style={styles.proDescription}>{t('settings.pro.included')}</Text>
        <Text style={styles.proPriceText}>
          {productDetails?.price || t('settings.pro.priceFallback')}
        </Text>
        {!isBillingAvailable && !isPro ? (
          <Text style={styles.helper}>{t('settings.pro.unavailable')}</Text>
        ) : null}
        <View style={styles.actionRow}>
          <Pressable
            disabled={isPro || isBillingLoading}
            style={[
              styles.exportButton,
              (isPro || isBillingLoading) && styles.actionButtonDisabled,
            ]}
            onPress={onPurchasePro}
          >
            <Text style={styles.exportText}>
              {isBillingLoading
                ? t('settings.pro.processing')
                : t('settings.pro.unlock')}
            </Text>
          </Pressable>
          <Pressable
            disabled={isBillingLoading}
            style={[
              styles.inlineSecondaryButton,
              styles.proRestoreButton,
              isBillingLoading && styles.actionButtonDisabled,
            ]}
            onPress={onRestorePurchase}
          >
            <Text style={styles.inlineSecondaryText}>
              {t('settings.pro.restore')}
            </Text>
          </Pressable>
        </View>
        {canUseDebugOverride ? (
          <>
            <View style={styles.sectionSpacer} />
            <ToggleRow
              label={t('settings.pro.debugToggle.label')}
              description={t('settings.pro.debugToggle.description')}
              value={debugProOverride}
              onValueChange={setDebugProOverride}
            />
          </>
        ) : null}
      </Card>

      <SectionTitle>{t('settings.section.behavior')}</SectionTitle>
      <Card>
        <ToggleRow
          label={t('settings.zoomGesture.label')}
          description={t('settings.zoomGesture.description')}
          value={settings.enableZoomGesture}
          onValueChange={value => update({ enableZoomGesture: value })}
        />
        <ToggleRow
          label={t('settings.lowLightBoost.label')}
          description={t('settings.lowLightBoost.description')}
          value={settings.lowLightBoost}
          onValueChange={value => update({ lowLightBoost: value })}
        />
      </Card>

      <SectionTitle>{t('settings.section.format')}</SectionTitle>
      <Card>
        <Text style={styles.label}>{t('settings.resizeMode.label')}</Text>
        <OptionChips
          value={settings.resizeMode}
          options={resizeModeOptions}
          onChange={value => update({ resizeMode: value })}
        />

        <View style={styles.sectionSpacer} />

        <Text style={styles.label}>{t('settings.videoBitRate.label')}</Text>
        <OptionChips
          value={settings.videoBitRate}
          options={videoBitRateOptions}
          onChange={value => update({ videoBitRate: value })}
        />
      </Card>

      <SectionTitle>{t('settings.section.visualControls')}</SectionTitle>
      <Card>
        <Text style={styles.label}>{t('settings.fps.label')}</Text>
        <OptionChips
          value={fpsMode}
          options={[
            {label: t('common.automatic'), value: 'auto'},
            {label: t('common.manual'), value: 'manual'},
          ]}
          onChange={onFpsModeChange}
        />

        <View style={styles.sectionSpacer} />

        {fpsMode === 'manual' ? (
          <SliderField
            label={t('settings.fps.label')}
            value={fpsSliderValue}
            onValueChange={value => update({fps: value})}
            min={fpsRange.min}
            max={fpsRange.max}
            step={1}
            precision={0}
            formatValue={value => `${Math.round(value)} FPS`}
            minimumLabel={`${fpsRange.min} FPS`}
            maximumLabel={`${fpsRange.max} FPS`}
          />
        ) : null}

        <SliderField
          label={t('settings.zoom.label')}
          value={zoomSliderValue}
          onValueChange={value => update({zoom: value})}
          min={zoomRange.min}
          max={zoomRange.max}
          step={0.1}
          precision={2}
          formatValue={formatZoomFactor}
          minimumLabel={formatZoomFactor(zoomRange.min)}
          maximumLabel={formatZoomFactor(zoomRange.max)}
          progressFromValue={value => getZoomSliderProgress(value, device)}
          valueFromProgress={progress => getZoomFromSliderProgress(progress, device)}
        />

        <SliderField
          label={t('settings.exposure.label')}
          description={t('settings.exposure.description')}
          value={exposureSliderValue}
          onValueChange={value => update({exposure: value})}
          min={exposureRange.min}
          max={exposureRange.max}
          step={1}
          precision={0}
          formatValue={formatSignedExposure}
          minimumLabel={formatSignedExposure(exposureRange.min)}
          maximumLabel={formatSignedExposure(exposureRange.max)}
        />
        <Pressable
          style={styles.inlineSecondaryButton}
          onPress={onResetVisualControls}
        >
          <Text style={styles.inlineSecondaryText}>
            {t('settings.visualDefaults')}
          </Text>
        </Pressable>
      </Card>

      <SectionTitle>{t('settings.section.audio')}</SectionTitle>
      <Card>
        <View style={styles.sectionSpacer} />

        <Text style={styles.label}>{t('settings.optimize.label')}</Text>
        <OptionChips
          value={optimizationMode.value}
          options={mediaOptimizationModes}
          onChange={onOptimizationModeChange}
        />

        <View style={styles.sectionSpacer} />

        <Text style={styles.label}>{t('settings.captureSettings.label')}</Text>
        <OptionChips
          value={settings.audioProfile}
          options={audioProfileOptions}
          onChange={onAudioProfileChange}
        />

        <View style={styles.sectionSpacer} />

        <View
          style={[
            styles.audioStatusBox,
            audioRisk.level === 'high'
              ? styles.audioStatusBoxWarning
              : styles.audioStatusBoxSafe,
          ]}
        >
          <Text style={styles.audioStatusTitle}>{audioRisk.title}</Text>
          <Text style={styles.audioStatusText}>{audioRisk.description}</Text>
        </View>

        <View style={styles.sectionSpacer} />

        <Text style={styles.label}>{t('settings.audioCodec.label')}</Text>
        <OptionChips
          value={settings.audioCodec}
          options={audioCodecOptions}
          onChange={value => updateProAudioSetting({ audioCodec: value })}
        />

        <View style={styles.sectionSpacer} />

        <Text style={styles.label}>{t('settings.channels.label')}</Text>
        <OptionChips
          value={settings.audioChannels}
          options={audioChannelOptions}
          onChange={value => updateProAudioSetting({ audioChannels: value })}
        />

        <View style={styles.sectionSpacer} />

        <Text style={styles.label}>{t('settings.sampleRate.label')}</Text>
        <OptionChips
          value={settings.audioSampleRate}
          options={AUDIO_SAMPLE_RATE_OPTIONS}
          onChange={value => updateProAudioSetting({ audioSampleRate: value })}
        />

        <View style={styles.sectionSpacer} />

        <Text style={styles.label}>{t('settings.audioGain.label')}</Text>
        <OptionChips
          value={settings.audioGain}
          options={audioGainOptions}
          onChange={value => updateProAudioSetting({ audioGain: value })}
        />

        <View style={styles.sectionSpacer} />

        <NumberField
          label={t('settings.audioBitRate.label')}
          value={settings.audioBitRateKbps}
          onChangeText={text =>
            updateProAudioSetting({ audioBitRateKbps: text })
          }
          placeholder={t('settings.audioBitRate.placeholder')}
        />

        <View style={styles.sectionSpacer} />

        <ToggleRow
          label={t('settings.showAudioStatus.label')}
          description={t('settings.showAudioStatus.description')}
          value={settings.showAudioStatus}
          onValueChange={value =>
            updateProAudioSetting({ showAudioStatus: value })
          }
        />

        <View style={styles.sectionSpacer} />

        <ToggleRow
          label={t('settings.showVu.label')}
          description={t('settings.showVu.description')}
          value={settings.showAudioLevelMeter}
          onValueChange={value =>
            updateProAudioSetting({ showAudioLevelMeter: value })
          }
        />

        <View style={styles.sectionSpacer} />

        <ToggleRow
          label={t('settings.normalizeVolume.label')}
          description={t('settings.normalizeVolume.description')}
          value={settings.normalizeAudioLoudness}
          onValueChange={value =>
            updateProAudioSetting({ normalizeAudioLoudness: value })
          }
        />

        <View style={styles.sectionSpacer} />

        <Text style={styles.label}>{t('settings.limiter.label')}</Text>
        <OptionChips
          value={limiterPreset.value}
          options={audioLimiterPresetOptions}
          onChange={value => {
            if (!ensurePro('camera.proLocked.advancedSettings')) {
              return;
            }

            onAudioLimiterPresetChange(value);
          }}
        />

        <View style={styles.sectionSpacer} />

        <AudioSourcePicker
          selectedSource={settings.audioSource}
          onSourceChange={value => updateProAudioSetting({ audioSource: value })}
        />

        <View style={styles.sectionSpacer} />

        <View
          style={[
            styles.audioStatusBox,
            settings.audioSource === UNPROCESSED_AUDIO_SOURCE
              ? styles.audioStatusBoxSafe
              : styles.audioStatusBoxWarning,
          ]}
        >
          <Text style={styles.audioStatusTitle}>
            {t('settings.activeSource.title', {
              source: currentAudioSource.label,
            })}
          </Text>
          <Text style={styles.audioStatusText}>
            {settings.audioSource === UNPROCESSED_AUDIO_SOURCE
              ? t('settings.activeSource.safe')
              : t('settings.activeSource.warning')}
          </Text>
        </View>
        <View style={styles.sectionSpacer} />

        <View
          style={[
            styles.audioStatusBox,
            optimizationMode.value === 'none'
              ? styles.audioStatusBoxSafe
              : styles.audioStatusBoxWarning,
          ]}
        >
          <Text style={styles.audioStatusTitle}>
            {t('settings.optimization.title', {
              mode: optimizationMode.label,
            })}
          </Text>
          <Text style={styles.audioStatusText}>
            {optimizationMode.description}
          </Text>
        </View>
      </Card>

      <SectionTitle>{t('settings.section.recording')}</SectionTitle>
      <Card>
        <View style={styles.sectionSpacer} />

        <Text style={styles.label}>{t('settings.videoResolution.label')}</Text>
        <OptionChips
          value={settings.videoResolutionPreset}
          options={resolutionOptions}
          onChange={value =>
            value === '2k' || value === '4k'
              ? ensurePro('camera.proLocked.highResolution') &&
                update({ videoResolutionPreset: value, formatIndex: '' })
              : update({ videoResolutionPreset: value, formatIndex: '' })
          }
        />

        <View style={styles.sectionSpacer} />

        <Text style={styles.label}>{t('settings.fileFormat.label')}</Text>
        <OptionChips
          value={settings.recordFileType}
          options={RECORD_FILE_TYPE_OPTIONS}
          onChange={value => update({ recordFileType: value })}
        />

        <View style={styles.sectionSpacer} />

        <Text style={styles.label}>{t('settings.videoCodec.label')}</Text>
        <OptionChips
          value={settings.recordVideoCodec}
          options={RECORD_VIDEO_CODEC_OPTIONS}
          onChange={value =>
            value === 'h265'
              ? ensurePro('camera.proLocked.advancedSettings') &&
                update({ recordVideoCodec: value })
              : update({ recordVideoCodec: value })
          }
        />
      </Card>

      <SectionTitle>{t('settings.section.additional')}</SectionTitle>
      <Card>
        <View style={styles.actionRow}>
          <Pressable
            disabled={isExportingMetadata}
            style={styles.exportButton}
            onPress={onExportMetadata}
          >
            <Text style={styles.exportText}>
              {isExportingMetadata
                ? t('settings.exporting')
                : t('settings.exportMetadata')}
            </Text>
          </Pressable>
          <Pressable
            style={styles.destructiveButton}
            onPress={onDeleteMetadata}
          >
            <Text style={styles.destructiveText}>
              {t('settings.deleteMetadata')}
            </Text>
          </Pressable>
        </View>
        <Pressable
          style={styles.secondaryActionButton}
          onPress={resetSettings}
        >
          <Text style={styles.secondaryActionText}>
            {t('settings.restoreDefaults')}
          </Text>
        </Pressable>
      </Card>

      <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}
