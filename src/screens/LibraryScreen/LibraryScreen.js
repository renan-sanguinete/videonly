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
import {styles} from './styles';

export default function LibraryScreen({navigation}) {
  const [videos, setVideos] = useState([]);
  const [selectedUris, setSelectedUris] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState({current: 0, total: 0});
  const {showAlert} = useCustomAlert();

  const selectedCount = selectedUris.length;

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

  const renderHeaderActions = useCallback(
    () => (
      <View style={styles.headerActions}>
        {selectedCount > 0 ? (
          <Pressable
            disabled={isDeleting}
            hitSlop={10}
            onPress={confirmDeleteSelected}
            style={styles.headerIconButton}>
            <Icon
              color={isDeleting ? '#64748b' : '#f87171'}
              name="trash-outline"
              size={22}
            />
          </Pressable>
        ) : null}
        {selectedCount > 0 ? (
          <Pressable
            disabled={isDeleting}
            hitSlop={10}
            onPress={clearSelection}
            style={styles.headerIconButton}>
            <Icon
              color={isDeleting ? '#64748b' : '#e2e8f0'}
              name="close-outline"
              size={24}
            />
          </Pressable>
        ) : null}
      </View>
    ),
    [clearSelection, confirmDeleteSelected, isDeleting, selectedCount],
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      title:
        selectedCount > 0
          ? `${selectedCount} selecionado${selectedCount > 1 ? 's' : ''}`
          : 'Vídeos salvos',
      headerRight: renderHeaderActions,
    });
  }, [navigation, renderHeaderActions, selectedCount]);

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
          {isSelected ? <Icon name="checkmark" size={16} color="#fff" /> : null}
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
      <LoadingModal
        message={deletingMessage}
        title="Excluindo vídeos"
        visible={isDeleting}
      />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#888" style={styles.loadingIndicator} />
        </View>
      ) : (
        <FlatList
          data={videos}
          keyExtractor={item => item.uri}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={
            videos.length === 0 ? styles.emptyContainer : styles.listContent
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
            <View>
              <Text style={styles.emptyTitle}>Nenhum vídeo encontrado</Text>
              <Text style={styles.emptyText}>Grave um vídeo para vê-lo aqui.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}
