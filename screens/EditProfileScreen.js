import React, { useState, useEffect } from 'react';
import { 
    View, Text, TextInput, StyleSheet, Image, TouchableOpacity, ScrollView, 
    SafeAreaView, ActivityIndicator, BackHandler, Platform, KeyboardAvoidingView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import CustomPicker from '../components/CustomPicker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { requestMediaLibraryPermissions, requestCameraPermissions } from '../utils/permissions'; 
import PhotoSourceSheet from '../components/PhotoSourceSheet'; 
// --- FIX: Centralized context imports ---
import { useAuth, useTheme, useMessage, useAlert } from '../contexts';

// --- Reusable Form Input Component ---
const FormInput = ({ icon, label, children, theme }) => {
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
};

// --- Helper Function to Format Date ---
const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

export default function EditProfileScreen() {
    const navigation = useNavigation();
    const { theme } = useTheme();
    const { showMessage } = useMessage();
    // --- FIX: Using `useAuth` hook and destructuring `user` and `updateProfile` ---
    const { user: profile, updateProfile, isLoading: isProfileLoading } = useAuth();
    const { showAlert } = useAlert();
    const [isPhotoSourceSheetVisible, setPhotoSourceSheetVisible] = useState(false);

    // --- FIX: Initialize form data from the nested `profile.profile` object ---
    const [formData, setFormData] = useState({
        displayName: profile?.displayName || '',
        mobileNumber: profile?.profile?.mobileNumber || '',
        birthday: profile?.profile?.birthday || '',
        gender: profile?.profile?.gender || '',
        address: profile?.profile?.address || '',
        phase: profile?.profile?.phase || '',
        city: profile?.profile?.city || '',
        province: profile?.profile?.province || '',
        zipCode: profile?.profile?.zipCode || '',
    });
    
    const [isSaving, setIsSaving] = useState(false);
    const [newPhoto, setNewPhoto] = useState(null);
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);

    useEffect(() => {
        if (profile) {
            setFormData({
                displayName: profile.displayName || '',
                mobileNumber: profile.profile?.mobileNumber || '',
                birthday: profile.profile?.birthday || '',
                gender: profile.profile?.gender || '',
                address: profile.profile?.address || '',
                phase: profile.profile?.phase || '',
                city: profile.profile?.city || '',
                province: profile.profile?.province || '',
                zipCode: profile.profile?.zipCode || '',
            });
            if (profile.profile?.birthday) setDate(new Date(profile.profile.birthday));
        }
    }, [profile]);

    useEffect(() => {
        const handleBackPress = () => { navigation.goBack(); return true; };
        const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
        return () => backHandler.remove();
    }, [navigation]);

    const handleInputChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

    const handleMobileNumberChange = (text) => {
        let formattedText = text.replace(/[^0-9+]/g, '');
        if (!formattedText.startsWith('+63')) { formattedText = `+63${formattedText.replace(/^0+/, '')}`; }
        if (formattedText.length > 13) formattedText = formattedText.substring(0, 13);
        handleInputChange('mobileNumber', formattedText);
    };

    const onDateChange = (event, selectedDate) => {
        setShowDatePicker(Platform.OS === 'ios');
        if (selectedDate) {
            setDate(selectedDate);
            handleInputChange('birthday', selectedDate.toISOString());
        }
    };

    const showPicker = () => setShowDatePicker(true);

    const handleImagePick = async () => {
        setPhotoSourceSheetVisible(true); 
    };
    
    // --- FIX 4: Corrected pickImageFromCamera to use setNewPhoto ---
    const pickImageFromCamera = async () => {
        setPhotoSourceSheetVisible(false); // Close the sheet first
        const hasCameraPermission = await requestCameraPermissions();
        if (!hasCameraPermission) {
            showAlert({ title: "Permission Denied", message: "Camera access is required to take a photo. Please enable it in device settings." });
            return;
        }
        const pickerResult = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.5, base64: true });
        if (!pickerResult.canceled && pickerResult.assets?.length > 0) {
            const asset = pickerResult.assets[0];
            const base64Data = `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`;
            setNewPhoto({ uri: asset.uri, base64: base64Data, mimeType: asset.mimeType }); // Store for upload
        }
    };
    
    // --- FIX 5: Corrected pickImageFromGallery to use setNewPhoto ---
    const pickImageFromGallery = async () => {
        setPhotoSourceSheetVisible(false); // Close the sheet first
        const hasLibraryPermission = await requestMediaLibraryPermissions();
        if (!hasLibraryPermission) {
            showAlert({ title: "Permission Denied", message: "Media library access is required to choose from gallery. Please enable it in device settings." });
            return;
        }
        const pickerResult = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, quality: 0.5, base64: true });
        if (!pickerResult.canceled && pickerResult.assets?.length > 0) {
            const asset = pickerResult.assets[0];
            const base64Data = `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`;
            setNewPhoto({ uri: asset.uri, base64: base64Data, mimeType: asset.mimeType }); // Store for upload
        }
    };
    
    const handleSaveChanges = async () => {
        setIsSaving(true);
        try {
            const payload = { ...formData };
            if (newPhoto) {
                // Pass the photoData directly as required by updateProfile
                payload.photoData = newPhoto; 
            }
            
            await updateProfile(payload); // Call the context function to update
            
            showMessage("Profile Updated!", "Your changes have been saved successfully.");
            setNewPhoto(null); // Clear temporary photo state after successful upload
            navigation.goBack();

        } catch (error) {
            console.error('Update profile error:', error);
            showAlert({ title: 'Update Failed', message: error.message || 'Could not save your profile changes. Please try again.' });
        } finally {
            setIsSaving(false);
        }
    };
    
    const styles = getStyles(theme);
    const photoUri = newPhoto?.uri || profile?.photoUrl;
    const photoSource = photoUri ? { uri: photoUri } : require('../assets/images/profilepic.jpg');

    if (isProfileLoading && !profile) {
        return <SafeAreaView style={styles.container}><View style={styles.centered}><ActivityIndicator size="large" color={theme.primary} /></View></SafeAreaView>;
    }

    const canSave = !isSaving;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIcon}><Ionicons name="arrow-back" size={26} color={theme.text} /></TouchableOpacity>
                <Text style={styles.headerTitle}>Edit Profile</Text>
                <TouchableOpacity onPress={handleSaveChanges} disabled={!canSave} style={[styles.headerButton, !canSave && styles.headerButtonDisabled]}>
                    {isSaving ? (<ActivityIndicator size="small" color={theme.textOnPrimary} />) : (<Text style={styles.headerButtonText}>Save</Text>)}
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                    <View style={styles.profilePicContainer}><Image source={photoSource} style={styles.profileImage} /><TouchableOpacity style={styles.editIconContainer} onPress={handleImagePick}><Ionicons name="camera-outline" size={24} color={theme.textOnPrimary} /></TouchableOpacity></View>
                    <Text style={styles.sectionHeader}>Personal Information</Text>
                    <FormInput icon="person-outline" label="Display Name" theme={theme}><TextInput style={styles.input} value={formData.displayName} onChangeText={val => handleInputChange('displayName', val)} placeholder="Your full name" placeholderTextColor={theme.textSecondary} maxLength={50} /></FormInput>
                    <FormInput icon="call-outline" label="Mobile Number" theme={theme}><TextInput style={styles.input} value={formData.mobileNumber} onChangeText={handleMobileNumberChange} placeholder="+63 9XX XXX XXXX" placeholderTextColor={theme.textSecondary} keyboardType="phone-pad" /></FormInput>
                    <FormInput icon="male-female-outline" label="Gender" theme={theme}>
                        <CustomPicker label="Select Gender" items={[{ label: 'Male', value: 'Male' }, { label: 'Female', value: 'Female' }, { label: 'Prefer not to say', value: 'Prefer not to say' }]} selectedValue={formData.gender} onValueChange={(value) => handleInputChange('gender', value)} placeholder="Select your gender..." />
                    </FormInput>
                    <FormInput icon="calendar-outline" label="Birthday" theme={theme}><TouchableOpacity onPress={showPicker} style={styles.inputTouchable}><Text style={formData.birthday ? styles.input : styles.placeholderText}>{formData.birthday ? formatDate(formData.birthday) : 'Select your birthday'}</Text></TouchableOpacity></FormInput>
                    {showDatePicker && (<DateTimePicker testID="dateTimePicker" value={date} mode="date" display="default" onChange={onDateChange} maximumDate={new Date()} />)}
                    <Text style={styles.sectionHeader}>Address</Text>
                    <FormInput icon="home-outline" label="Address (House No., Street)" theme={theme}><TextInput style={styles.input} value={formData.address} onChangeText={val => handleInputChange('address', val)} placeholder="e.g., 123 Rizal St." placeholderTextColor={theme.textSecondary} maxLength={100} /></FormInput>
                    <FormInput icon="map-outline" label="Phase / Subdivision / Barangay" theme={theme}><TextInput style={styles.input} value={formData.phase} onChangeText={val => handleInputChange('phase', val)} placeholder="e.g., Brgy. San Jose" placeholderTextColor={theme.textSecondary} maxLength={100} /></FormInput>
                    <FormInput icon="business-outline" label="City" theme={theme}><TextInput style={styles.input} value={formData.city} onChangeText={val => handleInputChange('city', val)} placeholder="e.g., Quezon City" placeholderTextColor={theme.textSecondary} maxLength={50} /></FormInput>
                    <FormInput icon="navigate-outline" label="Province" theme={theme}><TextInput style={styles.input} value={formData.province} onChangeText={val => handleInputChange('province', val)} placeholder="e.g., Metro Manila" placeholderTextColor={theme.textSecondary} maxLength={50} /></FormInput>
                    <FormInput icon="location-outline" label="Zip Code" theme={theme}><TextInput style={styles.input} value={formData.zipCode} onChangeText={val => handleInputChange('zipCode', val)} placeholder="e.g., 1101" placeholderTextColor={theme.textSecondary} keyboardType="number-pad" maxLength={4} /></FormInput>
                </ScrollView>
            </KeyboardAvoidingView>
            {isPhotoSourceSheetVisible && (
                <PhotoSourceSheet 
                    isVisible={isPhotoSourceSheetVisible} 
                    onChooseCamera={pickImageFromCamera}
                    onChooseGallery={pickImageFromGallery}
                    onClose={() => setPhotoSourceSheetVisible(false)} 
                />
            )}
        </SafeAreaView>
    );
}

