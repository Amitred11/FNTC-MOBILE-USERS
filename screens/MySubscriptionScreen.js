import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, BackHandler } from 'react-native';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext'; // <-- 1. Import useTheme

export default function MySubscriptionScreen() {
    const { activePlan, renewalDate, cancelSubscription } = useSubscription();
    const navigation = useNavigation();
    const { theme } = useTheme(); // <-- 2. Get theme from context
    const styles = getStyles(theme); // <-- 3. Get theme-specific styles

    // --- *** FIXED: This function now correctly navigates to the plan selection flow *** ---
    const handleChangePlan = () => {
        navigation.navigate('Subscription');
    };

    const handleCancel = () => {
        Alert.alert(
            "Cancel Subscription",
            "Are you sure you want to cancel your plan? This will be effective immediately and cannot be undone.",
            [
                { text: "Keep Plan", style: "cancel" },
                { text: "Yes, Cancel", onPress: () => cancelSubscription(), style: "destructive" }
            ]
        );
    };

    // This back handler is fine, no changes needed for theming.
    useEffect(() => {
        const handleBackPress = () => { navigation.goBack(); return true; };
        const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
        return () => backHandler.remove(); 
    }, [navigation]);

    if (!activePlan) return null; 

    const planSpeed = activePlan.features && activePlan.features.length > 0 ? activePlan.features[0] : 'High Speed';
    const [daysLeft, setDaysLeft] = useState(null);

    useEffect(() => {
        if (!renewalDate) return;
        const calculateDaysLeft = () => {
            const renewal = new Date(renewalDate);
            const today = new Date();
            const differenceMs = renewal.getTime() - today.getTime();
            const days = Math.ceil(differenceMs / (1000 * 60 * 60 * 24));
            setDaysLeft(days > 0 ? days : 0);
        };
        calculateDaysLeft();
        const intervalId = setInterval(calculateDaysLeft, 60000);
        return () => clearInterval(intervalId);
    }, [renewalDate]);

    const getRenewalText = () => {
        if (daysLeft === null) return 'Calculating renewal...';
        if (daysLeft <= 0) return 'Renews today';
        return `Renews in ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'}`;
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>My Active Plan</Text>
            <View style={styles.planCard}>
                <Text style={styles.planName}>{activePlan.name}</Text>
                <Text style={styles.planDetails}>{`${planSpeed} - ${activePlan.priceLabel}`}</Text>
                <Text style={styles.renewalText}>{getRenewalText()}</Text>
            </View>
            <TouchableOpacity style={styles.button} onPress={handleChangePlan}>
                <Text style={styles.buttonText}>Change Plan</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={handleCancel}>
                <Text style={[styles.buttonText, styles.cancelButtonText]}>Cancel Subscription</Text>
            </TouchableOpacity>
        </View>
    );
}

// --- 4. Stylesheet is now a function that accepts the theme ---
const getStyles = (theme) => StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        alignItems: 'center',
        backgroundColor: theme.surface, // Use surface color for the background of this component
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: theme.text,
        marginBottom: 20
    },
    planCard: {
        width: '100%',
        backgroundColor: theme.isDarkMode ? '#003e39' : '#E0F7FA',
        padding: 25,
        borderRadius: 15,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: theme.primary,
        marginBottom: 30,
        elevation: 3,
    },
    planName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.isDarkMode ? theme.primary : '#00796B'
    },
    planDetails: {
        fontSize: 16,
        color: theme.text,
        marginVertical: 8
    },
    renewalText: {
        fontSize: 14,
        color: theme.textSecondary
    },
    button: {
        width: '100%',
        backgroundColor: theme.primary,
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginBottom: 15,
    },
    buttonText: {
        color: theme.textOnPrimary,
        fontSize: 16,
        fontWeight: 'bold'
    },
    cancelButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: theme.danger
    },
    cancelButtonText: {
        color: theme.danger
    },
});