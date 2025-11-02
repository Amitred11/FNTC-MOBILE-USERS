// screens/LegalDocumentScreen.js (VISUALLY STUNNING VERSION - FIXED)

import React, { useEffect, useMemo, useCallback, Fragment, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Animated, Dimensions, Platform } from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../contexts';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Animatable from 'react-native-animatable';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height } = Dimensions.get('window');

// --- Reusable Sub-Components ---

const Footer = React.memo(({ onAgreePress }) => {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    return (
        <View style={[styles.footer, styles.glassEffect]}>
            <TouchableOpacity style={styles.agreeButton} onPress={onAgreePress}>
                <Text style={styles.agreeButtonText}>I Understand and Agree</Text>
            </TouchableOpacity>
        </View>
    );
});

const ScrollProgressBar = ({ scrollY, contentHeight }) => {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    const insets = useSafeAreaInsets();

    const scrollableHeight = Math.max(1, contentHeight - height);

    const progress = scrollY.interpolate({
        inputRange: [0, scrollableHeight],
        outputRange: ['0%', '100%'],
        extrapolate: 'clamp',
    });

    // Position the progress bar correctly below the transparent header area
    return (
        <View style={[styles.progressBarContainer, { top: insets.top + (Platform.OS === 'ios' ? 44 : 56) }]}>
            <Animated.View style={[styles.progressBar, { width: progress }]} />
        </View>
    );
};

const Section = React.memo(({ title, icon, children, index, scrollY }) => {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    const [layoutY, setLayoutY] = useState(0);

    const parallaxTranslate = scrollY.interpolate({
        inputRange: [layoutY - height, layoutY + height],
        outputRange: [-20, 20],
        extrapolate: 'clamp',
    });

    return (
        <Animatable.View
            animation="fadeInUp"
            duration={500}
            delay={index * 100}
            style={styles.sectionContainer}
            onLayout={(event) => setLayoutY(event.nativeEvent.layout.y)}
        >
            <View style={styles.sectionHeader}>
                <Animated.View style={{ transform: [{ translateY: parallaxTranslate }] }}>
                    <Ionicons name={icon} size={28} color={theme.primary} style={styles.sectionIcon} />
                </Animated.View>
                <Text style={styles.sectionTitle}>{title}</Text>
            </View>
            <View style={styles.sectionBody}>
                {children}
            </View>
        </Animatable.View>
    );
});

const ParsedContent = React.memo(({ text, scrollY }) => {
    const { theme } = useTheme();
    const styles = getStyles(theme);

    const getIconForTitle = (title) => {
        const lowerCaseTitle = title.toLowerCase();
        if (lowerCaseTitle.includes('agreement') || lowerCaseTitle.includes('terms')) return 'document-text-outline';
        if (lowerCaseTitle.includes('service')) return 'wifi-outline';
        if (lowerCaseTitle.includes('payment') || lowerCaseTitle.includes('billing')) return 'card-outline';
        if (lowerCaseTitle.includes('conduct') || lowerCaseTitle.includes('choices')) return 'options-outline';
        if (lowerCaseTitle.includes('equipment')) return 'hardware-chip-outline';
        if (lowerCaseTitle.includes('liability')) return 'alert-circle-outline';
        if (lowerCaseTitle.includes('termination')) return 'close-circle-outline';
        if (lowerCaseTitle.includes('information')) return 'person-circle-outline';
        if (lowerCaseTitle.includes('how we use')) return 'settings-outline';
        if (lowerCaseTitle.includes('disclosure')) return 'share-social-outline';
        if (lowerCaseTitle.includes('security')) return 'lock-closed-outline';
        if (lowerCaseTitle.includes('contact')) return 'mail-outline';
        return 'shield-checkmark-outline';
    };

    const sections = useMemo(() => {
        if (!text) return [];
        const lines = text.split('\n');
        const parsedSections = [];
        let currentSection = null;

        lines.forEach(line => {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('## ')) {
                if (currentSection) parsedSections.push(currentSection);
                currentSection = { title: trimmedLine.substring(3), content: [] };
            } else if (currentSection) {
                currentSection.content.push(trimmedLine);
            }
        });
        if (currentSection) parsedSections.push(currentSection);

        return parsedSections.map((section, sectionIndex) => (
            <Section
                key={sectionIndex}
                index={sectionIndex}
                title={section.title}
                icon={getIconForTitle(section.title)}
                scrollY={scrollY}
            >
                {section.content.map((line, lineIndex) => {
                    if (line.startsWith('### ')) return <Text key={lineIndex} style={styles.heading3}>{line.substring(4)}</Text>;
                    if (line.startsWith('* ') || line.startsWith('- ')) {
                        return (
                            <View key={lineIndex} style={styles.bulletItem}>
                                <Text style={styles.bulletPoint}>•</Text>
                                <Text style={styles.paragraph}>{line.substring(2)}</Text>
                            </View>
                        );
                    }
                    if (line === '') return <View key={lineIndex} style={styles.spacer} />;
                    return <Text key={lineIndex} style={styles.paragraph}>{line}</Text>;
                })}
            </Section>
        ));
    }, [text, styles, scrollY]);

    return <Fragment>{sections}</Fragment>;
});

