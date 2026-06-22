import React, {createContext, useCallback, useContext, useEffect, useMemo} from 'react';

import {useCameraSettings} from '../context/CameraSettingsContext';
import {
  createTranslator,
  normalizeLanguage,
  setCurrentLanguage,
} from './translations';

const I18nContext = createContext(null);

export function I18nProvider({children}) {
  const {settings, setSettings} = useCameraSettings();
  const language = normalizeLanguage(settings.language);

  useEffect(() => {
    setCurrentLanguage(language);
  }, [language]);

  const setLanguage = useCallback(nextLanguage => {
    const normalizedLanguage = normalizeLanguage(nextLanguage);
    setSettings(prev => ({
      ...prev,
      language: normalizedLanguage,
    }));
  }, [setSettings]);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t: createTranslator(language),
    }),
    [language, setLanguage],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }

  return context;
}
