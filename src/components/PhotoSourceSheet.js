import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';
import * as Animatable from 'react-native-animatable';

// --- THE FIX: Add `title` to the props, with a default value ---
const PhotoSourceSheet = ({ 
  isVisible, 
  onChooseCamera, 
  onChooseGallery, 
  onClose, 
  title = "Select Photo Source" // Default title
}) => {
  const { theme } = useTheme();
  const styles = getStyles(theme);

  return (
    <Modal animationType="fade" transparent={true} visible={isVisible} onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <Animatable.View animation="slideInUp" duration={300} style={styles.container}>
          <View style={styles.header}>
            {/* --- THE FIX: Use the `title` prop here --- */}
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* ... rest of the component is unchanged ... */}
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
        </Animatable.View>
      </TouchableOpacity>
    </Modal>
  );
};

const getStyles = (theme) =>
  StyleSheet.create({
    cancelOption: {
      alignItems: 'center',
      marginTop: 10,
      paddingVertical: 15,
      width: '100%', // Space above the cancel button
    },
    cancelText: {
      color: theme.textSecondary,
      fontSize: 16,
      fontWeight: '600',
    },
    closeButton: {
      padding: 5, // Make the touchable area larger
    },
    container: {
      backgroundColor: theme.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: 20,
      paddingBottom: 0, // Compensate for iOS safe area
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -5 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 15, // Android shadow
    },
    header: {
      alignItems: 'center',
      borderBottomColor: theme.border,
      borderBottomWidth: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 15,
      width: '100%',
    },
    option: {
      alignItems: 'center',
      borderBottomColor: theme.border,
      borderBottomWidth: 1,
      flexDirection: 'row',
      paddingVertical: 15,
      width: '100%',
    },
    optionIcon: {
      marginRight: 15,
    },
    optionText: {
      color: theme.text,
      fontSize: 16,
      fontWeight: '500',
    },
    overlay: {
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      flex: 1,
      justifyContent: 'flex-end', // Aligns the modal content to the bottom
    },
    title: {
      color: theme.text,
      fontSize: 18,
      fontWeight: 'bold',
    },
  });

export default PhotoSourceSheet;
