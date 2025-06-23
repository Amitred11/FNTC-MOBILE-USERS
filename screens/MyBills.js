// screens/AccountDetail.js
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, BackHandler, Modal, ActivityIndicator } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useTheme } from '../contexts/ThemeContext'; // <-- 1. Import useTheme

const formatDate = (dateString, includeTime = false) => {
    if (!dateString) return 'N/A';
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    if (includeTime) {
        options.hour = '2-digit';
        options.minute = '2-digit';
    }
    return new Date(dateString).toLocaleDateString('en-US', options);
};

// --- Reusable History Card Components (Now Theme-Aware) ---
const HistoryBillCard = ({ item, theme }) => {
    const styles = getStyles(theme);
    const isDue = item.status === 'Due';
    return (
        <View style={styles.historyCard}>
            <Ionicons name="receipt-outline" size={24} color={isDue ? theme.warning : theme.accent} style={styles.cardIcon} />
            <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>Bill for {item.planName}</Text>
                    <View style={[ styles.statusTag, { backgroundColor: isDue ? theme.isDarkMode ? '#5d4037' : '#FFF4E5' : theme.isDarkMode ? '#1B5E20' : '#E8F5E9' } ]}>
                        <Text style={[ styles.statusText, { color: isDue ? theme.warning : theme.success } ]}>
                            {item.status}
                        </Text>
                    </View>
                </View>
                <Text style={styles.cardDetail}>Amount: <Text style={{fontWeight: 'bold'}}>₱{item.amount.toFixed(2)}</Text></Text>
                <Text style={styles.cardDate}>{isDue ? `Billed on: ${formatDate(item.statementDate)}` : `Paid on: ${formatDate(item.paymentDate, true)}`}</Text>
            </View>
        </View>
    );
};

