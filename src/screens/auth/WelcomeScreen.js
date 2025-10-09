import React, { useRef, useEffect } from 'react';
import {
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  View,
  ImageBackground,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Easing } from 'react-native';

const { width, height } = Dimensions.get('window');

const AnimatedImageBackground = Animated.createAnimatedComponent(ImageBackground);

export default function SplashScreen2() {
  const navigation = useNavigation();

  // Define the animated values. We no longer need containerTranslateY.
  const backgroundScale = useRef(new Animated.Value(1.15)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(0)).current;

  // This useEffect hook runs ONLY ONCE when the component mounts.
  useEffect(() => {
    // A slow, subtle background zoom
    const backgroundAnimation = Animated.timing(backgroundScale, {
      toValue: 1,
      duration: 6000,
      useNativeDriver: true,
      easing: Easing.out(Easing.quad),
    });

    // The continuous "breathing" animation
    const breathingAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(contentTranslateY, {
          toValue: -15,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(contentTranslateY, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    // The initial fade-in for the content
    const fadeInAnimation = Animated.timing(contentOpacity, {
      toValue: 1,
      duration: 1500,
      useNativeDriver: true,
    });

    // Start all animations. They will continue to run indefinitely.
    backgroundAnimation.start();
    breathingAnimation.start();
    fadeInAnimation.start();

    // The cleanup function will stop animations if the component is ever unmounted
    return () => {
      backgroundAnimation.stop();
      breathingAnimation.stop();
      fadeInAnimation.stop();
    };
  }, []); // The empty array [] ensures this effect runs only once.

  // --- SIMPLIFIED HANDLE NEXT FUNCTION ---
  // This is the most important change. It only navigates.
  const handleNext = () => {
    navigation.navigate('GetStarted');
  };

  // --- Define Animated Styles ---
  const animatedBackgroundStyle = { transform: [{ scale: backgroundScale }] };
  const animatedContentStyle = {
    opacity: contentOpacity,
    transform: [{ translateY: contentTranslateY }],
  };

  return (
    <View style={styles.container}>
      <AnimatedImageBackground
        source={require('../../assets/images/backgrounds/bgimage.jpg')}
        style={[styles.background, animatedBackgroundStyle]}
        resizeMode="cover"
      />

      {/* The main container is now a regular View, not animated */}
      <View style={styles.contentContainer}>
        <Animated.View style={[styles.animatedContentWrapper, animatedContentStyle]}>
          <Animated.Image
            source={require('../../assets/images/logos/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />

          <Animated.Text style={styles.taglineText}>
            Local, Simple and Reliable
          </Animated.Text>

          <TouchableOpacity onPress={handleNext} style={styles.getStartedButton}>
            <Text style={styles.getStartedText}>Get Started</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    backgroundColor: '#000',
    flex: 1,
    overflow: 'hidden',
  },
  contentContainer: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    flex: 1,
    justifyContent: 'center',
  },
  animatedContentWrapper: {
    alignItems: 'center',
    width: '100%',
  },
  getStartedButton: {
    alignItems: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 30,
    paddingHorizontal: width * 0.18,
    paddingVertical: height * 0.018,
    marginTop: height * 0.04,
    elevation: 8,
  },
  getStartedText: {
    color: '#fff',
    fontSize: width * 0.045,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  logo: {
    width: width * 0.7,
    height: height * 0.2,
    marginBottom: 10,
  },
  taglineText: {
    fontSize: width * 0.045,
    color: '#FFFFFF',
    textAlign: 'center',
    opacity: 0.9,
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 5,
  },
});