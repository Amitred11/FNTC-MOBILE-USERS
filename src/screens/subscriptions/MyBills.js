//MyBills.js
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
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSubscription, useTheme, useAuth } from '../../contexts';
import * as Animatable from 'react-native-animatable';
import { BottomNavBar } from '../../components/BottomNavBar';
import { ICONS } from '../../data/Constants-Data';
import ReceiptDetailModal from './components/ReceiptDetailModal';
import InvoiceDetailModal from './components/InvoiceDetailModal';
// --- SECTION 1: CONSTANTS & HELPERS ---
const formatDate = (dateString, includeTime = false) => {
if (!dateString) return 'N/A';
const options = { month: 'long', day: 'numeric', year: 'numeric' };
if (includeTime) {
options.hour = '2-digit';
options.minute = '2-digit';
options.hour12 = true;
}
return new Date(dateString).toLocaleDateString('en-US', options);
};
// --- SECTION 2: REFACTORED SUB-COMPONENTS ---
const Header = React.memo(() => {
const { theme } = useTheme();
const styles = getStyles(theme);
return (
<View style={styles.headerContainer}>
<Text style={styles.screenTitle}>Billing</Text>
<Text style={styles.screenSubtitle}>Manage your account and settle payments.</Text>
</View>
);
});
const CurrentBill = React.memo(({ dueBill, pendingBill, onPay, onViewVoucher, onViewInvoice }) => {
const { theme } = useTheme();
const styles = getStyles(theme);
const BillContent = useMemo(() => {
    if (pendingBill) {
        return (
            <>
                <View style={styles.billCardStatus}>
                    <Ionicons name="hourglass-outline" size={16} color={theme.warning} />
                    <Text style={styles.billCardStatusTextPending}>Payment Verifying</Text>
                </View>
                <Text style={styles.billCardAmount}>₱{pendingBill.amount.toFixed(2)}</Text>
                <Text style={styles.billCardDueDate}>Submitted on {formatDate(pendingBill.date, true)}</Text>
            </>
        );
    }

    if (dueBill) {
        const isOverdue = dueBill.status === 'Overdue';
        return (
            <>
                <View style={[styles.billCardStatus, isOverdue && styles.billCardStatusOverdue]}>
                    <Ionicons name={isOverdue ? "alert-circle" : "calendar-outline"} size={16} color={isOverdue ? theme.danger : theme.textSecondary} />
                    <Text style={[styles.billCardStatusText, isOverdue && styles.billCardStatusTextOverdue]}>
                        {isOverdue ? `Overdue` : `Due on ${formatDate(dueBill.dueDate)}`}
                    </Text>
                </View>
                <Text style={styles.billCardAmount}>₱{dueBill.amount.toFixed(2)}</Text>
                <View style={styles.billActionsContainer}>
                    <TouchableOpacity style={styles.payNowButton} onPress={onPay}>
                        <Ionicons name="card" size={20} color={theme.textOnPrimary} />
                        <Text style={styles.payNowButtonText}>PAY NOW</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.voucherButton} onPress={onViewVoucher}>
                         <Ionicons name="receipt-outline" size={20} color={theme.primary} />
                         <Text style={styles.voucherButtonText}>Voucher</Text>
                    </TouchableOpacity>
                    {/* The "Invoice" button here provides a view of the current bill (what is owed). */}
                    <TouchableOpacity style={styles.invoiceButton} onPress={() => onViewInvoice(dueBill)}>
                         <View style={{flexDirection: 'row', gap: 10}}>
                         <Ionicons name="document-text-outline" size={20} color={theme.primary} />
                         <Text style={styles.invoiceButtonText}>Invoice</Text>
                         </View>
                    </TouchableOpacity>
                </View>
            </>
        );
    }

    return (
        <>
            <View style={styles.billCardStatus}>
                <Ionicons name="shield-checkmark" size={16} color={theme.success} />
                <Text style={styles.billCardStatusTextPaid}>You're all paid up!</Text>
            </View>
            <Text style={styles.billCardAmount}>₱0.00</Text>
            <Text style={styles.billCardDueDate}>Your account is in good standing.</Text>
        </>
    );
}, [pendingBill, dueBill, theme, styles, onPay, onViewVoucher, onViewInvoice]);

return (
    <Animatable.View animation="fadeIn" duration={400} style={styles.billCard}>
        <Text style={styles.billCardLabel}>CURRENT BILL</Text>
        {BillContent}
    </Animatable.View>
);
});
const HistoryItem = React.memo(({ item, onViewReceipt, onViewInvoice }) => {
const { theme } = useTheme();
const styles = getStyles(theme);
const { iconDetails, title, subtitle } = useMemo(() => {
    let iconKey = item.type;
    if (item.type === 'bill') {
        switch (item.status) {
            case 'Paid': iconKey = 'bill_paid'; break;
            case 'Overdue': iconKey = 'bill_overdue'; break;
            case 'Pending Verification': iconKey = 'bill_pending'; break;
            default: iconKey = 'bill_due';
        }
    } else if (item.type === 'payment_success') {
        iconKey = 'payment_success'; // Ensure this key exists in ICONS
    } else if (item.type === 'submitted_payment') {
        iconKey = 'submitted_payment'; // Ensure this key exists in ICONS
    }


    // Defensive check: Ensure ICONS[iconKey] and its component property exist
    // Fallback to a default icon if not found or component is invalid
    const details = (ICONS[iconKey] && typeof ICONS[iconKey].component === 'function')
                    ? ICONS[iconKey]
                    : { component: Ionicons, name: 'help-circle', colorKey: 'textSecondary' };
    
    const { component: IconComponent, name: iconName, colorKey } = details;

    // Safely convert potential non-string/non-number values to string for display
    const safePlanName = typeof item.planName === 'string' ? item.planName : String(item.planName || 'N/A');
    const safeDetails = typeof item.details === 'string' ? item.details : String(item.details || 'N/A');
    const safeAmount = typeof item.amount === 'number' ? item.amount.toFixed(2) : '0.00';
    const safeStatus = typeof item.status === 'string' ? item.status : 'Unknown';

    return {
        iconDetails: {
            Component: IconComponent,
            name: iconName,
            color: theme[colorKey] || theme.textSecondary
        },
        title: item.type === 'bill' ? `Bill for ${safePlanName}` : safeDetails,
        subtitle: item.type === 'bill'
            ? `Amount: ₱${safeAmount} • Status: ${safeStatus}`
            : formatDate(item.date, true)
    };
}, [item, theme]);

return (
    <Animatable.View animation="fadeInUp" duration={500} style={styles.historyItem}>
        <View style={[styles.historyIconContainer, { backgroundColor: `${iconDetails.color}1A` }]}>
            {iconDetails.Component && <iconDetails.Component name={iconDetails.name} size={24} color={iconDetails.color} />}
        </View>
        <View style={styles.historyContent}>
            <Text style={styles.historyTitle} numberOfLines={1}>{title}</Text>
            <Text style={styles.historySubtitle}>{subtitle}</Text>
        </View>
        {item.type === 'bill' && (
            <TouchableOpacity style={styles.actionButton} onPress={() => onViewInvoice(item)}>
                <Text style={styles.actionButtonText}>Invoice</Text>
            </TouchableOpacity>
        )}
        {item.type === 'payment_success' && item.receiptNumber && (
            <TouchableOpacity style={styles.actionButton} onPress={() => onViewReceipt(item)}>
                <Text style={styles.actionButtonText}>Receipt</Text>
            </TouchableOpacity>
        )}
        {item.type === 'submitted_payment' && !item.receiptNumber && (
            <View style={styles.actionStatusContainer}>
                <Ionicons name="hourglass-outline" size={16} color={theme.warning} />
                <Text style={styles.actionStatusText}>Pending</Text>
            </View>
        )}
    </Animatable.View>
);
});
const HistorySection = React.memo(({ history, onViewReceipt, onViewInvoice }) => {
const { theme } = useTheme();
const styles = getStyles(theme);
const [activeFilter, setActiveFilter] = useState('All');
const filters = ['All', 'Bills', 'Payments'];
const filteredHistory = useMemo(() => {
    if (activeFilter === 'Bills') return history.filter(item => item.type === 'bill');
    if (activeFilter === 'Payments') return history.filter(item => item.type === 'payment_success' || item.type === 'submitted_payment');
    return history;
}, [history, activeFilter]);

return (
    <View style={styles.historySection}>
        <Text style={styles.sectionTitle}>Account History</Text>
        <View style={styles.historyFilterContainer}>
            {filters.map(filter => (
                <TouchableOpacity
                    key={filter}
                    style={[styles.historyFilterButton, activeFilter === filter && styles.historyFilterButtonActive]}
                    onPress={() => setActiveFilter(filter)}
                >
                    <Text style={[styles.historyFilterText, activeFilter === filter && styles.historyFilterTextActive]}>{filter}</Text>
                </TouchableOpacity>
            ))}
        </View>
        {filteredHistory.length > 0 ? (
            filteredHistory.map(item => (
                <HistoryItem 
                    key={item.id || item._id} 
                    item={item} 
                    onViewReceipt={onViewReceipt} 
                    onViewInvoice={onViewInvoice}
                />
            ))
        ) : (
            <Text style={styles.noHistoryText}>No {activeFilter.toLowerCase()} history found.</Text>
        )}
    </View>
);
});
const EmptyStateView = React.memo(({ illustration, icon, title, text, buttonText, onButtonPress, reason }) => {
const { theme } = useTheme();
const styles = getStyles(theme);
return (
<View style={styles.emptyStateContainer}>
<Animatable.View animation="fadeInUp" duration={600} delay={100}>
{icon
? <Ionicons name={icon} size={80} color={theme.textSecondary} style={styles.statusIcon} />
: illustration && <Image source={illustration} style={styles.statusIllustration} />
}
</Animatable.View>
<Animatable.Text animation="fadeInUp" delay={200} style={styles.emptyStateTitle}>{title}</Animatable.Text>
<Animatable.Text animation="fadeInUp" delay={300} style={styles.emptyStateText}>{text}</Animatable.Text>
{reason && (
<View style={styles.reasonBox}>
<Text style={styles.reasonTitle}>Reason:</Text>
<Text style={styles.reasonText}>{reason}</Text>
</View>
)}
{buttonText && onButtonPress && (
<Animatable.View animation="fadeInUp" delay={400} style={{ width: '100%' }}>
<TouchableOpacity style={styles.primaryButton} onPress={onButtonPress}>
<Text style={styles.buttonText}>{buttonText}</Text>
</TouchableOpacity>
</Animatable.View>
)}
</View>
);
});
// --- SECTION 3: MAIN SCREEN COMPONENT ---
export default function MyBillsScreen() {
const navigation = useNavigation();
const { paymentHistory, isLoading, subscriptionStatus, subscriptionData, refreshSubscription, clearSubscription } = useSubscription();
const { theme } = useTheme();
const styles = getStyles(theme);
const { user } = useAuth();
const [isReceiptModalVisible, setReceiptModalVisible] = useState(false);
const [selectedReceipt, setSelectedReceipt] = useState(null);
const [isInvoiceModalVisible, setInvoiceModalVisible] = useState(false);
const [selectedInvoice, setSelectedInvoice] = useState(null);
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

useFocusEffect(useCallback(() => { onRefresh(); }, [onRefresh]));

const handleViewReceipt = useCallback((receiptData) => {
    setSelectedReceipt(receiptData);
    setReceiptModalVisible(true);
}, []);

const handleViewInvoice = useCallback((invoiceData) => {
    setSelectedInvoice(invoiceData);
    setInvoiceModalVisible(true);
}, []);

const handleNavigate = useCallback((screen, params = {}) => navigation.navigate(screen, params), [navigation]);

const renderMainContent = () => {
    const canViewBills = ['active', 'suspended'].includes(subscriptionStatus);
    
    if (canViewBills) {
        if (!dueBill && !pendingBill && paymentHistory.length === 0) {
            return <EmptyStateView icon="shield-checkmark-outline" title="You're All Set!" text="Your first bill will be generated at the start of your next billing cycle." />;
        }
        return (
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} tintColor={theme.primary} />}
                showsVerticalScrollIndicator={false}
            >
                <Header />
                <CurrentBill
                    dueBill={dueBill}
                    pendingBill={pendingBill}
                    onPay={() => handleNavigate('PayBills')}
                    onViewVoucher={() => handleNavigate('PaymentVoucherScreen', { bill: dueBill, user })}
                    onViewInvoice={handleViewInvoice}
                />
                <HistorySection history={paymentHistory} onViewReceipt={handleViewReceipt} onViewInvoice={handleViewInvoice} />
            </ScrollView>
        );
    }

    if (subscriptionStatus === 'cancelled' && paymentHistory.length > 0) {
         return (
            <ScrollView contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} tintColor={theme.primary} />}>
                <EmptyStateView
                    illustration={require('../../assets/images/status/cancelled.png')}
                    title="Subscription Cancelled"
                    text="You can still view your past billing history or subscribe to a new plan."
                    buttonText="SUBSCRIBE AGAIN"
                    onButtonPress={async () => { await clearSubscription(); handleNavigate('Subscription'); }}
                />
                <View style={styles.historySection}>
                   <View style={styles.divider} />
                   <Text style={styles.sectionTitle}>Past Account History</Text>
                   {paymentHistory.map(item => (
                        <HistoryItem 
                            key={item.id || item._id} 
                            item={item} 
                            onViewReceipt={handleViewReceipt} 
                            onViewInvoice={handleViewInvoice} 
                        />
                    ))}
                </View>
            </ScrollView>
        );
    }

    const EMPTY_STATES = {
        null: { icon: 'document-text-outline', title: 'No Active Plan', text: 'You need an active subscription to view or pay bills.', buttonText: 'Subscribe Now', action: async () => { await clearSubscription(); handleNavigate('Subscription'); }},
        pending_installation: { illustration: require('../../assets/images/icons/technician.png'), title: 'Awaiting Installation', text: 'Your bills will appear here once your plan is activated.', buttonText: 'Check Status', action: () => handleNavigate('Subscription') },
        pending_verification: { illustration: require('../../assets/images/status/completedplan.png'), title: 'Verification in Progress', text: 'Your first bill will appear here once your plan is active.', buttonText: 'Check Status', action: () => handleNavigate('Subscription') },
        pending_change: { illustration: require('../../assets/images/status/completedplan.png'), title: 'Plan Change Pending', text: 'You cannot view or pay bills while your plan change is being reviewed.', buttonText: 'VIEW STATUS', action: () => handleNavigate('Subscription') },
        declined: { illustration: require('../../assets/images/status/declined.png'), title: 'Submission Declined', text: 'Your recent subscription payment was not approved.', buttonText: 'TRY AGAIN', action: async () => { await clearSubscription(); handleNavigate('Subscription'); }, reason: subscriptionData?.declineReason },
        cancelled: { illustration: require('../../assets/images/status/cancelled.png'), title: 'Subscription Cancelled', text: 'Your subscription is no longer active. Subscribe to a new plan to continue.', buttonText: 'SUBSCRIBE AGAIN', action: async () => { await clearSubscription(); handleNavigate('Subscription'); }},
    };
    const state = EMPTY_STATES[subscriptionStatus] || EMPTY_STATES.null;
    return <EmptyStateView {...state} />;
};

