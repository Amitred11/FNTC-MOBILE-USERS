// screens/CustomerFeedbackScreen.js
import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, TextInput,
    SafeAreaView, ActivityIndicator, Platform, ScrollView, Keyboard, KeyboardAvoidingView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import * as Animatable from 'react-native-animatable';
import { useAuth, useTheme, useMessage, useAlert } from '../contexts';

const RATING_DESCRIPTIONS = {
    0: { title: "How was your experience?", subtitle: "Your feedback helps us improve." },
    1: { title: "Oh no! What went wrong?", subtitle: "We're sorry to hear that." },
    2: { title: "Room for improvement?", subtitle: "We appreciate your feedback." },
    3: { title: "Getting better!", subtitle: "What can we do to make it great?" },
    4: { title: "Glad you liked it!", subtitle: "Thanks for the positive feedback!" },
    5: { title: "Awesome! We love to hear it!", subtitle: "Thank you for being a valued customer!" }
};

const POSITIVE_TAGS = ["Fast Speed", "Reliable Connection", "Good Customer Service", "Affordable Price", "Easy App"];
const NEGATIVE_TAGS = ["Slow Speed", "Connection Drops", "Billing Issue", "Poor Support", "App is Confusing"];

const Star = ({ filled, size, color, onPress }) => (
    <TouchableOpacity onPress={onPress} style={{ padding: 5 }}>
        <Ionicons name={filled ? "star" : "star-outline"} size={size} color={color} />
    </TouchableOpacity>
);

