import React from 'react';
import {ActivityIndicator, Modal, Text, View} from 'react-native';

import {cinematicTheme} from '../../theme/cinematicTheme';
import {styles} from './styles';

const {colors} = cinematicTheme;

export default function LoadingModal({message, title, visible}) {
  return (
    <Modal animationType="fade" transparent visible={visible}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <ActivityIndicator color={colors.accent} size="large" />
          <Text style={styles.title}>{title || 'Processando video'}</Text>
          <Text style={styles.message}>
            {message || 'Aguarde enquanto finalizamos o arquivo.'}
          </Text>
        </View>
      </View>
    </Modal>
  );
}
