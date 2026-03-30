# Videonly

Starter kit para um app React Native CLI Android-only usando `react-native-vision-camera`, com navegação, gravação de vídeo e persistência local dos arquivos no armazenamento do app.

## Instalação

```bash
npx react-native init Videonly
cd Videonly

yarn add react-native-vision-camera react-native-fs \
  @react-navigation/native @react-navigation/native-stack \
  react-native-screens react-native-safe-area-context \
  react-native-gesture-handler

# Android only
```

Depois:

1. Copie os arquivos deste starter para dentro do projeto.
2. Adicione as permissões no `android/app/src/main/AndroidManifest.xml`.
3. Garanta que `import 'react-native-gesture-handler';` fique no topo do `index.js`.
4. Rode:

```bash
cd android && ./gradlew clean && cd ..
yarn android
```

## Permissões Android

Dentro de `<manifest>`:

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
```

## O que este starter entrega

- Tela de câmera com preview
- Gravação de vídeo com `startRecording()` e `stopRecording()`
- Salva o vídeo em `DocumentDirectoryPath/Videonly`
- Tela de vídeos salvos
- Tela de configurações para alterar props da câmera
- Navegação com `@react-navigation/native-stack`

## Observação

Alguns CameraProps dependem do dispositivo/formato escolhido. O starter já inclui os principais controles Android-friendly e foi estruturado para ser expandido com novos props facilmente.
