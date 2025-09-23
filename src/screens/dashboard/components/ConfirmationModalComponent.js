import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    TouchableOpacity,
    Modal,
} from 'react-native';
import * as Animatable from 'react-native-animatable';
import { useTheme } from '../../../contexts'; 

const getStyles = (theme) =>
    StyleSheet.create({
        confirmModalOverlay: { flex: 1, backgroundColor: 'rgba(7, 7, 7, 0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
        confirmModalContent: { backgroundColor: theme.background, borderRadius: 20, padding: 25, alignItems: 'center', width: '100%', maxWidth: 350 },
        confirmModalImage: { width: 100, height: 100, resizeMode: 'contain', marginBottom: 20 },
        confirmModalTitle: { fontSize: 22, fontWeight: 'bold', color: theme.primary, marginBottom: 10, textAlign: 'center' },
        confirmModalDescription: { fontSize: 16, color: theme.textSecondary, textAlign: 'center', marginBottom: 30, lineHeight: 24 },
        confirmModalButtonContainer: { flexDirection: 'row', gap: 10 },
        confirmModalCancelButton: { backgroundColor: theme.isDarkMode ? theme.background : '#E9E9E9', borderRadius: 12, paddingVertical: 14, flex: 1, alignItems: 'center' },
        confirmModalCancelText: { color: theme.textBe, fontSize: 16, fontWeight: '600' },
        confirmModalConfirmButton: { backgroundColor: theme.danger, borderRadius: 12, paddingVertical: 14, flex: 1, alignItems: 'center' },
        confirmModalConfirmText: { color: theme.textOnPrimary, fontSize: 16, fontWeight: '600' },
    });

export default function ConfirmationModalComponent({ isVisible, onClose, onConfirm, title, description, confirmText, imageSource }) {
    const { theme } = useTheme(); // Use theme directly in this component
    const styles = getStyles(theme); // Get styles based on theme

    return (
        <Modal animationType="fade" transparent={true} visible={isVisible} onRequestClose={onClose}>
            <View style={styles.confirmModalOverlay}>
                <Animatable.View animation="zoomIn" duration={300} style={styles.confirmModalContent}>
                    <Image source={imageSource} style={styles.confirmModalImage} />
                    <Text style={styles.confirmModalTitle}>{title}</Text>
                    <Text style={styles.confirmModalDescription}>{description}</Text>
                    <View style={styles.confirmModalButtonContainer}>
                        <TouchableOpacity style={styles.confirmModalCancelButton} onPress={onClose}>
                            <Text style={styles.confirmModalCancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.confirmModalConfirmButton, confirmText.includes('Exit') && { backgroundColor: theme.primary }]} onPress={onConfirm}>
                            <Text style={styles.confirmModalConfirmText}>{confirmText}</Text>
                        </TouchableOpacity>
                    </View>
                </Animatable.View>
            </View>
        </Modal>
    );
}