export default function CustomerFeedbackScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const { theme } = useTheme();
    const { showMessage } = useMessage();
    const { api } = useAuth();
    const { showAlert } = useAlert();

    const feedbackToEdit = route.params?.feedbackItem;
    const isEditMode = Boolean(feedbackToEdit);

    const [rating, setRating] = useState(isEditMode ? feedbackToEdit.rating : 0);
    const [feedbackText, setFeedbackText] = useState(isEditMode ? feedbackToEdit.text : '');
    const [selectedTags, setSelectedTags] = useState(new Set());
    const MAX_CHARACTERS = 500;
    const [isLoading, setIsLoading] = useState(false);
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);

    const titleSectionRef = useRef(null);
    const titleRef = useRef(null);

    const handleSubmit = async () => {
        if (rating === 0) {
            showAlert("Rating Required", "Please select a star rating to continue.", [{ text: "OK" }]);
            return;
        }

        const tagsText = Array.from(selectedTags).join(', ');
        const finalText = [feedbackText.trim(), tagsText].filter(Boolean).join('\n\n[Tags]: ');

        setIsLoading(true);
        try {
            if (isEditMode) {
                await api.put(`/feedback/${feedbackToEdit._id}`, { rating, text: finalText });
                showMessage("Feedback Updated", "Your changes have been saved.");
            } else {
                await api.post('/feedback', { rating, text: finalText });
                showMessage("Feedback Submitted", "Thank you for your valuable feedback!");
            }
            navigation.goBack();
        } catch (error) {
            showAlert("Submission Failed", "An error occurred. Please try again.", [{ text: "OK" }]);
        } finally {
            setIsLoading(false);
        }
    };

    useLayoutEffect(() => {
        const canSubmit = rating > 0 && !isLoading;
        navigation.setOptions({
            headerShown: true,
            title: isEditMode ? 'Edit Feedback' : 'Give Feedback',
            headerShadowVisible: false,
            headerStyle: { backgroundColor: "lightblue", borderBottomWidth: 1 },
            headerTitleStyle: { color: theme.textBe, fontWeight: '600', left: 60 },
            headerLeft: () => (
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginLeft: 10 }}>
                    <Ionicons name="close" size={28} color={theme.textBe} />
                </TouchableOpacity>
            ),
            headerRight: () => (
                <TouchableOpacity
                    onPress={handleSubmit}
                    disabled={!canSubmit}
                    style={[getStyles(theme).headerButton, !canSubmit && getStyles(theme).headerButtonDisabled]}
                >
                    {isLoading ? (
                        <ActivityIndicator size="small" color={theme.textOnPrimary} />
                    ) : (
                        <Text style={getStyles(theme).headerButtonText}>
                            {isEditMode ? 'Update' : 'Send'}
                        </Text>
                    )}
                </TouchableOpacity>
            ),
        });
    }, [navigation, isLoading, rating, feedbackText, selectedTags, theme, isEditMode]);

    const handleRatingPress = (star) => {
        if (isLoading) return;
        if (rating === star) {
            setRating(0); // Allow deselecting
        } else {
            setRating(star);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            titleRef.current?.pulse(800);
        }
    };

    const handleTagPress = (tag) => {
        const newTags = new Set(selectedTags);
        if (newTags.has(tag)) newTags.delete(tag);
        else newTags.add(tag);
        setSelectedTags(newTags);
    };

    useEffect(() => {
        const showSub = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
        const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, []);

    useEffect(() => {
        if (rating > 0) {
            titleRef.current?.pulse(800);
        }
    }, [rating]);

    const relevantTags = rating > 0 ? (rating >= 4 ? POSITIVE_TAGS : NEGATIVE_TAGS) : [];
    const styles = getStyles(theme);

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.kavContainer}
                keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 100}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                >
                    <Animatable.View ref={titleSectionRef}>
                        <Animatable.Text ref={titleRef} animation="fadeInUp" delay={100} style={styles.title}>
                            {RATING_DESCRIPTIONS[rating].title}
                        </Animatable.Text>
                        <Animatable.Text animation="fadeInUp" delay={200} style={styles.subtitle}>
                            {RATING_DESCRIPTIONS[rating].subtitle}
                        </Animatable.Text>
                    </Animatable.View>

                    <Animatable.View
                        animation="fadeInUp"
                        delay={300}
                        style={[
                            styles.starsContainer,
                            isKeyboardVisible && { marginBottom: 0 }
                        ]}
                    >
                        {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                                key={star}
                                filled={star <= rating}
                                size={44}
                                color={star <= rating ? "#FFC700" : theme.border}
                                onPress={() => handleRatingPress(star)}
                            />
                        ))}
                    </Animatable.View>

                    {rating > 0 && (
                        <Animatable.View animation="fadeIn" duration={400} style={styles.tagsSection}>
                            <Text style={styles.sectionTitle}>What stood out?</Text>
                            <View style={styles.tagsContainer}>
                                {relevantTags.map(tag => (
                                    <TouchableOpacity
                                        key={tag}
                                        style={[styles.tag, selectedTags.has(tag) && styles.tagSelected]}
                                        onPress={() => handleTagPress(tag)}
                                    >
                                        <Text style={[styles.tagText, selectedTags.has(tag) && styles.tagTextSelected]}>
                                            {tag}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </Animatable.View>
                    )}

                    <Animatable.View
                        animation="fadeInUp"
                        delay={rating > 0 ? 100 : 400}
                        style={[
                            isKeyboardVisible ? { marginTop: 0 } : { marginTop: 30 }
                        ]}
                    >
                        <View style={styles.messageBoxWrapper}>
                            <TextInput
                                style={styles.textInput}
                                multiline
                                placeholder="Share more details... (optional)"
                                placeholderTextColor={theme.textSecondary}
                                value={feedbackText}
                                onChangeText={setFeedbackText}
                                maxLength={MAX_CHARACTERS}
                                editable={!isLoading}
                            />
                            <Text style={styles.charCounter}>{feedbackText.length}/{MAX_CHARACTERS}</Text>
                        </View>
                    </Animatable.View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const getStyles = (theme) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    kavContainer: { flex: 1 },
    headerButton: {
        backgroundColor: theme.primary,
        paddingHorizontal: 18,
        paddingVertical: 9,
        borderRadius: 20,
        marginRight: 10,
        flexDirection: 'row',
        alignItems: 'center'
    },
    headerButtonDisabled: { backgroundColor: theme.disabled },
    headerButtonText: { color: theme.textOnPrimary, fontSize: 16, fontWeight: 'bold' },
    scrollContent: { padding: 20, flexGrow: 1 },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.text,
        textAlign: 'center',
        marginBottom: 8
    },
    subtitle: {
        fontSize: 16,
        color: theme.textSecondary,
        textAlign: 'center',
        marginBottom: 30
    },
    starsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 16,
        marginBottom: 10
    },
    tagsSection: { marginBottom: 10 },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.text,
        marginBottom: 15,
        textAlign: 'center'
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        justifyContent: 'center'
    },
    tag: {
        paddingHorizontal: 10,
        paddingVertical: 10,
        backgroundColor: theme.surface,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: theme.border
    },
    tagSelected: {
        backgroundColor: theme.primary,
        borderColor: theme.primary
    },
    tagText: { color: theme.text, fontWeight: '500' },
    tagTextSelected: { color: theme.textOnPrimary },
    messageBoxWrapper: {
        backgroundColor: theme.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: theme.border,
        minHeight: 150,
        padding: 5
    },
    textInput: {
        flex: 1,
        color: theme.text,
        padding: 12,
        paddingTop: 12,
        textAlignVertical: 'top',
        fontSize: 17,
        lineHeight: 24
    },
    charCounter: {
        textAlign: 'right',
        paddingHorizontal: 12,
        paddingBottom: 8,
        paddingTop: 4,
        color: theme.textSecondary,
        fontSize: 12
    },
});
