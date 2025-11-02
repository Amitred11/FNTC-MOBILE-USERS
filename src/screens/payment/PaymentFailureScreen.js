// screens/PaymentFailureScreen.js (Modern Redesign)

import React, { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import * as Animatable from 'react-native-animatable';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts';

export default function PaymentFailureScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const { theme } = useTheme();
    const styles = getStyles(theme);

    const { errorMessage = "An unknown error occurred. Please check your details and try again." } = route.params || {};

    useFocusEffect(
      useCallback(() => {
        StatusBar.setBarStyle('light-content');
        return () => StatusBar.setBarStyle(theme.isDarkMode ? 'light-content' : 'dark-content');
      }, [theme.isDarkMode])
    );

    const handleTryAgain = () => {
        // A reset is better than goBack() to avoid getting stuck in a loop
        navigation.reset({
            index: 0,
            routes: [{ name: 'MainStack', params: { screen: 'MyBills' } }],
        });
    };

    const handleContactSupport = () => {
        navigation.navigate('SupportScreen'); 
    };

    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient colors={[theme.danger, '#C0392B']} style={styles.gradientBackground} />
            
            <View style={styles.header}>
                <Animatable.View animation="shake" duration={800} delay={200} style={styles.iconContainer}>
                    <Ionicons name="close-outline" size={50} color={theme.danger} />
                </Animatable.View>
            </View>

            <Animatable.View animation="slideInUp" duration={800} delay={400} style={styles.card}>
                <ScrollView contentContainerStyle={styles.cardContent}>
                    <Text style={styles.title}>Payment Failed</Text>
                    <Text style={styles.message}>
                        Unfortunately, we couldn't process your payment.
                    </Text>
                    
                    <View style={styles.separator} />

                    {errorMessage && (
                        <View style={styles.errorReasonContainer}>
                            <Ionicons name="alert-circle-outline" size={20} color={theme.danger} style={{ marginRight: 8 }} />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.errorReasonTitle}>Server Response:</Text>
                                <Text style={styles.errorReasonText}>{errorMessage}</Text>
                            </View>
                        </View>
                    )}
                </ScrollView>
            </Animatable.View>

            <Animatable.View animation="slideInUp" duration={800} delay={600} style={styles.footer}>
                <TouchableOpacity style={styles.buttonSecondary} onPress={handleContactSupport}>
                    <Text style={styles.buttonTextSecondary}>Contact Support</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.buttonPrimary} onPress={handleTryAgain}>
                    <Text style={styles.buttonTextPrimary}>Try Again</Text>
                </TouchableOpacity>
            </Animatable.View>
        </SafeAreaView>
    );
}

const getStyles = (theme) => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    gradientBackground: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: '50%',
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
      backgroundColor: theme.background,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 3,
      elevation: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      borderWidth: 4,
      borderColor: theme.background,
    },
    card: {
      flex: 1,
      backgroundColor: theme.surface,
      marginHorizontal: 16,
      borderRadius: 24,
      marginTop: -50,
      zIndex: 2,
      elevation: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
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
    message: {
      fontSize: 15,
      textAlign: 'center',
      color: theme.textSecondary,
      marginTop: 8,
      lineHeight: 22,
    },
    separator: {
      height: 1,
      width: '80%',
      backgroundColor: theme.border,
      marginVertical: 24,
    },
    errorReasonContainer: {
      width: '100%',
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: `${theme.danger}1A`, // Light red background
      borderRadius: 12,
      padding: 15,
      borderWidth: 1,
      borderColor: `${theme.danger}30`,
    },
    errorReasonTitle: {
      fontSize: 14,
      fontWeight: 'bold',
      color: theme.danger,
      marginBottom: 4,
    },
    errorReasonText: {
      fontSize: 14,
      color: theme.text,
      lineHeight: 20,
    },
    footer: {
      flexDirection: 'row',
      padding: 16,
      paddingBottom: 24,
    },
    buttonPrimary: {
      flex: 1,
      height: 56,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.primary,
      marginLeft: 8,
    },
    buttonTextPrimary: {
      fontSize: 16,
      fontWeight: 'bold',
      color: theme.textOnPrimary,
    },
    buttonSecondary: {
      flex: 1,
      height: 56,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      marginRight: 8,
    },
    buttonTextSecondary: {
      fontSize: 16,
      fontWeight: 'bold',
      color: theme.text,
    },
});