const HistoryEventCard = ({ item, onViewReceipt, theme }) => {
    const styles = getStyles(theme);
    const ICONS = {
        subscribed: { name: 'rocket-launch-outline', color: theme.success },
        plan_changed: { name: 'swap-horizontal-bold', color: theme.warning },
        cancelled: { name: 'close-circle-outline', color: theme.danger },
        payment_success: { name: 'check-decagram-outline', color: theme.primary },
    };
    const icon = ICONS[item.type] || { name: 'information-outline', color: theme.textSecondary };
    
    return (
        <View style={styles.historyCard}>
            <MaterialCommunityIcons name={icon.name} size={24} color={icon.color} style={styles.cardIcon} />
            <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{item.details}</Text>
                <Text style={styles.cardDate}>{formatDate(item.date, true)}</Text>
                {item.type === 'payment_success' && (
                    <TouchableOpacity style={styles.receiptButton} onPress={() => onViewReceipt(item)}>
                        <Text style={styles.receiptButtonText}>View Receipt</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

export default function AccountDetail() {
    const navigation = useNavigation();
    const { activePlan, paymentHistory, isLoading } = useSubscription();
    const { theme } = useTheme(); // <-- 2. Get theme from context
    const styles = getStyles(theme); // <-- 3. Get theme-specific styles

    const dueBill = paymentHistory.find(item => item.status === 'Due');
    const [isReceiptModalVisible, setReceiptModalVisible] = useState(false);
    const [selectedReceipt, setSelectedReceipt] = useState(null);
    const [isBillDetailsModalVisible, setBillDetailsModalVisible] = useState(false);

    const handleViewReceipt = (receiptData) => {
        setSelectedReceipt(receiptData);
        setReceiptModalVisible(true);
    };

    useEffect(() => {
        const handleBackPress = () => { navigation.navigate('Home'); return true; };
        const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
        return () => backHandler.remove();
    }, [navigation]);

    if (isLoading) {
        return (
            <View style={styles.container}>
                 <View style={styles.header}><Text style={styles.headerText}>ACCOUNT & BILLING</Text></View>
                 <View style={styles.emptyStateContainer}><ActivityIndicator size="large" color={theme.primary} /><Text style={{marginTop: 10, color: theme.text}}>Loading Details...</Text></View>
            </View>
        );
    }
    
    if (!activePlan && paymentHistory.length === 0) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.navigate('Home')} style={styles.backButton}><Ionicons name="arrow-back" size={28} color={theme.textOnPrimary} /></TouchableOpacity>
                    <Text style={styles.headerText}>ACCOUNT & BILLING</Text>
                </View>
                <View style={styles.emptyStateContainer}>
                    <Ionicons name="document-text-outline" size={80} color={theme.disabled} />
                    <Text style={styles.emptyStateTitle}>No Account History</Text>
                    <Text style={styles.emptyStateText}>Your account activity and bills will appear here once you subscribe.</Text>
                    <TouchableOpacity style={[styles.primaryButton, { width: '80%', marginTop: 20 }]} onPress={() => navigation.navigate('Subscription')}><Text style={styles.buttonText}>SUBSCRIBE NOW</Text></TouchableOpacity>
                </View>
            </View>
        );
    }
    
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.navigate('Home')} style={styles.backButton}><Ionicons name="arrow-back" size={28} color={theme.textOnPrimary} /></TouchableOpacity>
                <Text style={styles.headerText}>ACCOUNT & BILLING</Text>
            </View>

            <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 80 }}>
                <View style={styles.section}>
                    <Text style={styles.label}>CURRENT BILLING</Text>
                    {dueBill ? (
                        <>
                            <Text style={styles.currentBillAmount}>₱{dueBill.amount.toFixed(2)}</Text>
                            <Text style={styles.dueDate}>Due for {dueBill.planName}</Text>
                            <View style={styles.buttonContainer}>
                                <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('PayBills')}><Text style={styles.buttonText}>PAY BILL</Text></TouchableOpacity>
                                <TouchableOpacity style={styles.secondaryButton} onPress={() => setBillDetailsModalVisible(true)}><Text style={styles.secondaryButtonText}>VIEW DETAILS</Text></TouchableOpacity>
                            </View>
                        </>
                    ) : (
                        <>
                            <Text style={styles.currentBillAmount}>₱0.00</Text>
                            <View style={{flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4}}>
                                <Ionicons name="checkmark-circle" size={18} color={theme.success} />
                                <Text style={styles.paidUpText}>You're all paid up!</Text>
                            </View>
                        </>
                    )}
                </View>

                {activePlan && (
                     <View style={styles.section}>
                        <Text style={styles.label}>CURRENT PLAN</Text>
                        <Text style={styles.planText}>{activePlan.name}</Text>
                        <TouchableOpacity style={[styles.secondaryButton, {marginTop: 15, flex: 1}]} onPress={() => navigation.navigate('Subscription')}><Text style={styles.secondaryButtonText}>MANAGE SUBSCRIPTION</Text></TouchableOpacity>
                    </View>
                )}
                
                <View style={styles.section}>
                    <Text style={styles.label}>ACCOUNT HISTORY</Text>
                    {paymentHistory.length > 0 
                        ? paymentHistory.map((item) => {
                            if (item.type === 'bill') {
                                return <HistoryBillCard key={item.id} item={item} theme={theme} />;
                            } else if (item.id && item.details && item.date) {
                                return <HistoryEventCard key={item.id} item={item} onViewReceipt={handleViewReceipt} theme={theme} />;
                            }
                            return null; 
                        }) 
                        : <Text style={{color: theme.textSecondary}}>No history yet.</Text>
                    }
                </View>
            </ScrollView>

            {/* --- MODALS --- */}
            {dueBill && (
            <Modal
                animationType="fade" transparent={true} visible={isBillDetailsModalVisible}
                onRequestClose={() => setBillDetailsModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Billing Details</Text>
                        <View style={styles.modalDetailRow}><Text style={styles.modalDetailLabel}>Plan ({dueBill.planName}):</Text><Text style={styles.modalDetailValue}>₱{dueBill.amount.toFixed(2)}</Text></View>
                        <View style={styles.modalDetailRow}><Text style={styles.modalDetailLabel}>Taxes & Surcharges:</Text><Text style={styles.modalDetailValue}>₱0.00</Text></View>
                        <View style={styles.modalSeparator} />
                        <View style={styles.modalDetailRow}><Text style={[styles.modalDetailLabel, {fontWeight: 'bold'}]}>Total Amount Due:</Text><Text style={[styles.modalDetailValue, {fontWeight: 'bold'}]}>₱{dueBill.amount.toFixed(2)}</Text></View>
                        <TouchableOpacity style={[styles.primaryButton, {marginTop: 20, width: '100%'}]} onPress={() => setBillDetailsModalVisible(false)}><Text style={styles.buttonText}>CLOSE</Text></TouchableOpacity>
                    </View>
                </View>
            </Modal>
            )}

            <Modal
                animationType="fade" transparent={true} visible={isReceiptModalVisible}
                onRequestClose={() => setReceiptModalVisible(false)}
            >
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
                                <View style={styles.modalDetailRow}><Text style={styles.modalDetailLabel}>Amount Paid:</Text><Text style={[styles.modalDetailValue, {fontWeight: 'bold', color: theme.primary}]}>₱{selectedReceipt.amount.toFixed(2)}</Text></View>
                            </>
                        )}
                        <TouchableOpacity style={[styles.primaryButton, {marginTop: 20, width: '100%'}]} onPress={() => setReceiptModalVisible(false)}><Text style={styles.buttonText}>CLOSE</Text></TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// --- 4. Stylesheet is now a function that accepts the theme ---
