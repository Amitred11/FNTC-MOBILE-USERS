// screens/EditProfileScreen.js
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
  KeyboardAvoidingView,
  Modal,
  Platform,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';

import CustomPicker from '../../components/CustomPicker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { requestMediaLibraryPermissions, requestCameraPermissions } from '../../utils/permissions';
import PhotoSourceSheet from '../../components/PhotoSourceSheet';
import { useAuth, useTheme, useMessage, useAlert } from '../../contexts';

// --- Reusable UI Component ---
const FormField = React.memo(({ label, iconName, children, isRequired }) => {
  const { theme } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  return (
    <View style={styles.formFieldContainer}>
      <Text style={styles.formFieldLabel}>{label}</Text>
      <View style={styles.inputContainer}>
        {iconName && <Ionicons name={iconName} size={20} color={theme.textSecondary} style={styles.inputIcon} />}
        {children}
      </View>
      {isRequired && <Text style={styles.requiredIndicator}>*</Text>}
    </View>
  );
});

// --- Helper & Constants ---
const formatDate = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};
const GENDER_OPTIONS = [
  { label: 'Male', value: 'Male' }, { label: 'Female', value: 'Female' }, { label: 'Prefer not to say', value: 'Prefer not to say' },
];
const validateForm = (formData) => {
  const { firstName, lastName, mobileNumber } = formData;
  if (!firstName || firstName.trim().length < 2) return 'First Name must be at least 2 characters.';
  if (!lastName || lastName.trim().length < 2) return 'Last Name must be at least 2 characters.';
  if (mobileNumber && mobileNumber.length > 0 && mobileNumber.length !== 13) return 'Please enter a complete 11-digit mobile number or leave the field blank.';
  return null;
};

