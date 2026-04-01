import React from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

export default function CameraHeaderActions({
  onOpenLibrary,
  onOpenSettings,
}) {
  return (
    <View style={styles.headerActions}>
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
  );
}

const styles = StyleSheet.create({
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerIconButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
