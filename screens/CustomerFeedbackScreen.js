// screens/CustomerFeedbackScreen.js (Cleaned)

import React, { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  ActivityIndicator,
  Platform,
  ScrollView,
  Keyboard,
  KeyboardAvoidingView,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import * as Animatable from 'react-native-animatable';
import { useAuth, useTheme, useMessage, useAlert } from '../contexts';

// --- Constants ---
const MAX_CHARACTERS = 500;
const RATING_DESCRIPTIONS = {
  0: { title: 'How was your experience?', subtitle: 'Your feedback helps us improve.' },
  1: { title: 'Oh no! What went wrong?', subtitle: "We're sorry to hear that." },
  2: { title: 'Room for improvement?', subtitle: 'We appreciate your feedback.' },
  3: { title: 'Getting better!', subtitle: 'What can we do to make it great?' },
  4: { title: 'Glad you liked it!', subtitle: 'Thanks for the positive feedback!' },
  5: { title: 'Awesome! We love to hear it!', subtitle: 'Thank you for being a valued customer!' },
};
const POSITIVE_TAGS = ['Fast Speed', 'Reliable Connection', 'Good Customer Service', 'Affordable Price', 'Easy App'];
const NEGATIVE_TAGS = ['Slow Speed', 'Connection Drops', 'Billing Issue', 'Poor Support', 'App is Confusing'];

// --- Sub-Components (Memoized for Performance) ---
const StarRating = React.memo(({ currentRating, onRate, disabled }) => {
  const { theme } = useTheme();
  return (
    <View style={getStyles(theme).starsContainer}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity 
            key={star} 
            onPress={() => onRate(star)} 
            disabled={disabled}
            style={{ padding: 5 }}
        >
            <Ionicons 
                name={star <= currentRating ? 'star' : 'star-outline'} 
                size={44} 
                color={star <= currentRating ? '#FFC700' : theme.border} 
            />
        </TouchableOpacity>
      ))}
    </View>
  );
});

const TagSelector = React.memo(({ rating, selectedTags, onTagPress }) => {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    const relevantTags = useMemo(() => {
        if (rating === 0) return [];
        return rating >= 4 ? POSITIVE_TAGS : NEGATIVE_TAGS;
    }, [rating]);

    if (rating === 0) return null;

    return (
        <Animatable.View animation="fadeIn" duration={400} style={styles.tagsSection}>
            <Text style={styles.sectionTitle}>What stood out?</Text>
            <View style={styles.tagsContainer}>
            {relevantTags.map((tag) => (
                <TouchableOpacity
                    key={tag}
                    style={[styles.tag, selectedTags.has(tag) && styles.tagSelected]}
                    onPress={() => onTagPress(tag)}
                >
                    <Text style={[styles.tagText, selectedTags.has(tag) && styles.tagTextSelected]}>
                        {tag}
                    </Text>
                </TouchableOpacity>
            ))}
            </View>
        </Animatable.View>
    );
});


