import React from 'react';
import {ActivityIndicator, Modal, Text, View} from 'react-native';

import {cinematicTheme} from '../../theme/cinematicTheme';
import {useI18n} from '../../i18n/I18nContext';
import {styles} from './styles';

const {colors} = cinematicTheme;

export default function LoadingModal({message, title, visible}) {
  const {t} = useI18n();

  return (
    <Modal animationType="fade" transparent visible={visible}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <ActivityIndicator color={colors.accent} size="large" />
          <Text style={styles.title}>
            {title || t('loading.defaultTitle')}
          </Text>
          <Text style={styles.message}>
            {message || t('loading.defaultMessage')}
          </Text>
        </View>
      </View>
    </Modal>
  );
}
