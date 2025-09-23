import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    ScrollView,
    TouchableOpacity,
    Modal,
    TouchableWithoutFeedback,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Feather from '@expo/vector-icons/Feather';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Animatable from 'react-native-animatable';
import { useAuth, useTheme } from '../../../contexts'; 

const getStyles = (theme) =>
    StyleSheet.create({
        drawerOverlay: { flex: 1, backgroundColor: 'transparent', flexDirection: 'row' },
        drawerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
        drawerContainer: { width: '85%', maxWidth: 320, elevation: 16, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 20, borderTopRightRadius: 20, borderBottomRightRadius: 20, overflow: 'hidden' },
        fullGradient: { flex: 1 },
        drawerHeader: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 30, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.15)' },
        drawerProfileSection: { flexDirection: 'row', alignItems: 'center', gap: 15 },
        drawerUsername: { fontSize: 18, fontWeight: 'bold', color: theme.textOnPrimary },
        drawerEmail: { fontSize: 14, color: theme.textOnPrimary, opacity: 0.8 },
        drawerProfileImage: { width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: 'rgba(255, 255, 255, 0.5)' },
        drawerMenu: { padding: 10 },
        drawerMenuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 15, borderRadius: 10, marginBottom: 5 },
        drawerMenuLabel: { fontSize: 16, marginLeft: 20, flex: 1, fontWeight: '500' },
        drawerLogoutButton: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginBottom: 40, marginTop: 10, padding: 15, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.9)' },
        drawerLogoutText: { color: theme.danger, fontSize: 16, fontWeight: 'bold', marginLeft: 20 },
    });

const DrawerItem = React.memo(({ icon, label, onPress }) => {
    const { theme } = useTheme(); // Use theme directly in sub-component
    const styles = getStyles(theme); // Get styles based on theme
    const itemColor = theme.textOnPrimary;
    return (
        <TouchableOpacity style={styles.drawerMenuItem} onPress={onPress}>
            <Ionicons name={icon} size={24} color={itemColor} />
            <Text style={[styles.drawerMenuLabel, { color: itemColor }]}>{label}</Text>
            <Ionicons name="chevron-forward" size={20} color={itemColor} />
        </TouchableOpacity>
    );
});

export default function DrawerMenuComponent({ isVisible, onClose, onNavigate, onLogout }) {
    const { theme } = useTheme();
    const { user: profile } = useAuth();
    const styles = getStyles(theme);
    const photoSource = profile?.photoUrl ? { uri: profile.photoUrl } : require('../../../assets/images/avatars/profilepic.jpg');

    return (
        <Modal animationType="fade" transparent={true} visible={isVisible} onRequestClose={onClose}>
            <View style={styles.drawerOverlay}>
                <Animatable.View animation="slideInLeft" duration={400} style={styles.drawerContainer}>
                    <LinearGradient
                        colors={theme.isDarkMode ? [theme.textBe, theme.primary] : [theme.primary, theme.textBe]}
                        style={styles.fullGradient}
                    >
                        <View style={styles.drawerHeader}>
                            <View style={styles.drawerProfileSection}>
                                <Image source={photoSource} style={styles.drawerProfileImage} />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.drawerUsername} numberOfLines={1}>{profile?.displayName || 'User'}</Text>
                                    <Text style={styles.drawerEmail} numberOfLines={1}>{profile?.email || 'No email'}</Text>
                                </View>
                            </View>
                        </View>
                        <ScrollView contentContainerStyle={styles.drawerMenu}>
                            <DrawerItem icon="person-outline" label="My Profile" onPress={() => onNavigate('Profile')} />
                            <DrawerItem icon="settings-outline" label="App Settings" onPress={() => onNavigate('Settings')} />
                            <DrawerItem icon="headset-outline" label="Contact Support" onPress={() => onNavigate('Support')} />
                            <DrawerItem icon="chatbubbles-outline" label="Customer Feedback" onPress={() => onNavigate('CustomerFeedbackScreen')} />
                        </ScrollView>
                        <TouchableOpacity style={styles.drawerLogoutButton} onPress={onLogout}>
                            <Feather name="log-out" size={20} color={theme.danger} />
                            <Text style={styles.drawerLogoutText}>Logout</Text>
                        </TouchableOpacity>
                    </LinearGradient>
                </Animatable.View>
                <TouchableWithoutFeedback onPress={onClose}>
                    <Animatable.View animation="fadeIn" duration={300} style={styles.drawerBackdrop} />
                </TouchableWithoutFeedback>
            </View>
        </Modal>
    );
}