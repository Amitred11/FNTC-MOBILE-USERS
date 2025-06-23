import React, { useState } from 'react';
import {
  Text,
  Image,
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

export default function SplashScreen2() {
  const navigation = useNavigation();
  const [showContent, setShowContent] = useState(false);
  const opacity = React.useRef(new Animated.Value(0)).current;
  const translateY = React.useRef(new Animated.Value(0)).current;

  useFocusEffect(
    React.useCallback(() => {
      setShowContent(false);
      opacity.setValue(0);
      translateY.setValue(0);

      const timer = setTimeout(() => {
        setShowContent(true);
        Animated.timing(opacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
          easing: Easing.ease,
        }).start();
      }, 500);

      return () => clearTimeout(timer);
    }, [])
  );

  const handleNext = () => {
    Animated.timing(translateY, {
      toValue: -height,
      duration: 500,
      useNativeDriver: true,
      easing: Easing.easeOut,
    }).start(() => {
      navigation.navigate('GetStarted');
    });
  };

  const animatedContainStyle = {
    ...styles.contain,
    transform: [{ translateY: translateY }],
    opacity: opacity,
  };

  return (
    <>
      <ImageBackground
        source={require('../assets/images/bgimage.jpg')}
        style={styles.background}
        resizeMode="cover"
      />
      {showContent && (
        <View style={styles.container}>
          <Animated.View style={animatedContainStyle}>
            <Image
              source={require('../assets/images/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <TouchableOpacity onPress={handleNext} style={styles.getStartedButton}>
              <Text style={styles.getStartedText}>Get Started</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  contain: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  logo: {
    width: width * 0.7,
    height: undefined,
    aspectRatio: 250 / 150,
    marginBottom: height * 0.06,
  },
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
    zIndex: -1,
    position: 'absolute',
    top: 0,
    left: 0,
  },
  getStartedButton: {
    backgroundColor: '#007AFF',
    paddingVertical: height * 0.018,
    paddingHorizontal: width * 0.18,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: height * 0.025,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 3, height: 6 },
        shadowOpacity: 0.6,
        shadowRadius: 10,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  getStartedText: {
    color: '#fff',
    fontSize: width * 0.045,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});