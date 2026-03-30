import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  deleteVideoFromCameraRoll,
  loadSavedVideosFromCameraRoll,
} from '../utils/cameraRollVideos';
import {openVideoUri, shareVideo} from '../utils/videoActions';

export default function LibraryScreen() {
  const [videos, setVideos] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const items = await loadSavedVideosFromCameraRoll();
      setVideos(items);
    } catch (error) {
      console.warn('Erro ao carregar vídeos:', error);
      Alert.alert(
        'Erro ao carregar vídeos',
        error?.message || 'Não foi possível carregar os vídeos da galeria.',
      );
    }
  }, []);

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
      Alert.alert(
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
                Alert.alert('Erro', 'Não foi possível excluir o vídeo.');
              }
            },
          },
        ],
      );
    },
    [load],
  );

  const onOpen = useCallback(async item => {
    try {
      await openVideoUri(item.uri);
    } catch (error) {
      Alert.alert(
        'Erro ao abrir vídeo',
        error?.message || 'Não foi possível abrir este vídeo.',
      );
    }
  }, []);

  const onShare = useCallback(async item => {
    try {
      await shareVideo(item);
    } catch (error) {
      Alert.alert(
        'Erro ao compartilhar',
        error?.message || 'Não foi possível compartilhar este vídeo.',
      );
    }
  }, []);

  const onCardPress = useCallback(
    item => {
      Alert.alert(
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
    [onDelete, onOpen, onShare],
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
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => onCardPress(item)}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>
                {item.filename || 'Sem nome'}
              </Text>

              <Text style={styles.meta}>
                Duração: {Math.round(item.duration || 0)}s
              </Text>

              <Text style={styles.meta}>
                {new Date(item.timestamp * 1000).toLocaleString('pt-BR')}
              </Text>

              <Text style={styles.path} numberOfLines={2}>
                {item.uri}
              </Text>
            </View>

            <Pressable
              onPress={() => onDelete(item)}
              style={styles.deleteButton}
            >
              <Text style={styles.deleteButtonText}>Excluir</Text>
            </Pressable>
          </Pressable>
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
  card: {
    backgroundColor: '#111827',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#1f2937',
    padding: 14,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  name: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
    marginBottom: 6,
  },
  meta: {
    color: '#cbd5e1',
    fontSize: 12,
    marginBottom: 2,
  },
  path: {
    color: '#6b7280',
    fontSize: 11,
    marginTop: 8,
    lineHeight: 16,
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
