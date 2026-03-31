import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

function getButtonTone(style, isOnlyButton, isStacked) {
  const layoutStyle = isStacked ? styles.buttonStacked : styles.buttonInline;

  if (style === 'destructive') {
    return {
      button: [styles.buttonBase, layoutStyle, styles.destructiveButton],
      text: [styles.buttonText, styles.destructiveButtonText],
    };
  }

  if (style === 'cancel') {
    return {
      button: [styles.buttonBase, layoutStyle, styles.secondaryButton],
      text: [styles.buttonText, styles.secondaryButtonText],
    };
  }

  return {
    button: [
      styles.buttonBase,
      layoutStyle,
      isOnlyButton ? styles.primaryButton : styles.secondaryButton,
    ],
    text: [
      styles.buttonText,
      isOnlyButton ? styles.primaryButtonText : styles.secondaryButtonText,
    ],
  };
}

export default function CustomAlertModal({
  buttons,
  cancelable,
  message,
  onBackdropPress,
  onButtonPress,
  title,
  visible,
}) {
  const hasMultipleButtons = buttons.length > 2;

  return (
    <Modal
      animationType="fade"
      onRequestClose={cancelable ? onBackdropPress : undefined}
      transparent
      visible={visible}>
      <View style={styles.overlay}>
        <Pressable
          disabled={!cancelable}
          onPress={onBackdropPress}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            {message ? <Text style={styles.message}>{message}</Text> : null}
          </View>

          <View
            style={[
              styles.actions,
              hasMultipleButtons ? styles.actionsColumn : styles.actionsRow,
            ]}>
            {buttons.map((button, index) => {
              const tone = getButtonTone(
                button.style,
                buttons.length === 1,
                hasMultipleButtons,
              );

              return (
                <Pressable
                  key={`${button.text || 'button'}-${index}`}
                  onPress={() => onButtonPress(button)}
                  style={tone.button}>
                  <Text style={tone.text}>{button.text || 'OK'}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 28,
    padding: 22,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.18)',
    shadowColor: '#020617',
    shadowOpacity: 0.38,
    shadowRadius: 28,
    shadowOffset: {width: 0, height: 18},
    elevation: 18,
  },
  header: {
    gap: 10,
  },
  title: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  message: {
    color: '#cbd5e1',
    fontSize: 15,
    lineHeight: 22,
  },
  actions: {
    marginTop: 24,
    gap: 10,
  },
  actionsRow: {
    flexDirection: 'row',
  },
  actionsColumn: {
    flexDirection: 'column',
  },
  buttonBase: {
    minHeight: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  buttonInline: {
    flex: 1,
  },
  buttonStacked: {
    width: '100%',
    flexShrink: 1,
  },
  primaryButton: {
    backgroundColor: '#22c55e',
  },
  secondaryButton: {
    backgroundColor: '#172033',
    borderWidth: 1,
    borderColor: '#334155',
  },
  destructiveButton: {
    backgroundColor: '#7f1d1d',
    borderWidth: 1,
    borderColor: '#b91c1c',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '800',
  },
  primaryButtonText: {
    color: '#052e16',
  },
  secondaryButtonText: {
    color: '#f8fafc',
  },
  destructiveButtonText: {
    color: '#fee2e2',
  },
});
