import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import Ionicons from '@expo/vector-icons/Ionicons';

const CustomAlert = ({ visible, title, message, buttons, onClose }) => {
  const { theme } = useTheme();
  const styles = getStyles(theme);

  const { name, color } = useMemo(() => {
    const lowerTitle = String(title || '').toLowerCase(); 
    if (lowerTitle.includes('success')) return { name: 'checkmark-circle', color: theme.success };
    if (lowerTitle.includes('error') || lowerTitle.includes('failed'))
      return { name: 'close-circle', color: theme.danger };
    if (lowerTitle.includes('warning') || lowerTitle.includes('are you sure'))
      return { name: 'alert-circle', color: theme.warning };
    return { name: 'information-circle', color: theme.primary };
  }, [title, theme]);

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose} 
    >
      <View style={styles.overlay}>
        <View style={styles.alertBox}>
          <Ionicons name={name} size={50} color={color} style={styles.icon} />

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.buttonContainer}>
            {buttons &&
              buttons.map((button, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.button,
                    button.style === 'destructive'
                      ? styles.destructiveButton
                      : button.style === 'cancel'
                        ? styles.cancelButton
                        : styles.defaultButton,
                    buttons.length > 1 && { flex: 1 },
                  ]}
                  onPress={button.onPress}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      button.style === 'destructive'
                        ? styles.destructiveButtonText
                        : button.style === 'cancel'
                          ? styles.cancelButtonText
                          : styles.defaultButtonText,
                    ]}
                  >
                    {button.text.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const getStyles = (theme) =>
  StyleSheet.create({
    alertBox: {
      alignItems: 'center',
      backgroundColor: theme.surface,
      borderRadius: 15,
      elevation: 10,
      maxWidth: 340,
      padding: 25,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      width: '100%',
    },
    button: {
      alignItems: 'center',
      borderRadius: 8,
      justifyContent: 'center',
      paddingHorizontal: 20,
      paddingVertical: 12,
    },
    buttonContainer: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 10,
      justifyContent: 'center',
      width: '100%',
    },
    buttonText: {
      fontWeight: 'bold',
      fontSize: 14,
      textAlign: 'center',
    },
    cancelButton: {
      backgroundColor: 'transparent',
      borderColor: theme.border,
      borderWidth: 1,
    },
    cancelButtonText: {
      color: theme.text,
    },
    defaultButton: {
      backgroundColor: theme.primary,
    },
    defaultButtonText: {
      color: theme.textOnPrimary,
    },
    destructiveButton: {
      backgroundColor: theme.danger,
    },
    destructiveButtonText: {
      color: theme.textOnPrimary,
    },
    icon: {
      marginBottom: 15,
    },
    message: {
      color: theme.textSecondary,
      fontSize: 16,
      lineHeight: 24,
      marginBottom: 25,
      textAlign: 'center',
    },
    overlay: {
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      flex: 1,
      justifyContent: 'center',
      padding: 20,
    },
    title: {
      color: theme.text,
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 8,
      textAlign: 'center',
    },
  });

export default CustomAlert;