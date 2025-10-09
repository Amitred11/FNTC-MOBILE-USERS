// screens/PayBillsScreen.js (Corrected)

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSubscription, useTheme, useAlert, useAuth } from '../../contexts';
import StatusDisplay from '../../components/StatusDisplay';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import { EMPTY_STATES_CONFIG } from '../../data/Constants-Data';
import * as Linking from 'expo-linking';

const PAYMENT_METHOD_LOGOS = {
  CASH: require('../../assets/images/payments/cod.png'),
  PH_GCASH: require('../../assets/images/payments/gcash.png'),
  PH_PAYMAYA: require('../../assets/images/payments/maya.png'),
  CARD: require('../../assets/images/payments/card.png'),
  DEFAULT: require('../../assets/images/payments/default.png')
};

const Header = React.memo(({ onBackPress }) => {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    return (
        <View style={styles.header}>
            <TouchableOpacity onPress={onBackPress} style={styles.headerButton}>
                <Ionicons name="arrow-back" size={26} color={theme.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Pay Bill</Text>
            <View style={styles.headerButton} />
        </View>
    );
});

const BillSummaryCard = React.memo(({ bill }) => {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    return (
        <Animatable.View animation="fadeInDown" duration={600}>
            <LinearGradient colors={theme.isDarkMode ? ['#0A84FF', '#0052A3'] : ['#007AFF', '#0052A3']} style={styles.heroCard}>
                <Ionicons name="receipt-outline" size={80} color="rgba(255,255,255,0.1)" style={styles.heroCardBackgroundIcon} />
                <Text style={styles.heroCardLabel}>Amount Due for {bill.planName}</Text>
                <Text style={styles.heroCardAmount}>₱{bill.amount.toFixed(2)}</Text>
                <View style={styles.heroCardDueDateContainer}>
                    <Ionicons name="alarm-outline" size={16} color={theme.textOnPrimary} />
                    <Text style={styles.heroCardDueDateText}>Due on {new Date(bill.dueDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</Text>
                </View>
            </LinearGradient>
        </Animatable.View>
    );
});

const PaymentMethodCard = React.memo(({ icon, title, description, isSelected, onSelect }) => {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    return (
        <Animatable.View animation="fadeInUp" duration={600} delay={100}>
            <TouchableOpacity
                style={[styles.paymentMethodCard, isSelected && styles.paymentMethodCardSelected]}
                onPress={onSelect}
            >
                <Image source={icon} style={styles.paymentMethodLogo} />
                <View style={styles.paymentMethodTextContainer}>
                    <Text style={styles.paymentMethodTitle}>{title}</Text>
                    <Text style={styles.paymentMethodDescription}>{description}</Text>
                </View>
                <View style={styles.radioCircle}>
                    {isSelected && <View style={styles.radioDot} />}
                </View>
            </TouchableOpacity>
        </Animatable.View>
    );
});

const ContactSupportLink = () => {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    const navigation = useNavigation();
    const handlePress = () => {
      navigation.navigate('Support')
    };
    return (
        <TouchableOpacity onPress={handlePress} style={styles.contactSupportContainer}>
            <Ionicons name="call-outline" size={16} color={theme.primary} />
            <Text style={styles.contactSupportText}>Need to pay partially? Contact support.</Text>
        </TouchableOpacity>
    );
};

export default function PayBillsScreen() {
  const navigation = useNavigation();
  const { paymentHistory, subscriptionStatus, refreshSubscription, isLoading } = useSubscription();
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const { showAlert } = useAlert();
  const { user, api, signOut } = useAuth(); 
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { pendingBill, dueBill, upcomingBill } = useMemo(() => ({
    pendingBill: paymentHistory.find(item => item.type === 'bill' && item.status === 'Pending Verification'),
    dueBill: paymentHistory.find(item => item.type === 'bill' && (item.status === 'Due' || item.status === 'Overdue')),
    upcomingBill: paymentHistory.find(item => item.type === 'bill' && item.status === 'Upcoming'),
  }), [paymentHistory]);
  
  const fetchPaymentMethods = useCallback(async () => {
    if (!api) return;
    try {
        const response = await api.get('/billing/payment-methods');
        setPaymentMethods(response.data);
    } catch (error) {
        if (error.response?.status === 401) {
            showAlert('Session Expired', 'Please log in again.');
            signOut();
        } else {
            showAlert('Error', 'Could not fetch payment methods.');
        }
    }
  }, [api, showAlert, signOut]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
        refreshSubscription(),
        fetchPaymentMethods()
    ]);
    setRefreshing(false);
  }, [refreshSubscription, fetchPaymentMethods]);

  useFocusEffect(useCallback(() => {
    onRefresh();
  }, [onRefresh]));

  const handlePayment = useCallback(async () => {
    if (!selectedMethod || !dueBill || !user) return;

    setIsSubmitting(true);
    try {
        const successRedirectUrl = 'https://websitecapstone.vercel.app/payment-success';
        const failureRedirectUrl = 'https://websitecapstone.vercel.app/payment-failure'; 

        const fullName = user.displayName || 'Customer User';
        const sanitizedFullName = fullName.trim().replace(/[^a-zA-Z\s-]/g, '');
        
        const nameParts = sanitizedFullName.split(' ').filter(part => part);

        let givenNames;
        let surname;

        if (nameParts.length > 0) {
            givenNames = nameParts[0];
            surname = nameParts.slice(1).join(' ');
        }
        
        if (!surname) {
            surname = 'User'; 
        }
        if (!givenNames) {
           givenNames = 'Customer';
        }

        const payload = {
            billId: dueBill.id,
            paymentMethod: selectedMethod.channel_code,
            customer: {
                given_names: givenNames,
                surname: surname,
                email: user.email,
                mobile_number: user.profile?.mobileNumber || '+639000000000'
            },
            successRedirectUrl,
            failureRedirectUrl
        };

        const response = await api.post('/billing/initiate-payment', payload);

        if (selectedMethod.channel_code === 'CASH') {
            showAlert('Success', response.data.message);
            await refreshSubscription(); 
            navigation.goBack();
        } else if (response.data.redirectUrl) {
            await Linking.openURL(response.data.redirectUrl);
        } else {
            showAlert('Payment Initiated', response.data.message);
        }

    } catch (error) {
        if (error.response?.status === 401) {
            showAlert('Session Expired', 'Your session has timed out. Please log in again.');
            signOut(); 
        } else {
            showAlert('Payment Error', error.response?.data?.message || 'An unexpected error occurred.');
        }
    } finally {
        setIsSubmitting(false);
    }
  }, [selectedMethod, dueBill, user, api, showAlert, navigation, refreshSubscription, signOut]); 

  const renderPaymentFlow = () => (
    <>
      <ScrollView contentContainerStyle={styles.scrollContainer} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} tintColor={theme.primary} />}>
        <BillSummaryCard bill={dueBill} />
        <View style={styles.paymentSection}>
          <Text style={styles.sectionHeader}>Choose Payment Method</Text>
          <ContactSupportLink />
          {paymentMethods.map(method => (
              <PaymentMethodCard
                key={method.channel_code}
                icon={PAYMENT_METHOD_LOGOS[method.channel_code] || PAYMENT_METHOD_LOGOS.DEFAULT}
                title={method.name}
                description={method.description}
                isSelected={selectedMethod?.channel_code === method.channel_code}
                onSelect={() => setSelectedMethod(method)}
              />
          ))}
        </View>
      </ScrollView>
      <View style={styles.fixedButtonContainer}>
        <TouchableOpacity style={[styles.button, (!selectedMethod || isSubmitting) && styles.buttonDisabled]} onPress={handlePayment} disabled={!selectedMethod || isSubmitting}>
          {isSubmitting ? <ActivityIndicator color={theme.textOnPrimary} /> : <Text style={styles.buttonText}>Continue</Text>}
        </TouchableOpacity>
      </View>
    </>
  );

  const renderEmptyState = () => {
    if (upcomingBill && !dueBill && !pendingBill) {
        return (
            <ScrollView contentContainerStyle={styles.fullScreenScroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} tintColor={theme.primary} />}>
              <StatusDisplay 
                illustration={require('../../assets/images/status/upcoming.png')}
                title="Upcoming Bill" 
                text={`Your bill for ₱${upcomingBill.amount.toFixed(2)} will be due on ${new Date(upcomingBill.dueDate).toLocaleDateString()}. We'll notify you when it's time to pay.`}
              />
            </ScrollView>
        );
    }

    if (pendingBill) {
      const isCashPayment = pendingBill.payments?.some(p => p.method === 'Cash' && p.status === 'Pending Verification');
      
      const title = isCashPayment ? "Cash Collection Scheduled" : "Payment Under Review";
      const text = isCashPayment
        ? `Our collector will contact you to collect ₱${(pendingBill.amount ?? 0).toFixed(2)}. This bill is locked until the payment is processed.`
        : `We are verifying your payment of ₱${(pendingBill.amount ?? 0).toFixed(2)}. This may take up to 24 hours.`;
      return (
        <ScrollView contentContainerStyle={styles.fullScreenScroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} tintColor={theme.primary} />}>
          <StatusDisplay 
            illustration={require('../../assets/images/status/completedplan.png')} 
            title={title} 
            text={text} 
          />
        </ScrollView>
      );
    }
    const stateConfig = EMPTY_STATES_CONFIG(theme, navigation);
    const state = stateConfig[subscriptionStatus] || stateConfig.active; 
    return <ScrollView contentContainerStyle={styles.fullScreenScroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} tintColor={theme.primary} />}><StatusDisplay icon={state.icon} color={state.color} title={state.title} text={state.text} buttonText={state.buttonText} action={state.action} /></ScrollView>;
  };

  if (isLoading && !refreshing) {
    return <SafeAreaView style={styles.container}><Header onBackPress={() => navigation.goBack()} /><View style={styles.fullScreenScroll}><ActivityIndicator size="large" color={theme.primary} /></View></SafeAreaView>
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header onBackPress={() => navigation.goBack()} />
      {dueBill && !pendingBill ? renderPaymentFlow() : renderEmptyState()}
    </SafeAreaView>
  );
}

