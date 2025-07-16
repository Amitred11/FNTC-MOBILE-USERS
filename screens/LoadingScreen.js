// screens/LoadingScreen.js
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Image, StatusBar } from 'react-native';
import * as Animatable from 'react-native-animatable';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts';

// Define a more dynamic animation for the logo
const logoAnimation = {
  from: { opacity: 0, scale: 0.5, rotate: '-15deg' },
  to: { opacity: 1, scale: 1, rotate: '0deg' },
};

// Animation for the text and dots
const fadeIn = {
  from: { opacity: 0 },
  to: { opacity: 1 },
};

export default function LoadingScreen() {
    const { theme } = useTheme(); 
    const styles = getStyles(theme);

    // Determine gradient colors based on the theme
    const gradientColors = theme?.isDarkMode 
      ? ['#1C1C1E', '#121212'] // Dark gray to black
      : ['#FFFFFF', '#F0F2F5']; // White to soft gray

    return (
        <LinearGradient colors={gradientColors} style={styles.container}>
            <SafeAreaView style={styles.content}>
                <StatusBar 
                    barStyle={theme?.isDarkMode ? 'light-content' : 'dark-content'} 
                    backgroundColor="transparent"
                    translucent
                />
                
                {/* A decorative, pulsing ring behind the logo for visual interest */}
                <Animatable.View 
                    style={styles.ring}
                    animation={{ from: { scale: 1, opacity: 0.3 }, to: { scale: 1.4, opacity: 0 } }}
                    iterationCount="infinite"
                    duration={1000}
                    easing="ease-out"
                />

                {/* The main logo with its own entrance animation */}
                <Animatable.View
                    animation={logoAnimation}
                    duration={800}
                    easing="ease-out-expo"
                >
                    <Image
                        source={require('../assets/images/logo.png')}
                        style={styles.logo}
                    />
                </Animatable.View>

                {/* The loading text and animated dots */}
                <View style={styles.textContainer}>
                    <Animatable.Text
                        animation={fadeIn}
                        duration={600}
                        delay={500}
                        style={styles.loadingText}
                    >
                        Loading Your Experience
                    </Animatable.Text>
                    <View style={styles.dotsContainer}>
                        <Animatable.Text animation="fadeIn" delay={800} style={styles.dot}>.</Animatable.Text>
                        <Animatable.Text animation="fadeIn" delay={1000} style={styles.dot}>.</Animatable.Text>
                        <Animatable.Text animation="fadeIn" delay={1200} style={styles.dot}>.</Animatable.Text>
                    </View>
                </View>
            </SafeAreaView>
        </LinearGradient>
    );
}

const getStyles = (theme) => StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    ring: {
        position: 'absolute',
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: theme?.isDarkMode ? `${theme?.primary}20` : `${theme?.primary}30`, // Semi-transparent primary color
    },
    logo: {
        width: 120,
        height: 120,
        resizeMode: 'contain',
    },
    textContainer: {
        position: 'absolute',
        bottom: 80,
        flexDirection: 'row',
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 16,
        fontWeight: '600',
        color: theme?.textSecondary || '#6c757d',
    },
    dotsContainer: {
        flexDirection: 'row',
        marginLeft: 2,
    },
    dot: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme?.textSecondary || '#6c757d',
    }
});