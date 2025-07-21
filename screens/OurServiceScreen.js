// screens/OurServicesScreen.js

import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  // Removed ImageBackground import as it's not used for section headers
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme, useAuth, useSubscription } from '../contexts';

// Static data remains the same
const servicesData = [
  {
    icon: 'git-network-outline',
    title: 'Fiber Optic Network Installation',
    description: 'We offer fiber optic broadband connection to the community to provide high-speed internet services to residentials and commercials.',
  },
  {
    icon: 'wifi-outline',
    title: 'Internet Packages',
    description: 'We offer a variety of affordable internet plans to meet the needs of different customers, from basic plans for individual users to more advanced plans for businesses and organizations.',
  },
  {
    icon: 'build-outline',
    title: 'Technical Support',
    description: 'Our team of experienced professionals provides technical support to ensure that our networks are always running smoothly.',
  },
  {
    icon: 'headset-outline',
    title: 'Customer Service',
    description: 'We are committed to providing excellent customer service, and our support team is available 24/7 to answer questions and troubleshoot any issues.',
  },
];

const plansData = [
  {
    name: 'PLAN 1000',
    price: '₱1000',
    speed: 'Up to 30Mbps',
    boostedSpeed: 'Boosted Up to 60Mbps',
    features: ['No Data Capping', 'Fast Internet Speed', 'Quick Installation', 'P1500 Installation Fee'],
  },
  {
    name: 'PLAN 1300',
    price: '₱1300',
    speed: 'Up to 40Mbps',
    boostedSpeed: 'Boosted Up to 70Mbps',
    features: ['No Data Capping', 'Fast Internet Speed', 'Quick Installation', 'P1500 Installation Fee'],
    isPopular: true,
  },
  {
    name: 'PLAN 1500',
    price: '₱1500',
    speed: 'Up to 60Mbps',
    boostedSpeed: 'Boosted Up to 90Mbps',
    features: ['No Data Capping', 'Fast Internet Speed', 'Quick Installation', 'P1500 Installation Fee'],
  },
  {
    name: 'PLAN 1800',
    price: '₱1800',
    speed: 'Up to 100Mbps',
    boostedSpeed: 'Boosted Up to 130Mbps',
    features: ['No Data Capping', 'Fast Internet Speed', 'Quick Installation', 'P1500 Installation Fee'],
  },
];

// Reusable Header Component
const Header = React.memo(({ onBackPress }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBackPress} style={styles.headerIcon}>
        <Ionicons name="arrow-back" size={26} color={theme.text} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Our Services & Plans</Text>
      <View style={styles.headerIcon}/>
    </View>
  );
});

// Reusable Service Item Component
const ServiceItem = React.memo(({ icon, title, description }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  return (
    <View style={styles.serviceCard}>
      <View style={styles.serviceIconContainer}>
        <Ionicons name={icon} size={28} color={theme.primary} />
      </View>
      <View style={styles.serviceTextContainer}>
        <Text style={styles.serviceTitle}>{title}</Text>
        <Text style={styles.serviceDescription}>{description}</Text>
      </View>
    </View>
  );
});

// Reusable Plan Card Component
const PlanCard = React.memo(({ plan, onChoose }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  return (
    <View style={styles.planCard}>
      <Text style={styles.planName}>{plan.name}</Text>
      <View style={styles.planPriceContainer}>
        <Text style={styles.planPrice}>{plan.price}</Text>
        <Text style={styles.planPerMonth}>/ month</Text>
      </View>
      <View style={styles.speedContainer}>
        <Text style={styles.planSpeed}>{plan.speed}</Text>
        <Text style={styles.planBoostedSpeed}>{plan.boostedSpeed}</Text>
      </View>
      <View style={styles.featuresList}>
        {plan.features.map((feature, index) => (
          <View key={index} style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={20} color={theme.success} />
            <Text style={styles.featureText}>{feature}</Text>
          </View>
        ))}
      </View>
      <TouchableOpacity
        style={styles.choosePlanButton}
        onPress={() => onChoose(plan.name)}
      >
        <Text style={styles.choosePlanButtonText}>Choose Plan</Text>
      </TouchableOpacity>
    </View>
  );
});

