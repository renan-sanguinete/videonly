import React, { useCallback, useState } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useCustomAlert} from '../context/CustomAlertContext';
import {
  deleteVideoFromCameraRoll,
  loadSavedVideosFromCameraRoll,
} from '../utils/cameraRollVideos';
import {openVideoUri, shareVideo} from '../utils/videoActions';

function formatVideoDuration(secondsLike) {
  const totalSeconds = Math.max(0, Math.round(secondsLike || 0));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return [hours, minutes, seconds].map(value => String(value).padStart(2, '0')).join(':');
  }

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

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
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => onCardPress(item)}>
            <View style={styles.thumbWrap}>
              {item.thumbnailUri ? (
                <Image source={{uri: item.thumbnailUri}} style={styles.thumb} />
              ) : (
                <View style={[styles.thumb, styles.thumbFallback]}>
                  <Icon name="videocam-outline" size={26} color="#cbd5e1" />
                </View>
              )}
              <View style={styles.playBadge}>
                <Icon name="play" size={14} color="#fff" />
              </View>
              <View style={styles.durationBadge}>
                <Text style={styles.durationText}>{formatVideoDuration(item.duration)}</Text>
              </View>
            </View>

            <View style={styles.content}>
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
  content: {
    flex: 1,
  },
  thumbWrap: {
    width: 96,
    height: 96,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#172033',
    position: 'relative',
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  thumbFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(15,23,42,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationBadge: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    backgroundColor: 'rgba(2,6,23,0.78)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  durationText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
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
