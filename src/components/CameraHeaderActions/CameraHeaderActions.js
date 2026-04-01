import React from 'react';
import {Pressable, View} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import {styles} from './styles';

export default function CameraHeaderActions({
  onOpenLibrary,
  onOpenSettings,
  flashMode,
  onToggleFlash,
  isFrontCamera,
  compressVideoEnabled,
  onToggleCompressVideo,
  isRecording,
}) {
  return (
    <View style={styles.headerActions}>
      <View style={styles.leftGroup}>
        {/* espaço para futuro (ex: fechar câmera, voltar, etc) */}
      </View>

      <View style={styles.rightGroup}>
        {!isFrontCamera && (
          <Pressable
            accessibilityLabel="Alternar flash"
            hitSlop={10}
            onPress={onToggleFlash}
            style={styles.headerIconButton}>
            <Icon
              name={flashMode === 'off' ? 'flashlight-outline' : 'flashlight'}
              size={22}
              color="#fff"
            />
          </Pressable>
        )}
        <Pressable
          accessibilityLabel="Alternar compressão"
          hitSlop={10}
          onPress={onToggleCompressVideo}
          disabled={isRecording}
          style={styles.headerIconButton}>
          <Icon
            name={
              compressVideoEnabled
                ? 'archive'
                : 'archive-outline'
            }
            size={22}
            color={compressVideoEnabled ? '#4CAF50' : '#fff'}
          />
        </Pressable>
        <Pressable
          accessibilityLabel="Abrir galeria"
          hitSlop={10}
          onPress={onOpenLibrary}
          style={styles.headerIconButton}>
          <Icon name="images-outline" size={24} color="#fff" />
        </Pressable>
        <Pressable
          accessibilityLabel="Abrir configuracoes"
          hitSlop={10}
          onPress={onOpenSettings}
          style={styles.headerIconButton}>
          <Icon name="settings-outline" size={22} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}
