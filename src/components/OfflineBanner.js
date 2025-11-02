// src/components/OfflineBanner.js

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const OfflineBanner = ({ isOnline, justCameOnline }) => {
  const insets = useSafeAreaInsets();
  
  const translateY = useRef(new Animated.Value(-150)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const isOffline = !isOnline;
  const isShowingOnlineStatus = justCameOnline && isOnline;

  useEffect(() => {
    const shouldShow = isOffline || isShowingOnlineStatus;

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: shouldShow ? 0 : -150,
        duration: 500,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1), 
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: shouldShow ? 1 : 0,
        duration: 400, 
        easing: Easing.ease,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isOffline, isShowingOnlineStatus]);

  const isError = isOffline; 

  const gradientColors = isError
    ? ['#FF6B6B', '#E74C3C'] 
    : ['#2ECC71', '#28B463'];

  const iconName = isError ? "wifi-off" : "wifi";
  const titleText = isError ? "Connection Error" : "Connection Restored";
  const subtitleText = isError ? "Please check your network settings" : "You are back online!";

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
      <LinearGradient colors={gradientColors} style={styles.gradient}>
        <Feather name={iconName} size={24} color="#FFFFFF" />
        <View style={styles.textContainer}>
          <Text style={styles.title}>{titleText}</Text>
          <Text style={styles.subtitle}>{subtitleText}</Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    marginHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    borderRadius: 16,
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
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
    marginTop: 2,
  },
});

export default OfflineBanner;