import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  Image,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSubscription, useTheme, useAuth } from '../contexts';
import * as Animatable from 'react-native-animatable';
import { BottomNavBar } from '../components/BottomNavBar';

// --- Constants & Helpers ---
const formatDate = (dateString, includeTime = false) => {
  if (!dateString) return 'N/A';
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
  }
  return new Date(dateString).toLocaleDateString('en-US', options);
};

const ICONS = {
    bill_due: { component: Ionicons, name: 'alert-circle-outline' },
    bill_overdue: { component: Ionicons, name: 'close-circle' },
    bill_paid: { component: Ionicons, name: 'checkmark-circle-outline' },
    bill_pending: { component: Ionicons, name: 'hourglass-outline' },
    subscribed: { component: MaterialCommunityIcons, name: 'rocket-launch-outline' },
    cancelled: { component: MaterialCommunityIcons, name: 'close-circle-outline' },
    payment_success: { component: MaterialCommunityIcons, name: 'check-decagram-outline' },
    submitted_payment: { component: MaterialCommunityIcons, name: 'file-upload-outline' },
    activated: { component: MaterialCommunityIcons, name: 'flash-outline' },
    plan_change_requested: { component: Ionicons, name: 'swap-horizontal-outline' },
    plan_change_cancelled: { component: Ionicons, name: 'arrow-undo-circle-outline' },
};

// --- Sub-Components (Memoized for Performance) ---

const HistoryCard = React.memo(({ item, onViewReceipt }) => {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    
    let iconKey = item.type;
    let iconColor = theme.accent;

    if (item.type === 'bill') {
        switch (item.status) {
            case 'Paid': iconKey = 'bill_paid'; iconColor = theme.success; break;
            case 'Overdue': iconKey = 'bill_overdue'; iconColor = theme.danger; break;
            case 'Pending Verification': iconKey = 'bill_pending'; iconColor = theme.warning; break;
            default: iconKey = 'bill_due'; iconColor = theme.warning;
        }
    } else if (item.type === 'payment_success') {
        iconColor = theme.primary;
    } else if (item.type === 'cancelled') {
        iconColor = theme.danger;
    }
  
    const { component: IconComponent, name: iconName } = ICONS[iconKey] || {
      component: MaterialCommunityIcons,
      name: 'information-outline',
    };
    
    const title = item.type === 'bill' ? `Bill for ${item.planName}` : item.details;

    return (
        <Animatable.View animation="fadeInUp" duration={500} useNativeDriver={true} style={styles.historyCard}>
            <View style={[styles.cardIconContainer, { backgroundColor: `${iconColor}20` }]}>
                <IconComponent name={iconName} size={24} color={iconColor} />
            </View>
            <View style={styles.cardContent}>
                <Text style={styles.cardTitle} numberOfLines={2}>{title}</Text>
                {item.type === 'bill' ? (
                <Text style={styles.cardDetail}>
                    Amount: <Text style={{ fontWeight: 'bold' }}>₱{item.amount.toFixed(2)}</Text>
                </Text>
                ) : (
                <Text style={styles.cardDate}>{formatDate(item.date, true)}</Text>
                )}
            </View>
            {item.type === 'payment_success' && item.receiptNumber && (
                <TouchableOpacity style={styles.receiptButton} onPress={() => onViewReceipt(item)}>
                <Text style={styles.receiptButtonText}>Receipt</Text>
                </TouchableOpacity>
            )}
        </Animatable.View>
    );
});

const StatusDisplay = React.memo(({ illustration, icon, title, text, buttonText, onButtonPress, children }) => {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    return (
        <View style={styles.emptyStateContainer}>
            <Animatable.View animation="fadeInUp" duration={600} delay={100}>
                {icon ? (
                <Ionicons name={icon} size={80} color={theme.textSecondary} style={styles.statusIcon} />
                ) : (
                <Image source={illustration} style={styles.statusIllustration} />
                )}
            </Animatable.View>
            <Animatable.Text animation="fadeInUp" duration={600} delay={200} style={styles.emptyStateTitle}>{title}</Animatable.Text>
            <Animatable.Text animation="fadeInUp" duration={600} delay={300} style={styles.emptyStateText}>{text}</Animatable.Text>
            {children}
            {buttonText && onButtonPress && (
                <Animatable.View animation="fadeInUp" duration={600} delay={400} style={{ width: '100%' }}>
                <TouchableOpacity style={styles.primaryButton} onPress={onButtonPress}>
                    <Text style={styles.buttonText}>{buttonText}</Text>
                </TouchableOpacity>
                </Animatable.View>
            )}
        </View>
    );
});

