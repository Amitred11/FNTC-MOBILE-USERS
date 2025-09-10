// screens/TicketCreateScreen.js
import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Image
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';

import { useTheme, useAuth, useMessage, useAlert } from '../../contexts';
import { requestMediaLibraryPermissions } from '../../utils/permissions';
import CustomPicker from '../../components/CustomPicker';

// --- Constants ---
const HEADER_HEIGHT = Platform.select({ ios: 90, android: 70 });
const CATEGORY_ITEMS = [
  { label: 'Technical Issue', value: 'technical' },
  { label: 'Billing and Refunds', value: 'billing' },
  { label: 'General Inquiry', value: 'general' },
  { label: 'Modem Installation', value: 'modem_installation' },
];

const TicketCreateScreen = ({ onFinish }) => {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    const { api } = useAuth();
    const { showMessage } = useMessage();
    const [subject, setSubject] = useState('');
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [image, setImage] = useState(null);
    const { showAlert } = useAlert();
    const [category, setCategory] = useState('technical');
  
    // OPTIMIZED: Use useCallback to prevent re-creating the function on every render
    const handleCategoryChange = useCallback((value) => {
      setCategory(value);
    }, []);
  
    const handleImagePick = async () => {
      const hasPermission = await requestMediaLibraryPermissions();
      if (!hasPermission) return;
      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.5,
        base64: true,
      });
      if (!pickerResult.canceled && pickerResult.assets?.length > 0) {
        const asset = pickerResult.assets[0];
        const imageDataUri = `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`;
        setImage({ uri: asset.uri, base64: imageDataUri });
      }
    };
  
    const handleSubmit = async () => {
      if (!subject.trim() || !description.trim()) {
        showAlert('Missing Info', 'Please provide a subject and description.');
        return;
      }
      setIsSubmitting(true);
      try {
        const payload = { subject, description, category };
        if (image) {
          payload.imageData = image.base64;
        }
        await api.post('/support/tickets', payload);
        showMessage('Ticket Submitted', 'Your ticket has been created successfully.');
        onFinish();
      } catch (error) {
        const errorMsg = error.response?.data?.message || 'Could not submit ticket.';
        showAlert('Error', errorMsg);
      } finally {
        setIsSubmitting(false);
      }
    };
  
    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={HEADER_HEIGHT}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.formContentContainer} keyboardShouldPersistTaps="handled">
            <CustomPicker
              fieldLabel="Select a Category"
              selectedValue={category}
              onValueChange={handleCategoryChange}
              label="Select Category"
              items={CATEGORY_ITEMS}
            />
          <Text style={styles.formLabel}>Subject</Text>
          <TextInput
            style={styles.formInput}
            placeholder="e.g., No Internet Connection"
            value={subject}
            onChangeText={setSubject}
            editable={!isSubmitting}
            placeholderTextColor={theme.textSecondary}
          />
  
          <Text style={styles.formLabel}>Describe Your Issue</Text>
          <TextInput
            style={[styles.formInput, styles.formInputMulti]}
            placeholder="Please provide as much detail as possible..."
            value={description}
            onChangeText={setDescription}
            multiline
            editable={!isSubmitting}
            placeholderTextColor={theme.textSecondary}
          />
  
          <Text style={styles.formLabel}>Attach an Image (Optional)</Text>
          <View style={styles.imagePickerContainer}>
            {image ? (
              <View>
                <Image source={{ uri: image.uri }} style={styles.imagePreview} />
                <TouchableOpacity style={styles.removeImageButton} onPress={() => setImage(null)}>
                  <Ionicons name="close-circle" size={28} color={theme.danger} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.attachButton} onPress={handleImagePick}>
                <Ionicons name="attach" size={22} color={theme.primary} />
                <Text style={styles.attachButtonText}>Add Screenshot or Photo</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
  
        <View style={styles.fixedButtonContainer}>
          <TouchableOpacity style={[styles.button, isSubmitting && styles.buttonDisabled]} onPress={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.buttonText}>Submit Ticket</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
};

export default TicketCreateScreen;

// --- STYLESHEET ---
const getStyles = (theme) => StyleSheet.create({
    // Ticket Create styles
    formContentContainer: { padding: 20, flexGrow: 1 },
    formLabel: { fontSize: 16, fontWeight: '500', color: theme.text, marginTop: 15, marginBottom: 8 },
    formInput: { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 10, paddingHorizontal: 15, paddingVertical: 12, fontSize: 16, color: theme.text },
    formInputMulti: { minHeight: 150, textAlignVertical: 'top', paddingTop: 12 },
    imagePickerContainer: { alignItems: 'center', marginTop: 10, padding: 10, backgroundColor: theme.background, borderRadius: 8 },
    attachButton: { flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: theme.surface, borderRadius: 10, borderWidth: 1, borderStyle: 'dashed', borderColor: theme.border },
    attachButtonText: { fontSize: 16, fontWeight: '500', color: theme.primary, marginLeft: 10 },
    imagePreview: { width: 150, height: 150, borderRadius: 10, marginBottom: 10 },
    removeImageButton: { position: 'absolute', top: -10, right: -10, backgroundColor: theme.surface, borderRadius: 15 },
    fixedButtonContainer: { paddingHorizontal: 20, paddingVertical: 20, backgroundColor: theme.surface, borderTopWidth: 1, borderTopColor: theme.border },
    button: { backgroundColor: theme.primary, padding: 16, borderRadius: 10, alignItems: 'center' },
    buttonText: { color: theme.textOnPrimary, fontSize: 16, fontWeight: 'bold' },
    buttonDisabled: { backgroundColor: theme.disabled },
});