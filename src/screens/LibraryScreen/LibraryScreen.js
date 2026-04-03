import React, {useCallback, useLayoutEffect, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';

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

export default function LibraryScreen() {
  const [videos, setVideos] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const {showAlert} = useCustomAlert();

  const load = useCallback(async () => {
    try {
      const items = await loadSavedVideosFromCameraRoll();
      setVideos(items);
    } catch (error) {
      showAlert(
        'Erro ao carregar videos',
        error?.message || 'Nao foi possivel carregar os videos da galeria.',
      );
    }
  }, [showAlert]);

  useLayoutEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const onDelete = useCallback(
    item => {
      showAlert('Excluir video', `Remover ${item.filename || 'este video'}?`, [
        {text: 'Cancelar', style: 'cancel'},
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await deleteVideoFromCameraRoll(item.uri);
              await load();

              if (
                Platform.OS === 'android' &&
                Platform.Version >= 31 &&
                !result?.bypassedSystemPrompt &&
                !(await canManageAndroidMedia())
              ) {
                showAlert(
                  'Permissao extra para excluir',
                  'Sem o acesso especial "Gerenciar midia", o Android pode continuar mostrando uma confirmacao adicional ao excluir videos.',
                  [
                    {text: 'Fechar', style: 'cancel'},
                    {
                      text: 'Abrir configuracoes',
                      onPress: () => {
                        openAndroidManageMediaSettings().catch(openError => {
                          console.warn(
                            'Falha ao abrir configuracoes de gerenciamento de midia.',
                            openError,
                          );
                        });
                      },
                    },
                  ],
                );
              }
            } catch (error) {
              showAlert('Erro', 'Nao foi possivel excluir o video.');
            }
          },
        },
      ]);
    },
    [load, showAlert],
  );

  const onOpen = useCallback(
    async item => {
      try {
        await openVideoUri(item.uri);
      } catch (error) {
        showAlert(
          'Erro ao abrir video',
          error?.message || 'Nao foi possivel abrir este video.',
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
          error?.message || 'Nao foi possivel compartilhar este video.',
        );
      }
    },
    [showAlert],
  );

  const onCardPress = useCallback(
    item => {
      showAlert(item.filename || 'Video', 'Escolha o que deseja fazer com este video.', [
        {text: 'Cancelar', style: 'cancel'},
        {text: 'Visualizar', onPress: () => onOpen(item)},
        {text: 'Compartilhar', onPress: () => onShare(item)},
        {text: 'Excluir', style: 'destructive', onPress: () => onDelete(item)},
      ]);
    },
    [onDelete, onOpen, onShare, showAlert],
  );

  return (
    <View style={styles.container}>
      {videos.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#888" style={styles.loadingIndicator} />
        </View>
      ) : (
        <FlatList
          data={videos}
          keyExtractor={item => item.uri}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={
            videos.length === 0 ? styles.emptyContainer : styles.listContent
          }
          renderItem={({item}) => (
            <VideoCard
              item={item}
              onPress={() => onCardPress(item)}
              showDurationLabel
              showPath
              action={
                <Pressable onPress={() => onDelete(item)} style={styles.deleteButton}>
                  <Text style={styles.deleteButtonText}>Excluir</Text>
                </Pressable>
              }
            />
          )}
          ListEmptyComponent={
            <View>
              <Text style={styles.emptyTitle}>Nenhum video encontrado</Text>
              <Text style={styles.emptyText}>Grave um video para ve-lo aqui.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}
