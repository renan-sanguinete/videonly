import React, {useCallback, useEffect, useRef} from 'react';
import {Image, Linking, View} from 'react-native';

import {useCameraSettings} from '../../context/CameraSettingsContext';
import {useCustomAlert} from '../../context/CustomAlertContext';
import {useI18n} from '../../i18n/I18nContext';
import {ensureStartupPermissions} from '../../utils/appPermissions';
import {styles} from './styles';

export default function SplashScreen({navigation, onComplete}) {
  const {showAlert} = useCustomAlert();
  const {t} = useI18n();
  const {isHydrated, settings} = useCameraSettings();
  const hasRunRef = useRef(false);
  const completeStartup = useCallback(() => {
    if (typeof onComplete === 'function') {
      onComplete();
      return;
    }

    navigation?.replace?.('Camera');
  }, [navigation, onComplete]);

  useEffect(() => {
    if (!isHydrated || hasRunRef.current) {
      return;
    }

    hasRunRef.current = true;

    let isCancelled = false;

    (async () => {
      try {
        const {cameraOk} = await ensureStartupPermissions({
          includeMicrophone: settings.audio,
          request: true,
        });

        if (isCancelled) {
          return;
        }

        if (!cameraOk) {
          showAlert(
            t('splash.cameraPermissionTitle'),
            t('splash.cameraPermissionMessage'),
            [
              {
                text: t('camera.notNow'),
                style: 'cancel',
                onPress: () => {
                  completeStartup();
                },
              },
              {
                text: t('camera.openSettings'),
                onPress: () => {
                  Linking.openSettings().catch(error => {
                    console.warn(
                      'Falha ao abrir configurações do app.',
                      error,
                    );
                  });
                  completeStartup();
                },
              },
            ],
            {cancelable: false},
          );
          return;
        }

        completeStartup();
      } catch (error) {
        console.warn('Falha ao solicitar permissões iniciais.', error);

        if (!isCancelled) {
          completeStartup();
        }
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [completeStartup, isHydrated, settings.audio, showAlert, t]);

  return (
    <View style={styles.container}>
      <Image source={{uri: 'splash_screen_logo'}} style={styles.logo} />
    </View>
  );
}
