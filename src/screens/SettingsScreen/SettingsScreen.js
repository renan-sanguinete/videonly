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
  AUDIO_PROFILE_OPTIONS,
  applyAudioProfile,
  getAudioRiskLevel,
} from '../../constants/audioProfiles';
import {
  AUDIO_LIMITER_PRESET_OPTIONS,
  getAudioLimiterPresetOption,
} from '../../constants/audioProcessing';
import {
  MEDIA_OPTIMIZATION_MODES,
  applyMediaOptimizationMode,
  getMediaOptimizationModeOption,
} from '../../constants/mediaOptimization';
import { useCameraSettings } from '../../context/CameraSettingsContext';
import { useCustomAlert } from '../../context/CustomAlertContext';
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
  { label: 'extra-low', value: 'extra-low' },
  { label: 'low', value: 'low' },
  { label: 'normal', value: 'normal' },
  { label: 'high', value: 'high' },
  { label: 'extra-high', value: 'extra-high' },
];

const RESIZE_MODE_OPTIONS = [
  { label: 'cover', value: 'cover' },
  { label: 'contain', value: 'contain' },
];

const AUDIO_CHANNEL_OPTIONS = [
  { label: 'Stereo (2 canais)', value: 'stereo' },
  { label: 'Mono (1 canal)', value: 'mono' },
];

const AUDIO_CODEC_OPTIONS = [
  { label: 'AAC', value: 'aac' },
  { label: 'MP3 (fallback AAC no Android)', value: 'mp3' },
];

const AUDIO_SAMPLE_RATE_OPTIONS = [
  { label: '32000 Hz', value: '32000' },
  { label: '44100 Hz', value: '44100' },
  { label: '48000 Hz', value: '48000' },
];

