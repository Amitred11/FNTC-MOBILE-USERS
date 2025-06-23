import React, { useState, useEffect } from 'react';
import { 
    View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, 
    Image, Alert, BackHandler, ActivityIndicator 
} from 'react-native';
import { Ionicons, Entypo, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { auth, database } from '../config/firebaseConfig';
import { updateProfile } from 'firebase/auth';
import * as ImagePicker from 'expo-image-picker';
import { ref, set } from 'firebase/database';
import { useTheme } from '../contexts/ThemeContext'; // <-- 1. Import useTheme

export default function EditProfileScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const { userProfile } = route.params;
    const { theme } = useTheme(); // <-- 2. Get theme from context
    const styles = getStyles(theme); // <-- 3. Get theme-specific styles

    const [user, setUser] = useState(auth.currentUser);

    // --- Form State ---
    const [fullName, setFullName] = useState(userProfile.displayName || '');
    const [mobileNumber, setMobileNumber] = useState(userProfile.mobileNumber || '');
    const [email, setEmail] = useState(userProfile.email || ''); 
    const [address, setAddress] = useState(userProfile.address || '');
    const [phase, setPhase] = useState(userProfile.phase || '');
    const [city, setCity] = useState(userProfile.city || '');
    const [province, setProvince] = useState(userProfile.province || '');
    const [zipCode, setZipCode] = useState(userProfile.zipCode || '');
    const [photoData, setPhotoData] = useState(userProfile.photoData || { base64: null, mimeType: null });
    const [birthday, setBirthday] = useState(userProfile.birthday || '');
    const [gender, setGender] = useState(userProfile.gender || '');

    // --- UI State ---
    const [saving, setSaving] = useState(false);

    // --- All logic functions remain unchanged ---
    useEffect(() => {
        const handleBackPress = () => { navigation.goBack(); return true; };
        const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
        return () => backHandler.remove();
    }, [navigation]);

  // ✅ Function to handle image picking
  const pickImageAsync = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
        Alert.alert("Permission Required", "You've refused to allow this app to access your photos.");
        return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.4,
      base64: true,
    });
    
    if (!result.canceled) {
      const asset = result.assets[0];
      setPhotoData({
        base64: asset.base64,
        mimeType: asset.mimeType || 'image/jpeg',
      });
    }
  };
  
  // ✅ Save Changes Function (with validation)
  const handleSave = async () => {
    if (!user) return;

    // 3️⃣ Basic Validation
    if (!fullName.trim()) {
        Alert.alert("Validation Error", "Full Name cannot be empty.");
        return;
    }
    
    setSaving(true);
    const userRef = ref(database, `users/${user.uid}`);

    try {
      // Update Firebase Auth profile (for things like displayName)
      if (user.displayName !== fullName) {
         await updateProfile(user, { displayName: fullName });
      }
      
      // Update the Realtime Database with all other information
      await set(userRef, {
        displayName: fullName, // Sync with Auth
        mobileNumber,
        address,
        phase,
        city,
        province,
        zipCode,
        photoData,
        birthday, // 1️⃣ Save new fields
        gender,   // 1️⃣ Save new fields
      });

      // 4️⃣ Success Message
      Alert.alert("Profile Saved", "Your information has been updated successfully.", [
        { text: "OK", onPress: () => navigation.goBack() } // Go back to profile after saving
      ]);

    } catch (error) {
      console.error("Error updating profile: ", error);
      Alert.alert("Error", "Could not save your profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // 2️⃣ Cancel / Discard Changes Action
  const handleCancel = () => {
    navigation.goBack();
  };
  
    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollView}>
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backButton} onPress={handleCancel}>
                        <Ionicons name="arrow-back" size={24} color={theme.textOnPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.headerText}>EDIT PROFILE</Text>
                    <View style={styles.profileContainer}>
                        <View style={styles.profilePic}>
                            <Image 
                                source={ photoData && photoData.base64 ? { uri: `data:${photoData.mimeType};base64,${photoData.base64}` } : require('../assets/images/profilepic.jpg') } 
                                style={styles.profileImage} 
                            />

                        </View>
                            <TouchableOpacity style={styles.cameraIcon} onPress={pickImageAsync} disabled={saving}>
                                <Entypo name="camera" size={18} color={theme.textOnPrimary} />
                            </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.form}>
                    <Text style={styles.label}>Full Name</Text>
                    <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholderTextColor={theme.textSecondary}/>

                    <Text style={styles.label}>Mobile Number</Text>
                    <TextInput style={styles.input} keyboardType="phone-pad" value={mobileNumber} onChangeText={setMobileNumber} placeholderTextColor={theme.textSecondary}/>
                    
                    <Text style={styles.label}>Email address</Text>
                    <TextInput style={[styles.input, styles.readOnlyInput]} value={email} editable={false} />

                    <View style={styles.row}>
                        <View style={styles.halfInputContainer}>
                            <Text style={styles.label}>Birthday</Text>
                            <TextInput style={styles.input} placeholder="e.g., M/D/Y" value={birthday} onChangeText={setBirthday} placeholderTextColor={theme.textSecondary}/>
                        </View>
                        <View style={styles.halfInputContainer}>
                            <Text style={styles.label}>Gender</Text>
                            <TextInput style={styles.input} placeholder="M or F " value={gender} onChangeText={setGender} placeholderTextColor={theme.textSecondary}/>
                        </View>
                    </View>

                    <Text style={styles.sectionHeader}>Address Information</Text>
                    <Text style={styles.label}>Street Address</Text>
                    <TextInput style={styles.input} placeholder="House No., Street Name, Brgy" value={address} onChangeText={setAddress} placeholderTextColor={theme.textSecondary}/>
                    <View style={styles.row}>
                        <View style={styles.halfInputContainer}>
                            <Text style={styles.label}>Phase / Subd.</Text>
                            <TextInput style={styles.input} placeholder="Phase / Subdivision" value={phase} onChangeText={setPhase} placeholderTextColor={theme.textSecondary}/>
                        </View>
                        <View style={styles.halfInputContainer}>
                            <Text style={styles.label}>City</Text>
                            <TextInput style={styles.input} placeholder="City" value={city} onChangeText={setCity} placeholderTextColor={theme.textSecondary}/>
                        </View>
                    </View>
                    <View style={styles.row}>
                        <View style={styles.halfInputContainer}>
                            <Text style={styles.label}>Province</Text>
                            <TextInput style={styles.input} placeholder="Province" value={province} onChangeText={setProvince} placeholderTextColor={theme.textSecondary}/>
                        </View>
                        <View style={styles.halfInputContainer}>
                            <Text style={styles.label}>Zip Code</Text>
                            <TextInput style={styles.input} placeholder="Zip code" keyboardType="number-pad" value={zipCode} onChangeText={setZipCode} placeholderTextColor={theme.textSecondary}/>
                        </View>
                    </View>
                    
                    <View style={styles.buttonRow}>
                        <TouchableOpacity style={[styles.actionButton, styles.cancelButton]} onPress={handleCancel} disabled={saving}>
                            <Text style={styles.cancelButtonText}>CANCEL</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.actionButton, styles.saveButton]} onPress={handleSave} disabled={saving}>
                            {saving ? <ActivityIndicator color={theme.textOnPrimary} /> : <Text style={styles.saveButtonText}>SAVE CHANGES</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>

            <View style={styles.fixedDown}>
                <View style={styles.downnav}>
                    <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Home')}><Ionicons name="home" size={28} color={theme.textOnPrimary} /><Text style={styles.navlabel}>Home</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Subscription')}><FontAwesome5 name="id-card" size={24} color={theme.textOnPrimary} /><Text style={styles.navlabel}>Subscription</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('MyBills')}><MaterialIcons name="payment" size={28} color={theme.textOnPrimary} /><Text style={styles.navlabel}>Billing</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Support')}><Ionicons name="chatbubble-ellipses" size={28} color={theme.textOnPrimary} /><Text style={styles.navlabel}>Support</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.navItem} onPress={() => navigation.goBack()}><Ionicons name="person-circle" size={28} color={theme.textOnPrimary} /><Text style={styles.navlabel}>Profile</Text></TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

