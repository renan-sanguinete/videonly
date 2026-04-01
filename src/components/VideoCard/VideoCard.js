import React from 'react';
import {Image, Pressable, Text, View} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import {
  formatDate,
  formatSize,
  formatVideoDuration,
} from '../../utils/videoFormatters';
import {styles} from './styles';

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

        {!compact ? (
          <Text style={styles.meta}>{formatDate(item.timestamp * 1000)}</Text>
        ) : null}
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
