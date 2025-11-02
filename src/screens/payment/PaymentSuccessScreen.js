// screens/PaymentSuccessScreen.js (Corrected Modern Redesign)

import React, { useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Platform, ScrollView} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import * as Animatable from 'react-native-animatable';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';
import { BlurView } from 'expo-blur';
import { useSubscription, useTheme } from '../../contexts';

export default function PaymentSuccessScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { theme } = useTheme();
  const { refreshSubscription } = useSubscription();
  const styles = getStyles(theme);
  const animationRef = useRef(null);

  const { amount = '0.00' } = route.params || {};

  useFocusEffect(
    useCallback(() => {
      StatusBar.setBarStyle(theme.isDarkMode ? 'light-content' : 'dark-content');
      refreshSubscription();
    }, [refreshSubscription, theme.isDarkMode])
  );

  useEffect(() => {
    animationRef.current?.play();
  }, []);

  const handleDone = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainStack', params: { screen: 'MyBills' } }],
    });
  };

  const Card = ({ children }) => {
    if (Platform.OS === 'ios') {
      return (
        <BlurView intensity={80} tint={theme.isDarkMode ? 'dark' : 'light'} style={styles.card}>
          {children}
        </BlurView>
      );
    }
    return <View style={[styles.card, styles.cardAndroid]}>{children}</View>;
  };

  return (
    <SafeAreaView style={styles.container}>
      <LottieView
        ref={animationRef}
        source={require('../../assets/animations/confetti.json')} 
        style={styles.lottie}
        loop={false}
        autoPlay={true}
        resizeMode="cover"
      />
      
      <View style={styles.header}>
        <Animatable.View animation="bounceIn" duration={1000} delay={200} style={styles.iconContainer}>
          <Ionicons name="shield-checkmark" size={50} color={theme.success} />
        </Animatable.View>
      </View>

      <Animatable.View animation="slideInUp" duration={800} delay={400} style={{flex: 1}}>
        <Card>
          <ScrollView contentContainerStyle={styles.cardContent}>
              <Text style={styles.title}>Payment Successful</Text>
              <Text style={styles.amount}>₱{parseFloat(amount).toFixed(2)}</Text>
              
              <View style={styles.separator} />

              <View style={styles.messageContainer}>
                <Ionicons name="information-circle-outline" size={24} color={theme.textSecondary} />
                <Text style={styles.messageText}>
                  Your account is up to date. The official receipt is now available in your billing history.
                </Text>
              </View>
          </ScrollView>
        </Card>
      </Animatable.View>

      <Animatable.View animation="slideInUp" duration={800} delay={600} style={styles.footer}>
        <TouchableOpacity onPress={handleDone}>
          <LinearGradient 
            colors={[theme.primary, theme.primaryDark]} 
            style={styles.button}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.buttonText}>Done</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animatable.View>
    </SafeAreaView>
  );
}

const getStyles = (theme) => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background, // The base color is seen before confetti loads
    },
    // The separate gradient background is GONE
    lottie: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: -1, // Placed at the very back
    },
    header: {
      height: '35%',
      justifyContent: 'flex-end',
      alignItems: 'center',
    },
    iconContainer: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: theme.surface, // Icon has a solid background
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 3,
      elevation: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      borderWidth: 4,
      borderColor: theme.surface,
    },
    card: {
      flex: 1,
      marginHorizontal: 16,
      borderRadius: 24,
      marginTop: -50,
      zIndex: 2,
      overflow: 'hidden', // Required for BlurView and borderRadius
    },
    // CHANGE 3: Specific semi-transparent background for Android
    cardAndroid: {
      backgroundColor: theme.isDarkMode ? 'rgba(30, 30, 30, 0.85)' : 'rgba(255, 255, 255, 0.85)',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    cardContent: {
      padding: 24,
      paddingTop: 65,
      alignItems: 'center',
    },
    title: {
      fontSize: 26,
      fontWeight: 'bold',
      color: theme.text,
      textAlign: 'center',
    },
    amount: {
      fontSize: 48,
      fontWeight: 'bold',
      color: theme.text,
      marginTop: 8,
      fontFamily: Platform.OS === 'ios' ? 'AvenirNext-DemiBold' : 'Roboto',
    },
    separator: {
      height: 1,
      width: '80%',
      backgroundColor: theme.border,
      marginVertical: 24,
    },
    messageContainer: {
      alignItems: 'center',
      paddingHorizontal: 16,
    },
    messageText: {
      fontSize: 15,
      color: theme.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
      marginTop: 8,
    },
    footer: {
      padding: 16,
      paddingBottom: 24,
    },
    button: {
      height: 56,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 3,
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 5,
    },
    buttonText: {
      fontSize: 16,
      fontWeight: 'bold',
      color: theme.textOnPrimary,
    },
});