// contexts/AlertContext.js
import React, { createContext, useState, useContext, useCallback } from 'react';
import CustomAlert from '../components/CustomAlert';

const AlertContext = createContext();

export const useAlert = () => useContext(AlertContext);

export const AlertProvider = ({ children }) => {
    const [alertState, setAlertState] = useState({
        visible: false,
        title: '',
        message: '',
        buttons: [],
    });

    const showAlert = useCallback((title, message, buttons = [{ text: 'OK' }]) => {
    setAlertState({
        visible: true,
        title,
        message,
        buttons: buttons.map(button => ({
            ...button,
            onPress: () => {
                setAlertState(prev => ({ ...prev, visible: false })); // Hide alert first
                if (button.onPress) {
                    button.onPress();
                }
            },
        })),
    });
}, []);

    const hideAlert = () => {
        setAlertState(prev => ({ ...prev, visible: false }));
    };

    return (
        <AlertContext.Provider value={{ showAlert }}>
            {children}
            <CustomAlert
                visible={alertState.visible}
                title={alertState.title}
                message={alertState.message}
                buttons={alertState.buttons}
                onClose={hideAlert}
            />
        </AlertContext.Provider>
    );
};