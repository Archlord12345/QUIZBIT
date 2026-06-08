import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { COLORS, LINE } from '../utils/theme';

interface OptionChipProps {
  active: boolean;
  label: string;
  onPress: () => void;
}

/** Pill-shaped toggle used in segmented controls (quiz format, options...). */
export const OptionChip: React.FC<OptionChipProps> = ({
  active,
  label,
  onPress,
}) => (
  <TouchableOpacity
    style={[styles.chip, active && styles.chipActive]}
    onPress={onPress}
  >
    <Text style={[styles.text, active && styles.textActive]}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  chip: {
    borderColor: LINE,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  text: {
    color: COLORS.text,
    fontWeight: '800',
  },
  textActive: {
    color: COLORS.textOnDark,
  },
});

export default OptionChip;
