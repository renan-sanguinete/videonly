# Project Context: Videonly

**Generated:** 2026-03-28T20:09:13.595Z  
**Total Files:** 2  
**Total Size:** 13.59 KB

## Project Structure

```
src
└── screens
    └── CameraScreen.js
package.json
```

## Files

### package.json

**Language:** json  
**Size:** 1.45 KB  
**Last Modified:** 2026-03-28T19:37:31.359Z

```json
{
  "name": "Videonly",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "android": "react-native run-android",
    "ios": "react-native run-ios",
    "lint": "eslint .",
    "start": "react-native start",
    "test": "jest"
  },
  "dependencies": {
    "@react-native-camera-roll/camera-roll": "7.10.2",
    "@react-native/new-app-screen": "0.84.1",
    "@react-navigation/native": "^7.2.2",
    "@react-navigation/native-stack": "^7.14.10",
    "react": "19.2.3",
    "react-native": "0.84.1",
    "react-native-fs": "^2.20.0",
    "react-native-gesture-handler": "^2.30.1",
    "react-native-safe-area-context": "^5.7.0",
    "react-native-screens": "^4.24.0",
    "react-native-vision-camera": "^4.7.3"
  },
  "devDependencies": {
    "@babel/core": "^7.25.2",
    "@babel/preset-env": "^7.25.3",
    "@babel/runtime": "^7.25.0",
    "@react-native-community/cli": "20.1.0",
    "@react-native-community/cli-platform-android": "20.1.0",
    "@react-native-community/cli-platform-ios": "20.1.0",
    "@react-native/babel-preset": "0.84.1",
    "@react-native/eslint-config": "0.84.1",
    "@react-native/metro-config": "0.84.1",
    "@react-native/typescript-config": "0.84.1",
    "@types/jest": "^29.5.13",
    "@types/react": "^19.2.0",
    "@types/react-test-renderer": "^19.1.0",
    "eslint": "^8.19.0",
    "jest": "^29.6.3",
    "prettier": "2.8.8",
    "react-test-renderer": "19.2.3",
    "typescript": "^5.8.3"
  },
  "engines": {
    "node": ">= 22.11.0"
  }
}
```
---

### src/screens/CameraScreen.js

**Language:** javascript  
**Size:** 12.14 KB  
**Last Modified:** 2026-03-28T20:06:49.634Z

