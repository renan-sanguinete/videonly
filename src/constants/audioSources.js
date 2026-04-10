export const AUDIO_SOURCE_OPTIONS = [
  {
    value: 0,
    key: 'DEFAULT',
    label: 'Padrao',
    shortLabel: 'Padrao',
    description: 'Processamento automatico do Android.',
    helper: 'Bom para uso geral quando voce nao precisa controlar o pipeline de audio.',
    isRecommended: false,
  },
  {
    value: 1,
    key: 'MIC',
    label: 'Microfone',
    shortLabel: 'Mic',
    description: 'Captura do microfone com ajustes do sistema.',
    helper: 'Pode aplicar ganho automatico, cancelamento de eco e supressao de ruido.',
    isRecommended: false,
  },
  {
    value: 5,
    key: 'CAMCORDER',
    label: 'Camera',
    shortLabel: 'Camera',
    description: 'Modo otimizado para gravacao casual de video.',
    helper: 'Costuma soar bem em cenarios comuns, mas pode achatar dinamica em ambientes muito altos.',
    isRecommended: false,
  },
  {
    value: 6,
    key: 'VOICE_RECOGNITION',
    label: 'Reconhecimento de voz',
    shortLabel: 'Voz',
    description: 'Favorece fala e inteligibilidade.',
    helper: 'Nao e indicado para musica alta ou ambientes com muito grave.',
    isRecommended: false,
  },
  {
    value: 9,
    key: 'UNPROCESSED',
    label: 'Sem processamento',
    shortLabel: 'Sem proc.',
    description: 'Captura o audio mais puro possivel do microfone.',
    helper: 'Melhor escolha para shows, baladas e lugares com alto SPL. Requer Android 7.0+.',
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
