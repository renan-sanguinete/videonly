import React, {useMemo} from 'react';
import {FlatList, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {useCameraDevice} from 'react-native-vision-camera';

import {
  Card,
  NumberField,
  OptionChips,
  SectionTitle,
  ToggleRow,
} from '../components/SettingRow';
import {useCameraSettings} from '../context/CameraSettingsContext';

const VIDEO_BIT_RATE_OPTIONS = [
  {label: 'extra-low', value: 'extra-low'},
  {label: 'low', value: 'low'},
  {label: 'normal', value: 'normal'},
  {label: 'high', value: 'high'},
  {label: 'extra-high', value: 'extra-high'},
];

const PHOTO_BALANCE_OPTIONS = [
  {label: 'speed', value: 'speed'},
  {label: 'balanced', value: 'balanced'},
  {label: 'quality', value: 'quality'},
];

const RESIZE_MODE_OPTIONS = [
  {label: 'cover', value: 'cover'},
  {label: 'contain', value: 'contain'},
];

const TORCH_OPTIONS = [
  {label: 'off', value: 'off'},
  {label: 'on', value: 'on'},
];

const RECORD_FILE_TYPE_OPTIONS = [
  {label: 'mp4', value: 'mp4'},
  {label: 'mov', value: 'mov'},
];

const RECORD_VIDEO_CODEC_OPTIONS = [
  {label: 'h264', value: 'h264'},
  {label: 'h265', value: 'h265'},
];

export default function SettingsScreen() {
  const device = useCameraDevice('back');
  const {settings, setSettings, resetSettings} = useCameraSettings();

  const formats = device?.formats ?? [];

  const selectedFormatIndex = useMemo(() => {
    const index = settings.formatIndex === '' ? undefined : Number(settings.formatIndex);
    if (index === undefined || Number.isNaN(index)) {
      return '';
    }
    return index;
  }, [settings.formatIndex]);

  const update = patch => setSettings(prev => ({...prev, ...patch}));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Configurações da câmera</Text>
      <Text style={styles.subtitle}>
        Os ajustes abaixo alimentam os CameraProps da VisionCamera e já ficam prontos para o uso no preview e na gravação.
      </Text>

      <SectionTitle>Captura</SectionTitle>
      <Card>
        <ToggleRow
          label="Vídeo"
          description="Habilita gravação com startRecording()."
          value={settings.video}
          onValueChange={value => update({video: value})}
        />
        <ToggleRow
          label="Áudio"
          description="Habilita gravação com áudio. Exige permissão de microfone."
          value={settings.audio}
          onValueChange={value => update({audio: value})}
        />
        <ToggleRow
          label="Foto"
          description="Deixa o modo de foto disponível."
          value={settings.photo}
          onValueChange={value => update({photo: value})}
        />
        <ToggleRow
          label="Preview"
          description="Mostra o preview da câmera."
          value={settings.preview}
          onValueChange={value => update({preview: value})}
        />
      </Card>

      <SectionTitle>Interação e comportamento</SectionTitle>
      <Card>
        <ToggleRow
          label="Zoom por gesto"
          description="Ativa o pinch-to-zoom nativo."
          value={settings.enableZoomGesture}
          onValueChange={value => update({enableZoomGesture: value})}
        />
        <ToggleRow
          label="Low light boost"
          description="Pode ajudar em ambientes escuros, dependendo do aparelho."
          value={settings.lowLightBoost}
          onValueChange={value => update({lowLightBoost: value})}
        />
      </Card>

      <SectionTitle>Formato e imagem</SectionTitle>
      <Card>
        <Text style={styles.label}>Resize mode</Text>
        <OptionChips
          value={settings.resizeMode}
          options={RESIZE_MODE_OPTIONS}
          onChange={value => update({resizeMode: value})}
        />

        <View style={{height: 14}} />

        <Text style={styles.label}>Torch</Text>
        <OptionChips
          value={settings.torch}
          options={TORCH_OPTIONS}
          onChange={value => update({torch: value})}
        />

        <View style={{height: 14}} />

        <Text style={styles.label}>Video bit rate</Text>
        <OptionChips
          value={settings.videoBitRate}
          options={VIDEO_BIT_RATE_OPTIONS}
          onChange={value => update({videoBitRate: value})}
        />

        <View style={{height: 14}} />

        <Text style={styles.label}>Photo quality balance</Text>
        <OptionChips
          value={settings.photoQualityBalance}
          options={PHOTO_BALANCE_OPTIONS}
          onChange={value => update({photoQualityBalance: value})}
        />
      </Card>

      <SectionTitle>Valores numéricos</SectionTitle>
      <Card>
        <NumberField
          label="FPS"
          value={settings.fps}
          onChangeText={text => update({fps: text})}
          placeholder="ex.: 30"
        />
        <NumberField
          label="Zoom"
          value={settings.zoom}
          onChangeText={text => update({zoom: text})}
          placeholder="ex.: 1"
        />
        <NumberField
          label="Exposure"
          value={settings.exposure}
          onChangeText={text => update({exposure: text})}
          placeholder="ex.: 0"
        />
      </Card>

      <SectionTitle>Gravação</SectionTitle>
      <Card>
        <Text style={styles.helper}>
          No Android atual, a VisionCamera permite controlar áudio ligado/desligado, formato do arquivo e codec de vídeo.
        </Text>
        <View style={{height: 14}} />

        <Text style={styles.label}>Formato do arquivo</Text>
        <OptionChips
          value={settings.recordFileType}
          options={RECORD_FILE_TYPE_OPTIONS}
          onChange={value => update({recordFileType: value})}
        />

        <View style={{height: 14}} />

        <Text style={styles.label}>Codec de vídeo</Text>
        <OptionChips
          value={settings.recordVideoCodec}
          options={RECORD_VIDEO_CODEC_OPTIONS}
          onChange={value => update({recordVideoCodec: value})}
        />
      </Card>

      <SectionTitle>Formato do dispositivo</SectionTitle>
      <Card>
        <Text style={styles.helper}>
          {device
            ? `Dispositivo encontrado: ${device.position} · ${formats.length} formatos disponíveis`
            : 'Buscando dispositivo traseiro...'}
        </Text>

        {formats.length > 0 ? (
          <FlatList
            data={formats}
            keyExtractor={(_, index) => String(index)}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{gap: 10, paddingVertical: 10}}
            renderItem={({item, index}) => {
              const active = selectedFormatIndex === index;
              const label = `${item.photoHeight ?? item.videoHeight ?? '?'}p · ${item.maxFps ?? item.minFps ?? '?'} FPS`;
              return (
                <Pressable
                  onPress={() => update({formatIndex: String(index)})}
                  style={[styles.formatChip, active && styles.formatChipActive]}>
                  <Text style={[styles.formatTitle, active && styles.formatTitleActive]}>
                    {label}
                  </Text>
                  <Text style={styles.formatMeta}>
                    {item.supportsVideoHdr ? 'HDR vídeo' : 'SDR'} · {item.supportsPhotoHdr ? 'HDR foto' : 'foto SDR'}
                  </Text>
                </Pressable>
              );
            }}
          />
        ) : (
          <Text style={styles.helper}>Sem formatos detectados.</Text>
        )}

        <Pressable style={styles.resetButton} onPress={resetSettings}>
          <Text style={styles.resetText}>Restaurar padrões</Text>
        </Pressable>
      </Card>

      <View style={{height: 24}} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#0b1020'},
  content: {padding: 16},
  title: {color: '#fff', fontSize: 26, fontWeight: '800'},
  subtitle: {color: '#cbd5e1', marginTop: 8, marginBottom: 10, lineHeight: 20},
  label: {color: '#f9fafb', fontSize: 15, fontWeight: '700', marginBottom: 10},
  helper: {color: '#9ca3af', fontSize: 12, lineHeight: 18},
  formatChip: {
    width: 170,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 12,
    backgroundColor: '#0f172a',
    marginRight: 10,
  },
  formatChipActive: {
    backgroundColor: '#1d4ed8',
    borderColor: '#1d4ed8',
  },
  formatTitle: {color: '#fff', fontWeight: '700', marginBottom: 4},
  formatTitleActive: {color: '#fff'},
  formatMeta: {color: '#cbd5e1', fontSize: 12},
  resetButton: {
    marginTop: 14,
    alignSelf: 'flex-start',
    backgroundColor: '#1f2937',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
  resetText: {color: '#fff', fontWeight: '700'},
});
