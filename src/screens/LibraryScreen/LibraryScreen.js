import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import RNFS from 'react-native-fs';

import LoadingModal from '../../components/LoadingModal/LoadingModal';
import VideoCard from '../../components/VideoCard/VideoCard';
import {useCameraSettings} from '../../context/CameraSettingsContext';
import {useCustomAlert} from '../../context/CustomAlertContext';
import {
  canManageAndroidMedia,
  openAndroidManageMediaSettings,
} from '../../utils/appPermissions';
import {
  deleteVideoFromCameraRoll,
  loadVideosPageFromCameraRoll,
  saveVideoToCameraRoll,
} from '../../utils/cameraRollVideos';
import {openVideoUri, shareVideo} from '../../utils/videoActions';
import {optimizeVideo} from '../../utils/videoCompression';
import {cinematicTheme} from '../../theme/cinematicTheme';
import {styles} from './styles';

const {colors} = cinematicTheme;
const FILTER_OPTIONS = [
  {label: 'Todos', value: 'all'},
  {label: 'Hoje', value: 'today'},
  {label: 'Esta semana', value: 'week'},
  {label: 'Galeria', value: 'gallery'},
];
const PAGE_SIZE = 20;

function isSameDay(left, right) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function getOptimizationLoadingTitle(mode) {
  if (mode === 'audio') {
    return 'Otimizando áudio';
  }

  if (mode === 'both') {
    return 'Otimizando vídeo e áudio';
  }

  return 'Otimizando vídeo';
}

function getVideoExtensionFromItem(item) {
  const extensionMatch = String(item?.filename || item?.uri || '')
    .split('?')[0]
    .match(/\.([a-zA-Z0-9]+)$/);
  const extension = extensionMatch?.[1]?.toLowerCase();

  return extension === 'mov' ? 'mov' : 'mp4';
}

function mergeVideos(currentVideos, nextVideos) {
  const seenUris = new Set();

  return [...currentVideos, ...nextVideos].filter(video => {
    if (seenUris.has(video.uri)) {
      return false;
    }

    seenUris.add(video.uri);
    return true;
  });
}