const ReceiptModal = React.memo(({ isVisible, onClose, receiptData }) => {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    if (!receiptData) return null;

    return (
        <Modal animationType="fade" transparent={true} visible={isVisible} onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <Animatable.View animation="zoomIn" duration={300} style={styles.modalContent}>
                    <Ionicons name="receipt" size={32} color={theme.primary} style={{ marginBottom: 10, alignSelf: 'center' }} />
                    <Text style={styles.modalTitle}>Payment Receipt</Text>
                    <View style={styles.modalDetailRow}>
                        <Text style={styles.modalDetailLabel}>Receipt No:</Text>
                        <Text style={[styles.modalDetailValue, { fontWeight: 'bold' }]}>{receiptData.receiptNumber}</Text>
                    </View>
                    <View style={styles.modalDetailRow}>
                        <Text style={styles.modalDetailLabel}>Payment Date:</Text>
                        <Text style={styles.modalDetailValue}>{formatDate(receiptData.date, true)}</Text>
                    </View>
                    <View style={styles.modalSeparator} />
                    <View style={styles.modalDetailRow}>
                        <Text style={styles.modalDetailLabel}>Plan:</Text>
                        <Text style={styles.modalDetailValue}>{receiptData.planName}</Text>
                    </View>
                    <View style={styles.modalDetailRow}>
                        <Text style={styles.modalDetailLabel}>Amount Paid:</Text>
                        <Text style={[styles.modalDetailValue, { fontWeight: 'bold', color: theme.primary }]}>
                            ₱{receiptData.amount?.toFixed(2)}
                        </Text>
                    </View>
                    <TouchableOpacity style={[styles.primaryButton, { marginTop: 20, width: '100%' }]} onPress={onClose}>
                        <Text style={styles.buttonText}>CLOSE</Text>
                    </TouchableOpacity>
                </Animatable.View>
            </View>
        </Modal>
    );
});


