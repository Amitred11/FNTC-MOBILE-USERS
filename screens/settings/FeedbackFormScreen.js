// screens/CustomerFeedbackScreen.js (Refactored with Submission Fix)

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
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth, useTheme, useMessage, useAlert } from '../../contexts';

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

// --- Sub-Components ---
const StarRating = React.memo(({ currentRating, onRate, disabled }) => {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const starRefs = useRef([]);

  const handlePress = (star) => {
    onRate(star);
    starRefs.current[star-1]?.pulse(600);
  }

  return (
    <View style={styles.starsContainer}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Animatable.View key={star} ref={ref => starRefs.current[star-1] = ref}>
          <TouchableOpacity 
              onPress={() => handlePress(star)} 
              disabled={disabled}
              style={styles.starButton}
          >
              <Ionicons 
                  name={star <= currentRating ? 'star' : 'star-outline'} 
                  size={44} 
                  color={star <= currentRating ? '#FFC700' : theme.border} 
              />
          </TouchableOpacity>
        </Animatable.View>
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
            {relevantTags.map((tag, index) => (
                <Animatable.View key={tag} animation="fadeInUp" delay={index * 50}>
                    <TouchableOpacity
                        style={[styles.tag, selectedTags.has(tag) && styles.tagSelected]}
                        onPress={() => onTagPress(tag)}
                    >
                        {selectedTags.has(tag) && <Ionicons name="checkmark" size={16} color={theme.textOnPrimary} style={{ marginRight: 6 }} />}
                        <Text style={[styles.tagText, selectedTags.has(tag) && styles.tagTextSelected]}>
                            {tag}
                        </Text>
                    </TouchableOpacity>
                </Animatable.View>
            ))}
            </View>
        </Animatable.View>
    );
});


// --- Main Screen Component ---
export default function FeedbackFormScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { theme } = useTheme();
  const { showMessage } = useMessage();
  const { api } = useAuth();
  const { showAlert } = useAlert();
  const styles = getStyles(theme);

  const feedbackToEdit = route.params?.feedbackItem;
  const isEditMode = Boolean(feedbackToEdit);

  const [rating, setRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [selectedTags, setSelectedTags] = useState(new Set());
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    if (isEditMode && feedbackToEdit) {
        setRating(feedbackToEdit.rating || 0);
        
        const textContent = feedbackToEdit.text || '';
        const tagMarker = '\n\n[Tags]: ';
        const tagIndex = textContent.indexOf(tagMarker);

        if (tagIndex !== -1) {
            const mainText = textContent.substring(0, tagIndex);
            const tagsString = textContent.substring(tagIndex + tagMarker.length);
            const tagsArray = tagsString.split(', ').filter(Boolean);
            setFeedbackText(mainText);
            setSelectedTags(new Set(tagsArray));
        } else {
            setFeedbackText(textContent);
            setSelectedTags(new Set());
        }
    }
  }, [isEditMode, feedbackToEdit]);

  const handleSubmit = useCallback(async () => {
    if (rating === 0) {
      showAlert('Rating Required', 'Please select a star rating to continue.', [{ text: 'OK' }]);
      return;
    }

    const tagsText = Array.from(selectedTags).join(', ');
    const finalText = [feedbackText.trim(), tagsText].filter(Boolean).join('\n\n[Tags]: ');

    setIsLoading(true);
    try {
      const payload = { rating, text: finalText };

      if (isEditMode) {
        await api.put(`/feedback/${feedbackToEdit._id}`, payload);
        showMessage('Feedback Updated', 'Your changes have been saved.');
      } else {
        await api.post('/feedback', payload);
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
      headerTransparent: true,
      headerTitleStyle: { color: theme.text, fontWeight: '600' },
      headerLeft: () => (
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginLeft: 10, padding: 5 }}>
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
            <>
              <Ionicons name={isEditMode ? "checkmark-done" : "send"} size={16} color={theme.textOnPrimary} style={{marginRight: 6}} />
              <Text style={styles.headerButtonText}>{isEditMode ? 'Update' : 'Send'}</Text>
            </>
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
    }
  }, [rating]);

  const handleTagPress = useCallback((tag) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
  
  const { title, subtitle } = RATING_DESCRIPTIONS[rating];

  return (
    <LinearGradient
        colors={theme.isDarkMode ? ['#2A2D34', '#1A1C20'] : ['#F2F5F9', '#E4E9F2']}
        style={styles.container}
    >
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.kavContainer}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.contentWrapper}>
                <Animatable.Text animation="fadeInUp" duration={600} style={styles.title} key={title}>
                {title}
                </Animatable.Text>
                <Animatable.Text animation="fadeInUp" duration={600} delay={100} style={styles.subtitle} key={subtitle}>
                {subtitle}
                </Animatable.Text>

                <Animatable.View animation="fadeInUp" delay={200}>
                    <StarRating currentRating={rating} onRate={handleRatingPress} disabled={isLoading} />
                </Animatable.View>
                
                <TagSelector rating={rating} selectedTags={selectedTags} onTagPress={handleTagPress} />

                {rating > 0 && (
                    <Animatable.View
                        animation="fadeInUp"
                        delay={100}
                        style={{ width: '100%', marginTop: 20 }}
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
                )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const getStyles = (theme) =>
  StyleSheet.create({
    container: { backgroundColor: theme.background, flex: 1 },
    kavContainer: { flex: 1 },
    scrollContent: { 
      flexGrow: 1, 
      justifyContent: 'center',
      paddingTop: 80, 
      paddingBottom: 20
    },
    contentWrapper: {
        paddingHorizontal: 20,
        alignItems: 'center',
    },
    headerButton: {
      alignItems: 'center',
      backgroundColor: theme.primary,
      borderRadius: 20,
      flexDirection: 'row',
      marginRight: 10,
      paddingHorizontal: 16,
      paddingVertical: 9,
    },
    headerButtonDisabled: { backgroundColor: theme.disabled },
    headerButtonText: { color: theme.textOnPrimary, fontSize: 16, fontWeight: 'bold' },
    title: {
      color: theme.text,
      fontSize: 28,
      fontWeight: 'bold',
      marginBottom: 8,
      textAlign: 'center',
    },
    subtitle: {
      color: theme.textSecondary,
      fontSize: 18,
      marginBottom: 40,
      textAlign: 'center',
    },
    starsContainer: {
      flexDirection: 'row',
      gap: 16,
      justifyContent: 'center',
      marginBottom: 30,
    },
    starButton: {
        padding: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
    },
    tagsSection: { 
        width: '100%',
        marginBottom: 10,
    },
    sectionTitle: {
      color: theme.text,
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 16,
      textAlign: 'center',
    },
    tagsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      justifyContent: 'center',
    },
    tag: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.surface,
      borderColor: theme.border,
      borderRadius: 30,
      borderWidth: 1.5,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    tagSelected: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    tagText: { 
        color: theme.text, 
        fontWeight: '500', 
        fontSize: 15 
    },
    tagTextSelected: { color: theme.textOnPrimary },
    messageBoxWrapper: {
      backgroundColor: theme.surface,
      borderColor: theme.border,
      borderRadius: 14,
      borderWidth: 1,
      minHeight: 150,
      padding: 5,
    },
    textInput: {
      color: theme.text,
      flex: 1,
      fontSize: 17,
      lineHeight: 24,
      padding: 12,
      paddingTop: 12,
      textAlignVertical: 'top',
    },
    charCounter: {
      color: theme.textSecondary,
      fontSize: 12,
      paddingBottom: 8,
      paddingRight: 12,
      textAlign: 'right',
    },
  });