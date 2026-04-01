import React from 'react';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {NavigationContainer} from '@react-navigation/native';

import {CameraSettingsProvider} from './src/context/CameraSettingsContext';
import {CustomAlertProvider} from './src/context/CustomAlertContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <CameraSettingsProvider>
        <CustomAlertProvider>
          <NavigationContainer>
            <AppNavigator />
          </NavigationContainer>
        </CustomAlertProvider>
      </CameraSettingsProvider>
    </GestureHandlerRootView>
  );
}

const styles = {
  root: {
    flex: 1,
  },
};
