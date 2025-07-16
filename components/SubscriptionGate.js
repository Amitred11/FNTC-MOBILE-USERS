// components/SubscriptionGate.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSubscription } from '../contexts/DataContext';
import { useTheme } from '../contexts/ThemeContext';

const SubscriptionGate = ({ children }) => {
    const { subscriptionStatus, isLoading } = useSubscription();
    const navigation = useNavigation();
    const { theme } = useTheme();
    const styles = getStyles(theme);

    if (isLoading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text style={styles.message}>Loading Subscription Info...</Text>
            </View>
        );
    }
    
    // If subscription is active, show the actual screen content
    if (subscriptionStatus === 'active') {
        return children;
    }

    // Otherwise, show the "No Active Subscription" message
    return (
        <View style={styles.container}>
            <Ionicons name="alert-circle-outline" size={60} color={theme.textSecondary} />
            <Text style={styles.title}>No Active Subscription</Text>
            <Text style={styles.message}>
                You need an active subscription to access this feature.
            </Text>
            <TouchableOpacity 
                style={styles.button} 
                onPress={() => navigation.navigate('Subscription')}
            >
                <Text style={styles.buttonText}>View Subscription Plans</Text>
            </TouchableOpacity>
        </View>
    );
};

const getStyles = (theme) => StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: theme.surface,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: theme.text,
        marginTop: 20,
        marginBottom: 10,
        textAlign: 'center',
    },
    message: {
        fontSize: 16,
        color: theme.textSecondary,
        textAlign: 'center',
        marginBottom: 30,
    },
    button: {
        backgroundColor: theme.primary,
        paddingVertical: 12,
        paddingHorizontal: 30,
        borderRadius: 10,
    },
    buttonText: {
        color: theme.textOnPrimary,
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default SubscriptionGate;