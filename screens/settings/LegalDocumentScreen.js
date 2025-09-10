// screens/LegalDocumentScreen.js (REFURBISHED)

import React, { useEffect, useMemo, useCallback, Fragment } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Platform } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../../contexts';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Animatable from 'react-native-animatable';

// --- Sub-Components (Memoized for Performance) ---

const Footer = React.memo(({ onAgreePress }) => {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    return (
        <View style={styles.footer}>
            <TouchableOpacity style={styles.agreeButton} onPress={onAgreePress}>
                <Text style={styles.agreeButtonText}>I Understand and Agree</Text>
            </TouchableOpacity>
        </View>
    );
});


// --- NEW Markdown-Style Content Parser ---
const ParsedContent = React.memo(({ text }) => {
    const { theme } = useTheme();
    const styles = getStyles(theme);

    const contentElements = useMemo(() => {
        if (!text) return [];

        const lines = text.split('\n');

        return lines.map((line, index) => {
            const trimmedLine = line.trim();
            
            // Render H2 style for lines starting with '##'
            if (trimmedLine.startsWith('## ')) {
                return (
                    <Animatable.View key={index} animation="fadeInUp" delay={index * 20} duration={300}>
                        <Text style={styles.heading2}>{trimmedLine.substring(3)}</Text>
                    </Animatable.View>
                );
            }
            // Render H3 style for lines starting with '###'
            if (trimmedLine.startsWith('### ')) {
                 return (
                    <Animatable.View key={index} animation="fadeInUp" delay={index * 20} duration={300}>
                        <Text style={styles.heading3}>{trimmedLine.substring(4)}</Text>
                    </Animatable.View>
                );
            }
            // Render a spacer for empty lines to create paragraph breaks
            if (trimmedLine === '') {
                return <View key={index} style={styles.spacer} />;
            }
            // Render a standard paragraph
            return (
                <Animatable.View key={index} animation="fadeInUp" delay={index * 20} duration={300}>
                    <Text style={styles.paragraph}>{trimmedLine}</Text>
                </Animatable.View>
            );
        });
    }, [text, styles]);

    return <Fragment>{contentElements}</Fragment>;
});


// --- Main Screen Component ---
export default function LegalDocumentScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { theme } = useTheme();
  const styles = getStyles(theme);

  const { title, content } = route.params;

  // Configure the header using React Navigation's options
  useEffect(() => {
    navigation.setOptions({
        headerShown: true,
        headerTransparent: true, // Make header background transparent
        headerTitle: '', // Hide the title text in the header bar
        headerLeft: () => (
             <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
                <Ionicons name="close-circle" size={32} color={theme.textSecondary} />
            </TouchableOpacity>
        ),
    });
  }, [navigation, theme]);

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <Animatable.View animation="fadeInDown" duration={500} style={styles.documentHeader}>
            <Ionicons name="shield-checkmark-outline" size={48} color={theme.primary} style={styles.documentIcon} />
            <Text style={styles.documentTitle}>{title}</Text>
        </Animatable.View>
        
        <View style={styles.divider} />

        <ParsedContent text={content} />
      </ScrollView>

      <Footer onAgreePress={handleGoBack} />
    </SafeAreaView>
  );
}

const getStyles = (theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    backButton: { 
        marginLeft: 15,
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        borderRadius: 16,
    },
    scrollContent: { 
        paddingHorizontal: 25,
        paddingTop: 80, 
        paddingBottom: 40,
    },
    documentHeader: {
        alignItems: 'center',
        marginBottom: 25,
    },
    documentIcon: {
        marginBottom: 15,
    },
    documentTitle: {
      fontSize: 28,
      fontWeight: '700',
      color: theme.text,
      textAlign: 'center',
    },
    divider: {
        height: 1,
        backgroundColor: theme.border,
        marginVertical: 15,
    },
    heading2: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 12,
      marginTop: 10,
      lineHeight: 28,
    },
    heading3: {
      fontSize: 17,
      fontWeight: '600',
      color: theme.textSecondary,
      marginBottom: 8,
      marginTop: 8,
    },
    paragraph: {
      fontSize: 16,
      color: theme.textSecondary,
      lineHeight: 26,
      textAlign: 'left',
    },
    spacer: {
        height: 15,
    },
    footer: {
      paddingHorizontal: 20,
      paddingTop: 15,
      paddingBottom: Platform.OS === 'ios' ? 34 : 20,
      backgroundColor: theme.surface,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 5,
    },
    agreeButton: {
      backgroundColor: theme.primary,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
    },
    agreeButtonText: {
      color: theme.textOnPrimary,
      fontSize: 16,
      fontWeight: 'bold',
    },
  });