import {useEffect, useState} from 'react';
import {NativeEventEmitter, NativeModules, Platform} from 'react-native';

const {AudioLevelMonitorModule} = NativeModules;

const DEFAULT_AUDIO_LEVEL = {
  level: 0,
  peakDb: -120,
  rmsDb: -120,
  isClipping: false,
};

function normalizeNumber(value, fallback) {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : fallback;
}

export function useAudioLevelMonitor({enabled}) {
  const [audioLevel, setAudioLevel] = useState(DEFAULT_AUDIO_LEVEL);

  useEffect(() => {
    if (Platform.OS !== 'android' || !AudioLevelMonitorModule) {
      return undefined;
    }

    if (!enabled) {
      AudioLevelMonitorModule.stopMonitoring?.();
      setAudioLevel(DEFAULT_AUDIO_LEVEL);
      return undefined;
    }

    const emitter = new NativeEventEmitter(AudioLevelMonitorModule);
    const subscription = emitter.addListener('videonlyAudioLevel', event => {
      if (!event || typeof event !== 'object') {
        return;
      }

      setAudioLevel({
        level: normalizeNumber(event.level, 0),
        peakDb: normalizeNumber(event.peakDb, -120),
        rmsDb: normalizeNumber(event.rmsDb, -120),
        isClipping: Boolean(event.isClipping),
      });
    });

    const startPromise = AudioLevelMonitorModule.startMonitoring?.({
      sampleRate: 48000,
      bufferDurationMs: 50,
    });

    startPromise?.catch(error => {
      console.warn('Nao foi possivel iniciar o medidor de áudio.', error);
      setAudioLevel(DEFAULT_AUDIO_LEVEL);
    });

    return () => {
      subscription.remove();
      AudioLevelMonitorModule.stopMonitoring?.();
    };
  }, [enabled]);

  return audioLevel;
}
