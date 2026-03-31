import React from 'react';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import {CameraSettingsProvider} from './src/context/CameraSettingsContext';
import {CustomAlertProvider} from './src/context/CustomAlertContext';
import CameraScreen from './src/screens/CameraScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import LibraryScreen from './src/screens/LibraryScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <CameraSettingsProvider>
        <CustomAlertProvider>
          <NavigationContainer>
            <Stack.Navigator
              initialRouteName="Camera"
              screenOptions={{
                headerStyle: {backgroundColor: '#111827'},
                headerTintColor: '#fff',
                contentStyle: {backgroundColor: '#0b1020'},
              }}>
              <Stack.Screen
                name="Camera"
                component={CameraScreen}
                options={{title: ''}}
              />
              <Stack.Screen
                name="Settings"
                component={SettingsScreen}
                options={{title: 'Configurações'}}
              />
              <Stack.Screen
                name="Library"
                component={LibraryScreen}
                options={{title: 'Vídeos salvos'}}
              />
            </Stack.Navigator>
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
