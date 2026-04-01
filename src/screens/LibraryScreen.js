import React, {useCallback, useState} from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';

import VideoCard from '../components/VideoCard';
import {useCustomAlert} from '../context/CustomAlertContext';
import {
  deleteVideoFromCameraRoll,
  loadSavedVideosFromCameraRoll,
} from '../utils/cameraRollVideos';
import {openVideoUri, shareVideo} from '../utils/videoActions';

export default function LibraryScreen() {
  const [videos, setVideos] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const {showAlert} = useCustomAlert();

  const load = useCallback(async () => {
    try {
      const items = await loadSavedVideosFromCameraRoll();
      setVideos(items);
    } catch (error) {
      console.warn('Erro ao carregar vídeos:', error);
      showAlert(
        'Erro ao carregar vídeos',
        error?.message || 'Não foi possível carregar os vídeos da galeria.',
      );
    }
  }, [showAlert]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

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
      showAlert(
        'Excluir vídeo',
        `Remover ${item.filename || 'este vídeo'}?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Excluir',
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteVideoFromCameraRoll(item.uri);
                await load();
              } catch (error) {
                showAlert('Erro', 'Não foi possível excluir o vídeo.');
              }
            },
          },
        ],
      );
    },
    [load, showAlert],
  );

  const onOpen = useCallback(async item => {
    try {
      await openVideoUri(item.uri);
    } catch (error) {
      showAlert(
        'Erro ao abrir vídeo',
        error?.message || 'Não foi possível abrir este vídeo.',
      );
    }
  }, [showAlert]);

  const onShare = useCallback(async item => {
    try {
      await shareVideo(item);
    } catch (error) {
      showAlert(
        'Erro ao compartilhar',
        error?.message || 'Não foi possível compartilhar este vídeo.',
      );
    }
  }, [showAlert]);

  const onCardPress = useCallback(
    item => {
      showAlert(
        item.filename || 'Vídeo',
        'Escolha o que deseja fazer com este vídeo.',
        [
          {text: 'Cancelar', style: 'cancel'},
          {text: 'Visualizar', onPress: () => onOpen(item)},
          {text: 'Compartilhar', onPress: () => onShare(item)},
          {text: 'Excluir', style: 'destructive', onPress: () => onDelete(item)},
        ],
      );
    },
    [onDelete, onOpen, onShare, showAlert],
  );

  return (
    <View style={styles.container}>
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
            <Text style={styles.emptyTitle}>Nenhum vídeo encontrado</Text>
            <Text style={styles.emptyText}>
              Grave um vídeo para vê-lo aqui.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b1020' },
  listContent: { padding: 16, gap: 12 },
  emptyContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  deleteButton: {
    backgroundColor: '#7f1d1d',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyText: {
    color: '#cbd5e1',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
});
