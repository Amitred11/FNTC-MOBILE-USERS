// screens/ProfileScreen.js
import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Image, SafeAreaView,
    ActivityIndicator, ScrollView, BackHandler, RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme, useAuth } from '../contexts';

// --- Reusable formatting function (no changes) ---
const formatDate = (dateString) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
};

// --- Reusable InfoRow Component (no changes) ---
const InfoRow = ({ icon, label, value, theme }) => {
    const styles = getStyles(theme);
    return (
        <View style={styles.infoRow}>
            <Ionicons name={icon} size={24} color={theme.primary} style={styles.infoIcon} />
            <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>{label}</Text>
                <Text style={value ? styles.infoValue : styles.infoValueNotSet}>{value || 'Not set'}</Text>
            </View>
        </View>
    );
};

export default function ProfileScreen() {
    const navigation = useNavigation();
    const { theme } = useTheme();
    const styles = getStyles(theme);
    // --- FIX: Correctly get the refreshUser function from useAuth ---
    const { user: userProfile, isLoading, refreshUser } = useAuth();
    const [refreshing, setRefreshing] = useState(false);

    // --- FIX: Use the correct `refreshUser` function ---
    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await refreshUser();
        } catch (error) {
            console.error("Failed to refresh user profile:", error);
        } finally {
            setRefreshing(false);
        }
    }, [refreshUser]);

    useEffect(() => {
        const handleBackPress = () => {
            navigation.navigate('Home');
            return true;
        };
        const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
        return () => backHandler.remove();
    }, [navigation]);

    // --- RENDER STATES ---

    // 1. Initial Loading State
    if (isLoading && !userProfile) {
        return (
            <SafeAreaView style={styles.centered}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text style={styles.loadingText}>Loading Profile...</Text>
            </SafeAreaView>
        );
    }

    // 2. Handle Error/Empty State
    if (!userProfile) {
        return (
            <SafeAreaView style={styles.centered}>
                <Ionicons name="cloud-offline-outline" size={80} color={theme.textSecondary} />
                <Text style={styles.errorTitle}>Could Not Load Profile</Text>
                <Text style={styles.errorSubtitle}>Please check your connection and try again.</Text>
                {/* --- FIX: Call onRefresh which uses the correct `refreshUser` function --- */}
                <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
                    <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    // --- Data formatting for the main view ---
    // --- FIX: Access data from the nested `profile` object ---
    const { profile } = userProfile;
    const fullAddress = [
        profile?.address,
        profile?.phase,
        profile?.city,
        profile?.province,
        profile?.zipCode
    ].filter(Boolean).join(', ');

    const formattedBirthday = formatDate(profile?.birthday);

    // 3. Successful Data Render State
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.navigate('Home')} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={28} color={theme.textOnPrimary} />
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => navigation.navigate('EditProfileScreen')}
                >
                    <Ionicons name="create-outline" size={28} color={theme.textOnPrimary} />
                </TouchableOpacity>
                <Image
                    source={userProfile.photoUrl ? { uri: userProfile.photoUrl } : require('../assets/images/profilepic.jpg')}
                    style={styles.profileImage}
                />
                <Text style={styles.userName}>{userProfile.displayName || 'User'}</Text>
                <Text style={styles.userEmail}>{userProfile.email}</Text>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} tintColor={theme.primary} />}
            >
                <View style={styles.infoSection}>
                    <Text style={styles.sectionTitle}>Personal Information</Text>
                    {/* --- FIX: Access data from the correct objects --- */}
                    <InfoRow icon="person-outline" label="Full Name" value={userProfile.displayName} theme={theme} />
                    <InfoRow icon="calendar-outline" label="Birthday" value={formattedBirthday} theme={theme} />
                    <InfoRow icon="male-female-outline" label="Gender" value={profile?.gender} theme={theme} />
                </View>

                <View style={styles.infoSection}>
                    <Text style={styles.sectionTitle}>Contact Information</Text>
                    {/* --- FIX: Access data from the correct objects --- */}
                    <InfoRow icon="mail-outline" label="Email Address" value={userProfile.email} theme={theme} />
                    <InfoRow icon="call-outline" label="Mobile Number" value={profile?.mobileNumber} theme={theme} />
                    <InfoRow icon="location-outline" label="Address" value={fullAddress || 'Not set'} theme={theme} />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

// --- Styles (no changes needed) ---
const getStyles = (theme) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background, padding: 20 },
    header: {
        backgroundColor: theme.primary,
        paddingBottom: 70,
        paddingTop: 80,
        alignItems: 'center',
        borderBottomLeftRadius: 50,
        borderBottomRightRadius: 50,
    },
    profileImage: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: theme.surface, marginBottom: 15 },
    userName: { fontSize: 22, fontWeight: 'bold', color: theme.textOnPrimary },
    userEmail: { fontSize: 16, color: 'rgba(255,255,255,0.8)' },
    scrollContent: { paddingTop: 20, paddingHorizontal: 20, paddingBottom: 40 },
    infoSection: { backgroundColor: theme.surface, borderRadius: 12, padding: 15, marginBottom: 20, elevation: 1, borderWidth: 1, borderColor: theme.border },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: theme.text, marginBottom: 15, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: theme.border },
    infoRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 },
    infoIcon: { marginRight: 15, marginTop: 2 },
    infoLabel: { fontSize: 12, color: theme.textSecondary },
    infoValue: { fontSize: 16, color: theme.text, fontWeight: '500' },
    infoValueNotSet: {
        fontSize: 16,
        color: theme.textSecondary,
        fontWeight: '500',
        fontStyle: 'italic',
    },
    backButton: { position: 'absolute', top: 50, left: 20, padding: 5, zIndex: 10 },
    editButton: { position: 'absolute', top: 50, right: 20, padding: 5, zIndex: 10 },
    loadingText: {
        marginTop: 10,
        color: theme.textSecondary,
    },
    errorTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: theme.text,
        textAlign: 'center',
        marginBottom: 8,
    },
    errorSubtitle: {
        fontSize: 16,
        color: theme.textSecondary,
        textAlign: 'center',
        marginBottom: 20,
    },
    retryButton: {
        backgroundColor: theme.primary,
        paddingVertical: 12,
        paddingHorizontal: 30,
        borderRadius: 8,
    },
    retryButtonText: {
        color: theme.textOnPrimary,
        fontSize: 16,
        fontWeight: 'bold',
    },
});