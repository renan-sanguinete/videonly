import React from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export default function LoadingModal({message, title, visible}) {
  return (
    <Modal animationType="fade" transparent visible={visible}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <ActivityIndicator color="#38bdf8" size="large" />
          <Text style={styles.title}>{title || 'Processando video'}</Text>
          <Text style={styles.message}>
            {message || 'Aguarde enquanto finalizamos o arquivo.'}
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.74)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 24,
    paddingVertical: 24,
    paddingHorizontal: 20,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.18)',
    alignItems: 'center',
  },
  title: {
    marginTop: 16,
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  message: {
    marginTop: 10,
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
