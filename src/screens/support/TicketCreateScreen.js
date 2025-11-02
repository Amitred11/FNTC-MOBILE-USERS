// screens/TicketCreateScreen.js
import React, { useState, useCallback, useRef } from 'react'; // Import useRef
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView, // Keep for iOS
  TouchableOpacity,
  ImageBackground,
  Platform
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import * as Animatable from 'react-native-animatable';

import { useTheme, useAuth, useMessage, useAlert } from '../../contexts';
import { requestMediaLibraryPermissions } from '../../utils/permissions';
import CustomPicker from '../../components/CustomPicker';

// --- Constants ---
const CATEGORY_ITEMS = [
  { label: 'Technical Issue', value: 'technical' },
  { label: 'Billing and Refunds', value: 'billing' },
  { label: 'General Inquiry', value: 'general' },
  { label: 'Modem Installation', value: 'modem_installation' },
];

const ScreenContainer = ({ children, theme }) => {
  if (Platform.OS === 'ios') {
    return (
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: theme.background }}
        behavior="padding"
        keyboardVerticalOffset={70}
      >
        {children}
      </KeyboardAvoidingView>
    );
  }
  return <View style={{ flex: 1, backgroundColor: theme.background }}>{children}</View>;
};

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
    

    const categoryContainerRef = useRef(null);
    const subjectContainerRef = useRef(null);
    const descriptionContainerRef = useRef(null);

    const setFocusStyle = (ref) => {
      ref.current?.setNativeProps({
        style: {
          borderColor: theme.primary,
          elevation: 5,
          shadowColor: theme.primary,
          shadowOpacity: 0.2,
          shadowRadius: 4,
        }
      });
    };

    const removeFocusStyle = (ref) => {
      ref.current?.setNativeProps({
        style: {
          borderColor: theme.border,
          elevation: 0,
          shadowOpacity: 0,
        }
      });
    };

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
      <ScreenContainer theme={theme}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.formContentContainer}
          keyboardShouldPersistTaps="always" 
        >
            <View style={styles.headerContainer}>
                <Text style={styles.title}>Create a New Ticket</Text>
                <Text style={styles.subtitle}>Our team will review your request and get back to you shortly.</Text>
            </View>
            
            <View ref={categoryContainerRef} style={styles.inputContainerStyle}>
              <CustomPicker
                  fieldLabel="Category"
                  iconName="apps-outline"
                  items={CATEGORY_ITEMS}
                  selectedValue={category}
                  onValueChange={handleCategoryChange}
                  placeholder="Select an issue category"
                  onPressIn={() => setFocusStyle(categoryContainerRef)}
                  onPressOut={() => removeFocusStyle(categoryContainerRef)}
              />
            </View>

            <Text style={styles.formLabel}>Subject</Text>
            <View ref={subjectContainerRef} style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={22} color={theme.textSecondary} style={styles.inputIcon} />
                <TextInput
                    style={styles.formInput}
                    placeholder="e.g., No Internet Connection"
                    value={subject}
                    onChangeText={setSubject}
                    editable={!isSubmitting}
                    placeholderTextColor={theme.textSecondary}
                    onFocus={() => setFocusStyle(subjectContainerRef)}
                    onBlur={() => removeFocusStyle(subjectContainerRef)}
                />
            </View>

            <Text style={styles.formLabel}>Describe Your Issue</Text>
            <View ref={descriptionContainerRef} style={[styles.inputContainer, styles.multilineContainer]}>
                <Ionicons name="document-text-outline" size={22} color={theme.textSecondary} style={styles.inputIcon} />
                <TextInput
                    style={[styles.formInput, styles.formInputMulti]}
                    placeholder="Please provide as much detail as possible..."
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    editable={!isSubmitting}
                    placeholderTextColor={theme.textSecondary}
                    onFocus={() => setFocusStyle(descriptionContainerRef)}
                    onBlur={() => removeFocusStyle(descriptionContainerRef)}
                />
            </View>

            <Text style={styles.formLabel}>Attach an Image (Optional)</Text>
            {image ? (
            <Animatable.View animation="fadeIn">
              <ImageBackground source={{ uri: image.uri }} style={styles.imagePreview} imageStyle={{ borderRadius: 12 }}>
                <View style={styles.imageOverlay}>
                  <TouchableOpacity style={styles.changeImageButton} onPress={handleImagePick}>
                    <Ionicons name="camera-reverse-outline" size={22} color="#FFF" />
                    <Text style={styles.changeImageButtonText}>Change Photo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.removeImageButton} onPress={() => setImage(null)}>
                    <Ionicons name="trash-outline" size={20} color={theme.danger} />
                  </TouchableOpacity>
                </View>
              </ImageBackground>
            </Animatable.View>
            ) : (
            <TouchableOpacity style={styles.attachButton} onPress={handleImagePick}>
                <Ionicons name="cloud-upload-outline" size={40} color={theme.textSecondary} />
                <Text style={styles.attachButtonText}>Upload a Screenshot</Text>
                <Text style={styles.attachButtonSubText}>Supports JPEG, PNG</Text>
            </TouchableOpacity>
            )}
        </ScrollView>

        <View style={styles.fixedButtonContainer}>
          <TouchableOpacity style={[styles.button, isSubmitting && styles.buttonDisabled]} onPress={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="send-outline" size={20} color={theme.textOnPrimary} />
                <Text style={styles.buttonText}>Submit Ticket</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
};

export default TicketCreateScreen;

// --- STYLESHEET ---
const getStyles = (theme) => StyleSheet.create({
    formContentContainer: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 40,
    },
    headerContainer: {
        marginBottom: 30,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: theme.text,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: theme.textSecondary,
        lineHeight: 24,
    },
    formLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.textSecondary,
        marginBottom: 8,
        textTransform: 'uppercase',
        paddingLeft: 5,
    },
    inputContainerStyle: {
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.surface,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: theme.border,
        marginBottom: 25,
    },
    multilineContainer: {
        alignItems: 'flex-start',
        paddingTop: 14,
    },
    inputIcon: {
        paddingLeft: 15,
        paddingRight: 10,
    },
    formInput: {
        flex: 1,
        paddingVertical: 14,
        paddingRight: 15,
        fontSize: 16,
        color: theme.text,
    },
    formInputMulti: {
        minHeight: 150,
        textAlignVertical: 'top',
        paddingTop: 0,
    },
    attachButton: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 30,
        backgroundColor: theme.surface,
        borderRadius: 12,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: theme.border,
    },
    attachButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.text,
        marginTop: 12,
    },
    attachButtonSubText: {
        fontSize: 12,
        color: theme.textSecondary,
        marginTop: 4,
    },
    imagePreview: {
        width: '100%',
        height: 200,
        borderRadius: 12,
        justifyContent: 'flex-end',
    },
    imageOverlay: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
    },
    changeImageButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    changeImageButtonText: {
        color: '#FFF',
        fontWeight: '600',
        fontSize: 15,
    },
    removeImageButton: {
        backgroundColor: 'rgba(255,255,255,0.9)',
        borderRadius: 20,
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 3,
    },
    fixedButtonContainer: {
        paddingHorizontal: 20,
        paddingVertical: 15,
        paddingBottom: 15,
        backgroundColor: theme.surface,
        borderTopWidth: 1,
        borderTopColor: theme.border,
    },
    button: {
        backgroundColor: theme.primary,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 10,
    },
    buttonText: {
        color: theme.textOnPrimary,
        fontSize: 16,
        fontWeight: 'bold',
    },
    buttonDisabled: {
        backgroundColor: theme.disabled
    },
});