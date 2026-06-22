import React from 'react';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {NavigationContainer} from '@react-navigation/native';

import {CameraSettingsProvider} from './src/context/CameraSettingsContext';
import {CustomAlertProvider} from './src/context/CustomAlertContext';
import {I18nProvider} from './src/i18n/I18nContext';
import {ProAccessProvider} from './src/context/ProAccessContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <CameraSettingsProvider>
        <I18nProvider>
          <ProAccessProvider>
            <CustomAlertProvider>
              <NavigationContainer>
                <AppNavigator />
              </NavigationContainer>
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
