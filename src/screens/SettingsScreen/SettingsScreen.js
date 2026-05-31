import React, {useCallback, useMemo, useState} from 'react';
import {Pressable, ScrollView, Text, View} from 'react-native';
import { useCameraDevice } from 'react-native-vision-camera';

import {
  Card,
  NumberField,
  OptionChips,
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
import {exportVideoRecordingMetadata} from '../../utils/videoRecordingMetadata';
import {shareFile} from '../../utils/videoActions';
import { styles } from './styles';

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

function buildResolutionOptions(formats) {
  const heights = new Set(
    (formats || []).map(format => format.videoHeight).filter(Boolean),
  );
  const options = [{ label: 'Auto', value: 'auto' }];

  if (heights.has(480)) {
    options.push({ label: '480p', value: '480p' });
  }
  if (heights.has(720)) {
    options.push({ label: '720p', value: '720p' });
  }
  if (heights.has(1080)) {
    options.push({ label: '1080p', value: '1080p' });
  }
  if (heights.has(1440)) {
    options.push({ label: '2K', value: '2k' });
  }
  if (heights.has(2160)) {
    options.push({ label: '4K', value: '4k' });
  }

  return options;
}

export default function SettingsScreen() {
  const device = useCameraDevice('back');
  const { settings, setSettings, resetSettings } = useCameraSettings();
  const {showAlert} = useCustomAlert();
  const [isExportingMetadata, setIsExportingMetadata] = useState(false);
  const formats = useMemo(() => device?.formats ?? [], [device]);
  const resolutionOptions = useMemo(
    () => buildResolutionOptions(formats),
    [formats],
  );

  const update = patch => setSettings(prev => ({ ...prev, ...patch }));
  const currentAudioSource = getAudioSourceOption(settings.audioSource);
  const audioRisk = getAudioRiskLevel(settings);
  const optimizationMode = getMediaOptimizationModeOption(
    settings.optimizationMode,
  );
  const limiterPreset = getAudioLimiterPresetOption(settings.audioLimiterPreset);

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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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

      <SectionTitle>Valores numéricos</SectionTitle>
      <Card>
        <NumberField
          label="FPS"
          value={settings.fps}
          onChangeText={text => update({ fps: text })}
          placeholder="ex.: 30"
        />
        <NumberField
          label="Zoom"
          value={settings.zoom}
          onChangeText={text => update({ zoom: text })}
          placeholder="ex.: 1"
        />
        <NumberField
          label="Exposure"
          value={settings.exposure}
          onChangeText={text => update({ exposure: text })}
          placeholder="ex.: 0"
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
        <Pressable
          disabled={isExportingMetadata}
          style={styles.exportButton}
          onPress={onExportMetadata}
        >
          <Text style={styles.exportText}>
            {isExportingMetadata ? 'Exportando...' : 'Exportar metadados'}
          </Text>
        </Pressable>
        <Pressable style={styles.resetButton} onPress={resetSettings}>
          <Text style={styles.resetText}>Restaurar padrões</Text>
        </Pressable>
      </Card>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}
