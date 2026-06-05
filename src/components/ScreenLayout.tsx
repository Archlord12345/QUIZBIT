import React from 'react';
import {
  ScrollView,
  ScrollViewProps,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { COLORS, SPACING } from '../utils/theme';
import { LAYOUT, RADIUS, SHADOW, UI } from '../utils/ui';

type ScreenHeaderProps = {
  title: string;
  onBack?: () => void;
  showBack?: boolean;
  right?: React.ReactNode;
};

export const ScreenHeader = ({
  title,
  onBack,
  showBack = Boolean(onBack),
  right,
}: ScreenHeaderProps) => (
  <View style={styles.header}>
    {showBack && onBack ? (
      <TouchableOpacity
        onPress={onBack}
        style={styles.backButton}
        activeOpacity={0.8}
      >
        <Text style={styles.backArrow}>←</Text>
      </TouchableOpacity>
    ) : (
      <View style={styles.headerSide} />
    )}
    <Text style={styles.headerTitle} numberOfLines={1}>
      {title}
    </Text>
    {right ?? <View style={styles.headerSide} />}
  </View>
);

type ScreenScrollProps = ScrollViewProps & {
  contentStyle?: ViewStyle;
};

export const ScreenScroll = ({
  children,
  contentContainerStyle,
  contentStyle,
  ...rest
}: ScreenScrollProps) => (
  <ScrollView
    contentContainerStyle={[
      styles.scrollContent,
      contentStyle,
      contentContainerStyle,
    ]}
    showsVerticalScrollIndicator={false}
    keyboardShouldPersistTaps="handled"
    {...rest}
  >
    {children}
  </ScrollView>
);

export const screenCardStyle: ViewStyle = {
  backgroundColor: COLORS.surface,
  borderRadius: RADIUS.lg,
  borderWidth: 1,
  borderColor: UI.line,
  padding: SPACING.lg,
  marginHorizontal: LAYOUT.screenPaddingH,
  marginBottom: LAYOUT.sectionGap,
  ...SHADOW.card,
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: LAYOUT.screenPaddingH,
    paddingTop: SPACING.sm,
    paddingBottom: LAYOUT.sectionGap,
  },
  headerSide: {
    width: 40,
    height: 40,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: UI.line,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.soft,
  },
  backArrow: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textSubtle,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.text,
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  scrollContent: {
    flexGrow: 1,
    backgroundColor: COLORS.background,
    paddingBottom: LAYOUT.screenPaddingBottom,
  },
});
