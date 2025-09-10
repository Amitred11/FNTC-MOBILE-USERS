import React, { useRef, useCallback } from 'react';
import {
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  View,
  ImageBackground,
  Platform,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Easing } from 'react-native';

const { width, height } = Dimensions.get('window');

// Use Animated's components for animatable versions
const AnimatedImageBackground = Animated.createAnimatedComponent(ImageBackground);

export default function SplashScreen2() {
  const navigation = useNavigation();

  // --- NEW Animated values for a more complex sequence ---
  const backgroundScale = useRef(new Animated.Value(1.15)).current;

  const welcomeOpacity = useRef(new Animated.Value(0)).current;
  const welcomeTranslateY = useRef(new Animated.Value(20)).current;

  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;

  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineTranslateY = useRef(new Animated.Value(20)).current;

  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const buttonTranslateY = useRef(new Animated.Value(50)).current;

  const containerTranslateY = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      // Reset all animations every time the screen is focused
      backgroundScale.setValue(1.15);
      welcomeOpacity.setValue(0);
      welcomeTranslateY.setValue(20);
      logoOpacity.setValue(0);
      logoScale.setValue(0.8);
      taglineOpacity.setValue(0);
      taglineTranslateY.setValue(20);
      buttonTranslateY.setValue(50);
      buttonOpacity.setValue(0);
      containerTranslateY.setValue(0);

      // --- NEW, more sophisticated animation sequence ---

      // Background zoom runs independently for a slow, constant effect
      const backgroundAnimation = Animated.timing(backgroundScale, {
        toValue: 1,
        duration: 5000, // A very long, subtle zoom
        useNativeDriver: true,
        easing: Easing.out(Easing.quad),
      });

      // The content animates in distinct, overlapping stages
      const contentAnimation = Animated.sequence([
        // Stage 1: "Welcome" text appears
        Animated.delay(500),
        Animated.parallel([
          Animated.timing(welcomeOpacity, {
            toValue: 1,
            duration: 800,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
          Animated.timing(welcomeTranslateY, {
            toValue: 0,
            duration: 800,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),

        // Stage 2: "Welcome" text fades out, making way for the logo
        Animated.delay(1200),
        Animated.timing(welcomeOpacity, {
          toValue: 0,
          duration: 500,
          easing: Easing.ease,
          useNativeDriver: true,
        }),

        // Stage 3: Logo appears
        Animated.parallel([
          Animated.timing(logoOpacity, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.spring(logoScale, {
            toValue: 1,
            friction: 4,
            tension: 50,
            useNativeDriver: true,
          }),
        ]),

        // Stage 4: Tagline and Button appear as the final call-to-action
        Animated.delay(300),
        Animated.parallel([
          Animated.timing(taglineOpacity, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(taglineTranslateY, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(buttonOpacity, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(buttonTranslateY, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
            easing: Easing.out(Easing.ease),
          }),
        ]),
      ]);

      // Run animations
      backgroundAnimation.start();
      contentAnimation.start();

      return () => {
        backgroundAnimation.stop();
        contentAnimation.stop();
      };
    }, [])
  );

  const handleNext = () => {
    Animated.timing(containerTranslateY, {
      toValue: -height,
      duration: 600,
      useNativeDriver: true,
      easing: Easing.inOut(Easing.ease),
    }).start(() => {
      navigation.navigate('GetStarted');
    });
  };

  // --- Animated Styles ---
  const animatedContainerStyle = { transform: [{ translateY: containerTranslateY }] };
  const animatedBackgroundStyle = { transform: [{ scale: backgroundScale }] };
  const animatedWelcomeStyle = {
    opacity: welcomeOpacity,
    transform: [{ translateY: welcomeTranslateY }],
  };
  const animatedLogoStyle = { opacity: logoOpacity, transform: [{ scale: logoScale }] };
  const animatedTaglineStyle = {
    opacity: taglineOpacity,
    transform: [{ translateY: taglineTranslateY }],
  };
  const animatedButtonStyle = {
    opacity: buttonOpacity,
    transform: [{ translateY: buttonTranslateY }],
  };

  return (
    <View style={styles.container}>
      <AnimatedImageBackground
        source={require('../../assets/images/bgimage.jpg')}
        style={[styles.background, animatedBackgroundStyle]}
        resizeMode="cover"
      />

      {/* This view now acts as the container for all animated content */}
      <Animated.View style={[styles.contentContainer, animatedContainerStyle]}>
        {/* Absolute position for the welcome text so it can overlap */}
        <Animated.Text style={[styles.welcomeText, animatedWelcomeStyle]}>Welcome</Animated.Text>

        <Animated.Image
          source={require('../../assets/images/logo.png')}
          style={[styles.logo, animatedLogoStyle]}
          resizeMode="contain"
        />

        <Animated.Text style={[styles.taglineText, animatedTaglineStyle]}>
          Your Connection, Your Speed
        </Animated.Text>

        <Animated.View style={animatedButtonStyle}>
          <TouchableOpacity onPress={handleNext} style={styles.getStartedButton}>
            <Text style={styles.getStartedText}>Get Started</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
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
  },
  contentContainer: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    flex: 1,
    justifyContent: 'center',
  },
  getStartedButton: {
    alignItems: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 30,
    paddingHorizontal: width * 0.18,
    paddingVertical: height * 0.018,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  getStartedText: {
    color: '#fff',
    fontSize: width * 0.045,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  logo: {
    aspectRatio: 250 / 150,
    height: undefined,
    width: width * 0.7,
  },
  taglineText: {
    fontSize: width * 0.045,
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: -height * 0.02, // Negative margin to bring it closer to the logo
    marginBottom: height * 0.04,
    opacity: 0.9,
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 5,
  },
  welcomeText: {
    fontSize: width * 0.12,
    fontWeight: 'bold',
    color: '#FFFFFF',
    position: 'absolute', // Allows it to be centered independently of other elements
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 10,
  },
});
