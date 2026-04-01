import React from 'react';
import {Image, Pressable, StyleSheet, Text, View} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import {
  formatDate,
  formatSize,
  formatVideoDuration,
} from '../utils/videoFormatters';

export default function VideoCard({
  item,
  onPress,
  action,
  compact = false,
  showPath = false,
  showDurationLabel = false,
  style,
}) {
  return (
    <Pressable
      style={[compact ? styles.compactCard : styles.card, style]}
      onPress={onPress}>
      <View style={[compact ? styles.compactThumbWrap : styles.thumbWrap]}>
        {item.thumbnailUri ? (
          <Image source={{uri: item.thumbnailUri}} style={styles.thumb} />
        ) : (
          <View style={[styles.thumb, styles.thumbFallback]}>
            <Icon
              name="videocam-outline"
              size={compact ? 22 : 26}
              color="#cbd5e1"
            />
          </View>
        )}
        <View style={styles.playBadge}>
          <Icon name="play" size={compact ? 12 : 14} color="#fff" />
        </View>
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>
            {formatVideoDuration(item.duration)}
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        {!compact ? (
          <Text style={styles.name} numberOfLines={1}>
            {item.filename || 'Sem nome'}
          </Text>
        ) : null}

        {showDurationLabel ? (
          <Text style={styles.meta}>Duração: {Math.round(item.duration || 0)}s</Text>
        ) : null}

        {!compact ? <Text style={styles.meta}>{formatDate(item.timestamp * 1000)}</Text> : null}
        {compact ? <Text style={styles.meta}>{formatSize(item.size)}</Text> : null}
        {compact ? (
          <Text style={styles.meta}>
            {formatDate(item.mtime || item.timestamp * 1000)}
          </Text>
        ) : null}

        {showPath ? (
          <Text style={styles.path} numberOfLines={2}>
            {item.uri}
          </Text>
        ) : null}
      </View>

      {action || null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
  compactCard: {
    width: 200,
    backgroundColor: '#0f172a',
    borderRadius: 18,
    padding: 10,
    borderWidth: 1,
    borderColor: '#243244',
    overflow: 'hidden',
  },
  thumbWrap: {
    width: 96,
    height: 96,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#172033',
    position: 'relative',
  },
  compactThumbWrap: {
    height: 92,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#172033',
    marginBottom: 10,
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
  content: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
    marginBottom: 4,
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
});
