import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput,
  Alert, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, BackHandler
} from 'react-native';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { auth, database } from '../config/firebaseConfig';
import { ref, push, set, serverTimestamp, get } from 'firebase/database';
import { useTheme } from '../contexts/ThemeContext'; // <-- 1. Import useTheme

export default function CustomerFeedbackScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme(); // <-- 2. Get theme from context
  const styles = getStyles(theme); // <-- 3. Get theme-specific styles

  const [rating, setRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

      useEffect(() => {
          const handleBackPress = () => { navigation.goBack(); return true; };
          const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
          return () => backHandler.remove();
      }, [navigation]);

  // All logic functions are unchanged
  const handleSubmitFeedback = async () => {
    if (rating === 0) {
      Alert.alert("Rating Required", "Please select a star rating before submitting.");
      return;
    }
    if (!feedbackText.trim()) {
      Alert.alert("Feedback Required", "Please write a few words about your experience.");
      return;
    }
    setIsSubmitting(true);
    const currentUser = auth.currentUser;
    if (!currentUser) {
      Alert.alert("Error", "You must be logged in to submit feedback.");
      setIsSubmitting(false);
      return;
    }
    
    const userProfileRef = ref(database, `users/${currentUser.uid}`);
    const snapshot = await get(userProfileRef);
    const userProfile = snapshot.val();
    const userPhotoUrl = userProfile?.photoData ? `data:${userProfile.photoData.mimeType};base64,${userProfile.photoData.base64}` : null;

    const feedbackData = {
      userId: currentUser.uid,
      userName: currentUser.displayName || 'Anonymous User',
      userPhotoUrl: userPhotoUrl,
      rating,
      text: feedbackText,
      timestamp: serverTimestamp(),
    };
    try {
      const feedbackRef = ref(database, 'customer_feedback');
      await push(feedbackRef, feedbackData);
      setIsSubmitting(false);
      Alert.alert(
        "Feedback Submitted",
        "Thank you for your valuable feedback!",
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      setIsSubmitting(false);
      console.error("Error submitting feedback:", error);
      Alert.alert("Error", "Could not submit your feedback. Please try again.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color={theme.textOnPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Customer Feedback</Text>
      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <Text style={styles.title}>How was your experience?</Text>
          <Text style={styles.subtitle}>Your feedback helps us improve our service.</Text>

          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => setRating(star)}>
                <FontAwesome
                  name={star <= rating ? 'star' : 'star-o'}
                  size={40}
                  color="#FFD700" // Gold color for stars works well in both modes
                  style={styles.star}
                />
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={styles.textInput}
            placeholder="Tell us more about your experience..."
            placeholderTextColor={theme.textSecondary}
            multiline
            value={feedbackText}
            onChangeText={setFeedbackText}
          />

          <TouchableOpacity
            style={[styles.submitButton, (isSubmitting || rating === 0) && styles.buttonDisabled]}
            onPress={handleSubmitFeedback}
            disabled={isSubmitting || rating === 0}
          >
            {isSubmitting ? (
              <ActivityIndicator color={theme.textOnPrimary} />
            ) : (
              <Text style={styles.submitButtonText}>Submit Feedback</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// --- 4. Stylesheet is now a function that accepts the theme ---
const getStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: {
    backgroundColor: theme.primary,
    paddingTop: 55, paddingBottom: 20, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center'
  },
  backButton: { position: 'absolute', left: 16, bottom: 20 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: theme.textOnPrimary },
  scrollContainer: { flexGrow: 1, padding: 20, alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', color: theme.text, marginTop: 20 },
  subtitle: { fontSize: 16, color: theme.textSecondary, marginTop: 8, textAlign: 'center', marginBottom: 30 },
  starsContainer: { flexDirection: 'row', marginBottom: 30 },
  star: { marginHorizontal: 8 },
  textInput: {
    width: '100%',
    height: 150,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    textAlignVertical: 'top',
    color: theme.text,
  },
  submitButton: {
    width: '100%',
    backgroundColor: theme.primary,
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 30,
  },
  submitButtonText: {
    color: theme.textOnPrimary,
    fontSize: 16,
    fontWeight: 'bold'
  },
  buttonDisabled: {
    backgroundColor: theme.disabled
  },
});