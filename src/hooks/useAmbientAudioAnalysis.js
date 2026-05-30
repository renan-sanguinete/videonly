import {useCallback, useEffect, useMemo, useRef, useState} from 'react';

import {analyzeAmbientAudioSamples} from '../utils/audioAmbientAnalysis';

const DEFAULT_DURATION_MS = 10_000;

function normalizeNumber(value, fallback) {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : fallback;
}

export function useAmbientAudioAnalysis({durationMs = DEFAULT_DURATION_MS, onComplete} = {}) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [remainingMs, setRemainingMs] = useState(durationMs);
  const startedAtRef = useRef(null);
  const samplesRef = useRef([]);
  const timeoutRef = useRef(null);
  const intervalRef = useRef(null);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const resetProgress = useCallback(() => {
    setAnalysisProgress(0);
    setRemainingMs(durationMs);
  }, [durationMs]);

  const finishAnalysis = useCallback(() => {
    const suggestion = analyzeAmbientAudioSamples(samplesRef.current);
    clearTimers();
    setIsAnalyzing(false);
    setAnalysisProgress(1);
    setRemainingMs(0);
    startedAtRef.current = null;
    samplesRef.current = [];
    onCompleteRef.current?.(suggestion);
  }, [clearTimers]);

  const startAnalysis = useCallback(() => {
    if (isAnalyzing) {
      return false;
    }

    clearTimers();
    samplesRef.current = [];
    startedAtRef.current = Date.now();
    setIsAnalyzing(true);
    resetProgress();

    intervalRef.current = setInterval(() => {
      if (!startedAtRef.current) {
        return;
      }

      const elapsedMs = Date.now() - startedAtRef.current;
      const clampedElapsed = Math.min(elapsedMs, durationMs);
      setAnalysisProgress(clampedElapsed / durationMs);
      setRemainingMs(Math.max(0, durationMs - clampedElapsed));
    }, 120);

    timeoutRef.current = setTimeout(() => {
      finishAnalysis();
    }, durationMs);

    return true;
  }, [clearTimers, durationMs, finishAnalysis, isAnalyzing, resetProgress]);

  const cancelAnalysis = useCallback(() => {
    clearTimers();
    setIsAnalyzing(false);
    resetProgress();
    startedAtRef.current = null;
    samplesRef.current = [];
  }, [clearTimers, resetProgress]);

  const recordSample = useCallback(
    sample => {
      if (!isAnalyzing || !sample) {
        return;
      }

      const normalizedSample = {
        level: normalizeNumber(sample.level, 0),
        peakDb: normalizeNumber(sample.peakDb, -120),
        rmsDb: normalizeNumber(sample.rmsDb, -120),
        isClipping: Boolean(sample.isClipping),
      };

      if (
        normalizedSample.level === 0 &&
        normalizedSample.peakDb === -120 &&
        normalizedSample.rmsDb === -120
      ) {
        return;
      }

      samplesRef.current.push(normalizedSample);
    },
    [isAnalyzing],
  );

  useEffect(() => () => clearTimers(), [clearTimers]);

  return useMemo(
    () => ({
      analysisProgress,
      cancelAnalysis,
      isAnalyzing,
      recordSample,
      remainingMs,
      startAnalysis,
    }),
    [analysisProgress, cancelAnalysis, isAnalyzing, recordSample, remainingMs, startAnalysis],
  );
}
