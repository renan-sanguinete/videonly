import React, {useCallback, useLayoutEffect, useMemo, useState} from 'react';
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

import LoadingModal from '../../components/LoadingModal/LoadingModal';
import VideoCard from '../../components/VideoCard/VideoCard';
import {useCustomAlert} from '../../context/CustomAlertContext';
import {
  canManageAndroidMedia,
  openAndroidManageMediaSettings,
} from '../../utils/appPermissions';
import {
  deleteVideoFromCameraRoll,
  loadSavedVideosFromCameraRoll,
} from '../../utils/cameraRollVideos';
import {openVideoUri, shareVideo} from '../../utils/videoActions';
import {cinematicTheme} from '../../theme/cinematicTheme';
import {styles} from './styles';

const {colors} = cinematicTheme;
const FILTER_OPTIONS = [
  {label: 'Todos', value: 'all'},
  {label: 'Hoje', value: 'today'},
  {label: 'Esta semana', value: 'week'},
];

function isSameDay(left, right) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

export default function LibraryScreen({navigation}) {
  const [videos, setVideos] = useState([]);
  const [selectedUris, setSelectedUris] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState({current: 0, total: 0});
  const {showAlert} = useCustomAlert();
  const insets = useSafeAreaInsets();

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
    if (activeFilter === 'all') {
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

  const load = useCallback(async ({showLoader = false} = {}) => {
    if (showLoader) {
      setIsLoading(true);
    }

    try {
      const items = await loadSavedVideosFromCameraRoll();
      setVideos(items);
      setSelectedUris(current =>
        current.filter(uri => items.some(video => video.uri === uri)),
      );
    } catch (error) {
      showAlert(
        'Erro ao carregar videos',
        error?.message || 'Nao foi possivel carregar os videos da galeria.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [showAlert]);

  const clearSelection = useCallback(() => {
    setSelectedUris([]);
  }, []);

  const toggleSelection = useCallback(uri => {
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
      'Sem o acesso especial "Gerenciar midia", o Android pode continuar mostrando uma confirmacao adicional ao excluir videos.',
      [
        {text: 'Fechar', style: 'cancel'},
        {
          text: 'Abrir configurações',
          onPress: () => {
            openAndroidManageMediaSettings().catch(openError => {
              console.warn(
                'Falha ao abrir configurações de gerenciamento de midia.',
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
        error?.message || 'Nao foi possivel excluir os videos selecionados.',
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

  useLayoutEffect(() => {
    load({showLoader: true});
  }, [load]);

  const onRefresh = useCallback(async () => {
    if (isDeleting) {
      return;
    }

    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [isDeleting, load]);

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

  const onCardPress = useCallback(
    item => {
      if (isDeleting) {
        return;
      }

      if (selectedCount > 0) {
        toggleSelection(item.uri);
        return;
      }

      showAlert(item.filename || 'Vídeo', 'Escolha o que deseja fazer com este vídeo.', [
        {text: 'Visualizar', onPress: () => onOpen(item)},
        {text: 'Compartilhar', onPress: () => onShare(item)},
        {text: 'Cancelar', style: 'cancel'},
      ]);
    },
    [isDeleting, onOpen, onShare, selectedCount, showAlert, toggleSelection],
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
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={
            filteredVideos.length === 0 ? styles.emptyContainer : styles.listContent
          }
          renderItem={({item}) => (
            <VideoCard
              action={renderSelectionControl(item)}
              disabled={isDeleting}
              item={item}
              onPress={() => onCardPress(item)}
              selected={selectedUris.includes(item.uri)}
              showDurationLabel
            />
          )}
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
