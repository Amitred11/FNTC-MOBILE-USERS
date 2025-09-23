// screens/HowToUseScreen.js
import React, { useState, useRef, useCallback } from 'react';
import {
    View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
    Share, Clipboard, FlatList, Dimensions, Animated, ScrollView
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import { howToUseData } from '../../data/Constants-Data';

const { width } = Dimensions.get('window');

// This wrapper is necessary for the native driver to work with onScroll animations
const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

// --- Sub-Components (No changes needed in these) ---

const ScreenHeader = ({ onBack, onToggleLanguage, title }) => {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    return (
        <View style={styles.header}>
            <TouchableOpacity onPress={onBack} style={styles.headerButton}>
                <Ionicons name="arrow-back" size={26} color={theme.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{title}</Text>
            <TouchableOpacity onPress={onToggleLanguage} style={styles.headerButton}>
                <Ionicons name="language-outline" size={26} color={theme.text} />
            </TouchableOpacity>
        </View>
    );
};

const HowToUseCard = ({ item }) => {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    const navigation = useNavigation();
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        if (!item.content) return;
        Clipboard.setString(item.content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleShare = async () => {
        try {
            await Share.share({
                message: `${item.title}\n\n${item.content || "For more details, please check the app."}`,
            });
        } catch (error) {
            console.error("Share failed:", error.message);
        }
    };

    return (
        <View style={styles.cardContainer}>
            <ScrollView contentContainerStyle={styles.cardScrollView} showsVerticalScrollIndicator={false}>
                <Animatable.View animation="fadeInUp" duration={600} style={styles.cardContent}>
                    <View style={[styles.iconContainer, { backgroundColor: `${theme.primary}20` }]}>
                        <Ionicons name={item.icon} size={32} color={theme.primary} />
                    </View>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    
                    {item.checklist ? (
                        <View style={styles.bulletListContainer}>
                            {item.checklist.map((checkItem) => (
                                <View key={checkItem.id} style={styles.bulletItem}>
                                    <Text style={styles.bulletPoint}>•</Text>
                                    <Text style={styles.bulletText}>{checkItem.text}</Text>
                                </View>
                            ))}
                        </View>
                    ) : (
                        <Text style={styles.cardBody}>{item.content}</Text>
                    )}
                </Animatable.View>
            </ScrollView>

            <View style={styles.cardActions}>
                {item.navigateTo && (
                    <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate(item.navigateTo)}>
                        <Ionicons name="arrow-forward-circle-outline" size={22} color={theme.primary} />
                        <Text style={styles.actionButtonText}>Go to Section</Text>
                    </TouchableOpacity>
                )}
                {item.isCopyable && (
                    <TouchableOpacity style={styles.actionButton} onPress={handleCopy}>
                        <Ionicons name={copied ? "checkmark-circle" : "copy-outline"} size={22} color={copied ? theme.success : theme.primary} />
                        <Text style={styles.actionButtonText}>{copied ? 'Copied!' : 'Copy Info'}</Text>
                    </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
                    <Ionicons name="share-social-outline" size={22} color={theme.primary} />
                    <Text style={styles.actionButtonText}>Share Guide</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const Pagination = ({ data, scrollX }) => {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    return (
        <View style={styles.paginationContainer}>
            {data.map((_, idx) => {
                const inputRange = [(idx - 1) * width, idx * width, (idx + 1) * width];
                const scale = scrollX.interpolate({ inputRange, outputRange: [0.8, 1.4, 0.8], extrapolate: 'clamp' });
                const opacity = scrollX.interpolate({ inputRange, outputRange: [0.6, 1, 0.6], extrapolate: 'clamp' });
                return <Animated.View key={`dot-${idx}`} style={[styles.dot, { transform: [{ scale }], opacity }]} />;
            })}
        </View>
    );
};

// --- Main Screen Component ---

export default function HowToUseScreen() {
    const { theme } = useTheme();
    const { language, setLanguage } = useLanguage();
    const navigation = useNavigation();
    const styles = getStyles(theme);
    
    // --- NEW: Refs and State for Arrow Navigation ---
    const scrollX = useRef(new Animated.Value(0)).current;
    const flatListRef = useRef(null);
    const [currentIndex, setCurrentIndex] = useState(0);

    const data = howToUseData[language] || howToUseData['en'];

    // --- NEW: Functions to control scrolling ---
    const scrollToNext = () => {
        if (currentIndex < data.length - 1) {
            flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
        }
    };

    const scrollToPrev = () => {
        if (currentIndex > 0) {
            flatListRef.current?.scrollToIndex({ index: currentIndex - 1 });
        }
    };

    // --- NEW: Callback to update index based on scroll position ---
    const onViewableItemsChanged = useCallback(({ viewableItems }) => {
        if (viewableItems.length > 0) {
            setCurrentIndex(viewableItems[0].index);
        }
    }, []);

    const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

    const handleToggleLanguage = () => {
        setLanguage(language === 'en' ? 'tl' : 'en');
    };

    const screenText = {
        en: { header: 'How to Use' },
        tl: { header: 'Paano Gamitin' }
    };
    const currentText = screenText[language] || screenText['en'];

    return (
        <SafeAreaView style={styles.container}>
            <ScreenHeader
                onBack={() => navigation.goBack()}
                onToggleLanguage={handleToggleLanguage}
                title={currentText.header}
            />
            <AnimatedFlatList
                ref={flatListRef}
                data={data}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <HowToUseCard item={item} />}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                    { useNativeDriver: true }
                )}
                scrollEventThrottle={16}
                decelerationRate="fast"
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
            />

            {/* --- NEW: Footer with Navigation Arrows --- */}
            <View style={styles.footerContainer}>
                <TouchableOpacity style={styles.arrowButton} onPress={scrollToPrev}>
                    {currentIndex > 0 && ( // Only show if not the first item
                        <Ionicons name="arrow-back-circle-outline" size={40} color={theme.primary} />
                    )}
                </TouchableOpacity>

                <Pagination data={data} scrollX={scrollX} />

                <TouchableOpacity style={styles.arrowButton} onPress={scrollToNext}>
                    {currentIndex < data.length - 1 && ( // Only show if not the last item
                        <Ionicons name="arrow-forward-circle-outline" size={40} color={theme.primary} />
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

// --- Styles ---

const getStyles = (theme) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, height: 60, borderBottomWidth: 1, borderBottomColor: theme.border },
    headerButton: { padding: 12 },
    headerTitle: { color: theme.text, fontSize: 18, fontWeight: '600' },
    cardContainer: { width: width, flex: 1, justifyContent: 'space-between', paddingBottom: 20 },
    cardScrollView: { alignItems: 'center', paddingHorizontal: 20, paddingVertical: 24 },
    cardContent: { alignItems: 'center' },
    iconContainer: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
    cardTitle: { fontSize: 24, fontWeight: 'bold', color: theme.text, textAlign: 'center', marginBottom: 16 },
    cardBody: { fontSize: 16, color: theme.textSecondary, textAlign: 'center', lineHeight: 25 },
    bulletListContainer: { alignSelf: 'stretch', paddingHorizontal: 10 },
    bulletItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
    bulletPoint: { fontSize: 16, color: theme.textSecondary, marginRight: 12, lineHeight: 25 },
    bulletText: { flex: 1, fontSize: 16, color: theme.textSecondary, lineHeight: 25 },
    cardActions: { width: '100%', paddingHorizontal: 20, paddingTop: 10, gap: 12 },
    actionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.surface, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: theme.border },
    actionButtonText: { color: theme.primary, fontSize: 15, fontWeight: '600', marginLeft: 10 },
    
    // --- NEW: Footer and Arrow Styles ---
    footerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        height: 60,
    },
    arrowButton: {
        width: 60, // A fixed width ensures pagination stays centered
        padding: 10,
        alignItems: 'center',
    },
    paginationContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: theme.primary,
        marginHorizontal: 8,
    },
});