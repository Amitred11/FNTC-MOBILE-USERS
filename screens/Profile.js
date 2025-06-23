import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, SafeAreaView, ActivityIndicator, ScrollView, BackHandler } from 'react-native';
import { Ionicons, FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { auth, database } from '../config/firebaseConfig';
import { ref, get } from 'firebase/database';
import { useTheme } from '../contexts/ThemeContext'; // <-- 1. Import useTheme hook

// --- Reusable Component (Now Theme-Aware) ---
const InfoRow = ({ icon, label, value, theme }) => {
    const styles = getStyles(theme); // Get styles within the component
    return (
        <View style={styles.infoRow}>
            <Ionicons name={icon} size={24} color={theme.primary} style={styles.infoIcon} />
            <View>
                <Text style={styles.infoLabel}>{label}</Text>
                <Text style={styles.infoValue}>{value || 'Not set'}</Text>
            </View>
        </View>
    );
};

export default function ProfileScreen() {
    const navigation = useNavigation();
    const isFocused = useIsFocused();
    const { theme } = useTheme(); // <-- 2. Get theme from context
    const styles = getStyles(theme); // <-- 3. Get theme-specific styles

    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUserData = async () => {
            const currentUser = auth.currentUser;
            if (currentUser) {
                const userRef = ref(database, `users/${currentUser.uid}`);
                try {
                    const snapshot = await get(userRef);
                    let profileData = {
                        uid: currentUser.uid,
                        email: currentUser.email,
                        displayName: currentUser.displayName,
                    };
                    if (snapshot.exists()) {
                        profileData = { ...profileData, ...snapshot.val() };
                    }
                    setUserProfile(profileData);
                } catch (error) {
                    console.error("Failed to fetch user data:", error);
                } finally {
                    setLoading(false);
                }
            } else {
                // In a real app, you might navigate to a login screen
                // navigation.replace('Login');
                setLoading(false);
            }
        };

        if (isFocused) {
            setLoading(true);
            fetchUserData();
        }
    }, [isFocused]);

    useEffect(() => {
        const handleBackPress = () => { navigation.goBack(); return true; };
        const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
        return () => backHandler.remove();
    }, [navigation]);

    if (loading) {
        // Use theme color for loading indicator and background
        return <View style={styles.centered}><ActivityIndicator size="large" color={theme.primary} /></View>;
    }

    if (!userProfile) {
        // Use theme color for text
        return <View style={styles.centered}><Text style={{ color: theme.text }}>Could not load profile.</Text></View>;
    }

    const fullAddress = [
        userProfile.address,
        userProfile.phase,
        userProfile.city,
        userProfile.province,
        userProfile.zipCode
    ].filter(Boolean).join(', ');

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => navigation.navigate('EditProfileScreen', { userProfile })}
                >
                    <Ionicons name="create-outline" size={28} color={theme.textOnPrimary} />
                </TouchableOpacity>

                <Image
                    source={
                        userProfile.photoData?.base64
                        ? { uri: `data:${userProfile.photoData.mimeType};base64,${userProfile.photoData.base64}` }
                        : require('../assets/images/profilepic.jpg')
                    }
                    style={styles.profileImage}
                />
                <Text style={styles.userName}>{userProfile.displayName || 'User'}</Text>
                <Text style={styles.userEmail}>{userProfile.email}</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.infoSection}>
                    <Text style={styles.sectionTitle}>Personal Information</Text>
                    <InfoRow icon="person-outline" label="Full Name" value={userProfile.displayName} theme={theme} />
                    <InfoRow icon="calendar-outline" label="Birthday" value={userProfile.birthday} theme={theme} />
                    <InfoRow icon="male-female-outline" label="Gender" value={userProfile.gender} theme={theme} />
                </View>
                <View style={styles.infoSection}>
                    <Text style={styles.sectionTitle}>Contact Information</Text>
                    <InfoRow icon="mail-outline" label="Email Address" value={userProfile.email} theme={theme} />
                    <InfoRow icon="call-outline" label="Mobile Number" value={userProfile.mobileNumber} theme={theme} />
                    <InfoRow icon="location-outline" label="Address" value={fullAddress} theme={theme} />
                </View>
            </ScrollView>

            {/* Bottom Nav Bar */}
            <View style={styles.fixedDown}>
                <View style={styles.downnav}>
                    <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Home')}><Ionicons name="home" size={28} color={theme.textOnPrimary} /><Text style={styles.navlabel}>Home</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Subscription')}><FontAwesome5 name="id-card" size={24} color={theme.textOnPrimary} /><Text style={styles.navlabel}>Subscription</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('MyBills')}><MaterialIcons name="payment" size={28} color={theme.textOnPrimary} /><Text style={styles.navlabel}>Billing</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Support')}><Ionicons name="chatbubble-ellipses" size={28} color={theme.textOnPrimary} /><Text style={styles.navlabel}>Support</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.navItem}><Ionicons name="person-circle" size={28} color={theme.textOnPrimary} /><Text style={styles.navlabel}>Profile</Text></TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}

// --- 4. Stylesheet is now a function that accepts the theme ---
const getStyles = (theme) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background },
    header: {
        backgroundColor: theme.primary,
        paddingBottom: 70,
        paddingTop: 60,
        alignItems: 'center',
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30
    },
    profileImage: {
        width: 100, height: 100, borderRadius: 50,
        borderWidth: 3, borderColor: theme.surface, // Use surface for a nice contrast
        marginBottom: 15
    },
    userName: { fontSize: 22, fontWeight: 'bold', color: theme.textOnPrimary },
    userEmail: { fontSize: 16, color: 'rgba(255,255,255,0.8)' }, // Keeping this semi-transparent is fine
    scrollContent: { padding: 20, paddingBottom: 100 },
    infoSection: {
        backgroundColor: theme.surface,
        borderRadius: 12, padding: 15, marginBottom: 20
    },
    sectionTitle: {
        fontSize: 16, fontWeight: 'bold', color: theme.text,
        marginBottom: 15, paddingBottom: 10,
        borderBottomWidth: 1, borderBottomColor: theme.border
    },
    infoRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 },
    infoIcon: { marginRight: 15, marginTop: 2 },
    infoLabel: { fontSize: 12, color: theme.textSecondary },
    infoValue: { fontSize: 16, color: theme.text, fontWeight: '500' },
    fixedDown: { position: 'absolute', bottom: 0, left: 0, right: 0 },
    downnav: {
        flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
        backgroundColor: theme.primary, // Match header color
        paddingVertical: 8,
        borderTopLeftRadius: 20, borderTopRightRadius: 20,
        height: 65
    },
    navItem: { alignItems: 'center', flex: 1 },
    navlabel: { color: theme.textOnPrimary, fontSize: 10, marginTop: 4 },
    editButton: {
        position: 'absolute',
        top: 60,
        right: 20,
        padding: 5,
    },
});