export default function OurServicesScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const { user } = useAuth();
  const { subscriptionStatus, isLoading } = useSubscription();

  const showAlert = useCallback((title, message) => {
    Alert.alert(title, message);
  }, []);

  const handleChoosePlan = useCallback((planName) => {
    if (!user) {
      showAlert('Login Required', 'Please log in or sign up to choose a plan.');
      return;
    }

    if (subscriptionStatus === 'active') {
      navigation.navigate('Subscription', { isChangingPlan: true, selectedPlan: planName });
    } else {
      navigation.navigate('Subscription', { selectedPlan: planName });
    }
  }, [navigation, user, subscriptionStatus, showAlert]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header onBackPress={() => navigation.goBack()} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>Checking subscription status...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header onBackPress={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scrollContainer}>

        <View style={styles.sectionHeaderContainer}>
          <Text style={styles.sectionTitle}>Our Services</Text>
          <Text style={styles.sectionSubtitle}>Dedicated to providing top-tier internet solutions and unparalleled customer support.</Text>
        </View>

        {servicesData.map((service, index) => (
          <ServiceItem key={index} {...service} />
        ))}

        <View style={[styles.sectionHeaderContainer, { marginTop: 30 }]}>
          <Text style={styles.sectionTitle}>Subscription Plans</Text>
          <Text style={styles.sectionSubtitle}>We provide affordable and reliable internet with fast installation and we address client concerns as fast as we can in a secured way. The following are the internet plans that are offered:</Text>
        </View>

        {plansData.map((plan, index) => (
          <PlanCard key={index} plan={plan} onChoose={handleChoosePlan} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

// --- Styles ---
const getStyles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    scrollContainer: {
      paddingHorizontal: 16,
      paddingBottom: 40,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      backgroundColor: theme.surface,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.15,
      shadowRadius: 5,
      elevation: 6,
    },
    headerIcon: {
      width: 40,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.text,
    },
    // Modernized styles for section headers
    sectionHeaderContainer: {
      marginTop: 24,
      marginBottom: 16,
      paddingVertical: 10, // Slightly less vertical padding, let margin handle spacing
      alignItems: 'center', // Center text
      // Removed backgroundColor, borderRadius, shadows, and borders to make it flow with the background
    },
    sectionTitle: {
      fontSize: 26, // Slightly larger for more impact
      fontWeight: 'bold',
      color: theme.text, // Use theme text color
      textAlign: 'center',
      marginBottom: 6, // Reduced margin
    },
    sectionSubtitle: {
      fontSize: 16, // Slightly larger for readability
      color: theme.textSecondary, // Use secondary text for descriptions
      textAlign: 'center',
      lineHeight: 24, // Increased line height for readability
      paddingHorizontal: 10, // Ensure padding for text
    },
    // Service Card Styles 
    serviceCard: {
      flexDirection: 'row',
      backgroundColor: theme.surface,
      borderRadius: 14,
      padding: 18,
      marginTop: 16,
      alignItems: 'center',
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
      elevation: 5,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.border,
    },
    serviceIconContainer: {
      backgroundColor: `${theme.primary}25`,
      padding: 14,
      borderRadius: 30,
      marginRight: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    serviceTextContainer: {
      flex: 1,
    },
    serviceTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 4,
    },
    serviceDescription: {
      fontSize: 14,
      color: theme.textSecondary,
      lineHeight: 20,
    },
    // Plan Card Styles
    planCard: {
      backgroundColor: theme.surface,
      borderRadius: 18,
      padding: 24,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: theme.border,
      overflow: 'hidden',
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 5,
      elevation: 4,
      position: 'relative',
    },

    planName: {
      fontSize: 22,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 10,
    },
    planPriceContainer: {
      flexDirection: 'row',
      alignItems: 'baseline',
      marginBottom: 20,
    },
    planPrice: {
      fontSize: 38,
      fontWeight: 'bold',
      color: theme.primary,
    },
    planPerMonth: {
      fontSize: 17,
      color: theme.textSecondary,
      marginLeft: 6,
    },
    speedContainer: {
      marginBottom: 20,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: theme.border,
      paddingVertical: 15,
    },
    planSpeed: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
    },
    planBoostedSpeed: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.success,
      marginTop: 6,
    },
    featuresList: {
      marginBottom: 24,
    },
    featureItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
    },
    featureText: {
      fontSize: 15,
      color: theme.textSecondary,
      marginLeft: 12,
      flexShrink: 1,
    },
    choosePlanButton: {
      backgroundColor: theme.accent,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 10,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 5,
    },
    choosePlanButtonText: {
      color: theme.textOnPrimary,
      fontSize: 17,
      fontWeight: 'bold',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.background,
    },
    loadingText: {
        marginTop: 15,
        fontSize: 16,
        color: theme.textSecondary,
    }
  });