export default function LibraryScreen({navigation}) {
  const [videos, setVideos] = useState([]);
  const [selectedUris, setSelectedUris] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [pageInfo, setPageInfo] = useState({
    has_next_page: false,
    end_cursor: null,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [processingOptimizationMode, setProcessingOptimizationMode] =
    useState('none');
  const [deleteProgress, setDeleteProgress] = useState({current: 0, total: 0});
  const [actionVideoUri, setActionVideoUri] = useState(null);
  const [isActionOptimizationOpen, setIsActionOptimizationOpen] =
    useState(false);
  const {settings} = useCameraSettings();
  const {showAlert} = useCustomAlert();
  const insets = useSafeAreaInsets();
  const activeSource = activeFilter === 'gallery' ? 'gallery' : 'videonly';

  const selectedCount = selectedUris.length;
  const totalSizeMb = useMemo(
    () =>
      Math.round(
        videos.reduce((acc, item) => acc + (item.size || 0), 0) /
          (1024 * 1024) *
          10,
      ) / 10,
    [videos],
  );
  const headerMetaText =
    selectedCount > 0
      ? `${selectedCount} selecionado${selectedCount > 1 ? 's' : ''}`
      : `${String(videos.length).padStart(2, '0')} / ${totalSizeMb} MB`;
  const storageProgress = Math.min(totalSizeMb / 1200, 1);
  const filteredVideos = useMemo(() => {
    if (activeFilter === 'all' || activeFilter === 'gallery') {
      return videos;
    }

    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);

    return videos.filter(video => {
      const videoDate = new Date((video.timestamp || 0) * 1000);

      if (activeFilter === 'today') {
        return isSameDay(videoDate, now);
      }

      return videoDate >= weekAgo;
    });
  }, [activeFilter, videos]);

  const load = useCallback(async ({
    after = null,
    append = false,
    showLoader = false,
  } = {}) => {
    if (showLoader) {
      setIsLoading(true);
    }

    try {
      const nextPage = await loadVideosPageFromCameraRoll({
        after,
        first: PAGE_SIZE,
        source: activeSource,
      });
      const items = nextPage.videos;

      setVideos(current => {
        const nextVideos = append ? mergeVideos(current, items) : items;

        setSelectedUris(selected =>
          selected.filter(uri => nextVideos.some(video => video.uri === uri)),
        );
        setActionVideoUri(currentActionUri =>
          nextVideos.some(video => video.uri === currentActionUri)
            ? currentActionUri
            : null,
        );

        return nextVideos;
      });
      setPageInfo(nextPage.pageInfo);
    } catch (error) {
      showAlert(
        'Erro ao carregar vídeos',
        error?.message || 'Não foi possível carregar os vídeos da galeria.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [activeSource, showAlert]);

  const clearSelection = useCallback(() => {
    setSelectedUris([]);
    setActionVideoUri(null);
    setIsActionOptimizationOpen(false);
  }, []);

  const toggleSelection = useCallback(uri => {
    setActionVideoUri(null);
    setIsActionOptimizationOpen(false);
    setSelectedUris(current =>
      current.includes(uri)
        ? current.filter(itemUri => itemUri !== uri)
        : [...current, uri],
    );
  }, []);

  const maybeWarnAboutManageMedia = useCallback(async () => {
    if (Platform.OS !== 'android' || Platform.Version < 31) {
      return;
    }

    if (await canManageAndroidMedia()) {
      return;
    }

    showAlert(
      'Permissão extra para excluir',
      'Sem o acesso especial "Gerenciar mídia", o Android pode continuar mostrando uma confirmação adicional ao excluir vídeos.',
      [
        {text: 'Fechar', style: 'cancel'},
        {
          text: 'Abrir configurações',
          onPress: () => {
            openAndroidManageMediaSettings().catch(openError => {
              console.warn(
                'Falha ao abrir configurações de gerenciamento de mídia.',
                openError,
              );
            });
          },
        },
      ],
    );
  }, [showAlert]);

  const deleteVideos = useCallback(async () => {
    const urisToDelete = [...selectedUris];

    if (urisToDelete.length === 0) {
      return;
    }

    setIsDeleting(true);
    setDeleteProgress({current: 0, total: urisToDelete.length});

    try {
      let bypassedSystemPrompt = false;

      for (let index = 0; index < urisToDelete.length; index += 1) {
        setDeleteProgress({current: index + 1, total: urisToDelete.length});
        const result = await deleteVideoFromCameraRoll(urisToDelete[index]);
        bypassedSystemPrompt =
          bypassedSystemPrompt || Boolean(result?.bypassedSystemPrompt);
      }

      clearSelection();
      await load({showLoader: false});

      if (!bypassedSystemPrompt) {
        await maybeWarnAboutManageMedia();
      }
    } catch (error) {
      showAlert(
        'Erro',
        error?.message || 'Não foi possível excluir os vídeos selecionados.',
      );
    } finally {
      setIsDeleting(false);
      setDeleteProgress({current: 0, total: 0});
    }
  }, [clearSelection, load, maybeWarnAboutManageMedia, selectedUris, showAlert]);

  const confirmDeleteSelected = useCallback(() => {
    if (selectedCount === 0 || isDeleting) {
      return;
    }

    showAlert(
      'Excluir vídeos',
      selectedCount === 1
        ? 'Excluir o vídeo selecionado?'
        : `Excluir os ${selectedCount} vídeos selecionados?`,
      [
        {text: 'Cancelar', style: 'cancel'},
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => {
            deleteVideos().catch(error => {
              console.warn('Falha ao excluir vídeos em lote.', error);
            });
          },
        },
      ],
    );
  }, [deleteVideos, isDeleting, selectedCount, showAlert]);

  useEffect(() => {
    setVideos([]);
    setPageInfo({has_next_page: false, end_cursor: null});
    clearSelection();
    load({showLoader: true});
  }, [activeSource, clearSelection, load]);

  useEffect(() => {
    clearSelection();
  }, [activeFilter, clearSelection]);

  const onRefresh = useCallback(async () => {
    if (isDeleting || isOptimizing) {
      return;
    }

    setRefreshing(true);
    try {
      await load({append: false});
    } finally {
      setRefreshing(false);
    }
  }, [isDeleting, isOptimizing, load]);

  const loadMore = useCallback(async () => {
    if (
      isDeleting ||
      isLoading ||
      isLoadingMore ||
      isOptimizing ||
      !pageInfo.has_next_page
    ) {
      return;
    }

    setIsLoadingMore(true);
    try {
      await load({after: pageInfo.end_cursor, append: true});
    } finally {
      setIsLoadingMore(false);
    }
  }, [
    isDeleting,
    isLoading,
    isLoadingMore,
    isOptimizing,
    load,
    pageInfo.end_cursor,
    pageInfo.has_next_page,
  ]);

  const onOpen = useCallback(
    async item => {
      try {
        await openVideoUri(item.uri);
      } catch (error) {
        showAlert(
          'Erro ao abrir vídeo',
          error?.message || 'Não foi possível abrir este vídeo.',
        );
      }
    },
    [showAlert],
  );

  const onShare = useCallback(
    async item => {
      try {
        await shareVideo(item);
      } catch (error) {
        showAlert(
          'Erro ao compartilhar',
          error?.message || 'Não foi possível compartilhar este vídeo.',
        );
      }
    },
    [showAlert],
  );

  const deleteSingleVideo = useCallback(
    async item => {
      if (!item || isDeleting) {
        return;
      }

      setIsDeleting(true);
      setDeleteProgress({current: 1, total: 1});

      try {
        const result = await deleteVideoFromCameraRoll(item.uri);
        setActionVideoUri(null);
        setIsActionOptimizationOpen(false);
        await load({showLoader: false});

        if (!result?.bypassedSystemPrompt) {
          await maybeWarnAboutManageMedia();
        }
      } catch (error) {
        showAlert(
          'Erro',
          error?.message || 'Não foi possível excluir este vídeo.',
        );
      } finally {
        setIsDeleting(false);
        setDeleteProgress({current: 0, total: 0});
      }
    },
    [isDeleting, load, maybeWarnAboutManageMedia, showAlert],
  );

  const confirmDeleteVideo = useCallback(
    item => {
      if (!item || isDeleting) {
        return;
      }

      showAlert('Excluir vídeo', 'Excluir o vídeo selecionado?', [
        {text: 'Cancelar', style: 'cancel'},
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => {
            deleteSingleVideo(item).catch(error => {
              console.warn('Falha ao excluir vídeo na biblioteca.', error);
            });
          },
        },
      ]);
    },
    [deleteSingleVideo, isDeleting, showAlert],
  );

  const optimizeSelectedVideo = useCallback(
    async (item, optimizationMode) => {
      if (!item || isOptimizing) {
        return;
      }

      const sourcePath = item.path || item.uri;
      const extension = getVideoExtensionFromItem(item);
      let optimizedPath = null;

      setIsActionOptimizationOpen(false);
      setProcessingOptimizationMode(optimizationMode);
      setIsOptimizing(true);

      try {
        optimizedPath = await optimizeVideo(sourcePath, extension, {
          optimizationMode,
          audioLimiterPreset: settings.audioLimiterPreset,
          normalizeAudioLoudness: settings.normalizeAudioLoudness,
        });

        await saveVideoToCameraRoll(optimizedPath);
        await load({showLoader: false});

        showAlert(
          'Otimização concluída',
          'Uma nova cópia otimizada foi salva. O vídeo original foi mantido.',
          [{text: 'OK'}],
        );
      } catch (error) {
        showAlert(
          'Otimização indisponível',
          error?.message ||
            'Não foi possível otimizar este vídeo. O original foi mantido.',
          [{text: 'OK'}],
        );
      } finally {
        setIsOptimizing(false);
        setProcessingOptimizationMode('none');
        if (
          optimizedPath &&
          optimizedPath !== sourcePath &&
          optimizedPath !== item.path &&
          optimizedPath !== item.uri
        ) {
          await RNFS.unlink(optimizedPath).catch(cleanupError => {
            console.warn(
              'Não foi possível remover o arquivo otimizado temporário.',
              cleanupError,
            );
          });
        }
      }
    },
    [
      isOptimizing,
      load,
      settings.audioLimiterPreset,
      settings.normalizeAudioLoudness,
      showAlert,
    ],
  );

  const onCardPress = useCallback(
    item => {
      if (isDeleting || isOptimizing) {
        return;
      }

      if (selectedCount > 0) {
        toggleSelection(item.uri);
        return;
      }

      setActionVideoUri(currentUri => (currentUri === item.uri ? null : item.uri));
      setIsActionOptimizationOpen(false);
    },
    [isDeleting, isOptimizing, selectedCount, toggleSelection],
  );

  const renderPanelAction = useCallback(
    ({danger = false, disabled = false, icon, label, onPress}) => (
      <Pressable
        disabled={disabled}
        onPress={onPress}
        style={styles.panelActionButton}
      >
        <View
          style={[
            styles.panelActionIconWrap,
            danger && styles.panelActionIconDanger,
          ]}
        >
          <Icon
            name={icon}
            size={22}
            color={
              danger
                ? colors.destructiveSoftForeground
                : colors.foreground
            }
          />
        </View>
        <Text style={styles.panelActionLabel}>{label}</Text>
      </Pressable>
    ),
    [],
  );

  const renderVideoActions = useCallback(
    item => {
      const disabled = isDeleting || isOptimizing;

      if (isActionOptimizationOpen) {
        return (
          <View style={styles.panelActions}>
            {renderPanelAction({
              disabled,
              icon: 'musical-notes-outline',
              label: 'Áudio',
              onPress: () => {
                optimizeSelectedVideo(item, 'audio').catch(error => {
                  console.warn('Falha ao otimizar áudio na biblioteca.', error);
                });
              },
            })}
            {renderPanelAction({
              disabled,
              icon: 'videocam-outline',
              label: 'Vídeo',
              onPress: () => {
                optimizeSelectedVideo(item, 'video').catch(error => {
                  console.warn('Falha ao otimizar vídeo na biblioteca.', error);
                });
              },
            })}
            {renderPanelAction({
              disabled,
              icon: 'layers-outline',
              label: 'V+A',
              onPress: () => {
                optimizeSelectedVideo(item, 'both').catch(error => {
                  console.warn('Falha ao otimizar mídia na biblioteca.', error);
                });
              },
            })}
            {renderPanelAction({
              disabled,
              icon: 'close-outline',
              label: 'Fechar',
              onPress: () => setIsActionOptimizationOpen(false),
            })}
          </View>
        );
      }

      return (
        <View style={styles.panelActions}>
          {renderPanelAction({
            disabled,
            icon: 'folder-open-outline',
            label: 'Abrir',
            onPress: () => {
              setActionVideoUri(null);
              onOpen(item).catch(error => {
                console.warn('Falha ao abrir vídeo na biblioteca.', error);
              });
            },
          })}
          {renderPanelAction({
            disabled,
            icon: 'color-wand-outline',
            label: 'Otimizar',
            onPress: () => setIsActionOptimizationOpen(true),
          })}
          {renderPanelAction({
            disabled,
            icon: 'share-social-outline',
            label: 'Compart.',
            onPress: () => {
              setActionVideoUri(null);
              onShare(item).catch(error => {
                console.warn('Falha ao compartilhar vídeo na biblioteca.', error);
              });
            },
          })}
          {renderPanelAction({
            danger: true,
            disabled,
            icon: 'trash-outline',
            label: 'Excluir',
            onPress: () => confirmDeleteVideo(item),
          })}
          {renderPanelAction({
            disabled,
            icon: 'close-outline',
            label: 'Cancelar',
            onPress: () => {
              setActionVideoUri(null);
              setIsActionOptimizationOpen(false);
            },
          })}
        </View>
      );
    },
    [
      confirmDeleteVideo,
      isActionOptimizationOpen,
      isDeleting,
      isOptimizing,
      onOpen,
      onShare,
      optimizeSelectedVideo,
      renderPanelAction,
    ],
  );

  const renderSelectionControl = useCallback(
    item => {
      const isSelected = selectedUris.includes(item.uri);

      return (
        <Pressable
          disabled={isDeleting}
          hitSlop={8}
          onPress={() => toggleSelection(item.uri)}
          style={[
            styles.checkbox,
            isSelected ? styles.checkboxSelected : null,
            isDeleting ? styles.checkboxDisabled : null,
          ]}>
          {isSelected ? (
            <Icon name="checkmark" size={16} color={colors.foreground} />
          ) : null}
        </Pressable>
      );
    },
    [isDeleting, selectedUris, toggleSelection],
  );

  const deletingMessage = useMemo(() => {
    if (deleteProgress.total === 0) {
      return 'Aguarde enquanto removemos os vídeos selecionados.';
    }

    return `Removendo ${deleteProgress.current} de ${deleteProgress.total} vídeos selecionados.`;
  }, [deleteProgress]);

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
          <Text style={styles.eyebrow}>Biblioteca</Text>
          <View style={styles.headerRightGroup}>
            <Text style={styles.headerMeta}>{headerMetaText}</Text>
            {selectedCount > 0 ? (
              <Pressable
                accessibilityLabel="Excluir vídeos selecionados"
                disabled={isDeleting}
                hitSlop={10}
                onPress={confirmDeleteSelected}
                style={[
                  styles.headerIconButton,
                  isDeleting && styles.headerIconButtonDisabled,
                ]}
              >
                <Icon
                  color={
                    isDeleting
                      ? colors.borderStrong
                      : colors.destructiveSoftForeground
                  }
                  name="trash-outline"
                  size={22}
                />
              </Pressable>
            ) : null}
          </View>
        </View>
        <Text style={styles.headerTitle}>Vídeos salvos</Text>
        <View style={styles.storageTrack}>
          <View
            style={[
              styles.storageFill,
              {width: `${Math.round(storageProgress * 100)}%`},
            ]}
          />
        </View>
        <View style={styles.filterChips}>
          {FILTER_OPTIONS.map(option => {
            const isSelected = activeFilter === option.value;

            return (
              <Pressable
                key={option.value}
                onPress={() => setActiveFilter(option.value)}
                style={[
                  styles.filterChip,
                  isSelected && styles.filterChipSelected,
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    isSelected && styles.filterChipTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <LoadingModal
        message={deletingMessage}
        title="Excluindo vídeos"
        visible={isDeleting}
      />
      <LoadingModal
        message="Uma nova cópia será salva. O vídeo original será mantido."
        title={getOptimizationLoadingTitle(processingOptimizationMode)}
        visible={isOptimizing}
      />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color={colors.mutedForeground}
            style={styles.loadingIndicator}
          />
        </View>
      ) : (
        <FlatList
          data={filteredVideos}
          style={styles.list}
          keyExtractor={item => item.uri}
          onEndReached={loadMore}
          onEndReachedThreshold={0.45}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={
            filteredVideos.length === 0 ? styles.emptyContainer : styles.listContent
          }
          renderItem={({item}) => (
            <View style={styles.videoItemWrap}>
              <VideoCard
                action={renderSelectionControl(item)}
                disabled={isDeleting || isOptimizing}
                item={item}
                onPress={() => onCardPress(item)}
                selected={
                  selectedUris.includes(item.uri) || actionVideoUri === item.uri
                }
                showDurationLabel
              />
              {actionVideoUri === item.uri ? renderVideoActions(item) : null}
            </View>
          )}
          ListFooterComponent={
            isLoadingMore ? (
              <View style={styles.loadingMore}>
                <ActivityIndicator
                  size="small"
                  color={colors.mutedForeground}
                />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyStateCard}>
              <View style={styles.emptyLogoMark}>
                <Icon name="radio-button-on-outline" size={28} color={colors.accent} />
              </View>
              <Text style={styles.emptyTitle}>
                {videos.length === 0 ? 'Nenhum vídeo ainda' : 'Nada neste filtro'}
              </Text>
              <Text style={styles.emptyText}>
                {videos.length === 0
                  ? 'Toque no botão de gravação para criar o primeiro vídeo.'
                  : 'Tente trocar o filtro para ver outros vídeos salvos.'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
