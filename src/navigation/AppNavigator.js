import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import SplashScreen from '../screens/SplashScreen/SplashScreen';
import CameraScreen from '../screens/CameraScreen/CameraScreen';
import SettingsScreen from '../screens/SettingsScreen/SettingsScreen';
import LibraryScreen from '../screens/LibraryScreen/LibraryScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{
        headerStyle: {backgroundColor: 'rgba(10, 7, 5, 0.92)'},
        headerTintColor: '#FAF8F5',
        contentStyle: {backgroundColor: '#0A0705'},
        animation: 'fade_from_bottom',
      }}>
      <Stack.Screen
        name="Splash"
        component={SplashScreen}
        options={{headerShown: false, animation: 'fade'}}
      />
      <Stack.Screen
        name="Camera"
        component={CameraScreen}
        options={{title: ''}}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="Library"
        component={LibraryScreen}
        options={{headerShown: false}}
      />
    </Stack.Navigator>
  );
}