// Styles unchanged
const getStyles = (theme) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border },
    headerIcon: { padding: 4 },
    headerTitle: { fontSize: 17, fontWeight: '600', color: theme.text },
    headerButton: { backgroundColor: theme.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
    headerButtonDisabled: { backgroundColor: theme.disabled },
    headerButtonText: { color: theme.textOnPrimary, fontSize: 16, fontWeight: 'bold' },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 30 },
    profilePicContainer: { alignSelf: 'center', marginBottom: 30, position: 'relative' },
    profileImage: { width: 120, height: 120, borderRadius: 60, borderWidth: 3, borderColor: theme.surface, elevation: 5, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.1, shadowRadius: 4 },
    editIconContainer: { position: 'absolute', bottom: 0, right: 0, backgroundColor: theme.primary, padding: 8, borderRadius: 20, borderWidth: 2, borderColor: theme.surface },
    sectionHeader: { fontSize: 18, fontWeight: 'bold', color: theme.text, marginTop: 20, marginBottom: 15, borderBottomWidth: 1, borderBottomColor: theme.border, paddingBottom: 8 },
    inputGroup: { marginBottom: 16 },
    label: { fontSize: 14, color: theme.textSecondary, marginBottom: 8, marginLeft: 4 },
    inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surface, borderRadius: 12, borderWidth: 1, borderColor: theme.border },
    inputIcon: { paddingLeft: 15, paddingRight: 10 },
    input: { flex: 1, paddingVertical: 14, paddingRight: 15, fontSize: 16, color: theme.text },
    inputTouchable: { flex: 1, justifyContent: 'center', height: 49 },
    placeholderText: { fontSize: 16, color: theme.textSecondary },
});