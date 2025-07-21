import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  BackHandler,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import CustomPicker from '../components/CustomPicker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { requestMediaLibraryPermissions, requestCameraPermissions } from '../utils/permissions';
import PhotoSourceSheet from '../components/PhotoSourceSheet';
import { useAuth, useTheme, useMessage, useAlert } from '../contexts';

// --- Sub-Components (Memoized for Performance) ---
const FormInput = React.memo(({ icon, label, children }) => {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputContainer}>
        {icon && <Ionicons name={icon} size={22} color={theme.textSecondary} style={styles.inputIcon} />}
        {children}
      </View>
    </View>
  );
});

const FormDisplay = React.memo(({ icon, label, value }) => {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    return (
        <View style={styles.inputGroup}>
            <Text style={styles.label}>{label}</Text>
            <View style={[styles.inputContainer, styles.displayContainer]}>
                <Ionicons name={icon} size={22} color={theme.textSecondary} style={styles.inputIcon} />
                <Text style={styles.displayText}>{value}</Text>
            </View>
        </View>
    );
});

// --- Helper & Constants ---
const formatDate = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

const GENDER_OPTIONS = [
  { label: 'Male', value: 'Male', icon: 'male-outline' },
  { label: 'Female', value: 'Female', icon: 'female-outline' },
  { label: 'Prefer not to say', value: 'Prefer not to say', icon: 'help-circle-outline' },
];

const validateForm = (formData) => {
    const { displayName, mobileNumber, address, phase, city, province, zipCode } = formData;
    if (!displayName || displayName.trim().length < 2) {
        return 'Display Name must be at least 2 characters.';
    }
    if (mobileNumber && (mobileNumber.length !== 13 || !mobileNumber.startsWith('+639'))) {
        return 'Please enter a valid 11-digit mobile number (e.g., +63 9.. ...).';
    }
    const isAddressingStarted = address || phase || zipCode;
    if (isAddressingStarted && (!city || !province)) {
        return 'City and Province are required if you provide an address.';
    }
    return null;
};

