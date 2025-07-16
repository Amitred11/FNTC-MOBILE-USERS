import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, FlatList, SafeAreaView } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

const CustomPicker = ({ label, items, selectedValue, onValueChange, placeholder }) => {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    const [modalVisible, setModalVisible] = React.useState(false);

    const selectedLabel = items.find(item => item.value === selectedValue)?.label || placeholder;

    const renderItem = ({ item }) => (
        <TouchableOpacity
            style={styles.optionItem}
            onPress={() => {
                onValueChange(item.value);
                setModalVisible(false);
            }}
        >
            <Text style={styles.optionText}>{item.label}</Text>
            {selectedValue === item.value && (
                <Ionicons name="checkmark-circle" size={24} color={theme.primary} />
            )}
        </TouchableOpacity>
    );

    return (
        <>
            <TouchableOpacity style={styles.pickerButton} onPress={() => setModalVisible(true)}>
                <Text style={selectedValue ? styles.pickerButtonText : styles.pickerPlaceholder}>
                    {selectedLabel}
                </Text>
                <Ionicons name="chevron-down" size={22} color={theme.textSecondary} />
            </TouchableOpacity>
            
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <SafeAreaView style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{label}</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={28} color={theme.text} />
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={items}
                            keyExtractor={(item) => item.value}
                            renderItem={renderItem}
                            ItemSeparatorComponent={() => <View style={styles.separator} />}
                        />
                    </View>
                </SafeAreaView>
            </Modal>
        </>
    );
};

const getStyles = (theme) => StyleSheet.create({
    pickerButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        paddingVertical: 14, // Match your TextInput style
    },
    pickerButtonText: {
        fontSize: 16,
        color: theme.text,
    },
    pickerPlaceholder: {
        fontSize: 16,
        color: theme.textSecondary,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        backgroundColor: theme.surface,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '50%',
        paddingBottom: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.text,
    },
    optionItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 20,
    },
    optionText: {
        fontSize: 17,
        color: theme.text,
    },
    separator: {
        height: 1,
        backgroundColor: theme.border,
        marginLeft: 20,
    }
});

export default CustomPicker;