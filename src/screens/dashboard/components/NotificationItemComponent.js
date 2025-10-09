import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
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

const getStyles = (theme) => {
    const isDarkMode = theme.background === '#000000';
    return StyleSheet.create({
        cardContainer: {
            backgroundColor: theme.surface,
            borderRadius: 16,
            padding: 16,
            marginVertical: 8,
            flexDirection: 'row',
            alignItems: 'center',
            boxShadow:'2px 4px 2px rgba(0,0,0,0.4)',
            borderWidth: 1,
            borderColor: 'transparent',
        },
        unreadCard: {
            backgroundColor: isDarkMode ? theme.surface : '#ffffff',
            borderColor: isDarkMode ? `${theme.primary}80` : `${theme.primary}50`,
        },
        selectedItem: {
            borderColor: theme.primary,
            borderWidth: 2,
            transform: [{ scale: 1.02 }],
        },
        iconContainer: {
            width: 50,
            height: 50,
            borderRadius: 25,
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 16,
        },
        textContainer: {
            flex: 1,
            justifyContent: 'center',
        },
        title: {
            fontSize: 16,
            fontWeight: '500',
            color: theme.text,
            marginBottom: 4,
        },
        unreadTitle: {
            fontWeight: 'bold',
        },
        message: {
            fontSize: 14,
            color: theme.textSecondary,
            lineHeight: 20,
            marginBottom: 8,
        },
        timestamp: {
            fontSize: 12,
            color: theme.textSecondary,
            fontWeight: '500',
        },
        checkboxContainer: {
            position: 'absolute',
            top: 12,
            right: 12,
        },
    });
};

const NotificationItemComponent = React.memo(({ item, onPress, onLongPress, isSelectionMode, isSelected }) => {
    const { theme } = useTheme();
    const styles = useMemo(() => getStyles(theme), [theme]); // Memoize styles
    const iconInfo = ICON_MAP(theme)[item.type] || ICON_MAP(theme).default;
    const itemContainerStyle = [
      styles.cardContainer,
      !item.read && styles.unreadCard,
      isSelected && styles.selectedItem
    ];
    
    return (
        <Animatable.View animation="fadeInUp" duration={500} useNativeDriver={true}>
            <TouchableOpacity onPress={onPress} onLongPress={onLongPress} activeOpacity={0.8} style={itemContainerStyle}>
                <View style={[styles.iconContainer, { backgroundColor: `${iconInfo.color}20` }]}>
                    <Ionicons name={iconInfo.name} size={24} color={iconInfo.color} />
                </View>
                <View style={styles.textContainer}>
                    <Text style={[styles.title, !item.read && styles.unreadTitle]} numberOfLines={2}>{item.title}</Text>
                    <Text style={styles.message} numberOfLines={2}>{item.message}</Text>
                    <Text style={styles.timestamp}>{formatTimestamp(item.createdAt)}</Text>
                </View>
                {isSelectionMode && (
                    <Animatable.View animation="zoomIn" duration={200} style={styles.checkboxContainer}>
                        <Ionicons name={isSelected ? 'checkmark-circle' : 'ellipse-outline'} size={28} color={isSelected ? theme.primary : theme.border} />
                    </Animatable.View>
                )}
            </TouchableOpacity>
        </Animatable.View>
    );
});

export default NotificationItemComponent;