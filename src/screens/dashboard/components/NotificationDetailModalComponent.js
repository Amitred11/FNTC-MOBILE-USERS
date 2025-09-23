import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  TouchableWithoutFeedback,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Animatable from 'react-native-animatable';
import { useTheme } from '../../../contexts';
import { ICON_MAP } from '../../../data/Constants-Data'; 

const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const now = new Date();
    const notifDate = new Date(timestamp);
    const diffSeconds = Math.round((now - notifDate) / 1000);
    if (diffSeconds < 60) return 'just now';
    const diffMinutes = Math.round(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.round(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.round(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return notifDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// Styles for this component
const getStyles = (theme) => StyleSheet.create({
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.6)' },
    modalContent: { backgroundColor: theme.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16, paddingTop: 12, maxHeight: '85%', elevation: 10 },
    gripper: { width: 40, height: 5, backgroundColor: theme.border, borderRadius: 2.5, alignSelf: 'center', marginBottom: 16 },
    modalHeader: { alignItems: 'center', marginBottom: 20 },
    modalIconContainer: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    modalTitle: { fontSize: 22, fontWeight: 'bold', color: theme.text, textAlign: 'center' },
    modalScrollView: { maxHeight: '60%', marginBottom: 16 },
    modalMessage: { fontSize: 16, color: theme.textSecondary, lineHeight: 24, textAlign: 'center' },
    modalTimestamp: { fontSize: 13, color: theme.textSecondary, opacity: 0.8, textAlign: 'center', marginVertical: 16 },
    modalCloseButton: { backgroundColor: theme.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
    modalCloseButtonText: { color: theme.textOnPrimary, fontSize: 16, fontWeight: 'bold' },
});

const NotificationDetailModalComponent = React.memo(({ notification, visible, onClose }) => {
    const { theme } = useTheme();
    const styles = useMemo(() => getStyles(theme), [theme]); // Memoize styles
    if (!notification) return null;

    const iconInfo = ICON_MAP(theme)[notification.type] || ICON_MAP(theme).default;

    return (
        <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.modalOverlay}>
                    <Animatable.View animation="slideInUp" duration={400} style={styles.modalContent}>
                       <TouchableWithoutFeedback>
                            <View style={{width: '100%'}}>
                                <View style={styles.gripper} />
                                <View style={styles.modalHeader}>
                                    <View style={[styles.modalIconContainer, {backgroundColor: `${iconInfo.color}20`}]}>
                                         <Ionicons name={iconInfo.name} size={30} color={iconInfo.color} />
                                    </View>
                                    <Text style={styles.modalTitle}>{notification.title}</Text>
                                </View>
                                <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
                                    <Text style={styles.modalMessage}>{notification.message}</Text>
                                </ScrollView>
                                <Text style={styles.modalTimestamp}>{`Received ${formatTimestamp(notification.createdAt)}`}</Text>
                                <TouchableOpacity style={styles.modalCloseButton} onPress={onClose}>
                                    <Text style={styles.modalCloseButtonText}>Done</Text>
                                </TouchableOpacity>
                            </View>
                       </TouchableWithoutFeedback>
                    </Animatable.View>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
});

export default NotificationDetailModalComponent;