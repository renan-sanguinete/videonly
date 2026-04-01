import React from 'react';
import {Pressable, Switch, Text, TextInput, View} from 'react-native';

import {styles} from './styles';

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
