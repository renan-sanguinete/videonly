export const AUDIO_SOURCE_OPTIONS = [
  {
    value: 0,
    key: 'DEFAULT',
    label: 'Padrão',
    shortLabel: 'Padrão',
    description: 'Processamento automático.',
    helper: 'Bom para uso geral quando você não precisa de muito controle do áudio.',
    isRecommended: false,
  },
  {
    value: 1,
    key: 'MIC',
    label: 'Microfone',
    shortLabel: 'Mic',
    description: 'Captura do microfone com ajustes do sistema.',
    helper: 'Pode aplicar ganho automático, cancelamento de eco e supressão de ruído.',
    isRecommended: false,
  },
  {
    value: 5,
    key: 'CAMCORDER',
    label: 'Camera',
    shortLabel: 'Camera',
    description: 'Modo otimizado para gravação casual de vídeo.',
    helper: 'Costuma ser bom em cenários comuns, mas pode achatar dinâmica em ambientes muito altos.',
    isRecommended: false,
  },
  {
    value: 6,
    key: 'VOICE_RECOGNITION',
    label: 'Reconhecimento de voz',
    shortLabel: 'Voz',
    description: 'Favorece fala e inteligibilidade.',
    helper: 'Não é indicado para música alta ou ambientes com muito grave.',
    isRecommended: false,
  },
  {
    value: 9,
    key: 'UNPROCESSED',
    label: 'Sem processamento',
    shortLabel: 'Sem proc.',
    description: 'Captura o áudio mais puro possível do microfone.',
    helper: 'Melhor escolha para shows, baladas e lugares com som alto.',
    isRecommended: true,
  },
];

export const UNPROCESSED_AUDIO_SOURCE = 9;

export function getAudioSourceOption(value) {
  return (
    AUDIO_SOURCE_OPTIONS.find(option => option.value === value) ??
    AUDIO_SOURCE_OPTIONS.find(option => option.value === UNPROCESSED_AUDIO_SOURCE) ??
    AUDIO_SOURCE_OPTIONS[0]
  );
}
