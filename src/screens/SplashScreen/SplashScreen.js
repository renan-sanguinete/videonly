import React, {useEffect, useRef} from 'react';
import {Image, Linking, View} from 'react-native';

import {useCameraSettings} from '../../context/CameraSettingsContext';
import {useCustomAlert} from '../../context/CustomAlertContext';
import {ensureStartupPermissions} from '../../utils/appPermissions';
import {styles} from './styles';

export default function SplashScreen({navigation}) {
  const {showAlert} = useCustomAlert();
  const {isHydrated, settings} = useCameraSettings();
  const hasRunRef = useRef(false);

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
            'Permissão de câmera necessária',
            'A câmera é essencial para o funcionamento do app. Toque em "Abrir configurações" e permita o acesso à câmera para continuar usando o Videonly.',
            [
              {
                text: 'Agora não',
                style: 'cancel',
                onPress: () => {
                  navigation.replace('Camera');
                },
              },
              {
                text: 'Abrir configurações',
                onPress: () => {
                  Linking.openSettings().catch(error => {
                    console.warn(
                      'Falha ao abrir configurações do app.',
                      error,
                    );
                  });
                  navigation.replace('Camera');
                },
              },
            ],
            {cancelable: false},
          );
          return;
        }

        navigation.replace('Camera');
      } catch (error) {
        console.warn('Falha ao solicitar permissões iniciais.', error);

        if (!isCancelled) {
          navigation.replace('Camera');
        }
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [isHydrated, navigation, settings.audio, showAlert]);

  return (
    <View style={styles.container}>
      <Image source={{uri: 'splash_screen_logo'}} style={styles.logo} />
    </View>
  );
}
