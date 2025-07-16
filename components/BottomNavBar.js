// components/BottomNavBar.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons, FontAwesome, MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../contexts/ThemeContext';

const NavItem = ({ name, icon, IconComponent, activeScreen, onPress, theme }) => {
    const styles = getStyles(theme);
    const isActive = activeScreen === name;
    const color = isActive ? theme.primary : theme.textForNav;

    return (
        <TouchableOpacity style={styles.navItem} onPress={onPress}>
            <IconComponent name={icon} size={isActive ? 26 : 24} color={color} />
            <Text style={[styles.navLabel, isActive && styles.activeNavLabel]}>{name}</Text>
        </TouchableOpacity>
    );
};

export const BottomNavBar = ({ activeScreen }) => {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    const navigation = useNavigation();

    return (
        <View style={styles.navContainer}>
            <BlurView intensity={100} tint={theme.isDarkMode ? 'dark' : 'light'} style={styles.navBlur}>
                <NavItem name="Home" icon="home" IconComponent={Ionicons} activeScreen={activeScreen} onPress={() => navigation.navigate('Home')} theme={theme} />
                <NavItem name="Plan" icon="rss" IconComponent={FontAwesome} activeScreen={activeScreen} onPress={() => navigation.navigate('Subscription')} theme={theme} />
                <NavItem name="Billing" icon="receipt-long" IconComponent={MaterialIcons} activeScreen={activeScreen} onPress={() => navigation.navigate('MyBills')} theme={theme} />
                <NavItem name="Support" icon="chatbubble-ellipses-outline" IconComponent={Ionicons} activeScreen={activeScreen} onPress={() => navigation.navigate('Support')} theme={theme} />
            </BlurView>
        </View>
    );
};

const getStyles = (theme) => StyleSheet.create({
    navContainer: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        zIndex: 10,
        borderWidth: 2,
        borderColor: theme.isDarkMode ? 'rgba(255, 255, 255, 0.2)' : theme.border,
        borderRadius: 30
    },
    navBlur: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        height: 75,
        borderRadius: 25,
        overflow: 'hidden',
        borderWidth: theme.isDarkMode ? 1 : 0,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    navItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    navLabel: {
        fontSize: 11,
        color: theme.textForNav,
        marginTop: 5,
    },
    activeNavLabel: {
        color: theme.primary,
        fontWeight: '600',
    },
});