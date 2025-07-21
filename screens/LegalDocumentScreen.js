// screens/LegalDocumentScreen.js (Cleaned)

import React, { useEffect, useMemo, useCallback, Fragment } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../contexts';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Animatable from 'react-native-animatable';

// --- Sub-Components (Memoized for Performance) ---

const Header = React.memo(({ title, onBackPress }) => {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    return (
        <View style={styles.header}>
            <TouchableOpacity onPress={onBackPress} style={styles.backButton}>
                <Ionicons name="arrow-back" size={26} color={theme.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{title}</Text>
            <View style={{ width: 40 }} />
        </View>
    );
});

const Footer = React.memo(({ onAgreePress }) => {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    return (
        <View style={styles.footer}>
            <TouchableOpacity style={styles.agreeButton} onPress={onAgreePress}>
                <Text style={styles.agreeButtonText}>I Understand</Text>
            </TouchableOpacity>
        </View>
    );
});


// --- Helper Function ---
const ParsedContent = React.memo(({ text }) => {
    const { theme } = useTheme();
    const styles = getStyles(theme);

    const contentElements = useMemo(() => {
        // Regex to split by a newline followed by a number and a period (e.g., "\n1.")
        const sections = text.split(/\n\n?(?=\d+\.\s)/);

        return sections.map((section, index) => {
            const firstLineBreak = section.indexOf('\n');
            let title = section;
            let body = '';

            if (firstLineBreak !== -1) {
                title = section.substring(0, firstLineBreak).trim();
                body = section.substring(firstLineBreak + 1).trim();
            }

            return (
                <Animatable.View key={index} animation="fadeInUp" delay={index * 50} duration={400}>
                    <Text style={styles.sectionTitle}>{title}</Text>
                    {body ? <Text style={styles.paragraph}>{body}</Text> : null}
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

  // Hide the default navigator header
  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <Header title={title} onBackPress={handleGoBack} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ParsedContent text={content} />
      </ScrollView>

      <Footer onAgreePress={handleGoBack} />
    </SafeAreaView>
  );
}

const getStyles = (theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 15,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      backgroundColor: theme.surface,
    },
    headerTitle: { fontSize: 20, fontWeight: '600', color: theme.text },
    backButton: { padding: 5 },
    scrollContent: { padding: 20 },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.primary,
      marginBottom: 10,
      marginTop: 15,
      lineHeight: 24,
    },
    paragraph: {
      fontSize: 16,
      color: theme.textSecondary,
      lineHeight: 26,
      textAlign: 'justify',
    },
    footer: {
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 30,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      backgroundColor: theme.surface,
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