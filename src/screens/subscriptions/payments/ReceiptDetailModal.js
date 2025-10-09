//components/ReceiptDetailModal
import React, { useMemo } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Animatable from 'react-native-animatable';
import { handlePrintAndShare } from '../../../utils/print';
import { useAuth, useAlert, useTheme } from '../../../contexts';

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

const ReceiptDetailModal = React.memo(({ isVisible, onClose, receiptData }) => {
    const { theme } = useTheme();
    const { user } = useAuth();
    const { showAlert } = useAlert();
    const styles = useMemo(() => getStyles(theme), [theme]);

    if (!receiptData) return null;

    const handleShareReceipt = async () => {
        try {
            const formattedPaymentDate = formatDate(receiptData.date, true);
            const totalAmount = receiptData.amount?.toFixed(2) || '0.00';

            const htmlContent = `
                <html>
                    <head>
                        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
                        <title>Payment Receipt #${receiptData.receiptNumber}</title>
                        <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap" rel="stylesheet">
                        <style>
                            body {
                                font-family: 'Roboto', 'Helvetica Neue', Arial, sans-serif;
                                margin: 0;
                                background-color: #f4f7fc;
                                color: #333;
                                display: flex;
                                justify-content: center;
                                align-items: center;
                                padding: 20px;
                                -webkit-print-color-adjust: exact;
                            }
                            .receipt-container {
                                max-width: 450px;
                                width: 100%;
                                background-color: #ffffff;
                                border-radius: 15px;
                                box-shadow: 0 8px 25px rgba(0,0,0,0.1);
                                overflow: hidden;
                            }
                            .header {
                                background-color: #2c3e50;
                                color: #ffffff;
                                padding: 25px;
                                text-align: center;
                            }
                            .header h1 {
                                margin: 0;
                                font-size: 24px;
                                text-transform: uppercase;
                                letter-spacing: 1px;
                            }
                            .header p {
                                margin: 5px 0 0;
                                font-size: 14px;
                                color: #bdc3c7;
                            }
                            .receipt-body {
                                padding: 25px;
                            }
                            .success-section {
                                text-align: center;
                                margin-bottom: 25px;
                            }
                            .success-icon {
                                width: 50px;
                                height: 50px;
                                border-radius: 50%;
                                background-color: #2ecc71;
                                display: inline-flex;
                                justify-content: center;
                                align-items: center;
                                margin-bottom: 10px;
                            }
                            .success-icon::after {
                                content: '';
                                display: block;
                                width: 12px;
                                height: 24px;
                                border: solid #fff;
                                border-width: 0 5px 5px 0;
                                transform: rotate(45deg);
                            }
                            .success-section h2 {
                                font-size: 18px;
                                color: #2c3e50;
                                margin: 0;
                            }
                            .details-section {
                                display: flex;
                                justify-content: space-between;
                                margin-bottom: 12px;
                                font-size: 14px;
                            }
                            .label { color: #7f8c8d; }
                            .value { font-weight: 700; text-align: right; }
                            .separator {
                                border: none;
                                border-top: 1px dashed #cccccc;
                                margin: 20px 0;
                            }
                            .total-section {
                                display: flex;
                                justify-content: space-between;
                                align-items: center;
                                background-color: #2ecc71;
                                color: #ffffff;
                                padding: 15px;
                                border-radius: 10px;
                                margin-top: 10px;
                            }
                            .total-label {
                                font-size: 16px;
                                font-weight: 700;
                                text-transform: uppercase;
                            }
                            .total-value {
                                font-size: 22px;
                                font-weight: 700;
                            }
                            .footer {
                                text-align: center;
                                margin-top: 25px;
                                font-size: 12px;
                                color: #95a5a6;
                            }
                        </style>
                    </head>
                    <body>
                        <div class="receipt-container">
                            <div class="header">
                                <h1>Payment Receipt</h1>
                                <p>FiBear Network Technologies Corp.</p>
                            </div>
                            <div class="receipt-body">
                                <div class="success-section">
                                    <div class="success-icon"></div>
                                    <h2>Payment Confirmed</h2>
                                </div>
                                <div class="details-section">
                                    <span class="label">Receipt No:</span>
                                    <span class="value">${receiptData.receiptNumber || 'N/A'}</span>
                                </div>
                                <div class="details-section">
                                    <span class="label">Payment Date:</span>
                                    <span class="value">${formattedPaymentDate}</span>
                                </div>
                                <div class="details-section">
                                    <span class="label">Customer:</span>
                                    <span class="value">${user?.displayName || 'N/A'}</span>
                                </div>
                                <hr class="separator" />
                                <div class="details-section">
                                    <span class="label">Service/Plan:</span>
                                    <span class="value">${receiptData.planName || 'N/A'}</span>
                                </div>
                                <div class="total-section">
                                    <span class="total-label">Amount Paid</span>
                                    <span class="total-value">₱${totalAmount}</span>
                                </div>
                                <div class="footer">
                                    Thank you for your payment!
                                </div>
                            </div>
                        </div>
                    </body>
                </html>
            `;

            await handlePrintAndShare(htmlContent, `Receipt_${receiptData.receiptNumber || 'Payment'}`, (error) => {
                 showAlert('Print/Share Failed', 'Could not prepare the receipt. Please try again.');
            });
        } catch (error) {
            console.error("Error sharing receipt:", error);
            showAlert('Print/Share Failed', 'An unexpected error occurred while preparing the receipt.');
        }
    };


    return (
        <Modal animationType="fade" transparent={true} visible={isVisible} onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <Animatable.View animation="zoomIn" duration={300} style={styles.modalContent}>
                    <Ionicons name="receipt" size={32} color={theme.primary} style={styles.modalIcon} />
                    <Text style={styles.modalTitle}>Payment Receipt</Text>
                    <View style={styles.modalDetailRow}><Text style={styles.modalDetailLabel}>Receipt No:</Text><Text style={styles.modalDetailValueBold}>{receiptData.receiptNumber}</Text></View>
                    <View style={styles.modalDetailRow}><Text style={styles.modalDetailLabel}>Payment Date:</Text><Text style={styles.modalDetailValue}>{formatDate(receiptData.date, true)}</Text></View>
                    <View style={styles.modalSeparator} />
                    <View style={styles.modalDetailRow}><Text style={styles.modalDetailLabel}>Plan:</Text><Text style={styles.modalDetailValue}>{receiptData.planName}</Text></View>
                    <View style={styles.modalDetailRow}><Text style={styles.modalDetailLabel}>Amount Paid:</Text><Text style={[styles.modalDetailValueBold, { color: theme.primary }]}>₱{receiptData.amount?.toFixed(2)}</Text></View>
                    
                    <TouchableOpacity style={[styles.modalActionButton, { backgroundColor: theme.primary, marginTop: 20 }]} onPress={handleShareReceipt}>
                        <Ionicons name="share-outline" size={20} color={theme.textOnPrimary} style={{ marginRight: 8 }} />
                        <Text style={styles.modalActionButtonText}>Share / Print Receipt</Text>
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
    modalContent: { width: '90%', maxWidth: 400, backgroundColor: theme.surface, borderRadius: 20, padding: 25, alignItems: 'center' },
    modalIcon: { marginBottom: 15 },
    modalTitle: { fontSize: 22, fontWeight: 'bold', color: theme.text, marginBottom: 25 },
    modalDetailRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingVertical: 10 },
    modalDetailLabel: { color: theme.textSecondary, fontSize: 13 },
    modalDetailValue: { color: theme.text, fontSize: 12 },
    modalDetailValueBold: { color: theme.text, fontSize: 13, fontWeight: 'bold' },
    modalSeparator: { height: 1, backgroundColor: theme.border, width: '100%', marginVertical: 10 },
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

export default ReceiptDetailModal;