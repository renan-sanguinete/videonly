import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Animated, PanResponder, Text, View} from 'react-native';

import {styles} from './styles';
import {
  clamp,
  formatZoomFactor,
  getZoomFromTrackPosition,
  getZoomSliderProgress,
} from '../../utils/cameraZoom';

const THUMB_SIZE = 34;
const BUBBLE_HEIGHT = 28;

export default function ZoomRail({
  device,
  visible,
  zoom,
  onZoomChange,
  onZoomCommit,
}) {
  // ─── Refs estáveis (nunca causam recriação do PanResponder) ──────────────
  const railRef = useRef(null);
  const [trackHeight, setTrackHeight] = useState(1);
  const trackHeightRef = useRef(1);
  const railPageYRef = useRef(0);       // posição absoluta do rail na tela
  const currentZoomRef = useRef(zoom);
  const deviceRef = useRef(device);
  const onZoomChangeRef = useRef(onZoomChange);
  const onZoomCommitRef = useRef(onZoomCommit);
  const visibleRef = useRef(visible);
  const isDraggingRef = useRef(false);

  useEffect(() => { deviceRef.current = device; }, [device]);
  useEffect(() => { onZoomChangeRef.current = onZoomChange; }, [onZoomChange]);
  useEffect(() => { onZoomCommitRef.current = onZoomCommit; }, [onZoomCommit]);
  useEffect(() => { visibleRef.current = visible; }, [visible]);

  // ─── Animated value para o fill (atualizado sem re-render React) ─────────
  const normalizedAnim = useRef(
    new Animated.Value(getZoomSliderProgress(zoom, device)),
  ).current;

  const computeThumbPos = useCallback((progress) => {
    const h = trackHeightRef.current;
    const visualProgress = clamp(progress, 0, 1);
    const thumbTravel = Math.max(h - THUMB_SIZE, 0);
    const bubbleTravel = Math.max(h - BUBBLE_HEIGHT, 0);

    return {
      thumb: visualProgress * thumbTravel,
      bubble: visualProgress * bubbleTravel,
    };
  }, []);

  // Sincroniza quando zoom muda externamente (não durante drag)
  useEffect(() => {
    if (!isDraggingRef.current) {
      currentZoomRef.current = zoom;
      setDisplayZoom(zoom);
      const progress = getZoomSliderProgress(zoom, device);
      setThumbPos(computeThumbPos(progress));
      normalizedAnim.setValue(progress);
    }
  }, [computeThumbPos, device, normalizedAnim, zoom]);

  const fillHeightPercent = useMemo(
    () =>
      normalizedAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%'],
        extrapolate: 'clamp',
      }),
    [normalizedAnim],
  );

  const [displayZoom, setDisplayZoom] = useState(zoom);
  const [thumbPos, setThumbPos] = useState({thumb: 0, bubble: 0});

  const rafRef = useRef(null);

  const flushDisplay = useCallback(() => {
    const nextZoom = currentZoomRef.current;
    const normalized = getZoomSliderProgress(nextZoom, deviceRef.current);
    setDisplayZoom(nextZoom);
    setThumbPos(computeThumbPos(normalized));
    rafRef.current = null;
  }, [computeThumbPos]);

  // ─── onLayout: mede altura E posição absoluta do rail na tela ─────────────
  const handleLayout = useCallback(() => {
    if (!railRef.current) return;
    railRef.current.measure((_x, _y, _w, h, _pageX, pageY) => {
      setTrackHeight(h);
      trackHeightRef.current = h;
      railPageYRef.current = pageY;
      // Recalcula posição do thumb com o novo layout
      if (!isDraggingRef.current) {
        const normalized = getZoomSliderProgress(
          currentZoomRef.current,
          deviceRef.current,
        );
        setThumbPos(computeThumbPos(normalized));
      }
    });
  }, [computeThumbPos]);

  // ─── Converte pageY do toque para posição local no rail ───────────────────
  // Usa pageY (absoluto) para evitar os saltos causados por locationY
  // que muda de referência conforme o filho que recebe o evento.
  const pageYToLocalY = useCallback((pageY) => {
    return pageY - railPageYRef.current;
  }, []);

  // ─── Update central ───────────────────────────────────────────────────────
  const applyZoom = useCallback((pageY) => {
    const localY = pageYToLocalY(pageY);
    const nextZoom = clamp(
      getZoomFromTrackPosition(
        localY,
        trackHeightRef.current,
        deviceRef.current,
        THUMB_SIZE,
      ),
      deviceRef.current?.minZoom ?? 1,
      deviceRef.current?.maxZoom ?? 1,
    );

    currentZoomRef.current = nextZoom;
    setDisplayZoom(nextZoom);
    setThumbPos(
      computeThumbPos(getZoomSliderProgress(nextZoom, deviceRef.current)),
    );

    // Atualiza fill via Animated (native driver, sem re-render)
    normalizedAnim.setValue(getZoomSliderProgress(nextZoom, deviceRef.current));

    // Propaga zoom para a câmera
    onZoomChangeRef.current(nextZoom);

    // Atualiza label e thumb com throttle de 1 update/frame
    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(flushDisplay);
    }
  }, [computeThumbPos, normalizedAnim, pageYToLocalY, flushDisplay]);

  // ─── PanResponder criado UMA única vez ────────────────────────────────────
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => visibleRef.current,
        onMoveShouldSetPanResponder: () => visibleRef.current,
        onStartShouldSetPanResponderCapture: () => visibleRef.current,
        onPanResponderGrant: event => {
          if (!visibleRef.current) return;
          isDraggingRef.current = true;
          // Mede posição atual do rail antes de começar (pode ter scrollado)
          if (railRef.current) {
            railRef.current.measure((_x, _y, _w, h, _pageX, pageY) => {
              trackHeightRef.current = h;
              railPageYRef.current = pageY;
              applyZoom(event.nativeEvent.pageY);
            });
          } else {
            applyZoom(event.nativeEvent.pageY);
          }
        },
        onPanResponderMove: event => {
          if (!visibleRef.current) return;
          applyZoom(event.nativeEvent.pageY);
        },
        onPanResponderRelease: () => {
          isDraggingRef.current = false;
          onZoomCommitRef.current?.(currentZoomRef.current);
        },
        onPanResponderTerminate: () => {
          isDraggingRef.current = false;
          onZoomCommitRef.current?.(currentZoomRef.current);
        },
        onPanResponderTerminationRequest: () => false,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [], // deps vazias: acessa tudo via refs
  );

  const minZoom = device?.minZoom ?? 1;
  const maxZoom = device?.maxZoom ?? 1;
  const isAboveNeutral = displayZoom >= (device?.neutralZoom ?? minZoom);
  const calibrationValues = useMemo(() => {
    const points = [
      {value: minZoom, label: formatZoomFactor(minZoom)},
      {value: 5, label: '5x'},
      {value: maxZoom, label: formatZoomFactor(maxZoom)},
    ];

    return points.map(point => ({
      ...point,
      progress: getZoomSliderProgress(point.value, device),
    }));
  }, [device, maxZoom, minZoom]);

  if (!visible || !device) {
    return null;
  }

  return (
    <View style={styles.zoomControl}>
      <View style={styles.zoomControlBody}>
        <Text style={styles.zoomControlLimit}>{formatZoomFactor(maxZoom)}</Text>
        <View
          ref={railRef}
          {...panResponder.panHandlers}
          onLayout={handleLayout}
          style={styles.zoomRail}
        >
          {calibrationValues.map(point => (
            <View
              key={point.label}
              pointerEvents="none"
              style={[
                styles.zoomRailCalibration,
                {
                  bottom:
                    point.progress *
                    Math.max(trackHeight - THUMB_SIZE, 0),
                },
              ]}
            >
              <View style={styles.zoomRailCalibrationTick} />
              <Text style={styles.zoomRailCalibrationLabel}>{point.label}</Text>
            </View>
          ))}
          <View style={styles.zoomRailTrack}>
            <Animated.View
              style={[styles.zoomRailFill, {height: fillHeightPercent}]}
            />
          </View>
          <View
            style={[
              styles.zoomRailThumb,
              isAboveNeutral ? styles.zoomRailThumbActive : null,
              {bottom: thumbPos.thumb},
            ]}
          />
          <View
            pointerEvents="none"
            style={[styles.zoomRailBubble, {bottom: thumbPos.bubble}]}
          >
            <Text style={styles.zoomRailBubbleText}>
              {formatZoomFactor(displayZoom)}
            </Text>
          </View>
        </View>
        <Text style={styles.zoomControlLimit}>{formatZoomFactor(minZoom)}</Text>
      </View>
    </View>
  );
}
