// components/CustomPicker.js

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  TouchableWithoutFeedback,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Animatable from 'react-native-animatable';

const CustomPicker = ({
  fieldLabel,
  iconName,
  listTitle,
  items,
  selectedValue,
  onValueChange,
  placeholder,
  disabled = false,
  error,
  onPressIn,
  onPressOut,
}) => {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const [modalVisible, setModalVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const hasError = !!error;

  const handleOpen = () => {
    if (disabled) return;
    setIsFocused(true);
    setModalVisible(true);
    if(onPressIn) onPressIn();
  };

  const handleClose = () => {
    setIsFocused(false);
    setModalVisible(false);
    if(onPressOut) onPressOut();
  };
  
  const selectedLabel = useMemo(
    () => items.find((item) => item.value === selectedValue)?.label,
    [items, selectedValue]
  );
  
  const handleSelect = useCallback((value) => {
    onValueChange(value);
    handleClose();
  }, [onValueChange]);

  const renderItem = useCallback(({ item }) => {
    const isSelected = selectedValue === item.value;
    return (
      <TouchableOpacity style={styles.optionItem} onPress={() => handleSelect(item.value)}>
        {item.icon && <Ionicons name={item.icon} size={22} color={isSelected ? theme.primary : theme.textSecondary} style={styles.optionIcon} />}
        <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>{item.label}</Text>
        {isSelected && <Ionicons name="checkmark-circle" size={24} color={theme.primary} />}
      </TouchableOpacity>
    );
  }, [selectedValue, theme.primary, handleSelect]);
  
  const containerStyles = [
    styles.pickerRow,
    disabled && styles.pickerRowDisabled,
    isFocused && !disabled && styles.pickerRowActive,
    hasError && styles.pickerRowError,
  ];

  const iconColor = isFocused && !hasError ? theme.primary : theme.textSecondary;

  return (
    <View style={styles.fieldContainer}>
      {fieldLabel && <Text style={styles.fieldLabel}>{fieldLabel}</Text>}
      <TouchableOpacity onPress={handleOpen} style={containerStyles}>
        {iconName && <Ionicons name={iconName} size={20} color={disabled ? theme.disabled : iconColor} style={styles.iconStyle} />}
        <Text style={[styles.pickerButtonText, !selectedLabel && styles.pickerPlaceholder, disabled && styles.disabledText]} numberOfLines={1}>
          {selectedLabel || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={22} color={disabled ? theme.disabled : theme.textSecondary} style={{ marginRight: 8 }} />
      </TouchableOpacity>
      {hasError && <Text style={styles.errorText}>{error}</Text>}

      <Modal animationType="fade" transparent={true} visible={modalVisible} onRequestClose={handleClose}>
        <TouchableWithoutFeedback onPress={handleClose}>
          <SafeAreaView style={styles.modalOverlay}>
            <Animatable.View animation="fadeInUp" duration={300} onStartShouldSetResponder={() => true} style={styles.modalContent}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{listTitle || fieldLabel}</Text>
                <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                  <Ionicons name="close" size={28} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>
              <FlatList
                data={items}
                keyExtractor={(item) => item.value.toString()}
                renderItem={renderItem}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                style={styles.list}
              />
            </Animatable.View>
          </SafeAreaView>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const getStyles = (theme) =>
  StyleSheet.create({
    fieldContainer: { marginBottom: 25 },
    fieldLabel: { 
        fontSize: 13, 
        fontWeight: '600', 
        color: theme.textSecondary, 
        marginBottom: 8,
        textTransform: 'uppercase',
        paddingLeft: 5,
    },
    pickerRow: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        backgroundColor: theme.surface, 
        borderWidth: 1.5, 
        borderColor: theme.border, 
        borderRadius: 12, 
        minHeight: 52 
    },
    pickerRowActive: { 
        borderColor: theme.primary,
        shadowColor: theme.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 5,
    },
    pickerRowDisabled: { backgroundColor: theme.disabled },
    pickerRowError: { borderColor: theme.danger },
    iconStyle: { paddingLeft: 15, paddingRight: 10 },
    errorText: { color: theme.danger, fontSize: 12, marginTop: 6, paddingLeft: 8 },

    pickerButtonText: { color: theme.text, fontSize: 16, flex: 1, paddingHorizontal: 4 },
    pickerPlaceholder: { color: theme.textSecondary },
    disabledText: { color: theme.disabled },

    modalOverlay: { backgroundColor: 'rgba(0,0,0,0.6)', flex: 1, justifyContent: 'flex-end' },
    modalContent: { 
        backgroundColor: theme.surface, 
        borderTopLeftRadius: 24, 
        borderTopRightRadius: 24, 
        maxHeight: '60%', 
        paddingBottom: 0 
    },
    modalHandle: { 
        width: 40, 
        height: 5, 
        backgroundColor: theme.border, 
        borderRadius: 2.5, 
        alignSelf: 'center', 
        marginTop: 10, 
        marginBottom: 5 
    },
    modalHeader: { 
        alignItems: 'center', 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        paddingHorizontal: 20, 
        paddingVertical: 15, 
        borderBottomColor: theme.border, 
        borderBottomWidth: 1 
    },
    modalTitle: { color: theme.text, fontSize: 20, fontWeight: 'bold' },
    closeButton: { padding: 5 },
    list: { paddingHorizontal: 10 },
    optionIcon: { marginRight: 15, width: 24, textAlign: 'center' },
    optionItem: { 
        alignItems: 'center', 
        flexDirection: 'row', 
        paddingHorizontal: 20, 
        paddingVertical: 16 
    },
    optionText: { color: theme.text, fontSize: 17, flex: 1 },
    optionTextSelected: { color: theme.primary, fontWeight: '600' },
    separator: { backgroundColor: theme.border, height: 1, marginHorizontal: 20 },
  });

export default React.memo(CustomPicker);