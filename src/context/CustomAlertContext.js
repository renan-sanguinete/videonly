import React, {createContext, useCallback, useContext, useMemo, useState} from 'react';

import CustomAlertModal from '../components/CustomAlertModal/CustomAlertModal';

const CustomAlertContext = createContext(null);

function normalizeButtons(buttons) {
  if (Array.isArray(buttons) && buttons.length > 0) {
    return buttons;
  }

  return [{text: 'OK'}];
}

export function CustomAlertProvider({children}) {
  const [queue, setQueue] = useState([]);

  const showAlert = useCallback((title, message, buttons, options = {}) => {
    setQueue(currentQueue => [
      ...currentQueue,
      {
        id: `${Date.now()}-${Math.random()}`,
        title,
        message,
        buttons: normalizeButtons(buttons),
        options,
      },
    ]);
  }, []);

  const dismissCurrentAlert = useCallback(() => {
    setQueue(currentQueue => currentQueue.slice(1));
  }, []);

  const handleButtonPress = useCallback(
    button => {
      dismissCurrentAlert();

      if (typeof button?.onPress === 'function') {
        setTimeout(() => {
          button.onPress();
        }, 0);
      }
    },
    [dismissCurrentAlert],
  );

  const currentAlert = queue[0] ?? null;

  const handleBackdropPress = useCallback(() => {
    if (!currentAlert?.options?.cancelable) {
      return;
    }

    dismissCurrentAlert();
  }, [currentAlert, dismissCurrentAlert]);

  const value = useMemo(
    () => ({
      showAlert,
    }),
    [showAlert],
  );

  return (
    <CustomAlertContext.Provider value={value}>
      {children}
      <CustomAlertModal
        buttons={currentAlert?.buttons ?? [{text: 'OK'}]}
        cancelable={Boolean(currentAlert?.options?.cancelable)}
        message={currentAlert?.message}
        onBackdropPress={handleBackdropPress}
        onButtonPress={handleButtonPress}
        title={currentAlert?.title ?? ''}
        visible={Boolean(currentAlert)}
      />
    </CustomAlertContext.Provider>
  );
}

export function useCustomAlert() {
  const context = useContext(CustomAlertContext);

  if (!context) {
    throw new Error('useCustomAlert deve ser usado dentro de CustomAlertProvider');
  }

  return context;
}
