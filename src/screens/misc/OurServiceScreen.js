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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, useAuth, useSubscription } from '../../contexts';

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
    _id: 'plan_1000',
    name: 'PLAN 1000',
    price: '₱1000',
    speed: 'Up to 30Mbps',
    boostedSpeed: 'Boosted Up to 60Mbps',
    features: ['No Data Capping', 'Fast Internet Speed', 'Quick Installation', 'P1500 Installation Fee'],
  },
  {
    _id: 'plan_1300',
    name: 'PLAN 1300',
    price: '₱1300',
    speed: 'Up to 40Mbps',
    boostedSpeed: 'Boosted Up to 70Mbps',
    features: ['No Data Capping', 'Fast Internet Speed', 'Quick Installation', 'P1500 Installation Fee'],
  },
  {
    _id: 'plan_1500',
    name: 'PLAN 1500',
    price: '₱1500',
    speed: 'Up to 60Mbps',
    boostedSpeed: 'Boosted Up to 90Mbps',
    features: ['No Data Capping', 'Fast Internet Speed', 'Quick Installation', 'P1500 Installation Fee'],
  },
  {
    _id: 'plan_1800',
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
      <TouchableOpacity onPress={onBackPress} style={styles.headerIconContainer}>
        <Ionicons name="arrow-back" size={26} color={theme.text} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Our Services & Plans</Text>
      <View style={styles.headerIconContainer}/>
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

  const ChooseButton = () => (
    <TouchableOpacity
        style={styles.choosePlanButton}
        onPress={() => onChoose(plan)} 
        activeOpacity={0.7}
      >
        <Text style={styles.choosePlanButtonText}>
          Choose Plan
        </Text>
      </TouchableOpacity>
  );

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
      
        <LinearGradient
            colors={[theme.accent, theme.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.buttonGradient}
        >
           <ChooseButton />
        </LinearGradient>
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

  const handleChoosePlan = useCallback((planObject) => {
    if (!user) {
      showAlert('Login Required', 'Please log in or sign up to choose a plan.');
      navigation.navigate('Auth');
      return;
    }

    if (subscriptionStatus === 'active') {
      navigation.navigate('Subscription', { screen: 'ChangePlanScreen', params: { selectedPlan: planObject } });
    } else {
      navigation.navigate('Subscription', { screen: 'NewSubscriptionScreen', params: { selectedPlan: planObject } });
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
          <Text style={styles.sectionTitle}>Our Core Services</Text>
          <Text style={styles.sectionSubtitle}>Dedicated to providing top-tier internet solutions and unparalleled customer support.</Text>
        </View>

        {servicesData.map((service, index) => (
          <ServiceItem key={index} {...service} />
        ))}

        <View style={[styles.sectionHeaderContainer, { marginTop: 40 }]}>
          <Text style={styles.sectionTitle}>Choose Your Plan</Text>
          <Text style={styles.sectionSubtitle}>Affordable, reliable, and fast internet with premium customer service. Find the perfect fit for your needs.</Text>
        </View>

        {plansData.map((plan) => (
          <PlanCard key={plan._id} plan={plan} onChoose={handleChoosePlan} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

// --- Styles (Refactored for new design) ---
const getStyles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    scrollContainer: {
      paddingHorizontal: 20,
      paddingBottom: 40,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: theme.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    headerIconContainer: {
      width: 40,
      height: 40,
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
    },
    sectionHeaderContainer: {
      marginTop: 30,
      marginBottom: 20,
      alignItems: 'center',
    },
    sectionTitle: {
      fontSize: 28,
      fontWeight: 'bold',
      color: theme.text,
      textAlign: 'center',
      marginBottom: 8,
    },
    sectionSubtitle: {
      fontSize: 16,
      color: theme.textSecondary,
      textAlign: 'center',
      lineHeight: 24,
      maxWidth: '90%',
    },
    serviceCard: {
      flexDirection: 'row',
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 16,
      marginTop: 16,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.border,
    },
    serviceIconContainer: {
      backgroundColor: `${theme.primary}20`,
      padding: 12,
      borderRadius: 12,
      marginRight: 16,
    },
    serviceTextContainer: {
      flex: 1,
    },
    serviceTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 4,
    },
    serviceDescription: {
      fontSize: 14,
      color: theme.textSecondary,
      lineHeight: 20,
    },
    planCard: {
      backgroundColor: theme.surface,
      borderRadius: 20,
      padding: 20,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: theme.border,
      overflow: 'hidden',
    },
    planName: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.textSecondary,
      marginBottom: 12,
    },
    planPriceContainer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      marginBottom: 16,
    },
    planPrice: {
      fontSize: 36,
      fontWeight: 'bold',
      color: theme.text,
    },
    planPerMonth: {
      fontSize: 16,
      color: theme.textSecondary,
      marginLeft: 8,
      paddingBottom: 4,
    },
    speedContainer: {
      marginBottom: 20,
      paddingVertical: 15,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: theme.border,
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
      marginTop: 4,
    },
    featuresList: {
      marginBottom: 24,
    },
    featureItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    featureText: {
      fontSize: 15,
      color: theme.text,
      marginLeft: 12,
    },
    choosePlanButton: {
      width: '100%',
      backgroundColor: theme.surface,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: theme.primary,
    },
    buttonGradient: {
        borderRadius: 12,
        shadowColor: theme.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 8,
    },
    choosePlanButtonText: {
      color: theme.primary,
      fontSize: 16,
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