// --- Main Screen Component ---
export default function EditProfileScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { showMessage } = useMessage();
  const { user: profile, updateProfile, isLoading: isProfileLoading } = useAuth();
  const { showAlert } = useAlert();
  const styles = getStyles(theme);

  const [formData, setFormData] = useState({
      displayName: '', mobileNumber: '', birthday: '', gender: '',
      address: '', phase: '', city: 'Rodriguez', province: 'Rizal', zipCode: ''
  });
  const [initialProfileState, setInitialProfileState] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [newPhoto, setNewPhoto] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isPhotoSheetVisible, setPhotoSheetVisible] = useState(false);

  useEffect(() => {
    if (profile) {
      const initialData = {
        displayName: profile.displayName || '',
        mobileNumber: profile.profile?.mobileNumber || '',
        birthday: profile.profile?.birthday || '',
        gender: profile.profile?.gender || '',
        address: profile.profile?.address || '',
        phase: profile.profile?.phase || '',
        city: 'Rodriguez',
        province: 'Rizal',
        zipCode: profile.profile?.zipCode || '',
      };
      setFormData(initialData);
      setInitialProfileState(initialData);
    }
  }, [profile]);

  const isDirty = useMemo(() => {
    if (!initialProfileState) return false;
    return JSON.stringify(formData) !== JSON.stringify(initialProfileState) || newPhoto !== null;
  }, [formData, newPhoto, initialProfileState]);
  
  const handleInputChange = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleMobileNumberChange = useCallback((text) => {
    let digitsOnly = text.replace(/[^0-9]/g, '');
    if (digitsOnly.startsWith('639')) {
        digitsOnly = digitsOnly.substring(3);
    } else if (digitsOnly.startsWith('09')) {
        digitsOnly = digitsOnly.substring(2);
    } else if (digitsOnly.startsWith('9')) {
        digitsOnly = digitsOnly.substring(1);
    }
    const coreNumber = digitsOnly.substring(0, 9);
    handleInputChange('mobileNumber', `+639${coreNumber}`);
  }, [handleInputChange]);

  const onDateChange = useCallback((event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      handleInputChange('birthday', selectedDate.toISOString());
    }
  }, [handleInputChange]);

  const pickImage = useCallback(async (pickerFunction) => {
    setPhotoSheetVisible(false);
    try {
        const pickerResult = await pickerFunction({
            allowsEditing: true,
            quality: 0.5,
            base64: true,
        });
        if (!pickerResult.canceled && pickerResult.assets?.length > 0) {
            const asset = pickerResult.assets[0];
            const base64Data = `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`;
            setNewPhoto({ uri: asset.uri, base64: base64Data, mimeType: asset.mimeType });
        }
    } catch (error) {
        console.error("Image picking error:", error);
        showAlert('Error', 'Could not access photos. Please check your permissions.');
    }
  }, [showAlert]);
  
  const pickImageFromCamera = useCallback(async (options) => {
    const hasPermission = await requestCameraPermissions();
    if (!hasPermission) throw new Error("Permission denied");
    return await ImagePicker.launchCameraAsync(options);
  }, []);

  const pickImageFromGallery = useCallback(async (options) => {
    const hasPermission = await requestMediaLibraryPermissions();
    if (!hasPermission) throw new Error("Permission denied");
    return await ImagePicker.launchImageLibraryAsync(options);
  }, []);

  const handleSaveChanges = useCallback(async () => {
    const validationError = validateForm(formData);
    if (validationError) {
      showAlert('Invalid Input', validationError, [{ text: 'OK' }]);
      return;
    }
    setIsSaving(true);
    try {
      const payload = { ...formData };
      if (newPhoto) {
        payload.photoData = { base64: newPhoto.base64, mimeType: newPhoto.mimeType };
      }
      await updateProfile(payload);
      showMessage('Profile Updated!', 'Your changes have been saved successfully.');
      setNewPhoto(null);
      navigation.goBack();
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Could not save your changes.';
      showAlert('Update Failed', errorMessage);
    } finally {
      setIsSaving(false);
    }
  }, [formData, newPhoto, updateProfile, showMessage, showAlert, navigation]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      navigation.goBack();
      return true;
    });
    return () => backHandler.remove();
  }, [navigation]);

  const photoUri = newPhoto?.uri || profile?.photoUrl;
  const photoSource = photoUri ? { uri: photoUri } : require('../assets/images/profilepic.jpg');
  const datePickerValue = useMemo(() => formData.birthday ? new Date(formData.birthday) : new Date(), [formData.birthday]);

  if (isProfileLoading && !profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}><ActivityIndicator size="large" color={theme.primary} /></View>
      </SafeAreaView>
    );
  }

  const canSave = !isSaving && isDirty;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIcon}>
          <Ionicons name="arrow-back" size={26} color={theme.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity
          onPress={handleSaveChanges}
          disabled={!canSave}
          style={[styles.headerButton, !canSave && styles.headerButtonDisabled]}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={theme.textOnPrimary} />
          ) : (
            <Text style={styles.headerButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.profilePicContainer}>
            <Image source={photoSource} style={styles.profileImage} />
            <TouchableOpacity style={styles.editIconContainer} onPress={() => setPhotoSheetVisible(true)}>
              <Ionicons name="camera-outline" size={24} color={theme.textOnPrimary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionHeader}>Personal Information</Text>
          <FormInput icon="person-outline" label="Display Name">
            <TextInput
              style={styles.input}
              value={formData.displayName}
              onChangeText={(val) => handleInputChange('displayName', val)}
              placeholder="Your full name"
              placeholderTextColor={theme.textSecondary}
              maxLength={50}
            />
          </FormInput>
          <FormInput icon="call-outline" label="Mobile Number">
            <TextInput
              style={styles.input}
              value={formData.mobileNumber}
              onChangeText={handleMobileNumberChange}
              placeholder="+63 9XX XXX XXXX"
              placeholderTextColor={theme.textSecondary}
              keyboardType="phone-pad"
            />
          </FormInput>
          <FormInput icon="male-female-outline" label="Gender">
            <CustomPicker
              label="Select Gender"
              items={GENDER_OPTIONS}
              selectedValue={formData.gender}
              onValueChange={(value) => handleInputChange('gender', value)}
              placeholder={formData.gender || "Select your gender..."}
            />
          </FormInput>
          <FormInput icon="calendar-outline" label="Birthday">
            <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.inputTouchable}>
              <Text style={formData.birthday ? styles.input : styles.placeholderText}>
                {formData.birthday ? formatDate(formData.birthday) : 'Select your birthday'}
              </Text>
            </TouchableOpacity>
          </FormInput>
          {showDatePicker && (
            <DateTimePicker
              testID="dateTimePicker"
              value={datePickerValue}
              mode="date"
              display="default"
              onChange={onDateChange}
              maximumDate={new Date()}
            />
          )}

          <Text style={styles.sectionHeader}>Address</Text>
          <FormInput icon="home-outline" label="Address (House No., Street)">
            <TextInput
              style={styles.input}
              value={formData.address}
              onChangeText={(val) => handleInputChange('address', val)}
              placeholder="e.g., 123 Rizal St."
              placeholderTextColor={theme.textSecondary}
              maxLength={100}
            />
          </FormInput>
          <FormInput icon="map-outline" label="Phase / Subdivision / Barangay">
            <TextInput
              style={styles.input}
              value={formData.phase}
              onChangeText={(val) => handleInputChange('phase', val)}
              placeholder="e.g., Brgy. San Jose"
              placeholderTextColor={theme.textSecondary}
              maxLength={100}
            />
          </FormInput>
          <FormDisplay icon="business-outline" label="City" value="Rodriguez" />
          <FormDisplay icon="navigate-outline" label="Province" value="Rizal" />
          <FormInput icon="location-outline" label="Zip Code">
            <TextInput
              style={styles.input}
              value={formData.zipCode}
              onChangeText={(val) => handleInputChange('zipCode', val)}
              placeholder="e.g., 1860"
              placeholderTextColor={theme.textSecondary}
              keyboardType="number-pad"
              maxLength={4}
            />
          </FormInput>
        </ScrollView>
      </KeyboardAvoidingView>

      <PhotoSourceSheet
        isVisible={isPhotoSheetVisible}
        onChooseCamera={() => pickImage(pickImageFromCamera)}
        onChooseGallery={() => pickImage(pickImageFromGallery)}
        onClose={() => setPhotoSheetVisible(false)}
        title="Update Profile Photo"
      />
    </SafeAreaView>
  );
}

