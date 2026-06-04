import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import styles from './styles/Header.styles';

interface HeaderProps {
  greeting?: string;
  userName?: string;
  onNotificationPress?: () => void;
  showNotification?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  greeting = 'Bonjour',
  userName = 'Léo Mendes',
  onNotificationPress,
  showNotification = true,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.greetingContainer}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>LM</Text>
        </View>
        <View>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.userName}>{userName}</Text>
        </View>
      </View>
      {showNotification && (
        <TouchableOpacity onPress={onNotificationPress} style={styles.notificationButton}>
          <Text style={styles.notificationIcon}>🔔</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};