const getStyles = (theme) => StyleSheet.create({ 
    container: { flex: 1, backgroundColor: theme.background }, 
    header: { backgroundColor: theme.primary, paddingTop: 60, paddingBottom: 20, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }, 
    backButton: { position: 'absolute', left: 16, top: 60, zIndex: 10 }, 
    headerText: { color: theme.textOnPrimary, fontWeight: 'bold', fontSize: 18 }, 
    content: { padding: 16 }, 
    section: { backgroundColor: theme.surface, padding: 16, borderRadius: 12, marginBottom: 16 }, 
    label: { fontWeight: 'bold', fontSize: 14, color: theme.textSecondary, marginBottom: 8, textTransform: 'uppercase' }, 
    currentBillAmount: { fontSize: 36, fontWeight: 'bold', color: theme.text }, 
    dueDate: { fontSize: 14, color: theme.danger, marginBottom: 20, marginTop: 4, fontWeight: '500' }, 
    planText: { fontSize: 22, color: theme.text, fontWeight: 'bold' }, 
    buttonContainer: { flexDirection: 'row', gap: 10, marginTop: 16 }, 
    primaryButton: { backgroundColor: theme.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, alignItems: 'center' }, 
    secondaryButton: { borderColor: theme.primary, borderWidth: 1.5, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, alignItems: 'center' }, 
    buttonText: { color: theme.textOnPrimary, fontWeight: 'bold' }, 
    secondaryButtonText: { color: theme.primary, fontWeight: 'bold' }, 
    historyCard: { flexDirection: 'row', backgroundColor: theme.surface, padding: 12, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: theme.border, alignItems: 'center' }, 
    cardIcon: { marginRight: 12 }, 
    cardContent: { flex: 1 }, 
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, 
    cardTitle: { fontWeight: '600', fontSize: 15, color: theme.text, flexShrink: 1, marginRight: 8 }, 
    cardDetail: { fontSize: 14, color: theme.text, marginTop: 4 }, 
    cardDate: { fontSize: 12, color: theme.textSecondary, marginTop: 4 }, 
    statusTag: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 20 }, 
    statusText: { fontSize: 12, fontWeight: 'bold' }, 
    emptyStateContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, backgroundColor: theme.background }, 
    emptyStateTitle: { fontSize: 22, fontWeight: 'bold', color: theme.text, marginTop: 20 }, 
    emptyStateText: { fontSize: 16, color: theme.textSecondary, textAlign: 'center', marginTop: 10 }, 
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 }, 
    modalContent: { width: '100%', backgroundColor: theme.surface, borderRadius: 15, padding: 20, alignItems: 'flex-start' }, 
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: theme.text, marginBottom: 20, width: '100%', textAlign: 'center' }, 
    modalDetailRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingVertical: 8 }, 
    modalDetailLabel: { fontSize: 16, color: theme.textSecondary }, 
    modalDetailValue: { fontSize: 16, color: theme.text }, 
    modalSeparator: { height: 1, backgroundColor: theme.border, width: '100%', marginVertical: 15 },
    paidUpText: { fontSize: 16, color: theme.success, fontWeight: '500' },
    receiptButton: { marginTop: 10, alignSelf: 'flex-start', backgroundColor: theme.isDarkMode ? theme.background : '#E0F7FA', paddingVertical: 5, paddingHorizontal: 12, borderRadius: 20 },
    receiptButtonText: { color: theme.isDarkMode ? theme.primary : '#00796B', fontWeight: 'bold', fontSize: 12 },
});