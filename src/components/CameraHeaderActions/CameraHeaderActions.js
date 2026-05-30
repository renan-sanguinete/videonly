import React, {useEffect, useMemo} from 'react';
import {Pressable, Text, View} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import {
  MEDIA_OPTIMIZATION_MODES,
  getMediaOptimizationModeOption,
} from '../../constants/mediaOptimization';
import {styles} from './styles';

export default function CameraHeaderActions({
  onOpenLibrary,
  onOpenSettings,
  flashMode,
  onToggleFlash,
  isFrontCamera,
  isRecording,
  optimizationMode,
  onOptimizationModeChange,
  isOptimizationMenuOpen,
  setIsOptimizationMenuOpen,
}) {
  const currentOptimizationMode = useMemo(
    () => getMediaOptimizationModeOption(optimizationMode),
    [optimizationMode],
  );
  const isOptimizationControlDisabled = isRecording;

  useEffect(() => {
    if (isOptimizationControlDisabled && isOptimizationMenuOpen) {
      setIsOptimizationMenuOpen(false);
    }
  }, [isOptimizationControlDisabled, isOptimizationMenuOpen]);

  const optimizationButtonStyle = useMemo(() => {
    if (currentOptimizationMode.value === 'video') {
      return styles.optimizationButtonVideo;
    }

    if (currentOptimizationMode.value === 'audio') {
      return styles.optimizationButtonAudio;
    }

    if (currentOptimizationMode.value === 'both') {
      return styles.optimizationButtonBoth;
    }

    return styles.optimizationButtonNone;
  }, [currentOptimizationMode.value]);

  return (
    <View style={styles.headerActions}>
      {isOptimizationMenuOpen ? (
        <View style={styles.optimizationMenuExpanded}>
          <View style={styles.optimizationMenuHeader}>
            <Text style={styles.optimizationMenuTitle}>Otimizar</Text>
            <Pressable
              accessibilityLabel="Fechar otimização"
              hitSlop={10}
              onPress={() => setIsOptimizationMenuOpen(false)}
              style={styles.optimizationCloseButton}
            >
              <Icon name="close-outline" size={18} color="#cbd5e1" />
            </Pressable>
          </View>
          <View style={styles.optimizationMenuOptions}>
            {MEDIA_OPTIMIZATION_MODES.map(option => {
              const isSelected =
                currentOptimizationMode.value === option.value;

              return (
                <Pressable
                  key={option.value}
                  onPress={() => {
                    onOptimizationModeChange(option.value);
                    setIsOptimizationMenuOpen(false);
                  }}
                  style={styles.optimizationOption}
                >
                  <View
                    style={[
                      styles.optimizationOptionIconWrap,
                      isSelected && styles.optimizationOptionIconWrapSelected,
                    ]}
                  >
                    <Icon
                      name={option.icon}
                      size={22}
                      color={isSelected ? option.iconColor : '#f8fafc'}
                    />
                  </View>
                  <Text
                    style={[
                      styles.optimizationOptionLabel,
                      isSelected && styles.optimizationOptionLabelSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : (
        <>
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
              accessibilityLabel="Abrir otimização"
              hitSlop={10}
              disabled={isOptimizationControlDisabled}
              onPress={() =>
                setIsOptimizationMenuOpen(currentValue => !currentValue)
              }
              style={[
                styles.headerIconButton,
                styles.headerOptimizationButton,
                isOptimizationControlDisabled && styles.headerIconButtonDisabled,
                optimizationButtonStyle,
              ]}
            >
              <Icon
                name="options-outline"
                size={20}
                color={currentOptimizationMode.iconColor}
              />
            </Pressable>
            <Pressable
              accessibilityLabel="Abrir galeria"
              hitSlop={10}
              disabled={isRecording}
              onPress={onOpenLibrary}
              style={[
                styles.headerIconButton,
                isRecording && styles.headerIconButtonDisabled,
              ]}
            >
              <Icon name="images-outline" size={24} color="#fff" />
            </Pressable>
            <Pressable
              accessibilityLabel="Abrir configurações"
              hitSlop={10}
              disabled={isRecording}
              onPress={onOpenSettings}
              style={[
                styles.headerIconButton,
                isRecording && styles.headerIconButtonDisabled,
              ]}
            >
              <Icon name="settings-outline" size={22} color="#fff" />
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}
