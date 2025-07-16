// contexts/MessageContext.js
import React, { createContext, useState, useContext, useCallback, useRef } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Image } from 'react-native';

const MessageContext = createContext();

export const MessageProvider = ({ children }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [message, setMessage] = useState('');
    // Use a ref for the callback to avoid re-renders of the provider
    const onCloseCallbackRef = useRef(null);

    const showMessage = useCallback((msg, onClose) => {
        setMessage(msg);
        // --- FIX: Store the callback directly in the ref ---
        onCloseCallbackRef.current = onClose; 
        setIsVisible(true);
    }, []);

    const handleClose = () => {
        setIsVisible(false);
        if (typeof onCloseCallbackRef.current === 'function') {
            onCloseCallbackRef.current();
        }
        onCloseCallbackRef.current = null; // Clear callback after use
    };

    return (
        <MessageContext.Provider value={{ showMessage }}>
            {children}
            <Modal
                animationType="fade"
                transparent={true}
                visible={isVisible}
                onRequestClose={handleClose}
            >
                <View style={styles.centeredView}>
                    <View style={styles.modalView}>
                        <Image source={require('../assets/images/logo.png')} style={{ width: 85, height: 30, marginBottom: 20 }} />
                        <Text style={styles.modalText}>{message}</Text>
                        <TouchableOpacity
                            style={styles.button}
                            onPress={handleClose}
                        >
                            <Text style={styles.textStyle}>OK</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </MessageContext.Provider>
    );
};

export const useMessage = () => useContext(MessageContext);

const styles = StyleSheet.create({
    centeredView: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalView: {
        margin: 20,
        borderRadius: 20,
        backgroundColor: "white",
        padding: 35,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        width: '80%',
    },
    modalText: {
        marginBottom: 15,
        textAlign: "center",
        fontSize: 16,
        lineHeight: 22,
        color: "#333",
    },
    button: {
        borderRadius: 15,
        paddingVertical: 12,
        paddingHorizontal: 30,
        elevation: 2,
        marginTop: 10,
        backgroundColor: "#52a447", // Example danger color
    },
    textStyle: {
        color: "white",
        fontWeight: "bold",
        textAlign: "center"
    },
});