export const MEDIA_OPTIMIZATION_MODES = [
  {
    value: 'none',
    label: 'Desativado',
    shortLabel: 'Desativado',
    description: 'Mantém o arquivo como foi gravado.',
    helper: 'Sem compressão e sem correção de áudio.',
    iconColor: '#ffffff',
    icon: 'power-outline',
  },
  {
    value: 'video',
    label: 'Vídeo',
    shortLabel: 'Vídeo',
    description: 'Comprime o vídeo antes de salvar.',
    helper: 'Bom para reduzir tamanho sem mexer no áudio.',
    iconColor: '#60a5fa',
    icon: 'videocam-outline',
  },
  {
    value: 'audio',
    label: 'Áudio',
    shortLabel: 'Áudio',
    description: 'Corrige o áudio sem comprimir o vídeo.',
    helper: 'Mais leve e rápido que a compressão completa.',
    iconColor: '#4ade80',
    icon: 'mic-outline',
  },
  {
    value: 'both',
    label: 'Vídeo + Áudio',
    shortLabel: 'V+Á',
    description: 'Comprime o vídeo e corrige o áudio juntos.',
    helper: 'Maior proteção, porém mais demorado.',
    iconColor: '#f87171',
    icon: 'layers-outline',
  },
];

export function getMediaOptimizationModeOption(value) {
  return (
    MEDIA_OPTIMIZATION_MODES.find(option => option.value === value) ??
    MEDIA_OPTIMIZATION_MODES[0]
  );
}

export function getMediaOptimizationPatch(value) {
  const mode = getMediaOptimizationModeOption(value).value;

  return {
    optimizationMode: mode,
    compressVideoBeforeSave: mode === 'video' || mode === 'both',
    applyAudioCleanup: mode === 'audio' || mode === 'both',
  };
}

export function applyMediaOptimizationMode(settings, value) {
  return {
    ...settings,
    ...getMediaOptimizationPatch(value),
  };
}

export function getDerivedMediaOptimizationMode(settings) {
  if (settings.optimizationMode) {
    return getMediaOptimizationModeOption(settings.optimizationMode).value;
  }

  if (settings.applyAudioCleanup && !settings.compressVideoBeforeSave) {
    return 'audio';
  }

  if (settings.compressVideoBeforeSave) {
    return settings.applyAudioCleanup ? 'both' : 'video';
  }

  return 'none';
}
