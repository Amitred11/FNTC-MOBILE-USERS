// components/BottomNavBar.js
import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../contexts/ThemeContext';

const NavItem = React.memo(({ name, icon, IconComponent, activeScreen, onPress, theme }) => {
  const styles = getStyles(theme);
  const isActive = activeScreen === name;
  const color = isActive ? theme.primary : theme.textForNav;

  return (
    <TouchableOpacity style={styles.navItem} onPress={onPress}>
      <IconComponent name={icon} size={isActive ? 26 : 24} color={color} />
      <Text style={[styles.navLabel, isActive && styles.activeNavLabel]}>{name}</Text>
    </TouchableOpacity>
  );
});

export const BottomNavBar = ({ activeScreen }) => {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const navigation = useNavigation();

  const navigateTo = useCallback(
    (screen) => {
      navigation.navigate(screen);
    },
    [navigation]
  );

  return (
    <View style={styles.navContainer}>
      <BlurView intensity={100} tint={theme.isDarkMode ? 'dark' : 'light'} style={styles.navBlur}>
        <NavItem
          name="Home"
          icon="home"
          IconComponent={Ionicons}
          activeScreen={activeScreen}
          onPress={() => navigateTo('Home')}
          theme={theme}
        />
        <NavItem
          name="Plan"
          icon="rss"
          IconComponent={FontAwesome}
          activeScreen={activeScreen}
          onPress={() => navigateTo('Subscription')}
          theme={theme}
        />
        <NavItem
          name="Billing"
          icon="receipt-long"
          IconComponent={MaterialIcons}
          activeScreen={activeScreen}
          onPress={() => navigateTo('MyBills')}
          theme={theme}
        />
        <NavItem
          name="Support"
          icon="chatbubble-ellipses-outline"
          IconComponent={Ionicons}
          activeScreen={activeScreen}
          onPress={() => navigateTo('Support')}
          theme={theme}
        />
      </BlurView>
    </View>
  );
};

const getStyles = (theme) =>
  StyleSheet.create({
    activeNavLabel: {
      color: theme.primary,
      fontWeight: '600',
    },
    navBlur: {
      alignItems: 'center',
      borderColor: 'rgba(255, 255, 255, 0.2)',
      borderRadius: 25,
      borderWidth: theme.isDarkMode ? 1 : 0,
      flexDirection: 'row',
      height: 75,
      justifyContent: 'space-around',
      overflow: 'hidden',
    },
    navContainer: {
      borderColor: theme.isDarkMode ? 'rgba(255, 255, 255, 0.2)' : theme.border,
      borderRadius: 30,
      borderWidth: 2,
      bottom: 20,
      left: 20,
      position: 'absolute',
      right: 20,
      zIndex: 10,
    },
    navItem: {
      alignItems: 'center',
      flex: 1,
      justifyContent: 'center',
    },
    navLabel: {
      color: theme.textForNav,
      fontSize: 11,
      marginTop: 5,
    },
  });
