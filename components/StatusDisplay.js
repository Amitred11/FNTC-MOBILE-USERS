// components/StatusDisplay.js
import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import { useTheme } from '../contexts/ThemeContext';

// This is the full component, now in its own file.
const StatusDisplay = ({ illustration, title, text, buttonText, onButtonPress }) => {
    const { theme } = useTheme();
    const styles = getStyles(theme);

    return (
        <View style={styles.container}>
            <Animatable.Image 
                animation="fadeInUp"
                duration={600} 
                delay={100}
                source={illustration} 
                style={styles.illustration} 
            />
            <Animatable.View animation="fadeInUp" duration={600} delay={200}>
                <Text style={styles.title}>{title}</Text>
            </Animatable.View>
            <Animatable.View animation="fadeInUp" duration={600} delay={300}>
                <Text style={styles.text}>{text}</Text>
            </Animatable.View>
            
            {buttonText && onButtonPress && (
                <Animatable.View animation="fadeInUp" duration={600} delay={400} style={{width: '100%'}}>
                    <TouchableOpacity style={styles.button} onPress={onButtonPress}>
                        <Text style={styles.buttonText}>{buttonText}</Text>
                    </TouchableOpacity>
                </Animatable.View>
            )}
        </View>
    );
};

const getStyles = (theme) => StyleSheet.create({
    container: { 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        padding: 30, 
        backgroundColor: theme.background 
    },
    illustration: {
        width: 200,
        height: 200,
        resizeMode: 'contain',
        marginBottom: 30,
    },
    title: { 
        fontSize: 22, 
        fontWeight: 'bold', 
        color: theme.text, 
        textAlign: 'center',
        marginBottom: 12,
    }, 
    text: { 
        fontSize: 16, 
        color: theme.textSecondary, 
        textAlign: 'center', 
        lineHeight: 24,
        marginBottom: 30,
    },
    button: { 
        backgroundColor: theme.primary, 
        paddingVertical: 14,
        paddingHorizontal: 30, 
        borderRadius: 12, 
        alignItems: 'center',
        width: '100%',
        maxWidth: 300,
    },
    buttonText: { 
        color: theme.textOnPrimary, 
        fontSize: 16, 
        fontWeight: 'bold' 
    },
});

export default StatusDisplay;