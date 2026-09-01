import React, {useState} from 'react';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {NavigationContainer} from '@react-navigation/native';

import {CameraSettingsProvider} from './src/context/CameraSettingsContext';
import {CustomAlertProvider} from './src/context/CustomAlertContext';
import {I18nProvider} from './src/i18n/I18nContext';
import {ProAccessProvider} from './src/context/ProAccessContext';
import AppNavigator from './src/navigation/AppNavigator';
import SplashScreen from './src/screens/SplashScreen/SplashScreen';

export default function App() {
  const [isStartupComplete, setIsStartupComplete] = useState(false);

  return (
    <GestureHandlerRootView style={styles.root}>
      <CameraSettingsProvider>
        <I18nProvider>
          <ProAccessProvider>
            <CustomAlertProvider>
              {isStartupComplete ? (
                <NavigationContainer>
                  <AppNavigator />
                </NavigationContainer>
              ) : (
                <SplashScreen
                  onComplete={() => {
                    setIsStartupComplete(true);
                  }}
                />
              )}
            </CustomAlertProvider>
          </ProAccessProvider>
        </I18nProvider>
      </CameraSettingsProvider>
    </GestureHandlerRootView>
  );
}

const styles = {
  root: {
    flex: 1,
  },
};