// --- Main Screen Component ---
export default function EditProfileScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { showMessage } = useMessage();
  const { user: profile, updateProfile, isLoading: isProfileLoading } = useAuth();
  const { showAlert } = useAlert();
  const styles = useMemo(() => getStyles(theme), [theme]);

  // State
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', suffix: '', mobileNumber: '', birthday: '', gender: '', 
    address: '', phase: '', city: 'Rodriguez', province: 'Rizal', zipCode: '1860',
  });
  const [initialProfileState, setInitialProfileState] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [newPhoto, setNewPhoto] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isPhotoSheetVisible, setPhotoSheetVisible] = useState(false);
  const [isNotEditableModalVisible, setNotEditableModalVisible] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  
  const [showAddressHelperText, setShowAddressHelperText] = useState(false);

  // Effects
  useEffect(() => {
    if (profile) {
      const SUFFIXES = ['Jr.', 'Sr.', 'I', 'II', 'III', 'IV', 'V'];
      const nameParts = (profile.displayName || '').trim().split(' ').filter(Boolean);
      
      let firstName = '';
      let lastName = '';
      let parsedSuffix = '';

      if (nameParts.length > 0) {
        const potentialSuffix = nameParts[nameParts.length - 1];
        if (nameParts.length > 1 && SUFFIXES.includes(potentialSuffix)) {
          parsedSuffix = nameParts.pop(); 
        }
        if (nameParts.length > 0) {
          lastName = nameParts.pop();
        }

        firstName = nameParts.join(' ');
      }
      if (!firstName && lastName) {
        firstName = lastName;
        lastName = '';
      } else if (!firstName && !lastName && parsedSuffix) {
        firstName = parsedSuffix; 
      } else if (nameParts.length === 1) {
        firstName = nameParts[0];
      }

      const initialData = {
        firstName: firstName,
        lastName: lastName,
        suffix: profile.profile?.suffix || parsedSuffix,
        mobileNumber: profile.profile?.mobileNumber || '', 
        birthday: profile.profile?.birthday || '',
        gender: profile.profile?.gender || '', 
        address: profile.profile?.address || '', 
        phase: profile.profile?.phase || '',
        city: 'Rodriguez', province: 'Rizal', zipCode: '1860',
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
    if (field === 'address' || field === 'phase') {
      setShowAddressHelperText(false);
    }
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleLocateMe = useCallback(async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showAlert('Permission Denied', 'Please enable location services for this app to use this feature.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
      const { latitude, longitude } = location.coords;
      
      const apiUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`;
      
      const response = await fetch(apiUrl, {
        headers: { 'User-Agent': 'YourAppName/1.0 (YourAppContact@email.com)' }
      });
      const data = await response.json();

      if (data && data.address) {
        const { address } = data;
        const streetAddress = [address.house_number, address.road].filter(Boolean).join(' ').trim();
        const barangay = address.suburb || address.village || '';
        const city = address.city || address.town || '';
        
        const cityLower = city.toLowerCase();
        const isOutsideServiceArea = !cityLower.includes('rodriguez') && !cityLower.includes('montalban');
        
        if (isOutsideServiceArea) {
          showAlert("Outside Service Area", `Your location appears to be in ${city}, which is outside our service area of Rodriguez, Rizal.`);
        }

        setFormData(prev => ({ ...prev, address: streetAddress, phase: barangay }));
        
        setShowAddressHelperText(true);
      } else {
        showAlert('Location Not Found', 'Could not determine your address. Please enter it manually.');
      }
    } catch (error) {
      console.error("Geolocation Fetch error:", error);
      showAlert('Error', 'An error occurred while fetching your location.');
    } finally {
      setIsLocating(false);
    }
  }, [showAlert]);


  const handleMobileNumberChange = useCallback((text) => {
    if (!text) { handleInputChange('mobileNumber', ''); return; }
    let digitsOnly = text.replace(/[^0-9]/g, '');
    if (digitsOnly.startsWith('639')) { digitsOnly = digitsOnly.substring(3); } 
    else if (digitsOnly.startsWith('09')) { digitsOnly = digitsOnly.substring(2); } 
    else if (digitsOnly.startsWith('9')) { digitsOnly = digitsOnly.substring(1); }
    const coreNumber = digitsOnly.substring(0, 9);
    handleInputChange('mobileNumber', `+639${coreNumber}`);
  }, [handleInputChange]);

  const onDateChange = useCallback((event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      handleInputChange('birthday', selectedDate.toISOString());
    }
  }, [handleInputChange]);

  const pickImage = useCallback(async (pickerFunction) => {
    setPhotoSheetVisible(false);
    try {
      const pickerResult = await pickerFunction({ allowsEditing: true, quality: 0.5, base64: true });
      if (!pickerResult.canceled && pickerResult.assets?.length > 0) {
        const asset = pickerResult.assets[0];
        const base64Data = `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`;
        setNewPhoto({ uri: asset.uri, base64: base64Data, mimeType: asset.mimeType });
      }
    } catch (error) {
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
      showAlert('Invalid Input', validationError);
      return;
    }
    setIsSaving(true);
    try {
      // Reconstruct displayName from parts
      const displayName = [formData.firstName, formData.lastName, formData.suffix].filter(Boolean).join(' ');
      
      // Separate profile-specific data
      const { firstName, lastName, ...profileData } = formData;
      const payload = { displayName, profile: profileData };
      
      if (newPhoto) { payload.photoData = { base64: newPhoto.base64, mimeType: newPhoto.mimeType }; }
      
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
      navigation.goBack(); return true;
    });
    return () => backHandler.remove();
  }, [navigation]);

  const photoUri = newPhoto?.uri || profile?.photoUrl;
  const photoSource = photoUri ? { uri: photoUri } : require('../../assets/images/avatars/profilepic.jpg');
  const datePickerValue = useMemo(() => (formData.birthday ? new Date(formData.birthday) : new Date()), [formData.birthday]);
  const canSave = !isSaving && isDirty;

  const constructedDisplayName = useMemo(() => {
    return [formData.firstName, formData.lastName, formData.suffix].filter(Boolean).join(' ') || 'Your Name';
  }, [formData.firstName, formData.lastName, formData.suffix]);

  if (isProfileLoading && !profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}><ActivityIndicator size="large" color={theme.primary} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIcon}>
          <Ionicons name="arrow-back" size={28} color={theme.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          
          <View style={styles.profileHeader}>
            <View style={styles.profilePicContainer}>
              <Image source={photoSource} style={styles.profileImage} />
              <TouchableOpacity style={styles.editIconContainer} onPress={() => setPhotoSheetVisible(true)}>
                <Ionicons name="camera-outline" size={20} color={theme.textOnPrimary} />
              </TouchableOpacity>
            </View>
            {/* --- DISPLAY NAME FIX --- */}
            <Text style={styles.displayNameText}>{constructedDisplayName}</Text>
            {/* --- END FIX --- */}
            <Text style={styles.emailText}>{profile?.email}</Text>
          </View>
          
          <View style={styles.formContainer}>
            <Text style={styles.formSectionTitle}>Personal Details</Text>

            <FormField label="First Name" iconName="person-outline" isRequired>
              <TextInput style={styles.input} value={formData.firstName} onChangeText={(val) => handleInputChange('firstName', val)} placeholder="Enter your first name" placeholderTextColor={theme.textSecondary} maxLength={50} />
            </FormField>

            {/* --- LAYOUT FIX --- */}
            <View style={styles.lastNameSuffixContainer}>
                <View style={{ flex: 1 }}>
                    <FormField label="Last Name" isRequired>
                        <TextInput style={styles.input} value={formData.lastName} onChangeText={(val) => handleInputChange('lastName', val)} placeholder="Last Name" placeholderTextColor={theme.textSecondary} maxLength={50} />
                    </FormField>
                </View>
                <View style={{ width: 100 }}>
                    <FormField label="Suffix">
                        <TextInput style={styles.input} value={formData.suffix} onChangeText={(val) => handleInputChange('suffix', val)} placeholder="e.g. Jr." placeholderTextColor={theme.textSecondary} maxLength={10} />
                    </FormField>
                </View>
            </View>
            {/* --- END LAYOUT FIX --- */}

            <FormField label="Mobile Number" iconName="call-outline">
              <TextInput style={styles.input} value={formData.mobileNumber} onChangeText={handleMobileNumberChange} placeholder="+639..." placeholderTextColor={theme.textSecondary} keyboardType="phone-pad" maxLength={13}/>
            </FormField>
            
            <CustomPicker
                fieldLabel="Select a Gender" iconName="male-female-outline" items={GENDER_OPTIONS} selectedValue={formData.gender}
                onValueChange={(value) => handleInputChange('gender', value)} placeholder="NOT SET"
            />
            
            <FormField label="Birthday" iconName="calendar-outline">
              <TouchableOpacity onPress={() => setShowDatePicker(true)} style={{flex: 1}}>
                  <Text style={[styles.input, !formData.birthday && styles.placeholderText]}>
                    {formData.birthday ? formatDate(formData.birthday) : 'Select Date'}
                  </Text>
              </TouchableOpacity>
            </FormField>
            
            <View style={styles.formSectionHeader}>
              <Text style={styles.formSectionTitle}>Address</Text>
              <View style={styles.locateButtonsContainer}>
                <TouchableOpacity style={styles.locateButton} onPress={handleLocateMe} disabled={isLocating}>
                  {isLocating ? <ActivityIndicator size="small" color={theme.primary} /> : (<>
                      <Ionicons name="navigate-circle-outline" size={20} color={theme.primary} />
                      <Text style={styles.locateButtonText}>Use GPS</Text>
                  </>)}
                </TouchableOpacity>
              </View>
            </View>

            <FormField label="House No., Street" iconName="location-outline">
              <TextInput style={styles.input} value={formData.address} onChangeText={(val) => handleInputChange('address', val)} placeholder="e.g., Blk 1 Lot 2, Main St." placeholderTextColor={theme.textSecondary} maxLength={100} />
            </FormField>
            <FormField label="Barangay" iconName="map-outline">
               <TextInput style={styles.input} value={formData.phase} onChangeText={(val) => handleInputChange('phase', val)} placeholder="e.g., San Jose" placeholderTextColor={theme.textSecondary} maxLength={100} />
            </FormField>

            {showAddressHelperText && (
              <View style={styles.helperTextContainer}>
                <Ionicons name="information-circle-outline" size={18} color={theme.textSecondary} />
                <Text style={styles.helperText}>
                  Location detected. Please review and complete your address details.
                </Text>
              </View>
            )}

            <FormField label="City / Province" iconName="business-outline">
              <Text style={styles.displayText}>Rodriguez, Rizal</Text>
              <TouchableOpacity onPress={() => setNotEditableModalVisible(true)} style={styles.infoIcon}>
                <Ionicons name="information-circle-outline" size={24} color={theme.primary} />
              </TouchableOpacity>
            </FormField>
            <FormField label="Zip Code" iconName="mail-outline">
              <Text style={styles.displayText}>1860</Text>
               <TouchableOpacity onPress={() => setNotEditableModalVisible(true)} style={styles.infoIcon}>
                <Ionicons name="information-circle-outline" size={24} color={theme.primary} />
              </TouchableOpacity>
            </FormField>
          </View>

          {showDatePicker && (
            <DateTimePicker testID="dateTimePicker" value={datePickerValue} mode="date" display="default" onChange={onDateChange} maximumDate={new Date()} />
          )}

        </ScrollView>
        <View style={styles.footer}>
          <TouchableOpacity onPress={handleSaveChanges} disabled={!canSave} style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}>
            {isSaving ? <ActivityIndicator size="small" color={theme.textOnPrimary} /> : <Text style={styles.saveButtonText}>Save Changes</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <PhotoSourceSheet isVisible={isPhotoSheetVisible} onChooseCamera={() => pickImage(pickImageFromCamera)} onChooseGallery={() => pickImage(pickImageFromGallery)} onClose={() => setPhotoSheetVisible(false)} title="Update Profile Photo" />
      
      <Modal animationType="fade" transparent={true} visible={isNotEditableModalVisible} onRequestClose={() => setNotEditableModalVisible(false)}>
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <Ionicons name="information-circle-outline" size={50} color={theme.primary} style={{ alignSelf: 'center', marginBottom: 15 }} />
                <Text style={styles.modalTitle}>Field Not Editable</Text>
                <Text style={styles.modalText}>This field is automatically set based on our service area and cannot be changed here.</Text>
                <TouchableOpacity style={styles.modalButton} onPress={() => setNotEditableModalVisible(false)}>
                    <Text style={styles.modalButtonText}>Got It</Text>
                </TouchableOpacity>
            </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
// --- Stylesheet ---
const getStyles = (theme) =>
  StyleSheet.create({
    centered: { alignItems: 'center', flex: 1, justifyContent: 'center' },
    container: { backgroundColor: theme.surface, flex: 1 },
    scrollContent: { paddingBottom: 20 },
    header: { alignItems: 'center', borderBottomColor: theme.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: theme.surface, },
    headerIcon: { padding: 4 },
    headerTitle: { color: theme.text, fontSize: 18, fontWeight: '600' },
    profileHeader: { alignItems: 'center', backgroundColor: theme.surface, paddingVertical: 24, paddingHorizontal: 16, borderBottomWidth: 8, borderBottomColor: theme.background, },
    profilePicContainer: { position: 'relative', marginBottom: 12 },
    profileImage: { borderColor: theme.surface, borderRadius: 60, borderWidth: 4, height: 120, width: 120, backgroundColor: theme.background },
    editIconContainer: { alignItems: 'center', backgroundColor: theme.primary, borderRadius: 17, bottom: 0, right: 0, height: 34, justifyContent: 'center', position: 'absolute', width: 34, borderColor: theme.surface, borderWidth: 2, },
    displayNameText: { color: theme.text, fontSize: 24, fontWeight: 'bold', paddingBottom: 4 },
    emailText: { color: theme.textSecondary, fontSize: 16 },
    formContainer: { paddingHorizontal: 20, paddingTop: 16, backgroundColor: theme.surface },
    formSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 16 },
    formSectionTitle: { fontSize: 18, fontWeight: '700', color: theme.text },
    locateButtonsContainer: { flexDirection: 'row', alignItems: 'center', },
    locateButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, backgroundColor: theme.background, borderWidth: 1, borderColor: theme.border, },
    locateButtonText: { color: theme.primary, fontWeight: '600', marginLeft: 6 },
    formFieldContainer: { marginBottom: 20 },
    formFieldLabel: { color: theme.textSecondary, fontSize: 14, fontWeight: '600', marginBottom: 8 },
    inputContainer: { backgroundColor: theme.background, borderRadius: 12, borderWidth: 1, borderColor: theme.border, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, minHeight: 50, },
    inputIcon: { marginRight: 10 },
    input: { color: theme.text, fontSize: 16, flex: 1, paddingVertical: 15 },
    placeholderText: { color: theme.textSecondary },
    displayText: { color: theme.text, fontSize: 16, paddingVertical: 15, flex: 1 },
    infoIcon: { padding: 4 },
    requiredIndicator: { color: theme.danger, fontSize: 14, fontWeight: '600', marginLeft: 4 },
    lastNameSuffixContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start', 
        gap: 8,
    },
    helperTextContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.background,
        borderRadius: 8,
        padding: 10,
        marginTop: -10,
        marginBottom: 20,
    },
    helperText: {
        color: theme.textSecondary,
        fontSize: 14,
        marginLeft: 8,
        flex: 1,
    },
    footer: { backgroundColor: theme.surface, borderTopColor: theme.border, borderTopWidth: StyleSheet.hairlineWidth, padding: 16 },
    saveButton: { alignItems: 'center', backgroundColor: theme.primary, borderRadius: 12, justifyContent: 'center', paddingVertical: 14, width: '100%' },
    saveButtonDisabled: { backgroundColor: theme.disabled, opacity: 0.7 },
    saveButtonText: { color: theme.textOnPrimary, fontSize: 18, fontWeight: 'bold' },
    modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
    modalContent: { width: '85%', maxWidth: 320, backgroundColor: theme.surface, borderRadius: 15, padding: 25, alignItems: 'center', },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: theme.text, marginBottom: 10, textAlign: 'center' },
    modalText: { fontSize: 15, color: theme.textSecondary, textAlign: 'center', marginBottom: 25, lineHeight: 22 },
    modalButton: { backgroundColor: theme.primary, borderRadius: 10, paddingVertical: 12, width: '100%', alignItems: 'center' },
    modalButtonText: { color: theme.textOnPrimary, fontSize: 16, fontWeight: 'bold' },
  });