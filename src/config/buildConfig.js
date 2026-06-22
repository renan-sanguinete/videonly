import {NativeModules} from 'react-native';

const nativeConfig = NativeModules.VideonlyBuildConfig ?? {};

export const buildConfig = {
  buildChannel: nativeConfig.buildChannel ?? (__DEV__ ? 'dev' : 'prod'),
  isDebugBuild: Boolean(nativeConfig.isDebugBuild ?? __DEV__),
  isProBuild: Boolean(nativeConfig.isProBuild),
  allowsProTesting: Boolean(
    nativeConfig.allowsProTesting ?? (__DEV__ || nativeConfig.isProBuild),
  ),
  proProductId: nativeConfig.proProductId ?? 'videonly_pro_unlock',
};