// --- Main Screen Component ---
export default function LegalDocumentScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const insets = useSafeAreaInsets();

  const { title = 'Legal Document', content = '' } = route.params || {};

  const scrollY = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef(null);
  const [contentHeight, setContentHeight] = useState(0);

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);
  
  useFocusEffect(
    useCallback(() => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });
    }, [])
  );

  useEffect(() => {
    navigation.setOptions({
        headerShown: true,
        headerTransparent: true,
        headerTitle: () => null,
        headerLeft: () => (
             <TouchableOpacity onPress={handleGoBack} style={[styles.backButton, { top: insets.top + 10 }, styles.glassEffect]}>
                <Ionicons name="close-outline" size={28} color={theme.text} />
            </TouchableOpacity>
        ),
    });
  }, [navigation, theme, handleGoBack, styles, insets.top]);

  return (
    <SafeAreaView style={styles.container}>
        <LinearGradient
            colors={[theme.surface, theme.background]}
            style={StyleSheet.absoluteFill}
        />

        <ScrollProgressBar scrollY={scrollY} contentHeight={contentHeight} />

        <Animated.ScrollView
            ref={scrollViewRef}
            contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 70 }]}
            showsVerticalScrollIndicator={false}
            onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                { useNativeDriver: false }
            )}
            onContentSizeChange={(w, h) => setContentHeight(h)}
            scrollEventThrottle={16}
        >
            <Animatable.View animation="fadeInDown" duration={500} style={styles.documentHeader}>
                <Text style={styles.documentTitle}>{title}</Text>
                <Text style={styles.documentSubtitle}>{content.split('\n')[0]}</Text>
            </Animatable.View>

            <ParsedContent text={content} scrollY={scrollY} />
        </Animated.ScrollView>

      <Footer onAgreePress={handleGoBack} />
    </SafeAreaView>
  );
}

const getStyles = (theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    backButton: {
        position: 'absolute',
        left: 15,
        borderRadius: 20,
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        zIndex: 20,
    },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 150 },

    glassEffect: {
        // --- [FIXED] Use theme colors for a consistent dark mode glass effect ---
        backgroundColor: theme.isDarkMode ? `${theme.surface}B3` : 'rgba(255, 255, 255, 0.6)', // B3 hex alpha is ~70% opacity
        borderWidth: 1,
        borderColor: theme.isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.8)',
    },

    progressBarContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: 3,
        backgroundColor: `${theme.primary}30`,
        zIndex: 10,
    },
    progressBar: {
        height: 3,
        backgroundColor: theme.primary,
    },

    documentHeader: { alignItems: 'center', marginBottom: 30, paddingHorizontal: 10 },
    documentTitle: { fontSize: 32, fontWeight: '800', color: theme.text, textAlign: 'center' },
    documentSubtitle: { fontSize: 15, color: theme.textSecondary, marginTop: 8, textAlign: 'center' },

    sectionContainer: {
        backgroundColor: `${theme.surface}E6`,
        borderRadius: 20,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
        borderColor: `${theme.border}99`,
        borderWidth: 1,
    },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
    sectionIcon: { marginRight: 15, width: 30 },
    sectionTitle: { fontSize: 22, fontWeight: '700', color: theme.text, flex: 1 },
    sectionBody: { borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 15 },

    heading3: { fontSize: 18, fontWeight: '600', color: theme.text, marginBottom: 12, marginTop: 5 },
    paragraph: { fontSize: 16, color: theme.textSecondary, lineHeight: 28, flex: 1 },
    bulletItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
    bulletPoint: { fontSize: 16, color: theme.primary, marginRight: 12, lineHeight: 28, fontWeight: 'bold' },
    spacer: { height: 16 },

    footer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      paddingHorizontal: 20,
      paddingTop: 15,
      paddingBottom: 30,
      borderTopWidth: 0,
    },
    agreeButton: {
        backgroundColor: theme.primary,
        borderRadius: 14,
        paddingVertical: 18,
        alignItems: 'center',
        shadowColor: theme.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 8,
    },
    agreeButtonText: { color: theme.textOnPrimary, fontSize: 17, fontWeight: 'bold' },
  });