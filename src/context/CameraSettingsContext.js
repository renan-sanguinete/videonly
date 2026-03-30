import React, {createContext, useContext, useMemo, useState} from 'react';

const CameraSettingsContext = createContext(null);

const DEFAULT_SETTINGS = {
  audio: true,
  recordFileType: 'mp4',
  recordVideoCodec: 'h264',
  photo: false,
  video: true,
  enableZoomGesture: true,
  preview: true,
  lowLightBoost: false,
  videoHdr: false,
  photoHdr: false,
  torch: 'off',
  resizeMode: 'cover',
  videoBitRate: 'normal',
  photoQualityBalance: 'balanced',
  fps: '',
  zoom: '',
  exposure: '',
  formatIndex: '',
};

export function CameraSettingsProvider({children}) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  const value = useMemo(
    () => ({
      settings,
      setSettings,
      resetSettings: () => setSettings(DEFAULT_SETTINGS),
    }),
    [settings],
  );

  return (
    <CameraSettingsContext.Provider value={value}>
      {children}
    </CameraSettingsContext.Provider>
  );
}

export function useCameraSettings() {
  const context = useContext(CameraSettingsContext);
  if (!context) {
    throw new Error('useCameraSettings deve ser usado dentro de CameraSettingsProvider');
  }
  return context;
}