const AUDIO_GAIN_OPTIONS = [
  { label: 'Padrao (0 dB)', value: 0 },
  { label: 'Reduzido (-6 dB)', value: -6 },
  { label: 'Show ao vivo (-9 dB)', value: -9 },
  { label: 'Maximo reduzido (-12 dB)', value: -12 },
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

export default function SettingsScreen({navigation}) {
  const device = useCameraDevice('back');
  const { settings, setSettings, resetSettings } = useCameraSettings();
  const {showAlert} = useCustomAlert();
  const [isExportingMetadata, setIsExportingMetadata] = useState(false);
  const insets = useSafeAreaInsets();
  const formats = useMemo(() => device?.formats ?? [], [device]);
  const resolutionOptions = useMemo(
    () => buildVideoResolutionOptions(formats),
    [formats],
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
  const currentAudioSource = getAudioSourceOption(settings.audioSource);
  const audioRisk = getAudioRiskLevel(settings);
  const optimizationMode = getMediaOptimizationModeOption(
    settings.optimizationMode,
  );
  const limiterPreset = getAudioLimiterPresetOption(settings.audioLimiterPreset);
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
    }));

  const onAudioProfileChange = value => {
    setSettings(prev => applyAudioProfile(prev, value));
  };

  const onOptimizationModeChange = value => {
    setSettings(prev => ({
      ...applyMediaOptimizationMode(prev, value),
      audioProfile: prev.audioProfile,
    }));
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
          'Sem metadados',
          'Ainda não há arquivos de metadados salvos para exportar.',
        );
        return;
      }

      await shareFile(
        result.exportPath,
        'Exportar metadados',
        'application/json',
      );
    } catch (error) {
      showAlert(
        'Erro ao exportar metadados',
        error?.message ?? 'Nao foi possivel gerar o arquivo de exportacao.',
      );
    } finally {
      setIsExportingMetadata(false);
    }
  }, [isExportingMetadata, showAlert]);

  const onDeleteMetadata = useCallback(() => {
    showAlert(
      'Apagar metadados',
      'Isso vai excluir todos os arquivos de metadados salvos no aparelho. Deseja continuar?',
      [
        {text: 'Cancelar', style: 'cancel'},
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => {
            deleteVideoRecordingMetadata()
              .then(result => {
                showAlert(
                  'Metadados apagados',
                  result.deletedFiles > 0
                    ? `${result.deletedFiles} arquivo${result.deletedFiles > 1 ? 's' : ''} de metadados foram excluído${result.deletedFiles > 1 ? 's' : ''}.`
                    : 'Não havia arquivos de metadados para excluir.',
                );
              })
              .catch(error => {
                showAlert(
                  'Erro ao apagar metadados',
                  error?.message ?? 'Nao foi possivel excluir os metadados.',
                );
              });
          },
        },
      ],
    );
  }, [showAlert]);

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
            accessibilityLabel="Voltar"
            hitSlop={10}
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Icon name="chevron-back" size={20} color="#FAF8F5" />
          </Pressable>
          <Text style={styles.headerEyebrow}>Configurações</Text>
          <View style={{width: 34}} />
        </View>
        <Text style={styles.subtitle}>
          Ajuste o comportamento de captura, os perfis de áudio e os formatos de gravação.
        </Text>
      </View>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.screenDivider} />
      <SectionTitle>Captura</SectionTitle>
      <Card>
        <ToggleRow
          label="Áudio"
          description="Habilita gravação com áudio. Exige permissão de microfone."
          value={settings.audio}
          onValueChange={value => update({ audio: value })}
        />
      </Card>

      <SectionTitle>Interação e comportamento</SectionTitle>
      <Card>
        <ToggleRow
          label="Zoom por gesto"
          description="Ativa o pinch-to-zoom."
          value={settings.enableZoomGesture}
          onValueChange={value => update({ enableZoomGesture: value })}
        />
        <ToggleRow
          label="Low light boost"
          description="Pode ajudar em ambientes escuros."
          value={settings.lowLightBoost}
          onValueChange={value => update({ lowLightBoost: value })}
        />
      </Card>

      <SectionTitle>Formato e imagem</SectionTitle>
      <Card>
        <Text style={styles.label}>Resize mode</Text>
        <OptionChips
          value={settings.resizeMode}
          options={RESIZE_MODE_OPTIONS}
          onChange={value => update({ resizeMode: value })}
        />

        <View style={styles.sectionSpacer} />

        <Text style={styles.label}>Vídeo bit rate</Text>
        <OptionChips
          value={settings.videoBitRate}
          options={VIDEO_BIT_RATE_OPTIONS}
          onChange={value => update({ videoBitRate: value })}
        />
      </Card>

      <SectionTitle>Controles visuais</SectionTitle>
      <Card>
        <Text style={styles.label}>FPS</Text>
        <OptionChips
          value={fpsMode}
          options={[
            {label: 'Auto', value: 'auto'},
            {label: 'Manual', value: 'manual'},
          ]}
          onChange={onFpsModeChange}
        />

        <View style={styles.sectionSpacer} />

        {fpsMode === 'manual' ? (
          <SliderField
            label="FPS"
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
          label="Zoom"
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
          label="Exposure"
          description="Padrão: 0 EV"
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
      </Card>

      <SectionTitle>Áudio</SectionTitle>
      <Card>
        <View style={styles.sectionSpacer} />

        <Text style={styles.label}>Otimizar</Text>
        <OptionChips
          value={optimizationMode.value}
          options={MEDIA_OPTIMIZATION_MODES}
          onChange={onOptimizationModeChange}
        />

        <View style={styles.sectionSpacer} />

        <Text style={styles.label}>Configurações de Captação</Text>
        <OptionChips
          value={settings.audioProfile}
          options={AUDIO_PROFILE_OPTIONS}
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

        <Text style={styles.label}>Codec de áudio</Text>
        <OptionChips
          value={settings.audioCodec}
          options={AUDIO_CODEC_OPTIONS}
          onChange={value => updateAudioSetting({ audioCodec: value })}
        />

        <View style={styles.sectionSpacer} />

        <Text style={styles.label}>Canais</Text>
        <OptionChips
          value={settings.audioChannels}
          options={AUDIO_CHANNEL_OPTIONS}
          onChange={value => updateAudioSetting({ audioChannels: value })}
        />

        <View style={styles.sectionSpacer} />

        <Text style={styles.label}>Sample rate</Text>
        <OptionChips
          value={settings.audioSampleRate}
          options={AUDIO_SAMPLE_RATE_OPTIONS}
          onChange={value => updateAudioSetting({ audioSampleRate: value })}
        />

        <View style={styles.sectionSpacer} />

        <Text style={styles.label}>Ganho de áudio</Text>
        <OptionChips
          value={settings.audioGain}
          options={AUDIO_GAIN_OPTIONS}
          onChange={value => updateAudioSetting({ audioGain: value })}
        />

        <View style={styles.sectionSpacer} />

        <NumberField
          label="Bitrate de audio (kbps)"
          value={settings.audioBitRateKbps}
          onChangeText={text => updateAudioSetting({ audioBitRateKbps: text })}
          placeholder="ex.: 128"
        />

        <View style={styles.sectionSpacer} />

        <ToggleRow
          label="Mostrar status de áudio"
          description="Exibe durante a gravação o banner com a fonte de áudio e risco de processamento."
          value={settings.showAudioStatus}
          onValueChange={value =>
            updateAudioSetting({ showAudioStatus: value })
          }
        />

        <View style={styles.sectionSpacer} />

        <ToggleRow
          label="Mostrar barra VU"
          description="Exibe, antes e durante a gravação, uma barra de nível de áudio na parte inferior da tela."
          value={settings.showAudioLevelMeter}
          onValueChange={value =>
            updateAudioSetting({ showAudioLevelMeter: value })
          }
        />

        <View style={styles.sectionSpacer} />

        <ToggleRow
          label="Normalizar loudness"
          description="Ajusta o volume ao salvar com base na análise do áudio gravado."
          value={settings.normalizeAudioLoudness}
          onValueChange={value =>
            updateAudioSetting({ normalizeAudioLoudness: value })
          }
        />

        <View style={styles.sectionSpacer} />

        <Text style={styles.label}>Limiter</Text>
        <OptionChips
          value={limiterPreset.value}
          options={AUDIO_LIMITER_PRESET_OPTIONS}
          onChange={onAudioLimiterPresetChange}
        />

        <View style={styles.sectionSpacer} />

        <AudioSourcePicker
          selectedSource={settings.audioSource}
          onSourceChange={value => updateAudioSetting({ audioSource: value })}
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
            Fonte ativa: {currentAudioSource.label}
          </Text>
          <Text style={styles.audioStatusText}>
            {settings.audioSource === UNPROCESSED_AUDIO_SOURCE
              ? 'Modo recomendado para reduzir distorções e preservar dinâmica em ambientes com muito volume.'
              : 'Esta fonte pode aplicar processamento automático. Em shows e baladas, isso aumenta o risco de distorção e som abafado.'}
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
            Otimização: {optimizationMode.label}
          </Text>
          <Text style={styles.audioStatusText}>
            {optimizationMode.description}
          </Text>
        </View>
      </Card>

      <SectionTitle>Gravação</SectionTitle>
      <Card>
        <View style={styles.sectionSpacer} />

        <Text style={styles.label}>Resolução de vídeo</Text>
        <OptionChips
          value={settings.videoResolutionPreset}
          options={resolutionOptions}
          onChange={value =>
            update({ videoResolutionPreset: value, formatIndex: '' })
          }
        />

        <View style={styles.sectionSpacer} />

        <Text style={styles.label}>Formato do arquivo</Text>
        <OptionChips
          value={settings.recordFileType}
          options={RECORD_FILE_TYPE_OPTIONS}
          onChange={value => update({ recordFileType: value })}
        />

        <View style={styles.sectionSpacer} />

        <Text style={styles.label}>Codec de vídeo</Text>
        <OptionChips
          value={settings.recordVideoCodec}
          options={RECORD_VIDEO_CODEC_OPTIONS}
          onChange={value => update({ recordVideoCodec: value })}
        />
      </Card>

      <SectionTitle>Opções adicionais</SectionTitle>
      <Card>
        <View style={styles.actionRow}>
          <Pressable
            disabled={isExportingMetadata}
            style={styles.exportButton}
            onPress={onExportMetadata}
          >
            <Text style={styles.exportText}>
              {isExportingMetadata
                ? 'Exportando...'
                : 'Exportar metadados'}
            </Text>
          </Pressable>
          <Pressable
            style={styles.destructiveButton}
            onPress={onDeleteMetadata}
          >
            <Text style={styles.destructiveText}>Apagar metadados</Text>
          </Pressable>
        </View>
        <Pressable
          style={styles.secondaryActionButton}
          onPress={resetSettings}
        >
          <Text style={styles.secondaryActionText}>Restaurar padrões</Text>
        </Pressable>
      </Card>

      <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}
