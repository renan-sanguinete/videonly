import React from 'react';
import {Image, Pressable, Text, View} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import {
  formatFriendlyDate,
  formatSize,
  formatVideoDuration,
} from '../../utils/videoFormatters';
import {cinematicTheme} from '../../theme/cinematicTheme';
import {styles} from './styles';

const {colors} = cinematicTheme;

export default function VideoCard({
  item,
  onPress,
  action,
  compact = false,
  disabled = false,
  selected = false,
  showDurationLabel = false,
  style,
}) {
  return (
    <Pressable
      disabled={disabled}
      style={[
        compact ? styles.compactCard : styles.card,
        selected ? styles.selectedCard : null,
        style,
      ]}
      onPress={onPress}>
      <View style={[compact ? styles.compactThumbWrap : styles.thumbWrap]}>
        {item.thumbnailUri ? (
          <Image source={{uri: item.thumbnailUri}} style={styles.thumb} />
        ) : (
          <View style={[styles.thumb, styles.thumbFallback]}>
            <Icon
              name="videocam-outline"
              size={compact ? 22 : 26}
              color={colors.mutedForeground}
            />
          </View>
        )}
        <View style={styles.playBadge}>
          <Icon name="play" size={compact ? 12 : 14} color={colors.foreground} />
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
            {formatFriendlyDate(item.timestamp ? item.timestamp * 1000 : null)}
          </Text>
        ) : null}

        {!compact ? (
          <Text style={styles.meta}>
            {showDurationLabel
              ? `${formatVideoDuration(item.duration)} • ${formatSize(item.size)}`
              : formatSize(item.size)}
          </Text>
        ) : null}
      </View>

      {action || null}
    </Pressable>
  );
}