// --- Main Screen Component ---
export default function CustomerFeedbackScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { theme } = useTheme();
  const { showMessage } = useMessage();
  const { api } = useAuth();
  const { showAlert } = useAlert();
  const styles = getStyles(theme);

  const feedbackToEdit = route.params?.feedbackItem;
  const isEditMode = Boolean(feedbackToEdit);

  const [rating, setRating] = useState(feedbackToEdit?.rating || 0);
  const [feedbackText, setFeedbackText] = useState(feedbackToEdit?.text || '');
  const [selectedTags, setSelectedTags] = useState(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  const titleRef = useRef(null);

  const handleSubmit = useCallback(async () => {
    if (rating === 0) {
      showAlert('Rating Required', 'Please select a star rating to continue.', [{ text: 'OK' }]);
      return;
    }

    const tagsText = Array.from(selectedTags).join(', ');
    const finalText = [feedbackText.trim(), tagsText].filter(Boolean).join('\n\n[Tags]: ');

    setIsLoading(true);
    try {
      if (isEditMode) {
        await api.put(`/feedback/${feedbackToEdit._id}`, { rating, text: finalText });
        showMessage('Feedback Updated', 'Your changes have been saved.');
      } else {
        await api.post('/feedback', { rating, text: finalText });
        showMessage('Feedback Submitted', 'Thank you for your valuable feedback!');
      }
      navigation.goBack();
    } catch (error) {
      showAlert('Submission Failed', 'An error occurred. Please try again.', [{ text: 'OK' }]);
    } finally {
      setIsLoading(false);
    }
  }, [rating, selectedTags, feedbackText, isEditMode, api, showMessage, showAlert, navigation, feedbackToEdit]);

  useLayoutEffect(() => {
    const canSubmit = rating > 0 && !isLoading;
    navigation.setOptions({
      headerShown: true,
      title: isEditMode ? 'Edit Feedback' : 'Give Feedback',
      headerShadowVisible: false,
      headerStyle: { backgroundColor: theme.surface, borderBottomWidth: 1, borderBottomColor: theme.border },
      headerTitleStyle: { color: theme.text, fontWeight: '600' },
      headerLeft: () => (
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginLeft: 10 }}>
          <Ionicons name="close" size={28} color={theme.text} />
        </TouchableOpacity>
      ),
      headerRight: () => (
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={!canSubmit}
          style={[styles.headerButton, !canSubmit && styles.headerButtonDisabled]}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={theme.textOnPrimary} />
          ) : (
            <Text style={styles.headerButtonText}>{isEditMode ? 'Update' : 'Send'}</Text>
          )}
        </TouchableOpacity>
      ),
    });
  }, [navigation, isLoading, rating, theme, isEditMode, handleSubmit, styles]);

  const handleRatingPress = useCallback((star) => {
    const newRating = rating === star ? 0 : star;
    setRating(newRating);
    if (newRating > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      titleRef.current?.pulse(800);
    }
  }, [rating]);

  const handleTagPress = useCallback((tag) => {
    setSelectedTags(prevTags => {
        const newTags = new Set(prevTags);
        if (newTags.has(tag)) {
            newTags.delete(tag);
        } else {
            newTags.add(tag);
        }
        return newTags;
    });
  }, []);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const { title, subtitle } = RATING_DESCRIPTIONS[rating];

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kavContainer}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 100}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Animatable.View>
            <Animatable.Text ref={titleRef} animation="fadeInUp" delay={100} style={styles.title} key={title}>
              {title}
            </Animatable.Text>
            <Animatable.Text animation="fadeInUp" delay={200} style={styles.subtitle} key={subtitle}>
              {subtitle}
            </Animatable.Text>
          </Animatable.View>

          <Animatable.View animation="fadeInUp" delay={300}>
            <StarRating currentRating={rating} onRate={handleRatingPress} disabled={isLoading} />
          </Animatable.View>
          
          <TagSelector rating={rating} selectedTags={selectedTags} onTagPress={handleTagPress} />

          <Animatable.View
            animation="fadeInUp"
            delay={rating > 0 ? 100 : 400}
            style={{ marginTop: 20 }}
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
              <Text style={styles.charCounter}>
                {feedbackText.length}/{MAX_CHARACTERS}
              </Text>
            </View>
          </Animatable.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const getStyles = (theme) =>
  StyleSheet.create({
    charCounter: {
      color: theme.textSecondary,
      fontSize: 12,
      paddingBottom: 8,
      paddingHorizontal: 12,
      paddingTop: 4,
      textAlign: 'right',
    },
    container: { backgroundColor: theme.background, flex: 1 },
    headerButton: {
      alignItems: 'center',
      backgroundColor: theme.primary,
      borderRadius: 20,
      flexDirection: 'row',
      marginRight: 10,
      paddingHorizontal: 18,
      paddingVertical: 9,
    },
    headerButtonDisabled: { backgroundColor: theme.disabled },
    headerButtonText: { color: theme.textOnPrimary, fontSize: 16, fontWeight: 'bold' },
    kavContainer: { flex: 1 },
    messageBoxWrapper: {
      backgroundColor: theme.surface,
      borderColor: theme.border,
      borderRadius: 14,
      borderWidth: 1,
      minHeight: 150,
      padding: 5,
    },
    scrollContent: { flexGrow: 1, padding: 20 },
    sectionTitle: {
      color: theme.text,
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 15,
      textAlign: 'center',
    },
    starsContainer: {
      flexDirection: 'row',
      gap: 16,
      justifyContent: 'center',
      marginBottom: 10,
    },
    subtitle: {
      color: theme.textSecondary,
      fontSize: 16,
      marginBottom: 30,
      textAlign: 'center',
    },
    tag: {
      backgroundColor: theme.surface,
      borderColor: theme.border,
      borderRadius: 20,
      borderWidth: 1,
      paddingHorizontal: 10,
      paddingVertical: 10,
    },
    tagSelected: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    tagText: { color: theme.text, fontWeight: '500' },
    tagTextSelected: { color: theme.textOnPrimary },
    tagsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      justifyContent: 'center',
    },
    tagsSection: { marginBottom: 10 },
    textInput: {
      color: theme.text,
      flex: 1,
      fontSize: 17,
      lineHeight: 24,
      padding: 12,
      paddingTop: 12,
      textAlignVertical: 'top',
    },
    title: {
      color: theme.text,
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 8,
      textAlign: 'center',
    },
  });