if (isLoading && !refreshing) {
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.loaderContainer}><ActivityIndicator size="large" color={theme.primary} /></View>
            <BottomNavBar activeScreen="Billing" />
        </SafeAreaView>
    );
}

return (
    <SafeAreaView style={styles.container}>
        {renderMainContent()}
        <ReceiptDetailModal isVisible={isReceiptModalVisible} onClose={() => setReceiptModalVisible(false)} receiptData={selectedReceipt} />
        <InvoiceDetailModal isVisible={isInvoiceModalVisible} onClose={() => setInvoiceModalVisible(false)} invoiceData={selectedInvoice} />
        <BottomNavBar activeScreen="Billing" />
    </SafeAreaView>
);
}
// --- SECTION 4: STYLESHEET ---
const getStyles = (theme) =>
StyleSheet.create({
container: { backgroundColor: theme.background, flex: 1 },
scrollContent: { paddingTop: 20, paddingHorizontal: 20, paddingBottom: 120 },
loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

// --- Header Styles ---
headerContainer: { marginBottom: 20, alignItems: 'center' },
screenTitle: { fontSize: 32, fontWeight: 'bold', color: theme.text },
screenSubtitle: { fontSize: 16, color: theme.textSecondary, marginTop: 4 },

// --- Current Bill Card Styles ---
billCard: { backgroundColor: theme.surface, borderRadius: 24, padding: 25, marginBottom: 30, borderWidth: 1, borderColor: theme.border, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: theme.isDarkMode ? 0.25 : 0.1, shadowRadius: 12 },
billCardLabel: { color: theme.textSecondary, fontSize: 14, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
billCardAmount: { color: theme.text, fontSize: 42, fontWeight: 'bold', marginVertical: 8 },
billCardDueDate: { color: theme.textSecondary, fontSize: 14 },
billCardStatus: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start' },
billCardStatusText: { color: theme.textSecondary, fontWeight: '600' },
billCardStatusOverdue: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: `${theme.danger}20` },
billCardStatusTextOverdue: { color: theme.danger, fontWeight: 'bold' },
billCardStatusTextPaid: { color: theme.success, fontWeight: '600' },
billCardStatusTextPending: { color: theme.warning, fontWeight: '600' },
billActionsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 20 },
payNowButton: { flex: 1, minWidth: 120, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: theme.primary, paddingVertical: 16, borderRadius: 16 },
payNowButtonText: { color: theme.textOnPrimary, fontSize: 16, fontWeight: 'bold' },
voucherButton: { flex: 1, minWidth: 100, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 16, backgroundColor: theme.surface, borderRadius: 16, borderWidth: 1, borderColor: theme.border },
voucherButtonText: { color: theme.primary, fontSize: 16, fontWeight: 'bold' },
invoiceButton: { flex: 1, minWidth: 100, height: 50, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 16, backgroundColor: theme.surface, borderRadius: 16, borderWidth: 1, borderColor: theme.border },
invoiceButtonText: { color: theme.primary, fontSize: 16, fontWeight: 'bold' },

// --- History Section Styles ---
historySection: { marginBottom: 20 },
sectionTitle: { fontSize: 20, fontWeight: 'bold', color: theme.text, marginBottom: 15 },
divider: { height: 1, backgroundColor: theme.border, marginVertical: 20 },
historyFilterContainer: { flexDirection: 'row', backgroundColor: theme.surface, borderRadius: 12, padding: 4, marginBottom: 15 },
historyFilterButton: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
historyFilterButtonActive: { backgroundColor: theme.primary },
historyFilterText: { color: theme.textSecondary, fontWeight: '600' },
historyFilterTextActive: { color: theme.textOnPrimary, fontWeight: 'bold' },
historyItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surface, borderRadius: 16, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: theme.border },
historyIconContainer: { alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: 24, marginRight: 15 },
historyContent: { flex: 1 },
historyTitle: { color: theme.text, fontSize: 16, fontWeight: 'bold' },
historySubtitle: { color: theme.textSecondary, fontSize: 13, marginTop: 4 },
actionButton: { paddingVertical: 8, paddingLeft: 12 },
actionButtonText: { color: theme.primary, fontSize: 14, fontWeight: 'bold' },
// New styles for action status
actionStatusContainer: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8, paddingLeft: 12 },
actionStatusText: { color: theme.warning, fontSize: 14, fontWeight: 'bold' },
noHistoryText: { color: theme.textSecondary, fontStyle: 'italic', textAlign: 'center', paddingVertical: 30 },

// --- Empty State Styles ---
emptyStateContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30, backgroundColor: theme.background },
statusIllustration: { width: 220, height: 180, resizeMode: 'contain', marginBottom: 20 },
statusIcon: { marginBottom: 20 },
emptyStateTitle: { fontSize: 24, fontWeight: 'bold', color: theme.text, textAlign: 'center' },
emptyStateText: { fontSize: 16, color: theme.textSecondary, textAlign: 'center', lineHeight: 24, marginTop: 12, marginBottom: 30 },
reasonBox: { backgroundColor: `${theme.danger}1A`, borderLeftColor: theme.danger, borderLeftWidth: 4, borderRadius: 8, padding: 15, marginBottom: 20, alignSelf: 'stretch' },
reasonTitle: { color: theme.danger, fontSize: 14, fontWeight: 'bold', marginBottom: 5 },
reasonText: { color: theme.text, fontSize: 15 },
primaryButton: { width: '100%', maxWidth: 320, backgroundColor: theme.primary, borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
buttonText: { color: theme.textOnPrimary, fontSize: 16, fontWeight: 'bold' },
});