const getStyles = (theme) =>
  StyleSheet.create({
    centered: { alignItems: 'center', flex: 1, justifyContent: 'center' },
    container: { backgroundColor: theme.background, flex: 1 },
    editIconContainer: {
      backgroundColor: theme.primary,
      borderColor: theme.surface,
      borderRadius: 20,
      borderWidth: 2,
      bottom: 0,
      padding: 8,
      position: 'absolute',
      right: 0,
    },
    header: {
      alignItems: 'center',
      borderBottomColor: theme.border,
      borderBottomWidth: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    headerButton: {
      backgroundColor: theme.primary,
      borderRadius: 20,
      minWidth: 70, // Ensure button has a consistent size
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    headerButtonDisabled: { backgroundColor: theme.disabled },
    headerButtonText: { color: theme.textOnPrimary, fontSize: 16, fontWeight: 'bold' },
    headerIcon: { padding: 4 },
    headerTitle: { color: theme.text, fontSize: 17, fontWeight: '600' },
    input: { color: theme.text, flex: 1, fontSize: 16, paddingRight: 15 },
    inputContainer: {
      alignItems: 'center',
      backgroundColor: theme.surface,
      borderColor: theme.border,
      borderRadius: 12,
      borderWidth: 1,
      flexDirection: 'row',
      minHeight: 52, // Ensure consistent height
    },
    inputGroup: { marginBottom: 16 },
    inputIcon: { paddingLeft: 15, paddingRight: 10 },
    inputTouchable: { flex: 1, justifyContent: 'center' },
    label: { color: theme.textSecondary, fontSize: 14, marginBottom: 8, marginLeft: 4 },
    placeholderText: { color: theme.textSecondary, fontSize: 16, paddingLeft: 1, paddingVertical: 14 },
    profileImage: {
      borderColor: theme.surface,
      borderRadius: 60,
      borderWidth: 3,
      elevation: 5,
      height: 120,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      width: 120,
    },
    profilePicContainer: { alignSelf: 'center', marginBottom: 30, position: 'relative' },
    scrollContent: { paddingBottom: 40, paddingHorizontal: 20, paddingTop: 30 },
    sectionHeader: {
      borderBottomColor: theme.border,
      borderBottomWidth: 1,
      color: theme.text,
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 20,
      marginTop: 20,
      paddingBottom: 8,
    },
    displayContainer: {
        backgroundColor: theme.background,
        paddingVertical: 14.5,
    },
    displayText: {
        color: theme.text,
        fontSize: 16,
        fontWeight: '500',
    },
  });