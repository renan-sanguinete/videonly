import React from 'react';
import {Modal, Pressable, StyleSheet, Text, View} from 'react-native';

import {styles} from './styles';

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
