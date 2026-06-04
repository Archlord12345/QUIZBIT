import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import styles from './styles/BottomNavigation.styles';

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
