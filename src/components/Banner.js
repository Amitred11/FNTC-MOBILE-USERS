// src/components/Banner.js
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const Banner = ({ type = 'info', title, message, visible }) => {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-150)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: visible ? 0 : -150,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: visible ? 1 : 0,
        duration: 300,
        easing: Easing.ease,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible]);

  const configMap = {
  success: { colors: ['#2ECC71', '#27AE60'], icon: 'check-circle', titleDefault: 'Success' },
  error: { colors: ['#E74C3C', '#C0392B'], icon: 'alert-circle', titleDefault: 'Error' },
  warning: { colors: ['#F39C12', '#E67E22'], icon: 'alert-triangle', titleDefault: 'Warning' },
  info: { colors: ['#3498DB', '#2980B9'], icon: 'info', titleDefault: 'Information' },
};

const config = configMap[type] || configMap.info;
if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          paddingTop: insets.top + 5,
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <LinearGradient colors={config.colors} style={styles.gradient}>
        <Feather name={config.icon} size={24} color="#fff" />
        <View style={styles.textContainer}>
          <Text style={styles.title}>{title || config.titleDefault}</Text>
          {message && <Text style={styles.subtitle}>{message}</Text>}
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 10,
    right: 10,
    zIndex: 999,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    overflow: 'hidden',
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  textContainer: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    marginTop: 2,
  },
});

export default Banner;
