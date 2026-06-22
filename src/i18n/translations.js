import {NativeModules, Platform} from 'react-native';

export const DEFAULT_LANGUAGE = 'en';
export const BRAZILIAN_PORTUGUESE = 'pt-BR';
export const SUPPORTED_LANGUAGES = [BRAZILIAN_PORTUGUESE, 'en'];

const IOS_SETTINGS = NativeModules.SettingsManager?.settings;

function getDeviceLocale() {
  if (Platform.OS === 'ios') {
    const locale =
      IOS_SETTINGS?.AppleLocale ||
      IOS_SETTINGS?.AppleLanguages?.[0] ||
      IOS_SETTINGS?.NSLanguages?.[0];

    if (locale) {
      return locale;
    }
  }

  const locale =
    NativeModules.I18nManager?.localeIdentifier ||
    NativeModules.PlatformConstants?.locale ||
    NativeModules.PlatformConstants?.reactNativeVersion?.locale;

  if (locale) {
    return locale;
  }

  try {
    return Intl.DateTimeFormat().resolvedOptions().locale;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

export function detectDeviceLanguage() {
  const locale = String(getDeviceLocale() ?? '').replace('_', '-');
  const normalizedLocale = locale.toLowerCase();

  if (
    normalizedLocale === 'pt-br' ||
    normalizedLocale.endsWith('-br') ||
    normalizedLocale.includes('brasil') ||
    normalizedLocale.includes('brazil')
  ) {
    return BRAZILIAN_PORTUGUESE;
  }

  return DEFAULT_LANGUAGE;
}

export function normalizeLanguage(value) {
  return SUPPORTED_LANGUAGES.includes(value) ? value : detectDeviceLanguage();
}

export const translations = {
  [BRAZILIAN_PORTUGUESE]: {
    'common.ok': 'OK',
    'common.cancel': 'Cancelar',
    'common.delete': 'Excluir',
    'common.close': 'Fechar',
    'common.open': 'Abrir',
    'common.save': 'Salvar',
    'common.edit': 'Editar',
    'common.replace': 'Substituir',
    'common.back': 'Voltar',
    'common.error': 'Erro',
    'common.audio': 'Áudio',
    'common.video': 'Vídeo',
    'common.videoAudioShort': 'V+A',
    'common.optimize': 'Otimizar',
    'common.shareShort': 'Compart.',
    'common.camera': 'Câmera',
    'common.file': 'Arquivo',
    'common.front': 'frontal',
    'common.backCamera': 'traseira',
    'common.automatic': 'Automático',
    'common.manual': 'Manual',
    'common.normal': 'normal',
    'common.none': 'Nenhum',

    'language.ptBR': 'Português (Brasil)',
    'language.en': 'English',

    'media.none.label': 'Desativado',
    'media.none.shortLabel': 'Desativado',
    'media.none.description': 'Mantém o arquivo como foi gravado.',
    'media.none.helper': 'Sem compressão e sem correção de áudio.',
    'media.video.label': 'Vídeo',
    'media.video.shortLabel': 'Vídeo',
    'media.video.description': 'Comprime o vídeo antes de salvar.',
    'media.video.helper': 'Bom para reduzir tamanho sem mexer no áudio.',
    'media.audio.label': 'Áudio',
    'media.audio.shortLabel': 'Áudio',
    'media.audio.description': 'Corrige o áudio sem comprimir o vídeo.',
    'media.audio.helper': 'Mais leve e rápido que a compressão completa.',
    'media.both.label': 'Vídeo + Áudio',
    'media.both.shortLabel': 'V+Á',
    'media.both.description': 'Comprime o vídeo e corrige o áudio juntos.',
    'media.both.helper': 'Maior proteção, porém mais demorado.',

    'audioSource.default.label': 'Padrão',
    'audioSource.default.shortLabel': 'Padrão',
    'audioSource.default.description': 'Processamento automático.',
    'audioSource.default.helper':
      'Bom para uso geral quando você não precisa de muito controle do áudio.',
    'audioSource.mic.label': 'Microfone',
    'audioSource.mic.shortLabel': 'Mic',
    'audioSource.mic.description':
      'Captura do microfone com ajustes do sistema.',
    'audioSource.mic.helper':
      'Pode aplicar ganho automático, cancelamento de eco e supressão de ruído.',
    'audioSource.camera.label': 'Câmera',
    'audioSource.camera.shortLabel': 'Câmera',
    'audioSource.camera.description':
      'Modo otimizado para gravação casual de vídeo.',
    'audioSource.camera.helper':
      'Costuma ser bom em cenários comuns, mas pode achatar dinâmica em ambientes muito altos.',
    'audioSource.voice.label': 'Reconhecimento de voz',
    'audioSource.voice.shortLabel': 'Voz',
    'audioSource.voice.description': 'Favorece fala e inteligibilidade.',
    'audioSource.voice.helper':
      'Não é indicado para música alta ou ambientes com muito grave.',
    'audioSource.unprocessed.label': 'Sem processamento',
    'audioSource.unprocessed.shortLabel': 'Sem proc.',
    'audioSource.unprocessed.description':
      'Captura o áudio mais puro possível do microfone.',
    'audioSource.unprocessed.helper':
      'Recomendado e melhor escolha para shows, baladas e lugares com som alto.',

    'audioProfile.standard.label': 'Padrão',
    'audioProfile.standard.description':
      'Mais neutro para uso geral e ambientes normais.',
    'audioProfile.liveSafe.label': 'Show ao vivo',
    'audioProfile.liveSafe.description':
      'Prioriza menos processamento e prepara o áudio para correção ao salvar.',
    'audioProfile.custom.label': 'Personalizado',
    'audioProfile.custom.description':
      'Mantém os ajustes manuais escolhidos por você.',
    'audioProfile.savedCustom.description':
      'Perfil personalizado salvo em uso.',

    'audioRisk.off.title': 'Áudio desativado',
    'audioRisk.off.description':
      'A gravação está configurada sem captação de áudio.',
    'audioRisk.low.title': 'Risco reduzido',
    'audioRisk.low.cleanupDescription':
      'Sem processamento, em mono e com correção no salvamento: a configuração mais segura do app para preservar dinâmica e segurar graves fortes.',
    'audioRisk.low.description':
      'Sem processamento e em mono: melhor combinação atual do app para preservar dinâmica e segurar graves fortes.',
    'audioRisk.medium.title': 'Risco moderado',
    'audioRisk.medium.cleanupDescription':
      'A fonte sem processamento ajuda bastante e a correção no salvamento reduz o risco de clipping, mas mono ainda costuma ser mais seguro em ambientes extremos.',
    'audioRisk.medium.description':
      'A fonte sem processamento ajuda bastante, mas mono ainda costuma ser mais seguro em ambientes extremos.',
    'audioRisk.high.title': 'Risco alto',
    'audioRisk.high.cleanupDescription':
      'A fonte atual pode aplicar AGC, compressão ou redução de ruído. A correção no salvamento ajuda, mas ainda há risco de clipping e graves embolados.',
    'audioRisk.high.description':
      'A fonte atual pode aplicar AGC, compressão ou redução de ruído. Isso aumenta o risco de clipping e graves embolados.',

    'limiter.standard.label': 'Padrão',
    'limiter.standard.description':
      'Equilibra redução leve de ruído, suavização de clipping e limitador.',
    'limiter.gentle.label': 'Suave',
    'limiter.gentle.description':
      'Aplica correções discretas, preservando mais dinâmica.',
    'limiter.strong.label': 'Forte',
    'limiter.strong.description':
      'Reforça redução de ruído baixo e suavização de picos clipados.',

    'recording.normal.label': 'Normal',
    'recording.slowMotion.label': 'Câmera lenta',
    'recording.timelapse.label': 'Time-lapse',

    'settings.title': 'Configurações',
    'settings.subtitle':
      'Ajuste o comportamento de captura, os perfis de áudio e os formatos de gravação.',
    'settings.section.capture': 'Captura',
    'settings.section.behavior': 'Interação e comportamento',
    'settings.section.format': 'Formato e imagem',
    'settings.section.visualControls': 'Controles visuais',
    'settings.section.audio': 'Áudio',
    'settings.section.recording': 'Gravação',
    'settings.section.additional': 'Opções adicionais',
    'settings.language.label': 'Idioma',
    'settings.audio.enabled.label': 'Áudio',
    'settings.audio.enabled.description':
      'Habilita gravação com áudio. Exige permissão de microfone.',
    'settings.zoomGesture.label': 'Zoom por gesto',
    'settings.zoomGesture.description':
      'Ativa o gesto de pinça para controlar o zoom.',
    'settings.lowLightBoost.label': 'Reforço em pouca luz',
    'settings.lowLightBoost.description':
      'Pode ajudar em ambientes escuros.',
    'settings.resizeMode.label': 'Modo de enquadramento',
    'settings.videoBitRate.label': 'Taxa de bits do vídeo',
    'settings.fps.label': 'FPS',
    'settings.zoom.label': 'Zoom',
    'settings.exposure.label': 'Exposição',
    'settings.exposure.description': 'Padrão: 0 EV',
    'settings.visualDefaults': 'Padrões dos controles',
    'settings.optimize.label': 'Otimizar',
    'settings.captureSettings.label': 'Configurações de captação',
    'settings.audioCodec.label': 'Codec de áudio',
    'settings.channels.label': 'Canais',
    'settings.sampleRate.label': 'Taxa de amostragem',
    'settings.audioGain.label': 'Ganho de áudio',
    'settings.audioBitRate.label': 'Taxa de bits do áudio (kbps)',
    'settings.audioBitRate.placeholder': 'ex.: 128',
    'settings.showAudioStatus.label': 'Mostrar status de áudio',
    'settings.showAudioStatus.description':
      'Exibe durante a gravação o banner com a fonte de áudio e risco de processamento.',
    'settings.showVu.label': 'Mostrar barra VU',
    'settings.showVu.description':
      'Exibe, antes e durante a gravação, uma barra de nível de áudio na parte inferior da tela.',
    'settings.normalizeVolume.label': 'Normalizar volume',
    'settings.normalizeVolume.description':
      'Ajusta o volume ao salvar com base na análise do áudio gravado.',
    'settings.limiter.label': 'Limitador',
    'settings.activeSource.title': 'Fonte ativa: {{source}}',
    'settings.activeSource.safe':
      'Modo recomendado para reduzir distorções e preservar dinâmica em ambientes com muito volume.',
    'settings.activeSource.warning':
      'Esta fonte pode aplicar processamento automático. Em shows e baladas, isso aumenta o risco de distorção e som abafado.',
    'settings.optimization.title': 'Otimização: {{mode}}',
    'settings.videoResolution.label': 'Resolução de vídeo',
    'settings.fileFormat.label': 'Formato do arquivo',
    'settings.videoCodec.label': 'Codec de vídeo',
    'settings.exportMetadata': 'Exportar metadados',
    'settings.exporting': 'Exportando...',
    'settings.deleteMetadata': 'Apagar metadados',
    'settings.restoreDefaults': 'Restaurar padrões',
    'settings.noMetadata.title': 'Sem metadados',
    'settings.noMetadata.message':
      'Ainda não há arquivos de metadados salvos para exportar.',
    'settings.exportMetadata.errorTitle': 'Erro ao exportar metadados',
    'settings.exportMetadata.errorMessage':
      'Não foi possível gerar o arquivo de exportação.',
    'settings.deleteMetadata.title': 'Apagar metadados',
    'settings.deleteMetadata.message':
      'Isso vai excluir todos os arquivos de metadados salvos no aparelho. Deseja continuar?',
    'settings.deleteMetadata.successTitle': 'Metadados apagados',
    'settings.deleteMetadata.deleted':
      '{{count}} arquivo{{plural}} de metadados {{verb}} excluído{{plural}}.',
    'settings.deleteMetadata.empty':
      'Não havia arquivos de metadados para excluir.',
    'settings.deleteMetadata.errorTitle': 'Erro ao apagar metadados',
    'settings.deleteMetadata.errorMessage':
      'Não foi possível excluir os metadados.',
    'settings.bitRate.extraLow': 'extra baixo',
    'settings.bitRate.low': 'baixo',
    'settings.bitRate.normal': 'normal',
    'settings.bitRate.high': 'alto',
    'settings.bitRate.extraHigh': 'extra alto',
    'settings.resize.cover': 'Preencher',
    'settings.resize.contain': 'Ajustar',
    'settings.channel.stereo': 'Estéreo (2 canais)',
    'settings.channel.mono': 'Mono (1 canal)',
    'settings.codec.mp3': 'MP3 (usa AAC como alternativa no Android)',
    'settings.gain.default': 'Padrão (0 dB)',
    'settings.gain.reduced': 'Reduzido (-6 dB)',
    'settings.gain.live': 'Show ao vivo (-9 dB)',
    'settings.gain.maxReduced': 'Máximo reduzido (-12 dB)',

    'audioSourcePicker.title': 'Fonte de áudio',
    'audioSourcePicker.infoTitle': 'Proteção contra clipping',
    'audioSourcePicker.infoText':
      'Nesta fase, a melhor prevenção é combinar Sem processamento com captação em mono. Isso reduz o risco de áudio abafado, graves cortados e distorção em ambientes de alto volume.',

    'header.optimize': 'Otimizar',
    'header.closeOptimization': 'Fechar otimização',
    'header.recordingMode': 'Modo de gravação',
    'header.videoResolution': 'Resolução de vídeo',
    'header.analyzeAmbient': 'Analisar som ambiente',
    'header.closeAmbientAnalysis': 'Fechar análise de ambiente',
    'header.ambientDescription':
      'Analisa o ambiente por 10 segundos e sugere a melhor configuração de captação.',
    'header.startAnalysis': 'Iniciar análise',
    'header.openAmbientAnalysis': 'Abrir análise de ambiente',
    'header.toggleFlash': 'Alternar flash',
    'header.openOptimization': 'Abrir otimização',
    'header.openGallery': 'Abrir galeria',
    'header.openSettings': 'Abrir configurações',

    'camera.loadingSettings': 'Carregando configurações...',
    'camera.initializing': 'Inicializando câmera e permissões...',
    'camera.permissionTitle': 'Videonly',
    'camera.permissionMessage':
      'O app precisa de permissão para acessar a câmera, áudio e galeria.',
    'camera.permissionHint':
      'Vá para as configurações e habilite as permissões.',
    'camera.openSettings': 'Abrir configurações',
    'camera.processingWait': 'Aguarde...',
    'camera.analyzingAmbient': 'Analisando ambiente',
    'camera.analysisProgress':
      '{{percent}}% concluído · {{seconds}}s restantes',
    'camera.deletingSelectedMessage':
      'Aguarde enquanto removemos o vídeo selecionado.',
    'camera.deletingSelectedTitle': 'Excluindo vídeo',
    'camera.preparingCamera': 'Preparando câmera...',
    'camera.videos': 'Vídeos',
    'camera.viewAll': 'Ver todos →',
    'camera.vuPreview': 'Prévia VU',
    'camera.clip': 'CLIP',
    'camera.vuHighPeak':
      'Pico alto. Reduza ganho ou use o perfil Show ao vivo.',
    'camera.vuSafe':
      'Prévia do ambiente antes de gravar. Verde indica zona segura.',
    'camera.loadingVideos': 'Carregando vídeos...',
    'camera.noSavedVideos': 'Nenhum vídeo salvo ainda.',
    'camera.searchingCamera': 'Buscando câmera {{camera}}...',
    'camera.noCompatibleCamera':
      'Se o aparelho não tiver câmera compatível, nada será exibido.',
    'camera.audioStatusTitle': 'Áudio: {{source}} · {{risk}}',
    'camera.audioCleanupActive':
      'Correção de áudio no salvamento: ativa',
    'camera.audioMenu.capture': 'Captação',
    'camera.openCaptureSettings': 'Abrir configurações de captação',
    'camera.toggleCamera': 'Alternar para câmera {{camera}}',
    'camera.profileNamePlaceholder': 'Nome do perfil',
    'camera.renameProfile': 'Renomear perfil',
    'camera.saveProfile': 'Salvar perfil',
    'camera.profileNameRequired':
      'Informe um nome para salvar o perfil.',
    'camera.replaceProfile.title': 'Substituir perfil',
    'camera.replaceProfile.message':
      'Deseja substituir "{{name}}" pela configuração personalizada atual?',
    'camera.deleteProfile.title': 'Apagar perfil',
    'camera.deleteProfile.message': 'Deseja apagar "{{name}}"?',
    'camera.savedProfiles': 'Perfis',
    'camera.saveCurrentSettings': 'Salvar configuração',
    'camera.saveCurrentSettingsDescription':
      'Guarda os ajustes atuais como um novo perfil.',
    'camera.profileLimitReached': 'Limite atingido',
    'camera.profileLimitDescription':
      'Substitua ou apague um perfil para salvar outro.',
    'camera.profileActive': 'Perfil ativo.',
    'camera.profileTapToUse': 'Toque para usar este perfil.',
    'camera.noSavedProfiles': 'Nenhum perfil salvo ainda.',
    'camera.enableAudio': 'Habilitar áudio',
    'camera.enableAudioDescription':
      'Volta a gravar com áudio usando a configuração atual.',
    'camera.keepAudioOff': 'Manter desativado',
    'camera.keepAudioOffDescription':
      'Continua gravando sem captação de áudio.',

    'camera.loading.slowMotion': 'Criando câmera lenta',
    'camera.loading.timelapse': 'Criando time-lapse',
    'camera.loading.audio': 'Otimizando áudio',
    'camera.loading.both': 'Otimizando vídeo e áudio',
    'camera.loading.video': 'Otimizando vídeo',
    'camera.analysisComplete.title': 'Análise concluída',
    'camera.analysisComplete.message':
      'Não foi possível gerar uma sugestão. Tente novamente com o ambiente estável.',
    'camera.suggestion.title': 'Sugestão pronta',
    'camera.suggestion.rms': 'Média RMS: {{value}}',
    'camera.suggestion.averagePeak': 'Pico médio: {{value}}',
    'camera.suggestion.maxPeak': 'Pico máximo: {{value}}',
    'camera.suggestion.clipping': 'Clipping: {{value}}',
    'camera.suggestion.limiter': 'Limitador: {{value}}',
    'camera.suggestion.volumeOn': 'Normalização de volume: ativa',
    'camera.suggestion.volumeOff':
      'Normalização de volume: desativada',
    'camera.suggestion.keep': 'Manter atual',
    'camera.suggestion.apply': 'Aplicar sugestão',
    'camera.analysisUnavailable.title': 'Análise indisponível',
    'camera.analysisUnavailable.message':
      'Não foi possível iniciar a análise agora. Tente novamente em instantes.',
    'camera.permissions.title': 'Permissões necessárias',
    'camera.permissions.withAudio':
      'Você precisa permitir câmera, microfone e acesso à galeria para gravar e salvar vídeos com áudio.',
    'camera.permissions.withoutAudio':
      'Você precisa permitir câmera e acesso à galeria para gravar e salvar vídeos.',
    'camera.manageMedia.title': 'Permissão de gerenciamento de mídia',
    'camera.manageMedia.message':
      'Para obter acesso de exclusão de mídia, habilite o acesso em "Gerenciar mídia".',
    'camera.manageMedia.extraTitle': 'Permissão extra para excluir',
    'camera.manageMedia.extraMessage':
      'Sem o acesso especial "Gerenciar mídia", o Android pode continuar mostrando uma confirmação adicional ao excluir vídeos.',
    'camera.notNow': 'Agora não',
    'camera.effectUnavailable': 'Efeito indisponível',
    'camera.optimizationUnavailable': 'Otimização indisponível',
    'camera.effectFallback':
      'Não foi possível aplicar o efeito neste vídeo. A versão original foi salva normalmente.',
    'camera.optimizationFallback':
      'Não foi possível otimizar este vídeo. A versão original foi salva normalmente.',
    'camera.processErrorTitle': 'Erro ao processar vídeo',
    'camera.processErrorMessage':
      'Não foi possível otimizar nem salvar o vídeo original.',
    'camera.saveErrorTitle': 'Erro ao salvar vídeo',
    'camera.saveErrorMessage':
      'Não foi possível salvar o vídeo na galeria.',
    'camera.finishErrorMessage':
      'Não foi possível finalizar o vídeo gravado.',
    'camera.recordingErrorTitle': 'Erro de gravação',
    'camera.recordingErrorMessage': 'Não foi possível gravar o vídeo.',
    'camera.startRecordingError': 'Falha ao iniciar a gravação.',
    'camera.stopRecordingError': 'Falha ao parar a gravação.',
    'camera.openSettingsErrorTitle':
      'Não foi possível abrir as configurações',
    'camera.openSettingsErrorMessage':
      'Abra as configurações do app manualmente e permita câmera, microfone e galeria para continuar.',
    'camera.openVideoErrorTitle': 'Erro ao abrir vídeo',
    'camera.openVideoErrorMessage':
      'Não foi possível abrir este vídeo.',
    'camera.shareVideoErrorTitle': 'Erro ao compartilhar',
    'camera.shareVideoErrorMessage':
      'Não foi possível compartilhar este vídeo.',
    'camera.deleteVideoErrorMessage':
      'Não foi possível excluir este vídeo.',
    'camera.deleteVideoTitle': 'Excluir vídeo',
    'camera.deleteVideoMessage': 'Excluir o vídeo selecionado?',
    'camera.optimizationDoneTitle': 'Otimização concluída',
    'camera.optimizationDoneMessage':
      'Uma nova cópia otimizada foi salva. O vídeo original foi mantido.',

    'library.filter.all': 'Todos',
    'library.filter.today': 'Hoje',
    'library.filter.week': 'Esta semana',
    'library.filter.gallery': 'Galeria',
    'library.title': 'Biblioteca',
    'library.savedVideos': 'Vídeos salvos',
    'library.deleteSelected': 'Excluir vídeos selecionados',
    'library.loadingDeleteTitle': 'Excluindo vídeos',
    'library.loadingDeleteDefault':
      'Aguarde enquanto removemos os vídeos selecionados.',
    'library.loadingDeleteProgress':
      'Removendo {{current}} de {{total}} vídeos selecionados.',
    'library.optimizingCopy':
      'Uma nova cópia será salva. O vídeo original será mantido.',
    'library.loadErrorTitle': 'Erro ao carregar vídeos',
    'library.loadErrorMessage':
      'Não foi possível carregar os vídeos da galeria.',
    'library.deleteSelectedError':
      'Não foi possível excluir os vídeos selecionados.',
    'library.deleteSelectedTitle': 'Excluir vídeos',
    'library.deleteOneMessage': 'Excluir o vídeo selecionado?',
    'library.deleteManyMessage':
      'Excluir os {{count}} vídeos selecionados?',
    'library.openErrorTitle': 'Erro ao abrir vídeo',
    'library.openErrorMessage':
      'Não foi possível abrir este vídeo.',
    'library.shareErrorTitle': 'Erro ao compartilhar',
    'library.shareErrorMessage':
      'Não foi possível compartilhar este vídeo.',
    'library.deleteOneError':
      'Não foi possível excluir este vídeo.',
    'library.emptyTitle.none': 'Nenhum vídeo ainda',
    'library.emptyTitle.filter': 'Nada neste filtro',
    'library.emptyText.none':
      'Toque no botão de gravação para criar o primeiro vídeo.',
    'library.emptyText.filter':
      'Tente trocar o filtro para ver outros vídeos salvos.',

    'splash.cameraPermissionTitle': 'Permissão de câmera necessária',
    'splash.cameraPermissionMessage':
      'A câmera é essencial para o funcionamento do app. Toque em "Abrir configurações" e permita o acesso à câmera para continuar usando o Videonly.',

    'loading.defaultTitle': 'Processando vídeo',
    'loading.defaultMessage': 'Aguarde enquanto finalizamos o arquivo.',

    'errors.openVideoDevice':
      'Não foi possível abrir este vídeo no aparelho.',
    'errors.galleryReadPermission':
      'Permissão para ler vídeos da galeria não foi concedida.',
    'errors.gallerySavePermission':
      'Permissão para salvar vídeos na galeria não foi concedida.',
    'errors.galleryDeletePermission':
      'Permissão para excluir vídeos da galeria não foi concedida.',
    'errors.videoCompressionUnavailable':
      'Compressão de vídeo não está disponível neste aparelho.',
    'errors.slowMotionUnavailable':
      'Processamento de câmera lenta não está disponível.',
    'errors.timelapseUnavailable':
      'Processamento de time-lapse não está disponível.',

    'ambient.protected.title': 'Áudio protegido',
    'ambient.protectedHigh.description':
      'O ambiente está alto e com picos. A sugestão automática é reduzir o ganho e usar captação sem processamento para preservar melhor o áudio.',
    'ambient.protected.description':
      'O ambiente está alto, mas sem clipping constante. A sugestão automática é usar captação sem processamento e reduzir o ganho sem chegar ao ajuste mais agressivo.',
    'ambient.moderate.title': 'Ambiente moderado',
    'ambient.moderate.description':
      'O ambiente tem volume moderado. A sugestão automática é só reduzir um pouco o ganho e manter a captação atual.',
    'ambient.soft.title': 'Ambiente suave',
    'ambient.soft.description':
      'O ambiente está limpo ou com pouco ruído. A sugestão automática é preservar a captação atual e evitar ajustes agressivos.',
    'ambient.variable.title': 'Ambiente levemente variável',
    'ambient.variable.description':
      'O ambiente tem alguma variação, mas não justifica trocar canal, taxa de amostragem ou fonte. A sugestão automática é apenas reduzir levemente o ganho.',
    'ambient.confidenceHigh': 'alta',
    'ambient.confidenceMedium': 'média',
  },

  en: {
    'common.ok': 'OK',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.close': 'Close',
    'common.open': 'Open',
    'common.save': 'Save',
    'common.edit': 'Edit',
    'common.replace': 'Replace',
    'common.back': 'Back',
    'common.error': 'Error',
    'common.audio': 'Audio',
    'common.video': 'Video',
    'common.videoAudioShort': 'V+A',
    'common.optimize': 'Optimize',
    'common.shareShort': 'Share',
    'common.camera': 'Camera',
    'common.file': 'File',
    'common.front': 'front',
    'common.backCamera': 'back',
    'common.automatic': 'Auto',
    'common.manual': 'Manual',
    'common.normal': 'normal',
    'common.none': 'None',

    'language.ptBR': 'Português (Brasil)',
    'language.en': 'English',

    'media.none.label': 'Off',
    'media.none.shortLabel': 'Off',
    'media.none.description': 'Keeps the file as recorded.',
    'media.none.helper': 'No compression and no audio correction.',
    'media.video.label': 'Video',
    'media.video.shortLabel': 'Video',
    'media.video.description': 'Compresses the video before saving.',
    'media.video.helper': 'Good for reducing size without changing audio.',
    'media.audio.label': 'Audio',
    'media.audio.shortLabel': 'Audio',
    'media.audio.description': 'Corrects audio without compressing video.',
    'media.audio.helper': 'Lighter and faster than full compression.',
    'media.both.label': 'Video + Audio',
    'media.both.shortLabel': 'V+A',
    'media.both.description':
      'Compresses video and corrects audio together.',
    'media.both.helper': 'More protection, but takes longer.',

    'audioSource.default.label': 'Default',
    'audioSource.default.shortLabel': 'Default',
    'audioSource.default.description': 'Automatic processing.',
    'audioSource.default.helper':
      'Good for general use when you do not need much audio control.',
    'audioSource.mic.label': 'Microphone',
    'audioSource.mic.shortLabel': 'Mic',
    'audioSource.mic.description':
      'Microphone capture with system adjustments.',
    'audioSource.mic.helper':
      'May apply automatic gain, echo cancellation, and noise suppression.',
    'audioSource.camera.label': 'Camera',
    'audioSource.camera.shortLabel': 'Camera',
    'audioSource.camera.description':
      'Optimized mode for casual video recording.',
    'audioSource.camera.helper':
      'Usually works well in common scenes, but may flatten dynamics in very loud environments.',
    'audioSource.voice.label': 'Voice recognition',
    'audioSource.voice.shortLabel': 'Voice',
    'audioSource.voice.description':
      'Prioritizes speech and intelligibility.',
    'audioSource.voice.helper':
      'Not recommended for loud music or environments with heavy bass.',
    'audioSource.unprocessed.label': 'Unprocessed',
    'audioSource.unprocessed.shortLabel': 'Raw',
    'audioSource.unprocessed.description':
      'Captures the purest possible microphone audio.',
    'audioSource.unprocessed.helper':
      'Recommended and best choice for concerts, clubs, and loud places.',

    'audioProfile.standard.label': 'Default',
    'audioProfile.standard.description':
      'More neutral for general use and normal environments.',
    'audioProfile.liveSafe.label': 'Live show',
    'audioProfile.liveSafe.description':
      'Prioritizes less processing and prepares audio for correction on save.',
    'audioProfile.custom.label': 'Custom',
    'audioProfile.custom.description':
      'Keeps the manual adjustments you selected.',
    'audioProfile.savedCustom.description': 'Saved custom profile in use.',

    'audioRisk.off.title': 'Audio disabled',
    'audioRisk.off.description':
      'Recording is configured without audio capture.',
    'audioRisk.low.title': 'Reduced risk',
    'audioRisk.low.cleanupDescription':
      'Unprocessed, mono, and correction on save: the safest app setup to preserve dynamics and handle strong bass.',
    'audioRisk.low.description':
      'Unprocessed and mono: the current best app combination to preserve dynamics and handle strong bass.',
    'audioRisk.medium.title': 'Moderate risk',
    'audioRisk.medium.cleanupDescription':
      'The unprocessed source helps a lot and correction on save reduces clipping risk, but mono is usually safer in extreme environments.',
    'audioRisk.medium.description':
      'The unprocessed source helps a lot, but mono is usually safer in extreme environments.',
    'audioRisk.high.title': 'High risk',
    'audioRisk.high.cleanupDescription':
      'The current source may apply AGC, compression, or noise reduction. Correction on save helps, but clipping and muddy bass are still possible.',
    'audioRisk.high.description':
      'The current source may apply AGC, compression, or noise reduction. This increases the risk of clipping and muddy bass.',

    'limiter.standard.label': 'Default',
    'limiter.standard.description':
      'Balances light noise reduction, clipping smoothing, and limiter.',
    'limiter.gentle.label': 'Gentle',
    'limiter.gentle.description':
      'Applies subtle corrections while preserving more dynamics.',
    'limiter.strong.label': 'Strong',
    'limiter.strong.description':
      'Strengthens low noise reduction and clipped peak smoothing.',

    'recording.normal.label': 'Normal',
    'recording.slowMotion.label': 'Slow motion',
    'recording.timelapse.label': 'Time-lapse',

    'settings.title': 'Settings',
    'settings.subtitle':
      'Adjust capture behavior, audio profiles, and recording formats.',
    'settings.section.capture': 'Capture',
    'settings.section.behavior': 'Interaction and behavior',
    'settings.section.format': 'Format and image',
    'settings.section.visualControls': 'Visual controls',
    'settings.section.audio': 'Audio',
    'settings.section.recording': 'Recording',
    'settings.section.additional': 'Additional options',
    'settings.language.label': 'Language',
    'settings.audio.enabled.label': 'Audio',
    'settings.audio.enabled.description':
      'Enables audio recording. Requires microphone permission.',
    'settings.zoomGesture.label': 'Gesture zoom',
    'settings.zoomGesture.description':
      'Enables pinch gesture to control zoom.',
    'settings.lowLightBoost.label': 'Low-light boost',
    'settings.lowLightBoost.description':
      'May help in dark environments.',
    'settings.resizeMode.label': 'Framing mode',
    'settings.videoBitRate.label': 'Video bit rate',
    'settings.fps.label': 'FPS',
    'settings.zoom.label': 'Zoom',
    'settings.exposure.label': 'Exposure',
    'settings.exposure.description': 'Default: 0 EV',
    'settings.visualDefaults': 'Control defaults',
    'settings.optimize.label': 'Optimize',
    'settings.captureSettings.label': 'Capture settings',
    'settings.audioCodec.label': 'Audio codec',
    'settings.channels.label': 'Channels',
    'settings.sampleRate.label': 'Sample rate',
    'settings.audioGain.label': 'Audio gain',
    'settings.audioBitRate.label': 'Audio bit rate (kbps)',
    'settings.audioBitRate.placeholder': 'e.g. 128',
    'settings.showAudioStatus.label': 'Show audio status',
    'settings.showAudioStatus.description':
      'Shows a banner while recording with the audio source and processing risk.',
    'settings.showVu.label': 'Show VU meter',
    'settings.showVu.description':
      'Shows an audio level meter at the bottom before and during recording.',
    'settings.normalizeVolume.label': 'Normalize volume',
    'settings.normalizeVolume.description':
      'Adjusts volume on save based on the recorded audio analysis.',
    'settings.limiter.label': 'Limiter',
    'settings.activeSource.title': 'Active source: {{source}}',
    'settings.activeSource.safe':
      'Recommended mode to reduce distortion and preserve dynamics in very loud environments.',
    'settings.activeSource.warning':
      'This source may apply automatic processing. In concerts and clubs, this increases the risk of distortion and muffled sound.',
    'settings.optimization.title': 'Optimization: {{mode}}',
    'settings.videoResolution.label': 'Video resolution',
    'settings.fileFormat.label': 'File format',
    'settings.videoCodec.label': 'Video codec',
    'settings.exportMetadata': 'Export metadata',
    'settings.exporting': 'Exporting...',
    'settings.deleteMetadata': 'Delete metadata',
    'settings.restoreDefaults': 'Restore defaults',
    'settings.noMetadata.title': 'No metadata',
    'settings.noMetadata.message':
      'There are no saved metadata files to export yet.',
    'settings.exportMetadata.errorTitle': 'Metadata export error',
    'settings.exportMetadata.errorMessage':
      'Could not generate the export file.',
    'settings.deleteMetadata.title': 'Delete metadata',
    'settings.deleteMetadata.message':
      'This will delete all metadata files saved on the device. Continue?',
    'settings.deleteMetadata.successTitle': 'Metadata deleted',
    'settings.deleteMetadata.deleted':
      '{{count}} metadata file{{plural}} {{verb}} deleted.',
    'settings.deleteMetadata.empty':
      'There were no metadata files to delete.',
    'settings.deleteMetadata.errorTitle': 'Metadata delete error',
    'settings.deleteMetadata.errorMessage':
      'Could not delete the metadata.',
    'settings.bitRate.extraLow': 'extra low',
    'settings.bitRate.low': 'low',
    'settings.bitRate.normal': 'normal',
    'settings.bitRate.high': 'high',
    'settings.bitRate.extraHigh': 'extra high',
    'settings.resize.cover': 'Fill',
    'settings.resize.contain': 'Fit',
    'settings.channel.stereo': 'Stereo (2 channels)',
    'settings.channel.mono': 'Mono (1 channel)',
    'settings.codec.mp3': 'MP3 (uses AAC as fallback on Android)',
    'settings.gain.default': 'Default (0 dB)',
    'settings.gain.reduced': 'Reduced (-6 dB)',
    'settings.gain.live': 'Live show (-9 dB)',
    'settings.gain.maxReduced': 'Maximum reduced (-12 dB)',

    'audioSourcePicker.title': 'Audio source',
    'audioSourcePicker.infoTitle': 'Clipping protection',
    'audioSourcePicker.infoText':
      'For now, the best prevention is combining Unprocessed with mono capture. This reduces the risk of muffled audio, cut bass, and distortion in loud environments.',

    'header.optimize': 'Optimize',
    'header.closeOptimization': 'Close optimization',
    'header.recordingMode': 'Recording mode',
    'header.videoResolution': 'Video resolution',
    'header.analyzeAmbient': 'Analyze ambient sound',
    'header.closeAmbientAnalysis': 'Close ambient analysis',
    'header.ambientDescription':
      'Analyzes the environment for 10 seconds and suggests the best capture setting.',
    'header.startAnalysis': 'Start analysis',
    'header.openAmbientAnalysis': 'Open ambient analysis',
    'header.toggleFlash': 'Toggle flash',
    'header.openOptimization': 'Open optimization',
    'header.openGallery': 'Open gallery',
    'header.openSettings': 'Open settings',

    'camera.loadingSettings': 'Loading settings...',
    'camera.initializing': 'Initializing camera and permissions...',
    'camera.permissionTitle': 'Videonly',
    'camera.permissionMessage':
      'The app needs permission to access camera, audio, and gallery.',
    'camera.permissionHint':
      'Go to settings and enable the permissions.',
    'camera.openSettings': 'Open settings',
    'camera.processingWait': 'Please wait...',
    'camera.analyzingAmbient': 'Analyzing environment',
    'camera.analysisProgress':
      '{{percent}}% complete · {{seconds}}s remaining',
    'camera.deletingSelectedMessage':
      'Please wait while we remove the selected video.',
    'camera.deletingSelectedTitle': 'Deleting video',
    'camera.preparingCamera': 'Preparing camera...',
    'camera.videos': 'Videos',
    'camera.viewAll': 'See all →',
    'camera.vuPreview': 'VU preview',
    'camera.clip': 'CLIP',
    'camera.vuHighPeak':
      'High peak. Reduce gain or use the Live show profile.',
    'camera.vuSafe':
      'Environment preview before recording. Green indicates a safe zone.',
    'camera.loadingVideos': 'Loading videos...',
    'camera.noSavedVideos': 'No saved videos yet.',
    'camera.searchingCamera': 'Searching {{camera}} camera...',
    'camera.noCompatibleCamera':
      'If the device has no compatible camera, nothing will be shown.',
    'camera.audioStatusTitle': 'Audio: {{source}} · {{risk}}',
    'camera.audioCleanupActive': 'Audio correction on save: active',
    'camera.audioMenu.capture': 'Capture',
    'camera.openCaptureSettings': 'Open capture settings',
    'camera.toggleCamera': 'Switch to {{camera}} camera',
    'camera.profileNamePlaceholder': 'Profile name',
    'camera.renameProfile': 'Rename profile',
    'camera.saveProfile': 'Save profile',
    'camera.profileNameRequired': 'Enter a name to save the profile.',
    'camera.replaceProfile.title': 'Replace profile',
    'camera.replaceProfile.message':
      'Replace "{{name}}" with the current custom configuration?',
    'camera.deleteProfile.title': 'Delete profile',
    'camera.deleteProfile.message': 'Delete "{{name}}"?',
    'camera.savedProfiles': 'Profiles',
    'camera.saveCurrentSettings': 'Save configuration',
    'camera.saveCurrentSettingsDescription':
      'Stores the current adjustments as a new profile.',
    'camera.profileLimitReached': 'Limit reached',
    'camera.profileLimitDescription':
      'Replace or delete a profile to save another one.',
    'camera.profileActive': 'Active profile.',
    'camera.profileTapToUse': 'Tap to use this profile.',
    'camera.noSavedProfiles': 'No saved profiles yet.',
    'camera.enableAudio': 'Enable audio',
    'camera.enableAudioDescription':
      'Records with audio again using the current configuration.',
    'camera.keepAudioOff': 'Keep disabled',
    'camera.keepAudioOffDescription':
      'Keeps recording without audio capture.',

    'camera.loading.slowMotion': 'Creating slow motion',
    'camera.loading.timelapse': 'Creating time-lapse',
    'camera.loading.audio': 'Optimizing audio',
    'camera.loading.both': 'Optimizing video and audio',
    'camera.loading.video': 'Optimizing video',
    'camera.analysisComplete.title': 'Analysis complete',
    'camera.analysisComplete.message':
      'Could not generate a suggestion. Try again with a stable environment.',
    'camera.suggestion.title': 'Suggestion ready',
    'camera.suggestion.rms': 'Average RMS: {{value}}',
    'camera.suggestion.averagePeak': 'Average peak: {{value}}',
    'camera.suggestion.maxPeak': 'Max peak: {{value}}',
    'camera.suggestion.clipping': 'Clipping: {{value}}',
    'camera.suggestion.limiter': 'Limiter: {{value}}',
    'camera.suggestion.volumeOn': 'Volume normalization: on',
    'camera.suggestion.volumeOff': 'Volume normalization: off',
    'camera.suggestion.keep': 'Keep current',
    'camera.suggestion.apply': 'Apply suggestion',
    'camera.analysisUnavailable.title': 'Analysis unavailable',
    'camera.analysisUnavailable.message':
      'Could not start the analysis right now. Try again in a moment.',
    'camera.permissions.title': 'Permissions required',
    'camera.permissions.withAudio':
      'You need to allow camera, microphone, and gallery access to record and save videos with audio.',
    'camera.permissions.withoutAudio':
      'You need to allow camera and gallery access to record and save videos.',
    'camera.manageMedia.title': 'Media management permission',
    'camera.manageMedia.message':
      'To get media deletion access, enable access in "Manage media".',
    'camera.manageMedia.extraTitle': 'Extra delete permission',
    'camera.manageMedia.extraMessage':
      'Without the special "Manage media" access, Android may keep showing an extra confirmation when deleting videos.',
    'camera.notNow': 'Not now',
    'camera.effectUnavailable': 'Effect unavailable',
    'camera.optimizationUnavailable': 'Optimization unavailable',
    'camera.effectFallback':
      'Could not apply the effect to this video. The original version was saved normally.',
    'camera.optimizationFallback':
      'Could not optimize this video. The original version was saved normally.',
    'camera.processErrorTitle': 'Video processing error',
    'camera.processErrorMessage':
      'Could not optimize or save the original video.',
    'camera.saveErrorTitle': 'Video save error',
    'camera.saveErrorMessage': 'Could not save the video to the gallery.',
    'camera.finishErrorMessage':
      'Could not finish the recorded video.',
    'camera.recordingErrorTitle': 'Recording error',
    'camera.recordingErrorMessage': 'Could not record the video.',
    'camera.startRecordingError': 'Failed to start recording.',
    'camera.stopRecordingError': 'Failed to stop recording.',
    'camera.openSettingsErrorTitle': 'Could not open settings',
    'camera.openSettingsErrorMessage':
      'Open the app settings manually and allow camera, microphone, and gallery to continue.',
    'camera.openVideoErrorTitle': 'Video open error',
    'camera.openVideoErrorMessage': 'Could not open this video.',
    'camera.shareVideoErrorTitle': 'Share error',
    'camera.shareVideoErrorMessage': 'Could not share this video.',
    'camera.deleteVideoErrorMessage': 'Could not delete this video.',
    'camera.deleteVideoTitle': 'Delete video',
    'camera.deleteVideoMessage': 'Delete the selected video?',
    'camera.optimizationDoneTitle': 'Optimization complete',
    'camera.optimizationDoneMessage':
      'A new optimized copy was saved. The original video was kept.',

    'library.filter.all': 'All',
    'library.filter.today': 'Today',
    'library.filter.week': 'This week',
    'library.filter.gallery': 'Gallery',
    'library.title': 'Library',
    'library.savedVideos': 'Saved videos',
    'library.deleteSelected': 'Delete selected videos',
    'library.loadingDeleteTitle': 'Deleting videos',
    'library.loadingDeleteDefault':
      'Please wait while we remove the selected videos.',
    'library.loadingDeleteProgress':
      'Removing {{current}} of {{total}} selected videos.',
    'library.optimizingCopy':
      'A new copy will be saved. The original video will be kept.',
    'library.loadErrorTitle': 'Video load error',
    'library.loadErrorMessage':
      'Could not load videos from the gallery.',
    'library.deleteSelectedError':
      'Could not delete the selected videos.',
    'library.deleteSelectedTitle': 'Delete videos',
    'library.deleteOneMessage': 'Delete the selected video?',
    'library.deleteManyMessage':
      'Delete the {{count}} selected videos?',
    'library.openErrorTitle': 'Video open error',
    'library.openErrorMessage': 'Could not open this video.',
    'library.shareErrorTitle': 'Share error',
    'library.shareErrorMessage': 'Could not share this video.',
    'library.deleteOneError': 'Could not delete this video.',
    'library.emptyTitle.none': 'No videos yet',
    'library.emptyTitle.filter': 'Nothing in this filter',
    'library.emptyText.none':
      'Tap the record button to create the first video.',
    'library.emptyText.filter':
      'Try changing the filter to see other saved videos.',

    'splash.cameraPermissionTitle': 'Camera permission required',
    'splash.cameraPermissionMessage':
      'The camera is essential for the app. Tap "Open settings" and allow camera access to keep using Videonly.',

    'loading.defaultTitle': 'Processing video',
    'loading.defaultMessage': 'Please wait while we finish the file.',

    'errors.openVideoDevice': 'Could not open this video on the device.',
    'errors.galleryReadPermission':
      'Permission to read videos from the gallery was not granted.',
    'errors.gallerySavePermission':
      'Permission to save videos to the gallery was not granted.',
    'errors.galleryDeletePermission':
      'Permission to delete videos from the gallery was not granted.',
    'errors.videoCompressionUnavailable':
      'Video compression is not available on this device.',
    'errors.slowMotionUnavailable':
      'Slow motion processing is not available.',
    'errors.timelapseUnavailable':
      'Time-lapse processing is not available.',

    'ambient.protected.title': 'Protected audio',
    'ambient.protectedHigh.description':
      'The environment is loud and has peaks. The automatic suggestion is to reduce gain and use unprocessed capture to better preserve audio.',
    'ambient.protected.description':
      'The environment is loud, but clipping is not constant. The automatic suggestion is to use unprocessed capture and reduce gain without using the most aggressive setting.',
    'ambient.moderate.title': 'Moderate environment',
    'ambient.moderate.description':
      'The environment has moderate volume. The automatic suggestion is only to reduce gain a little and keep the current capture.',
    'ambient.soft.title': 'Soft environment',
    'ambient.soft.description':
      'The environment is clean or has little noise. The automatic suggestion is to preserve the current capture and avoid aggressive adjustments.',
    'ambient.variable.title': 'Slightly variable environment',
    'ambient.variable.description':
      'The environment has some variation, but not enough to justify changing channel, sample rate, or source. The automatic suggestion is just to reduce gain slightly.',
    'ambient.confidenceHigh': 'high',
    'ambient.confidenceMedium': 'medium',
  },
};

let currentLanguage = detectDeviceLanguage();

function interpolate(template, params) {
  if (!params || typeof template !== 'string') {
    return template;
  }

  return Object.entries(params).reduce(
    (text, [key, value]) =>
      text.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'g'), String(value)),
    template,
  );
}

export function setCurrentLanguage(language) {
  currentLanguage = normalizeLanguage(language);
}

export function getCurrentLanguage() {
  return currentLanguage;
}

export function translate(key, params, language = currentLanguage) {
  const normalizedLanguage = normalizeLanguage(language);
  const template =
    translations[normalizedLanguage]?.[key] ??
    translations[DEFAULT_LANGUAGE]?.[key] ??
    translations[BRAZILIAN_PORTUGUESE]?.[key] ??
    key;

  return interpolate(template, params);
}

export function createTranslator(language) {
  return (key, params) => translate(key, params, language);
}
