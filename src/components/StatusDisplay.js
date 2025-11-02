// components/StatusDisplay.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as Animatable from 'react-native-animatable';
import Ionicons from '@expo/vector-icons/Ionicons'; 
import { useTheme } from '../contexts/ThemeContext';

const StatusDisplay = ({ illustration, icon, color, title, text, buttonText, action }) => {
  const { theme } = useTheme();
  const styles = getStyles(theme);

  return (
    <View style={styles.container}>
      {illustration ? (
        <Animatable.Image
          animation="fadeInUp"
          duration={600}
          delay={100}
          source={illustration}
          style={styles.illustration}
        />
      ) : icon ? (
        <Animatable.View
          animation="fadeInUp"
          duration={600}
          delay={100}
          style={styles.iconContainer}
        >
          <Ionicons
            name={icon}
            size={80}
            color={color || theme.textSecondary}
          />
        </Animatable.View>
      ) : null}

      <Animatable.View animation="fadeInUp" duration={600} delay={200}>
        <Text style={styles.title}>{title}</Text>
      </Animatable.View>
      <Animatable.View animation="fadeInUp" duration={600} delay={300}>
        <Text style={styles.text}>{text}</Text>
      </Animatable.View>

      {buttonText && action && (
        <Animatable.View animation="fadeInUp" duration={600} delay={400} style={styles.buttonWrapper}>
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
      flex: 1, 
      justifyContent: 'center',
      padding: 30,
    },
    illustration: {
      height: 200,
      width: 200,
      resizeMode: 'contain',
      marginBottom: 30,
    },
    iconContainer: {
        marginBottom: 30, 
        alignItems: 'center',
        justifyContent: 'center',
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
      marginBottom: 30, 
      textAlign: 'center',
      paddingHorizontal: 10,
    },
    buttonWrapper: { 
      width: '100%',
      alignItems: 'center',
    },
    button: {
      alignItems: 'center',
      backgroundColor: theme.primary,
      borderRadius: 12,
      paddingHorizontal: 30,
      paddingVertical: 14,
      width: 'auto', 
      minWidth: 180, 
      maxWidth: 300,
    },
    buttonText: {
      color: theme.textOnPrimary,
      fontSize: 16,
      fontWeight: 'bold',
    },
  });

export default StatusDisplay;