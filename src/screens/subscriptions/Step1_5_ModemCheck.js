// components/Step1_5_ModemCheck.js
import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Animatable from 'react-native-animatable';

// This component now accepts 'theme' as a prop to build its own styles.
const Step1_5_ModemCheck = memo(({ onConfirm, onBack, theme }) => {
    // ✅ FIX: The styles are now defined locally using the passed-in theme.
    const styles = getStyles(theme); 

    const OptionCard = ({ title, description, icon, onPress }) => (
        <Animatable.View animation="fadeInUp" duration={500}>
            <TouchableOpacity style={styles.optionCard} onPress={onPress}>
                <Ionicons name={icon} size={32} color={theme.primary} style={styles.optionIcon} />
                <View style={{ flex: 1 }}>
                    <Text style={styles.optionTitle}>{title}</Text>
                    <Text style={styles.optionDescription}>{description}</Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color={theme.textSecondary} />
            </TouchableOpacity>
        </Animatable.View>
    );

    return (
        // It's good practice to wrap screen content in a ScrollView
        <ScrollView style={styles.flowContainer} contentContainerStyle={styles.contentContainer}>
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color={theme.text} />
            </TouchableOpacity>
            <Text style={styles.screenTitle}>Welcome Back!</Text>
            <Text style={styles.screenSubtitle}>To help us get you set up, please confirm if you still have your Fibear modem.</Text>
            
            <View style={{ marginTop: 30 }}>
                <OptionCard
                    title="Yes, I have my modem"
                    description="Great! We'll reactivate your service without any installation fees."
                    icon="wifi-sharp"
                    onPress={() => onConfirm({ needsNewModem: false })}
                />
                <OptionCard
                    title="No, I need a new one"
                    description="No problem. A ₱1,500 fee for a new modem will be added to your application."
                    icon="construct-outline"
                    onPress={() => onConfirm({ needsNewModem: true })}
                />
            </View>
        </ScrollView>
    );
});

// ✅ FIX: The StyleSheet definition is now included in the file.
const getStyles = (theme) => StyleSheet.create({
    flowContainer: { 
        backgroundColor: theme.background, 
        flex: 1 
    },
    contentContainer: { 
        paddingHorizontal: 20, 
        paddingTop: 80, // Added padding to push content down from the back button
        paddingBottom: 170 
    },
    screenTitle: { 
        color: theme.text, 
        fontSize: 28, 
        fontWeight: 'bold', 
        paddingHorizontal: 10 
    },
    screenSubtitle: { 
        color: theme.textSecondary, 
        fontSize: 16, 
        marginTop: 8, 
        marginBottom: 30, 
        paddingHorizontal: 10, 
        lineHeight: 22 
    },
    backButton: {
        position: 'absolute',
        top: 20,
        left: 20,
        zIndex: 10,
        padding: 10,
    },
    optionCard: {
        backgroundColor: theme.surface,
        borderRadius: 16,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: theme.border,
    },
    optionIcon: {
        marginRight: 16,
    },
    optionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.text,
    },
    optionDescription: {
        fontSize: 14,
        color: theme.textSecondary,
        marginTop: 4,
        lineHeight: 20,
    },
});

export default Step1_5_ModemCheck;