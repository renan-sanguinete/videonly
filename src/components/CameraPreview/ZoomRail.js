import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Animated, PanResponder, Text, View} from 'react-native';

import {styles} from './styles';
import {
  clamp,
  formatZoomFactor,
  getZoomFromTrackPosition,
  getZoomSliderProgress,
} from '../../utils/cameraZoom';

// Deve bater com zoomRailThumb.height nos estilos.
const THUMB_SIZE = 30;

export default function ZoomRail({
  device,
  visible,
  zoom,
  onZoomChange,
  onZoomCommit,
}) {
  // ─── Refs estáveis (nunca causam recriação do PanResponder) ──────────────
  const railRef = useRef(null);
  const trackHeightRef = useRef(1);
  const railPageYRef = useRef(0);
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

  // ─── Animated values ──────────────────────────────────────────────────────
  // fillHeight em pixels (não percentual) para alinhar exatamente com o thumb
  const fillHeightAnim = useRef(new Animated.Value(0)).current;
  const thumbBottomAnim = useRef(new Animated.Value(0)).current;

  // ─── Calcula geometria a partir do progress [0,1] ─────────────────────────
  // thumbTravel = range em pixels que o centro do thumb percorre
  // fill termina no centro do thumb → fillHeight = thumbBottom + THUMB_SIZE/2
  const computePositions = useCallback((progress) => {
    const h = trackHeightRef.current;
    const p = clamp(progress, 0, 1);
    const thumbTravel = Math.max(h - THUMB_SIZE, 0);

    const thumbBottom = p * thumbTravel;
    // fill cresce do fundo até o CENTRO do thumb
    const fillHeight = clamp(thumbBottom + THUMB_SIZE / 2, 0, h);

    return {thumbBottom, fillHeight};
  }, []);

  const applyPositions = useCallback((progress) => {
    const {thumbBottom, fillHeight} = computePositions(progress);
    fillHeightAnim.setValue(fillHeight);
    thumbBottomAnim.setValue(thumbBottom);
  }, [computePositions, fillHeightAnim, thumbBottomAnim]);

  // ─── Estado de display (só label e cor do thumb — mínimo de re-renders) ───
  const [displayZoom, setDisplayZoom] = useState(zoom);
  const rafRef = useRef(null);

  const flushDisplay = useCallback(() => {
    setDisplayZoom(currentZoomRef.current);
    rafRef.current = null;
  }, []);

  // Sincroniza quando zoom muda externamente (não durante drag)
  useEffect(() => {
    if (!isDraggingRef.current) {
      currentZoomRef.current = zoom;
      setDisplayZoom(zoom);
      applyPositions(getZoomSliderProgress(zoom, device));
    }
  }, [zoom, device, applyPositions]);

  // ─── onLayout: mede altura e posição absoluta do rail ────────────────────
  const handleLayout = useCallback(() => {
    if (!railRef.current) return;
    railRef.current.measure((_x, _y, _w, h, _pageX, pageY) => {
      trackHeightRef.current = h;
      railPageYRef.current = pageY;
      if (!isDraggingRef.current) {
        applyPositions(getZoomSliderProgress(currentZoomRef.current, deviceRef.current));
      }
    });
  }, [applyPositions]);

  // ─── Update central ───────────────────────────────────────────────────────
  const applyZoom = useCallback((pageY) => {
    const localY = pageY - railPageYRef.current;
    const nextZoom = clamp(
      getZoomFromTrackPosition(localY, trackHeightRef.current, deviceRef.current),
      deviceRef.current?.minZoom ?? 1,
      deviceRef.current?.maxZoom ?? 1,
    );

    currentZoomRef.current = nextZoom;

    // Posições visuais via Animated (sem re-render React)
    applyPositions(getZoomSliderProgress(nextZoom, deviceRef.current));

    // Propaga para a câmera
    onZoomChangeRef.current(nextZoom);

    // Label atualizado com throttle de 1 update/frame
    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(flushDisplay);
    }
  }, [applyPositions, flushDisplay]);

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
    [],
  );

  const minZoom = device?.minZoom ?? 1;
  const maxZoom = device?.maxZoom ?? 1;
  const isAboveNeutral = displayZoom >= (device?.neutralZoom ?? minZoom);

  

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
          <View style={styles.zoomRailTrack} pointerEvents="none" />

          <Animated.View
            pointerEvents="none"
            style={[
              styles.zoomRailFill,
              styles.zoomRailFillPosition,
              {height: fillHeightAnim},
            ]}
          />

          <Animated.View
            style={[
              styles.zoomRailThumb,
              isAboveNeutral ? styles.zoomRailThumbActive : null,
              {bottom: thumbBottomAnim},
            ]}
          >
            <Text style={styles.zoomRailBubbleText}>
              {formatZoomFactor(displayZoom)}
            </Text>
          </Animated.View>
        </View>
        <Text style={styles.zoomControlLimit}>{formatZoomFactor(minZoom)}</Text>
      </View>
    </View>
  );
}
