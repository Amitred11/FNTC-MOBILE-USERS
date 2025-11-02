import { useEffect, useState, useCallback } from 'react';
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

import InfoRowComponent from './components/InfoRowComponent.js';
import ProfileImageModalComponent from './components/ProfileImageModalComponent.js';

const formatDate = (dateString) => {
  if (!dateString) return null;
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const { user: userProfile, isLoading, refreshUser } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [isImageModalVisible, setImageModalVisible] = useState(false);

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
      refreshUser();
    }, [refreshUser])
  );

  useEffect(() => {
    const handleBackPress = () => {
      if (isImageModalVisible) {
        setImageModalVisible(false);
        return true;
      }
      navigation.navigate('Home');
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => backHandler.remove();
  }, [navigation, isImageModalVisible]);

  if (isLoading && !userProfile) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={styles.loadingText}>Loading Profile...</Text>
      </SafeAreaView>
    );
  }

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
    .filter(Boolean)
    .join(', ');

  const formattedBirthday = formatDate(userProfile.profile?.birthday);

  const profileImageSource = userProfile.photoUrl
    ? { uri: userProfile.photoUrl }
    : require('../../assets/images/avatars/profilepic.jpg');

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

        <TouchableOpacity onPress={() => setImageModalVisible(true)} style={styles.profileImageContainer}>
          <Image
            source={profileImageSource}
            style={styles.profileImage}
          />
        </TouchableOpacity>
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
          <InfoRowComponent
            icon="person-outline"
            label="Full Name"
            value={userProfile.displayName}
          />
          <InfoRowComponent
            icon="calendar-outline"
            label="Birthday"
            value={formattedBirthday}
            // theme={theme}
          />
          <InfoRowComponent
            icon="male-female-outline"
            label="Gender"
            value={userProfile.profile?.gender}
          />
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <InfoRowComponent
            icon="mail-outline"
            label="Email Address"
            value={userProfile.email}
          />
          <InfoRowComponent
            icon="call-outline"
            label="Mobile Number"
            value={userProfile.profile?.mobileNumber}
          />
          <InfoRowComponent
            icon="location-outline"
            label="Address"
            value={fullAddress}
          />
        </View>
      </ScrollView>

      <ProfileImageModalComponent
        isVisible={isImageModalVisible}
        onClose={() => setImageModalVisible(false)}
        imageSource={profileImageSource}
      />
    </SafeAreaView>
  );
}

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
    infoSection: {
      backgroundColor: theme.surface,
      borderColor: theme.border,
      borderRadius: 12,
      borderWidth: 1,
      elevation: 1,
      marginBottom: 20,
      padding: 15,
    },
    loadingText: {
      color: theme.textSecondary,
      marginTop: 10,
    },
    profileImage: {
      borderRadius: 50,
      height: 100,
      width: 100,
    },
    profileImageContainer: {
      borderColor: theme.surface,
      borderRadius: 55,
      borderWidth: 4,
      elevation: 8,
      marginBottom: 15,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.3,
      shadowRadius: 5,
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