const getStyles = (theme) =>
  StyleSheet.create({
    container: { backgroundColor: theme.background, flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, height: 60 },
    headerButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: theme.text },
    scrollContainer: { paddingHorizontal: 20, paddingBottom: 120 },
    fullScreenScroll: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },

    heroCard: { borderRadius: 24, padding: 25, overflow: 'hidden' },
    heroCardBackgroundIcon: { position: 'absolute', right: -10, top: 10, opacity: 0.1 },
    heroCardLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 16, fontWeight: '500' },
    heroCardAmount: { color: theme.textOnPrimary, fontSize: 48, fontWeight: 'bold', marginVertical: 8 },
    heroCardDueDateContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start' },
    heroCardDueDateText: { color: theme.textOnPrimary, fontSize: 14, fontWeight: '600', marginLeft: 6 },
    
    paymentSection: { marginTop: 30 },
    sectionHeader: { color: theme.text, fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
    paymentMethodCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 20,
      marginBottom: 12,
      borderWidth: 2,
      borderColor: theme.surface,
    },
    paymentMethodCardSelected: {
      borderColor: theme.primary,
    },
    paymentMethodLogo: { width: 40, height: 40, resizeMode: 'contain', marginRight: 15 },
    paymentMethodTextContainer: { flex: 1 },
    paymentMethodTitle: { fontSize: 17, fontWeight: 'bold', color: theme.text },
    paymentMethodDescription: { fontSize: 14, color: theme.textSecondary, marginTop: 4 },
    radioCircle: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: theme.border, justifyContent: 'center', alignItems: 'center' },
    radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: theme.primary },

    fixedButtonContainer: {
      backgroundColor: theme.surface,
      borderTopColor: theme.border,
      borderTopWidth: 1,
      padding: 20,
      paddingBottom: 20,
    },
    button: { alignItems: 'center', backgroundColor: theme.primary, borderRadius: 14, height: 54, justifyContent: 'center' },
    buttonDisabled: { backgroundColor: theme.disabled, opacity: 0.7 },
    buttonText: { color: theme.textOnPrimary, fontSize: 16, fontWeight: 'bold' },
    contactSupportContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 10,
        backgroundColor: `${theme.primary}1A`,
        borderRadius: 12,
        marginBottom: 15,
    },
    contactSupportText: {
        color: theme.primary,
        fontWeight: '600',
        marginLeft: 8,
    },
  });