import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext'; // Ensure this path is correct
import * as Animatable from 'react-native-animatable'; // Assuming this is installed

const PhotoSourceSheet = ({ isVisible, onChooseCamera, onChooseGallery, onClose }) => {
    const { theme } = useTheme();
    const styles = getStyles(theme);

    return (
        <Modal
            animationType="fade" 
            transparent={true}
            visible={isVisible}
            onRequestClose={onClose}
        >
            <TouchableOpacity 
                style={styles.overlay} 
                activeOpacity={1} 
                onPress={onClose} 
            >
                <Animatable.View 
                    animationType="fade" 
                    duration={300} 
                    style={styles.container}
                >
                    <View style={styles.header}>
                        <Text style={styles.title}>Upload Proof of Payment</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={28} color={theme.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity style={styles.option} onPress={onChooseCamera}>
                        <Ionicons name="camera-outline" size={24} color={theme.primary} style={styles.optionIcon} />
                        <Text style={styles.optionText}>Take Photo</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.option} onPress={onChooseGallery}>
                        <Ionicons name="image-outline" size={24} color={theme.primary} style={styles.optionIcon} />
                        <Text style={styles.optionText}>Choose from Gallery</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.cancelOption} onPress={onClose}>
                        <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>

                    {/* Add padding for iOS safe area at the very bottom of the modal */}
                    {Platform.OS === 'ios' && <View style={styles.safeAreaPadding} />}
                </Animatable.View>
            </TouchableOpacity>
        </Modal>
    );
};

const getStyles = (theme) => StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'flex-end', // Aligns the modal content to the bottom
    },
    container: {
        backgroundColor: theme.surface,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingHorizontal: 20,
        paddingBottom: Platform.OS === 'ios' ? 20 : 0, // Compensate for iOS safe area
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -5 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 15, // Android shadow
    },
    header: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.text,
    },
    closeButton: {
        padding: 5, // Make the touchable area larger
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
    },
    optionIcon: {
        marginRight: 15,
    },
    optionText: {
        fontSize: 16,
        color: theme.text,
        fontWeight: '500',
    },
    cancelOption: {
        width: '100%',
        paddingVertical: 15,
        alignItems: 'center',
        marginTop: 10, // Space above the cancel button
    },
    cancelText: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.textSecondary,
    },
    safeAreaPadding: {
        height: Platform.OS === 'ios' ? 34 : 0, // Padding for bottom safe area on iOS devices
    },
});

export default PhotoSourceSheet;