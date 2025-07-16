import React, { useState, useCallback } from 'react';
import { 
    View, Text, StyleSheet, TouchableOpacity, ScrollView, 
    Modal, ActivityIndicator, RefreshControl, SafeAreaView, Image
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSubscription, useTheme } from '../contexts';
import * as Animatable from 'react-native-animatable';
import { BottomNavBar } from '../components/BottomNavBar';

// --- Helper Function ---
const formatDate = (dateString, includeTime = false) => {
    if (!dateString) return 'N/A';
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    if (includeTime) {
        options.hour = '2-digit';
        options.minute = '2-digit';
    }
    return new Date(dateString).toLocaleDateString('en-US', options);
};

// --- Reusable History Card Component ---
const HistoryCard = ({ item, onViewReceipt, theme }) => {
    const styles = getStyles(theme);
    const ICONS = {
        
        bill_due: { component: Ionicons, name: 'alert-circle-outline', color: theme.warning },
        bill_overdue: { component: Ionicons, name: 'close-circle', color: theme.danger },
        bill_paid: { component: Ionicons, name: 'checkmark-circle-outline', color: theme.success },
        subscribed: { component: MaterialCommunityIcons, name: 'rocket-launch-outline', color: theme.accent },
        cancelled: { component: MaterialCommunityIcons, name: 'close-circle-outline', color: theme.danger },
        payment_success: { component: MaterialCommunityIcons, name: 'check-decagram-outline', color: theme.primary },
        submitted_payment: { component: MaterialCommunityIcons, name: 'file-upload-outline', color: theme.accent },
        activated: { component: MaterialCommunityIcons, name: 'flash-outline', color: theme.success },
        plan_change_requested: { component: Ionicons, name: 'swap-horizontal-outline', color: theme.accent },
        plan_change_cancelled: { component: Ionicons, name: 'arrow-undo-circle-outline', color: theme.textSecondary },
    };
    
    let iconKey = item.type;
    if (item.type === 'bill') {
        if (item.status === 'Paid') iconKey = 'bill_paid';
        else if (item.status === 'Overdue') iconKey = 'bill_overdue';
        else iconKey = 'bill_due';
    }
    const { component: IconComponent, name: iconName, color: iconColor } = ICONS[iconKey] || { component: MaterialCommunityIcons, name: 'information-outline', color: theme.textSecondary };
    const title = item.type === 'bill' ? `Bill for ${item.planName}` : item.details;

    return (
        <Animatable.View animation="fadeInUp" duration={500} useNativeDriver={true} style={styles.historyCard}>
            <View style={[styles.cardIconContainer, { backgroundColor: `${iconColor}20` }]}>
                <IconComponent name={iconName} size={24} color={iconColor} />
            </View>
            <View style={styles.cardContent}>
                <Text style={styles.cardTitle} numberOfLines={2}>{title}</Text>
                {item.type === 'bill' ? (
                    <Text style={styles.cardDetail}>Amount: <Text style={{fontWeight: 'bold'}}>₱{item.amount.toFixed(2)}</Text></Text>
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
};

// --- Reusable Status Display Component ---
// Added 'icon' to props
const StatusDisplay = ({ illustration, icon, title, text, buttonText, onButtonPress, theme, children }) => {
    const styles = getStyles(theme);
    return (
        <View style={styles.emptyStateContainer}>
            <Animatable.View animation="fadeInUp" duration={600} delay={100}>
                {/* Conditional rendering for icon or image */}
                {icon ? (
                    <Ionicons name={icon} size={150} color={theme.textSecondary} style={styles.statusIcon} />
                ) : (
                    <Image source={illustration} style={styles.statusIllustration} />
                )}
            </Animatable.View>
            <Animatable.View animation="fadeInUp" duration={600} delay={200}>
                <Text style={styles.emptyStateTitle}>{title}</Text>
            </Animatable.View>
            <Animatable.View animation="fadeInUp" duration={600} delay={300}>
                <Text style={styles.emptyStateText}>{text}</Text>
            </Animatable.View>
            
            {children}

            {buttonText && onButtonPress && (
                <Animatable.View animation="fadeInUp" duration={600} delay={400} style={{width: '100%'}}>
                    <TouchableOpacity style={styles.primaryButton} onPress={onButtonPress}>
                        <Text style={styles.buttonText}>{buttonText}</Text>
                    </TouchableOpacity>
                </Animatable.View>
            )}
        </View>
    );
};

// --- PendingChangeView for this Screen ---
const PendingChangeView = () => {
    const { theme } = useTheme();
    const navigation = useNavigation();
    const styles = getStyles(theme);

    return (
        <ScrollView contentContainerStyle={[styles.statusContainer, { paddingBottom: 120 }]}>
             <Animatable.Image 
                animation="fadeInUp"
                duration={600}
                delay={100}
                source={require('../assets/images/completedplan.png')} 
                style={styles.statusIllustration} 
            />
            <Animatable.Text animation="fadeInUp" delay={200} style={styles.statusTitle}>Plan Change Pending</Animatable.Text>
            <Animatable.Text animation="fadeInUp" delay={300} style={styles.statusText}>
                You cannot view or pay bills while your plan change is being reviewed. Please check back later.
            </Animatable.Text>

            <Animatable.View animation="fadeInUp" delay={500} style={styles.statusButtonContainer}>
                <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('Subscription')}>
                    <Text style={styles.buttonText}>VIEW STATUS</Text>
                </TouchableOpacity>
            </Animatable.View>
        </ScrollView>
    );
};

export default function MyBillsScreen() {
    const navigation = useNavigation();
    const { 
        paymentHistory, isLoading, subscriptionStatus, 
        subscriptionData, refreshSubscription, clearSubscription 
    } = useSubscription();
    const { theme } = useTheme();
    const styles = getStyles(theme);

    // --- FIX: Find bills that are 'Due' OR 'Overdue' ---
    const dueBill = paymentHistory.find(item => item.type === 'bill' && (item.status === 'Due' || item.status === 'Overdue'));

    const [isReceiptModalVisible, setReceiptModalVisible] = useState(false);
    const [selectedReceipt, setSelectedReceipt] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await refreshSubscription().finally(() => setRefreshing(false));
    }, [refreshSubscription]);

    const handleViewReceipt = (receiptData) => {
        setSelectedReceipt(receiptData);
        setReceiptModalVisible(true);
    };

    const renderModals = () => (
        <Modal animationType="fade" transparent={true} visible={isReceiptModalVisible} onRequestClose={() => setReceiptModalVisible(false)}>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Ionicons name="receipt" size={32} color={theme.primary} style={{marginBottom: 10, alignSelf: 'center'}} />
                    <Text style={styles.modalTitle}>Payment Receipt</Text>
                    {selectedReceipt && (
                        <>
                            <View style={styles.modalDetailRow}><Text style={styles.modalDetailLabel}>Receipt No:</Text><Text style={[styles.modalDetailValue, {fontWeight: 'bold'}]}>{selectedReceipt.receiptNumber}</Text></View>
                            <View style={styles.modalDetailRow}><Text style={styles.modalDetailLabel}>Payment Date:</Text><Text style={styles.modalDetailValue}>{formatDate(selectedReceipt.date, true)}</Text></View>
                            <View style={styles.modalSeparator} />
                            <View style={styles.modalDetailRow}><Text style={styles.modalDetailLabel}>Plan:</Text><Text style={styles.modalDetailValue}>{selectedReceipt.planName}</Text></View>
                            <View style={styles.modalDetailRow}><Text style={styles.modalDetailLabel}>Amount Paid:</Text><Text style={[styles.modalDetailValue, {fontWeight: 'bold', color: theme.primary}]}>₱{selectedReceipt.amount?.toFixed(2)}</Text></View>
                        </>
                    )}
                    <TouchableOpacity style={[styles.primaryButton, {marginTop: 20, width: '100%'}]} onPress={() => setReceiptModalVisible(false)}><Text style={styles.buttonText}>CLOSE</Text></TouchableOpacity>
                </View>
            </View>
        </Modal>
    );

    if (isLoading && !refreshing) {
        return (
            <SafeAreaView style={styles.container}>
                 <View style={styles.emptyStateContainer}><ActivityIndicator size="large" color={theme.primary} /></View>
            </SafeAreaView>
        );
    }
    
     const renderContent = () => {
        switch (subscriptionStatus) {
            case 'active':
                return (
                    <ScrollView 
                        contentContainerStyle={styles.scrollContent}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} tintColor={theme.primary} />}
                    >
                        <Text style={styles.screenTitle}>Account & Billing</Text>
                        <Text style={styles.screenSubtitle}>View your account's billing history and settle payments.</Text>
                        <View style={styles.currentBillCard}>
                            <Text style={styles.currentBillLabel}>CURRENT BILL</Text>
                            {dueBill ? (
                                <>
                                    <Text style={styles.currentBillAmount}>₱{dueBill.amount.toFixed(2)}</Text>
                                    
                                    {/* --- FIX: Logic to show Due, Grace, or Overdue badge --- */}
                                    {(() => {
                                        const today = new Date();
                                        const dueDate = new Date(dueBill.dueDate);
                                        const renewalDate = new Date(subscriptionData.renewalDate);

                                        if (dueBill.status === 'Overdue') {
                                            return (
                                                <View style={styles.statusBadgeOverdue}>
                                                    <Text style={styles.statusBadgeTextOverdue}>OVERDUE</Text>
                                                </View>
                                            );
                                        } else if (today > dueDate && today <= renewalDate) {
                                            return (
                                                <View style={styles.statusBadgeGrace}>
                                                    <Text style={styles.statusBadgeTextGrace}>GRACE PERIOD</Text>
                                                </View>
                                            );
                                        } else {
                                            return (
                                                <View style={styles.statusBadgeDue}>
                                                    <Text style={styles.statusBadgeTextDue}>Due on: {formatDate(dueBill.dueDate)}</Text>
                                                </View>
                                            );
                                        }
                                    })()}
                                    
                                    <TouchableOpacity style={styles.payNowButton} onPress={() => navigation.navigate('PayBills')}>
                                        <Text style={styles.payNowButtonText}>PAY NOW</Text>
                                    </TouchableOpacity>
                                </>
                            ) : (
                                <>
                                    <Text style={styles.currentBillAmount}>₱0.00</Text>
                                    <View style={styles.statusBadgePaid}>
                                        <Ionicons name="checkmark-circle" size={16} color={theme.success} />
                                        <Text style={styles.statusBadgeTextPaid}>You're all paid up!</Text>
                                    </View>
                                </>
                            )}
                        </View>
                        
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Account History</Text>
                            {paymentHistory.length > 0 
                                ? paymentHistory.map((item, index) => {
                                    const key = item.id || item._id || `event-${index}`;
                                    return <HistoryCard key={key} item={item} onViewReceipt={handleViewReceipt} theme={theme} />;
                                }) 
                                : <Text style={styles.noHistoryText}>No history yet.</Text>
                            }
                        </View>
                    </ScrollView>
                );
            case 'pending_change':
                return <PendingChangeView />;
            
            default:
                const EMPTY_STATES = {
                    // Corrected null state: illustration explicitly set to null
                    null: { 
                        icon: 'document-text-outline', 
                        illustration: null, // Explicitly set to null to avoid attempting to load a default image
                        title: 'No Active Plan', 
                        text: 'You need an active subscription to pay bills.', 
                        buttonText: 'Subscribe Now', 
                        action: async () => { await clearSubscription(); navigation.navigate('Subscription'); }
                    },
                    pending_installation: { illustration: require('../assets/images/technician.png'), title: 'Awaiting Installation', text: 'Your bills will appear here once your plan is activated.', buttonText: 'Check Status', action: () => navigation.navigate('Subscription') },
                    pending_verification: { illustration: require('../assets/images/completedplan.png'), title: 'Verification in Progress', text: 'Your first bill will appear here once your plan is active.', buttonText: 'Check Status', action: () => navigation.navigate('Subscription') },
                    declined: { illustration: require('../assets/images/declined.png'), title: 'Submission Declined', text: 'Your recent subscription payment was not approved.', buttonText: 'TRY AGAIN', action: async () => { await clearSubscription(); navigation.navigate('Subscription'); }, reason: subscriptionData?.declineReason },
                    cancelled: { illustration: require('../assets/images/cancelled.png'), title: 'No Active Subscription', text: 'Subscribe to a plan to see your account activity and bills.', buttonText: 'SUBSCRIBE NOW', action: async () =>{ await clearSubscription(); navigation.navigate('Subscription'); }  },
                    suspended: { illustration: require('../assets/images/declined.png'), title: 'Account Suspended', text: 'Your service has been temporarily suspended. Settle your outstanding bill to restore your connection.', buttonText: 'PAY NOW', action: () => navigation.navigate('PayBills') },
                };
                const state = EMPTY_STATES[subscriptionStatus] || EMPTY_STATES.cancelled;
                return (
                    <StatusDisplay
                        theme={theme}
                        // Pass both illustration and icon. StatusDisplay will handle which one to render.
                        illustration={state.illustration}
                        icon={state.icon} // Pass the icon name
                        title={state.title}
                        text={state.text}
                        buttonText={state.buttonText}
                        onButtonPress={state.action}
                    >
                        {state.reason && (
                             <View style={styles.reasonBox}>
                                <Text style={styles.reasonTitle}>Reason:</Text>
                                <Text style={styles.reasonText}>{state.reason}</Text>
                            </View>
                        )}
                    </StatusDisplay>
                );
        }
    }
    
    return (
        <SafeAreaView style={styles.container}>
            {renderContent()}
            {renderModals()}
            <BottomNavBar activeScreen="Billing" />
        </SafeAreaView>
    );
}

