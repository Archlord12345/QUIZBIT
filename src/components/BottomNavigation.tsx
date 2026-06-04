import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING } from '../utils/theme';

export interface NavItem {
  icon: string;
  label: string;
  id: string;
}

interface BottomNavigationProps {
  items: NavItem[];
  activeItem: string;
  onItemPress: (itemId: string) => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  items,
  activeItem,
  onItemPress,
}) => {
  return (
    <View style={styles.container}>
      {items.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={[
            styles.navItem,
            activeItem === item.id && styles.navItemActive,
          ]}
          onPress={() => onItemPress(item.id)}
        >
          <Text
            style={[
              styles.icon,
              activeItem === item.id && styles.iconActive,
            ]}
          >
            {item.icon}
          </Text>
          <Text
            style={[
              styles.label,
              activeItem === item.id && styles.labelActive,
            ]}
          >
            {item.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: '#F0F2F5',
    justifyContent: 'space-around',
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  navItemActive: {
    backgroundColor: '#EAF2FF',
  },
  icon: {
    fontSize: 24,
    marginBottom: 4,
    opacity: 0.6,
  },
  iconActive: {
    opacity: 1,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B778C',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  labelActive: {
    color: COLORS.primary,
    fontWeight: '900',
  },
});
