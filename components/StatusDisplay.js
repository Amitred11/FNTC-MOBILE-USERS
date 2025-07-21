// components/StatusDisplay.js
import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import * as Animatable from 'react-native-animatable';
import Ionicons from '@expo/vector-icons/Ionicons'; // <--- Import Ionicons
import { useTheme } from '../contexts/ThemeContext';

// This is the full component, now in its own file.
// Modified to accept 'icon' and 'color' props alongside 'illustration'
const StatusDisplay = ({ illustration, icon, color, title, text, buttonText, action }) => { // <--- Added icon, color, changed onButtonPress to action for consistency
  const { theme } = useTheme();
  const styles = getStyles(theme);

  return (
    <View style={styles.container}>
      {/* Conditionally render Illustration OR Icon */}
      {illustration ? (
        <Animatable.Image
          animation="fadeInUp"
          duration={600}
          delay={100}
          source={illustration}
          style={styles.illustration}
        />
      ) : icon ? ( // <--- Render Ionicons if 'icon' prop is provided
        <Animatable.View
          animation="fadeInUp"
          duration={600}
          delay={100}
          style={styles.iconContainer} // Add a style for the icon wrapper
        >
          <Ionicons
            name={icon}
            size={80} // <--- Set a good size for the icon (e.g., 60-80)
            color={color || theme.textSecondary} // Use provided color or a default
          />
        </Animatable.View>
      ) : null} {/* If neither, render nothing for the visual */}

      <Animatable.View animation="fadeInUp" duration={600} delay={200}>
        <Text style={styles.title}>{title}</Text>
      </Animatable.View>
      <Animatable.View animation="fadeInUp" duration={600} delay={300}>
        <Text style={styles.text}>{text}</Text>
      </Animatable.View>

      {buttonText && action && ( // <--- Changed onButtonPress to action for consistency with your PayBillsScreen
        <Animatable.View animation="fadeInUp" duration={600} delay={400} style={styles.buttonWrapper}> {/* Added a wrapper for button positioning */}
          <TouchableOpacity style={styles.button} onPress={action}>
            <Text style={styles.buttonText}>{buttonText}</Text>
          </TouchableOpacity>
        </Animatable.View>
      )}
    </View>
  );
};

const getStyles = (theme) =>
  StyleSheet.create({
    container: {
      alignItems: 'center',
      backgroundColor: theme.background,
      flex: 1, // Ensure it fills the space for centering
      justifyContent: 'center',
      padding: 30,
    },
    // Style for the illustration
    illustration: {
      height: 200,
      width: 200,
      resizeMode: 'contain',
      marginBottom: 30,
    },
    // Style for the Ionicons container
    iconContainer: {
        marginBottom: 30, // Consistent spacing with illustration
        alignItems: 'center',
        justifyContent: 'center',
        // Optional: Add a circular background for the icon
        // backgroundColor: `${theme.primary}10`,
        // borderRadius: 50, // Half of size + padding * 2
        // padding: 10,
    },
    title: {
      color: theme.text,
      fontSize: 22,
      fontWeight: 'bold',
      marginBottom: 12,
      textAlign: 'center',
    },
    text: {
      color: theme.textSecondary,
      fontSize: 16,
      lineHeight: 24,
      marginBottom: 30, // Consistent spacing
      textAlign: 'center',
      paddingHorizontal: 10, // Added padding for better readability on long texts
    },
    buttonWrapper: { // Wrapper to center the button
      width: '100%',
      alignItems: 'center',
    },
    button: {
      alignItems: 'center',
      backgroundColor: theme.primary,
      borderRadius: 12,
      paddingHorizontal: 30,
      paddingVertical: 14,
      width: 'auto', // Allow button to size based on content, but max 300
      minWidth: 180, // Ensure a minimum width
      maxWidth: 300,
    },
    buttonText: {
      color: theme.textOnPrimary,
      fontSize: 16,
      fontWeight: 'bold',
    },
  });

export default StatusDisplay;