import React, {useEffect, useMemo} from 'react';
import {Pressable, Text, View} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import {
  MEDIA_OPTIMIZATION_MODES,
  getMediaOptimizationModeOption,
} from '../../constants/mediaOptimization';
import {cinematicTheme} from '../../theme/cinematicTheme';
import {styles} from './styles';

const {colors} = cinematicTheme;

export default function CameraHeaderActions({
  onOpenLibrary,
  onOpenSettings,
  onStartAmbientAnalysis,
  flashMode,
  onToggleFlash,
  isFrontCamera,
  isRecording,
  optimizationMode,
  onOptimizationModeChange,
  isOptimizationMenuOpen,
  setIsOptimizationMenuOpen,
  isAmbientAnalysisMenuOpen,
  setIsAmbientAnalysisMenuOpen,
  isAmbientAnalysisRunning,
  isAmbientAnalysisDisabled,
}) {
  const currentOptimizationMode = useMemo(
    () => getMediaOptimizationModeOption(optimizationMode),
    [optimizationMode],
  );
  const isOptimizationControlDisabled = isRecording;
  const isAmbientAnalysisControlDisabled =
    isAmbientAnalysisDisabled || isRecording || isAmbientAnalysisRunning;

  useEffect(() => {
    if (isOptimizationControlDisabled && isOptimizationMenuOpen) {
      setIsOptimizationMenuOpen(false);
    }
  }, [isOptimizationControlDisabled, isOptimizationMenuOpen]);

  useEffect(() => {
    if (isAmbientAnalysisControlDisabled && isAmbientAnalysisMenuOpen) {
      setIsAmbientAnalysisMenuOpen(false);
    }
  }, [
    isAmbientAnalysisControlDisabled,
    isAmbientAnalysisMenuOpen,
    setIsAmbientAnalysisMenuOpen,
  ]);

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

  const ambientAnalysisButtonStyle = useMemo(() => {
    if (isAmbientAnalysisRunning) {
      return styles.ambientAnalysisButtonRunning;
    }

    if (isAmbientAnalysisMenuOpen) {
      return styles.ambientAnalysisButtonActive;
    }

    return styles.ambientAnalysisButtonNone;
  }, [isAmbientAnalysisMenuOpen, isAmbientAnalysisRunning]);

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
              <Icon name="close-outline" size={24} color={colors.mutedForeground} />
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
                      color={isSelected ? option.iconColor : colors.foreground}
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
      ) : isAmbientAnalysisMenuOpen ? (
        <View style={styles.optimizationMenuExpanded}>
          <View style={styles.optimizationMenuHeader}>
            <Text style={styles.optimizationMenuTitle}>Analisar som ambiente</Text>
            <Pressable
              accessibilityLabel="Fechar análise de ambiente"
              hitSlop={10}
              onPress={() => setIsAmbientAnalysisMenuOpen(false)}
              style={styles.optimizationCloseButton}
            >
              <Icon
                name="close-outline"
                size={24}
                color={colors.mutedForeground}
              />
            </Pressable>
          </View>
          <View style={styles.optimizationMenuOptions}>
            <Pressable
              onPress={() => {
                setIsAmbientAnalysisMenuOpen(false);
                onStartAmbientAnalysis();
              }}
              style={styles.optimizationOption}
            >
              <View style={styles.optimizationOptionIconWrap}>
                <Icon
                  name="sparkles-outline"
                  size={22}
                  color={colors.accent}
                />
              </View>
              <Text style={styles.ambientAnalysisOptionDescription}>
                Analisa o ambiente por 10 segundos e sugere a melhor configuração de captação.
              </Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <>
          <View style={styles.leftGroup}>
            {/* espaço para futuro (ex: fechar câmera, voltar, etc) */}
          </View>

          <View style={styles.rightGroup}>
            <Pressable
              accessibilityLabel="Abrir análise de ambiente"
              hitSlop={10}
              disabled={isAmbientAnalysisControlDisabled}
              onPress={() => {
                setIsOptimizationMenuOpen(false);
                setIsAmbientAnalysisMenuOpen(currentValue => !currentValue);
              }}
              style={[
                styles.headerIconButton,
                styles.headerAmbientButton,
                isAmbientAnalysisControlDisabled &&
                  styles.headerIconButtonDisabled,
                ambientAnalysisButtonStyle,
              ]}
            >
              <Icon
                name="sparkles-outline"
                size={20}
                color={colors.foreground}
              />
            </Pressable>
            {!isFrontCamera && (
              <Pressable
                accessibilityLabel="Alternar flash"
                hitSlop={10}
                onPress={onToggleFlash}
                style={styles.headerIconButton}>
                <Icon
                  name={flashMode === 'off' ? 'flashlight-outline' : 'flashlight'}
                  size={22}
                  color={colors.mutedForeground}
                />
              </Pressable>
            )}
            <Pressable
              accessibilityLabel="Abrir otimização"
              hitSlop={10}
              disabled={isOptimizationControlDisabled}
              onPress={() => {
                setIsAmbientAnalysisMenuOpen(false);
                setIsOptimizationMenuOpen(currentValue => !currentValue);
              }}
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
                color={currentOptimizationMode.iconColor ?? colors.foreground}
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
              <Icon name="images-outline" size={24} color={colors.mutedForeground} />
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
              <Icon name="settings-outline" size={22} color={colors.mutedForeground} />
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}
