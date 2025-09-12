// screens/ReferralScreen.js
import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Platform } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../contexts'; // Adjust path if necessary

const ReferralScreen = () => {
    const navigation = useNavigation();
    const { theme } = useTheme();
    const styles = getStyles(theme);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Refer a Friend</Text>
            </View>
            <View style={styles.content}>
                <Ionicons name="gift-outline" size={100} color={theme.primary} style={styles.icon} />
                <Text style={styles.title}>Share the Love, Get Rewards!</Text>
                <Text style={styles.description}>
                    Refer your friends and family to our service and both of you can enjoy exclusive discounts and benefits!
                </Text>
                <TouchableOpacity style={styles.referButton}>
                    <Text style={styles.referButtonText}>Generate Referral Link</Text>
                    <Ionicons name="share-social-outline" size={20} color={theme.textOnPrimary} style={{ marginLeft: 10 }} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.learnMoreButton}>
                    <Text style={styles.learnMoreButtonText}>Learn More About Our Program</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const getStyles = (theme) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: theme.surface,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: theme.border,
        paddingTop: Platform.OS === 'ios' ? 0 : 20, // Adjust for Android status bar
    },
    backButton: {
        padding: 8,
        marginRight: 10,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.text,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    icon: {
        marginBottom: 30,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.text,
        marginBottom: 15,
        textAlign: 'center',
    },
    description: {
        fontSize: 16,
        color: theme.textSecondary,
        textAlign: 'center',
        marginBottom: 40,
        lineHeight: 24,
    },
    referButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.primary,
        paddingVertical: 15,
        paddingHorizontal: 30,
        borderRadius: 12,
        marginBottom: 15,
        shadowColor: theme.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 5,
    },
    referButtonText: {
        color: theme.textOnPrimary,
        fontSize: 18,
        fontWeight: 'bold',
    },
    learnMoreButton: {
        paddingVertical: 10,
    },
    learnMoreButtonText: {
        color: theme.primary,
        fontSize: 16,
        fontWeight: '600',
    },
});

export default ReferralScreen;