// --- 4. Stylesheet is now a function that accepts the theme ---
const getStyles = (theme) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    scrollView: { paddingBottom: 100 },
    header: { backgroundColor: theme.primary, height: 188, alignItems: 'center', paddingTop: 40 },
    backButton: { position: 'absolute', top: 50, left: 20, zIndex: 1, padding: 10 },
    headerText: { color: theme.textOnPrimary, fontSize: 18, fontWeight: 'bold', marginTop: 15 },
    profileContainer: { alignItems: 'center', position: 'absolute', bottom: -50, width: '100%' },
    profilePic: {
        backgroundColor: theme.surface,
        width: 100, height: 100, borderRadius: 50,
        borderWidth: 4, borderColor: theme.primary,
        justifyContent: 'center', alignItems: 'center',
        overflow: 'hidden',
    },
    profileImage: { width: '100%', height: '100%', zIndex: 10 },
    cameraIcon: {
        position: 'absolute', bottom: 0, right: 133,
        backgroundColor: theme.primary,
        borderRadius: 12, padding: 4, borderWidth: 2,
        borderColor: theme.surface, zIndex: 99
    },
    form: { paddingHorizontal: 20, marginTop: 75 },
    sectionHeader: {
        fontSize: 16, fontWeight: 'bold', color: theme.primary,
        marginTop: 25, marginBottom: 10,
        borderBottomWidth: 1, borderBottomColor: theme.border,
        paddingBottom: 5
    },
    label: { fontWeight: '600', marginTop: 15, marginBottom: 5, color: theme.text },
    input: {
        borderWidth: 1, borderColor: theme.border,
        borderRadius: 8, paddingHorizontal: 15, paddingVertical: 12,
        backgroundColor: theme.surface, fontSize: 16,
        color: theme.text,
    },
    readOnlyInput: { backgroundColor: theme.disabled, color: theme.textSecondary },
    row: { flexDirection: 'row', justifyContent: 'space-between' },
    halfInputContainer: { width: '48%' },
    buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 30 },
    actionButton: {
        paddingVertical: 15, borderRadius: 8,
        alignItems: 'center', justifyContent: 'center',
        minHeight: 50, width: '48%',
    },
    saveButton: { backgroundColor: theme.accent, },
    saveButtonText: { color: theme.textOnPrimary, fontWeight: 'bold', fontSize: 16 },
    cancelButton: { backgroundColor: theme.disabled },
    cancelButtonText: { color: theme.text, fontWeight: 'bold', fontSize: 16 },
    fixedDown: { position: 'absolute', bottom: 0, left: 0, right: 0 },
    downnav: {
        flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
        backgroundColor: theme.primary, paddingVertical: 8,
        borderTopLeftRadius: 20, borderTopRightRadius: 20, height: 65,
    },
    navItem: { alignItems: 'center', flex: 1 },
    navlabel: { color: theme.textOnPrimary, fontSize: 10, marginTop: 4 },
});