// --- Main Screen Component ---
export default function MyBillsScreen() {
  const navigation = useNavigation();
  const { paymentHistory, isLoading, subscriptionStatus, subscriptionData, refreshSubscription, clearSubscription } = useSubscription();
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const { user } = useAuth();

  const [isReceiptModalVisible, setReceiptModalVisible] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const { pendingBill, dueBill } = useMemo(() => ({
    pendingBill: paymentHistory.find(item => item.type === 'bill' && item.status === 'Pending Verification'),
    dueBill: paymentHistory.find(item => item.type === 'bill' && (item.status === 'Due' || item.status === 'Overdue')),
  }), [paymentHistory]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshSubscription();
    setRefreshing(false);
  }, [refreshSubscription]);
  
  useFocusEffect(
    useCallback(() => {
        onRefresh();
    }, [onRefresh])
  );

  const handleViewReceipt = useCallback((receiptData) => {
    setSelectedReceipt(receiptData);
    setReceiptModalVisible(true);
  }, []);

  const handleNavigate = useCallback((screen, params = {}) => navigation.navigate(screen, params), [navigation]);
  
  const renderCurrentBillCard = () => {
    if (pendingBill) {
        return (
            <>
                <Text style={styles.currentBillAmount}>₱{pendingBill.amount.toFixed(2)}</Text>
                <View style={styles.statusBadgePending}>
                    <Ionicons name="hourglass-outline" size={16} color={theme.warning} />
                    <Text style={styles.statusBadgeTextPending}>Payment Verifying</Text>
                </View>
            </>
        );
    }
    if (dueBill) {
        const today = new Date();
        const dueDate = new Date(dueBill.dueDate);
        const renewalDate = subscriptionData ? new Date(subscriptionData.renewalDate) : today;
        let badge;
        if (dueBill.status === 'Overdue') {
          badge = <View style={[styles.statusBadgeBase, styles.statusBadgeOverdue]}><Text style={styles.statusBadgeTextOverdue}>OVERDUE</Text></View>;
        } else if (today > dueDate && today <= renewalDate) {
          badge = <View style={[styles.statusBadgeBase, styles.statusBadgeGrace]}><Text style={styles.statusBadgeTextGrace}>GRACE PERIOD</Text></View>;
        } else {
          badge = <View style={[styles.statusBadgeBase, styles.statusBadgeDue]}><Text style={styles.statusBadgeTextDue}>Due on: {formatDate(dueBill.dueDate)}</Text></View>;
        }
        return (
            <>
                <Text style={styles.currentBillAmount}>₱{dueBill.amount.toFixed(2)}</Text>
                {badge}
                <View style={styles.billActionsContainer}>
                    <TouchableOpacity style={styles.payNowButton} onPress={() => handleNavigate('PayBills')}>
                        <Ionicons name="card-outline" size={20} color={theme.textOnPrimary} />
                        <Text style={styles.payNowButtonText}>PAY NOW</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.voucherButton} onPress={() => handleNavigate('PaymentVoucherScreen', { bill: dueBill, user })}>
                        <Ionicons name="receipt-outline" size={24} color={theme.primary} />
                    </TouchableOpacity>
                </View>
            </>
        );
    }
    return (
        <>
            <Text style={styles.currentBillAmount}>₱0.00</Text>
            <View style={styles.statusBadgePaid}>
                <Ionicons name="checkmark-circle" size={16} color={theme.success} />
                <Text style={styles.statusBadgeTextPaid}>You're all paid up!</Text>
            </View>
        </>
    );
  };
  
  const renderMainContent = () => {
    if (['active', 'suspended'].includes(subscriptionStatus)) {
        if (!dueBill && !pendingBill && paymentHistory.length === 0 && subscriptionStatus === 'active') {
          return <StatusDisplay theme={theme} icon="shield-checkmark-outline" title="You're All Set!" text="Your first bill will be generated at the start of your next cycle." />;
        }
        return (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} tintColor={theme.primary} />}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.screenTitle}>Account & Billing</Text>
            <Text style={styles.screenSubtitle}>View your account's billing history and settle payments.</Text>
            <View style={styles.currentBillCard}>
                <Text style={styles.currentBillLabel}>CURRENT BILL</Text>
                {renderCurrentBillCard()}
            </View>
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Account History</Text>
                {paymentHistory.length > 0 ? (
                    paymentHistory.map(item => <HistoryCard key={item.id || item._id} item={item} onViewReceipt={handleViewReceipt} />)
                ) : (
                    <Text style={styles.noHistoryText}>No account history yet.</Text>
                )}
            </View>
          </ScrollView>
        );
    }

    if (subscriptionStatus === 'pending_change') {
      return (
        <ScrollView contentContainerStyle={[styles.statusContainer, { paddingBottom: 120 }]}>
          <Animatable.Image animation="fadeInUp" duration={600} delay={100} source={require('../assets/images/completedplan.png')} style={styles.statusIllustration} />
          <Animatable.Text animation="fadeInUp" delay={200} style={styles.statusTitle}>Plan Change Pending</Animatable.Text>
          <Animatable.Text animation="fadeInUp" delay={300} style={styles.statusText}>You cannot view or pay bills while your plan change is being reviewed. Please check back later.</Animatable.Text>
          <Animatable.View animation="fadeInUp" delay={500} style={styles.statusButtonContainer}>
            <TouchableOpacity style={styles.primaryButton} onPress={() => handleNavigate('Subscription')}>
              <Text style={styles.buttonText}>VIEW STATUS</Text>
            </TouchableOpacity>
          </Animatable.View>
        </ScrollView>
      );
    }

    const EMPTY_STATES = {
      null: { icon: 'document-text-outline', title: 'No Active Plan', text: 'You need an active subscription to pay bills.', buttonText: 'Subscribe Now', action: async () => { await clearSubscription(); handleNavigate('Subscription'); }},
      pending_installation: { illustration: require('../assets/images/technician.png'), title: 'Awaiting Installation', text: 'Your bills will appear here once your plan is activated.', buttonText: 'Check Status', action: () => handleNavigate('Subscription') },
      pending_verification: { illustration: require('../assets/images/completedplan.png'), title: 'Verification in Progress', text: 'Your first bill will appear here once your plan is active.', buttonText: 'Check Status', action: () => handleNavigate('Subscription') },
      declined: { illustration: require('../assets/images/declined.png'), title: 'Submission Declined', text: 'Your recent subscription payment was not approved.', buttonText: 'TRY AGAIN', action: async () => { await clearSubscription(); handleNavigate('Subscription'); }, reason: subscriptionData?.declineReason },
      cancelled: { illustration: require('../assets/images/cancelled.png'), title: 'Subscription Cancelled', text: 'Your subscription is no longer active. You can still view your past billing history or subscribe to a new plan.', buttonText: 'SUBSCRIBE AGAIN', action: async () => { await clearSubscription(); handleNavigate('Subscription'); }},
    };
    const state = EMPTY_STATES[subscriptionStatus] || EMPTY_STATES.cancelled;

    if (subscriptionStatus === 'cancelled' && paymentHistory.length > 0) {
      return (
          <ScrollView contentContainerStyle={styles.scrollContent} refreshControl={ <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} tintColor={theme.primary} /> }>
              <StatusDisplay theme={theme} illustration={state.illustration} title={state.title} text={state.text} buttonText={state.buttonText} onButtonPress={state.action} />
              <View style={styles.Line} />
              <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Past Account History</Text>
                  {paymentHistory.map(item => <HistoryCard key={item.id || item._id} item={item} onViewReceipt={handleViewReceipt} />)}
              </View>
          </ScrollView>
      );
    }
            
    return (
      <StatusDisplay theme={theme} illustration={state.illustration} icon={state.icon} title={state.title} text={state.text} buttonText={state.buttonText} onButtonPress={state.action}>
        {state.reason && (
          <View style={styles.reasonBox}>
            <Text style={styles.reasonTitle}>Reason:</Text>
            <Text style={styles.reasonText}>{state.reason}</Text>
          </View>
        )}
      </StatusDisplay>
    );
  };

  if (isLoading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyStateContainer}><ActivityIndicator size="large" color={theme.primary} /></View>
        <BottomNavBar activeScreen="Billing" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderMainContent()}
      <ReceiptModal 
        isVisible={isReceiptModalVisible}
        onClose={() => setReceiptModalVisible(false)}
        receiptData={selectedReceipt}
      />
      <BottomNavBar activeScreen="Billing" />
    </SafeAreaView>
  );
}