```javascript
import React, {useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {
  Alert,
  FlatList,
  PermissionsAndroid,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useIsFocused} from '@react-navigation/native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useMicrophonePermission,
} from 'react-native-vision-camera';
import CameraRoll from "@react-native-camera-roll/camera-roll";

import {useCameraSettings} from '../context/CameraSettingsContext';
import {listSavedVideos, saveRecordedVideo} from '../utils/videoStorage';

function parseMaybeNumber(value) {
  if (value === '' || value === null || value === undefined) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  if (!bytes) return '—';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
}

function formatDate(dateLike) {
  if (!dateLike) return '—';
  const date = new Date(dateLike);
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}
async function requestExtraPermissions() {
  if (Platform.OS === "android") {
    if (Platform.Version >= 33) {
      await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO
      );
    } else {
      await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
      );
    }
  }
}

export default function CameraScreen({navigation}) {
  const camera = useRef(null);
  const isFocused = useIsFocused();
  const device = useCameraDevice('back');
  requestExtraPermissions();
  const {hasPermission: hasCameraPermission, requestPermission: requestCameraPermission} =
    useCameraPermission();
  const {
    hasPermission: hasMicrophonePermission,
    requestPermission: requestMicrophonePermission,
  } = useMicrophonePermission();
  const {settings} = useCameraSettings();

  const [isRecording, setIsRecording] = useState(false);
  const [savedVideos, setSavedVideos] = useState([]);
  const [status, setStatus] = useState('Pronto para gravar.');

  const selectedFormat = useMemo(() => {
    const index = settings.formatIndex === '' ? undefined : Number(settings.formatIndex);
    if (!device || index === undefined || Number.isNaN(index)) {
      return undefined;
    }
    return device.formats[index];
  }, [device, settings.formatIndex]);

  const cameraProps = useMemo(
    () => ({
      device,
      isActive: isFocused,
      audio: settings.audio,
      photo: settings.photo,
      video: settings.video,
      preview: settings.preview,
      enableZoomGesture: settings.enableZoomGesture,
      lowLightBoost: settings.lowLightBoost,
      resizeMode: settings.resizeMode,
      torch: settings.torch,
      videoBitRate: settings.videoBitRate,
      photoQualityBalance: settings.photoQualityBalance,
      videoHdr: settings.videoHdr,
      photoHdr: settings.photoHdr,
      fps: parseMaybeNumber(settings.fps),
      zoom: parseMaybeNumber(settings.zoom),
      exposure: parseMaybeNumber(settings.exposure),
      format: selectedFormat,
    }),
    [device, isFocused, selectedFormat, settings],
  );

  const refreshVideos = useCallback(async () => {
    try {
      const items = await listSavedVideos();
      setSavedVideos(items);
    } catch (error) {
      console.warn('Falha ao carregar vídeos salvos', error);
    }
  }, []);

  useEffect(() => {
    refreshVideos();
  }, [refreshVideos]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{flexDirection: 'row', gap: 12}}>
          <Pressable onPress={() => navigation.navigate('Library')}>
            <Text style={styles.headerAction}>Vídeos</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate('Settings')}>
            <Text style={styles.headerAction}>⚙</Text>
          </Pressable>
        </View>
      ),
    });
  }, [navigation]);

  const ensurePermissions = useCallback(async () => {
    let cameraOk = hasCameraPermission;
    let microphoneOk = hasMicrophonePermission;

    if (!cameraOk) {
      cameraOk = (await requestCameraPermission()) === 'granted';
    }

    if (!microphoneOk) {
      microphoneOk = (await requestMicrophonePermission()) === 'granted';
    }

    if (!cameraOk || !microphoneOk) {
      Alert.alert(
        'Permissões necessárias',
        'Você precisa permitir câmera e microfone para gravar vídeos com áudio.',
      );
    }

    return cameraOk && microphoneOk;
  }, [
    hasCameraPermission,
    hasMicrophonePermission,
    requestCameraPermission,
    requestMicrophonePermission,
  ]);

  const handleRecordingFinished = useCallback(
    async video => {
      try {
        const storedPath = await saveRecordedVideo(video.path);
        setStatus(`Vídeo salvo em ${storedPath}`);
        await refreshVideos();
      } catch (error) {
        console.error(error);
        Alert.alert('Erro ao salvar', 'O vídeo foi gravado, mas não foi possível movê-lo para a pasta do app.');
      } finally {
        setIsRecording(false);
      }
    },
    [refreshVideos],
  );

  const handleRecordingError = useCallback(error => {
    console.error(error);
    setStatus('Erro durante a gravação.');
    setIsRecording(false);
    Alert.alert('Erro de gravação', error?.message ?? 'Não foi possível gravar o vídeo.');
  }, []);


const onRecordingFinished = async (video) => {
  try {
    const savedUri = await CameraRoll.save(video.path, {
      type: "video",
    });

    console.log("Vídeo salvo na galeria:", savedUri);
  } catch (error) {
    console.error("Erro ao salvar vídeo:", error);
  }
};

  const startRecording = useCallback(async () => {
    if (!camera.current || isRecording) {
      return;
    }

    const ok = await ensurePermissions();
    if (!ok) {
      return;
    }

    try {
      setStatus('Gravando...');
      setIsRecording(true);
      camera.current.startRecording({
        onRecordingFinished: async (video) => {
          await CameraRoll.save(video.path, { type: "video" });
        },
        onRecordingError: (error) => {
          console.error(error);
        },
      });
    } catch (error) {
      setIsRecording(false);
      setStatus('Falha ao iniciar gravação.');
      Alert.alert('Erro', error?.message ?? 'Falha ao iniciar a gravação.');
    }
  }, [ensurePermissions, handleRecordingError, handleRecordingFinished, isRecording]);

  const stopRecording = useCallback(async () => {
    if (!camera.current || !isRecording) {
      return;
    }
    try {
      await camera.current.stopRecording();
      setStatus('Finalizando gravação...');
    } catch (error) {
      setIsRecording(false);
      Alert.alert('Erro', error?.message ?? 'Falha ao parar a gravação.');
    }
  }, [isRecording]);

  const onPermissionPress = useCallback(async () => {
    await ensurePermissions();
  }, [ensurePermissions]);

  if (!hasCameraPermission) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Videonly</Text>
        <Text style={styles.subtitle}>O app precisa de permissão para acessar a câmera.</Text>
        <Pressable style={styles.primaryButton} onPress={onPermissionPress}>
          <Text style={styles.primaryButtonText}>Permitir câmera e microfone</Text>
        </Pressable>
      </View>
    );
  }

  if (device == null) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Buscando câmera traseira...</Text>
        <Text style={styles.subtitle}>Se o aparelho não tiver câmera compatível, nada será exibido.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.cameraWrap}>
        <Camera ref={camera} style={StyleSheet.absoluteFill} {...cameraProps} />
        <View style={styles.topOverlay}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{isRecording ? 'REC' : 'PRONTO'}</Text>
          </View>
          <Text style={styles.statusText}>{status}</Text>
        </View>

        <View style={styles.controls}>
          <Pressable
            onPress={isRecording ? stopRecording : startRecording}
            style={[styles.recordButton, isRecording && styles.recordButtonActive]}>
            <Text style={styles.recordButtonText}>{isRecording ? 'Parar' : 'Gravar'}</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => navigation.navigate('Settings')}>
            <Text style={styles.secondaryButtonText}>Configurações</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Vídeos salvos</Text>
        <FlatList
          data={savedVideos}
          keyExtractor={item => item.path}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{gap: 12}}
          renderItem={({item}) => (
            <View style={styles.videoCard}>
              <Text style={styles.videoName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.videoMeta}>{formatSize(item.size)}</Text>
              <Text style={styles.videoMeta}>{formatDate(item.mtime)}</Text>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Nenhum vídeo salvo ainda.</Text>
          }
        />
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
  badgeText: {color: '#f8fafc', fontWeight: '700', fontSize: 12},
  statusText: {
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
  recordButtonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
  secondaryButton: {
    backgroundColor: 'rgba(17,24,39,0.85)',
    borderWidth: 1,
    borderColor: '#334155',
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: 999,
  },
  secondaryButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  panel: {
    backgroundColor: '#111827',
    borderTopWidth: 1,
    borderTopColor: '#1f2937',
    padding: 16,
  },
  panelTitle: {
    color: '#f9fafb',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  videoCard: {
    width: 200,
    backgroundColor: '#0f172a',
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: '#243244',
  },
  videoName: {color: '#fff', fontWeight: '700', marginBottom: 6},
  videoMeta: {color: '#9ca3af', fontSize: 12, marginBottom: 2},
  emptyText: {color: '#9ca3af'},
  center: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#0b1020'},
  title: {color: '#fff', fontSize: 28, fontWeight: '800', marginBottom: 8, textAlign: 'center'},
  subtitle: {color: '#cbd5e1', fontSize: 15, textAlign: 'center', marginBottom: 16, lineHeight: 21},
  primaryButton: {
    backgroundColor: '#2563eb',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  primaryButtonText: {color: '#fff', fontWeight: '700'},
  headerAction: {color: '#fff', fontSize: 15, fontWeight: '700'},
});
```
---

