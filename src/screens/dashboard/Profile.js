// screens/ProfileScreen.js
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  SafeAreaView,
  ActivityIndicator,
  ScrollView,
  BackHandler,
  RefreshControl,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTheme, useAuth } from '../../contexts';

// --- Reusable formatting function (no changes) ---
const formatDate = (dateString) => {
  if (!dateString) return null;
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
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
  const { user: userProfile, isLoading, refreshUser } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshUser();
    } catch (error) {
      console.error('Failed to refresh user profile:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshUser]);

  useFocusEffect(
    useCallback(() => {
      // Refresh user data every time the screen comes into focus
      // to ensure it's up-to-date after an edit.
      refreshUser();
    }, [refreshUser])
  );

  useEffect(() => {
    const handleBackPress = () => {
      navigation.navigate('Home');
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => backHandler.remove();
  }, [navigation]);

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
        <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const fullAddress = [
    userProfile.profile?.address,
    userProfile.profile?.phase,
    userProfile.profile?.city,
    userProfile.profile?.province,
    userProfile.profile?.zipCode,
  ]
    .filter(Boolean) // This correctly filters out any null/undefined values
    .join(', ');

  const formattedBirthday = formatDate(userProfile.profile?.birthday);

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
          source={
            userProfile.photoUrl
              ? { uri: userProfile.photoUrl }
              : require('../../assets/images/avatars/profilepic.jpg')
          }
          style={styles.profileImage}
        />
        <Text style={styles.userName}>{userProfile.displayName || 'User'}</Text>
        <Text style={styles.userEmail}>{userProfile.email}</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.primary]}
            tintColor={theme.primary}
          />
        }
      >
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          {/* Display root-level data */}
          <InfoRow
            icon="person-outline"
            label="Full Name"
            value={userProfile.displayName}
            theme={theme}
          />
          {/* Display nested data safely */}
          <InfoRow
            icon="calendar-outline"
            label="Birthday"
            value={formattedBirthday}
            theme={theme}
          />
          <InfoRow
            icon="male-female-outline"
            label="Gender"
            value={userProfile.profile?.gender}
            theme={theme}
          />
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <InfoRow
            icon="mail-outline"
            label="Email Address"
            value={userProfile.email}
            theme={theme}
          />
          <InfoRow
            icon="call-outline"
            label="Mobile Number"
            value={userProfile.profile?.mobileNumber}
            theme={theme}
          />
          <InfoRow
            icon="location-outline"
            label="Address"
            value={fullAddress}
            theme={theme}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// --- Styles (no changes needed) ---
const getStyles = (theme) =>
  StyleSheet.create({
    backButton: { left: 20, padding: 5, position: 'absolute', top: 50, zIndex: 10 },
    centered: {
      alignItems: 'center',
      backgroundColor: theme.background,
      flex: 1,
      justifyContent: 'center',
      padding: 20,
    },
    container: { backgroundColor: theme.background, flex: 1 },
    editButton: { padding: 5, position: 'absolute', right: 20, top: 50, zIndex: 10 },
    errorSubtitle: {
      color: theme.textSecondary,
      fontSize: 16,
      marginBottom: 20,
      textAlign: 'center',
    },
    errorTitle: {
      color: theme.text,
      fontSize: 22,
      fontWeight: 'bold',
      marginBottom: 8,
      textAlign: 'center',
    },
    header: {
      alignItems: 'center',
      backgroundColor: theme.primary,
      borderBottomLeftRadius: 50,
      borderBottomRightRadius: 50,
      paddingBottom: 70,
      paddingTop: 80,
    },
    infoIcon: { marginRight: 15, marginTop: 2 },
    infoLabel: { color: theme.textSecondary, fontSize: 12 },
    infoRow: { alignItems: 'flex-start', flexDirection: 'row', marginBottom: 20 },
    infoSection: {
      backgroundColor: theme.surface,
      borderColor: theme.border,
      borderRadius: 12,
      borderWidth: 1,
      elevation: 1,
      marginBottom: 20,
      padding: 15,
    },
    infoValue: { color: theme.text, fontSize: 16, fontWeight: '500' },
    infoValueNotSet: {
      color: theme.textSecondary,
      fontSize: 16,
      fontStyle: 'italic',
      fontWeight: '500',
    },
    loadingText: {
      color: theme.textSecondary,
      marginTop: 10,
    },
    profileImage: {
      borderColor: theme.surface,
      borderRadius: 50,
      borderWidth: 3,
      height: 100,
      marginBottom: 15,
      width: 100,
    },
    retryButton: {
      backgroundColor: theme.primary,
      borderRadius: 8,
      paddingHorizontal: 30,
      paddingVertical: 12,
    },
    retryButtonText: {
      color: theme.textOnPrimary,
      fontSize: 16,
      fontWeight: 'bold',
    },
    scrollContent: { paddingBottom: 40, paddingHorizontal: 20, paddingTop: 20 },
    sectionTitle: {
      borderBottomColor: theme.border,
      borderBottomWidth: 1,
      color: theme.text,
      fontSize: 16,
      fontWeight: 'bold',
      marginBottom: 15,
      paddingBottom: 10,
    },
    userEmail: { color: 'rgba(255,255,255,0.8)', fontSize: 16 },
    userName: { color: theme.textOnPrimary, fontSize: 22, fontWeight: 'bold' },
  });