const getStyles = (theme) =>
  StyleSheet.create({
    billActionsContainer: { flexDirection: 'row', gap: 10, marginTop: 20 },
    buttonText: { color: theme.textOnPrimary, fontSize: 16, fontWeight: 'bold' },
    cardContent: { flex: 1 },
    cardDate: { color: theme.textSecondary, fontSize: 13, marginTop: 4 },
    cardDetail: { color: theme.textSecondary, fontSize: 14, marginTop: 4 },
    cardIconContainer: { alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: 22, marginRight: 15 },
    cardTitle: { color: theme.text, fontSize: 15, fontWeight: '600' },
    container: { backgroundColor: theme.background, flex: 1 },
    currentBillAmount: { color: theme.text, fontSize: 40, fontWeight: 'bold', marginTop: 5 },
    currentBillCard: { backgroundColor: theme.surface, borderRadius: 20, padding: 20, marginBottom: 30, borderWidth: 1, borderColor: theme.border, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: theme.isDarkMode ? 0.2 : 0.08, shadowRadius: 10 },
    currentBillLabel: { color: theme.textSecondary, fontSize: 14, fontWeight: '600', textTransform: 'uppercase' },
    emptyStateContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30, backgroundColor: theme.background },
    emptyStateText: { fontSize: 16, color: theme.textSecondary, textAlign: 'center', lineHeight: 24, marginTop: 12, marginBottom: 30 },
    emptyStateTitle: { fontSize: 24, fontWeight: 'bold', color: theme.text, textAlign: 'center' },
    historyCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surface, borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: theme.border },
    Line: {borderWidth: 0.4, borderColor: theme.border, top: 23, width: 400, right: 20 },
    modalContent: { backgroundColor: theme.surface, borderRadius: 15, padding: 25, width: '100%', alignItems: 'flex-start' },
    modalDetailLabel: { color: theme.textSecondary, fontSize: 16 },
    modalDetailRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingVertical: 8 },
    modalDetailValue: { color: theme.text, fontSize: 16 },
    modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.6)', padding: 20 },
    modalSeparator: { height: 1, backgroundColor: theme.border, width: '100%', marginVertical: 10 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: theme.text, marginBottom: 20, textAlign: 'center', width: '100%' },
    noHistoryText: { color: theme.textSecondary, fontStyle: 'italic', textAlign: 'center', paddingVertical: 20 },
    payNowButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: theme.primary, paddingVertical: 16, borderRadius: 12 },
    payNowButtonText: { color: theme.textOnPrimary, fontSize: 16, fontWeight: 'bold' },
    primaryButton: { backgroundColor: theme.primary, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 30, alignItems: 'center', width: '100%', maxWidth: 300 },
    reasonBox: { backgroundColor: `${theme.danger}1A`, borderLeftColor: theme.danger, borderLeftWidth: 4, borderRadius: 8, padding: 15, marginBottom: 20, width: '100%' },
    reasonText: { color: theme.text, fontSize: 15 },
    reasonTitle: { color: theme.danger, fontSize: 14, fontWeight: 'bold', marginBottom: 5 },
    receiptButton: { alignSelf: 'center', marginLeft: 'auto' },
    receiptButtonText: { color: theme.primary, fontSize: 13, fontWeight: 'bold' },
    screenSubtitle: { fontSize: 18, color: theme.textSecondary, marginBottom: 30 },
    screenTitle: { fontSize: 32, fontWeight: 'bold', color: theme.text, marginBottom: 8 },
    scrollContent: { paddingTop: 40, paddingHorizontal: 20, paddingBottom: 120 },
    section: { marginBottom: 20, marginTop: 20, top: 20 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: theme.text, marginBottom: 15 },
    statusBadgeBase: { alignSelf: 'flex-start', borderRadius: 8, marginTop: 8, paddingHorizontal: 10, paddingVertical: 5 },
    statusBadgeDue: { backgroundColor: `${theme.warning}20` },
    statusBadgeGrace: { backgroundColor: `${theme.warning}20` },
    statusBadgeOverdue: { backgroundColor: `${theme.danger}20` },
    statusBadgePaid: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
    statusBadgeTextDue: { color: theme.warning, fontSize: 13, fontWeight: 'bold' },
    statusBadgeTextGrace: { color: theme.warning, fontSize: 13, fontWeight: 'bold' },
    statusBadgeTextOverdue: { color: theme.danger, fontSize: 13, fontWeight: 'bold' },
    statusBadgeTextPaid: { color: theme.success, fontSize: 16, fontWeight: '500' },
    statusIcon: { marginBottom: 20 },
    statusIllustration: { width: 200, height: 200, resizeMode: 'contain', marginBottom: 30 },
    statusContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
    statusButtonContainer: { marginTop: 30, width: '100%', alignItems: 'center' },
    statusTitle: { fontSize: 24, fontWeight: 'bold', color: theme.text, textAlign: 'center', marginBottom: 12 },
    statusText: { fontSize: 16, color: theme.textSecondary, textAlign: 'center', lineHeight: 24 },
    voucherButton: { alignItems: 'center', justifyContent: 'center', width: 56, height: 56, backgroundColor: theme.surface, borderRadius: 12, borderWidth: 1, borderColor: theme.border },
    statusBadgePending: { alignItems: 'center', flexDirection: 'row', gap: 8, marginTop: 8, backgroundColor: `${theme.warning}20`, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, alignSelf: 'flex-start' },
    statusBadgeTextPending: { color: theme.warning, fontSize: 13, fontWeight: 'bold' },
});