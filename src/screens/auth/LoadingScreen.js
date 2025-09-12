// screens/LoadingScreen.js (Cleaned)

import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, Image, StatusBar, Platform } from 'react-native';
import * as Animatable from 'react-native-animatable';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts';

// --- Constants for Animations and Assets ---
const LOGO_IMAGE = require('../../assets/images/logos/logo.png');

const LOGO_ANIMATION = {
  from: { opacity: 0, scale: 0.5, rotate: '-15deg' },
  to: { opacity: 1, scale: 1, rotate: '0deg' },
};

const TEXT_FADE_IN = {
  from: { opacity: 0 },
  to: { opacity: 1 },
};

const PULSE_RING_ANIMATION = {
    from: { scale: 1, opacity: 0.3 },
    to: { scale: 1.4, opacity: 0 }
};


// --- Main Screen Component ---
export default function LoadingScreen() {
  const { theme } = useTheme();
  const styles = getStyles(theme);

  const gradientColors = theme.isDarkMode
    ? ['#1C1C1E', '#121212']
    : ['#FFFFFF', '#F0F2F5'];

  return (
    <LinearGradient colors={gradientColors} style={styles.container}>
      <StatusBar
        barStyle={theme.isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />
      <SafeAreaView style={styles.content}>
        <Animatable.View
          style={styles.ring}
          animation={PULSE_RING_ANIMATION}
          iterationCount="infinite"
          duration={1200} // Slightly slower for a calmer feel
          easing="ease-out"
        />

        <Animatable.View 
            animation={LOGO_ANIMATION} 
            duration={800} 
            easing="ease-out-expo"
            useNativeDriver={true} // Performance optimization
        >
          <Image source={LOGO_IMAGE} style={styles.logo} />
        </Animatable.View>

        <View style={styles.textContainer}>
          <Animatable.Text 
            animation={TEXT_FADE_IN} 
            duration={600} 
            delay={500} 
            style={styles.loadingText}
            useNativeDriver={true}
          >
            Loading Your Experience
          </Animatable.Text>
          <View style={styles.dotsContainer}>
            <Animatable.Text useNativeDriver={true} animation="fadeIn" delay={800} style={styles.dot}>.</Animatable.Text>
            <Animatable.Text useNativeDriver={true} animation="fadeIn" delay={1000} style={styles.dot}>.</Animatable.Text>
            <Animatable.Text useNativeDriver={true} animation="fadeIn" delay={1200} style={styles.dot}>.</Animatable.Text>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const getStyles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    logo: {
      width: 120,
      height: 120,
      resizeMode: 'contain',
    },
    ring: {
      position: 'absolute',
      width: 200,
      height: 200,
      borderRadius: 100,
      backgroundColor: `${theme.primary}30`,
    },
    textContainer: {
      position: 'absolute',
      bottom: Platform.OS === 'ios' ? 80 : 60,
      flexDirection: 'row',
      alignItems: 'center',
    },
    loadingText: {
      color: theme.textSecondary,
      fontSize: 16,
      fontWeight: '600',
    },
    dotsContainer: {
      flexDirection: 'row',
      marginLeft: 2,
    },
    dot: {
      color: theme.textSecondary,
      fontSize: 18,
      fontWeight: 'bold',
    },
  });