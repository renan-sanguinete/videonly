import React, {useCallback, useMemo, useRef, useState} from 'react';
import {PanResponder, Pressable, Switch, Text, TextInput, View} from 'react-native';

import {styles} from './styles';

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function SectionTitle({children}) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

export function Card({children}) {
  return <View style={styles.card}>{children}</View>;
}

export function ToggleRow({
  label,
  description,
  value,
  onValueChange,
  disabled = false,
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text style={styles.label}>{label}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>
      <Switch value={value} onValueChange={onValueChange} disabled={disabled} />
    </View>
  );
}

export function OptionChips({value, options, onChange, disabled = false}) {
  return (
    <View style={styles.chipsWrap}>
      {options.map(option => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            disabled={disabled}
            style={[
              styles.chip,
              active && styles.chipActive,
              disabled && styles.chipDisabled,
            ]}>
            <Text style={[styles.chipText, active && styles.chipTextActive]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function NumberField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'numeric',
}) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#6b7280"
        keyboardType={keyboardType}
        style={styles.input}
      />
    </View>
  );
}

export function SliderField({
  label,
  description,
  value,
  onValueChange,
  min,
  max,
  step = 1,
  precision = 0,
  formatValue = nextValue => String(nextValue),
  minimumLabel,
  maximumLabel,
  emptyValueLabel,
  disabled = false,
  progressFromValue,
  valueFromProgress,
}) {
  const trackWidthRef = useRef(1);
  const [trackWidth, setTrackWidth] = useState(1);

  const safeMin = Number.isFinite(min) ? min : 0;
  const safeMax = Number.isFinite(max) ? max : safeMin;
  const numericValue = Number(value);
  const displayValue = Number.isFinite(numericValue)
    ? clamp(numericValue, safeMin, safeMax)
    : safeMin;
  const displayValueLabel = Number.isFinite(numericValue)
    ? formatValue(displayValue)
    : emptyValueLabel ?? formatValue(displayValue);

  const progress = useMemo(() => {
    if (safeMax === safeMin) {
      return 0;
    }

    if (typeof progressFromValue === 'function') {
      return clamp(progressFromValue(displayValue), 0, 1);
    }

    return (displayValue - safeMin) / (safeMax - safeMin);
  }, [displayValue, progressFromValue, safeMax, safeMin]);

  const commitFromProgress = useCallback(
    nextProgress => {
      if (disabled || typeof onValueChange !== 'function' || safeMax === safeMin) {
        return;
      }

      const boundedProgress = clamp(nextProgress, 0, 1);
      const rawValue =
        typeof valueFromProgress === 'function'
          ? valueFromProgress(boundedProgress)
          : safeMin + (safeMax - safeMin) * boundedProgress;
      const snappedValue =
        step > 0 ? Math.round(rawValue / step) * step : rawValue;
      const boundedValue = clamp(snappedValue, safeMin, safeMax);
      const nextValue = Number(boundedValue.toFixed(precision));

      onValueChange(String(nextValue));
    },
    [
      disabled,
      onValueChange,
      precision,
      safeMax,
      safeMin,
      step,
      valueFromProgress,
    ],
  );

  const handleMove = useCallback(
    locationX => {
      const width = Math.max(trackWidthRef.current, 1);
      commitFromProgress(locationX / width);
    },
    [commitFromProgress],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabled,
        onMoveShouldSetPanResponder: () => !disabled,
        onPanResponderGrant: event => {
          handleMove(event.nativeEvent.locationX);
        },
        onPanResponderMove: event => {
          handleMove(event.nativeEvent.locationX);
        },
        onPanResponderRelease: event => {
          handleMove(event.nativeEvent.locationX);
        },
      }),
    [disabled, handleMove],
  );

  return (
    <View style={styles.sliderBlock}>
      <View style={styles.sliderHeader}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.sliderValue}>{displayValueLabel}</Text>
      </View>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      <View
        {...panResponder.panHandlers}
        onLayout={event => {
          const width = event.nativeEvent.layout.width;
          trackWidthRef.current = width;
          setTrackWidth(width);
        }}
        style={[styles.sliderTrackWrap, disabled && styles.sliderTrackWrapDisabled]}
      >
        <View style={styles.sliderTrack} pointerEvents="none" />
        <View
          pointerEvents="none"
          style={[styles.sliderFill, {width: Math.max(trackWidth * progress, 0)}]}
        />
        <View
          pointerEvents="none"
          style={[
            styles.sliderThumb,
            {left: Math.max(trackWidth * progress - 11, 0)},
          ]}
        />
      </View>
      <View style={styles.sliderRangeRow}>
        <Text style={styles.sliderRangeLabel}>
          {minimumLabel ?? formatValue(safeMin)}
        </Text>
        <Text style={styles.sliderRangeLabel}>
          {maximumLabel ?? formatValue(safeMax)}
        </Text>
      </View>
    </View>
  );
}
