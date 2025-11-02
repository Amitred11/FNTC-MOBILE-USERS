import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Image, StatusBar } from 'react-native';
import * as Animatable from 'react-native-animatable';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts';

// --- System Colors ---
const SYSTEM_PRIMARY_DARK = '#0A0A10';
const SYSTEM_SECONDARY_DARK = '#1C1C22';
const DIGITAL_ACCENT_BLUE = '#00FFFF';
const DIGITAL_ACCENT_RED = '#FF004C';
const SYSTEM_GRADIENT_COLORS = [SYSTEM_PRIMARY_DARK, SYSTEM_SECONDARY_DARK, '#0A0A15'];

// --- Assets ---
const LOGO_IMAGE = require('../../assets/images/logos/logo.png');

// --- Animations ---
const LOGO_APPEAR_ANIMATION = {
  0: { opacity: 0, scale: 0.7, rotate: '15deg' },
  0.6: { opacity: 1, scale: 1.1, rotate: '-3deg' },
  1: { opacity: 1, scale: 1, rotate: '0deg' },
};

const PULSE_RING_ANIMATION_BLUE = {
  from: { scale: 1, opacity: 0.4 },
  to: { scale: 1.6, opacity: 0 },
};

const PULSE_RING_ANIMATION_RED = {
  from: { scale: 0.8, opacity: 0.3 },
  to: { scale: 1.4, opacity: 0 },
};

const TEXT_FADE_IN_UP = {
  from: { opacity: 0, translateY: 20 },
  to: { opacity: 1, translateY: 0 },
};

export default function LoadingScreen() {
  const { theme } = useTheme();
  const styles = getStyles(theme);


  return (
    <LinearGradient colors={SYSTEM_GRADIENT_COLORS} style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <SafeAreaView style={styles.content}>

        {/* Outer Blue Ring */}
        <Animatable.View
          style={[styles.ring, styles.ringOuter]}
          animation={PULSE_RING_ANIMATION_BLUE}
          iterationCount="infinite"
          duration={2500}
          easing="ease-out"
          useNativeDriver
        />

        {/* Inner Red Ring */}
        <Animatable.View
          style={[styles.ring, styles.ringInner]}
          animation={PULSE_RING_ANIMATION_RED}
          iterationCount="infinite"
          duration={2500}
          delay={500}
          easing="ease-out"
          useNativeDriver
        />

        {/* Centered Logo */}
        <Animatable.View
          animation={LOGO_APPEAR_ANIMATION}
          duration={1000}
          easing="ease-out-expo"
          useNativeDriver
        >
          <Image source={LOGO_IMAGE} style={styles.logo} />
        </Animatable.View>

        {/* System Message Text */}
        <View style={styles.textContainer}>
          <Animatable.Text
            animation={TEXT_FADE_IN_UP}
            duration={800} 
            delay={0} 
            style={styles.systemStatusText}
            useNativeDriver
          >
            Welcome to FiBear Network Technologies Corp. Kasiglahan Branch Montalban
          </Animatable.Text>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

// --- Styles ---
const getStyles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 30, // Keep padding for text wrapping
    },
    logo: {
      width: 120,
      height: 120,
      resizeMode: 'contain',
      shadowColor: DIGITAL_ACCENT_BLUE,
      shadowOffset: { width: 0, height: 0 },
      shadowRadius: 15,
      shadowOpacity: 0.6,
    },
    ring: {
      position: 'absolute',
      borderRadius: 200,
      borderWidth: 2,
    },
    ringOuter: {
      width: 250,
      height: 250,
      borderColor: DIGITAL_ACCENT_BLUE,
    },
    ringInner: {
      width: 180,
      height: 180,
      borderColor: DIGITAL_ACCENT_RED,
    },
    textContainer: {
      position: 'absolute',
      bottom: 60,
      left: 30, // Ensure left/right bounds for text wrapping
      right: 30, // Ensure left/right bounds for text wrapping
      flexDirection: 'row', // Keep for dots next to text
      alignItems: 'center',
      justifyContent: 'center', // Center text and dots horizontally
      flexWrap: 'wrap', // Allow dots to wrap if text is too long on one line
    },
    systemStatusText: { // Renamed and styled for system messages
      color: theme.textSecondary || '#BBBBBB',
      fontSize: 16,
      fontWeight: '600',
      textAlign: 'center',
      lineHeight: 22,
      letterSpacing: 0.5,
      textShadowColor: 'rgba(0, 255, 255, 0.2)', // Subtle text glow
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 5,
      flexShrink: 1, // Allow text to shrink and wrap
    },
  });