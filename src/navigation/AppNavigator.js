import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import CameraScreen from '../screens/CameraScreen';
import SettingsScreen from '../screens/SettingsScreen';
import LibraryScreen from '../screens/LibraryScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Camera"
      screenOptions={{
        headerStyle: {backgroundColor: '#111827'},
        headerTintColor: '#fff',
        contentStyle: {backgroundColor: '#0b1020'},
      }}>
      <Stack.Screen name="Camera" component={CameraScreen} options={{title: 'Videonly'}} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{title: 'Configurações'}} />
      <Stack.Screen name="Library" component={LibraryScreen} options={{title: 'Vídeos salvos'}} />
    </Stack.Navigator>
  );
}
