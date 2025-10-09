//components/InvoiceDetailModal
import React, { useMemo } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Animatable from 'react-native-animatable';
import { useTheme, useAuth, useAlert } from '../../../contexts';
import { generateInvoiceHtml, handlePrintAndShare } from '../../../utils/print';

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

const InvoiceDetailModal = React.memo(({ isVisible, onClose, invoiceData }) => {
    const { theme } = useTheme();
    const { user } = useAuth();
    const { showAlert } = useAlert();
    const styles = useMemo(() => getStyles(theme), [theme]);

    if (!invoiceData) return null;

    const {
        invoiceNumber,
        billingPeriodStart,
        billingPeriodEnd,
        date,
        dueDate,
        lineItems = [],
        amount,
        planName,
        previousBalance,
        paymentsMade,
        adjustments,
    } = invoiceData;

    const formattedBillingPeriod = (billingPeriodStart && billingPeriodEnd)
        ? `${formatDate(billingPeriodStart)} - ${formatDate(billingPeriodEnd)}`
        : 'N/A';

    const handleShareInvoice = async () => {
        try {
            const htmlContent = generateInvoiceHtml(invoiceData, user, theme);
            await handlePrintAndShare(htmlContent, `Invoice_${invoiceNumber || 'Bill'}`, (error) => {
                 showAlert('Print/Share Failed', 'Could not prepare the invoice for printing/sharing. Please try again.');
            });
        } catch (error) {
            console.error("Error sharing invoice:", error);
            showAlert('Print/Share Failed', 'An unexpected error occurred while preparing the invoice.');
        }
    };

    return (
        <Modal animationType="fade" transparent={true} visible={isVisible} onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <Animatable.View animation="zoomIn" duration={300} style={styles.modalContent}>
                    <ScrollView contentContainerStyle={styles.scrollContent}>
                        <Ionicons name="document-text" size={36} color={theme.primary} style={styles.modalIcon} />
                        <Text style={styles.modalTitle}>Invoice Details</Text>

                        <View style={styles.section}>
                            <Text style={styles.sectionHeader}>Invoice Summary</Text>
                            <View style={styles.modalDetailRow}><Text style={styles.modalDetailLabel}>Invoice No:</Text><Text style={styles.modalDetailValueBold}>#{invoiceNumber || 'N/A'}</Text></View>
                            <View style={styles.modalDetailRow}><Text style={styles.modalDetailLabel}>Invoice Date:</Text><Text style={styles.modalDetailValue}>{formatDate(date)}</Text></View>
                            <View style={styles.modalDetailRow}><Text style={styles.modalDetailLabel}>Billing Period:</Text><Text style={styles.modalDetailValue}>{formattedBillingPeriod}</Text></View>
                            <View style={styles.modalDetailRow}><Text style={styles.modalDetailLabel}>Due Date:</Text><Text style={[styles.modalDetailValue, { color: dueDate && new Date(dueDate) < new Date() ? theme.danger : theme.text }]}>{formatDate(dueDate)}</Text></View>
                            <View style={styles.modalDetailRow}><Text style={styles.modalDetailLabel}>Plan:</Text><Text style={styles.modalDetailValue}>{planName}</Text></View>
                        </View>

                        {lineItems.length > 0 && (
                            <View style={styles.section}>
                                <Text style={styles.sectionHeader}>Charges</Text>
                                {lineItems.map((item, index) => (
                                    <View key={index} style={styles.modalDetailRow}>
                                        <Text style={styles.modalDetailLabel}>{item.description}</Text>
                                        <Text style={styles.modalDetailValue}>₱{item.amount?.toFixed(2)}</Text>
                                    </View>
                                ))}
                            </View>
                        )}
                        
                        {/* Optional: Add more financial breakdown if available */}
                        {(typeof previousBalance === 'number' || typeof paymentsMade === 'number' || typeof adjustments === 'number') && (
                            <View style={styles.section}>
                                <Text style={styles.sectionHeader}>Account Activity</Text>
                                {typeof previousBalance === 'number' && <View style={styles.modalDetailRow}><Text style={styles.modalDetailLabel}>Previous Balance:</Text><Text style={styles.modalDetailValue}>₱{previousBalance.toFixed(2)}</Text></View>}
                                {typeof paymentsMade === 'number' && <View style={styles.modalDetailRow}><Text style={styles.modalDetailLabel}>Payments:</Text><Text style={[styles.modalDetailValue, { color: theme.success }]}>- ₱{paymentsMade.toFixed(2)}</Text></View>}
                                {typeof adjustments === 'number' && <View style={styles.modalDetailRow}><Text style={styles.modalDetailLabel}>Adjustments:</Text><Text style={styles.modalDetailValue}>₱{adjustments.toFixed(2)}</Text></View>}
                            </View>
                        )}

                        <View style={styles.finalAmountRow}>
                            <Text style={styles.finalAmountLabel}>TOTAL AMOUNT DUE</Text>
                            <Text style={[styles.finalAmountValue, { color: theme.primary }]}>₱{amount?.toFixed(2) || '0.00'}</Text>
                        </View>
                    </ScrollView>

                    <TouchableOpacity style={[styles.modalActionButton, { backgroundColor: theme.primary, marginTop: 20 }]} onPress={handleShareInvoice}>
                        <Ionicons name="share-outline" size={20} color={theme.textOnPrimary} style={{ marginRight: 8 }} />
                        <Text style={styles.modalActionButtonText}>Share / Print Invoice</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.modalActionButton, { backgroundColor: theme.background, borderColor: theme.border, borderWidth: 1, marginTop: 10 }]} onPress={onClose}>
                         <Text style={[styles.modalActionButtonText, { color: theme.text }]}>CLOSE</Text>
                    </TouchableOpacity>
                </Animatable.View>
            </View>
        </Modal>
    );
});

const getStyles = (theme) =>
  StyleSheet.create({
    modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
    modalContent: {
        width: '90%',
        maxWidth: 450,
        maxHeight: '85%',
        backgroundColor: theme.surface,
        borderRadius: 20,
        padding: 25,
        alignItems: 'center',
    },
    scrollContent: {
        width: '100%',
        paddingBottom: 10, // For spacing above buttons
    },
    modalIcon: { marginBottom: 15 },
    modalTitle: { fontSize: 24, fontWeight: 'bold', color: theme.text, marginBottom: 25, textAlign: 'center' },
    
    section: {
        width: '100%',
        marginBottom: 20,
        paddingBottom: 15,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: theme.border,
    },
    sectionHeader: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.text,
        marginBottom: 10,
        borderBottomWidth: 2,
        borderBottomColor: theme.primary,
        alignSelf: 'flex-start',
        paddingBottom: 5,
    },
    modalDetailRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingVertical: 5 },
    modalDetailLabel: { color: theme.textSecondary, fontSize: 13 },
    modalDetailValue: { color: theme.text, fontSize: 13, textAlign: 'right', flexShrink: 1 },
    modalDetailValueBold: { color: theme.text, fontSize: 15, fontWeight: 'bold', textAlign: 'right', flexShrink: 1 },

    finalAmountRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginTop: 15,
        paddingTop: 15,
        borderTopWidth: 1,
        borderTopColor: theme.border,
    },
    finalAmountLabel: {
        fontSize: 15,
        fontWeight: 'bold',
        color: theme.text,
    },
    finalAmountValue: {
        fontSize: 15,
        fontWeight: 'bold',
    },
    modalActionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        paddingVertical: 14,
        borderRadius: 16,
    },
    modalActionButtonText: {
        color: theme.textOnPrimary,
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default InvoiceDetailModal;