const getStyles = (theme) => StyleSheet.create({ 
    container: { flex: 1, backgroundColor: theme.background }, 
    scrollContent: { paddingTop: 40, paddingHorizontal: 20, paddingBottom: 120 },
    screenTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        color: theme.text,
        marginBottom: 8,
    },
    screenSubtitle: { 
        fontSize: 18, 
        color: theme.textSecondary, 
        marginBottom: 30,
        lineHeight: 26,
    },
    currentBillCard: {
        backgroundColor: theme.surface,
        borderRadius: 20,
        padding: 20,
        marginBottom: 30,
        borderWidth: 1,
        borderColor: theme.border,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4, },
        shadowOpacity: theme.isDarkMode ? 0.2 : 0.08,
        shadowRadius: 10,
        elevation: 5,
    },
    currentBillLabel: {
        fontSize: 14,
        color: theme.textSecondary,
        fontWeight: '600',
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    currentBillAmount: {
        fontSize: 40,
        fontWeight: 'bold',
        color: theme.text,
    },
    statusIcon: { // Style for the icon
        marginBottom: 30,
    },
    statusBadgeDue: {
        alignSelf: 'flex-start',
        backgroundColor: `${theme.warning}20`,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 5,
        marginTop: 8,
    },
    statusBadgeTextDue: {
        color: theme.warning,
        fontWeight: 'bold',
        fontSize: 13,
    },
    statusBadgeOverdue: {
        alignSelf: 'flex-start',
        backgroundColor: `${theme.danger}20`,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 5,
        marginTop: 8,
    },
    statusBadgeTextOverdue: {
        color: theme.danger,
        fontWeight: 'bold',
        fontSize: 13,
    },
    statusBadgeGrace: {
        alignSelf: 'flex-start',
        backgroundColor: `${theme.warning}20`,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 5,
        marginTop: 8,
    },
    statusBadgeTextGrace: {
        color: theme.warning,
        fontWeight: 'bold',
        fontSize: 13,
    },
    statusBadgePaid: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 8,
    },
    statusBadgeTextPaid: {
        fontSize: 16,
        color: theme.success,
        fontWeight: '500',
    },
    payNowButton: {
        backgroundColor: theme.primary,
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 20,
    },
    payNowButtonText: {
        color: theme.textOnPrimary,
        fontWeight: 'bold',
        fontSize: 16,
    },
    section: { marginBottom: 20 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: theme.text, marginBottom: 15 },
    historyCard: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: theme.surface, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: theme.border },
    cardIconContainer: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    cardContent: { flex: 1 }, 
    cardTitle: { fontWeight: '600', fontSize: 15, color: theme.text, flexShrink: 1, marginRight: 8 }, 
    cardDetail: { fontSize: 14, color: theme.textSecondary, marginTop: 4 }, 
    cardDate: { fontSize: 13, color: theme.textSecondary, marginTop: 4 }, 
    receiptButton: { alignSelf: 'center', marginLeft: 10 },
    receiptButtonText: { color: theme.primary, fontWeight: 'bold', fontSize: 13 },
    noHistoryText: { color: theme.textSecondary, textAlign: 'center', fontStyle: 'italic', paddingVertical: 20 },
    emptyStateContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30, backgroundColor: theme.background },
    statusIllustration: { width: 200, height: 200, resizeMode: 'contain', marginBottom: 30 },
    emptyStateTitle: { fontSize: 24, fontWeight: 'bold', color: theme.text, textAlign: 'center' },
    emptyStateText: { fontSize: 16, color: theme.textSecondary, textAlign: 'center', marginTop: 12, lineHeight: 24, marginBottom: 30 },
    primaryButton: { backgroundColor: theme.primary, paddingVertical: 14, paddingHorizontal: 30, borderRadius: 12, alignItems: 'center', width: '100%', maxWidth: 300 },
    buttonText: { color: theme.textOnPrimary, fontSize: 16, fontWeight: 'bold' },
    reasonBox: { width: '100%', backgroundColor: `${theme.danger}1A`, borderRadius: 12, padding: 15, borderLeftWidth: 4, borderLeftColor: theme.danger, marginBottom: 20 },
    reasonTitle: { fontSize: 14, fontWeight: 'bold', color: theme.danger, marginBottom: 5 },
    reasonText: { fontSize: 15, color: theme.text },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 }, 
    modalContent: { width: '100%', backgroundColor: theme.surface, borderRadius: 15, padding: 20, alignItems: 'flex-start' }, 
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: theme.text, marginBottom: 20, width: '100%', textAlign: 'center' }, 
    modalDetailRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingVertical: 8 }, 
    modalDetailLabel: { fontSize: 16, color: theme.textSecondary }, 
    modalDetailValue: { fontSize: 16, color: theme.text }, 
    modalSeparator: { height: 1, backgroundColor: theme.border, width: '100%', marginVertical: 15 },
    statusContainer: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 30, },
    statusTitle: { fontSize: 24, fontWeight: 'bold', color: theme.text, textAlign: 'center', marginBottom: 12, },
    statusText: { fontSize: 16, color: theme.textSecondary, textAlign: 'center', lineHeight: 24, },
    statusButtonContainer: { marginTop: 30, width: '100%', maxWidth: 320, alignItems: 'center', },
});